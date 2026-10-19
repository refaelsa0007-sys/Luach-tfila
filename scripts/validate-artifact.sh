#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec bash "${script_dir}/sites-env.sh" -- bash "$0" "$@"
fi

worker="${SITES_PROJECT_ROOT}/dist/server/index.js"
hosting="${SITES_PROJECT_ROOT}/dist/.openai/hosting.json"

[[ -s "${worker}" ]] || {
  echo "Missing or empty Sites Worker entry: dist/server/index.js" >&2
  exit 66
}
[[ -s "${hosting}" ]] || {
  echo "Missing or empty packaged Sites manifest: dist/.openai/hosting.json" >&2
  exit 66
}

# Parse the Worker without executing it. Modern Vinext/Cloudflare bundles may
# contain cloudflare:* module specifiers that are valid in Workers but cannot be
# imported by Node's default ESM loader.
node --check "${worker}"

node --input-type=module - "${worker}" "${hosting}" <<'NODE'
import { readFile } from "node:fs/promises";

const [workerPath, hostingPath] = process.argv.slice(2);
JSON.parse(await readFile(hostingPath, "utf8"));

const source = await readFile(workerPath, "utf8");
const hasDefaultExport =
  /export\s+default\b/.test(source) ||
  /export\s*\{[^}]*\bas\s+default\b[^}]*\}/s.test(source);

if (!hasDefaultExport) {
  throw new Error("dist/server/index.js must expose a default Worker export");
}
if (!/\bfetch\b/.test(source)) {
  throw new Error("dist/server/index.js does not contain a Worker fetch handler");
}
NODE

echo "Validated Sites artifact: Worker syntax/default export and hosting manifest are present."
