import { write_target } from '../helpers.js';

// T-SQL DELETE:
//
//   DELETE [TOP (n)] [FROM] target [WITH (hints)] [OUTPUT ...] [FROM ... joins]
//     [WHERE ...] [OPTION (...)]
//
// `target` is a table, a table variable, or the alias of a relation in the
// second FROM clause (`DELETE t FROM dbo.tbl AS t JOIN ...`). Unlike SELECT,
// DELETE never takes GROUP BY/HAVING/ORDER BY/OFFSET FETCH — OPTION is the
// only one of `from`'s former trailing clauses real T-SQL allows here.
export default {
  _delete_statement: ($) => $.delete,

  delete: ($) =>
    prec.right(
      seq(
        $.keyword_delete,
        optional($.top_clause),
        optional($.keyword_from),
        write_target($, { allowRowsetFunction: true }),
        optional($.output_clause),
        optional($.from),
        optional($.where),
        optional($.option_clause),
      ),
    ),
};
