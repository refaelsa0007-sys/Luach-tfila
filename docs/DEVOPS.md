# DevOps delivery path

This repository uses a controlled GitHub flow for the synagogue schedule application.

## Branch model

```text
feature/*  ->  develop  ->  main  ->  vMAJOR.MINOR.PATCH  ->  GitHub Release
   |             |          |              |
   |       CI + CR + QA  CI + CR + QA   full release gate
   |          Security      Security      + Product QA
   |                                      + SBOM + SHA-256
   +------ secure-code + code/product QA on every PR ------+
```

- `feature/*`: short-lived development branches.
- `develop`: integration branch. Changes should arrive by pull request.
- `main`: production-ready source only.
- `vMAJOR.MINOR.PATCH`: immutable release tags cut from `main`.

## CI

`.github/workflows/ci.yml` runs on pull requests and pushes to `develop` and `main`.

The pipeline:
1. checks out the exact commit;
2. pins Node.js 22.13;
3. restores the project-scoped npm cache;
4. installs the canonical locked dependency tree through `npm run install:ci`;
5. runs ESLint;
6. runs TypeScript type checking;
7. runs the deterministic secure-code policy scan;
8. runs tests and the verified Vinext build;
9. uploads `dist/` as a short-lived GitHub Actions artifact.

The build validates that the produced Sites Worker exports `default.fetch` and that the packaged hosting manifest exists.

## QA

`.github/workflows/qa.yml` is a separate merge gate with two independent jobs:

- **QA Code**: locked install, `git diff --check`, ESLint, TypeScript, lockfile/package consistency, no focused/skipped tests, no TypeScript bypasses, no debug statements/logging, and no unresolved TODO/FIXME markers.
- **QA Product**: Playwright end-to-end tests in desktop Chromium and a mobile Chromium profile. It starts the real Vinext/Vite application and checks Hebrew RTL rendering, default poster readiness, free-text conversion, editable prayer times, the create-poster API, invalid-input handling, GPT/privacy routes, canvas readiness, and mobile horizontal overflow.

On failure, Playwright retains screenshots, video and traces; GitHub Actions uploads the QA evidence for diagnosis.

## Automatic code review

`.github/workflows/code-review.yml` reviews the PR diff and blocks obvious high-risk changes such as committed secrets, private keys, dynamic code execution and generated output. It also highlights API, dependency and workflow changes for review.

The result is always written to the GitHub Actions summary. For non-Dependabot PRs it is also published as a PR comment. Dependabot PRs remain read-only and are not given elevated write permissions.

`AGENTS.md` contains the project-specific review rules for Codex/AI review, including security, Hebrew RTL behavior, prayer ordering and PNG export.

## Security

`.github/workflows/security.yml` runs:
- GitHub CodeQL SAST for JavaScript/TypeScript;
- the repository secure-code policy scan;
- a blocking `npm audit --omit=dev --audit-level=high` production-dependency gate;
- a complete npm audit report for development/build-tooling advisories;
- CycloneDX SBOM generation and artifact upload;
- a weekly scheduled security run.

This replaces the previous GitHub Dependency Review job, which was unsupported because Dependency Graph is not enabled for this repository.

Dependabot checks npm packages and GitHub Actions every Monday.

## Secure coding baseline

`scripts/secure-code-check.mjs` scans application, worker, database, build and scripting code for:
- common credential/key patterns;
- `eval` / `new Function`;
- direct shell execution;
- unsafe raw HTML APIs;
- wildcard CORS;
- plain HTTP URLs.

Blocking findings fail CI. Advisory findings are reported for manual review.

The poster API validates JSON content type and rejects oversized declared request bodies. The Worker adds baseline HTTP response headers including `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` and HSTS on HTTPS.

## Promotion

Run **Promote develop to main** when `develop` is ready. It opens a pull request from `develop` to `main`, or reuses the existing open promotion PR.

Do not merge until Automatic Code Review, CI, QA Code, QA Product and Security are green.

## Release

Run **Cut Release** from `main` and enter a semantic version such as `v1.0.0`.

The tag automatically triggers **Release**, which:
1. installs the canonical lockfile;
2. reruns lint, typecheck, secure-code checks, code QA, tests and verified build;
3. installs Chromium and reruns the full Product QA suite;
4. reruns the dependency vulnerability gate;
5. generates a CycloneDX SBOM;
6. packages the deployable artifact;
7. creates SHA-256 checksums;
8. publishes the artifact, SBOM and checksums as an immutable GitHub Release.

## Production deployment

The repository deliberately does not invent a deployment credential or API that has not been configured.

The production boundary is:
- source is promoted to `main`;
- an immutable, verified GitHub Release is produced;
- the hosting platform consumes that approved release/commit through its supported deployment integration.

When a concrete hosting deployment API is available, add it after the release verification step and protect it with the GitHub `production` environment.

## Recommended repository rules

Protect both `main` and `develop`.

For `main` require:
- pull request before merging;
- at least 1 approval;
- CODEOWNERS review;
- conversation resolution;
- branch up to date;
- Automatic Code Review;
- CI verification;
- CodeQL SAST;
- Secure Code + Dependency Audit;
- QA Code;
- QA Product;
- no force pushes or deletion.

For `develop` require:
- pull request;
- Automatic Code Review;
- CI;
- Security;
- QA Code;
- QA Product;
- no force pushes or deletion.

The current GitHub connector can write repository contents but does not expose branch-protection/ruleset mutation, so those enforcement switches must be enabled once in repository settings.

## Local developer commands

```bash
npm run install:ci
npm run lint
npm run typecheck
npm run security:code
npm run security:deps
npm run qa:code
npm run qa:product
npm test
```

Aggregate quality verification:

```bash
npm run check
```

Full security verification:

```bash
npm run security
```

## Rollback

Releases are immutable tags. To roll back:
1. select the last known-good `vX.Y.Z` release;
2. redeploy its release artifact;
3. fix forward on `develop`;
4. promote to `main`;
5. cut a new patch version.

Do not move an existing release tag to another commit.


Run the complete QA suite locally after installing Playwright Chromium once with `npx playwright install chromium`:

```bash
npm run qa
```
