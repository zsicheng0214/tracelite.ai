/* Progressive enhancement: the report and all case studies remain readable without JS. */
(() => {
  const tabs = [...document.querySelectorAll('.case-tabs a')];
  const panels = tabs.map(tab => document.querySelector(tab.hash));
  document.querySelector('.case-tabs').setAttribute('role', 'tablist');
  tabs.forEach((tab, i) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[i].id);
    panels[i].setAttribute('role', 'tabpanel');
    panels[i].tabIndex = 0;
  });
  function select(index, focus = false) {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) tabs[index].focus();
  }
  const indexFromHash = () => panels.findIndex(panel => '#' + panel.id === location.hash);
  select(Math.max(0, indexFromHash()));
  function syncHash() {
    const index = indexFromHash();
    if (index >= 0) {
      select(index);
      document.getElementById('cases').scrollIntoView();
    }
  }
  if (indexFromHash() >= 0) requestAnimationFrame(syncHash);
  addEventListener('hashchange', syncHash);
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', event => {
      event.preventDefault();
      select(i);
      history.replaceState(null, '', tab.hash);
    });
    tab.addEventListener('keydown', event => {
      let index;
      if (event.key === 'ArrowRight') index = (i + 1) % tabs.length;
      if (event.key === 'ArrowLeft') index = (i + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') index = 0;
      if (event.key === 'End') index = tabs.length - 1;
      if (index !== undefined) { event.preventDefault(); select(index, true); }
      if (event.key === ' ') { event.preventDefault(); tab.click(); }
    });
  });

  const dialog = document.getElementById('figureDialog');
  const detail = document.getElementById('figureDetail');
  const caption = document.getElementById('figureCaption');
  let activeFigure;
  document.querySelectorAll('.figure-link').forEach(link => link.addEventListener('click', event => {
    if (typeof dialog.showModal !== 'function' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    activeFigure = link;
    const image = link.querySelector('img');
    detail.src = link.href;
    detail.alt = image.alt;
    caption.textContent = link.closest('figure').querySelector('figcaption').textContent;
    dialog.showModal();
    dialog.scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }));
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; activeFigure?.focus({ preventScroll: true }); });

  const status = document.getElementById('copyStatus');
  document.getElementById('copyCitation').addEventListener('click', async () => {
    const citation = document.getElementById('citation');
    const zh = document.documentElement.lang === 'zh-CN';
    try {
      await navigator.clipboard.writeText(citation.textContent);
      status.textContent = zh ? '引用已复制。' : 'Citation copied.';
    } catch (_) {
      const range = document.createRange(); range.selectNodeContents(citation);
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
      status.textContent = zh ? '引用已选中，请按 Ctrl+C 或 ⌘C 复制。' : 'Citation selected. Press Ctrl+C or ⌘C to copy.';
    }
  });
  document.addEventListener('tracelite:language', () => { status.textContent = ''; });
  const links = [...document.querySelectorAll('.section-nav a')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) links.forEach(link => {
          if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-10% 0px -65% 0px' });
    links.forEach(link => observer.observe(document.querySelector(link.hash)));
  }
})();
