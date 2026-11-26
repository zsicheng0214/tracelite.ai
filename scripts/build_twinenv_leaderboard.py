#!/usr/bin/env python3
"""Build static TwinEnv-Bench leaderboard and its interactive data from data/twinenv_leaderboard.json."""
import argparse
import html
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COLUMNS = ('target1', 'base1', 'shift_drop', 'exposed1', 'latent1', 'pass_at_3', 'pass_hat_3', 'probe_pct', 'cmds', 'tokens_k', 'cost')


def fmt(key, val):
    if val is None:
        return '—'
    if key == 'cost':
        return '$' + format(val, '.3f')
    if key == 'shift_drop':
        return ('+' if val > 0 else '') + format(val, '.1f')
    return format(val, '.1f')


def build():
    rows = json.loads((ROOT / 'data/twinenv_leaderboard.json').read_text(encoding='utf-8'))
    keys = [(r['model'], r['scope'], r['accounting']) for r in rows]
    if len(keys) != len(set(keys)):
        raise ValueError('Duplicate (model, scope, accounting) row')
    for r in rows:
        for k in COLUMNS:
            v = r[k]
            if v is None and k in ('exposed1', 'latent1') and r['scope'] != 'All 117 tasks':
                continue
            if not isinstance(v, (int, float)) or not math.isfinite(v):
                raise ValueError(f'Invalid {k}: {r}')

    primary = sorted(
        (r for r in rows if r['scope'] == 'All 117 tasks' and r['accounting'] == 'non_refusal'),
        key=lambda r: -r['target1'],
    )
    table, chart = [], []
    for rank, r in enumerate(primary, 1):
        name = html.escape(r['model'])
        cells = []
        for k in COLUMNS:
            v_str = fmt(k, r[k])
            if k == 'target1':
                cells.append(f'<td class="score-cell"><span class="table-score-bar" style="width:{r["target1"]}%" aria-hidden="true"></span><strong>{v_str}</strong></td>')
            else:
                cells.append(f'<td>{v_str}</td>')
        table.append(f'<tr><td class="rank-cell">{rank:02}</td><th scope="row">{name}</th><td class="model-cell">All 117 tasks</td>' + ''.join(cells) + '</tr>')
        chart.append(f'<li><span class="chart-name">{name}</span><div class="chart-track"><span class="chart-fill" style="width:{r["target1"]}%"></span></div><strong>{r["target1"]:.1f}</strong></li>')

    shell = (ROOT / 'scripts/twinenv_leaderboard_shell.html').read_text(encoding='utf-8')
    replacements = {
        '<!-- STATIC_ROWS -->': '\n'.join(table),
        '<!-- STATIC_CHART -->': '\n'.join(chart),
        '<!-- LEADERBOARD_DATA -->': json.dumps(rows, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c'),
    }
    for marker, value in replacements.items():
        if shell.count(marker) != 1:
            raise ValueError(f'Expected one {marker}')
        shell = shell.replace(marker, value)
    return shell


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    content = build()
    target = ROOT / 'twinenv-leaderboard.html'
    if args.check:
        if not target.exists() or target.read_text(encoding='utf-8') != content:
            raise SystemExit('TwinEnv leaderboard is out of date. Run python3 scripts/build_twinenv_leaderboard.py')
        print('TwinEnv leaderboard verified.')
    else:
        target.write_text(content, encoding='utf-8')
        print('twinenv-leaderboard.html built')


if __name__ == '__main__':
    main()
