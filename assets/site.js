/* Progressive language and navigation enhancements for the static site. */
(() => {
  const key = 'tracelite-lang';
  const dictionary = {
    research: ['Research', '研究'], blog: ['Blog', '博客'],
    contact: ['Contact', '联系'], timeline: ['Timeline', '时间线'], leaderboard: ['Leaderboard', '排行榜']
  };
  const button = document.getElementById('langToggle');
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.getElementById('siteMenu');
  let lang = 'en';
  try { if (localStorage.getItem(key) === 'zh-CN') lang = 'zh-CN'; } catch (_) {}
  function closeMenu(returnFocus = false) {
    if (!menu || !menuButton) return;
    menu.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    if (returnFocus) menuButton.focus();
  }
  function applyLanguage() {
    const zh = lang === 'zh-CN';
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const value = dictionary[el.dataset.i18n];
      if (value) el.textContent = value[zh ? 1 : 0];
    });
    document.querySelectorAll('[data-en][data-zh]').forEach(el => {
      el.textContent = zh ? el.dataset.zh : el.dataset.en;
    });
    document.querySelectorAll('[data-aria-en][data-aria-zh]').forEach(el => {
      el.setAttribute('aria-label', zh ? el.dataset.ariaZh : el.dataset.ariaEn);
    });
    if (button) {
      button.textContent = zh ? 'EN' : '中';
      button.setAttribute('aria-label', zh ? 'Switch to English' : '切换为中文');
    }
    if (menuButton) {
      menuButton.textContent = zh ? '菜单' : 'Menu';
      menuButton.setAttribute('aria-label', zh ? '导航菜单' : 'Navigation menu');
    }
    document.dispatchEvent(new CustomEvent('tracelite:language', { detail: { language: lang } }));
  }
  button?.addEventListener('click', () => {
    lang = lang === 'en' ? 'zh-CN' : 'en';
    try { localStorage.setItem(key, lang); } catch (_) {}
    applyLanguage();
  });
  menuButton?.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  menu?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu?.classList.contains('is-open')) closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (menu && menuButton && !menu.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  applyLanguage();
})();

/* Homepage timeline: drift slowly through all entries; pause on hover, focus or touch. */
(() => {
  const box = document.querySelector('.timeline-home-entries');
  if (!box) return;
  // Always-visible custom rail + controls (macOS hides native scrollbars).
  const frame = document.createElement('div'); frame.className = 'tl-frame';
  box.parentNode.insertBefore(frame, box); frame.appendChild(box);
  const rail = document.createElement('div'); rail.className = 'tl-rail';
  const thumb = document.createElement('div'); thumb.className = 'tl-thumb'; rail.appendChild(thumb);
  frame.appendChild(rail);
  const zh = document.documentElement.lang === 'zh-CN';
  const n = box.querySelectorAll('.timeline-home-entry, article, li').length || '';
  const bar = document.createElement('div'); bar.className = 'tl-controls';
  const mk = (cls, en, zhTxt, label) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = label; b.setAttribute('aria-label', zh ? zhTxt : en); return b; };
  const up = mk('tl-btn', 'Scroll up', '向上滚动', '\u2191');
  const down = mk('tl-btn', 'Scroll down', '向下滚动', '\u2193');
  const hint = document.createElement('span'); hint.className = 'tl-hint';
  hint.dataset.en = 'Scroll to see all entries'; hint.dataset.zh = '滚动查看全部条目';
  hint.textContent = zh ? hint.dataset.zh : hint.dataset.en;
  bar.append(up, down, hint); frame.appendChild(bar);
  function sync() {
    const max = box.scrollHeight - box.clientHeight;
    const h = Math.max(36, rail.clientHeight * box.clientHeight / box.scrollHeight);
    thumb.style.height = h + 'px';
    thumb.style.transform = 'translateY(' + (max > 0 ? (rail.clientHeight - h) * box.scrollTop / max : 0) + 'px)';
    frame.classList.toggle('no-overflow', max <= 4);
    up.disabled = box.scrollTop <= 2; down.disabled = box.scrollTop >= max - 2;
  }
  box.addEventListener('scroll', sync, {passive:true}); window.addEventListener('resize', sync); sync();
  let paused = false, last = 0, wait = 0, pos = 0;
  const nudge = d => { paused = true; box.scrollBy({top: d * box.clientHeight * 0.6, behavior: 'smooth'}); setTimeout(() => { pos = box.scrollTop; }, 600); };
  up.addEventListener('click', () => nudge(-1)); down.addEventListener('click', () => nudge(1));
  rail.addEventListener('click', e => { if (e.target === thumb) return; const r = rail.getBoundingClientRect(); paused = true; box.scrollTo({top: (e.clientY - r.top) / r.height * (box.scrollHeight - box.clientHeight), behavior: 'smooth'}); });
  let drag = null;
  thumb.addEventListener('pointerdown', e => { drag = {y: e.clientY, top: box.scrollTop}; paused = true; thumb.setPointerCapture(e.pointerId); e.preventDefault(); });
  thumb.addEventListener('pointermove', e => { if (!drag) return; const ratio = (box.scrollHeight - box.clientHeight) / (rail.clientHeight - thumb.offsetHeight); box.scrollTop = drag.top + (e.clientY - drag.y) * ratio; });
  thumb.addEventListener('pointerup', () => { drag = null; pos = box.scrollTop; });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const pause = () => { paused = true; };
  const resume = () => { paused = false; pos = box.scrollTop; };
  frame.addEventListener('mouseenter', pause); frame.addEventListener('mouseleave', resume);
  box.addEventListener('focusin', pause); box.addEventListener('focusout', resume);
  box.addEventListener('touchstart', pause, {passive:true}); box.addEventListener('touchend', () => setTimeout(resume, 2500), {passive:true});
  box.addEventListener('wheel', () => { pos = box.scrollTop; }, {passive:true});
  function step(t) {
    const dt = last ? Math.min(t - last, 64) : 0; last = t;
    if (!paused && box.scrollHeight > box.clientHeight + 4) {
      if (wait > 0) { wait -= dt; }
      else if (box.scrollTop + box.clientHeight >= box.scrollHeight - 2) { wait = 2500; pos = 0; box.scrollTo({top: 0, behavior: 'smooth'}); }
      else { pos += dt * 0.018; box.scrollTop = pos; }
    }
    requestAnimationFrame(step);
  }
  wait = 2000; requestAnimationFrame(step);
})();
