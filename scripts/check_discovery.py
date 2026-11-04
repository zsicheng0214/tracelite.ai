#!/usr/bin/env python3
"""Validate the site's crawlable discovery and paper-metadata contract offline.

Run from any directory: python3 scripts/check_discovery.py [--root SITE_DIR]
This checks saved HTML/XML, not HTTP redirects, WAF rules, or search indexing.
Paper authority: https://arxiv.org/abs/2610.32285v1 (23 October 2026).
"""
import argparse
from collections import Counter
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urljoin, urlsplit
from urllib.robotparser import RobotFileParser
import xml.etree.ElementTree as ET

ORIGIN = 'https://tracelite.ai'
PATHS = ('/', '/research.html', '/papers.html', '/timeline.html',
         '/trial-by-trace.html', '/leaderboard.html', '/wechat.html')
TITLE = ('Trial by Trace: Benchmarking AI Agent Harnesses for Reliability '
         'and Failure Attribution')
AUTHORS = ['Zhiyong Cao', 'Hengjie Zhu', 'Yongxin Wang', 'Xuchen Li',
           'Jintao Li', 'Shuxia Liu', 'Dunqiang Liu', 'Bo Wang', 'Kairan Zhang',
           'Cong Lin', 'JiangDi Yu', 'Siyuan Liu', 'Sijia Yao', 'Yi-Liang Wei',
           'Lingxu Ma', 'Aijia Wang', 'Anxin Chen', 'Zixian Wei', 'Xiang Ruan',
           'Ruizhi Xu', 'Ruqian Shi', 'Baihua Xiao', 'Sicheng Zhou']
ARXIV = 'https://arxiv.org/abs/2610.32285'
CODE = 'https://github.com/TraceLite-AI/TraceTrial-Bench'
DATASET = 'https://huggingface.co/datasets/TraceLite-AI/TraceTrial-Bench'
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())


def normalized(value):
    return ' '.join(value.split())


class Node:
    def __init__(self, tag='', attrs=(), line=0):
        self.tag, self.attrs, self.line, self.children = tag, dict(attrs), line, []

    def text(self, exclude=()):
        if self.tag in exclude:
            return ''
        return ''.join(x.text(exclude) if isinstance(x, Node) else x
                       for x in self.children)


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.raw = path.read_text(encoding='utf-8')
        self.root = Node()
        self.stack, self.nodes = [self.root], []
        self.feed(self.raw)
        self.close()

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.getpos()[0])
        self.stack[-1].children.append(node)
        self.nodes.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)

    def tags(self, tag):
        return [n for n in self.nodes if n.tag == tag]

    def meta(self, name):
        return [n.attrs.get('content', '') for n in self.tags('meta')
                if (n.attrs.get('name') or n.attrs.get('property') or '').lower() == name]

    def canonical(self):
        return [n.attrs.get('href', '') for n in self.tags('link')
                if 'canonical' in (n.attrs.get('rel') or '').lower().split()]

    def links(self, base):
        return [urljoin(base, n.attrs.get('href', '')) for n in self.tags('a')
                if n.attrs.get('href')]


class Check:
    def __init__(self):
        self.errors, self.count = [], 0

    def require(self, condition, location, message):
        self.count += 1
        if not condition:
            self.errors.append('{}: {}'.format(location, message))


def json_objects(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from json_objects(child)
    elif isinstance(value, list):
        for child in value:
            yield from json_objects(child)


def check_pdf(check, root, url):
    loc = 'trial-by-trace.html: citation_pdf_url'
    parsed = urlsplit(url)
    check.require(parsed.scheme == 'https' and parsed.netloc == 'tracelite.ai', loc,
                  'must use the real same-site HTTPS PDF, not an external arXiv URL')
    check.require(not parsed.query and not parsed.fragment and
                  Path(parsed.path).parent.as_posix() == '/', loc,
                  'PDF must be in the same root subdirectory as the paper HTML')
    candidate = (root / unquote(parsed.path).lstrip('/')).resolve()
    if candidate.parent != root.resolve() or candidate.suffix.lower() != '.pdf':
        check.require(False, loc, 'expected a root-level .pdf file; omit tag until available')
        return
    if not candidate.is_file():
        check.require(False, loc, 'local PDF is missing; omit tag until a verified mirror exists')
        return
    data = candidate.read_bytes()
    check.require(len(data) <= 5_000_000, loc, 'PDF exceeds the 5 MB acceptance limit')
    # Reject HTML error pages, partial downloads, and PDFs without a usable trailer.
    match = re.search(rb'startxref\s+(\d+)\s+%%EOF\s*$', data[-2048:])
    signature_ok = bool(re.match(rb'%PDF-\d\.\d', data[:10]))
    trailer_ok = bool(match and int(match.group(1)) < len(data))
    if trailer_ok:
        xref = data[int(match.group(1)):][:200]
        trailer_ok = xref.startswith(b'xref') or bool(re.match(rb'\d+\s+\d+\s+obj', xref))
    check.require(signature_ok and trailer_ok, loc,
                  'file lacks PDF signature/trailer/xref; partial files are not valid mirrors')


def run(root):
    check, pages = Check(), {}
    expected = {ORIGIN + path for path in PATHS}
    sitemap = root / 'sitemap.xml'
    try:
        xml = ET.parse(sitemap).getroot()
        ns = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
        check.require(xml.tag == ns + 'urlset', 'sitemap.xml', 'use the sitemap urlset namespace')
        entries = xml.findall(ns + 'url')
        check.require(all(len(entry.findall(ns + 'loc')) == 1 for entry in entries),
                      'sitemap.xml', 'each url entry must contain exactly one loc')
        locations = [(x.text or '').strip() for x in xml.findall(ns + 'url/' + ns + 'loc')]
        check.require(set(locations) == expected, 'sitemap.xml',
                      'canonical URLs differ; missing={}, unexpected={}'.format(
                          sorted(expected - set(locations)), sorted(set(locations) - expected)))
        check.require(len(locations) == len(set(locations)), 'sitemap.xml', 'duplicate loc entries')
    except (OSError, ET.ParseError) as exc:
        check.require(False, 'sitemap.xml', str(exc))

    for path in PATHS:
        name = 'index.html' if path == '/' else path.lstrip('/')
        try:
            page = Page(root / name)
        except (OSError, UnicodeError) as exc:
            check.require(False, name, str(exc))
            continue
        pages[path] = page
        canonical = ORIGIN + path
        check.require(page.canonical() == [canonical], name,
                      'require exactly one canonical pointing to ' + canonical)
        titles = page.tags('title')
        check.require(len(titles) == 1 and bool(normalized(titles[0].text())), name,
                      'require one nonempty document title')
        descriptions = page.meta('description')
        check.require(len(descriptions) == 1 and bool(descriptions[0].strip()), name,
                      'require one nonempty description')
        counts = Counter((n.attrs.get('name') or n.attrs.get('property') or '').lower()
                         for n in page.tags('meta'))
        duplicates = [k for k, n in counts.items() if k and n > 1 and k != 'citation_author']
        check.require(not duplicates, name, 'duplicate metadata fields: ' + ', '.join(duplicates))
        for key in ('robots', 'googlebot', 'bingbot', 'oai-searchbot'):
            directives = ','.join(page.meta(key)).lower()
            check.require(not re.search(r'\b(noindex|none)\b', directives), name,
                          'sitemap page is excluded by ' + key + ' metadata')
        for value in page.meta('og:url'):
            check.require(value == canonical, name, 'og:url must equal canonical')
        refresh = [n for n in page.tags('meta') if n.attrs.get('http-equiv', '').lower() == 'refresh']
        check.require(not refresh, name, 'sitemap must contain content pages, not meta-refresh aliases')
        # Structured data is optional. Reject malformed JSON or contradictory article facts if supplied.
        for script in page.tags('script'):
            if script.attrs.get('type', '').lower() != 'application/ld+json':
                continue
            try:
                structured = json.loads(script.text())
            except (ValueError, TypeError) as exc:
                check.require(False, '{}:{}'.format(name, script.line), 'invalid JSON-LD: ' + str(exc))
                continue
            for obj in json_objects(structured):
                if obj.get('@type') == 'ScholarlyArticle' and path == '/trial-by-trace.html':
                    for key, value in [('headline', TITLE), ('datePublished', '2026-10-23')]:
                        if key in obj:
                            check.require(obj[key] == value, name, 'JSON-LD ' + key + ' contradicts arXiv v1')
        for node in page.tags('a'):
            href = node.attrs.get('href', '')
            target = urlsplit(urljoin(canonical, href))
            if target.netloc == 'tracelite.ai' and target.path.rstrip('/') == '/trial-by-trace':
                check.require(False, '{}:{}'.format(name, node.line),
                              'internal report link must use trial-by-trace.html: ' + href)

    titles = [normalized(p.tags('title')[0].text()) for p in pages.values() if p.tags('title')]
    check.require(len(titles) == len(set(titles)), 'site', 'indexable pages must have distinct titles')
    home = pages.get('/')
    if home:
        public_copy = home.root.text(exclude=('script', 'style', 'template'))
        public_copy += ' '.join(value for node in home.nodes for key, value in node.attrs.items()
                                if key in ('data-en', 'data-zh', 'alt', 'title', 'aria-label') and value)
        check.require(not re.search(r'\bplaceholder\b', public_copy, re.I), 'index.html',
                      'remove Placeholder text/translation values from the public homepage')
        links = home.links(ORIGIN + '/')
        for url in [ORIGIN + '/trial-by-trace.html', ARXIV, CODE, DATASET]:
            check.require(url in links, 'index.html', 'missing raw HTML resource link: ' + url)

    report = pages.get('/trial-by-trace.html')
    if report:
        name = 'trial-by-trace.html'
        for key, value in [('citation_title', TITLE), ('citation_publication_date', '2026/10/23'),
                           ('citation_arxiv_id', '2610.32285')]:
            check.require(report.meta(key) == [value], name, key + ' must equal ' + value)
        if report.meta('citation_online_date'):
            check.require(report.meta('citation_online_date') == ['2026/10/23'], name,
                          'citation_online_date must match arXiv v1')
        check.require(report.meta('citation_author') == AUTHORS, name,
                      'citation_author must contain all 23 authors in arXiv v1 order')
        report_titles = report.tags('title')
        check.require(len(report_titles) == 1 and TITLE in normalized(report_titles[0].text()),
                      name, 'document title must include the complete paper title')
        heads = report.tags('h1')
        check.require(len(heads) == 1 and normalized(heads[0].text()) == TITLE, name,
                      'raw HTML h1 must contain the complete paper title')
        visible_authors = [normalized(n.text(exclude=('sup',))) for n in report.nodes
                           if 'author-name' in (n.attrs.get('class') or '').split()]
        check.require(visible_authors == AUTHORS, name, 'visible author list must match citation_author order')
        ids = {n.attrs['id']: n for n in report.nodes if n.attrs.get('id')}
        for section in ['abstract', 'problem', 'method', 'dimensions', 'protocol', 'results',
                        'cases', 'limitations', 'resources', 'cite']:
            check.require(section in ids and len(normalized(ids[section].text(exclude=('script', 'style')))) >= 30,
                          name, 'missing substantive raw HTML section #' + section)
        citation = ids.get('citation')
        bibtex = citation.text() if citation else ''
        for pattern, label in [(r'@(?:misc|article)\s*\{', 'entry'),
                               (r'year\s*=\s*\{2026\}', 'year 2026'),
                               (r'eprint\s*=\s*\{2610\.32285\}', 'arXiv identifier'),
                               (r'archivePrefix\s*=\s*\{arXiv\}', 'arXiv archive')]:
            check.require(bool(re.search(pattern, bibtex, re.I)), name, 'BibTeX missing ' + label)
        bib_authors = re.search(r'author\s*=\s*\{([^}]+)\}', bibtex, re.I)
        expected_bib_authors = [author.rsplit(' ', 1)[1] + ', ' + author.rsplit(' ', 1)[0]
                                for author in AUTHORS]
        actual_bib_authors = [normalized(author) for author in
                              re.split(r'\s+and\s+', bib_authors.group(1).strip())] if bib_authors else []
        check.require(actual_bib_authors == expected_bib_authors, name,
                      'BibTeX authors must match the complete arXiv v1 author order')
        links = report.links(ORIGIN + '/trial-by-trace.html')
        for url in [ARXIV, CODE, DATASET]:
            check.require(url in links, name, 'missing raw HTML resource link: ' + url)
        check.require(any(urlsplit(u).netloc == 'tracelite.ai' and
                          urlsplit(u).path in ('/', '/index.html') for u in links),
                      name, 'missing link back to the official team homepage')
        pdf_urls = report.meta('citation_pdf_url')
        check.require(len(pdf_urls) <= 1, name, 'duplicate citation_pdf_url tags')
        for url in pdf_urls:
            check_pdf(check, root, url)

    robots_path = root / 'robots.txt'
    try:
        robots_text = robots_path.read_text(encoding='utf-8')
        robots = RobotFileParser()
        robots.parse(robots_text.splitlines())
        check.require(robots.site_maps() == [ORIGIN + '/sitemap.xml'], 'robots.txt',
                      'require one Sitemap pointing to the canonical sitemap.xml')
        agents = [line.split(':', 1)[1].strip().lower() for line in robots_text.splitlines()
                  if line.split(':', 1)[0].strip().lower() == 'user-agent' and ':' in line]
        for agent in ['*', 'googlebot', 'oai-searchbot']:
            check.require(agent in agents, 'robots.txt', 'missing explicit User-agent: ' + agent)
        check.require('gptbot' not in agents, 'robots.txt', 'keep GPTBot under the unchanged wildcard policy')
        for agent in ['Googlebot', 'OAI-SearchBot', 'GPTBot', 'OtherBot']:
            for path in PATHS:
                check.require(robots.can_fetch(agent, ORIGIN + path), 'robots.txt',
                              '{} cannot crawl {}'.format(agent, path))
    except (OSError, UnicodeError) as exc:
        check.require(False, 'robots.txt', str(exc))
    return check


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    check = run(args.root)
    if check.errors:
        print('FAIL: {} discovery issue(s)'.format(len(check.errors)))
        for error in check.errors:
            print('  - ' + error)
        return 1
    print('PASS: {} static discovery checks across 7 canonical pages.'.format(check.count))
    print('HTTP redirects, real crawler access, PDF content fidelity, and indexing require separate verification.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
