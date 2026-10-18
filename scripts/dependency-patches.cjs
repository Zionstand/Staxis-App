const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const patchRoot = path.join(root, 'vendor/security-patches');
const manifest = require('../vendor/security-patches/manifest.json');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function verify({ apply = false } = {}) {
  const lock = require('../package-lock.json');
  for (const entry of manifest) {
    const locations = Object.keys(lock.packages).filter(p => p === `node_modules/${entry.package}` || p.endsWith(`/node_modules/${entry.package}`));
    if (!locations.length) throw new Error(`Missing patched dependency ${entry.package}`);
    const replacement = fs.readFileSync(path.join(patchRoot, entry.artifact));
    if (hash(replacement) !== entry.patchedSha256) throw new Error(`Changed patch artifact: ${entry.artifact}`);
    for (const location of locations) {
      const base = path.join(root, location);
      const actual = JSON.parse(fs.readFileSync(path.join(base, 'package.json')));
      if (actual.version !== entry.version) throw new Error(`Review security backport for ${entry.package}@${actual.version}`);
      const target = path.join(base, entry.file);
      const digest = hash(fs.readFileSync(target));
      if (digest === entry.patchedSha256) continue;
      if (digest !== entry.originalSha256) throw new Error(`Unexpected dependency bytes: ${target}`);
      if (!apply) throw new Error(`Security backport missing: run npm run patch:dependencies (${entry.package})`);
      fs.writeFileSync(target, replacement);
    }
  }
}
module.exports = { verify };
if (require.main === module) {
  verify({ apply: process.argv.includes('--apply') });
  console.log('Dependency backport integrity verified. Upstream audit findings remain tracked.');
}
