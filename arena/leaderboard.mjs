// Renders docs/arena/index.html + docs/arena/data.json from arena/results/*.json
// Aggregates repeated runs: each cell shows passes/total across runs.
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const resultsDir = join(root, "arena", "results");
const outDir = join(root, "docs", "arena");
await mkdir(outDir, { recursive: true });

const files = (await readdir(resultsDir)).filter(f => f.endsWith(".json"));
const records = [];
for (const f of files) records.push(JSON.parse(await readFile(join(resultsDir, f), "utf8")));

const tasks = ["todo", "pricing", "form"];
const TASK_NAMES = { todo: "Todo app", pricing: "Pricing calculator", form: "Signup form" };
const MODEL_DISPLAY = { "deepseek-v4-flash": "DeepSeek v4-flash", "deepseek-v4-pro": "DeepSeek v4-pro" };
const STRAT_DISPLAY = { selfcheck: "self-check loop", single: "single shot" };
const BASE_URL = "https://263311487-ux.github.io/dsh-verify";

// Aggregate by (model, strategy, task)
const cells = {}; // "model/strategy/task" -> {pass, total, fails:[]}
const submitters = {}; // "model/strategy" -> github handle
for (const r of records) {
  const key = `${r.model}/${r.strategy}/${r.task}`;
  cells[key] = cells[key] || { pass: 0, total: 0, graded: 0, errors: 0, fails: [] };
  cells[key].total++;
  if (r.final.verdict === "PASS") cells[key].pass++;
  else if (r.final.verdict === "ERROR") cells[key].errors++;
  else cells[key].fails.push(r);
  if (r.final.verdict !== "ERROR") cells[key].graded++;
  if (r.submitter) submitters[`${r.model}/${r.strategy}`] = r.submitter;
}

const setups = [...new Set(Object.keys(cells).map(k => k.split("/").slice(0, 2).join("/")))].sort();
function cellHtml(model, strategy, task) {
  const c = cells[`${model}/${strategy}/${task}`];
  if (!c) return `<td class="na">—</td>`;
  const cls = c.pass === c.graded ? "pass" : c.pass === 0 ? "fail" : "mixed";
  return `<td class="${cls}" title="${c.errors} runner errors excluded from browser verdicts"><b>${c.pass}/${c.graded}</b>${c.errors ? `<small> + ${c.errors} ERROR</small>` : ""}</td>`;
}
const rows = setups.map(key => {
  const [model, strategy] = key.split("/");
  let pass = 0;
  for (const t of tasks) { const c = cells[`${model}/${strategy}/${t}`]; if (c) pass += c.pass; }
  const sub = submitters[key];
  const subCell = sub ? `<td class="dim">@${sub}</td>` : `<td class="dim">—</td>`;
  let graded = 0, errors = 0;
  for (const t of tasks) { const c = cells[`${model}/${strategy}/${t}`]; if (c) { graded += c.graded; errors += c.errors; } }
  return `<tr><td class="setup"><span class="model">${MODEL_DISPLAY[model] || model}</span><span class="strat">${STRAT_DISPLAY[strategy] || strategy}</span></td>${tasks.map(t => cellHtml(model, strategy, t)).join("")}<td class="sum">${pass}/${graded}${errors ? `<small> + ${errors} ERROR</small>` : ""}</td>${subCell}</tr>`;
}).join("");

let totalPass = 0, total = 0, totalGraded = 0, totalErrors = 0;
for (const c of Object.values(cells)) { totalPass += c.pass; total += c.total; totalGraded += c.graded; totalErrors += c.errors; }
const recordsPerCell = Math.round(total / Object.keys(cells).length);
const generatedAt = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

// Per-task plain-language explanation of what failed, for the evidence cards.
const TASK_WHY = {
  todo: "the app opened but required seed todos never appeared in the page — the browser saw an empty list.",
  pricing: "expected prices or columns were missing from the rendered table.",
  form: "expected fields or validation behavior were missing.",
};
function shortFail(r) {
  const line = (r.final.failed && r.final.failed[0] || "").toString().split("\n")[0];
  return line.length > 96 ? line.slice(0, 93) + "…" : line;
}
const evidenceCards = records
  .filter(r => r.final.verdict !== "PASS")
  .map(r => {
    const isError = r.final.verdict === "ERROR";
    const badge = isError ? `<span class="badge err">ERROR</span>` : `<span class="badge fail">FAIL</span>`;
    const title = `${MODEL_DISPLAY[r.model] || r.model} · ${STRAT_DISPLAY[r.strategy] || r.strategy} · ${TASK_NAMES[r.task] || r.task}`;
    const browser = isError
      ? `The runner could not parse the verification result (<code>${shortFail(r)}</code>) — the record contains no usable browser verdict.`
      : `The browser reported <code>${shortFail(r)}</code> — ${TASK_WHY[r.task] || ""}`;
    const score = r.final.passed != null ? ` <b>${r.final.passed}/${r.final.total}</b> checks passed` : "";
    return `<div class="card"><div class="card-top">${badge}<span class="card-title">${title}</span></div><p class="card-body">${browser}<span class="dim">${score}</span></p></div>`;
  }).join("\n");

// Flash vs Pro contrast, computed from the data.
function agg(model, strategy) {
  let p = 0, t = 0;
  for (const [k, c] of Object.entries(cells)) {
    const [m, s] = k.split("/");
    if (m === model && s === strategy) { p += c.pass; t += c.graded; }
  }
  return `${p}/${t}`;
}
const flashSingle = agg("deepseek-v4-flash", "single");
const proSingle = agg("deepseek-v4-pro", "single");
const proSelf = agg("deepseek-v4-pro", "selfcheck");
const flashSelf = agg("deepseek-v4-flash", "selfcheck");
const priceLine = 'Historical sample only: two model labels, two strategies, three static tasks, four records per cell. Self-check permits additional repair rounds; these results do not establish general reliability or cost efficiency.';

// Headline: the flash todo story
const ft = cells["deepseek-v4-flash/single/todo"];
const fts = cells["deepseek-v4-flash/selfcheck/todo"];
const flashTodoLine = ft && fts
  ? `DeepSeek v4-flash single-shot passed the todo task <b>${ft.pass}/${ft.total}</b> runs; with a real-browser self-check loop it passed <b>${fts.pass}/${fts.total}</b>.`
  : `The todo task separates single-shot from self-checked agents.`;

const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agent Arena — can agents ship working web apps?</title>
<meta name="description" content="48 historical records across 4 agent setups and 3 tasks. No LLM judges — a real browser clicks, types and grades. See where agents actually failed.">
<meta property="og:type" content="website">
<meta property="og:title" content="Agent Arena — can AI agents ship working web apps?">
<meta property="og:description" content="${totalPass}/${totalGraded} browser-verdict runs passed; ${totalErrors} runner errors among ${total} records. Open entry after review.">
<meta property="og:url" content="${BASE_URL}/arena/">
<meta property="og:image" content="${BASE_URL}/assets/wow-compare.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Agent Arena — can AI agents ship working web apps?">
<meta name="twitter:description" content="${totalPass}/${totalGraded} browser-verdict runs passed; ${totalErrors} runner errors among ${total} historical records.">
<style>
:root { color-scheme: dark; }
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#0d1117; color:#e6edf3; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; line-height:1.6; }
.wrap { max-width:860px; margin:0 auto; padding:48px 24px 80px; }
h1 { font-size:34px; letter-spacing:-.5px; }
.sub { color:#8b949e; font-size:17px; margin-top:8px; }
.rule { border:0; border-top:1px solid #30363d; margin:32px 0; }
.headline { margin-top:36px; }
.bignum { font-size:44px; font-weight:800; color:#3fb950; }
.headline p { color:#8b949e; margin-top:4px; }
.enter { margin-top:18px; padding:12px 16px; background:#161b22; border:1px solid #30363d; border-radius:8px; color:#c9d1d9; font-size:15px; }
.enter a { color:#58a6ff; text-decoration:none; }
.dim { color:#8b949e; font-size:14px; }
table { width:100%; border-collapse:collapse; margin-top:20px; font-size:15px; }
th, td { padding:12px 14px; text-align:left; border-bottom:1px solid #21262d; }
th { color:#8b949e; font-weight:600; font-size:13px; text-transform:uppercase; letter-spacing:.5px; }
.setup .model { display:block; font-weight:700; }
.setup .strat { color:#8b949e; font-size:13px; }
td.pass { color:#3fb950; } td.fail { color:#f85149; } td.mixed { color:#d29922; } td.na { color:#484f58; }
td.sum { font-weight:700; }
.hl { background:#161b22; border:1px solid #30363d; border-radius:10px; padding:18px 20px; margin-top:28px; font-size:15px; }
.hl b { color:#3fb950; }
h2 { font-size:20px; margin:44px 0 12px; }
.meta, .method li { color:#8b949e; font-size:15px; }
.method { margin-left:20px; }
.method li { margin-bottom:8px; }
code { background:#161b22; border:1px solid #30363d; border-radius:6px; padding:2px 7px; font-size:13px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
pre { background:#161b22; border:1px solid #30363d; border-radius:10px; padding:16px 18px; overflow-x:auto; font-size:13px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; margin:12px 0; }
a { color:#58a6ff; text-decoration:none; } a:hover { text-decoration:underline; }
.cards { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:16px; }
.card { background:#161b22; border:1px solid #30363d; border-radius:10px; padding:16px 18px; font-size:14px; }
.card-top { display:flex; align-items:center; gap:10px; margin-bottom:8px; flex-wrap:wrap; }
.card-title { font-weight:700; font-size:13px; color:#c9d1d9; }
.card-body { color:#8b949e; font-size:13.5px; }
.card-body b { color:#e6edf3; }
.dim { color:#484f58; }
.badge { border-radius:5px; padding:2px 8px; font-size:11px; font-weight:700; letter-spacing:.4px; }
.badge.fail { background:rgba(248,81,73,.15); color:#f85149; border:1px solid rgba(248,81,73,.4); }
.badge.err { background:rgba(210,153,34,.15); color:#d29922; border:1px solid rgba(210,153,34,.4); }
.comparison { background:linear-gradient(180deg,#161b22,#0d1117); border:1px solid #30363d; border-radius:10px; padding:18px 20px; margin-top:16px; font-size:15px; }
.comparison b { color:#58a6ff; }
.footer { margin-top:56px; color:#8b949e; font-size:14px; border-top:1px solid #21262d; padding-top:20px; }
@media (max-width:640px){ .cards { grid-template-columns:1fr; } }
</style></head><body><div class="wrap">
<h1>Agent Arena</h1>
<div class="sub">Can AI agents ship <i>working</i> web apps? Graded by <a href="https://github.com/263311487-ux/dsh-verify">dsh-verify</a> in a real browser. No LLM judges — the browser is the judge.</div>
<hr class="rule">
<div class="headline">
<div class="bignum">${totalPass}/${totalGraded}</div>
<p>browser-verdict runs passed; ${totalErrors} runner errors excluded — ${total} total records (${recordsPerCell} per setup/task cell), historical runs August 17-18, 2026 UTC; page generated ${generatedAt}.</p>
</div>
<div class="enter"><b>Bring your own agent.</b> Run your model on the same 3 tasks with the same human checks, then submit the results for maintainer review before inclusion. <a href="https://github.com/263311487-ux/dsh-verify/blob/main/docs/ARENA.md">How to enter →</a></div>
<table>
<thead><tr><th>Agent setup</th><th>${TASK_NAMES.todo}</th><th>${TASK_NAMES.pricing}</th><th>${TASK_NAMES.form}</th><th>PASS / graded</th><th>Submitted by</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<div class="hl">${flashTodoLine} Agents self-report success; real browsers tell the truth.</div>

<h2>Where agents actually failed</h2>
<p class="meta">${totalPass}/${totalGraded} browser-verdict runs passed. Committed summaries also report 2 FAIL and ${totalErrors} ERROR; errors are runner failures excluded from browser-verdict denominators. Generated apps, model replies, and local report files are not committed; exact historical reproduction is unavailable.</p>
<div class="cards">${evidenceCards}</div>

<h2>What this sample can tell us</h2>
<div class="comparison">${priceLine}</div>

<h2>Methodology</h2>
<ul class="method">
<li>Every setup gets the <b>same task prompt</b>, the same spec of human checks, the same temperature (0.7), with up to two additional repair rounds for self-check; compute budgets differ.</li>
<li>Grading is <b>deterministic</b>: a real headless Chromium clicks, types, reads computed styles and localStorage. No LLM grades the outcome.</li>
<li>Each setup/task cell has <b>${recordsPerCell} records</b>; ERROR records are excluded from PASS denominators.</li>
<li>Tasks and specs live in <code>arena/tasks/</code>; raw per-run results in <code>arena/results/</code>.</li>
</ul>
<h2>Run your own agent</h2>
<pre># add your agent adapter to arena/run.mjs, then:
node arena/run.mjs --agent &lt;your-model&gt;/single --task all --repeat 3
node arena/run.mjs --agent &lt;your-model&gt;/selfcheck --task all --repeat 3
node arena/leaderboard.mjs   # regenerate this page</pre>
<p class="meta">Bring your own model, harness, or framework — the checks are the same for everyone. Add a row, open a PR, join the leaderboard.</p>
<p class="meta">Documentation revision: 2026-10-08, accompanying dsh-verify 0.9.5. Historical verifier, browser and provider versions were not recorded; these are not 0.9.5 benchmark runs. Model labels are unverified identifiers. Small static tasks and unequal repair budgets limit comparisons. <a href="https://github.com/263311487-ux/dsh-verify/blob/main/docs/ARENA.md">Evidence and limitations</a></p>
<div class="footer">Built with <a href="https://github.com/263311487-ux/dsh-verify">dsh-verify</a> · MIT · <a href="https://github.com/263311487-ux/dsh-verify/tree/main/arena">source</a> · <a href="${BASE_URL}/">home</a></div>
</div></body></html>`;

await writeFile(join(outDir, "index.html"), html);
await writeFile(join(outDir, "data.json"), JSON.stringify(records, null, 2));
console.log(`docs/arena/index.html written (${totalPass}/${totalGraded} browser verdicts, ${totalErrors} runner errors, ${Object.keys(cells).length} cells)`);
