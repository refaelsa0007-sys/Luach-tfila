import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOTS = ["app", "worker", "db", "build", "scripts"];
const EXTRA_FILES = ["next.config.ts", "vite.config.ts", "drizzle.config.ts"];
const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".sh"]);

const blockers = [];
const warnings = [];

function finding(list, file, line, rule, message) {
  list.push({ file, line, rule, message });
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (["node_modules", "dist", ".next", ".git", ".sites-runtime"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (ALLOWED_EXTENSIONS.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

const files = [];
for (const root of ROOTS) {
  try {
    files.push(...await walk(root));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
for (const file of EXTRA_FILES) {
  try {
    await readFile(file, "utf8");
    files.push(file);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const secretRules = [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "Private key material detected."],
  ["aws-access-key", /\bAKIA[0-9A-Z]{16}\b/, "AWS access key pattern detected."],
  ["github-token", /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/, "GitHub token pattern detected."],
  ["openai-key", /\bsk-[A-Za-z0-9_-]{20,}\b/, "OpenAI-style API key pattern detected."],
];

for (const file of [...new Set(files)].sort()) {
  const source = await readFile(file, "utf8");
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    for (const [rule, regex, message] of secretRules) {
      if (regex.test(line)) finding(blockers, file, lineNumber, rule, message);
    }

    if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(line)) {
      finding(blockers, file, lineNumber, "dynamic-code", "Dynamic code execution via eval/new Function is prohibited.");
    }

    if (/\b(?:exec|execSync)\s*\(/.test(line) && /child_process|child-process/.test(source)) {
      finding(blockers, file, lineNumber, "shell-exec", "Shell execution requires explicit security review.");
    }

    if (/dangerouslySetInnerHTML/.test(line)) {
      finding(warnings, file, lineNumber, "raw-html", "dangerouslySetInnerHTML requires trusted/sanitized content.");
    }

    if (/\.innerHTML\s*=|document\.write\s*\(/.test(line)) {
      finding(warnings, file, lineNumber, "dom-html", "Direct HTML injection API detected.");
    }

    if (/Access-Control-Allow-Origin["']?\s*[:,]\s*["']\*["']/.test(line)) {
      finding(warnings, file, lineNumber, "cors-wildcard", "Wildcard CORS should be explicitly justified.");
    }

    if (/http:\/\//.test(line) && !/localhost|127\.0\.0\.1|example\.com/.test(line)) {
      finding(warnings, file, lineNumber, "insecure-http", "Plain HTTP URL detected; prefer HTTPS.");
    }
  });
}

const report = (title, items) => {
  if (!items.length) return;
  console.log(`\n${title}`);
  for (const item of items) {
    console.log(`- ${item.file}:${item.line} [${item.rule}] ${item.message}`);
  }
};

report("BLOCKERS", blockers);
report("WARNINGS", warnings);

console.log(`\nSecure code scan: ${blockers.length} blocker(s), ${warnings.length} warning(s).`);
if (blockers.length > 0) process.exit(1);
