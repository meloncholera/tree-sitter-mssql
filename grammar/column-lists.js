import { comma_list, paren_list, wrapped_in_parenthesis } from './helpers.js';

// The tail shared by every index-shaped constraint form: PRIMARY KEY,
// UNIQUE, and an inline INDEX, at both column level (no explicit column
// list — the constraint's own column is implied) and table level (an
// explicit `ordered_columns` list).
function index_spec($, { columns } = {}) {
  return [
    optional($._index_kind),
    ...(columns ? [$.ordered_columns] : []),
    optional($.with_options),
    optional($.on_filegroup),
  ];
}

// Column definitions and constraints, shared by CREATE TABLE, ALTER TABLE
// ... ADD, DECLARE @t TABLE, CREATE TYPE ... AS TABLE, and multi-statement
// table-valued function return tables.
export default {
  _column_list: ($) => paren_list(alias($._column, $.column), true),

  _column: ($) => $.identifier,

  // ( column | constraint [, ...] ) — T-SQL allows a table-level constraint
  // anywhere in the list, between columns as well as at the end.
  //
  // `column_definitions` is shared by CREATE TABLE, ALTER TABLE ... ADD,
  // CREATE TYPE ... AS TABLE, and every table variable declaration
  // (DECLARE @t TABLE, a multi-statement TVF's RETURNS @t TABLE), so
  // `period_for_system_time` is syntactically reachable in the latter two
  // even though only a durable base table can be system-versioned.
  // Deliberate, per the same over-acceptance reasoning `relation`'s own
  // comment states above.
  column_definitions: ($) =>
    paren_list(choice($.column_definition, $.constraint, $.period_for_system_time), true),

  // PERIOD FOR SYSTEM_TIME (start_column, end_column) — declares which two
  // columns hold a system-versioned temporal table's row validity period.
  // A separate rule from `constraint` rather than one more of its
  // alternatives: unlike every other table-level constraint, this one
  // never takes an optional `CONSTRAINT name` prefix. Uses the atomic
  // `keyword_period_for_system_time` token, not three separate keywords —
  // see that token's comment in keywords.js for why a bare `keyword_period`
  // here would break an ordinary column literally named `period`.
  period_for_system_time: ($) =>
    seq($.keyword_period_for_system_time, paren_list($.identifier, true)),

  // name type [COLLATE name] [constraint ...]
  // name AS expression [PERSISTED] [NOT NULL]       (computed column)
  column_definition: ($) =>
    prec.left(
      seq(
        field('name', $._column),
        choice(
          seq(
            field('type', $._type),
            optional(seq($.keyword_collate, $.identifier)),
            repeat($._column_constraint),
          ),
          seq(
            $.keyword_as,
            field('expression', $._expression),
            optional($.keyword_persisted),
            optional($._not_null),
          ),
        ),
      ),
    ),

  // NOT FOR REPLICATION is its own alternative rather than a suffix of the
  // IDENTITY, REFERENCES and CHECK forms it belongs to, so that after
  // `IDENTITY(1,1)` the parser can see both `NOT NULL` and `NOT FOR
  // REPLICATION` from one state instead of committing to one on `NOT`.
  _column_constraint: ($) =>
    prec.right(
      choice(
        $.keyword_null,
        $._not_null,
        $._not_for_replication,
        // IDENTITY [(seed, increment)]
        seq(
          $.keyword_identity,
          optional(
            wrapped_in_parenthesis(
              seq(field('seed', $._expression), ',', field('increment', $._expression)),
            ),
          ),
        ),
        seq(
          optional(seq($.keyword_constraint, field('name', $.identifier))),
          choice(
            seq($.keyword_default, $._expression),
            seq($._primary_key, ...index_spec($)),
            seq($.keyword_unique, ...index_spec($)),
            seq(
              optional(seq($.keyword_foreign, $.keyword_key)),
              $.keyword_references,
              $.object_reference,
              optional(paren_list($.identifier, true)),
              repeat($.referential_action),
            ),
            seq(
              $.keyword_check,
              optional($._not_for_replication),
              wrapped_in_parenthesis($._expression),
            ),
          ),
        ),
        // MASKED WITH (FUNCTION = 'default()') — Dynamic Data Masking (2016).
        // `repeat($._column_constraint)` lets a column carry both this and
        // ENCRYPTED WITH below, which SQL Server itself rejects (a column can't
        // be both masked and Always Encrypted) — deliberate over-acceptance,
        // the same call this file already makes for `option`/`_column_constraint`'s
        // bare-identifier catch-all: a downstream linter judges the semantic
        // conflict, not the grammar.
        $.masked_with,
        // ENCRYPTED WITH (COLUMN_ENCRYPTION_KEY = k, ENCRYPTION_TYPE = ...,
        // ALGORITHM = 'x') — Always Encrypted (2016); the referenced key comes
        // from CREATE COLUMN ENCRYPTION KEY below.
        $.encrypted_with,
        // ROWGUIDCOL, SPARSE, FILESTREAM, and the other bare column flags.
        $.identifier,
      ),
    ),

  masked_with: ($) => seq($.keyword_masked, $.with_options),

  encrypted_with: ($) => seq($.keyword_encrypted, $.with_options),

  _index_kind: ($) => choice($.keyword_clustered, $.keyword_nonclustered),

  // Table-level constraint, also the shape ALTER TABLE ... ADD accepts.
  constraint: ($) =>
    prec.right(
      seq(
        optional(seq($.keyword_constraint, field('name', $.identifier))),
        choice(
          seq($._primary_key, ...index_spec($, { columns: true })),
          seq($.keyword_unique, ...index_spec($, { columns: true })),
          seq(
            $.keyword_foreign,
            $.keyword_key,
            paren_list($.identifier, true),
            $.keyword_references,
            $.object_reference,
            optional(paren_list($.identifier, true)),
            repeat($.referential_action),
            optional($._not_for_replication),
          ),
          seq(
            $.keyword_check,
            optional($._not_for_replication),
            wrapped_in_parenthesis($._expression),
          ),
          // ALTER TABLE t ADD [CONSTRAINT name] DEFAULT expression FOR column
          seq($.keyword_default, $._expression, $.keyword_for, field('column', $.identifier)),
          // Inline index: INDEX name [CLUSTERED | NONCLUSTERED] (columns)
          seq($.keyword_index, field('name', $.identifier), ...index_spec($, { columns: true })),
        ),
      ),
    ),

  // ON { DELETE | UPDATE } { NO ACTION | CASCADE | SET NULL | SET DEFAULT }
  referential_action: ($) =>
    seq(
      $.keyword_on,
      choice($.keyword_delete, $.keyword_update),
      choice(
        seq($.keyword_no, $.keyword_action),
        $.keyword_cascade,
        seq($.keyword_set, choice($.keyword_null, $.keyword_default)),
      ),
    ),

  ordered_columns: ($) => paren_list(alias($.ordered_column, $.column), true),

  ordered_column: ($) => seq(field('name', $._column), optional($.direction)),

  // ON filegroup | ON partition_scheme (column) | ON "default"
  on_filegroup: ($) =>
    prec.right(seq($.keyword_on, $.identifier, optional(wrapped_in_parenthesis($.identifier)))),

  // The option list most DDL statements take: `WITH (PAD_INDEX = OFF,
  // FILLFACTOR = 90)`. Option names are identifiers — there are hundreds
  // and nothing downstream needs them distinguished.
  with_options: ($) => seq($.keyword_with, paren_list($.option, true)),

  // The unparenthesized spelling security and server objects use:
  // `WITH DEFAULT_DATABASE = [master], CHECK_POLICY = OFF`. Kept separate
  // from with_options because inside a comma-separated column list the
  // bare form is ambiguous with the next list item.
  with_clause: ($) => prec.right(seq($.keyword_with, comma_list($.option, true))),

  option: ($) =>
    prec.right(
      seq(
        field('name', $.identifier),
        optional(
          choice(
            seq('=', field('value', $._option_value)),
            field('value', $._option_value),
            // FORMAT_OPTIONS (FIELD_TERMINATOR = '|'), WAIT_AT_LOW_PRIORITY (ABORT_AFTER_WAIT = SELF)
            paren_list($.option, true),
          ),
        ),
      ),
    ),

  _option_value: ($) =>
    prec.right(
      choice(
        // ON, OFF, PAGE, ..., optionally with sub-options:
        // ONLINE = ON (WAIT_AT_LOW_PRIORITY (...)), QUERY_STORE = ON (OPERATION_MODE = READ_WRITE)
        seq(
          choice($.keyword_on, $.keyword_off, $.identifier),
          optional(paren_list($.option, true)),
        ),
        $.keyword_default,
        // 100 MB, 50 PERCENT
        seq($.literal, optional($.identifier)),
      ),
    ),
};
