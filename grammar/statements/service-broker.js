import { paren_list, wrapped_in_parenthesis } from '../helpers.js';

// Service Broker DML: the statements that open, use and close a
// conversation. The DDL half (CREATE QUEUE / CONTRACT / MESSAGE TYPE /
// ROUTE) is in create.js.
//
// SEND, RECEIVE, GET and MOVE are statement-start keywords, so each one
// carries the same AS-less alias collision bulk_insert_statement documents
// in index.js: `FROM t send` and `SELECT a send` read as the start of a
// SEND statement rather than an alias `send`, because with the top-level
// `;` optional a new statement may begin there. `FROM t AS send` and
// `SELECT a AS send` are unaffected. The same four words also can't name
// a label (`send: SELECT 1` errors, `GOTO send` still parses), for the
// same reason: a label is another thing a statement may begin with.
export default {
  // BEGIN DIALOG [CONVERSATION] @handle
  //   FROM SERVICE name TO SERVICE { 'name' | @name } [, { 'broker_instance' | @broker_instance }]
  //   [ON CONTRACT name] [WITH option [, ...]]
  // The WITH options (RELATED_CONVERSATION = @h, LIFETIME = n,
  // ENCRYPTION = ON | OFF) are the bare with_clause; ENCRYPTION lexes as an
  // identifier there because keyword_encryption is not valid in that
  // position. prec.right: the trailing WITH is otherwise the next
  // statement's CTE.
  begin_dialog_statement: ($) =>
    prec.right(
      seq(
        $.keyword_begin,
        $.keyword_dialog,
        optional($.keyword_conversation),
        field('handle', $.identifier),
        $.keyword_from,
        $.keyword_service,
        field('from_service', $.identifier),
        $.keyword_to,
        $.keyword_service,
        // The target service and broker instance are nvarchar values, so a
        // variable is accepted; the initiator service is a name.
        field('to_service', choice($.literal, $.identifier)),
        optional(seq(',', field('broker_instance', choice($.literal, $.identifier)))),
        optional(seq($.keyword_on, $.keyword_contract, field('contract', $.identifier))),
        optional($.with_clause),
      ),
    ),

  // SEND ON CONVERSATION { @handle | (@handle [, ...]) }
  //   [MESSAGE TYPE name] [(message_body)]
  // prec.right: the trailing parenthesized body is otherwise the next
  // statement's parenthesized SELECT.
  send_statement: ($) =>
    prec.right(
      seq(
        $.keyword_send,
        $.keyword_on,
        $.keyword_conversation,
        choice(field('handle', $.identifier), paren_list(field('handle', $.identifier), true)),
        optional(seq($.keyword_message, $.keyword_type, field('message_type', $.identifier))),
        optional(wrapped_in_parenthesis(field('body', $._expression))),
      ),
    ),

  // RECEIVE [TOP (n)] column [, ...] FROM queue [INTO @table_variable] [WHERE predicate]
  // The column list is a SELECT list: `*`, `column [AS alias]` or
  // `@variable = column`.
  receive_statement: ($) =>
    prec.right(
      seq(
        $.keyword_receive,
        optional($.top_clause),
        $.select_expression,
        $.keyword_from,
        field('queue', $.object_reference),
        optional(seq($.keyword_into, field('into', $.identifier))),
        optional($.where),
      ),
    ),

  // END CONVERSATION { @handle | 'guid' } [WITH ERROR = code DESCRIPTION = 'text'] [WITH CLEANUP]
  // The handle is a uniqueidentifier value, so a string constant is
  // accepted alongside a variable (SEND and GET CONVERSATION GROUP take a
  // variable only).
  // ERROR and DESCRIPTION are not comma-separated, so they cannot go through
  // with_clause: option's value would read DESCRIPTION as the unit of the
  // preceding number the way it reads `100 MB`.
  end_conversation_statement: ($) =>
    prec.right(
      seq(
        $.keyword_end,
        $.keyword_conversation,
        field('handle', choice($.identifier, $.literal)),
        optional(
          seq(
            $.keyword_with,
            choice(
              seq(
                alias($._end_conversation_option, $.option),
                alias($._end_conversation_option, $.option),
              ),
              $.identifier,
            ),
          ),
        ),
      ),
    ),

  _end_conversation_option: ($) =>
    seq(field('name', $.identifier), '=', field('value', choice($.literal, $.identifier))),

  // GET CONVERSATION GROUP @group_id FROM queue
  get_conversation_group_statement: ($) =>
    seq(
      $.keyword_get,
      $.keyword_conversation,
      $.keyword_group,
      field('group', $.identifier),
      $.keyword_from,
      field('queue', $.object_reference),
    ),

  // MOVE CONVERSATION { @handle | 'guid' } TO { @group_id | 'guid' }
  move_conversation_statement: ($) =>
    seq(
      $.keyword_move,
      $.keyword_conversation,
      field('handle', choice($.identifier, $.literal)),
      $.keyword_to,
      field('group', choice($.identifier, $.literal)),
    ),
};
