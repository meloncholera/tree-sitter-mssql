import { comma_list } from '../helpers.js';

// DROP <object kind> [IF EXISTS] name [, ...]. T-SQL has no CASCADE or
// RESTRICT on any DROP.
export default {
  _drop_statement: ($) =>
    choice(
      $.drop_table,
      $.drop_view,
      $.drop_index,
      $.drop_procedure,
      $.drop_function,
      $.drop_trigger,
      $.drop_type,
      $.drop_schema,
      $.drop_database,
      $.drop_role,
      $.drop_user,
      $.drop_login,
      $.drop_synonym,
      $.drop_sequence,
      $.drop_statistics,
      $.drop_assembly,
      $.drop_event_session,
      $.drop_master_key,
      $.drop_certificate,
      $.drop_symmetric_key,
      $.drop_asymmetric_key,
      $.drop_column_encryption_key,
      $.drop_column_master_key,
      $.drop_security_policy,
      $.drop_xml_schema_collection,
    ),

  // DROP XML SCHEMA COLLECTION [IF EXISTS] name
  drop_xml_schema_collection: ($) =>
    seq(
      $.keyword_drop,
      $.keyword_xml,
      $.keyword_schema,
      $.keyword_collection,
      optional($._if_exists),
      field('name', $.object_reference),
    ),

  drop_table: ($) =>
    seq(
      $.keyword_drop,
      $.keyword_table,
      optional($._if_exists),
      comma_list(field('name', $.object_reference), true),
    ),

  drop_view: ($) =>
    seq(
      $.keyword_drop,
      $.keyword_view,
      optional($._if_exists),
      comma_list(field('name', $.object_reference), true),
    ),

  // DROP INDEX [IF EXISTS] name ON table [, ...]
  // DROP INDEX table.name                        (legacy spelling)
  drop_index: ($) =>
    seq(
      $.keyword_drop,
      $.keyword_index,
      optional($._if_exists),
      comma_list(
        seq(field('name', $.object_reference), optional(seq($.keyword_on, $.object_reference))),
        true,
      ),
    ),

  drop_procedure: ($) =>
    seq(
      $.keyword_drop,
      choice($.keyword_procedure, $.keyword_proc),
      optional($._if_exists),
      comma_list(field('name', $.object_reference), true),
    ),

  drop_function: ($) =>
    seq(
      $.keyword_drop,
      $.keyword_function,
      optional($._if_exists),
      comma_list(field('name', $.object_reference), true),
    ),

  // DROP TRIGGER [IF EXISTS] name [, ...] [ON DATABASE | ON ALL SERVER]
  drop_trigger: ($) =>
    prec.right(
      seq(
        $.keyword_drop,
        $.keyword_trigger,
        optional($._if_exists),
        comma_list(field('name', $.object_reference), true),
        optional(
          seq($.keyword_on, choice($.keyword_database, seq($.keyword_all, $.keyword_server))),
        ),
      ),
    ),

  drop_type: ($) =>
    seq($.keyword_drop, $.keyword_type, optional($._if_exists), field('name', $.object_reference)),

  drop_schema: ($) =>
    seq($.keyword_drop, $.keyword_schema, optional($._if_exists), field('name', $.identifier)),

  drop_database: ($) =>
    seq(
      $.keyword_drop,
      $.keyword_database,
      optional($._if_exists),
      comma_list(field('name', $.identifier), true),
    ),

  drop_role: ($) =>
    seq(
      $.keyword_drop,
      optional($.keyword_server),
      $.keyword_role,
      optional($._if_exists),
      field('name', $.identifier),
    ),

  drop_user: ($) =>
    seq($.keyword_drop, $.keyword_user, optional($._if_exists), field('name', $.identifier)),

  drop_login: ($) => seq($.keyword_drop, $.keyword_login, field('name', $.identifier)),

  drop_synonym: ($) =>
    seq(
      $.keyword_drop,
      $.keyword_synonym,
      optional($._if_exists),
      field('name', $.object_reference),
    ),

  drop_sequence: ($) =>
    seq(
      $.keyword_drop,
      $.keyword_sequence,
      optional($._if_exists),
      comma_list(field('name', $.object_reference), true),
    ),

  drop_statistics: ($) =>
    seq($.keyword_drop, $.keyword_statistics, comma_list(field('name', $.object_reference), true)),

  drop_assembly: ($) =>
    prec.right(
      seq(
        $.keyword_drop,
        $.keyword_assembly,
        optional($._if_exists),
        comma_list(field('name', $.identifier), true),
        optional(seq($.keyword_with, $.keyword_no, $.identifier)),
      ),
    ),

  // DROP EVENT SESSION name ON SERVER
  drop_event_session: ($) =>
    seq(
      $.keyword_drop,
      $.keyword_event,
      $.keyword_session,
      optional($._if_exists),
      field('name', $.identifier),
      $.keyword_on,
      $.keyword_server,
    ),
};
