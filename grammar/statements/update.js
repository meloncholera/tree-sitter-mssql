import { write_target } from '../helpers.js';

// T-SQL UPDATE:
//
//   UPDATE [TOP (n)] target [WITH (hints)] SET assignments [OUTPUT ...] [FROM ...]
//     [WHERE ...] [OPTION (...)]
//
// `target` is a table name or the alias of a relation introduced in the
// FROM clause (`UPDATE t SET ... FROM dbo.tbl AS t JOIN ...`) — either way
// a bare object reference, per SQL Server's own syntax reference, which
// documents no separate `[AS] alias` clause and no TABLESAMPLE/FOR SYSTEM
// TIME/OPENJSON schema here (those are read-side row sources `relation`
// also has to serve — see `write_target`). Unlike SELECT, UPDATE never
// takes GROUP BY/HAVING/ORDER BY/OFFSET FETCH — OPTION is the only one of
// `from`'s former trailing clauses real T-SQL allows here.
export default {
  _update_statement: ($) => $.update,

  update: ($) =>
    prec.right(
      seq(
        $.keyword_update,
        optional($.top_clause),
        write_target($, { allowRowsetFunction: true }),
        $._set_values,
        optional($.output_clause),
        optional($.from),
        optional($.where),
        optional($.option_clause),
      ),
    ),
};
