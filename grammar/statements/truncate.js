import { comma_list, wrapped_in_parenthesis } from '../helpers.js';

// TRUNCATE TABLE name [WITH (PARTITIONS ({ n | n TO m } [, ...]))]
// No prec.right: the top-level `;` is optional, so an unterminated
// TRUNCATE followed by a CTE-starting statement has the same trailing-WITH
// ambiguity `create_message_type` documents — forcing the shift would
// destroy the following CTE instead of ending the TRUNCATE. The
// `[$.truncate_statement]` conflicts entry in grammar.js lets GLR resolve
// both readings correctly instead.
export default {
  truncate_statement: ($) =>
    seq(
      $.keyword_truncate,
      $.keyword_table,
      $.object_reference,
      optional(
        seq(
          $.keyword_with,
          wrapped_in_parenthesis(
            seq(
              $.keyword_partitions,
              wrapped_in_parenthesis(comma_list($.truncate_partition_range, true)),
            ),
          ),
        ),
      ),
    ),

  truncate_partition_range: ($) =>
    seq(field('low', $.literal), optional(seq($.keyword_to, field('high', $.literal)))),
};
