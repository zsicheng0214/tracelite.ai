/* The timeline is readable without JavaScript; this adds optional filtering. */
(() => {
  'use strict';
  if (!document.body.hasAttribute('data-timeline')) return;
  const controls = document.getElementById('timelineFilters');
  const entries = [...document.querySelectorAll('#timelineEntries .timeline-entry')];
  const groups = [...document.querySelectorAll('#timelineEntries .timeline-year')];
  const buttons = [...document.querySelectorAll('[data-filter-type]')];
  const yearSelect = document.getElementById('timelineYear');
  const status = document.getElementById('timelineStatus');
  const empty = document.getElementById('timelineEmpty');
  const validTypes = new Set(buttons.map(button => button.dataset.filterType));
  const validYears = new Set([...yearSelect.options].map(option => option.value));
  let currentType = 'all';
  let currentYear = 'all';
  let visibleCount = entries.length;

  function updateStatus() {
    const zh = document.documentElement.lang.startsWith('zh');
    status.textContent = zh
      ? `显示 ${visibleCount} / ${entries.length} 条记录`
      : `Showing ${visibleCount} of ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
    document.title = zh ? '研究时间线 — TraceLite AI' : 'Research Timeline — TraceLite AI';
  }

  function applyFilters() {
    visibleCount = 0;
    entries.forEach(entry => {
      const matchesType = currentType === 'all' || entry.dataset.type === currentType;
      const matchesYear = currentYear === 'all' || entry.dataset.year === currentYear;
      entry.hidden = !(matchesType && matchesYear);
      if (!entry.hidden) visibleCount += 1;
    });
    groups.forEach(group => {
      group.hidden = ![...group.querySelectorAll('.timeline-entry')].some(entry => !entry.hidden);
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filterType === currentType)));
    yearSelect.value = currentYear;
    empty.hidden = visibleCount !== 0;
    updateStatus();
  }

  function readURL() {
    const params = new URL(window.location.href).searchParams;
    const requestedType = params.get('type') || 'all';
    const requestedYear = params.get('year') || 'all';
    currentType = validTypes.has(requestedType) ? requestedType : 'all';
    currentYear = validYears.has(requestedYear) ? requestedYear : 'all';
    applyFilters();
  }

  function writeURL() {
    const url = new URL(window.location.href);
    if (currentType === 'all') url.searchParams.delete('type');
    else url.searchParams.set('type', currentType);
    if (currentYear === 'all') url.searchParams.delete('year');
    else url.searchParams.set('year', currentYear);
    // Retain unrelated parameters and any entry anchor already in the URL.
    if (url.href !== window.location.href) {
      try { window.history.pushState(null, '', url); } catch (_) {}
    }
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    currentType = button.dataset.filterType;
    applyFilters();
    writeURL();
  }));
  yearSelect.addEventListener('change', () => {
    currentYear = yearSelect.value;
    applyFilters();
    writeURL();
  });
  document.querySelectorAll('[data-timeline-reset]').forEach(button => button.addEventListener('click', () => {
    currentType = 'all';
    currentYear = 'all';
    applyFilters();
    writeURL();
    buttons.find(filter => filter.dataset.filterType === 'all')?.focus();
  }));
  window.addEventListener('popstate', readURL);
  document.addEventListener('tracelite:language', updateStatus);
  window.addEventListener('tracelite:language', updateStatus);

  readURL();
  controls.hidden = false;
  status.hidden = false;
  document.documentElement.classList.add('timeline-enhanced');
  const languageButton = document.getElementById('langToggle');
  if (languageButton) languageButton.hidden = false;
})();
