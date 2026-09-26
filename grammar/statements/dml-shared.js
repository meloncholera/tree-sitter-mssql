import { comma_list, paren_list } from '../helpers.js';

// Rules shared by more than one DML writer. `output_clause` is used by
// INSERT, UPDATE, DELETE and MERGE; `assignment`/`_set_values` are used by
// UPDATE and MERGE's `WHEN MATCHED THEN UPDATE SET` action, but not INSERT.
export default {
  // OUTPUT term [, ...] [INTO table [(columns)]] — on INSERT, UPDATE, DELETE
  // and MERGE. The terms reference the `inserted`/`deleted` pseudo-tables
  // and `$action`, all of which are ordinary identifiers here.
  output_clause: ($) =>
    seq(
      $.keyword_output,
      comma_list($.term, true),
      optional(seq($.keyword_into, $.object_reference, optional(paren_list($.identifier, true)))),
    ),

  assignment: ($) =>
    seq(
      field('left', alias($._qualified_field, $.field)),
      $.assignment_operator,
      field('right', $._expression),
    ),

  // An item is an assignment or a bare method call with no `=`, which is
  // how the xml and json `.modify()` mutators are applied to a column:
  //   UPDATE t SET x.modify('insert ...')
  _set_values: ($) => seq($.keyword_set, comma_list(choice($.assignment, $.invocation), true)),
};
