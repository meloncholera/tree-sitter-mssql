# Accepted gaps

This consolidates the deliberate, known places where the grammar's tree does not exactly match
what SQL Server itself accepts or rejects — one row per gap, whether the grammar over- or
under-accepts, and the corpus case (or fixture) that pins the current behavior so a future change
is a reviewable diff instead of a silent regression. It replaces three separate prose sources:
`test/fixtures/README.md`'s "Not parsed on purpose" section, the accepted-gap notes previously
scattered across grammar comments, and this file's own predecessor discussions.

An entry with no corpus case listed is a known gap in the pinning itself, not a claim that the
behavior is untested in general — see the note on each such row.

## Under-acceptance — constructs SQL Server accepts that this grammar rejects

| Construct | Why | Pinned by |
| --- | --- | --- |
| `COMPUTE`, the `*=`/`=*` outer-join operators | Removed from SQL Server; out of scope (see README's "Scope" section) | Not modeled at all — no corpus case |
| `FROM a HASH JOIN b`, `LOOP JOIN`, `MERGE JOIN`, `REMOTE JOIN` — a physical join hint with no join type | With no join type the hint word sits where an AS-less alias goes (`FROM dbo.t hash` would stop parsing) or collides with the `MERGE` statement itself, a fork that tripled `generate` time. Typed forms (`INNER HASH JOIN`, ...) parse. | `test/fixtures/README.md`'s "Not parsed on purpose" table |
| `WRITETEXT BULK ...`, `BACKUP ... MIRROR TO`, `KILL STATS JOB`/`KILL QUERY NOTIFICATION` | Rare sub-forms of deprecated or console statements, not modeled | `test/fixtures/README.md`'s "Not parsed on purpose" table |
| `EXEC p 1 + 2`, `EXEC p @a = 1, 2` | Rejected here because SQL Server rejects them (Msg 119): a procedure argument is a constant, a variable, or `DEFAULT`, and a positional argument cannot follow a named one | `test/corpus/errors.txt` |
| A parenthesized union branch with its own `ORDER BY` alongside `TOP`/`OFFSET`/`FETCH` | Not modeled either way; predates the `query_specification` split | `test/fixtures/README.md`'s "Not parsed on purpose" table |
| `ALTER MESSAGE TYPE` | Service Broker message types have no `ALTER` in real SQL Server — only `CREATE`/`DROP` | `test/fixtures/README.md`'s "Not parsed on purpose" table |

## Over-acceptance — constructs this grammar accepts that SQL Server rejects

| Construct | Why | Pinned by |
| --- | --- | --- |
| A body-less `CREATE PROCEDURE`/`CREATE TRIGGER ... AS` with no statements after `AS` | The procedure and trigger bodies share one rule; SQL Server rejects a body-less trigger specifically, but modeling that as a second rule was judged not worth the duplication for one invalid combination | `test/corpus/procedures.txt` — "An empty procedure body and a numbered procedure" |
| `CREATE CERTIFICATE ... FROM PROVIDER name` | `CREATE CERTIFICATE` and `CREATE ASYMMETRIC KEY` share the same `_key_source` rule, but only `ASYMMETRIC KEY` accepts `PROVIDER` in real SQL Server | No corpus case exercises this combination yet — adding one needs a `tree-sitter generate` + `test --update` cycle; tracked here as a known gap in the pinning rather than fixed in this pass |
| `:setvar MyVar` with no value | Satisfies `sqlcmd_setvar`'s required `value` field with a zero-width `object_reference` rather than an `ERROR` node — an under-acceptance would look identical to a plain `ERROR` count, which is why this one is worth naming explicitly | `test/corpus/sqlcmd.txt` — "setvar with no value removes the scripting variable (ARCH-14)" |

## Adding an entry

When a review or a probe finds a new gap, add a row here in the same pass as the corpus case (or
fixture) that pins it, rather than leaving the behavior undocumented until the next audit finds it
again.
