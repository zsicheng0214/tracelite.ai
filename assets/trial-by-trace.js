(() => {
  'use strict';
  const storageKey = 'tracelite-lang';
  const toggle = document.getElementById('langToggle');
  const translated = [...document.querySelectorAll('[data-zh]')];
  const labeled = [...document.querySelectorAll('[data-zh-label]')];
  const original = new Map(translated.map(node => [node, node.innerHTML]));
  const originalLabels = new Map(labeled.map(node => [node, node.getAttribute('aria-label')]));
  const status = document.getElementById('copyStatus');
  const copy = document.getElementById('copyCitation');
  let language = 'en';
  let copyState = '';
  try { if (localStorage.getItem(storageKey) === 'zh-CN') language = 'zh-CN'; } catch (_) {}

  function updateCopyStatus() {
    const messages = language === 'zh-CN'
      ? { copied: '引用已复制。', fallback: '自动复制不可用。请选择上方引用文本进行复制。' }
      : { copied: 'Citation copied.', fallback: 'Automatic copying is unavailable. Select the citation above to copy it.' };
    status.textContent = messages[copyState] || '';
  }

  function applyLanguage() {
    const chinese = language === 'zh-CN';
    document.documentElement.lang = language;
    translated.forEach(node => {
      if (chinese) node.textContent = node.dataset.zh;
      else node.innerHTML = original.get(node);
    });
    labeled.forEach(node => node.setAttribute('aria-label', chinese ? node.dataset.zhLabel : originalLabels.get(node)));
    toggle.textContent = chinese ? 'EN' : '中';
    toggle.setAttribute('aria-label', chinese ? 'Switch to English' : '切换到中文');
    document.title = chinese
      ? 'Trial by Trace — AI Agent 运行框架可靠性 | TraceLite AI'
      : 'Trial by Trace — Agent Harness Reliability | TraceLite AI';
    document.querySelector('meta[name="description"]').content = chinese
      ? 'TraceTrial-Bench 通过执行轨迹评估 AI Agent 运行框架可靠性，覆盖 95 个任务、4 种运行框架、9 个模型和 3,420 条选定运行记录。'
      : 'TraceTrial-Bench evaluates AI agent harness reliability through execution traces: 95 tasks, four harnesses, nine models, and 3,420 selected runs.';
    updateCopyStatus();
  }

  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    language = language === 'en' ? 'zh-CN' : 'en';
    try { localStorage.setItem(storageKey, language); } catch (_) {}
    applyLanguage();
  });
  window.addEventListener('storage', event => {
    if (event.key === storageKey) {
      language = event.newValue === 'zh-CN' ? 'zh-CN' : 'en';
      applyLanguage();
    }
  });
  applyLanguage();

  // Without JavaScript, these links navigate to three fully visible case studies.
  const tabList = document.querySelector('.case-tabs');
  const tabs = [...tabList.querySelectorAll('a')];
  const panels = tabs.map(tab => document.querySelector(tab.getAttribute('href')));
  tabList.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[index].id);
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('tabindex', '0');
  });

  function selectTab(index, focus = false) {
    tabs.forEach((tab, current) => {
      const active = current === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[current].hidden = !active;
    });
    if (focus) tabs[index].focus();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', event => { event.preventDefault(); selectTab(index); });
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else if (event.key === ' ') next = index;
      else return;
      event.preventDefault();
      selectTab(next, true);
    });
  });
  const initialTab = panels.findIndex(panel => '#' + panel.id === location.hash);
  selectTab(initialTab < 0 ? 0 : initialTab);
  window.addEventListener('hashchange', () => {
    const index = panels.findIndex(panel => '#' + panel.id === location.hash);
    if (index >= 0) selectTab(index);
  });

  copy.hidden = false;
  copy.addEventListener('click', async () => {
    const citation = document.getElementById('citation');
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(citation.textContent);
      copyState = 'copied';
    } catch (_) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(citation);
      selection.removeAllRanges();
      selection.addRange(range);
      copyState = 'fallback';
    }
    updateCopyStatus();
  });
})();
