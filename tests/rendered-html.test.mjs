import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function javascriptFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await javascriptFiles(full));
    else if (entry.isFile() && /\.[cm]?js$/.test(entry.name)) files.push(full);
  }
  return files;
}

test("build contains development preview metadata", async () => {
  const files = await javascriptFiles("dist/server");
  assert.ok(files.length > 0, "expected built server JavaScript files");

  let found = false;
  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (source.includes("codex-preview") && source.includes("development")) {
      found = true;
      break;
    }
  }

  assert.equal(
    found,
    true,
    "expected the built server bundle to contain codex-preview=development metadata",
  );
});
