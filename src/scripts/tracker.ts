// Anonymous first-party visitor tracking (port of MainWebsite-2026/src/utils/tracker.js).
//
// Records page views and WhatsApp clicks (plus where the visit came from) into Supabase via the
// public.track_batch() RPC defined in tracking_schema.sql. Plain fetch, no SDK; never affects the page.
//
// Opt a browser out (team members, testing):  ?md_notrack=1   (undo: ?md_notrack=0)
// Force-enable on a non-production host:      localStorage.md_track_force = "1"
import { captureUtmParams, getUtmValues } from './leads';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

const VISITOR_KEY = 'md_vid';
const SESSION_KEY = 'md_sess';
const OPT_OUT_KEY = 'md_notrack';
const FORCE_KEY = 'md_track_force';

const SESSION_TTL_MS = 30 * 60 * 1000; // new session after 30 min of inactivity
const FLUSH_DELAY_MS = 5000;
const MAX_BATCH = 40;

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|pingdom|facebookexternalhit/i;
const PRODUCTION_HOST = /(^|\.)microdegree\.work$/i;

type Dict = Record<string, any>;
type QueuedEvent = { type: string; path: string; element: string; metadata: Dict; t: number };

const safeGet = (key: string) => { try { return window.localStorage.getItem(key); } catch { return null; } };
const safeSet = (key: string, value: string) => { try { window.localStorage.setItem(key, value); } catch { /* fall back to memory ids */ } };

const randomId = () => {
	try {
		if (window.crypto?.randomUUID) return window.crypto.randomUUID();
		const bytes = new Uint8Array(16);
		window.crypto.getRandomValues(bytes);
		return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
	} catch {
		return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
	}
};

let enabled: boolean | null = null;
let memoryVisitor: string | null = null;
let memorySession: Dict | null = null;
let queue: QueuedEvent[] = [];
let flushTimer: number | null = null;
let listenersInstalled = false;

const resolveEnabled = () => {
	if (enabled !== null) return enabled;
	enabled = false;
	try {
		if (typeof window === 'undefined' || !SUPABASE_URL || !SUPABASE_ANON_KEY) return enabled;

		const optOutParam = new URLSearchParams(window.location.search).get('md_notrack');
		if (optOutParam === '1') safeSet(OPT_OUT_KEY, '1');
		if (optOutParam === '0') safeSet(OPT_OUT_KEY, '0');
		if (safeGet(OPT_OUT_KEY) === '1') return enabled;

		if (navigator.webdriver || BOT_UA.test(navigator.userAgent || '')) return enabled;

		if (!PRODUCTION_HOST.test(window.location.hostname) && safeGet(FORCE_KEY) !== '1') return enabled;

		enabled = true;
	} catch {
		enabled = false;
	}
	return enabled;
};

const getVisitorId = () => {
	let id = safeGet(VISITOR_KEY);
	let isNew = false;
	if (!id) {
		id = memoryVisitor || randomId();
		memoryVisitor = id;
		safeSet(VISITOR_KEY, id);
		isNew = true;
	}
	return { id, isNew };
};

const detectDevice = () => {
	const ua = navigator.userAgent || '';
	const device_type = /ipad|tablet/i.test(ua) ? 'tablet' : /mobi|android|iphone|ipod/i.test(ua) ? 'mobile' : 'desktop';

	let browser = 'Other';
	if (/FBAN|FBAV/i.test(ua)) browser = 'Facebook in-app';
	else if (/Instagram/i.test(ua)) browser = 'Instagram in-app';
	else if (/Edg\//i.test(ua)) browser = 'Edge';
	else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
	else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet';
	else if (/Firefox|FxiOS/i.test(ua)) browser = 'Firefox';
	else if (/Chrome|CriOS/i.test(ua)) browser = 'Chrome';
	else if (/Safari/i.test(ua)) browser = 'Safari';

	let os = 'Other';
	if (/Android/i.test(ua)) os = 'Android';
	else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
	else if (/Windows/i.test(ua)) os = 'Windows';
	else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
	else if (/Linux|X11/i.test(ua)) os = 'Linux';

	return { device_type, browser, os };
};

const getReferrerHost = () => {
	try {
		if (!document.referrer) return '';
		const host = new URL(document.referrer).hostname.replace(/^www\./i, '');
		const own = window.location.hostname.replace(/^www\./i, '');
		return host === own ? '' : host;
	} catch {
		return '';
	}
};

// Source of THIS visit, read from the landing URL only (internal links carry their own utm_* params).
const readLandingSource = () => {
	const params = new URLSearchParams(window.location.search);
	let utm_source = params.get('utm_source') || '';
	let utm_medium = params.get('utm_medium') || '';
	const utm_campaign = params.get('utm_campaign') || '';
	const utm_content = params.get('utm_content') || '';
	// Google Ads auto-tagging without utm params: label it instead of "direct".
	if (!utm_source && params.get('gclid')) {
		utm_source = 'google';
		utm_medium = utm_medium || 'cpc';
	}
	return { utm_source, utm_medium, utm_campaign, utm_content };
};

const startSession = (visitorIsNew: boolean): Dict => {
	const firstTouch = getUtmValues();
	return {
		session_id: randomId(),
		visitor_id: null,
		last: Date.now(),
		host: window.location.hostname,
		landing_path: window.location.pathname,
		referrer_host: getReferrerHost(),
		...readLandingSource(),
		first_touch_source: firstTouch.utm_source || '',
		first_touch_medium: firstTouch.utm_medium || '',
		first_touch_campaign: firstTouch.utm_campaign || '',
		...detectDevice(),
		is_returning: !visitorIsNew,
	};
};

const touchSession = (): Dict => {
	const visitor = getVisitorId();
	let session: Dict | null = null;
	try {
		const raw = safeGet(SESSION_KEY);
		if (raw) session = JSON.parse(raw);
	} catch {
		session = null;
	}
	if (!session) session = memorySession;

	const expired = !session || !session.session_id || Date.now() - (session.last || 0) > SESSION_TTL_MS;
	if (expired) session = startSession(visitor.isNew);

	session!.visitor_id = visitor.id;
	session!.last = Date.now();
	memorySession = session;
	safeSet(SESSION_KEY, JSON.stringify(session));
	return session!;
};

const sessionPayload = (s: Dict) => ({
	session_id: s.session_id,
	visitor_id: s.visitor_id,
	host: s.host || window.location.hostname,
	landing_path: s.landing_path,
	referrer_host: s.referrer_host,
	utm_source: s.utm_source,
	utm_medium: s.utm_medium,
	utm_campaign: s.utm_campaign,
	utm_content: s.utm_content,
	first_touch_source: s.first_touch_source,
	first_touch_medium: s.first_touch_medium,
	first_touch_campaign: s.first_touch_campaign,
	device_type: s.device_type,
	browser: s.browser,
	os: s.os,
	is_returning: s.is_returning,
});

export const flush = () => {
	if (flushTimer) clearTimeout(flushTimer);
	flushTimer = null;
	if (!queue.length) return;

	const batch = queue;
	queue = [];

	try {
		const session = touchSession();
		const now = Date.now();
		const body = JSON.stringify({
			payload: {
				session: sessionPayload(session),
				events: batch.map((e) => ({
					type: e.type,
					host: window.location.hostname,
					path: e.path,
					element: e.element,
					metadata: e.metadata,
					ago_ms: now - e.t,
				})),
			},
		});

		// keepalive lets the request finish even if the page is navigating away (e.g. the redirect to WhatsApp).
		fetch(`${SUPABASE_URL}/rest/v1/rpc/track_batch`, {
			method: 'POST',
			keepalive: true,
			headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
			body,
		}).catch(() => {});
	} catch {
		// tracking must never break the page
	}
};

const installListeners = () => {
	if (listenersInstalled) return;
	listenersInstalled = true;
	document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
	window.addEventListener('pagehide', flush);
};

/** Queue an event. type must be one allowed by track_batch(). */
export const track = (type: string, options: { element?: string; metadata?: Dict; immediate?: boolean } = {}) => {
	try {
		if (!resolveEnabled()) return;
		installListeners();
		touchSession(); // starts the session (and captures landing source) on the first event

		queue.push({ type, path: window.location.pathname, element: options.element || '', metadata: options.metadata || {}, t: Date.now() });

		if (options.immediate || queue.length >= MAX_BATCH) flush();
		else if (!flushTimer) flushTimer = window.setTimeout(flush, FLUSH_DELAY_MS);
	} catch {
		// ignore
	}
};

export const trackPageView = () => track('page_view');

// Lets plain scripts (the WhatsApp button) record events without importing this module.
(window as any).mdTrack = (type: string, options?: Parameters<typeof track>[1]) => track(type, { immediate: true, ...options });

captureUtmParams(); // first-touch attribution must be stored before the session snapshot reads it
trackPageView();
