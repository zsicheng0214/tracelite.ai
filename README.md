# TraceLite AI website

Static HTML, CSS, and JavaScript for [tracelite.ai](https://tracelite.ai/). Generated HTML is checked in, so hosting needs no build step or package installation. A dependency-free Python script updates the timeline when its content changes.

## Preview

From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/` for the homepage, `http://127.0.0.1:8765/timeline.html` for the timeline, or `http://127.0.0.1:8765/trial-by-trace.html` for the report page.

## Adding reports and milestones / 后续新增报告

The homepage presents the organization, a latest-report link, and every visible timeline entry in a scrolling panel. `timeline.html` contains the complete selected history with type and year filters. Every report keeps its own permanent project page; PDF links can be added when a PDF release is requested. Both views are generated from **`data/timeline.json`**; do not edit the generated HTML blocks by hand.

新增报告时，在 `data/timeline.json` 中复制一条记录，填写中英文标题、简介、日期和链接，然后运行以下命令。首页滚动时间线、最新报告入口、完整时间线与年份选项会同步更新，无需改页面布局。

```sh
python3 scripts/build_timeline.py
python3 scripts/build_timeline.py --check
```

Entry fields:

- `id`: a unique, permanent lowercase slug; also becomes the timeline anchor.
- `type`: `report`, `paper`, or `media`.
- `date`: `YYYY-MM-DD`, `YYYY-MM`, or `YYYY`; preserve the precision of the source. Entries sort newest first; entries with the same date retain their order in the JSON. Within a year or month, entries with less precise dates follow entries with more precise dates.
- `dateKind`: `document` for the report's own date; `release` for a confirmed public release; `article` for media publication; `proceedings` for a proceedings date; `submission` for an arXiv v1 submission; `conference` for a conference year when no exact publication or acceptance date is supplied. These are displayed alongside the date. A report date does not imply a public release date.
- `title` and `summary`: objects with `en` and `zh` text.
- `venue`: optional conference, outlet, or benchmark name.
- `links`: one or more `{ "href": "...", "label": { "en": "...", "zh": "..." } }` objects. The first link is the main report or paper link. Local files must exist; external links must use HTTPS.
- `visible`: optional boolean, default `true`. Set `false` to omit an entry from the generated pages while preparing content. This is an editorial switch, not access control: files committed to a public repository remain public. Dates do not schedule publication automatically.

Commit the updated JSON and generated `index.html` / `timeline.html` together. The generator escapes text and validates dates, unique IDs, required translations, and local file links. `--check` checks that the rendered pages match the data without writing files. Generated content is readable and crawlable without JavaScript; JS adds filtering and language switching.

Share a filtered view with `timeline.html?type=report`, or a particular entry with `timeline.html#trial-by-trace`.

Initial dated entries come from the supplied Trial by Trace PDF, the linked InfoQ article, the official ACL Anthology records, and arXiv's submission history. Undated manuscripts remain in the existing paper list rather than being assigned invented timeline dates.

The team confirmed that MM-VeriRubric and Disentangled Privileged States were accepted to EMNLP 2026. These entries use the conference year only. No acceptance day, track, author list, or proceedings URL has been inferred. The team also confirmed acceptance for Select Less, Reason More (CVPR 2026), Look Less, Reason More (ACL 2026), and SimRPD (ACL 2026 Industry). SimRPD retains its existing Oral designation. Public pages show conference names and years without a separate Accepted badge or acceptance sentence; only Oral receives a special distinction label.

FishCaduceus and FishNALM were removed from the public paper listings at the team’s request; their source image files are retained. STAFDD remains listed separately under Computer Vision / Aquaculture.

## Blog

The homepage has a separate `#blog` section after the research output, with three selected notes and a link to the full blog. Its cards reuse the existing illustrations and articles. `blog.html#useful-agent-benchmarks`, `blog.html#synthetic-trajectories`, and `blog.html#beyond-pass-at-one` open the corresponding article directly and remain readable without JavaScript. Keep article IDs stable when updating titles or text. To feature a new post, add its article to the blog and update a homepage card to its permanent link.

## Research release

- `trial-by-trace.html` and `assets/trial-by-trace.{css,js}` contain the bilingual report page, three interactive trace cases, and citation copying.
- The supplied `papers/Trial_by_Trace.pdf` stays local and is excluded by `.gitignore`. It is not part of the repository or deployment, and public pages offer no PDF download. Citations link to the HTML project page. The report's internal document date is September 17, 2026; the website does not invent a public release date.
- `assets/site.{css,js}` provide shared timeline navigation, persistent language selection, and mobile navigation. The storage key is `tracelite-lang`, with values `en` and `zh-CN`.
- Retained papers and blog articles keep their original content. The new report material is bilingual; existing paper titles and abstracts are not newly translated.
- `CNAME` is preserved for the existing domain. The site uses relative internal paths and can be served as static files.

## Editorial handoff

The supplied PDF contains inconsistent figures: its abstract and conclusion say 30.9%, while Table 9 gives 1,065 / 3,420 (31.1% rounded). Figure 7 also differs from Table 9. The page avoids those aggregate percentages and instead uses the report's study dimensions and three selected appendix cases. Reconcile the PDF before any separately authorized PDF release; publishing the website does not authorize uploading that file.

The InfoQ item links to the verified September 4, 2026 AICon Shenzhen conference recap: <https://www.infoq.cn/news/6EYVBX5UD2Cb0PWYsPCq>. It is labeled as a conference mention, not a dedicated feature, award, or endorsement. If the team supplies its separate InfoQ feature, add its actual title and link to the timeline data and update the homepage `#media` card.

The benchmark repository URL follows the report: <https://github.com/TraceLite-AI/Harness-Benchmark>. Confirm access to the materials intended for release before promoting the page.

The website deploys as static files. Releasing a PDF is a separate editorial decision from publishing the website code.
