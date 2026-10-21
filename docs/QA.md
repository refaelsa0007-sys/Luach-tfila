# QA strategy

The project has two explicit QA gates in addition to CI and Security.

## QA Code

`npm run qa:code` verifies engineering quality:

- ESLint;
- TypeScript type checking;
- repository hygiene scan;
- no committed `debugger`, focused/skipped tests, TypeScript bypasses, debug logs, or unresolved TODO/FIXME markers;
- package.json/package-lock.json synchronization;
- required build, test, security and QA scripts are present;
- Git whitespace/integrity validation in GitHub Actions.

QA Code is deliberately separate from the security scanner: security checks unsafe behavior and credentials, while Code QA checks maintainability and accidental development leftovers.

## QA Product

`npm run qa:product` runs browser/API regression tests with Playwright against the real development server.

It exercises both desktop Chromium and a mobile Chromium profile and verifies:

- the Hebrew RTL editor loads;
- the default prayer schedule is present;
- the poster reaches the ready-to-download state;
- free-text input is converted to ordered poster content;
- invalid background files are rejected;
- PNG download works and returns the expected filename;
- the poster API accepts a valid request and rejects malformed/wrong-content-type requests;
- the OpenAPI contract exposes `createPrayerPoster` and the product limits;
- mobile pages do not create horizontal overflow.

Screenshots, traces and videos are retained as QA evidence when relevant. The GitHub workflow uploads the Playwright report/test results for inspection.

## Pipeline

```text
feature/* -> PR
              |-- Automatic Code Review
              |-- CI
              |-- Security
              |-- QA Code
              '-- QA Product (desktop + mobile + API)
                         |
                      develop
                         |
                 promotion PR to main
                         |
                  all gates run again
                         |
                      release
                         |
             Code QA + Product QA again
```

The QA workflow also runs nightly to catch regressions caused by runtime/browser/tooling changes even when no pull request is open.

## Required merge checks

For `main` and `develop`, configure repository rules to require:

- Automatic Code Review
- Lint, typecheck, secure code, test and build
- CodeQL SAST
- Secure Code + Dependency Audit
- QA Code
- QA Product

Do not bypass a failed QA gate. Fix the failure or document and review a narrowly scoped exception.
