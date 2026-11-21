// Shared lead helpers: first-touch UTM capture, Tally popups, and Supabase inserts over plain fetch (no SDK).

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;
const FIRST_TOUCH_AT = 'utm_first_touch_at';
const FIRST_TOUCH_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

/** utm_source/medium/campaign: first touch wins for 30 days. utm_content always updates (it tags the CTA). */
export function captureUtmParams(search = window.location.search) {
	const params = new URLSearchParams(search);
	const source = params.get('utm_source');
	const content = params.get('utm_content');
	const captured = Number(get(FIRST_TOUCH_AT));
	const locked = !!get('utm_source') && !!captured && Date.now() - captured <= FIRST_TOUCH_TTL;
	if (source && !locked) {
		set('utm_source', source);
		set('utm_medium', params.get('utm_medium') || '');
		set('utm_campaign', params.get('utm_campaign') || '');
		set(FIRST_TOUCH_AT, String(Date.now()));
	}
	if (content) set('utm_content', content);
}

export const getUtmValues = () =>
	Object.fromEntries(UTM_KEYS.map((k) => [k, get(k) || ''])) as Record<(typeof UTM_KEYS)[number], string>;

let tallyLoading: Promise<void> | null = null;
const loadTally = () => {
	if ((window as any).Tally) return Promise.resolve();
	tallyLoading ??= new Promise<void>((resolve) => {
		const s = document.createElement('script');
		s.src = 'https://tally.so/widgets/embed.js';
		s.async = true;
		s.onload = () => resolve();
		s.onerror = () => resolve();
		document.head.appendChild(s);
	});
	return tallyLoading;
};

export async function openTallyPopup(formId: string, options: Record<string, unknown> = {}) {
	await loadTally();
	const Tally = (window as any).Tally;
	if (!Tally) { window.open(`https://tally.so/r/${formId}`, '_blank', 'noopener'); return; }
	const { hiddenFields, ...rest } = options as { hiddenFields?: Record<string, string> };
	Tally.openPopup(formId, { emoji: { text: '👋', animation: 'wave' }, ...rest, hiddenFields: { ...getUtmValues(), ...hiddenFields } });
}

/** Insert one row into a Supabase table through the REST API. Resolves to an error message, or null on success. */
export async function insertRow(table: string, row: Record<string, unknown>): Promise<string | null> {
	const url = import.meta.env.PUBLIC_SUPABASE_URL;
	const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !key) return 'Form is not configured yet. Please call 0804-710-9999.';
	const post = (body: Record<string, unknown>) =>
		fetch(`${url}/rest/v1/${table}`, {
			method: 'POST',
			headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
			body: JSON.stringify(body),
		});
	try {
		let res = await post(row);
		if (!res.ok) {
			const text = await res.text();
			// Attribution must never cost a lead: retry without utm_* if a column is missing on the table.
			if (/utm_/i.test(text)) res = await post(Object.fromEntries(Object.entries(row).filter(([k]) => !k.startsWith('utm_'))));
			if (!res.ok) { try { return JSON.parse(text).message || 'Something went wrong'; } catch { return 'Something went wrong'; } }
		}
		return null;
	} catch {
		return 'Something went wrong. Please try again.';
	}
}
