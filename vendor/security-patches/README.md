# Maintained dependency backports

See ../../security_dependency_remediation.md for rationale, upstream sources, tests, limits and update procedure. manifest.json is the installation contract; only its artifact entries are installed. decoder.js is the original upstream decoder reference, not an active replacement. Original package versions and npm audit records are intentionally retained.

Run npm ci, npm run check:dependencies and npm run test:dependencies. If installing with --ignore-scripts, run npm run patch:dependencies before application tooling. Keep this directory's LF line endings unchanged because SHA-256 is byte-sensitive.
