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

// Aggregate by (model, strategy, task)
const cells = {}; // "model/strategy/task" -> {pass, total, rounds:[]}
for (const r of records) {
  const key = `${r.model}/${r.strategy}/${r.task}`;
  cells[key] = cells[key] || { pass: 0, total: 0, rounds: [] };
  cells[key].total++;
  if (r.final.verdict === "PASS") cells[key].pass++;
  cells[key].rounds.push(r);
}

const setups = [...new Set(Object.keys(cells).map(k => k.split("/").slice(0, 2).join("/")))].sort();
function cellHtml(model, strategy, task) {
  const c = cells[`${model}/${strategy}/${task}`];
  if (!c) return `<td class="na">—</td>`;
  const cls = c.pass === c.total ? "pass" : c.pass === 0 ? "fail" : "mixed";
  return `<td class="${cls}"><b>${c.pass}/${c.total}</b></td>`;
}
const rows = setups.map(key => {
  const [model, strategy] = key.split("/");
  let pass = 0, total = 0;
  for (const t of tasks) { const c = cells[`${model}/${strategy}/${t}`]; if (c) { pass += c.pass; total += c.total; } }
  const name = model.replace("deepseek-", "DeepSeek ");
  const strat = strategy === "selfcheck" ? "self-check loop" : "single shot";
  return `<tr><td class="setup"><span class="model">${name}</span><span class="strat">${strat}</span></td>${tasks.map(t => cellHtml(model, strategy, t)).join("")}<td class="sum">${pass}/${total}</td></tr>`;
}).join("");

let totalPass = 0, total = 0;
for (const c of Object.values(cells)) { totalPass += c.pass; total += c.total; }

// Headline: the flash todo story, now with pass rates
const ft = cells["deepseek-v4-flash/single/todo"];
const fts = cells["deepseek-v4-flash/selfcheck/todo"];
const flashTodoLine = ft && fts
  ? `DeepSeek v4-flash single-shot passed the todo task <b>${ft.pass}/${ft.total}</b> runs; with a real-browser self-check loop it passed <b>${fts.pass}/${fts.total}</b>.`
  : `The todo task separates single-shot from self-checked agents.`;

const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agent Arena — can agents ship working web apps?</title>
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
.footer { margin-top:56px; color:#8b949e; font-size:14px; border-top:1px solid #21262d; padding-top:20px; }
</style></head><body><div class="wrap">
<h1>Agent Arena</h1>
<div class="sub">Can AI agents ship <i>working</i> web apps? Graded by <a href="https://github.com/263311487-ux/dsh-verify">dsh-verify</a> in a real browser. No LLM judges — the browser is the judge.</div>
<hr class="rule">
<div class="headline">
<div class="bignum">${totalPass}/${total}</div>
<p>runs passed the real-browser acceptance checks (each cell run ${Math.round(total / Object.keys(cells).length)}×, batch date ${new Date().toISOString().slice(0,10)}).</p>
</div>
<table>
<thead><tr><th>Agent setup</th><th>${TASK_NAMES.todo}</th><th>${TASK_NAMES.pricing}</th><th>${TASK_NAMES.form}</th><th>Pass</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<div class="hl">${flashTodoLine} Agents self-test and pass; real browsers tell the truth.</div>
<h2>Methodology</h2>
<ul class="method">
<li>Every setup gets the <b>same task prompt</b>, the same spec of human checks, the same temperature (0.7), and the same budget (≤ 2 self-check fix rounds).</li>
<li>Grading is <b>deterministic</b>: a real headless Chromium clicks, types, reads computed styles and localStorage. No LLM grades the outcome.</li>
<li>Each cell is run <b>${Math.round(total / Object.keys(cells).length)}×</b> because LLM output is nondeterministic — a single run can flip.</li>
<li>Tasks and specs live in <code>arena/tasks/</code>; raw per-run results in <code>arena/results/</code>.</li>
</ul>
<h2>Run your own agent</h2>
<pre># add your agent adapter to arena/run.mjs, then:
node arena/run.mjs --agent &lt;your-model&gt;/single --task all --repeat 3
node arena/run.mjs --agent &lt;your-model&gt;/selfcheck --task all --repeat 3
node arena/leaderboard.mjs   # regenerate this page</pre>
<p class="meta">Bring your own model, harness, or framework — the checks are the same for everyone.</p>
<div class="footer">Built with <a href="https://github.com/263311487-ux/dsh-verify">dsh-verify</a> · MIT · <a href="https://github.com/263311487-ux/dsh-verify/tree/main/arena">source</a></div>
</div></body></html>`;

await writeFile(join(outDir, "index.html"), html);
await writeFile(join(outDir, "data.json"), JSON.stringify(records, null, 2));
console.log(`docs/arena/index.html written (${totalPass}/${total} across ${Object.keys(cells).length} cells)`);
