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

- `trial-by-trace.html` is a standalone bilingual academic project page, with manuscript figures, five paired trace cases, image enlargement, and BibTeX copying. It uses `assets/report.{css,js}` and shared language handling in `assets/site.js`. The older `assets/trial-by-trace.{css,js}` are retained legacy assets and are not loaded by this page.
- Edit `scripts/report_main.html` for content and `scripts/report_shell.html` for the page shell. Run `python3 scripts/build_report.py`, then `python3 scripts/build_report.py --check`. The generator no longer derives the page shell from `papers.html`.
- `assets/report/*.webp` are web exports of the supplied LaTeX manuscript figures. Main figures were rendered at 1,800 pixels on the longest edge, case-study figures at 2,000 pixels, then encoded as WebP at quality 92. Keep the manuscript source separate from the deployed page. The layout references the Academic Project Page Template, credited in the footer.
- The page uses the 23-author list supplied by the team, in its original order. The first four authors are marked as core contributors; Ruqian Shi, Baihua Xiao, and Sicheng Zhou are marked as corresponding authors. BibTeX and author metadata use the same list. TraceLite AI remains the team link; no conference acceptance or paper publication date is claimed. It retains the existing public repository link; the manuscript’s anonymous review URL is not substituted into the public page.
- The supplied `papers/Trial_by_Trace.pdf` stays local and is excluded by `.gitignore`. It is not part of the repository or deployment, and public pages offer no PDF download. Citations link to the HTML project page. The report's internal document date is September 17, 2026; the website does not invent a public release date.
- `assets/site.{css,js}` provide shared timeline navigation, persistent language selection, and mobile navigation. The storage key is `tracelite-lang`, with values `en` and `zh-CN`.
- Retained papers and blog articles keep their original content. The new report material is bilingual; existing paper titles and abstracts are not newly translated.
- `CNAME` is preserved for the existing domain. The site uses relative internal paths and can be served as static files.

## Editorial handoff

The earlier supplied PDF had inconsistent aggregate figures. The September 29 website revision instead follows the newly supplied LaTeX manuscript: its abstract, experiments, contingency table, and background figure agree on 1,065 / 3,420 (31.1%) successful Agent runs with at least one failed Harness criterion. Figures and five case studies come from that manuscript. The older PDF is still not a public download.

The InfoQ item links to the verified September 4, 2026 AICon Shenzhen conference recap: <https://www.infoq.cn/news/6EYVBX5UD2Cb0PWYsPCq>. It is labeled as a conference mention, not a dedicated feature, award, or endorsement. If the team supplies its separate InfoQ feature, add its actual title and link to the timeline data and update the homepage `#media` card.

The benchmark repository URL follows the report: <https://github.com/TraceLite-AI/Harness-Benchmark>. Confirm access to the materials intended for release before promoting the page.

The website deploys as static files. Releasing a PDF is a separate editorial decision from publishing the website code.

## Report content expansion

The report page borrows the content organization of https://www.harness-bench.ai/ (task anatomy, execution protocol, metric explanations, and inspection resources). Its new descriptions are grounded in the supplied Trial by Trace manuscript, especially `content/tracetrialbench.tex`, `content/appendix_A.tex`, and `content/experiments.tex`. Harness Bench is a different benchmark: its 106 tasks, eight workflow categories, trajectory counts, and Completion/Process definitions are not TraceTrial-Bench results and are not imported. This update uses existing HTML classes without changing CSS or JavaScript. The GitHub link is the URL confirmed by the team: https://github.com/TraceLite-AI/Harness-Benchmark. Public access returned HTTP 404 during the content review; repository availability and file-level links have not been assumed.

## Leaderboard maintenance

`leaderboard.html` shares the academic project page’s typography, colors, navigation, and footer through `assets/report.css`. Its comparison chart, searchable ranking table, and controls use `assets/leaderboard.{css,js}`. Content organization references the Agents’ Last Exam leaderboard at https://agents-last-exam.org/leaderboard; the metrics, populations, and results remain those of TraceTrial-Bench.

`data/leaderboard.json` is the single source for all 41 stored records (four harness aggregates, 36 model–harness pairs, and one overall aggregate). Edit the JSON, then run:

```sh
python3 scripts/build_leaderboard.py
python3 scripts/build_leaderboard.py --check
```

The generator embeds the data and a readable four-harness chart/table fallback in the page. Without JavaScript, the aggregates and JSON download remain available. The interactive chart shows at most eight filtered entries, ranked by its explicitly selected metric on a fixed 0–100 scale. The table shows every filtered entry and supports independent column sorting; numeric ties share ranks. CSV export contains the filtered table in its current order, with metric keys and units matching the source JSON (`*_k` = thousands of tokens; cost = mean USD per run). Rounded input/output figures and total tokens are preserved as reported rather than recomputed. No runtime, effort, task-split, or best-per-task scores are inferred from unavailable data.
