# tree-sitter-mssql

A [tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for Microsoft SQL Server
Transact-SQL (T-SQL).

**Scope: T-SQL only.** This is not a general or multi-dialect SQL grammar. PostgreSQL, MySQL,
SQLite, Hive, Spark, and Snowflake syntax are out of scope; the rule set inherited from the
upstream's other dialects has been removed rather than maintained.

**SQL Server versions.** One grammar accepts the union of every version's syntax, from what SQL
Server 2008 accepted through the current release and Azure SQL. A tree-sitter parser has no
runtime switch, and a consumer meets a file on disk without knowing the server it targets, so the
grammar never refuses a construct on version grounds. Deprecated syntax that still executes
(`SETUSER`, `READTEXT`, the bare `(NOLOCK)` hint) is in scope, since a linter has to see it to flag
it. A version-specific construct gets its own node kind so a downstream rule can flag it
against a target version, and the corpus test that introduces one names the minimum version.

**Status:** Procedure, function, and trigger bodies (DML, DDL and logon triggers), control flow
(`IF`/`ELSE`, `WHILE`, `TRY`/`CATCH`, `RETURN`, `GOTO`), transactions, variables and table
variables, cursors, `MERGE`, `OUTPUT`, `CROSS`/`OUTER APPLY`, `PIVOT`/`UNPIVOT`, `FOR XML`/`JSON`,
`OFFSET`/`FETCH`, `RAISERROR`/`THROW`, table and query hints, `TOP`, the full
`CREATE`/`ALTER`/`DROP` surface for tables, constraints, indexes, views, types, sequences,
synonyms, schemas, users, logins and roles, `GRANT`/`REVOKE`/`DENY`, the SSMS script header and
`GO`, SMO-scripted objects with no statement separators, and bracketed parameterized types all
parse. Not yet consumed by any downstream project.

This project started as a fork of [`tree-sitter-sql`](https://github.com/DerekStride/tree-sitter-sql)
by Derek Stride (MIT licensed; see `LICENSE` and `NOTICE`). The general-SQL core — expression
precedence, `SELECT`, CTEs, joins, window functions — comes from that project largely unchanged.
The T-SQL-specific surface is added on top, and the upstream's other-dialect surface is gone.

## Using it

```sh
cargo add tree-sitter tree-sitter-mssql
```

```rust
let mut parser = tree_sitter::Parser::new();
let language = tree_sitter_mssql::LANGUAGE;
parser.set_language(&language.into()).expect("Error loading T-SQL parser");
let tree = parser.parse("SELECT TOP (10) name FROM sys.objects WHERE type = 'U';", None).unwrap();
assert!(!tree.root_node().has_error());
```

```sh
npm install tree-sitter-mssql
```

```js
import Parser from "tree-sitter";
import SQL from "tree-sitter-mssql";

const parser = new Parser();
parser.setLanguage(SQL);
```

A GitHub Packages copy of the npm package is also published as
`@meloncholic/tree-sitter-mssql`. Both bindings expose every query file —
`HIGHLIGHTS_QUERY`, `INDENTS_QUERY`, `INJECTIONS_QUERY`, `LOCALS_QUERY`,
`TAGS_QUERY` — so a consumer can load `queries/highlights.scm` without
resolving the package's install path by hand: the Rust crate as real `pub
const` named exports (`tree_sitter_mssql::HIGHLIGHTS_QUERY`), the Node
binding as properties of its default export (`SQL.HIGHLIGHTS_QUERY`, not a
named import).

The npm package ships prebuilt native addons for Linux, macOS and Windows, so
`npm install tree-sitter-mssql` needs no C toolchain on those platforms — it
falls back to compiling from the committed generated parser only when no
matching prebuild is present. A `tree-sitter-mssql.wasm` build is attached to
every [GitHub Release](https://github.com/meloncholic/tree-sitter-mssql/releases)
for `web-tree-sitter` consumers (browsers, sandboxed runtimes):

```js
import { Parser, Language } from "web-tree-sitter";
await Parser.init();
const language = await Language.load("tree-sitter-mssql.wasm");
const parser = new Parser();
parser.setLanguage(language);
```

## Consuming this grammar

The exported C symbol is `tree_sitter_mssql` (not `tree_sitter_sql`), so linking this grammar
alongside a general-SQL tree-sitter grammar in the same binary does not collide. The parser is
`LANGUAGE_VERSION` (ABI) 15; the crate depends on `tree-sitter-language = "0.1"` at runtime and
only dev-depends on `tree-sitter ~0.27`, so a consumer on `tree-sitter = "0.26"` or newer is
compatible.

**Node-kind stability.** `test/node-kinds.txt` is the public API surface: it is generated from
`src/node-types.json`, drift-gated in CI on every PR (`.github/workflows/verify.yml`), and
attached to every GitHub Release so two versions can be diffed mechanically. Before 1.0, treat
node-kind additions as compatible and removals or renames as breaking; call out either in the
PR/commit that makes the change so it is visible in `CHANGELOG.md`.

**Version-specific and deprecated constructs.** `versions.json` maps the node kinds that are
specific to a SQL Server release (e.g. `named_window`, requiring SQL Server 2022) or that model
deprecated-but-still-executing syntax (e.g. `readtext_statement`), so a downstream linter can flag
either without maintaining its own list. See the file's own `_meta` section for the node kinds it
does not yet cover.

## Building

```sh
npx --yes --package=tree-sitter-cli@0.27.0 -- tree-sitter generate
cargo build
```

The generated parser (`src/parser.c`, `src/grammar.json`, `src/node-types.json`) is committed, so
consumers can build the C parser through `cc` during `cargo build` without needing the tree-sitter
CLI themselves. Regenerate and commit the diff after any `grammar.js` change.

The block comment is lexed by `src/scanner.c` rather than a regex, because T-SQL block comments
nest and a regex cannot match balanced nesting. `src/scanner.c` must be compiled alongside
`src/parser.c` — vendoring one without the other produces a link error or a parser that cannot lex
a block comment.

`generate` takes under a minute on this grammar. Run it with a time cap and read the exit code, and
check that `src/parser.c`'s modification time moved before trusting a test run — a failed `generate`
leaves the previous parser in place.

## Testing

```sh
npx --yes --package=tree-sitter-cli@0.27.0 -- tree-sitter test
```

On a machine without MSVC, point the CLI at another C compiler:

```sh
CC=gcc CXX=g++ npx --yes --package=tree-sitter-cli@0.27.0 -- tree-sitter test
```

`test/corpus/` holds the per-construct tree assertions. Every file under `test/fixtures/*.sql`
should also parse with zero `ERROR`/`MISSING`/zero-width nodes:

```sh
for f in test/fixtures/*.sql; do printf "%s: " "$f"; CC=gcc CXX=g++ npx --yes --package=tree-sitter-cli@0.27.0 -- tree-sitter parse "$f" 2>/dev/null | grep -c "ERROR\|MISSING"; done
```

`test/node-kinds.txt` is regenerated with:

```sh
node test/generate-node-kinds.mjs
```

Every `verify` CI run's job summary reports the fixture set's parse throughput (bytes/ms) and the
current `src/parser.c` size, so a change's effect on either is visible without a separate
benchmark step. A scheduled workflow (`.github/workflows/fuzz.yml`) also fuzzes the parser and
`src/scanner.c` against arbitrary input weekly.

## License

MIT — see `LICENSE` and `NOTICE`.
