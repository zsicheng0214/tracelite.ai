#!/usr/bin/env python3
"""Build the standalone TwinEnv-Bench academic report page. No third-party dependencies."""
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Check without writing')
    args = parser.parse_args()
    shell = (ROOT / 'scripts/twinenv_report_shell.html').read_text(encoding='utf-8')
    body = (ROOT / 'scripts/twinenv_report_main.html').read_text(encoding='utf-8')
    assert shell.count('<!-- REPORT_MAIN -->') == 1
    result = shell.replace('<!-- REPORT_MAIN -->', body.rstrip())
    target = ROOT / 'twinenv-bench.html'
    if args.check:
        if not target.exists() or target.read_text(encoding='utf-8') != result:
            raise SystemExit('TwinEnv report is out of date. Run python3 scripts/build_twinenv_report.py')
        print('TwinEnv report verified.')
    else:
        target.write_text(result, encoding='utf-8')
        print('twinenv-bench.html built')


if __name__ == '__main__':
    main()
