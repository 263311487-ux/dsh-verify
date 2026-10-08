// Local-only starter: no browser, server, or LLM is invoked here.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const HELP = `usage: dsh-verify init [directory]

Creates a zero-key starter in a NEW directory (default: dsh-verify-starter).
Existing paths, including empty directories and symlinks, are refused.
The parent directory must exist. No network calls or browser launches.
`;

export async function main(args) {
  if (args.length === 1 && args[0] === "--help") {
    process.stdout.write(HELP);
    return;
  }
  if (args.length > 1 || (args.length === 1 && (!args[0].trim() || args[0].startsWith("-")))) {
    process.stderr.write(HELP);
    process.exitCode = 2;
    return;
  }
  const target = resolve(args[0] || "dsh-verify-starter");
  const names = ["site/index.html", "dsh-verify.spec.json", "dsh-verify.fail.json", "README.md"];
  // Read the complete packaged template before creating anything.
  const contents = await Promise.all(names.map(name => readFile(new URL(`../templates/starter/${name}`, import.meta.url))));
  try {
    // Exclusive directory creation avoids check-then-write races and existing symlinks.
    await mkdir(target);
  } catch (e) {
    if (e.code === "EEXIST") {
      console.error(`init: refusing to overwrite existing path: ${target}`);
      process.exitCode = 1;
      return;
    }
    throw e;
  }
  await mkdir(join(target, "site"));
  for (let i = 0; i < names.length; i++) {
    await writeFile(join(target, names[i]), contents[i], { flag: "wx" });
  }
  console.log(`Created zero-key starter: ${target}`);
  console.log("Next, change into that directory and run:");
  console.log("  npx playwright install chromium  # one-time browser download");
  console.log("  npx dsh-verify --spec dsh-verify.spec.json");
  console.log("Expected: PASS (5/5). Open dsh-verify-out/report.html.");
  console.log("Intentional FAIL: npx dsh-verify --spec dsh-verify.fail.json --out failed-report");
}
