import {
  optional_parenthesis,
  wrapped_in_parenthesis,
  paren_list,
  comma_list,
} from '../helpers.js';

import create_rules from './create.js';
import alter_rules from './alter.js';
import drop_rules from './drop.js';
import merge_rules from './merge.js';
import delete_rules from './delete.js';
import insert_rules from './insert.js';
import update_rules from './update.js';
import dml_shared_rules from './dml-shared.js';
import module_shared_rules from './module-shared.js';
import truncate_rules from './truncate.js';
import select_rules from './select.js';
import set_rules from './set.js';
import service_broker_rules from './service-broker.js';
import security_rules from './security.js';

export default {
  // A bare BEGIN ... END grouping block. Body items are `;`-optional, as
  // everywhere else in T-SQL.
  block: ($) => seq($.keyword_begin, repeat($._body_item), $.keyword_end),

  statement: ($) =>
    choice(
      $._ddl_statement,
      $._dml_write,
      optional_parenthesis($._dml_read),
      $.use_statement,
      $.if_statement,
      $.while_statement,
      $.try_catch_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.goto_statement,
      $.label_statement,
      $.throw_statement,
      $.raiserror_statement,
      $.var_declarations,
      $.print_statement,
      $.waitfor_statement,
      $.begin_transaction_statement,
      $.commit_statement,
      $.rollback_statement,
      $.save_transaction_statement,
      $.declare_cursor_statement,
      $.open_cursor_statement,
      $.fetch_cursor_statement,
      $.close_cursor_statement,
      $.deallocate_cursor_statement,
      $.execute_as_statement,
      $.revert_statement,
      $.enable_trigger_statement,
      $.grant_statement,
      $.update_statistics_statement,
      $.kill_statement,
      $.backup_statement,
      $.setuser_statement,
      $.readtext_statement,
      $.writetext_statement,
      $.updatetext_statement,
      $.bulk_insert_statement,
      $.begin_dialog_statement,
      $.send_statement,
      $.receive_statement,
      $.end_conversation_statement,
      $.get_conversation_group_statement,
      $.move_conversation_statement,
      $.open_key_statement,
      $.close_key_statement,
    ),

  // WHILE condition { statement | BEGIN ... END }
  while_statement: ($) =>
    seq(
      $.keyword_while,
      optional_parenthesis(field('condition', $._expression)),
      field('body', choice($.statement, $.block)),
    ),

  use_statement: ($) => seq($.keyword_use, $.object_reference),

  // IF condition { statement | BEGIN ... END } [ ELSE { statement | BEGIN ... END } ]
  if_statement: ($) =>
    seq(
      $.keyword_if,
      optional_parenthesis(field('condition', $._expression)),
      field('consequence', choice($.statement, $.block)),
      optional(field('alternative', $.else_clause)),
    ),

  // Two alternatives with different precedence on purpose:
  //
  // - The plain `ELSE ...` form carries prec 1 so a dangling ELSE binds to
  //   the nearest IF (the usual shift-over-reduce resolution).
  // - T-SQL also allows `IF x stmt; ELSE stmt` — a terminator on the
  //   consequence before ELSE. That form is prec 0, the same as
  //   if_statement, so the parser cannot resolve "is this `;` the start of
  //   an ELSE clause or the end of the IF" by precedence and instead forks
  //   (see the if_statement entry in `conflicts`). The fork dies one token
  //   later. Resolving it by precedence instead would make every IF
  //   without an ELSE swallow the `;` that ends it.
  else_clause: ($) =>
    choice(
      prec(1, seq($.keyword_else, choice($.statement, $.block))),
      seq(';', $.keyword_else, choice($.statement, $.block)),
    ),

  try_catch_statement: ($) => seq($.try_block, $.catch_block),
  try_block: ($) =>
    seq($.keyword_begin, $.keyword_try, repeat($._body_item), $.keyword_end, $.keyword_try),
  catch_block: ($) =>
    seq($.keyword_begin, $.keyword_catch, repeat($._body_item), $.keyword_end, $.keyword_catch),

  return_statement: ($) => prec.right(seq($.keyword_return, optional($._expression))),
  print_statement: ($) => seq($.keyword_print, $._expression),
  break_statement: ($) => $.keyword_break,
  continue_statement: ($) => $.keyword_continue,
  goto_statement: ($) => seq($.keyword_goto, $.identifier),
  label_statement: ($) => seq($.identifier, ':'),
  throw_statement: ($) =>
    prec.right(seq($.keyword_throw, optional(comma_list($._expression, true)))),
  // RAISERROR (message, severity, state [, argument ...]) [WITH option [, ...]]
  raiserror_statement: ($) =>
    seq(
      $.keyword_raiserror,
      wrapped_in_parenthesis(comma_list($._expression, true)),
      optional(seq($.keyword_with, comma_list($.identifier, true))),
    ),
  // WAITFOR { DELAY 'time' | TIME 'time' }
  // WAITFOR { DELAY 'time' | TIME 'time' | ( RECEIVE ... | GET CONVERSATION GROUP ... ) [, TIMEOUT n] }
  waitfor_statement: ($) =>
    seq(
      $.keyword_waitfor,
      choice(
        seq(choice($.keyword_delay, $.keyword_time), $._expression),
        seq(
          wrapped_in_parenthesis(choice($.receive_statement, $.get_conversation_group_statement)),
          optional(seq(',', $.keyword_timeout, $._expression)),
        ),
      ),
    ),

  // DECLARE can introduce either regular scalar variables (comma-separated) or
  // a single table variable (@t TABLE (...)). The two forms are mutually
  // exclusive in one DECLARE statement — T-SQL does not allow mixing them.
  var_declarations: ($) =>
    seq($.keyword_declare, choice(comma_list($.var_declaration, true), $.table_var_declaration)),

  // DECLARE @x [AS] type [= expression] — unlike a parameter default, the
  // initializer may be any expression (a function call is the common case).
  var_declaration: ($) =>
    seq($.identifier, optional($.keyword_as), $._type, optional(seq('=', $._expression))),

  // DECLARE @t TABLE (col1 type1, col2 type2, ...)
  // Used for table variables and multi-statement function return tables. The
  // column list is the same shape as CREATE TABLE's column_definitions. The
  // optional AS T-SQL allows before TABLE is not accepted: after RETURNS, a
  // user-defined scalar type followed by the body's AS reads the same way.
  table_var_declaration: ($) => seq($.identifier, $.keyword_table, $.column_definitions),

  // DECLARE name CURSOR [LOCAL | GLOBAL] [FORWARD_ONLY | SCROLL] [STATIC | ...] FOR select
  // The cursor options are identifiers: there are a dozen and nothing
  // downstream distinguishes them. FOR UPDATE / FOR READ ONLY after the
  // query is absorbed by the select's for_clause.
  declare_cursor_statement: ($) =>
    seq(
      $.keyword_declare,
      field('name', $.identifier),
      $.keyword_cursor,
      repeat($.identifier),
      $.keyword_for,
      $._dml_read,
    ),
  open_cursor_statement: ($) => seq($.keyword_open, optional($.keyword_global), $.identifier),
  // FETCH [ NEXT | PRIOR | FIRST | LAST | ABSOLUTE n | RELATIVE n ] [FROM] [GLOBAL] cursor [INTO @var, ...]
  fetch_cursor_statement: ($) =>
    seq(
      $.keyword_fetch,
      optional(
        choice(
          $.keyword_next,
          $.keyword_prior,
          $.keyword_first,
          $.keyword_last,
          seq($.keyword_absolute, $._expression),
          seq($.keyword_relative, $._expression),
        ),
      ),
      optional($.keyword_from),
      optional($.keyword_global),
      $.identifier,
      optional(seq($.keyword_into, comma_list($.identifier, true))),
    ),
  close_cursor_statement: ($) => seq($.keyword_close, optional($.keyword_global), $.identifier),
  deallocate_cursor_statement: ($) =>
    seq($.keyword_deallocate, optional($.keyword_global), $.identifier),

  // DBCC <command> [ ( args ) ] [ WITH options ], e.g. DBCC CHECKTABLE ('t', @indid).
  // The command and any WITH options are left as bare identifiers/keywords —
  // T-SQL has dozens of DBCC commands, each with its own argument shape, and
  // nothing downstream needs them distinguished from one another.
  // The WITH options are the same option list every other statement takes,
  // which also covers the parenthesized sub-option form:
  //   DBCC SHRINKDATABASE (db, 20) WITH WAIT_AT_LOW_PRIORITY (ABORT_AFTER_WAIT = SELF)
  dbcc_statement: ($) =>
    seq(
      $.keyword_dbcc,
      $.identifier,
      optional(paren_list($._expression, false)),
      optional($.with_clause),
    ),

  // KILL { session_id | 'UOW' } [WITH STATUSONLY]. The argument is a
  // constant: SQL Server does not accept a variable there.
  kill_statement: ($) =>
    prec.right(seq($.keyword_kill, $.literal, optional(seq($.keyword_with, $.identifier)))),

  // BULK INSERT target FROM 'data_file' [WITH (options)]
  // Option names (BATCHSIZE, CODEPAGE, FIELDTERMINATOR, FIRE_TRIGGERS,
  // ORDER (col [ASC|DESC]), ...) are identifiers, the same as every other
  // WITH (...) option list in this grammar.
  //
  // Unlike most keywords added for a new statement, `bulk` cannot be
  // restricted to a position that avoids the AS-less alias slot (the fix
  // applied to the join hints HASH/LOOP/REMOTE — see keywords.js): BULK
  // INSERT has to remain valid wherever a new statement can start, and with
  // the top-level `;` optional that is the same position an AS-less alias
  // can occupy. `FROM t bulk` therefore reads as the start of a new BULK
  // INSERT statement rather than `t` aliased `bulk`, unlike any other bare
  // word. `FROM t AS bulk` is unaffected and is the workaround. A label
  // named `bulk` (`bulk: SELECT 1`) errors for the same reason.
  bulk_insert_statement: ($) =>
    prec.right(
      seq(
        $.keyword_bulk,
        $.keyword_insert,
        $.object_reference,
        $.keyword_from,
        $.literal,
        optional($.with_options),
      ),
    ),

  // BACKUP { DATABASE | LOG } name TO device [, ...] [WITH option [, ...]]
  // A device is `DISK = 'path'`, `TAPE = 'path'`, `URL = 'path'` or a
  // logical backup device name — the same `name [= value]` shape as an
  // option, so that is what it is. The file/filegroup list and MIRROR TO
  // are not modeled.
  backup_statement: ($) =>
    prec.right(
      seq(
        $.keyword_backup,
        choice($.keyword_database, $.keyword_log),
        $.identifier,
        $.keyword_to,
        comma_list($.option, true),
        optional($.with_clause),
      ),
    ),

  // SETUSER ['user' [WITH NORESET]] — deprecated impersonation; a bare
  // SETUSER reverts to the original user.
  setuser_statement: ($) =>
    prec.right(
      seq($.keyword_setuser, optional(seq($.literal, optional(seq($.keyword_with, $.identifier))))),
    ),

  // The deprecated text-pointer statements, in scope because they still
  // execute and a linter has to see them to flag them:
  //   READTEXT table.column text_ptr offset size [HOLDLOCK]
  //   WRITETEXT table.column text_ptr [WITH LOG] data      (BULK is not modeled)
  //   UPDATETEXT table.column dest_ptr offset delete_length [WITH LOG]
  //       [ data | table.column src_ptr ]
  // The arguments are juxtaposed with no separator, so each is a constant
  // or a variable rather than an expression — the same restriction SQL
  // Server applies, and what keeps `@a NOT ...` from reading as one
  // expression spanning two arguments. UPDATETEXT's optional source is
  // either inserted data or a `table.column src_ptr` pair, which read as
  // a qualified field followed by one more argument.
  readtext_statement: ($) =>
    prec.right(
      seq(
        $.keyword_readtext,
        $.object_reference,
        $._text_argument,
        $._text_argument,
        $._text_argument,
        optional($.keyword_holdlock),
      ),
    ),

  writetext_statement: ($) =>
    seq(
      $.keyword_writetext,
      $.object_reference,
      $._text_argument,
      optional(seq($.keyword_with, $.keyword_log)),
      $._text_argument,
    ),

  updatetext_statement: ($) =>
    prec.right(
      seq(
        $.keyword_updatetext,
        $.object_reference,
        $._text_argument,
        $._text_argument,
        $._text_argument,
        optional(seq($.keyword_with, $.keyword_log)),
        repeat($._text_argument),
      ),
    ),

  _text_argument: ($) => choice(alias($._qualified_field, $.field), $.literal),

  // EXEC[UTE] [@status =] procedure [argument [, ...]] [WITH RECOMPILE]
  // EXEC[UTE] ( string [, ...] ) [AT linked_server | AS { USER | LOGIN } = 'name']
  //
  //   EXEC sp_configure 'recovery interval', 75
  //   exec @Severity = @ProcedureName @a, @b OUTPUT
  //   EXEC (@sql)
  //
  // A procedure argument is a constant, a variable or DEFAULT — SQL Server
  // rejects an expression there (`EXEC p 1 + 2` is a syntax error) — and
  // once one argument is passed as `@name = value` every later one must be
  // too (Msg 119), so the list is positional arguments followed by named
  // ones and `EXEC p @a = 1, 2` is an error here as it is on the server.
  // Restricting the value is also what keeps `@a = 1` from reading as a
  // positional comparison expression.
  execute_statement: ($) =>
    prec.right(
      seq(
        choice($.keyword_exec, $.keyword_execute),
        choice(
          seq(
            optional(seq(field('return_status', $.identifier), '=')),
            field('procedure', $.object_reference),
            optional($._exec_arguments),
            optional(seq($.keyword_with, $.keyword_recompile)),
          ),
          seq(
            wrapped_in_parenthesis(comma_list($._expression, true)),
            optional(
              choice(
                seq($.keyword_at, $.identifier),
                seq($.keyword_as, choice($.keyword_user, $.keyword_login), '=', $._expression),
              ),
            ),
          ),
        ),
      ),
    ),

  _exec_arguments: ($) =>
    choice(
      seq(
        comma_list(alias($._exec_positional_argument, $.exec_argument), true),
        optional(seq(',', comma_list(alias($._exec_named_argument, $.exec_argument), true))),
      ),
      comma_list(alias($._exec_named_argument, $.exec_argument), true),
    ),

  _exec_positional_argument: ($) =>
    seq(field('value', $._exec_argument_value), optional(choice($.keyword_out, $.keyword_output))),

  _exec_named_argument: ($) =>
    seq(
      field('name', $.identifier),
      '=',
      field('value', $._exec_argument_value),
      optional(choice($.keyword_out, $.keyword_output)),
    ),

  _exec_argument_value: ($) =>
    choice($.field, $.literal, alias($._signed_literal, $.unary_expression), $.keyword_default),

  _signed_literal: ($) => seq(field('operator', choice('-', '+')), field('operand', $.literal)),

  // EXECUTE AS { LOGIN | USER } = 'name' [WITH NO REVERT | WITH COOKIE INTO @c]
  // EXECUTE AS { CALLER | SELF | OWNER }
  // The context-switch statement, distinct from the module-level
  // WITH EXECUTE AS option (execute_as_clause).
  // prec.right: a following WITH belongs to this statement, not to a CTE
  // starting the next one.
  execute_as_statement: ($) =>
    prec.right(
      seq(
        choice($.keyword_exec, $.keyword_execute),
        $.keyword_as,
        choice(
          seq(choice($.keyword_login, $.keyword_user), '=', $._expression),
          $.keyword_caller,
          $.keyword_self,
          $.keyword_owner,
        ),
        optional(
          seq(
            $.keyword_with,
            repeat1(choice($.identifier, $.keyword_no, $.keyword_revert, $.keyword_into)),
          ),
        ),
      ),
    ),

  revert_statement: ($) =>
    prec.right(
      seq($.keyword_revert, optional(seq($.keyword_with, $.identifier, '=', $._expression))),
    ),

  // RECONFIGURE [WITH OVERRIDE]
  reconfigure_statement: ($) =>
    seq($.keyword_reconfigure, optional(seq($.keyword_with, $.keyword_override))),

  // { ENABLE | DISABLE } TRIGGER { ALL | name [, ...] } ON { table | DATABASE | ALL SERVER }
  enable_trigger_statement: ($) =>
    seq(
      choice($.keyword_enable, $.keyword_disable),
      $.keyword_trigger,
      choice($.keyword_all, comma_list($.object_reference, true)),
      $.keyword_on,
      choice(seq($.keyword_all, $.keyword_server), $.keyword_database, $.object_reference),
    ),

  // { GRANT | REVOKE | DENY } permission [(columns)] [, ...] [ON [class::] securable [(columns)]]
  //   { TO | FROM } principal [, ...] [WITH GRANT OPTION] [CASCADE] [AS principal]
  // A permission is one or more words (SELECT, ALTER ANY DATABASE, VIEW
  // DEFINITION); most of them are keywords elsewhere in the grammar, the rest
  // are identifiers. A per-permission column list is the form Microsoft's own
  // GRANT/DENY/REVOKE syntax diagram documents (`permission [(column, ...)]`);
  // the column list after the securable, below, is the form column-level
  // scripts more commonly emit in practice — both are accepted since neither
  // rules the other out grammatically.
  grant_statement: ($) =>
    prec.right(
      seq(
        choice($.keyword_grant, $.keyword_revoke, $.keyword_deny),
        optional(seq($.keyword_grant, $.keyword_option, $.keyword_for)),
        comma_list($.permission, true),
        optional(
          seq(
            $.keyword_on,
            optional(seq($.identifier, '::')),
            $.object_reference,
            optional(paren_list($.identifier, true)),
          ),
        ),
        choice($.keyword_to, $.keyword_from),
        comma_list($.identifier, true),
        optional(seq($.keyword_with, $.keyword_grant, $.keyword_option)),
        optional($.keyword_cascade),
        optional(seq($.keyword_as, $.identifier)),
      ),
    ),

  // The column list is aliased to a named `list` node (the same pattern
  // `_column_list`/`aliased_with_columns` uses — alias a rule reference,
  // not an inline paren_list() call directly, or tree-sitter aliases each
  // token inside it individually instead of the group as a whole) rather
  // than left as bare identifiers — `_permission_name` is a hidden repeat
  // of identifier/keyword alternatives, so an un-aliased column list would
  // flatten into indistinguishable siblings of a multi-word permission name.
  permission: ($) =>
    prec.right(seq($._permission_name, optional(alias($._permission_columns, $.list)))),

  _permission_columns: ($) => paren_list($.identifier, true),

  _permission_name: ($) =>
    prec.right(
      repeat1(
        choice(
          $.identifier,
          $.keyword_select,
          $.keyword_insert,
          $.keyword_update,
          $.keyword_delete,
          $.keyword_execute,
          $.keyword_exec,
          $.keyword_alter,
          $.keyword_create,
          $.keyword_references,
          $.keyword_all,
          $.keyword_any,
          $.keyword_view,
          $.keyword_database,
          $.keyword_schema,
          $.keyword_table,
          $.keyword_function,
          $.keyword_procedure,
          $.keyword_type,
          $.keyword_role,
          $.keyword_user,
          $.keyword_login,
          $.keyword_server,
          $.keyword_index,
          $.keyword_trigger,
          $.keyword_authorization,
          $.keyword_default,
          $.keyword_check,
          $.keyword_open,
          $.keyword_assembly,
          $.keyword_sequence,
          $.keyword_synonym,
          $.keyword_fulltext,
          $.keyword_catalog,
          $.keyword_route,
          $.keyword_audit,
        ),
      ),
    ),

  // UPDATE STATISTICS table [index | (statistics, ...)] [WITH options]
  update_statistics_statement: ($) =>
    prec.right(
      seq(
        $.keyword_update,
        $.keyword_statistics,
        $.object_reference,
        optional(choice($.identifier, paren_list($.identifier, true))),
        optional($.with_clause),
      ),
    ),

  // T-SQL table hint, e.g. WITH (NOLOCK), WITH (READUNCOMMITTED, INDEX(ix1)).
  // Hint names are identifiers here: the WITH keyword already marks the
  // parenthesized list as a hint list. The deprecated bare spelling,
  // `FROM t (NOLOCK)`, is `_bare_table_hint` below and lives inside
  // `relation`.
  table_hint: ($) =>
    seq($.keyword_with, wrapped_in_parenthesis(comma_list($.table_hint_item, true))),

  table_hint_item: ($) => choice($._index_hint, $.identifier),

  _index_hint: ($) =>
    seq(
      $.keyword_index,
      choice(wrapped_in_parenthesis(comma_list($.identifier, true)), seq('=', $.identifier)),
    ),

  // The deprecated bare-parenthesis table hint, `FROM t (NOLOCK)` or
  // `JOIN t x (NOLOCK, INDEX(ix1))`, which pre-WITH vendor code still uses.
  // After a table name a `(` also opens a table-valued function's argument
  // list, and after an alias it also opens a column list, so what
  // distinguishes the hint is its contents: every item is one of SQL
  // Server's hint names, which are keywords in this position only. A
  // function called with a column argument, `f(col)`, still lexes `col` as
  // an identifier and stays an invocation. The names are aliased to
  // `identifier` so the bare and WITH spellings produce the same tree.
  _bare_table_hint: ($) =>
    wrapped_in_parenthesis(comma_list(alias($._bare_table_hint_item, $.table_hint_item), true)),

  _bare_table_hint_item: ($) =>
    choice(
      $._index_hint,
      alias($.keyword_forcescan, $.identifier),
      alias($.keyword_forceseek, $.identifier),
      alias($.keyword_holdlock, $.identifier),
      alias($.keyword_ignore_constraints, $.identifier),
      alias($.keyword_ignore_triggers, $.identifier),
      alias($.keyword_keepdefaults, $.identifier),
      alias($.keyword_keepidentity, $.identifier),
      alias($.keyword_noexpand, $.identifier),
      alias($.keyword_nolock, $.identifier),
      alias($.keyword_nowait, $.identifier),
      alias($.keyword_paglock, $.identifier),
      alias($.keyword_readcommitted, $.identifier),
      alias($.keyword_readcommittedlock, $.identifier),
      alias($.keyword_readpast, $.identifier),
      alias($.keyword_readuncommitted, $.identifier),
      alias($.keyword_repeatableread, $.identifier),
      alias($.keyword_rowlock, $.identifier),
      alias($.keyword_serializable, $.identifier),
      alias($.keyword_snapshot, $.identifier),
      alias($.keyword_tablock, $.identifier),
      alias($.keyword_tablockx, $.identifier),
      alias($.keyword_updlock, $.identifier),
      alias($.keyword_xlock, $.identifier),
    ),

  _ddl_statement: ($) =>
    choice(
      $._create_statement,
      $._alter_statement,
      $._drop_statement,
      $.truncate_statement,
      $.set_statement,
      $.dbcc_statement,
      $.execute_statement,
      $.reconfigure_statement,
    ),

  ...create_rules,
  ...module_shared_rules,
  ...alter_rules,
  ...drop_rules,
  ...truncate_rules,

  _dml_write: ($) =>
    seq(
      optional($._cte),
      choice($._delete_statement, $._insert_statement, $._update_statement, $._merge_statement),
    ),

  ...delete_rules,
  ...insert_rules,
  ...update_rules,
  ...merge_rules,
  ...dml_shared_rules,

  _dml_read: ($) =>
    seq(
      optional(optional_parenthesis($._cte)),
      optional_parenthesis(choice($._select_statement, $.set_operation)),
    ),

  ...select_rules,
  ...set_rules,
  ...service_broker_rules,
  ...security_rules,
};
