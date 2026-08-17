// Build the README hero GIF: real CLI output, animated in a terminal, rendered in real chromium.
// Usage: node scripts/make-hero-gif.mjs   (requires: playwright + chromium, ffmpeg on PATH)
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { writeFileSync, readFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = "/tmp/dshv-hero";
mkdirSync(tmp, { recursive: true });
const outDir = join(root, "assets");

const run = (spec, out) => {
  const r = spawnSync("node", ["bin/verify.mjs", "--spec", spec, "--out", out, "--json"], {
    cwd: root, encoding: "utf8", timeout: 120000,
  });
  const text = (r.stdout + "\n" + r.stderr).split("\n");
  const jl = text.filter(l => l.trim().startsWith("{")).pop();
  return jl ? jl.trim() : text.join("\n");
};

const pick = d => (d.specs && d.specs[0]) ? d.specs[0] : d;
let fixed, buggy;
try {
  fixed = pick(JSON.parse(run("demo/fixed.json", join(tmp, "fixed"))));
  buggy = pick(JSON.parse(run("demo/buggy.json", join(tmp, "buggy"))));
} catch (e) {
  console.error("demo runs failed — install chromium first (npx playwright install chromium)\n" + e.message);
  process.exit(1);
}

let html = readFileSync(join(root, "scripts", "hero-anim.html"), "utf8");
html = html.replace("__FIXED_JSON__", JSON.stringify({ passed: fixed.passed, total: fixed.total }))
           .replace("__BUGGY_JSON__", JSON.stringify({ passed: buggy.passed, total: buggy.total }));
writeFileSync(join(tmp, "hero.html"), html);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 900, height: 600 },
  recordVideo: { dir: tmp, size: { width: 900, height: 600 } },
});
const page = await ctx.newPage();
await page.goto("file://" + join(tmp, "hero.html"));
await page.waitForTimeout(9000);
await ctx.close();
await browser.close();

const webm = readdirSync(tmp).find(f => f.endsWith(".webm"));
const gifPath = join(outDir, "hero.gif");
const ff = spawnSync("ffmpeg", ["-y", "-v", "error", "-i", join(tmp, webm), "-vf",
  "fps=12,scale=880:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse", "-loop", "0", gifPath],
  { encoding: "utf8" });
if (ff.status !== 0) { console.error("ffmpeg failed:", ff.stderr); process.exit(1); }
console.log("hero.gif ->", gifPath, (readFileSync(gifPath).length / 1024).toFixed(0) + "KB");
