import {
  aliased_with_columns,
  comma_list,
  optional_parenthesis,
  paren_list,
  paren_pair,
  wrapped_in_parenthesis,
} from '../helpers.js';

// ORDER BY/OFFSET FETCH/OPTION/FOR — the clauses that trail an *outermost*
// query only: a lone `_select_statement`, or a whole `set_operation`. They
// never trail an individual `query_specification` branch of a union — that
// is the ARCH-4 defect this file's `set_operation`/`query_specification`
// split exists to close, so don't attach a future trailing clause to
// `query_specification` on the strength of this comment. A plain function
// rather than a shared named rule, matching event_session_body() in
// create.js: every segment here is optional, and a named rule that can
// match the empty string is rejected by tree-sitter unless it is the
// grammar's start rule.
function trailing_sort_and_hint_clauses($) {
  return seq(
    optional($.order_by),
    optional($.offset_fetch),
    optional($.option_clause),
    optional($.for_clause),
  );
}

// The SELECT/INTO/FROM/WHERE/GROUP BY/HAVING/WINDOW body shared by a lone
// query and each branch of a set_operation — everything except the
// trailing sort/hint clauses, which scope to the outermost position only
// (see `query_specification` and `_select_statement` below).
function query_specification_body($) {
  return seq(
    $.select,
    optional(seq($.keyword_into, $.object_reference)),
    optional(seq($.from, optional($.where), optional($.group_by), optional($.having))),
    optional($.window_clause),
  );
}

export default {
  // WITH [XMLNAMESPACES (...) ,] cte [, ...] — the namespace declaration
  // goes first, where a CTE list starts, and may be followed by CTEs.
  _cte: ($) =>
    seq(
      $.keyword_with,
      choice(seq($.xmlnamespaces, repeat(seq(',', $.cte))), comma_list($.cte, true)),
    ),

  // XMLNAMESPACES ('uri' AS prefix [, ...] [, DEFAULT 'uri']) — declares
  // the prefixes the query's XQuery methods use.
  xmlnamespaces: ($) => seq($.keyword_xmlnamespaces, paren_list($.xmlnamespace, true)),

  xmlnamespace: ($) =>
    choice(
      seq(field('uri', $.literal), $.keyword_as, field('prefix', $.identifier)),
      seq($.keyword_default, field('uri', $.literal)),
    ),

  cte: ($) =>
    seq(
      $.identifier,
      optional(paren_list(field('argument', $.identifier))),
      $.keyword_as,
      wrapped_in_parenthesis(alias($._dml_read, $.statement)),
    ),

  // A union's own ORDER BY/OFFSET FETCH/OPTION sort and hint the combined
  // result, not the last branch — attaching them only here (never on an
  // individual `query_specification` branch) is what makes
  // `SELECT a FROM t UNION SELECT b FROM u ORDER BY 1` describe a query with
  // one sort over the whole union instead of a sort scoped to branch two.
  // SQL Server rejects an unparenthesized non-final branch carrying its own
  // trailing clause outright (`SELECT a FROM t ORDER BY 1 UNION SELECT b
  // FROM u` errors, pinned in errors.txt), so `query_specification` — not
  // the trailing-clause-bearing `_select_statement` — is what every branch
  // composes from. A *parenthesized* branch's own trailing clause
  // (`(SELECT TOP 1 a FROM t ORDER BY a) UNION ALL (SELECT TOP 1 b FROM u
  // ORDER BY b)`, valid when TOP or OFFSET/FETCH is present) is not modeled
  // either way — it already failed to parse before this rule existed, and
  // this change does not resolve or worsen that gap; see
  // test/fixtures/README.md's "Not parsed on purpose" section.
  // `query_specification`'s shared body also does not yet distinguish a
  // first branch from a later one, so `SELECT ... INTO` is still (wrongly)
  // reachable on every branch, not just the first — a pre-existing
  // over-acceptance this split does not introduce or close.
  set_operation: ($) =>
    prec.right(
      seq(
        $.query_specification,
        repeat1(
          seq(
            field(
              'operation',
              choice(
                seq($.keyword_union, optional($.keyword_all)),
                $.keyword_except,
                $.keyword_intersect,
              ),
            ),
            $.query_specification,
          ),
        ),
        trailing_sort_and_hint_clauses($),
      ),
    ),

  // One branch of a set_operation — a real named node so a consumer can
  // tell where one branch ends and the next begins, instead of every
  // branch's children splicing directly into `set_operation` as a flat
  // sibling list with no boundary (the same root cause AGENTS.md already
  // records for `alias()` on an inline helper call: a tree-visible
  // boundary has to be a real named rule). WHERE/GROUP BY/HAVING are
  // nested under FROM (real T-SQL rejects all three on a FROM-less
  // SELECT), not independently optional the way the sort/hint clauses are
  // — a bare `SELECT 1 WHERE 1=1` must still error.
  //
  // A lone (non-union) query does NOT reach this rule — `_select_statement`
  // below composes `query_specification_body($)` directly rather than
  // through `$.query_specification`, so `SELECT a FROM t;` alone produces
  // no `query_specification` node at all. A consumer matching on this node
  // kind — now in test/node-kinds.txt — sees union branches only.
  query_specification: ($) => optional_parenthesis(query_specification_body($)),

  // SELECT ... [INTO new_table] [FROM ... [WHERE ...] [GROUP BY ...]
  // [HAVING ...]] [WINDOW ...] [ORDER BY ...] [OFFSET ... FETCH ...]
  // [OPTION (...)] [FOR XML ... | FOR JSON ... | FOR UPDATE]
  //
  // = `query_specification` + trailing sort/hint clauses. The clauses sit
  // here rather than on `query_specification` itself for the same reason
  // they're duplicated on `set_operation` above: they scope to the
  // outermost position of a lone query, never to a `query_specification`
  // that is (or might become) one branch of a union.
  _select_statement: ($) =>
    optional_parenthesis(seq(query_specification_body($), trailing_sort_and_hint_clauses($))),

  select: ($) =>
    seq(
      $.keyword_select,
      // `SELECT ALL` is not accepted: ALL is also a unary operator
      // (`= ALL (subquery)`), and `SELECT ALL x` is ambiguous between the two.
      optional($.keyword_distinct),
      optional($.top_clause),
      $.select_expression,
    ),

  // T-SQL TOP: `TOP (expression)` or the legacy bare `TOP n`, optionally
  // `PERCENT` and `WITH TIES`. The bare form takes only a natural number,
  // which is all SQL Server accepts there.
  top_clause: ($) =>
    seq(
      $.keyword_top,
      choice(wrapped_in_parenthesis($._expression), alias($._natural_number, $.literal)),
      optional($.keyword_percent),
      optional(seq($.keyword_with, $.keyword_ties)),
    ),

  select_expression: ($) => comma_list($.term, true),

  term: ($) => seq(field('value', choice($.all_fields, $._expression)), optional($._column_alias)),

  all_fields: ($) => seq(optional(seq($.object_reference, '.')), '*'),

  // FOR XML { RAW | AUTO | EXPLICIT | PATH [('name')] } [, option ...]
  // FOR JSON { AUTO | PATH } [, option ...]
  // FOR UPDATE [OF column [, ...]] and FOR READ ONLY (cursor declarations)
  // The XML/JSON options (ELEMENTS, ROOT('r'), TYPE, BINARY BASE64, ...)
  // are identifiers.
  for_clause: ($) =>
    prec.right(
      seq(
        $.keyword_for,
        choice(
          seq($.keyword_xml, comma_list($.for_option, true)),
          seq($.keyword_json, comma_list($.for_option, true)),
          seq($.keyword_update, optional(seq($.keyword_of, comma_list($.identifier, true)))),
          seq($.keyword_read, $.keyword_only),
        ),
      ),
    ),

  for_option: ($) =>
    prec.right(
      seq(
        $.identifier,
        optional(wrapped_in_parenthesis(optional($.literal))),
        repeat($.identifier),
      ),
    ),

  partition_by: ($) => seq($.keyword_partition, $.keyword_by, comma_list($._expression, true)),

  frame_definition: ($) =>
    seq(
      choice(
        seq($.keyword_unbounded, $.keyword_preceding),
        seq(field('start', alias($._integer, $.literal)), $.keyword_preceding),
        $._current_row,
        seq(field('end', alias($._integer, $.literal)), $.keyword_following),
        seq($.keyword_unbounded, $.keyword_following),
      ),
    ),

  window_frame: ($) =>
    seq(
      choice($.keyword_range, $.keyword_rows),
      choice(
        seq($.keyword_between, $.frame_definition, $.keyword_and, $.frame_definition),
        $.frame_definition,
      ),
    ),

  // The optional leading identifier is `existing_window_name` — a
  // previously-declared named window (see window_clause below) this
  // specification refines, e.g. `WINDOW w AS (w2 ORDER BY a)` or
  // `SUM(x) OVER (w2 ORDER BY a)`.
  window_specification: ($) =>
    wrapped_in_parenthesis(
      seq(
        optional(field('base_window', $.identifier)),
        optional($.partition_by),
        optional($.order_by),
        optional($.window_frame),
      ),
    ),

  // OVER may reference a named window declared in the query's own WINDOW
  // clause (SQL Server 2022) instead of repeating a window_specification.
  window_function: ($) =>
    seq(
      $.invocation,
      $.keyword_over,
      choice($.window_specification, field('window', $.identifier)),
    ),

  // WINDOW w AS (spec) [, ...] — SQL Server 2022. Declares one or more
  // named windows an OVER clause elsewhere in the same query can reference
  // by name instead of repeating its specification.
  //
  // WINDOW becoming a keyword takes the AS-less alias slot right after a
  // relation reduces, the same collision class as `bulk`/`tablesample`
  // (see AGENTS.md): `FROM t window` errors; `FROM t AS window` still
  // works, and `SELECT window FROM t` (the column slot) is unaffected.
  window_clause: ($) => seq($.keyword_window, comma_list($.named_window, true)),

  named_window: ($) => seq(field('name', $.identifier), $.keyword_as, $.window_specification),

  // A table alias — `relation`, `apply_join`, `pivot_clause`,
  // `unpivot_clause` and `merge` all reach this. SQL Server rejects a
  // string literal here (only a `term`'s column alias accepts one — see
  // `_column_alias` below).
  _alias: ($) => seq(optional($.keyword_as), field('alias', $.identifier)),

  // A select-list column alias — the one alias position where a
  // single-quoted string literal is also accepted, e.g. SUM(x) 'TotalX' or
  // SUM(x) AS 'TotalX', alongside a plain identifier.
  _column_alias: ($) =>
    seq(
      optional($.keyword_as),
      field('alias', choice($.identifier, alias($._single_quote_string, $.literal))),
    ),

  from: ($) =>
    seq(
      $.keyword_from,
      comma_list($._relation_with_hint, true),
      repeat(choice($.join, $.cross_join, $.apply_join, $.pivot_clause, $.unpivot_clause)),
    ),

  // OFFSET n { ROW | ROWS } [FETCH { FIRST | NEXT } n { ROW | ROWS } ONLY]
  // prec.right: a following FETCH belongs to this clause, not to a cursor
  // FETCH statement starting the next one.
  offset_fetch: ($) =>
    prec.right(
      seq(
        $.keyword_offset,
        $._expression,
        choice($.keyword_row, $.keyword_rows),
        optional(
          seq(
            $.keyword_fetch,
            choice($.keyword_first, $.keyword_next),
            $._expression,
            choice($.keyword_row, $.keyword_rows),
            $.keyword_only,
          ),
        ),
      ),
    ),

  // T-SQL query hint clause, e.g. OPTION (HASH GROUP, FAST 10, MAXDOP 1) or
  // OPTION (OPTIMIZE FOR (@x = 'literal', @y UNKNOWN)). Hints other than
  // OPTIMIZE FOR and RECOMPILE are identifiers — T-SQL has dozens, most of
  // them multi-word, and nothing downstream needs them distinguished.
  option_clause: ($) =>
    seq($.keyword_option, wrapped_in_parenthesis(comma_list($.query_hint, true))),

  query_hint: ($) =>
    prec.right(
      choice(
        seq(
          $.keyword_optimize,
          $.keyword_for,
          choice($.keyword_unknown, wrapped_in_parenthesis(comma_list($.optimize_for_item, true))),
        ),
        $.keyword_recompile,
        seq(
          $.identifier,
          repeat(choice($.identifier, alias($._natural_number, $.literal))),
          optional(paren_list($.literal, true)),
        ),
      ),
    ),

  optimize_for_item: ($) =>
    seq(field('name', $.identifier), choice(seq('=', $.literal), $.keyword_unknown)),

  // `relation`/`_relation_with_hint` are reused across every read-side row
  // source (`from`, `join`, `cross_join`) — INSERT/UPDATE/DELETE/MERGE's
  // write target is a narrower `write_target()` (helpers.js) that
  // deliberately does not reach `relation`, since SQL Server only accepts
  // `changetable`, `for_system_time_clause` and `tablesample_clause` as a
  // read-side row source, never as a write target. This grammar does still
  // accept a wider surface than SQL Server itself in several other places
  // (`option`, `query_hint`, the bare-identifier tail of
  // `_column_constraint`) on the reasoning that a linter consuming this
  // tree can reject what SQL Server would, and a narrower grammar can only
  // ever reject a valid query, never accept an invalid one silently in the
  // other direction — but the write target is not one of those places.
  relation: ($) =>
    prec.right(
      seq(
        choice(
          $.subquery,
          $.invocation,
          $.object_reference,
          wrapped_in_parenthesis($.values),
          // A MERGE with an OUTPUT clause is a legal row source: INSERT
          // ... SELECT ... FROM (MERGE ... OUTPUT ...) AS changes.
          wrapped_in_parenthesis($.merge),
          $.opendatasource_reference,
          $.changetable,
        ),
        // FOR SYSTEM_TIME sits between the table reference and its alias
        // (`FROM t FOR SYSTEM_TIME AS OF x AS t1`), per the documented
        // syntax — not after the alias, where table hints and TABLESAMPLE
        // go.
        optional($.for_system_time_clause),
        aliased_with_columns($),
        // The deprecated bare hint sits inside `relation` rather than beside
        // it in `_relation_with_hint`: after the table name the parser has
        // to shift `(` for both an invocation and the hint from the same
        // state, and reducing `relation` first would lose to the
        // invocation's shift on precedence.
        optional(alias($._bare_table_hint, $.table_hint)),
      ),
    ),

  // FOR SYSTEM_TIME <qualifier> — queries a system-versioned temporal
  // table as of a point or range in its history. Uses the single atomic
  // `keyword_for_system_time` token rather than `keyword_for` +
  // `keyword_system_time` — see that token's comment in keywords.js.
  for_system_time_clause: ($) => seq($.keyword_for_system_time, $.system_time_qualifier),

  system_time_qualifier: ($) =>
    choice(
      seq($.keyword_as, $.keyword_of, $._expression),
      seq($.keyword_from, $._expression, $.keyword_to, $._expression),
      seq($.keyword_between, $._expression, $.keyword_and, $._expression),
      seq($.keyword_contained, $.keyword_in, paren_pair($._expression, $._expression)),
      $.keyword_all,
    ),

  // OPENDATASOURCE('provider', 'init string').database.schema.name — the
  // one rowset function whose result is followed by a dotted object
  // suffix rather than used as-is. Modeled as its own rule rather than
  // generalizing `invocation` to accept a trailing dotted suffix, which
  // reaches `object_reference` from a new position and is the state-space
  // blowup the `apply_join` comment above documents from experience.
  opendatasource_reference: ($) =>
    seq(
      $.keyword_opendatasource,
      paren_pair($._expression, $._expression),
      '.',
      field('database', $.identifier),
      '.',
      field('schema', $.identifier),
      '.',
      field('name', $.identifier),
    ),

  // CHANGETABLE(CHANGES table, last_sync_version) AS ct
  // CHANGETABLE(VERSION table, (pk_columns), (pk_values)) AS ct
  // The first argument is the bare keyword CHANGES or VERSION followed by
  // a table reference, which is not an expression, so this can't be an
  // ordinary invocation the way OPENROWSET/OPENQUERY/OPENJSON are.
  changetable: ($) =>
    seq(
      $.keyword_changetable,
      wrapped_in_parenthesis(
        seq(
          choice($.keyword_changes, $.keyword_version),
          $.object_reference,
          ',',
          // `$.list` (a parenthesized expression list, for VERSION's pk-column
          // and pk-value lists) is already one of `_expression`'s own
          // alternatives, so no separate branch is needed here.
          comma_list($._expression, true),
        ),
      ),
    ),

  // A relation with an optional trailing table hint, e.g. `dbo.t AS x WITH
  // (NOLOCK)`, OPENJSON's schema followed by its own alias:
  // `OPENJSON(@j) WITH (a INT '$.a') AS j`, or TABLESAMPLE. The schema and
  // TABLESAMPLE sit here, after `relation` has reduced, rather than inside
  // `relation` next to the invocation: `relation` is prec.right, so an
  // alternative inside it wins the `WITH (` outright and a table hint
  // after an un-aliased function call (`FROM dbo.f(1) WITH (NOLOCK)`) is
  // read as a column list with an empty type. From this state the two are
  // an ordinary LR(1) choice — a hint item is an identifier followed by
  // `,` or `)`, a schema column is an identifier followed by a type.
  _relation_with_hint: ($) =>
    seq(
      $.relation,
      // TABLESAMPLE precedes a table hint and is independent of it — `FROM
      // t TABLESAMPLE (10 PERCENT) WITH (NOLOCK)` is valid — so it is its
      // own optional slot ahead of the table_hint/openjson_schema choice,
      // not one more alternative inside that choice's mutual exclusion.
      optional($.tablesample_clause),
      optional(choice($.table_hint, seq($.openjson_schema, aliased_with_columns($)))),
    ),

  // OPENJSON(...) WITH (name type ['path'] [AS JSON] [, ...]) — the
  // explicit schema of OPENJSON's result.
  openjson_schema: ($) => seq($.keyword_with, paren_list($.openjson_column, true)),

  openjson_column: ($) =>
    seq(
      field('name', $.identifier),
      field('type', $._type),
      optional(field('path', $.literal)),
      optional(seq($.keyword_as, $.keyword_json)),
    ),

  // TABLESAMPLE [SYSTEM] (n [PERCENT | ROWS]) [REPEATABLE (seed)]
  //
  // TABLESAMPLE collides with an AS-less table alias the same way the
  // join hints (`join_hint`, above) do: `FROM t tablesample` reads
  // TABLESAMPLE as this clause rather than as the table's alias, and
  // there is no later token that can change that, unlike the FOR
  // SYSTEM_TIME/PERIOD FOR SYSTEM_TIME collisions this file otherwise
  // resolves with an atomic token — TABLESAMPLE genuinely is a single
  // word here, and this clause's own first alternative already needs to
  // be exactly that word. `FROM t AS tablesample TABLESAMPLE (...)` is
  // the workaround: after an explicit AS, only `identifier` is a valid
  // symbol, so the word lexes as a plain alias there.
  tablesample_clause: ($) =>
    seq(
      $.keyword_tablesample,
      optional($.keyword_system),
      wrapped_in_parenthesis(
        seq($._expression, optional(choice($.keyword_percent, $.keyword_rows))),
      ),
      optional(seq($.keyword_repeatable, wrapped_in_parenthesis($._expression))),
    ),

  values: ($) => seq($.keyword_values, comma_list($.list, true)),

  join: ($) =>
    seq(
      optional(
        seq(
          choice(
            seq($.keyword_left, optional($.keyword_outer)),
            seq($.keyword_right, optional($.keyword_outer)),
            seq($.keyword_full, optional($.keyword_outer)),
            $.keyword_inner,
          ),
          optional($.join_hint),
        ),
      ),
      $.keyword_join,
      $._relation_with_hint,
      optional($.join),
      $.keyword_on,
      field('predicate', $._expression),
    ),

  // { HASH | LOOP | MERGE | REMOTE } between the join type and JOIN: a
  // physical join hint, its own node because a linter wants to flag it.
  // The hint is only accepted after a join type. A bare `FROM a HASH JOIN
  // b` would make HASH, LOOP and REMOTE keywords in the position an
  // AS-less alias occupies, so `FROM dbo.t hash` would stop parsing and
  // `FROM dbo.a remote JOIN dbo.b` would silently lose its alias; and a
  // bare MERGE is also a MERGE statement starting after an unterminated
  // FROM, which a `conflicts` entry on `from` resolves at triple the
  // generate time. The untyped spellings are the join forms the grammar
  // does not parse.
  join_hint: ($) => choice($.keyword_hash, $.keyword_loop, $.keyword_merge, $.keyword_remote),

  cross_join: ($) => seq($.keyword_cross, $.keyword_join, $._relation_with_hint),

  // T-SQL CROSS APPLY / OUTER APPLY — a correlated join evaluated per row of
  // the outer table. No ON predicate. CROSS APPLY excludes rows where the
  // right side returns empty; OUTER APPLY produces NULLs (like LEFT JOIN).
  apply_join: ($) =>
    prec.right(
      seq(
        choice(seq($.keyword_cross, $.keyword_apply), seq($.keyword_outer, $.keyword_apply)),
        // No bare object_reference target: reaching object_reference from here
        // multiplies the parser's state space enough that generate does not
        // finish, and APPLY on a plain table (rather than a function or
        // subquery) has no practical use in T-SQL.
        choice($.subquery, seq($.invocation, optional($.openjson_schema))),
        aliased_with_columns($),
      ),
    ),

  // table_source PIVOT ( aggregate(column) FOR column IN (value [, ...]) ) [AS] alias
  pivot_clause: ($) =>
    prec.right(
      seq(
        $.keyword_pivot,
        wrapped_in_parenthesis(
          seq(
            $.invocation,
            $.keyword_for,
            alias($._qualified_field, $.field),
            $.keyword_in,
            paren_list($.identifier, true),
          ),
        ),
        optional($._alias),
      ),
    ),

  // table_source UNPIVOT ( value_column FOR pivot_column IN (column [, ...]) ) [AS] alias
  unpivot_clause: ($) =>
    prec.right(
      seq(
        $.keyword_unpivot,
        wrapped_in_parenthesis(
          seq(
            $.identifier,
            $.keyword_for,
            $.identifier,
            $.keyword_in,
            paren_list($.identifier, true),
          ),
        ),
        optional($._alias),
      ),
    ),

  where: ($) => seq($.keyword_where, choice(field('predicate', $._expression), $.current_of)),

  // WHERE CURRENT OF [GLOBAL] cursor — a positioned UPDATE or DELETE
  // through an open cursor, in place of a predicate.
  current_of: ($) => seq($.keyword_current, $.keyword_of, optional($.keyword_global), $.identifier),

  // GROUP BY expression [, ...], where an expression may be ROLLUP(...),
  // CUBE(...) — ordinary invocations — or GROUPING SETS (...).
  group_by: ($) =>
    seq($.keyword_group, $.keyword_by, comma_list(choice($._expression, $.grouping_sets), true)),

  grouping_sets: ($) => seq($.keyword_grouping, $.keyword_sets, paren_list($._expression, true)),

  having: ($) => seq($.keyword_having, $._expression),

  order_by: ($) => prec.right(seq($.keyword_order, $.keyword_by, comma_list($.order_target, true))),

  order_target: ($) => seq($._expression, optional($.direction)),
};
