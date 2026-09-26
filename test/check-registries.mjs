// Checks that every create_*/alter_*/drop_* rule defined anywhere under
// grammar/statements/ actually appears in test/node-kinds.txt (the reachable
// node-kind snapshot). A rule that is defined but never registered in its
// statement's choice() is unreachable from the grammar's start symbol, so it
// never produces a node kind and never parses — completely silent otherwise,
// with no generate-time warning. Checking against node-kinds.txt rather than
// parsing the registry's own source text avoids depending on exact
// formatting (indentation, arrow-function parameter style) that reformatting
// tools are free to change.

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const statementsDir = `${repoRoot}grammar/statements/`;

const files = readdirSync(statementsDir).filter((f) => f.endsWith('.js'));

const nodeKinds = new Set(
  readFileSync(`${repoRoot}test/node-kinds.txt`, 'utf8')
    .trim()
    .split('\n')
    .map((line) => line.replace(/\{.*\}$/, '')),
);

const missing = [];

for (const file of files) {
  const source = readFileSync(`${statementsDir}${file}`, 'utf8');
  // A top-level rule definition: `  name: $ => ...` or `  name: ($) => ...`
  // at two-space indent, name not starting with `_` (registries and other
  // hidden helper rules, which don't produce their own node kind).
  for (const match of source.matchAll(/^ {2}(create|alter|drop)_(\w+): \(?\$\)? =>/gm)) {
    const [, prefix, rest] = match;
    const ruleName = `${prefix}_${rest}`;
    if (!nodeKinds.has(ruleName)) {
      missing.push(`${ruleName} (defined in ${file}, not in test/node-kinds.txt)`);
    }
  }
}

if (missing.length > 0) {
  console.error('Rules defined but not reachable from any statement registry:');
  for (const m of missing) console.error(`  ${m}`);
  process.exit(1);
}

console.log('Every create_*/alter_*/drop_* rule is reachable and registered.');
