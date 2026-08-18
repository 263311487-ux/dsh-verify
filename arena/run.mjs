// Agent Arena runner.
// Usage:
//   node arena/run.mjs --agent deepseek-v4-flash/single   --task todo
//   node arena/run.mjs --agent deepseek-v4-flash/selfcheck --task all
//   node arena/run.mjs --all
//
// An "agent setup" = model + strategy (single | selfcheck).
// Strategy selfcheck lets the agent see real-browser failures and fix, up to maxRounds.
import { mkdir, readFile, writeFile, rm, cp } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { chat, extractHtml } from "./lib/llm.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tasksDir = join(root, "arena", "tasks");
const resultsDir = join(root, "arena", "results");
const workDir = join(root, "arena", "work");
const TASKS = ["todo", "pricing", "form"];
const MODELS = ["deepseek-v4-flash", "deepseek-v4-pro"];
const MAX_ROUNDS = 2; // selfcheck: up to 2 fix rounds after the first attempt

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}
const agentArg = arg("--agent");
const taskArg = arg("--task", "all");
const repeat = Math.max(1, Number(arg("--repeat", "1")) || 1);
const [modelArg, strategyArg] = agentArg ? agentArg.split("/") : [null, null];
if (!MODELS.includes(modelArg)) {
  console.error(`usage: --agent ${MODELS.map(m => m + "/single|" + m + "/selfcheck").join(" | ")}`);
  process.exit(1);
}
const tasks = taskArg === "all" ? TASKS : taskArg.split(",");
const strategy = strategyArg === "selfcheck" ? "selfcheck" : "single";

const SYSTEM = `You are a frontend engineer. You write clean, working, self-contained HTML files.
Follow the task requirements EXACTLY: required element ids, exact behavior, exact texts.
Do not use external libraries or network requests. Output ONLY the complete HTML document, in one \`\`\`html code fence.`;

async function attempt(task, work, iteration, feedback) {
  const taskMd = await readFile(join(tasksDir, task, "task.md"), "utf8");
  const messages = [
    { role: "system", content: SYSTEM },
    { role: "user", content: taskMd },
  ];
  if (iteration > 0) {
    messages.push({ role: "user", content: `You produced an app that failed real-browser checks. Fix index.html:\n\n${feedback}` });
  }
  let reply = "";
  let html = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    reply = await chat({ model: modelArg, messages, temperature: 0.7 });
    if (!reply || !reply.trim()) { console.log(`  (empty reply, retry ${attempt + 1})`); await new Promise(r => setTimeout(r, 5000)); continue; }
    try {
      html = extractHtml(reply);
      break;
    } catch (e) {
      console.log(`  (extract failed, retry ${attempt + 1}: ${e.message})`);
    }
  }
  if (!html) throw new Error("no usable HTML after retries");
  await mkdir(join(work, "iteration-" + iteration), { recursive: true });
  await writeFile(join(work, "iteration-" + iteration, "reply.txt"), reply);
  await writeFile(join(work, "iteration-" + iteration, "index.html"), html);
  return { reply, html };
}

async function grade(task, serveDir) {
  const spec = JSON.parse(await readFile(join(tasksDir, task, "spec.json"), "utf8"));
  spec.serve = serveDir;
  const specPath = join(workDir, task + "-spec.json");
  await writeFile(specPath, JSON.stringify(spec));
  const out = join(workDir, task + "-out");
  const r = spawnSync("node", ["bin/verify.mjs", "--spec", specPath, "--out", out, "--json"], {
    cwd: root, encoding: "utf8", timeout: 180000,
  });
  const lines = (r.stdout + "\n" + r.stderr).split("\n").filter(l => l.trim().startsWith("{"));
  const data = JSON.parse(lines[lines.length - 1]);
  const s = data.specs?.[0] ?? data;
  return {
    verdict: s.verdict,
    passed: s.passed,
    total: s.total,
    failed: (s.failed || []).map(f => `${f.action} ${f.selector || ""}: ${f.detail || ""}`.trim()),
    report: join(out, "report.html"),
  };
}

const startedAt = new Date().toISOString();
const results = [];
for (const task of tasks) {
  for (let rep = 1; rep <= repeat; rep++) {
  const runId = `${modelArg}__${strategy}__${task}__r${rep}`;
  const work = join(workDir, runId);
  await rm(work, { recursive: true, force: true });
  await mkdir(work, { recursive: true });

  let lastGrade = null;
  let history = [];
  try {
  for (let i = 0; i <= MAX_ROUNDS; i++) {
    let feedback = "";
    if (i > 0 && lastGrade && lastGrade.verdict === "FAIL") {
      feedback = lastGrade.failed.join("\n");
    }
    const { html } = await attempt(task, work, i, feedback);
    const serveDir = join(work, "iteration-" + i);
    lastGrade = await grade(task, serveDir);
    history.push({ round: i, verdict: lastGrade.verdict, passed: lastGrade.passed, total: lastGrade.total });
    console.log(`[${runId}] round ${i}: ${lastGrade.verdict} (${lastGrade.passed}/${lastGrade.total})`);
    if (strategy === "single" || lastGrade.verdict === "PASS") break;
  }

  } catch (e) {
    console.error(`[${runId}] failed: ${e.message}`);
    lastGrade = { verdict: "ERROR", passed: 0, total: 0, failed: [e.message], report: null };
  }
  const record = {
    id: runId,
    model: modelArg,
    strategy,
    task,
    startedAt,
    finishedAt: new Date().toISOString(),
    rounds: history.length,
    history,
    final: lastGrade,
  };
  results.push(record);
  await mkdir(resultsDir, { recursive: true });
  await writeFile(join(resultsDir, runId + ".json"), JSON.stringify(record, null, 2));
  }
}
console.log("done:", results.map(r => `${r.id}=${r.final.verdict}(${r.final.passed}/${r.final.total})`).join(" "));
