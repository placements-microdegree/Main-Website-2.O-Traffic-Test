// Tiny declarative behaviours for ported pages (replaces the React onClick/useState bits):
//   data-scroll-to="id"            smooth-scroll to #id
//   data-yt="VIDEO_ID"             click swaps the thumbnail button for an autoplaying YouTube iframe (needs data-title)
//   data-tabs                      container; buttons [data-tab="k"] show [data-tab-panel="k"] and [data-tab-show="k"] text,
//                                  [data-tab-href-<k>] on an <a> swaps its href; active button gets data-on classes, others data-off
//   data-dialog-open="id"          opens <dialog id>; clicking its backdrop or any [data-dialog-close] closes it
document.addEventListener('click', (e) => {
	const t = e.target as Element | null;

	const openBtn = t?.closest<HTMLElement>('[data-dialog-open]');
	if (openBtn) { (document.getElementById(openBtn.dataset.dialogOpen!) as HTMLDialogElement | null)?.showModal(); return; }
	if (t instanceof HTMLDialogElement && t.hasAttribute('data-dialog')) { t.close(); return; }
	const closeBtn = t?.closest<HTMLElement>('[data-dialog-close]');
	if (closeBtn) { closeBtn.closest('dialog')?.close(); return; }

	const sc = t?.closest<HTMLElement>('[data-scroll-to]');
	if (sc) { document.getElementById(sc.dataset.scrollTo!)?.scrollIntoView({ behavior: 'smooth' }); return; }

	const yt = t?.closest<HTMLElement>('[data-yt]');
	if (yt) {
		const f = document.createElement('iframe');
		f.className = 'absolute inset-0 h-full w-full';
		f.src = `https://www.youtube.com/embed/${yt.dataset.yt}?autoplay=1`;
		f.title = yt.dataset.title || 'Video';
		f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
		f.allowFullscreen = true;
		yt.replaceWith(f);
		return;
	}

	const tab = t?.closest<HTMLElement>('[data-tab]');
	const group = tab?.closest<HTMLElement>('[data-tabs]');
	if (tab && group) {
		const key = tab.dataset.tab!;
		group.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => {
			const on = b.dataset.tab === key;
			(b.dataset.on || '').split(' ').filter(Boolean).forEach((c) => b.classList.toggle(c, on));
			(b.dataset.off || '').split(' ').filter(Boolean).forEach((c) => b.classList.toggle(c, !on));
			b.setAttribute('aria-pressed', String(on));
		});
		group.querySelectorAll<HTMLElement>('[data-tab-panel],[data-tab-show]').forEach((el) => {
			el.hidden = (el.dataset.tabPanel ?? el.dataset.tabShow) !== key;
		});
		group.querySelectorAll<HTMLAnchorElement>('a[data-tab-href-' + key + ']').forEach((a) => {
			a.href = a.getAttribute('data-tab-href-' + key)!;
		});
	}
});
