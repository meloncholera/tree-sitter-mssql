// Checks that every create_*/alter_*/drop_* rule defined anywhere under
// grammar/statements/ is actually referenced by its corresponding registry
// (_create_statement in create.js, _alter_statement in alter.js,
// _drop_statement in drop.js). A rule that is defined but never registered
// is completely silent otherwise: it simply never parses, with no
// generate-time warning — this is the cheaper alternative to colocating
// every verb's registry with its own definitions (DX-7).

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const statementsDir = `${repoRoot}grammar/statements/`;

const files = readdirSync(statementsDir).filter((f) => f.endsWith('.js'));

const registries = {
  create: { file: 'create.js', name: '_create_statement' },
  alter: { file: 'alter.js', name: '_alter_statement' },
  drop: { file: 'drop.js', name: '_drop_statement' },
};

function extractRegistry(prefix) {
  const { file, name } = registries[prefix];
  const source = readFileSync(`${statementsDir}${file}`, 'utf8');
  const start = source.indexOf(`${name}:`);
  if (start === -1) throw new Error(`${name} not found in ${file}`);
  const end = source.indexOf('\n  ),', start);
  const body = source.slice(start, end);
  return new Set([...body.matchAll(/\$\.(\w+)/g)].map((m) => m[1]));
}

const registered = {
  create: extractRegistry('create'),
  alter: extractRegistry('alter'),
  drop: extractRegistry('drop'),
};

const missing = [];

for (const file of files) {
  const source = readFileSync(`${statementsDir}${file}`, 'utf8');
  // A top-level rule definition: `  name: $ => ...` at two-space indent,
  // name not starting with `_` (registries and other hidden helper rules).
  for (const match of source.matchAll(/^ {2}(create|alter|drop)_(\w+): \$ =>/gm)) {
    const [, prefix, rest] = match;
    const ruleName = `${prefix}_${rest}`;
    if (!registered[prefix].has(ruleName)) {
      missing.push(`${ruleName} (defined in ${file}, not in ${registries[prefix].name})`);
    }
  }
}

if (missing.length > 0) {
  console.error('Rules defined but not registered in their statement choice:');
  for (const m of missing) console.error(`  ${m}`);
  process.exit(1);
}

console.log('Every create_*/alter_*/drop_* rule is registered.');
