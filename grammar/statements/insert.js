import { comma_list, optional_parenthesis, write_target } from '../helpers.js';

// T-SQL INSERT:
//
//   INSERT [TOP (n)] [INTO] table [WITH (hints)] [(columns)] [OUTPUT ...]
//     { VALUES (...) [, ...] | select | EXEC ... | DEFAULT VALUES }
export default {
  _insert_statement: ($) => $.insert,

  insert: ($) =>
    seq(
      $.keyword_insert,
      optional($.top_clause),
      optional($.keyword_into),
      write_target($, { allowBareHint: false }),
      optional(alias($._column_list, $.list)),
      optional($.output_clause),
      $._insert_source,
    ),

  // The SELECT/set-operation alternative goes straight to that choice
  // rather than through `_dml_read`, which also offers a leading CTE.
  // SQL Server requires a CTE *before* INSERT, not after the target
  // (`_dml_write` already provides that at index.js) — a CTE reachable
  // here would occupy the same position as `write_target`'s own table
  // hint above, giving the grammar two competing readings of a post-target
  // `WITH`.
  // OPTION is only added here for the VALUES/DEFAULT VALUES forms — the
  // SELECT/set-operation branch already carries its own trailing OPTION
  // clause, and adding a second one after it would let a single statement
  // carry two sibling OPTION clauses where SQL Server permits only one.
  _insert_source: ($) =>
    choice(
      seq($.keyword_values, comma_list($.list, true), optional($.option_clause)),
      optional_parenthesis(choice($._select_statement, $.set_operation)),
      $.execute_statement,
      seq($.keyword_default, $.keyword_values, optional($.option_clause)),
    ),

  // output_clause, assignment and _set_values moved to dml-shared.js —
  // update.js and merge.js use them too and neither is reachable from
  // `insert`.
};
