# Contributing

## Build

```sh
npx --yes --package=tree-sitter-cli@0.27.0 -- tree-sitter generate
cargo build
```

The generated parser (`src/parser.c`, `src/grammar.json`, `src/node-types.json`) is committed.
Regenerate and commit the diff after any `grammar.js` change — a committed parser that has drifted
from the grammar that produced it is a CI failure. `generate` takes under a minute on this grammar;
a failed run leaves the previous `src/parser.c` in place, so check that its modification time moved
before trusting a subsequent test run. `generate` does not compile anything, so it needs no C
compiler even on a machine without MSVC.

## Test

```sh
CC=gcc CXX=g++ npx --yes --package=tree-sitter-cli@0.27.0 -- tree-sitter test
cargo test
```

`test/corpus/` holds per-construct tree assertions; `test/fixtures/*.sql` are larger real-shaped
files checked for zero `ERROR`/`MISSING`/zero-width nodes. `test/corpus/errors.txt` deliberately
pins error recovery on invalid input and is hand-written — `tree-sitter test --update` refuses to
touch it.

Check every fixture for `ERROR`/`MISSING` nodes:

```sh
for f in test/fixtures/*.sql; do printf "%s: " "$f"; CC=gcc CXX=g++ npx --yes --package=tree-sitter-cli@0.27.0 -- tree-sitter parse "$f" 2>/dev/null | grep -c "ERROR\|MISSING"; done
```

Regenerate `test/node-kinds.txt` after any change to a node kind or field name:

```sh
node test/generate-node-kinds.mjs
```

Check that every `create_*`/`alter_*`/`drop_*` rule is registered in its statement's `choice()`:

```sh
node test/check-registries.mjs
```

## Lint and format

```sh
npm run lint
npm run format:check
```

`npm run format` applies fixes. Both run against `grammar.js`, `grammar/**/*.js`, `test/*.mjs` and
`bindings/node/*.js` — `src/**` is generated and excluded.

## Pull requests

- Regenerate and commit `src/parser.c` and `test/node-kinds.txt` alongside any `grammar.js` change;
  CI diffs both against a fresh regenerate and fails on drift.
- Add a corpus case (or extend a fixture) for any new construct.
- `cargo fmt` and `cargo clippy` must pass with no warnings; so must `npm run lint` and
  `npm run format:check`.
- A node-kind addition, removal, or rename is part of the grammar's published API surface
  (see README's "Consuming this grammar" section) — call it out explicitly in the commit message
  or PR description so it is visible in `CHANGELOG.md`.
