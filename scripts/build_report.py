"""Build trial-by-trace.html from the shared site shell (papers.html) and scripts/report_main.html."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
shell = (ROOT / "papers.html").read_text(encoding="utf-8")
body = (ROOT / "scripts" / "report_main.html").read_text(encoding="utf-8")
body = re.sub(r"^<!--.*?-->\n", "", body, count=1)

shell = shell.replace("<title>Papers — TraceLite</title>", "<title>Trial by Trace — Agent Harness Reliability | TraceLite AI</title>")
shell = re.sub(r'<meta name="description" content="[^"]*" />',
               '<meta name="description" content="TraceTrial-Bench evaluates AI agent harness reliability through execution traces: 95 tasks, four harnesses, nine models, and 3,420 scored runs." />',
               shell, count=1)
shell = shell.replace('<a class="lk active" href="research.html"', '<a class="lk" href="research.html"')
start = shell.index('<header class="page-hero')
end = shell.index("<!-- FOOTER -->")
shell = shell[:start] + body + "\n" + shell[end:]
# drop the papers pager script
for m in reversed(list(re.finditer(r"<script>\n.*?</script>\n", shell, re.S))):
    if "plList" in m.group(0):
        shell = shell[:m.start()] + shell[m.end():]
m = re.search(r'<link rel="stylesheet" href="assets/theme\.css\?v=([^"]+)" />', shell)
shell = shell.replace(m.group(0), m.group(0) + '\n<link rel="stylesheet" href="assets/report.css?v={}" />'.format(m.group(1)))
(ROOT / "trial-by-trace.html").write_text(shell, encoding="utf-8")
print("trial-by-trace.html built")
