#!/usr/bin/env python3
"""Build a static leaderboard and its interactive data from one JSON source."""
import argparse
import html
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
METRICS = ('layered', 'pass', 'score', 'macro', 'clean', 'cost', 'in_k', 'out_k', 'total_k')


def build():
    rows = json.loads((ROOT / 'data/leaderboard.json').read_text())
    pairs = [(r['model'], r['harness']) for r in rows]
    if len(pairs) != len(set(pairs)):
        raise ValueError('Duplicate model/harness row')
    for row in rows:
        for key in METRICS:
            value = row[key]
            if not isinstance(value, (float, int)) or not math.isfinite(value) or value < 0:
                raise ValueError(f'Invalid {key}: {row}')
            if key in ('layered', 'pass', 'score', 'macro', 'clean') and value > 100:
                raise ValueError(f'Invalid percentage: {row}')
    aggregate = sorted((r for r in rows if r['model'] == 'All models' and r['harness'] != 'All Harnesses'), key=lambda r: -r['layered'])
    table, chart = [], []
    for rank, row in enumerate(aggregate, 1):
        name = html.escape(row['harness'])
        cells = []
        for key in METRICS:
            value = ('$' + format(row[key], '.3f')) if key == 'cost' else format(row[key], '.1f')
            cls = ' class="score-cell"' if key == 'layered' else ''
            cells.append(f'<td{cls}>{value}</td>')
        table.append(f'<tr><td class="rank-cell">{rank:02}</td><th scope="row">{name}</th><td class="model-cell">All 9 models</td>'+''.join(cells)+'</tr>')
        chart.append(f'<li><span class="chart-name">{name}</span><div class="chart-track"><span class="chart-fill" style="width:{row["layered"]}%"></span></div><strong>{row["layered"]:.1f}</strong></li>')
    shell = (ROOT / 'scripts/leaderboard_shell.html').read_text()
    replacements = {'<!-- STATIC_ROWS -->': '\n'.join(table), '<!-- STATIC_CHART -->': '\n'.join(chart), '<!-- LEADERBOARD_DATA -->': json.dumps(rows, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')}
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
    target = ROOT / 'leaderboard.html'
    if args.check:
        if not target.exists() or target.read_text() != content:
            raise SystemExit('Leaderboard is out of date. Run python3 scripts/build_leaderboard.py')
        print('Leaderboard verified.')
    else:
        target.write_text(content)
        print('leaderboard.html built')


if __name__ == '__main__':
    main()
