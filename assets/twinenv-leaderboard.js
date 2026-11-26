/* Interactive TwinEnv-Bench leaderboard; progressive enhancement over embedded static HTML. */
(() => {
  const rows = JSON.parse(document.getElementById('leaderboardData').textContent);
  const columns = ['target1', 'base1', 'shift_drop', 'exposed1', 'latent1', 'pass_at_3', 'pass_hat_3', 'probe_pct', 'cmds', 'tokens_k', 'cost'];
  const tbody = document.querySelector('#lbTable tbody');
  const accountingSelect = document.getElementById('lbAccounting');
  const scopeSelect = document.getElementById('lbScope');
  const modelSelect = document.getElementById('lbModel');
  const search = document.getElementById('lbSearch');
  const chart = document.getElementById('lbChart');
  const isZh = () => document.documentElement.lang === 'zh-CN';
  const t = (en, zh) => isZh() ? zh : en;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

  const models = [...new Set(rows.filter(r => r.scope === 'All 117 tasks').map(r => r.model))];
  const layers = [...new Set(rows.filter(r => r.scope !== 'All 117 tasks').map(r => r.scope))];
  const scopeZh = {
    'All 117 tasks': '全部 117 题',
    'E1 System (12)': 'E1 系统层 (12)',
    'E2 Software Stack (24)': 'E2 软件栈 (24)',
    'E3 Execution Context (43)': 'E3 上下文 (43)',
    'E4 Boundary (36)': 'E4 边界层 (36)',
    'E5 State (2)': 'E5 状态层 (2)'
  };
  const metricNames = {
    target1: ['Target Pass@1', '目标通过率 Target@1'],
    latent1: ['Deployment-Latent Pass@1', '生产隐性通过率 Latent@1'],
    pass_hat_3: ['Strict Pass^3 reliability', '三轮一致稳健率 Pass^3'],
    exposed1: ['Interactive-Exposed Pass@1', '交互显性通过率 Exposed@1']
  };
  const state = {view: 'models', accounting: 'non_refusal', scope: 'all', model: 'all', sort: 'target1', direction: -1, metric: 'target1', query: ''};

  function fillOptions(select, items, allLabel, selected) {
    select.replaceChildren(new Option(allLabel, 'all'), ...items.map(([val, lbl]) => new Option(lbl, val)));
    select.value = selected;
  }

  function localize() {
    accountingSelect.replaceChildren(
      new Option(t('Non-refusal executed', '非拒答有效运行'), 'non_refusal'),
      new Option(t('Refusal-as-0 sensitivity', '拒答计零敏感性'), 'refusal_zero')
    );
    accountingSelect.value = state.accounting;
    fillOptions(scopeSelect, layers.map(s => [s, isZh() ? (scopeZh[s] || s) : s]), t('All OS layers', '全部系统层级'), state.scope);
    fillOptions(modelSelect, models.map(m => [m, m]), t('All models', '全部模型'), state.model);
    search.placeholder = t('Search models…', '搜索模型或层级…');
    render();
  }

  function filteredRows() {
    return rows.filter(row => {
      if (row.accounting !== state.accounting) return false;
      if (state.view === 'models' && row.scope !== 'All 117 tasks') return false;
      if (state.view === 'layers' && row.scope === 'All 117 tasks') return false;
      if (state.view === 'layers' && state.scope !== 'all' && row.scope !== state.scope) return false;
      if (state.view === 'layers' && state.model !== 'all' && row.model !== state.model) return false;
      const hay = (row.model + ' ' + row.provider + ' ' + row.scope + ' ' + (scopeZh[row.scope] || '')).toLowerCase();
      return hay.includes(state.query.trim().toLowerCase());
    });
  }

  function sortedRows() {
    return filteredRows().sort((a, b) => {
      const va = a[state.sort], vb = b[state.sort];
      if (va === null && vb === null) return a.model.localeCompare(b.model);
      if (va === null) return 1;
      if (vb === null) return -1;
      const delta = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return state.direction * delta || a.model.localeCompare(b.model) || a.scope.localeCompare(b.scope);
    });
  }

  function formatCell(key, value) {
    if (value === null || value === undefined) return '—';
    if (key === 'cost') return '$' + value.toFixed(3);
    if (key === 'shift_drop') return (value > 0 ? '+' : '') + value.toFixed(1);
    return value.toFixed(1);
  }

  function render() {
    const visible = sortedRows();
    document.querySelectorAll('[data-view]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.view === state.view)));
    document.getElementById('layerFilter').hidden = state.view !== 'layers';
    document.getElementById('modelFilter').hidden = state.view !== 'layers';
    document.querySelectorAll('[data-metric]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.metric === state.metric)));
    document.querySelectorAll('#lbTable th[data-key]').forEach(th => {
      const selected = th.dataset.key === state.sort;
      if (selected) th.setAttribute('aria-sort', state.direction < 0 ? 'descending' : 'ascending');
      else th.removeAttribute('aria-sort');
      th.querySelector('.sort-arrow').textContent = selected ? (state.direction < 0 ? '↓' : '↑') : '↕';
    });

    let rank = 0;
    tbody.innerHTML = visible.map((row, idx) => {
      if (!idx || typeof row[state.sort] !== 'number' || row[state.sort] !== visible[idx - 1][state.sort]) rank = idx + 1;
      const cells = columns.map(key => {
        const cls = (key === 'target1' ? 'score-cell ' : '') + (key === state.sort ? 'sorted-cell' : '');
        const txt = formatCell(key, row[key]);
        if (key === 'target1') {
          return '<td class="' + cls + '"><span class="table-score-bar" style="width:' + Math.max(0, row.target1) + '%" aria-hidden="true"></span><strong>' + txt + '</strong></td>';
        }
        return '<td class="' + cls + '">' + txt + '</td>';
      }).join('');
      const scopeText = isZh() ? (scopeZh[row.scope] || row.scope) : row.scope;
      return '<tr><td class="rank-cell">' + String(rank).padStart(2, '0') + '</td><th scope="row">' + esc(row.model) + '</th><td class="model-cell">' + esc(scopeText) + '</td>' + cells + '</tr>';
    }).join('');

    if (!visible.length) {
      tbody.innerHTML = '<tr><td colspan="14" class="empty-cell">' + t('No matching results. Reset filters to see all results.', '没有匹配结果，重置筛选可查看全部结果。') + '</td></tr>';
    }

    const acctLabel = state.accounting === 'non_refusal'
      ? t('Non-refusal executed', '非拒答有效运行')
      : t('Refusal-as-0 sensitivity', '拒答计零敏感性');
    document.getElementById('resultStatus').textContent = state.view === 'models'
      ? t(visible.length + ' models · All 117 tasks · ' + acctLabel, visible.length + ' 个模型 · 全部 117 题 · ' + acctLabel)
      : t(visible.length + ' model × layer slices · ' + acctLabel, visible.length + ' 个模型 × 系统层级组合 · ' + acctLabel);
    document.getElementById('exportCsv').disabled = !visible.length;

    const chartPool = visible.filter(r => r[state.metric] !== null && r[state.metric] !== undefined);
    const leaders = [...chartPool].sort((a, b) => b[state.metric] - a[state.metric] || a.model.localeCompare(b.model)).slice(0, 9);
    document.getElementById('chartTitle').textContent = state.view === 'models'
      ? t('Frontier model comparison', '前沿模型横向对比')
      : t('Model × OS Layer comparison', '模型 × 系统层级对比');
    document.getElementById('chartDescription').textContent = t(...metricNames[state.metric]) + t(' · ', ' · ') + acctLabel + t(' · 0–100 scale', ' · 0–100 刻度');
    document.getElementById('chartEmpty').hidden = !!leaders.length;
    chart.innerHTML = leaders.map(row => {
      const sub = state.view === 'layers' ? '<small>' + esc(isZh() ? (scopeZh[row.scope] || row.scope) : row.scope) + '</small>' : '';
      return '<li><span class="chart-name">' + esc(row.model) + sub + '</span><div class="chart-track"><span class="chart-fill" style="width:' + row[state.metric] + '%"></span></div><strong>' + row[state.metric].toFixed(1) + '</strong></li>';
    }).join('');
    chart.dataset.metric = state.metric === 'pass_hat_3' ? 'macro' : (state.metric === 'latent1' ? 'pass' : 'layered');
  }

  document.querySelectorAll('.js-control').forEach(el => el.hidden = false);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    state.view = btn.dataset.view;
    state.scope = 'all'; state.model = 'all'; state.query = '';
    search.value = ''; scopeSelect.value = 'all'; modelSelect.value = 'all';
    if (state.view === 'layers' && (state.metric === 'latent1' || state.metric === 'exposed1')) {
      state.metric = 'target1'; state.sort = 'target1'; state.direction = -1;
    }
    render();
  }));
  document.querySelectorAll('[data-metric]').forEach(btn => btn.addEventListener('click', () => {
    state.metric = btn.dataset.metric; state.sort = state.metric; state.direction = -1; render();
  }));
  document.querySelectorAll('[data-sort]').forEach(btn => btn.addEventListener('click', () => {
    const key = btn.dataset.sort;
    state.direction = key === state.sort ? -state.direction : (['model', 'scope', 'cost', 'cmds', 'tokens_k'].includes(key) ? 1 : -1);
    state.sort = key; render();
  }));
  accountingSelect.addEventListener('change', () => { state.accounting = accountingSelect.value; render(); });
  scopeSelect.addEventListener('change', () => { state.scope = scopeSelect.value; render(); });
  modelSelect.addEventListener('change', () => { state.model = modelSelect.value; render(); });
  search.addEventListener('input', () => { state.query = search.value; render(); });
  document.getElementById('resetFilters').addEventListener('click', () => {
    state.accounting = 'non_refusal'; state.scope = 'all'; state.model = 'all'; state.query = ''; search.value = '';
    localize();
  });
  document.getElementById('exportCsv').addEventListener('click', () => {
    const headers = ['model', 'provider', 'scope', 'accounting', ...columns];
    const quote = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const csv = [headers.join(','), ...sortedRows().map(r => headers.map(k => quote(r[k])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = 'twinenv-' + state.view + '-' + state.accounting + '.csv';
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.addEventListener('tracelite:language', localize);
  localize();
})();
