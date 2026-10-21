import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_ROOTS = ["app", "worker", "db", "build", "scripts", "tests"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".sh"]);
const blockers = [];

function add(file, line, rule, message) {
  blockers.push({ file, line, rule, message });
}

async function walk(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (["node_modules", "dist", ".next", ".git", ".sites-runtime", "playwright-report", "test-results"].includes(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

const files = [];
for (const root of SOURCE_ROOTS) {
  try {
    files.push(...await walk(root));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

for (const file of [...new Set(files)].sort()) {
  const source = await readFile(file, "utf8");
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineNo = index + 1;
    if (/\bdebugger\s*;?/.test(line)) add(file, lineNo, "debugger", "debugger statement is not allowed.");
    if (/\b(?:test|it|describe)\.only\s*\(/.test(line)) add(file, lineNo, "focused-test", "Focused tests must not be committed.");
    if (/\b(?:test|it|describe)\.skip\s*\(/.test(line)) add(file, lineNo, "skipped-test", "Skipped tests require explicit review; remove or replace with a documented condition.");
    if (/\/\/\s*@ts-(?:ignore|nocheck)/.test(line)) add(file, lineNo, "typescript-bypass", "TypeScript suppression is not allowed in production code.");
    if (/\bconsole\.(?:log|debug)\s*\(/.test(line)) add(file, lineNo, "debug-log", "Debug logging must not ship.");
    if (/\b(?:TODO|FIXME)\b/.test(line)) add(file, lineNo, "unfinished-work", "TODO/FIXME must be resolved or tracked outside source before merge.");
  });
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const lockfile = JSON.parse(await readFile("package-lock.json", "utf8"));
const lockedRoot = lockfile.packages?.[""];
if (!lockedRoot) add("package-lock.json", 1, "lock-root", "package-lock.json is missing the root package entry.");

for (const section of ["dependencies", "devDependencies"]) {
  const declared = packageJson[section] ?? {};
  const locked = lockedRoot?.[section] ?? {};
  for (const [name, version] of Object.entries(declared)) {
    if (locked[name] !== version) {
      add("package-lock.json", 1, "lock-drift", `${section} ${name} differs between package.json (${version}) and package-lock.json (${locked[name] ?? "missing"}).`);
    }
  }
}

for (const script of ["lint", "typecheck", "security:code", "qa:static", "qa:code", "qa:product", "test", "build"]) {
  if (!packageJson.scripts?.[script]) add("package.json", 1, "missing-script", `Required script "${script}" is missing.`);
}

if (blockers.length) {
  console.error(`Code QA failed with ${blockers.length} blocking finding(s):`);
  for (const finding of blockers) {
    console.error(`- ${finding.file}:${finding.line} [${finding.rule}] ${finding.message}`);
  }
  process.exit(1);
}

console.log(`Code QA passed: scanned ${files.length} source/test files, lockfile is synchronized, and no blocking hygiene findings were found.`);
