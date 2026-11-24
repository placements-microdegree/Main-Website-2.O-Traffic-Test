// Shared client behaviour for the course / demo / thank-you landing pages:
// Tally popups, count-up numbers, demo-form submission and the thank-you redirect.
import { captureUtmParams, getUtmValues, insertRow, openTallyPopup } from './leads';
import './ui';

captureUtmParams();

// [data-tally="FORM_ID"] opens that Tally popup with the visitor's UTMs; <a href="#tally-open=ID"> links do the same.
document.addEventListener('click', (e) => {
	const el = (e.target as Element | null)?.closest?.('[data-tally], a[href*="#tally-open="]') as HTMLElement | null;
	if (!el) return;
	const id = el.dataset.tally || new URLSearchParams((el.getAttribute('href') || '').split('#')[1]).get('tally-open');
	if (!id) return;
	e.preventDefault();
	let hiddenFields: Record<string, string> | undefined;
	try { hiddenFields = el.dataset.tallyFields ? JSON.parse(el.dataset.tallyFields) : undefined; } catch { /* ignore bad JSON */ }
	openTallyPopup(id, { hiddenFields });
}, true);

// Count-up numbers: <span data-countup="100000"></span>
const fmtIN = new Intl.NumberFormat('en-IN');
const fmtUS = new Intl.NumberFormat('en-US'); // pages ported from the old app show 100,000 (data-locale="en-US")
const counters = document.querySelectorAll<HTMLElement>('[data-countup]');
if (counters.length) {
	const io = new IntersectionObserver((entries) => {
		for (const en of entries) {
			if (!en.isIntersecting) continue;
			const el = en.target as HTMLElement;
			io.unobserve(el);
			const end = Number(el.dataset.countup);
			const t0 = performance.now();
			const dur = 4000;
			const tick = (now: number) => {
				const p = Math.min((now - t0) / dur, 1);
				el.textContent = (el.dataset.locale === 'en-US' ? fmtUS : fmtIN).format(Math.round(end * (1 - Math.pow(1 - p, 3))));
				if (p < 1) requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
		}
	}, { threshold: 0.5 });
	counters.forEach((el) => io.observe(el));
}

// Lead forms: <form data-lead-form data-table="demo_cloud" data-redirect="/demovideo1">
document.querySelectorAll<HTMLFormElement>('form[data-lead-form]').forEach((form) => {
	const errorEl = form.querySelector<HTMLElement>('[data-error]');
	const overlay = form.closest('[data-form-wrap]')?.querySelector<HTMLElement>('[data-loading]');
	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		const data = new FormData(form);
		const name = String(data.get('name') || '').trim();
		const email = String(data.get('email') || '').trim();
		const number = String(data.get('number') || '').trim();
		const experience = String(data.get('experience') || '');
		const showError = (m: string) => { if (errorEl) { errorEl.textContent = m; errorEl.hidden = !m; } };
		if (!name || !email || !number || !experience) { showError('All fields are required'); return; }
		showError('');
		overlay?.classList.remove('hidden');
		const err = await insertRow(form.dataset.table!, {
			name, email, phone: number, experience, ...getUtmValues(), submitted_at: new Date().toISOString(),
		});
		if (err) { overlay?.classList.add('hidden'); if (form.hasAttribute('data-inline-errors')) showError(err); else alert(err); return; }
		form.reset();
		setTimeout(() => { window.location.href = form.dataset.redirect || '/'; }, 500);
	});
});

// Thank-you pages: fire the Google Ads conversion (when gtag is present) and send the visitor to the download after 5s.
const auto = document.querySelector<HTMLElement>('[data-auto-redirect]');
if (auto) {
	const gtag = (window as any).gtag;
	if (gtag && auto.dataset.conversion) gtag('event', 'conversion', { send_to: auto.dataset.conversion, value: 1.0, currency: 'INR' });
	setTimeout(() => { window.location.href = auto.dataset.autoRedirect!; }, 5000);
}
