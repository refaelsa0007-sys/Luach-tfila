# DevOps delivery path

This repository uses a controlled GitHub flow for the synagogue schedule application.

## Branch model

```text
feature/*  ->  develop  ->  main  ->  vMAJOR.MINOR.PATCH  ->  GitHub Release
                   |          |              |
                   CI         CI          verified artifact
                Security   Security       + SHA-256
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
4. reconstructs and installs the locked dependency tree through `npm run install:ci`;
5. runs ESLint;
6. runs TypeScript type checking;
7. runs tests and the verified Vinext build;
8. uploads `dist/` as a short-lived GitHub Actions artifact.

The build already validates that the produced Sites Worker exports `default.fetch` and that the packaged hosting manifest exists.

## Security

`.github/workflows/security.yml` provides:
- CodeQL analysis for JavaScript/TypeScript;
- pull-request dependency review, failing on high-or-higher dependency findings;
- a scheduled weekly CodeQL scan.

Dependabot checks npm packages and GitHub Actions every Monday.

## Promotion

Run the **Promote develop to main** workflow when `develop` is ready. It opens a pull request from `develop` to `main`, or reuses the existing open promotion PR.

Do not merge until required CI and Security checks are green.

## Release

Run the **Cut Release** workflow from `main` and enter a semantic version such as `v1.0.0`.

It creates an annotated tag. The tag automatically triggers the **Release** workflow, which:
1. installs the locked dependencies;
2. runs the complete verification suite;
3. builds the deployable `dist/` output;
4. creates `luach-tfila-VERSION.tar.gz`;
5. creates a SHA-256 checksum;
6. publishes both files as a GitHub Release with generated release notes.

This makes the GitHub Release asset the immutable production handoff artifact.

## Production deployment

The application source is prepared for the Sites/Vinext hosting model. The repository deliberately does not invent a deployment API or store a hosting credential that has not been provided.

The production deployment boundary is therefore:
- source is promoted to `main`;
- an immutable, verified GitHub Release artifact is produced;
- the hosting platform consumes that approved artifact/commit using its supported deployment integration.

When a concrete hosting deployment API or connector is available, add it after the release verification step and protect it with the GitHub `production` environment.

## Recommended repository rules

Protect both `main` and `develop`.

For `main`:
- require a pull request before merging;
- require at least 1 approval;
- dismiss stale approvals after new commits;
- require CODEOWNERS review;
- require conversation resolution;
- require branches to be up to date;
- require the CI verification check;
- require CodeQL / dependency review checks where applicable;
- block force pushes;
- block deletions.

For `develop`:
- require a pull request;
- require CI;
- block force pushes and deletion.

GitHub connector access used to build this repository can write repository contents, but it does not expose branch-protection/ruleset mutation. Those enforcement switches must be enabled once in the GitHub repository settings.

## Local developer commands

```bash
npm run install:ci
npm run lint
npm run typecheck
npm test
```

Or run the aggregate verification command:

```bash
npm run check
```

## Rollback

Releases are immutable tags. To roll back:
1. select the last known-good `vX.Y.Z` release;
2. redeploy its release artifact;
3. fix forward on `develop`;
4. promote to `main`;
5. cut a new patch version.

Do not move an existing release tag to a different commit.
