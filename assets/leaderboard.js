/* Data is embedded by build_leaderboard.py from data/leaderboard.json. */
(() => {
  const rows = JSON.parse(document.getElementById('leaderboardData').textContent);
  const harnessRows = rows.filter(row => row.model === 'All models' && row.harness !== 'All Harnesses');
  const pairRows = rows.filter(row => row.model !== 'All models' && row.harness !== 'All Harnesses');
  const models = [...new Set(pairRows.map(row => row.model))];
  const harnesses = harnessRows.map(row => row.harness);
  const columns = ['layered', 'pass', 'score', 'macro', 'clean', 'cost', 'in_k', 'out_k', 'total_k'];
  const tbody = document.querySelector('#lbTable tbody');
  const modelSelect = document.getElementById('lbModel');
  const harnessSelect = document.getElementById('lbHarness');
  const search = document.getElementById('lbSearch');
  const chart = document.getElementById('lbChart');
  const isZh = () => document.documentElement.lang === 'zh-CN';
  const t = (en, zh) => isZh() ? zh : en;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const state = {view:'harness', sort:'layered', direction:-1, metric:'layered', model:'all', harness:'all', query:''};
  const metricNames = {layered:['Overall score','综合得分'], pass:['Task pass','任务通过率'], macro:['Harness macro','框架宏平均']};
  const metricName = () => t(...metricNames[state.metric]);

  function fillOptions(select, values, allLabel, selected) {
    select.replaceChildren(new Option(allLabel, 'all'), ...values.map(value => new Option(value, value)));
    select.value = selected;
  }
  function localize() {
    fillOptions(modelSelect, models, t('All models','全部模型'), state.model);
    fillOptions(harnessSelect, harnesses, t('All harnesses','全部框架'), state.harness);
    search.placeholder = t('Search results…','搜索结果…');
    render();
  }
  function filteredRows() {
    return (state.view === 'harness' ? harnessRows : pairRows).filter(row =>
      (state.view === 'harness' || state.model === 'all' || row.model === state.model) &&
      (state.harness === 'all' || row.harness === state.harness) &&
      (state.view === 'harness' ? row.harness : row.model + ' ' + row.harness).toLowerCase().includes(state.query.trim().toLowerCase())
    );
  }
  function sortedRows() {
    return filteredRows().sort((a,b) => {
      const delta = typeof a[state.sort] === 'number' ? a[state.sort] - b[state.sort] : a[state.sort].localeCompare(b[state.sort]);
      return state.direction * delta || a.harness.localeCompare(b.harness) || a.model.localeCompare(b.model);
    });
  }
  const format = (key, value) => key === 'cost' ? '$' + value.toFixed(3) : value.toFixed(1);

  function render() {
    const visible = sortedRows();
    document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
    document.getElementById('modelFilter').hidden = state.view !== 'cells';
    document.querySelectorAll('[data-metric]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.metric === state.metric)));
    document.querySelectorAll('#lbTable th[data-key]').forEach(th => {
      const selected = th.dataset.key === state.sort;
      if (selected) th.setAttribute('aria-sort', state.direction < 0 ? 'descending' : 'ascending');
      else th.removeAttribute('aria-sort');
      th.querySelector('.sort-arrow').textContent = selected ? (state.direction < 0 ? '↓' : '↑') : '↕';
    });
    // Display competition ranks for numeric metrics: ties share a rank.
    let rank = 0;
    tbody.innerHTML = visible.map((row,index) => {
      if (!index || typeof row[state.sort] !== 'number' || row[state.sort] !== visible[index-1][state.sort]) rank = index + 1;
      const cells = columns.map(key => {
        const cls = (key === 'layered' ? 'score-cell ' : '') + (key === state.sort ? 'sorted-cell' : '');
        return '<td class="' + cls + '">' + (key === 'layered' ? '<span class="table-score-bar" style="width:' + row.layered + '%" aria-hidden="true"></span><strong>' + format(key,row[key]) + '</strong>' : format(key,row[key])) + '</td>';
      }).join('');
      return '<tr><td class="rank-cell">' + String(rank).padStart(2,'0') + '</td><th scope="row">' + esc(row.harness) + '</th><td class="model-cell">' + esc(state.view === 'harness' ? t('All 9 models','全部 9 个模型') : row.model) + '</td>' + cells + '</tr>';
    }).join('');
    if (!visible.length) tbody.innerHTML = '<tr><td colspan="12" class="empty-cell">' + t('No matching results. Reset filters to see all results.','没有匹配结果，重置筛选可查看全部结果。') + '</td></tr>';
    document.getElementById('resultStatus').textContent = state.view === 'harness'
      ? t(visible.length + ' harnesses · 855 runs each',visible.length + ' 个运行框架 · 每个 855 次运行')
      : t(visible.length + ' model–harness pairs · 95 runs each',visible.length + ' 个模型–框架组合 · 每个 95 次运行');
    document.getElementById('exportCsv').disabled = !visible.length;
    const leaders = [...visible].sort((a,b) => b[state.metric] - a[state.metric] || a.harness.localeCompare(b.harness) || a.model.localeCompare(b.model)).slice(0,8);
    document.getElementById('chartTitle').textContent = state.view === 'harness' ? t('Harness comparison','运行框架对比') : t('Model × harness comparison','模型 × 运行框架对比');
    document.getElementById('chartDescription').textContent = metricName() + t(' · 0–100 scale',' · 0–100 刻度') + (visible.length > 8 ? t(' · Top 8 of the filtered results',' · 筛选结果的前 8 名') : '') + (state.metric === 'layered' ? t(' · Equal weight for both layers',' · 两层等权') : '');
    document.getElementById('chartEmpty').hidden = !!visible.length;
    chart.innerHTML = leaders.map(row => '<li><span class="chart-name">' + esc(state.view === 'harness' ? row.harness : row.model) + (state.view === 'cells' ? '<small>' + esc(row.harness) + '</small>' : '') + '</span><div class="chart-track"><span class="chart-fill" style="width:' + row[state.metric] + '%"></span></div><strong>' + row[state.metric].toFixed(1) + '</strong></li>').join('');
    chart.dataset.metric = state.metric;
  }

  document.querySelectorAll('.js-control').forEach(element => element.hidden = false);
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    state.view = button.dataset.view;
    state.model = 'all'; state.harness = 'all'; state.query = '';
    search.value = ''; modelSelect.value = 'all'; harnessSelect.value = 'all';
    render();
  }));
  document.querySelectorAll('[data-metric]').forEach(button => button.addEventListener('click', () => {
    state.metric = button.dataset.metric; state.sort = state.metric; state.direction = -1; render();
  }));
  document.querySelectorAll('[data-sort]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.sort;
    state.direction = key === state.sort ? -state.direction : (['harness','model','cost','in_k','out_k','total_k'].includes(key) ? 1 : -1);
    state.sort = key; render();
  }));
  modelSelect.addEventListener('change', () => {state.model = modelSelect.value; render();});
  harnessSelect.addEventListener('change', () => {state.harness = harnessSelect.value; render();});
  search.addEventListener('input', () => {state.query = search.value; render();});
  document.getElementById('resetFilters').addEventListener('click', () => {
    state.model = 'all'; state.harness = 'all'; state.query = ''; search.value = ''; localize();
  });
  document.getElementById('exportCsv').addEventListener('click', () => {
    const headers = ['harness','model',...columns];
    const quote = value => '"' + String(value).replace(/"/g,'""') + '"';
    const csv = [headers.join(','), ...sortedRows().map(row => headers.map(key => quote(row[key])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = 'tracetrial-' + state.view + '.csv';
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
  });
  document.addEventListener('tracelite:language', localize);
  localize();
})();
