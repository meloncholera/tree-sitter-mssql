# Accepted gaps

This is the ledger of genuine mismatches between what SQL Server itself accepts or rejects and
what this grammar's tree does — one row per gap, whether the grammar over- or under-accepts, and
the corpus case (or fixture) that pins the current behavior so a future change is a reviewable
diff instead of a silent regression. It consolidates the over- and under-acceptance notes that
were previously scattered across grammar comments with the subset of
`test/fixtures/README.md`'s "Not parsed on purpose" table that is an actual mismatch rather than a
construct the grammar correctly rejects because SQL Server rejects it too — see that file for the
complete list of constructs deliberately left unmodeled, matched or not.

An entry with no corpus case listed is a known gap in the pinning itself, not a claim that the
behavior is untested in general — see the note on each such row.

## Under-acceptance — constructs SQL Server accepts that this grammar rejects

`test/fixtures/README.md`'s "Not parsed on purpose" table already pins three of these: the
physical join hint with no join type (`HASH JOIN`/`LOOP JOIN`/`MERGE JOIN`/`REMOTE JOIN`), the rare
sub-forms of deprecated or console statements (`WRITETEXT BULK ...`, `BACKUP ... MIRROR TO`,
`KILL STATS JOB`/`KILL QUERY NOTIFICATION`), and the parenthesized union branch with its own
`ORDER BY` alongside `TOP`/`OFFSET`/`FETCH`. See that file rather than duplicating the rows here.
That same table also lists `COMPUTE`, the `*=`/`=*` outer-join operators, and
`EXEC p 1 + 2`/`EXEC p @a = 1, 2` — those three are not gaps at all, since SQL Server itself
rejects them too (the first two are removed constructs; the third violates Msg 119's
argument-ordering rule), so the grammar's rejection already matches SQL Server's.

One further under-acceptance surfaced while consolidating this ledger, not yet in either source:

| Construct | Why | Pinned by |
| --- | --- | --- |
| `ALTER MESSAGE TYPE name VALIDATION = ...` | Valid, documented T-SQL (unlike its six sibling Service Broker object kinds, which each gained an `ALTER` form, message types were assumed immutable and given none) — this is a genuine missing rule, not a deliberate decision | Not modeled at all — no corpus case |

## Over-acceptance — constructs this grammar accepts that SQL Server rejects

| Construct | Why | Pinned by |
| --- | --- | --- |
| A body-less `CREATE TRIGGER ... AS` with no statements after `AS` | The procedure and trigger bodies share one rule; a body-less procedure is legitimate SSMS-scripted syntax, but SQL Server rejects a body-less trigger specifically, and modeling that as a second rule was judged not worth the duplication for one invalid combination | No corpus case exercises a body-less trigger yet — the existing "An empty procedure body and a numbered procedure" case in `test/corpus/procedures.txt` only pins the (correct) procedure form |
| `CREATE CERTIFICATE ... FROM PROVIDER name` | `CREATE CERTIFICATE` and `CREATE ASYMMETRIC KEY` share the same `_key_source` rule, but only `ASYMMETRIC KEY` accepts `PROVIDER` in real SQL Server | No corpus case exercises this combination yet — adding one needs a `tree-sitter generate` + `test --update` cycle; tracked here as a known gap in the pinning rather than fixed in this pass |

## Adding an entry

When a review or a probe finds a new gap, add a row here in the same pass as the corpus case (or
fixture) that pins it, rather than leaving the behavior undocumented until the next audit finds it
again.
