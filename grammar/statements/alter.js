import { comma_list, paren_list, wrapped_in_parenthesis } from '../helpers.js';
import { event_session_body } from './create.js';

export default {
  _alter_statement: ($) =>
    choice(
      $.alter_table,
      $.alter_view,
      $.alter_index,
      $.alter_database,
      $.alter_schema,
      $.alter_role,
      $.alter_user,
      $.alter_login,
      $.alter_sequence,
      $.alter_authorization,
      $.alter_procedure,
      $.alter_function,
      $.alter_trigger,
      $.alter_server_audit,
      $.alter_event_session,
      $.alter_master_key,
      $.alter_certificate,
      $.alter_symmetric_key,
      $.alter_asymmetric_key,
      $.alter_column_encryption_key,
      $.alter_security_policy,
      $.alter_xml_schema_collection,
      $.alter_queue,
      $.alter_assembly,
      $.alter_fulltext_catalog,
      $.alter_fulltext_index,
      $.alter_partition_function,
      $.alter_partition_scheme,
      $.alter_route,
    ),

  // ALTER XML SCHEMA COLLECTION name ADD expression
  alter_xml_schema_collection: ($) =>
    seq(
      $.keyword_alter,
      $.keyword_xml,
      $.keyword_schema,
      $.keyword_collection,
      field('name', $.object_reference),
      $.keyword_add,
      $._expression,
    ),

  // ALTER TABLE name
  //     [WITH { CHECK | NOCHECK }] ADD { column | constraint } [, ...]
  //   | DROP { [CONSTRAINT] [IF EXISTS] name [, ...] | COLUMN [IF EXISTS] name [, ...] }
  //   | ALTER COLUMN name { type [COLLATE name] [NULL | NOT NULL] | ADD/DROP flag }
  //   | { CHECK | NOCHECK } CONSTRAINT { ALL | name [, ...] }
  //   | { ENABLE | DISABLE } TRIGGER { ALL | name [, ...] }
  //   | SET ( option [, ...] )
  //   | REBUILD [WITH (options)]
  //   | SWITCH [PARTITION expr] TO table [PARTITION expr]
  alter_table: ($) =>
    prec.right(
      seq(
        $.keyword_alter,
        $.keyword_table,
        $.object_reference,
        choice(
          seq(
            optional(seq($.keyword_with, choice($.keyword_check, $.keyword_nocheck))),
            $.keyword_add,
            comma_list(choice($.column_definition, $.constraint, $.period_for_system_time), true),
          ),
          seq(
            $.keyword_drop,
            choice(
              seq($.keyword_column, optional($._if_exists), comma_list($.identifier, true)),
              // DROP PERIOD FOR SYSTEM_TIME takes no column list — unlike the
              // ADD form (`period_for_system_time` in column-lists.js), the
              // columns are already known from the existing period definition.
              $.keyword_period_for_system_time,
              seq(
                optional($.keyword_constraint),
                optional($._if_exists),
                comma_list($.identifier, true),
              ),
            ),
          ),
          seq(
            $.keyword_alter,
            $.keyword_column,
            field('name', $.identifier),
            choice(
              seq(
                field('type', $._type),
                optional(seq($.keyword_collate, $.identifier)),
                optional(choice($.keyword_null, $._not_null)),
              ),
              // ADD MASKED WITH (...) / DROP MASKED applies or removes Dynamic
              // Data Masking on an existing column — the form maintenance
              // scripts emit, since a mask is normally added after the table
              // already exists. Checked ahead of the bare-identifier flag
              // alternative below, which still covers ADD/DROP ROWGUIDCOL etc.
              seq($.keyword_add, $.masked_with),
              seq($.keyword_drop, $.keyword_masked),
              seq(choice($.keyword_add, $.keyword_drop), $.identifier),
            ),
          ),
          seq(
            optional(seq($.keyword_with, choice($.keyword_check, $.keyword_nocheck))),
            choice($.keyword_check, $.keyword_nocheck),
            $.keyword_constraint,
            choice($.keyword_all, comma_list($.identifier, true)),
          ),
          seq(
            choice($.keyword_enable, $.keyword_disable),
            $.keyword_trigger,
            choice($.keyword_all, comma_list($.identifier, true)),
          ),
          seq($.keyword_set, paren_list($.option, true)),
          seq($.keyword_rebuild, optional($.with_options)),
          seq(
            $.keyword_switch,
            optional(seq($.keyword_partition, field('from_partition', $._expression))),
            $.keyword_to,
            field('target', $.object_reference),
            optional(seq($.keyword_partition, field('to_partition', $._expression))),
          ),
        ),
      ),
    ),

  // ALTER INDEX { name | ALL } ON table { REBUILD [WITH (options)] | REORGANIZE [WITH (options)]
  //   | DISABLE | SET (options) | RESUME [WITH (options)] | PAUSE | ABORT }
  // RESUME/PAUSE/ABORT (2017) control a resumable online rebuild already in
  // progress; RESUME's own WITH (MAX_DURATION = n MINUTES, ...) reuses the
  // same option-list machinery REBUILD's does.
  alter_index: ($) =>
    prec.right(
      seq(
        $.keyword_alter,
        $.keyword_index,
        choice($.keyword_all, field('name', $.identifier)),
        $.keyword_on,
        $.object_reference,
        choice(
          seq($.keyword_rebuild, optional($.with_options)),
          seq($.keyword_reorganize, optional($.with_options)),
          $.keyword_disable,
          seq($.keyword_set, paren_list($.option, true)),
          seq($.keyword_resume, optional($.with_options)),
          $.keyword_pause,
          $.keyword_abort,
        ),
      ),
    ),

  // ALTER DATABASE name { SET option [, ...] [WITH termination] | MODIFY NAME = name | COLLATE name }
  // Options are identifiers with an optional value: RECOVERY SIMPLE,
  // READ_ONLY, AUTO_UPDATE_STATISTICS ON, COMPATIBILITY_LEVEL = 150.
  // ALTER DATABASE SCOPED CONFIGURATION [FOR SECONDARY] SET option is its
  // own top-level alternative, distinct from `ALTER DATABASE <name>` —
  // there is no database name in this form, so folding it into the same
  // shape previously mis-captured SCOPED as the name and CONFIGURATION as
  // an unexplained second identifier.
  //
  // `keyword_scoped` is valid right in the database-name slot, so a
  // database literally named `scoped` collides the same way `bulk`/
  // `tablesample`/`window` do elsewhere in this grammar: `ALTER DATABASE
  // scoped SET ...` commits to this branch and errors; `ALTER DATABASE
  // [scoped] SET ...` is the workaround.
  alter_database: ($) =>
    prec.right(
      choice(
        seq(
          $.keyword_alter,
          $.keyword_database,
          field('name', $.identifier),
          choice(
            seq(
              $.keyword_set,
              comma_list($.option, true),
              // ROLLBACK IMMEDIATE | ROLLBACK AFTER <n> [SECONDS] — IMMEDIATE is
              // a bare identifier here (not a reserved word elsewhere in this
              // position), matching how it was already handled before AFTER
              // was added. SECONDS is a real keyword rather than a bare
              // optional identifier: SQL Server's own syntax treats it as the
              // literal trailing word, and leaving it as an optional bare
              // identifier would let it swallow a following statement's label
              // (`ROLLBACK AFTER 60 mylabel: ...`) the same way `keyword_bulk`
              // documents for TRUNCATE — anchoring it on a real keyword removes
              // that ambiguity, since `mylabel` no longer matches.
              optional(
                seq(
                  $.keyword_with,
                  choice(
                    seq(
                      $.keyword_rollback,
                      choice(
                        $.identifier,
                        seq(
                          $.keyword_after,
                          field('seconds', $.literal),
                          optional($.keyword_seconds),
                        ),
                      ),
                    ),
                    $.identifier,
                  ),
                ),
              ),
            ),
            seq($.keyword_modify, $.option),
            seq($.keyword_collate, $.identifier),
          ),
        ),
        seq(
          $.keyword_alter,
          $.keyword_database,
          $.keyword_scoped,
          $.keyword_configuration,
          choice(
            seq(optional(seq($.keyword_for, $.keyword_secondary)), $.keyword_set, $.option),
            // CLEAR PROCEDURE_CACHE [plan_handle]. PROCEDURE_CACHE is one
            // word, so it is its own keyword rather than two keywords or a
            // free identifier (a free identifier would also accept CLEAR
            // followed by any name). The handle is a varbinary literal or a
            // variable. A bare identifier would also match, and an optional
            // one in this trailing slot swallows a following statement's
            // label.
            seq(
              $.keyword_clear,
              $.keyword_procedure_cache,
              optional(choice($.literal, alias($._tsql_parameter, $.identifier))),
            ),
          ),
        ),
      ),
    ),

  // ALTER SCHEMA name TRANSFER [class::] object
  alter_schema: ($) =>
    seq(
      $.keyword_alter,
      $.keyword_schema,
      $.identifier,
      $.keyword_transfer,
      optional(seq($.identifier, '::')),
      $.object_reference,
    ),

  // ALTER [SERVER] ROLE name { ADD MEMBER name | DROP MEMBER name | WITH NAME = name }
  alter_role: ($) =>
    seq(
      $.keyword_alter,
      optional($.keyword_server),
      $.keyword_role,
      $.identifier,
      choice(
        seq($.keyword_add, $.keyword_member, $.identifier),
        seq($.keyword_drop, $.keyword_member, $.identifier),
        $.with_clause,
      ),
    ),

  // ALTER USER name WITH option [, ...]
  alter_user: ($) => seq($.keyword_alter, $.keyword_user, $.identifier, $.with_clause),

  // ALTER LOGIN name { ENABLE | DISABLE | WITH option [, ...] | ADD/DROP CREDENTIAL name }
  alter_login: ($) =>
    seq(
      $.keyword_alter,
      $.keyword_login,
      $.identifier,
      choice(
        $.keyword_enable,
        $.keyword_disable,
        $.with_clause,
        seq(choice($.keyword_add, $.keyword_drop), $.identifier, $.identifier),
      ),
    ),

  // ALTER SEQUENCE name option [...]
  alter_sequence: ($) =>
    prec.right(
      seq($.keyword_alter, $.keyword_sequence, $.object_reference, repeat1($.sequence_option)),
    ),

  // ALTER AUTHORIZATION ON [class::] object TO { principal | SCHEMA OWNER }
  alter_authorization: ($) =>
    seq(
      $.keyword_alter,
      $.keyword_authorization,
      $.keyword_on,
      optional(seq($.identifier, '::')),
      $.object_reference,
      $.keyword_to,
      choice(seq($.keyword_schema, $.keyword_owner), $.identifier),
    ),

  // ALTER EVENT SESSION name ON SERVER
  //   { [ADD EVENT ...] [ADD TARGET ...] [DROP EVENT name [, ...]]
  //     [DROP TARGET name [, ...]] [WITH (options)]
  //   | STATE = START | STOP }
  // STATE = value must be the statement's only clause — SQL Server rejects
  // combining it with ADD/DROP/WITH — so it is a separate alternative
  // rather than one more optional segment of event_session_body() (shared
  // with create_event_session in create.js, whose comment there explains
  // the fixed ADD/DROP/WITH clause order this assumes).
  alter_event_session: ($) =>
    prec.right(
      seq(
        $.keyword_alter,
        $.keyword_event,
        $.keyword_session,
        field('name', $.identifier),
        $.keyword_on,
        $.keyword_server,
        choice(event_session_body($), $.option),
      ),
    ),

  // ALTER QUEUE name { WITH queue_option [, ...] | REBUILD [WITH (...)] | REORGANIZE [WITH (...)] }   (Service Broker)
  // The bare `with_clause` mirrors `create_queue`'s own WITH option list.
  // No prec.right, for the same trailing-WITH-vs-following-CTE reason
  // `truncate_statement` documents — see the `[$.alter_queue]` conflicts
  // entry in grammar.js.
  // REBUILD's option list is parenthesized (`WITH (option = value, ...)`);
  // REORGANIZE only ever takes the single bare `WITH LOB_COMPACTION = value`
  // form, with no parentheses — the two are not interchangeable.
  alter_queue: ($) =>
    seq(
      $.keyword_alter,
      $.keyword_queue,
      $.object_reference,
      choice(
        $.with_clause,
        seq($.keyword_rebuild, optional($.with_options)),
        seq($.keyword_reorganize, optional($.with_clause)),
      ),
    ),

  // ALTER ASSEMBLY name [FROM 'path'|0x... [, ...]] [WITH option [, ...]]
  //   [DROP FILE {name [, ...] | ALL}] [ADD FILE FROM 'path'|0x... [AS name] [, ...]]
  // DROP FILE and ADD FILE are independently optional and may both appear
  // in one statement (replacing a source file is DROP then ADD, in that
  // order per SQL Server's own syntax reference) — not a mutually
  // exclusive choice. No prec.right: with neither DROP FILE nor ADD FILE
  // present, the trailing WITH has the same trailing-WITH-vs-following-CTE
  // ambiguity `alter_fulltext_catalog` documents — see the
  // `[$.alter_assembly]` conflicts entry in grammar.js.
  alter_assembly: ($) =>
    seq(
      $.keyword_alter,
      $.keyword_assembly,
      $.identifier,
      optional(seq($.keyword_from, comma_list($.literal, true))),
      optional($.with_clause),
      optional(
        seq($.keyword_drop, $.keyword_file, choice($.keyword_all, comma_list($.identifier, true))),
      ),
      optional(
        seq(
          $.keyword_add,
          $.keyword_file,
          $.keyword_from,
          comma_list(seq($.literal, optional(seq($.keyword_as, $.identifier))), true),
        ),
      ),
    ),

  // ALTER FULLTEXT CATALOG name { REBUILD [WITH (ACCENT_SENSITIVITY = ON|OFF)] | REORGANIZE | AS DEFAULT }
  // No prec.right: SQL Server's real REBUILD form is the bare `with_clause`
  // (`REBUILD WITH ACCENT_SENSITIVITY = OFF`, no parentheses — `with_options`
  // was wrong here), and forcing the shift with prec.right would swallow an
  // unterminated statement's following CTE the same way it did for
  // `create_message_type` (see that rule's comment) — the
  // `[$.alter_fulltext_catalog]` conflicts entry lets GLR resolve both that
  // and the trailing WITH binding correctly instead.
  alter_fulltext_catalog: ($) =>
    seq(
      $.keyword_alter,
      $.keyword_fulltext,
      $.keyword_catalog,
      $.identifier,
      choice(
        seq($.keyword_rebuild, optional($.with_clause)),
        $.keyword_reorganize,
        seq($.keyword_as, $.keyword_default),
      ),
    ),

  // ALTER FULLTEXT INDEX ON table
  //   { ENABLE | DISABLE
  //   | SET STOPLIST { SYSTEM | OFF | name } [WITH NO POPULATION]
  //   | SET SEARCH PROPERTY LIST { name | OFF } [WITH NO POPULATION]
  //   | SET CHANGE_TRACKING { MANUAL | AUTO | OFF } [WITH NO POPULATION]
  //   | ADD (column [, ...]) [WITH NO POPULATION]
  //   | DROP (column [, ...]) [WITH NO POPULATION]
  //   | START { FULL | INCREMENTAL | UPDATE } POPULATION
  //   | STOP POPULATION }
  // FULL/INCREMENTAL/UPDATE/POPULATION and the SET target words are bare
  // identifiers, the same treatment every other DDL option word gets.
  // SET's target is bounded to the two real shapes (a two-word target like
  // STOPLIST/CHANGE_TRACKING, or the four-word SEARCH PROPERTY LIST name)
  // rather than an unbounded `repeat1($.identifier)`, which would keep
  // consuming bare words past the option value and swallow a following
  // statement's label. "WITH NO POPULATION" reuses `with_clause` —
  // `option`'s own optional bare-value form already reads NO/POPULATION as
  // name/value.
  // STOP is anchored on a real `keyword_stop` (probed clean in both the
  // AS-less-alias and bare-column identifier positions, matching every
  // other keyword this grammar adds) rather than a second bare identifier
  // next to START's — a bare-identifier-pair catch-all would silently
  // accept any two words after the object reference.
  // No prec.right, for the same trailing-WITH-vs-following-CTE reason
  // `alter_fulltext_catalog` documents — see the `[$.alter_fulltext_index]`
  // conflicts entry in grammar.js.
  alter_fulltext_index: ($) =>
    seq(
      $.keyword_alter,
      $.keyword_fulltext,
      $.keyword_index,
      $.keyword_on,
      $.object_reference,
      choice(
        $.keyword_enable,
        $.keyword_disable,
        seq(
          $.keyword_set,
          choice(
            seq($.identifier, $.identifier, $.identifier, $.identifier),
            seq($.identifier, $.identifier),
          ),
          optional($.with_clause),
        ),
        seq($.keyword_add, paren_list($.fulltext_index_column, true), optional($.with_clause)),
        seq($.keyword_drop, paren_list($.identifier, true), optional($.with_clause)),
        seq($.keyword_start, $.identifier, $.identifier),
        seq($.keyword_stop, $.identifier),
      ),
    ),

  // ALTER PARTITION FUNCTION name() { SPLIT | MERGE } RANGE (boundary_value)
  // The boundary value is `_expression`, not `literal` — sliding-window
  // partition maintenance overwhelmingly passes a variable (`SPLIT RANGE
  // (@boundary)`) rather than a literal constant.
  alter_partition_function: ($) =>
    seq(
      $.keyword_alter,
      $.keyword_partition,
      $.keyword_function,
      $.identifier,
      wrapped_in_parenthesis(),
      choice($.keyword_split, $.keyword_merge),
      $.keyword_range,
      wrapped_in_parenthesis($._expression),
    ),

  // ALTER PARTITION SCHEME name NEXT USED [filegroup]
  alter_partition_scheme: ($) =>
    prec.right(
      seq(
        $.keyword_alter,
        $.keyword_partition,
        $.keyword_scheme,
        $.identifier,
        $.keyword_next,
        $.keyword_used,
        optional($.identifier),
      ),
    ),

  // ALTER ROUTE name [WITH option [, ...]]   (Service Broker)
  // The bare `with_clause` mirrors `create_route`'s own WITH option list.
  // WITH is optional here — a no-op ALTER ROUTE with no options is valid —
  // which gives the trailing WITH the same trailing-WITH-vs-following-CTE
  // ambiguity `alter_fulltext_catalog` documents; see the `[$.alter_route]`
  // conflicts entry in grammar.js.
  alter_route: ($) => seq($.keyword_alter, $.keyword_route, $.identifier, optional($.with_clause)),
};
