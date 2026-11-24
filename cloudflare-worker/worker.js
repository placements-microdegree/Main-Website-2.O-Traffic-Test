// Traffic splitter for www.microdegree.work: sends (100 - NEW_SITE_PERCENT)% of visitors to the current
// site and NEW_SITE_PERCENT% to the new Astro site, both hosted on Netlify. See README.md.
//
// How it works
//  - First visit: the visitor gets a random bucket 0-99 stored in the cookie `md_bucket` (30 days).
//    bucket < NEW_SITE_PERCENT  => new site, otherwise old site. The visitor stays on the same site for the whole
//    visit and later visits. Raising the percentage only ADDS visitors to the new site, it never reshuffles them.
//  - Search / ad crawlers and "pinned" paths always get the old site (SEO + Google Ads review safety).
//  - If the new site has no such page (404), the visitor is served the old site's page instead.
//  - Non-GET/HEAD requests always go to the old site.
//  - QA: ?md_variant=new | old | reset   (sets/clears an override cookie `md_variant`).
//  - Every HTML page gets a tiny script that tells GTM (dataLayer.md_variant) and Clarity (custom tag md_variant)
//    which site the visitor saw, so you can compare conversion between the two.

const BUCKET_COOKIE = 'md_bucket';
const OVERRIDE_COOKIE = 'md_variant';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

// Always served by the old site (they are proxied to separate apps by both sites anyway).
const PIN_OLD_PREFIXES = ['/blog', '/learning', '/e-learning', '/tech-courses', '/_lp', '/cloudprograms', '/genaiprograms', '/cloudcertification', '/genaicertification'];

const BOT_UA = /googlebot|adsbot|mediapartners|google-inspectiontool|bingbot|slurp|duckduckbot|baiduspider|yandex|applebot|facebookexternalhit|linkedinbot|twitterbot|whatsapp|telegrambot|ahrefs|semrush|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot/i;

const getCookie = (header, name) => {
	const m = (header || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
	return m ? decodeURIComponent(m[1]) : null;
};

const cookieString = (name, value, host) => {
	// Share the cookie between microdegree.work and www.microdegree.work.
	const domain = /(^|\.)microdegree\.work$/i.test(host) ? '; Domain=microdegree.work' : '';
	return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure${domain}`;
};

const clearCookie = (name, host) => {
	const domain = /(^|\.)microdegree\.work$/i.test(host) ? '; Domain=microdegree.work' : '';
	return `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure${domain}`;
};

/** Decide which site serves this request. Pure function: easy to test. */
export function decide({ method, pathname, userAgent, cookieHeader, searchParams, percent, randomBucket }) {
	const setCookies = [];
	let variant;
	let reason;

	const qa = searchParams.get('md_variant');
	const override = qa === 'reset' ? null : qa === 'new' || qa === 'old' ? qa : getCookie(cookieHeader, OVERRIDE_COOKIE);
	const cleared = qa === 'reset';
	if (qa === 'new' || qa === 'old') setCookies.push({ set: [OVERRIDE_COOKIE, qa] });
	if (cleared) setCookies.push({ clear: OVERRIDE_COOKIE });

	if (method !== 'GET' && method !== 'HEAD') {
		return { variant: 'old', reason: 'method', setCookies: [] };
	}
	if (BOT_UA.test(userAgent || '')) return { variant: 'old', reason: 'bot', setCookies: [] };
	if (PIN_OLD_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
		return { variant: 'old', reason: 'pinned', setCookies };
	}
	if (override === 'new' || override === 'old') return { variant: override, reason: 'override', setCookies };

	const rawBucket = getCookie(cookieHeader, BUCKET_COOKIE);
	let bucket = rawBucket !== null && /^\d{1,2}$/.test(rawBucket) ? Number(rawBucket) : -1;
	if (bucket < 0 || bucket > 99) {
		bucket = randomBucket();
		setCookies.push({ set: [BUCKET_COOKIE, String(bucket)] });
	}
	variant = bucket < percent ? 'new' : 'old';
	reason = 'bucket';
	return { variant, reason, bucket, setCookies };
}

const randomBucket = () => crypto.getRandomValues(new Uint32Array(1))[0] % 100;

function originFor(variant, env) {
	return new URL(variant === 'new' ? env.NEW_ORIGIN : env.OLD_ORIGIN);
}

async function fetchFromOrigin(request, url, variant, env) {
	const origin = originFor(variant, env);
	const target = new URL(url);
	target.protocol = origin.protocol;
	target.host = origin.host;

	const headers = new Headers(request.headers);
	headers.delete('cookie'); // origins don't need our cookies; keeps them cacheable
	headers.set('x-forwarded-host', url.host);
	// Let Cloudflare/Netlify negotiate compression themselves.
	return fetch(target.toString(), {
		method: request.method,
		headers,
		body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
		redirect: 'manual',
	});
}

function rewriteLocation(res, publicUrl, env) {
	const loc = res.headers.get('location');
	if (!loc) return;
	try {
		const u = new URL(loc, publicUrl);
		const hosts = [new URL(env.OLD_ORIGIN).host, new URL(env.NEW_ORIGIN).host];
		if (hosts.includes(u.host)) {
			u.protocol = publicUrl.protocol;
			u.host = publicUrl.host;
			res.headers.set('location', u.toString());
		}
	} catch {
		/* leave as is */
	}
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const percent = Math.max(0, Math.min(100, Number(env.NEW_SITE_PERCENT ?? 10)));

		const decision = decide({
			method: request.method,
			pathname: url.pathname,
			userAgent: request.headers.get('user-agent'),
			cookieHeader: request.headers.get('cookie'),
			searchParams: url.searchParams,
			percent,
			randomBucket,
		});

		let served = decision.variant;
		let upstream;
		try {
			upstream = await fetchFromOrigin(request, url, served, env);
			// The new site doesn't have every page the old one has yet: fall back instead of showing a 404.
			if (served === 'new' && upstream.status === 404) {
				served = 'old';
				upstream = await fetchFromOrigin(request, url, 'old', env);
			}
		} catch (err) {
			// New site unreachable: never lose the visitor, serve the old site.
			if (served === 'new') {
				served = 'old';
				upstream = await fetchFromOrigin(request, url, 'old', env);
			} else {
				throw err;
			}
		}

		let res = new Response(upstream.body, upstream);
		rewriteLocation(res, url, env);
		res.headers.set('x-md-variant', `${served}${decision.reason ? `; ${decision.reason}` : ''}`);
		const vary = res.headers.get('vary');
		res.headers.set('vary', vary ? `${vary}, Cookie` : 'Cookie');

		for (const c of decision.setCookies) {
			if (c.set) res.headers.append('set-cookie', cookieString(c.set[0], c.set[1], url.host));
			if (c.clear) res.headers.append('set-cookie', clearCookie(c.clear, url.host));
		}

		// Tell analytics which site this visitor saw (HTML only).
		const type = res.headers.get('content-type') || '';
		if (type.includes('text/html') && request.method === 'GET') {
			const tag =
				`<script>(function(v){window.dataLayer=window.dataLayer||[];dataLayer.push({md_variant:v});` +
				`window.clarity=window.clarity||function(){(clarity.q=clarity.q||[]).push(arguments)};clarity('set','md_variant',v);})('${served}')</script>`;
			res = new HTMLRewriter()
				.on('head', {
					element(el) {
						el.prepend(tag, { html: true });
					},
				})
				.transform(res);
		}
		return res;
	},
};
