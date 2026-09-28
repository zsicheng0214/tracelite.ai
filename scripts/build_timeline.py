#!/usr/bin/env python3
"""Generate static timeline HTML from data/timeline.json. No dependencies."""
import argparse
import calendar
import datetime
import html
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
TYPES = {
    "report": ("Technical report", "技术报告"),
    "paper": ("Paper", "论文"),
    "media": ("Media", "媒体动态"),
}
DATE_KINDS = {
    "document": ("Report dated", "报告日期"),
    "article": ("Article published", "文章发布"),
    "proceedings": ("Proceedings", "论文集收录"),
    "submission": ("arXiv v1 submitted", "arXiv 首版提交"),
    "release": ("Released", "公开发布"),
    "conference": ("Conference year", "会议年份"),
}


def esc(value):
    return html.escape(str(value), quote=True)


def bilingual(value):
    if isinstance(value, (list, tuple)):
        value = dict(zip(("en", "zh"), value))
    return 'data-en="{}" data-zh="{}">{}'.format(
        esc(value["en"]), esc(value["zh"]), esc(value["en"]))


def validate(entries):
    if not isinstance(entries, list):
        raise ValueError("Timeline must be an array")
    seen = set()
    for entry in entries:
        slug = entry["id"]
        if not re.fullmatch(r"[a-z][a-z0-9-]*", slug) or slug in seen:
            raise ValueError("Invalid or duplicate entry id: " + slug)
        seen.add(slug)
        if entry["type"] not in TYPES or entry["dateKind"] not in DATE_KINDS:
            raise ValueError("Unknown type or dateKind: " + slug)
        date = entry["date"]
        if not re.fullmatch(r"\d{4}(-\d{2}){0,2}", date):
            raise ValueError("Use YYYY, YYYY-MM, or YYYY-MM-DD: " + slug)
        datetime.date.fromisoformat(date + {4: "-01-01", 7: "-01", 10: ""}[len(date)])
        if not isinstance(entry.get("visible", True), bool):
            raise ValueError("visible must be a boolean: " + slug)
        if not isinstance(entry.get("links"), list):
            raise ValueError("links must be a list (may be empty): " + slug)
        for value in [entry["title"], entry["summary"]] + [link["label"] for link in entry["links"]]:
            if any(not isinstance(value.get(lang), str) or not value[lang].strip() for lang in ("en", "zh")):
                raise ValueError("English and Chinese text required: " + slug)
        for link in entry["links"]:
            parsed = urlsplit(link["href"])
            if parsed.scheme == "https" and parsed.netloc:
                continue
            if parsed.scheme or parsed.netloc or not parsed.path or parsed.path.startswith("/"):
                raise ValueError("Use HTTPS or a relative local file: " + slug)
            target = (ROOT / parsed.path).resolve()
            if ROOT not in target.parents or not target.is_file():
                raise ValueError("Missing or invalid local link: " + link["href"])
    return sorted((entry for entry in entries if entry.get("visible", True)),
                  key=lambda entry: entry["date"], reverse=True)


def format_date(date):
    parts = [int(part) for part in date.split("-")]
    if len(parts) == 1:
        return str(parts[0]), "{} 年".format(parts[0])
    year, month = parts[:2]
    if len(parts) == 2:
        return "{} {}".format(calendar.month_name[month], year), "{} 年 {} 月".format(year, month)
    return "{} {}, {}".format(calendar.month_abbr[month], parts[2], year), "{}.{}.{}".format(year, str(month).zfill(2), str(parts[2]).zfill(2))


def render_link(link):
    external = urlsplit(link["href"]).scheme == "https"
    attrs = ' target="_blank" rel="noopener noreferrer"' if external or ".pdf" in link["href"] else ""
    return '<a href="{}"{}><span {} </span><span aria-hidden="true">{}</span></a>'.format(
        esc(link["href"]), attrs, bilingual(link["label"]), "↗" if attrs else "→")


def render_entry(entry, compact=False):
    prefix = "latest-" if compact else ""
    venue = '<span class="entry-venue">{}</span>'.format(esc(entry["venue"])) if entry.get("venue") else ""
    return '''<li class="timeline-entry" id="{prefix}{id}" data-type="{type}" data-year="{year}">
  <div class="entry-date"><time datetime="{date}" {date_label}</time><span class="date-context" {context}</span></div>
  <article class="entry-body" aria-labelledby="{prefix}{id}-title">
    <div class="entry-meta"><span class="entry-type" {type_label}</span>{venue}</div>
    <h3 class="entry-title" id="{prefix}{id}-title" {title}</h3>
    <p class="entry-summary" {summary}</p>
{links}
  </article>
</li>'''.format(prefix=prefix, id=entry["id"], type=entry["type"], year=entry["date"][:4],
               date=entry["date"], date_label=bilingual(format_date(entry["date"])),
               context=bilingual(DATE_KINDS[entry["dateKind"]]), type_label=bilingual(TYPES[entry["type"]]),
               venue=venue, title=bilingual(entry["title"]), summary=bilingual(entry["summary"]),
               links=('    <div class="entry-links">' + "".join(render_link(link) for link in entry["links"]) + '</div>') if entry["links"] else "")


def replace_section(source, marker, content):
    start, end = "<!-- {}:START -->".format(marker), "<!-- {}:END -->".format(marker)
    if source.count(start) != 1 or source.count(end) != 1:
        raise ValueError("Expected one pair of markers: " + marker)
    before, rest = source.split(start)
    _, after = rest.split(end)
    return before + start + "\n" + content + "\n" + end + after


def generate(entries):
    years = sorted({entry["date"][:4] for entry in entries}, reverse=True)
    groups = []
    for year in years:
        rows = "\n".join(render_entry(entry) for entry in entries if entry["date"].startswith(year))
        groups.append('<section class="timeline-year" data-year="{0}" aria-labelledby="year-{0}"><h2 class="year-label" id="year-{0}">{0}</h2><ol class="timeline-list">\n{1}\n</ol></section>'.format(year, rows))
    timeline = (ROOT / "timeline.html").read_text()
    timeline = replace_section(timeline, "TIMELINE", "\n".join(groups))
    options = '<option value="all" {} </option>\n'.format(bilingual(("All years", "全部年份")))
    options += "\n".join('<option value="{0}">{0}</option>'.format(year) for year in years)
    timeline = replace_section(timeline, "TIMELINE-YEARS", options)
    home = (ROOT / "index.html").read_text()
    home = replace_section(home, "TIMELINE-PREVIEW", '<ol class="timeline-list">\n' + "\n".join(render_entry(entry, True) for entry in entries) + '\n</ol>')
    latest = next((entry for entry in entries if entry["type"] == "report"), None)
    note = ""
    if latest:
        note = '<a href="{}" {}</a>'.format(esc(latest["links"][0]["href"]), bilingual({"en": "Latest report · " + latest["title"]["en"] + " →", "zh": "最新报告 · " + latest["title"]["zh"] + " →"}))
    home = replace_section(home, "LATEST-REPORT", note)
    return {ROOT / "timeline.html": timeline, ROOT / "index.html": home}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if generated HTML is out of date")
    args = parser.parse_args()
    try:
        entries = validate(json.loads((ROOT / "data/timeline.json").read_text()))
        output = generate(entries)
    except (ValueError, KeyError, TypeError, OSError) as error:
        parser.exit(1, "Timeline error: {}\n".format(error))
    stale = []
    for path, content in output.items():
        if path.read_text() != content:
            stale.append(path.name)
            if not args.check:
                path.write_text(content)
    if args.check and stale:
        parser.exit(1, "Run python3 scripts/build_timeline.py to update: " + ", ".join(stale) + "\n")
    print("Timeline {}: {} entries; homepage scrolls through all of them.".format("verified" if args.check else "generated", len(entries)))


if __name__ == "__main__":
    main()
