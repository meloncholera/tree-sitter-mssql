import { optional_parenthesis, comma_list, write_target } from '../helpers.js';

// The optional `AND <predicate>` a match condition may carry, shared by
// all three `_when_*` rules below.
function match_predicate($) {
  return optional(seq($.keyword_and, optional_parenthesis(field('predicate', $._expression))));
}

// DELETE | UPDATE SET — the action MATCHED and NOT MATCHED BY SOURCE
// share; NOT MATCHED [BY TARGET] takes INSERT instead (see
// `_when_not_matched_by_target` below).
function delete_or_update($) {
  return choice($.keyword_delete, seq($.keyword_update, $._set_values));
}

// T-SQL MERGE:
//
//   MERGE [TOP (n)] [INTO] target [WITH (hints)] [[AS] alias]
//     USING source [[AS] alias [(columns)]]
//     ON predicate
//     { WHEN [NOT] MATCHED [BY TARGET | BY SOURCE] [AND predicate] THEN action } [...]
//     [OUTPUT ...] [OPTION (...)]
export default {
  _merge_statement: ($) => $.merge,

  merge: ($) =>
    seq(
      $.keyword_merge,
      optional($.top_clause),
      optional($.keyword_into),
      write_target($),
      optional($._alias),
      $.keyword_using,
      choice($.subquery, $.invocation, $.object_reference),
      optional($.table_hint),
      optional(seq($._alias, optional(alias($._column_list, $.list)))),
      $.keyword_on,
      optional_parenthesis(field('predicate', $._expression)),
      repeat1($._merge_when_clause),
      optional($.output_clause),
      optional($.option_clause),
    ),

  // SQL Server allows INSERT only under NOT MATCHED [BY TARGET], and
  // DELETE/UPDATE SET only under MATCHED or NOT MATCHED BY SOURCE — a
  // documented mutual exclusion, so each match condition is its own
  // alternative with only the actions it actually accepts, rather than one
  // shared optional action segment every condition could reach. All three
  // alias to the same `merge_when_clause` node so the tree shape a
  // consumer sees is unchanged by the split (the `_add_security_predicate`
  // pattern already used in security.js).
  _merge_when_clause: ($) =>
    choice(
      alias($._when_matched, $.merge_when_clause),
      alias($._when_not_matched_by_target, $.merge_when_clause),
      alias($._when_not_matched_by_source, $.merge_when_clause),
    ),

  _when_matched: ($) =>
    prec.left(
      seq(
        $.keyword_when,
        $.keyword_matched,
        match_predicate($),
        $.keyword_then,
        delete_or_update($),
      ),
    ),

  _when_not_matched_by_target: ($) =>
    prec.left(
      seq(
        $.keyword_when,
        $.keyword_not,
        $.keyword_matched,
        optional(seq($.keyword_by, $.keyword_target)),
        match_predicate($),
        $.keyword_then,
        seq(
          $.keyword_insert,
          optional(alias($._column_list, $.list)),
          choice(
            seq($.keyword_values, comma_list($.list, true)),
            seq($.keyword_default, $.keyword_values),
          ),
        ),
      ),
    ),

  _when_not_matched_by_source: ($) =>
    prec.left(
      seq(
        $.keyword_when,
        $.keyword_not,
        $.keyword_matched,
        $.keyword_by,
        $.keyword_source,
        match_predicate($),
        $.keyword_then,
        delete_or_update($),
      ),
    ),
};
