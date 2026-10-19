# Security Policy

## Secure development requirements

Every pull request must pass the automated quality and security gates before merge:

- ESLint
- TypeScript type checking
- deterministic secure-code policy scan
- tests and verified production build
- GitHub CodeQL SAST
- production dependency vulnerability audit at **high** severity or above
- full dependency advisory report for development/build tooling (reported even when an upstream package has no patched release)
- automatic pull-request review

Release tags run the full verification suite again, generate a CycloneDX SBOM, and publish checksums with the release artifact.

## Secure coding rules

Do not commit secrets, credentials, private keys, tokens, generated build output, or local environment files.

Avoid dynamic code execution such as `eval` and `new Function`. Shell execution must receive explicit security review. Raw HTML insertion, wildcard CORS, and direct DOM HTML injection must be justified and sanitized.

API routes should validate content type, bound request sizes where practical, validate untrusted input, and avoid reflecting secrets or internal errors.

The Worker applies baseline browser security headers to application responses.

## Dependency policy

`package-lock.json` is the canonical dependency lock and must remain committed in full. CI uses `npm ci` and validates the integrity-pinned Vinext package before installation.

Dependabot proposes npm and GitHub Actions updates weekly. Dependency changes must pass CI and Security before merge.

## Reporting

Do not open a public issue containing a credential, exploit payload, or private vulnerability detail. Revoke exposed credentials immediately and use the repository owner's private contact channel for sensitive reports.


## Development-tooling advisories

The production dependency audit is a blocking gate. The complete dependency audit is also run and retained for visibility, but development/build-only advisories are evaluated separately when the upstream ecosystem has no patched release.

An advisory is never silently ignored: it remains visible in the Security workflow until a patched dependency path exists. Once a fix becomes available, Dependabot and the weekly security run are expected to surface it for upgrade.
