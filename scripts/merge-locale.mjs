// Usage: bun scripts/merge-locale.mjs en < patch.json
// Deep-merges new translation keys into src/locales/<lang>.json. Safe to run twice.
import { readFileSync, writeFileSync } from 'node:fs';

const lang = process.argv[2];
if (lang !== 'en' && lang !== 'fr') {
  console.error('Usage: merge-locale.mjs en|fr < patch.json');
  process.exit(1);
}
const file = `src/locales/${lang}.json`;
const patch = JSON.parse(readFileSync(0, 'utf8'));
const base = JSON.parse(readFileSync(file, 'utf8'));

const merge = (a, b) => {
  for (const [k, v] of Object.entries(b)) {
    a[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(a[k] ?? {}, v) : v;
  }
  return a;
};
writeFileSync(file, JSON.stringify(merge(base, patch), null, 2) + '\n');
console.log(`  merged keys into ${file}`);
