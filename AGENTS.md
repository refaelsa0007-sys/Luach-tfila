# AGENTS.md

## Project

This repository contains the Hebrew synagogue prayer-times poster application (Luach Tfila). Preserve RTL behavior, Hebrew text, poster ordering, image export, and mobile usability.

## Code review priorities

When reviewing a pull request, prioritize correctness and security over style.

Check especially for:

1. Secrets, tokens, private keys, credentials, or sensitive values committed to source.
2. Authentication/authorization mistakes, unsafe redirects, trust in spoofable headers, or missing validation on API routes.
3. XSS/HTML injection, unsafe URL construction, dynamic code execution, command injection, path traversal, SSRF, insecure CORS, and unsafe file handling.
4. Unbounded or malformed user input, oversized request bodies, and errors that leak internal details.
5. Dependency or GitHub Actions changes that weaken supply-chain security.
6. Changes that break Hebrew RTL layout, poster text ordering, prayer-time rows, or PNG export.
7. Missing tests for behavior changes.
8. QA regressions in desktop/mobile behavior, RTL layout, editing flows, API-created share links, canvas readiness, or PNG workflow.

## DevOps expectations

A change is not production-ready unless CI, QA Code, QA Product, Secure Code, CodeQL, dependency audit, tests, and the verified build pass.

Do not bypass a failing security gate. Fix the underlying issue or document a narrowly scoped, reviewed exception.
