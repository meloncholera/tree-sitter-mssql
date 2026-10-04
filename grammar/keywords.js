import { make_keyword } from './helpers.js';

// Every keyword the grammar references, and nothing else. A keyword only
// wins over an identifier in a parse state where that keyword is valid
// (`word: $._identifier` in grammar.js turns on keyword extraction), which
// is what lets T-SQL's large non-reserved vocabulary — NAME, TYPE, VALUE,
// STATUS, SOURCE, TARGET, ... — still be used as column names. Option
// names (SET options, index options, DBCC commands, query and table hints)
// are deliberately not keywords; they are identifiers.
export default {
  // DML
  keyword_select: (_) => make_keyword('select'),
  keyword_delete: (_) => make_keyword('delete'),
  keyword_insert: (_) => make_keyword('insert'),
  keyword_update: (_) => make_keyword('update'),
  keyword_truncate: (_) => make_keyword('truncate'),
  keyword_merge: (_) => make_keyword('merge'),
  // ALTER PARTITION FUNCTION name() SPLIT RANGE (...) | MERGE RANGE (...).
  // Probed clean in both the AS-less-alias and bare-column identifier
  // positions.
  keyword_split: (_) => make_keyword('split'),
  keyword_into: (_) => make_keyword('into'),
  keyword_values: (_) => make_keyword('values'),
  keyword_value: (_) => make_keyword('value'),
  keyword_matched: (_) => make_keyword('matched'),
  keyword_target: (_) => make_keyword('target'),
  keyword_source: (_) => make_keyword('source'),
  keyword_output: (_) => make_keyword('output'),
  keyword_set: (_) => make_keyword('set'),
  keyword_from: (_) => make_keyword('from'),
  keyword_where: (_) => make_keyword('where'),
  keyword_group: (_) => make_keyword('group'),
  keyword_by: (_) => make_keyword('by'),
  keyword_having: (_) => make_keyword('having'),
  keyword_order: (_) => make_keyword('order'),
  keyword_asc: (_) => make_keyword('asc'),
  keyword_desc: (_) => make_keyword('desc'),
  keyword_distinct: (_) => make_keyword('distinct'),
  keyword_all: (_) => make_keyword('all'),
  keyword_any: (_) => make_keyword('any'),
  keyword_some: (_) => make_keyword('some'),
  keyword_top: (_) => make_keyword('top'),
  keyword_percent: (_) => make_keyword('percent'),
  keyword_ties: (_) => make_keyword('ties'),
  keyword_with: (_) => make_keyword('with'),
  keyword_as: (_) => make_keyword('as'),
  keyword_union: (_) => make_keyword('union'),
  keyword_except: (_) => make_keyword('except'),
  keyword_intersect: (_) => make_keyword('intersect'),
  keyword_offset: (_) => make_keyword('offset'),
  keyword_rows: (_) => make_keyword('rows'),
  keyword_row: (_) => make_keyword('row'),
  keyword_only: (_) => make_keyword('only'),
  keyword_option: (_) => make_keyword('option'),
  keyword_optimize: (_) => make_keyword('optimize'),
  keyword_unknown: (_) => make_keyword('unknown'),
  keyword_recompile: (_) => make_keyword('recompile'),
  keyword_pivot: (_) => make_keyword('pivot'),
  keyword_unpivot: (_) => make_keyword('unpivot'),
  keyword_grouping: (_) => make_keyword('grouping'),
  keyword_sets: (_) => make_keyword('sets'),
  keyword_within: (_) => make_keyword('within'),

  // Joins
  keyword_join: (_) => make_keyword('join'),
  keyword_inner: (_) => make_keyword('inner'),
  keyword_left: (_) => make_keyword('left'),
  keyword_right: (_) => make_keyword('right'),
  keyword_full: (_) => make_keyword('full'),
  keyword_outer: (_) => make_keyword('outer'),
  keyword_cross: (_) => make_keyword('cross'),
  keyword_apply: (_) => make_keyword('apply'),
  keyword_on: (_) => make_keyword('on'),
  keyword_off: (_) => make_keyword('off'),
  keyword_using: (_) => make_keyword('using'),
  // Physical join hints: INNER HASH JOIN, LEFT LOOP JOIN, MERGE JOIN, REMOTE JOIN.
  keyword_hash: (_) => make_keyword('hash'),
  keyword_loop: (_) => make_keyword('loop'),
  keyword_remote: (_) => make_keyword('remote'),

  // Expressions
  keyword_case: (_) => make_keyword('case'),
  keyword_when: (_) => make_keyword('when'),
  keyword_then: (_) => make_keyword('then'),
  keyword_else: (_) => make_keyword('else'),
  keyword_end: (_) => make_keyword('end'),
  keyword_in: (_) => make_keyword('in'),
  keyword_and: (_) => make_keyword('and'),
  keyword_or: (_) => make_keyword('or'),
  keyword_is: (_) => make_keyword('is'),
  keyword_not: (_) => make_keyword('not'),
  keyword_like: (_) => make_keyword('like'),
  keyword_between: (_) => make_keyword('between'),
  keyword_exists: (_) => make_keyword('exists'),
  keyword_cast: (_) => make_keyword('cast'),
  keyword_try_cast: (_) => make_keyword('try_cast'),
  keyword_collate: (_) => make_keyword('collate'),
  keyword_null: (_) => make_keyword('null'),
  keyword_default: (_) => make_keyword('default'),
  keyword_fn: (_) => make_keyword('fn'),
  // Functions whose argument list carries a keyword clause, so they are
  // their own nodes rather than invocations: TRIM (2022), JSON_OBJECT and
  // JSON_ARRAY (2022), AI_GENERATE_EMBEDDINGS (2025), and the RETURNING
  // clause JSON_VALUE takes (2025).
  keyword_trim: (_) => make_keyword('trim'),
  keyword_leading: (_) => make_keyword('leading'),
  keyword_trailing: (_) => make_keyword('trailing'),
  keyword_both: (_) => make_keyword('both'),
  keyword_json_object: (_) => make_keyword('json_object'),
  keyword_json_array: (_) => make_keyword('json_array'),
  keyword_returning: (_) => make_keyword('returning'),
  keyword_absent: (_) => make_keyword('absent'),
  keyword_ai_generate_embeddings: (_) => make_keyword('ai_generate_embeddings'),
  keyword_model: (_) => make_keyword('model'),
  keyword_parameters: (_) => make_keyword('parameters'),
  keyword_array: (_) => make_keyword('array'),
  keyword_wrapper: (_) => make_keyword('wrapper'),
  keyword_next: (_) => make_keyword('next'),
  // ALTER PARTITION SCHEME name NEXT USED [filegroup].
  // Probed clean in both the AS-less-alias and bare-column identifier
  // positions.
  keyword_used: (_) => make_keyword('used'),
  keyword_for: (_) => make_keyword('for'),

  // Window functions
  keyword_over: (_) => make_keyword('over'),
  keyword_partition: (_) => make_keyword('partition'),
  keyword_window: (_) => make_keyword('window'),
  keyword_range: (_) => make_keyword('range'),
  keyword_unbounded: (_) => make_keyword('unbounded'),
  keyword_preceding: (_) => make_keyword('preceding'),
  keyword_following: (_) => make_keyword('following'),
  keyword_current: (_) => make_keyword('current'),

  // FOR XML / FOR JSON / cursor FOR UPDATE
  keyword_xml: (_) => make_keyword('xml'),
  keyword_xmlnamespaces: (_) => make_keyword('xmlnamespaces'),
  keyword_json: (_) => make_keyword('json'),
  keyword_of: (_) => make_keyword('of'),
  keyword_read: (_) => make_keyword('read'),

  // Control flow and batches
  keyword_go: (_) => make_keyword('go'),
  keyword_use: (_) => make_keyword('use'),
  keyword_if: (_) => make_keyword('if'),
  keyword_while: (_) => make_keyword('while'),
  keyword_begin: (_) => make_keyword('begin'),
  keyword_try: (_) => make_keyword('try'),
  keyword_catch: (_) => make_keyword('catch'),
  keyword_break: (_) => make_keyword('break'),
  keyword_continue: (_) => make_keyword('continue'),
  // ALTER DATABASE SCOPED CONFIGURATION { [FOR SECONDARY] SET option
  // | CLEAR PROCEDURE_CACHE [plan_handle] }.
  keyword_scoped: (_) => make_keyword('scoped'),
  keyword_configuration: (_) => make_keyword('configuration'),
  keyword_secondary: (_) => make_keyword('secondary'),
  // Probed clean as an AS-less alias, a bare column, and a cursor name
  // after OPEN and CLOSE. PROCEDURE_CACHE is one word.
  keyword_clear: (_) => make_keyword('clear'),
  keyword_procedure_cache: (_) => make_keyword('procedure_cache'),
  keyword_goto: (_) => make_keyword('goto'),
  keyword_return: (_) => make_keyword('return'),
  keyword_throw: (_) => make_keyword('throw'),
  keyword_raiserror: (_) => make_keyword('raiserror'),
  keyword_print: (_) => make_keyword('print'),
  keyword_waitfor: (_) => make_keyword('waitfor'),
  keyword_delay: (_) => make_keyword('delay'),
  keyword_declare: (_) => make_keyword('declare'),
  keyword_exec: (_) => make_keyword('exec'),
  keyword_execute: (_) => make_keyword('execute'),
  keyword_at: (_) => make_keyword('at'),
  keyword_caller: (_) => make_keyword('caller'),
  keyword_self: (_) => make_keyword('self'),
  keyword_owner: (_) => make_keyword('owner'),
  keyword_revert: (_) => make_keyword('revert'),
  keyword_dbcc: (_) => make_keyword('dbcc'),
  keyword_reconfigure: (_) => make_keyword('reconfigure'),
  keyword_override: (_) => make_keyword('override'),
  keyword_kill: (_) => make_keyword('kill'),
  keyword_backup: (_) => make_keyword('backup'),
  keyword_log: (_) => make_keyword('log'),

  // Deprecated statements that still execute: SETUSER and the text-pointer
  // family (READTEXT/WRITETEXT/UPDATETEXT).
  keyword_setuser: (_) => make_keyword('setuser'),
  keyword_readtext: (_) => make_keyword('readtext'),
  keyword_writetext: (_) => make_keyword('writetext'),
  keyword_updatetext: (_) => make_keyword('updatetext'),

  // Cursors
  keyword_cursor: (_) => make_keyword('cursor'),
  keyword_open: (_) => make_keyword('open'),
  keyword_fetch: (_) => make_keyword('fetch'),
  keyword_prior: (_) => make_keyword('prior'),
  keyword_first: (_) => make_keyword('first'),
  keyword_last: (_) => make_keyword('last'),
  keyword_absolute: (_) => make_keyword('absolute'),
  keyword_relative: (_) => make_keyword('relative'),
  keyword_global: (_) => make_keyword('global'),
  keyword_close: (_) => make_keyword('close'),
  keyword_deallocate: (_) => make_keyword('deallocate'),

  // Transactions
  keyword_transaction: (_) => make_keyword('transaction'),
  keyword_tran: (_) => make_keyword('tran'),
  keyword_commit: (_) => make_keyword('commit'),
  keyword_rollback: (_) => make_keyword('rollback'),
  keyword_save: (_) => make_keyword('save'),
  keyword_work: (_) => make_keyword('work'),
  keyword_distributed: (_) => make_keyword('distributed'),
  keyword_mark: (_) => make_keyword('mark'),
  keyword_isolation: (_) => make_keyword('isolation'),
  keyword_level: (_) => make_keyword('level'),
  keyword_committed: (_) => make_keyword('committed'),
  keyword_uncommitted: (_) => make_keyword('uncommitted'),
  keyword_repeatable: (_) => make_keyword('repeatable'),
  keyword_serializable: (_) => make_keyword('serializable'),
  keyword_snapshot: (_) => make_keyword('snapshot'),

  // Table hint names. These are keywords only for the deprecated bare
  // spelling `FROM t (NOLOCK)`, where the keyword is what separates a hint
  // from a table-valued function call `f(col)`; in `WITH (NOLOCK)` they stay
  // identifiers, and the bare form aliases them to `identifier` so both
  // spellings produce the same tree.
  keyword_forcescan: (_) => make_keyword('forcescan'),
  keyword_forceseek: (_) => make_keyword('forceseek'),
  keyword_holdlock: (_) => make_keyword('holdlock'),
  keyword_ignore_constraints: (_) => make_keyword('ignore_constraints'),
  keyword_ignore_triggers: (_) => make_keyword('ignore_triggers'),
  keyword_keepdefaults: (_) => make_keyword('keepdefaults'),
  keyword_keepidentity: (_) => make_keyword('keepidentity'),
  keyword_noexpand: (_) => make_keyword('noexpand'),
  keyword_nolock: (_) => make_keyword('nolock'),
  keyword_nowait: (_) => make_keyword('nowait'),
  keyword_paglock: (_) => make_keyword('paglock'),
  keyword_readcommitted: (_) => make_keyword('readcommitted'),
  keyword_readcommittedlock: (_) => make_keyword('readcommittedlock'),
  keyword_readpast: (_) => make_keyword('readpast'),
  keyword_readuncommitted: (_) => make_keyword('readuncommitted'),
  keyword_repeatableread: (_) => make_keyword('repeatableread'),
  keyword_rowlock: (_) => make_keyword('rowlock'),
  keyword_tablock: (_) => make_keyword('tablock'),
  keyword_tablockx: (_) => make_keyword('tablockx'),
  keyword_updlock: (_) => make_keyword('updlock'),
  keyword_xlock: (_) => make_keyword('xlock'),

  // DDL
  keyword_create: (_) => make_keyword('create'),
  keyword_alter: (_) => make_keyword('alter'),
  keyword_drop: (_) => make_keyword('drop'),
  keyword_add: (_) => make_keyword('add'),
  keyword_table: (_) => make_keyword('table'),
  keyword_view: (_) => make_keyword('view'),
  keyword_index: (_) => make_keyword('index'),
  keyword_column: (_) => make_keyword('column'),
  keyword_procedure: (_) => make_keyword('procedure'),
  keyword_proc: (_) => make_keyword('proc'),
  keyword_function: (_) => make_keyword('function'),
  keyword_returns: (_) => make_keyword('returns'),
  keyword_trigger: (_) => make_keyword('trigger'),
  keyword_instead: (_) => make_keyword('instead'),
  keyword_after: (_) => make_keyword('after'),
  // ALTER DATABASE ... WITH ROLLBACK AFTER <n> SECONDS.
  keyword_seconds: (_) => make_keyword('seconds'),
  keyword_append: (_) => make_keyword('append'),
  keyword_replication: (_) => make_keyword('replication'),
  keyword_encryption: (_) => make_keyword('encryption'),
  keyword_masked: (_) => make_keyword('masked'),
  keyword_encrypted: (_) => make_keyword('encrypted'),
  keyword_schemabinding: (_) => make_keyword('schemabinding'),
  keyword_called: (_) => make_keyword('called'),
  keyword_input: (_) => make_keyword('input'),
  keyword_out: (_) => make_keyword('out'),
  keyword_readonly: (_) => make_keyword('readonly'),
  keyword_type: (_) => make_keyword('type'),
  keyword_schema: (_) => make_keyword('schema'),
  keyword_database: (_) => make_keyword('database'),
  keyword_role: (_) => make_keyword('role'),
  keyword_user: (_) => make_keyword('user'),
  keyword_login: (_) => make_keyword('login'),
  keyword_server: (_) => make_keyword('server'),
  keyword_synonym: (_) => make_keyword('synonym'),
  keyword_sequence: (_) => make_keyword('sequence'),
  keyword_increment: (_) => make_keyword('increment'),
  keyword_minvalue: (_) => make_keyword('minvalue'),
  keyword_maxvalue: (_) => make_keyword('maxvalue'),
  keyword_start: (_) => make_keyword('start'),
  // ALTER FULLTEXT INDEX ON table STOP POPULATION.
  keyword_stop: (_) => make_keyword('stop'),
  keyword_restart: (_) => make_keyword('restart'),
  keyword_cycle: (_) => make_keyword('cycle'),
  keyword_cache: (_) => make_keyword('cache'),
  keyword_fulltext: (_) => make_keyword('fulltext'),
  keyword_catalog: (_) => make_keyword('catalog'),
  keyword_route: (_) => make_keyword('route'),
  keyword_audit: (_) => make_keyword('audit'),
  keyword_assembly: (_) => make_keyword('assembly'),
  keyword_queue: (_) => make_keyword('queue'),
  keyword_contract: (_) => make_keyword('contract'),
  keyword_message: (_) => make_keyword('message'),
  keyword_scheme: (_) => make_keyword('scheme'),
  keyword_sent: (_) => make_keyword('sent'),
  keyword_initiator: (_) => make_keyword('initiator'),
  keyword_statistics: (_) => make_keyword('statistics'),
  // CREATE/ALTER/DROP EVENT SESSION (Extended Events)
  keyword_event: (_) => make_keyword('event'),
  keyword_session: (_) => make_keyword('session'),
  // BULK INSERT
  keyword_bulk: (_) => make_keyword('bulk'),
  // Service Broker DML (BEGIN DIALOG, SEND, RECEIVE, END CONVERSATION, GET
  // CONVERSATION GROUP, MOVE CONVERSATION, WAITFOR (...), TIMEOUT n). SEND,
  // RECEIVE, GET and MOVE start a statement and so take the AS-less alias
  // slot the way `bulk` does — see service-broker.js.
  keyword_dialog: (_) => make_keyword('dialog'),
  keyword_conversation: (_) => make_keyword('conversation'),
  keyword_service: (_) => make_keyword('service'),
  keyword_send: (_) => make_keyword('send'),
  keyword_receive: (_) => make_keyword('receive'),
  keyword_get: (_) => make_keyword('get'),
  keyword_move: (_) => make_keyword('move'),
  keyword_timeout: (_) => make_keyword('timeout'),
  // Encryption keys and certificates (security.js). MASTER, SYMMETRIC and
  // KEYS are valid right after OPEN / CLOSE, the cursor-name slot — see
  // open_key_statement in security.js for the collision and workaround.
  keyword_master: (_) => make_keyword('master'),
  keyword_symmetric: (_) => make_keyword('symmetric'),
  keyword_asymmetric: (_) => make_keyword('asymmetric'),
  // CREATE LOGIN ... FROM WINDOWS.
  keyword_windows: (_) => make_keyword('windows'),
  keyword_keys: (_) => make_keyword('keys'),
  keyword_certificate: (_) => make_keyword('certificate'),
  keyword_decryption: (_) => make_keyword('decryption'),
  keyword_private: (_) => make_keyword('private'),
  keyword_provider: (_) => make_keyword('provider'),
  keyword_remove: (_) => make_keyword('remove'),
  keyword_regenerate: (_) => make_keyword('regenerate'),
  keyword_force: (_) => make_keyword('force'),
  keyword_active: (_) => make_keyword('active'),
  // CREATE/ALTER/DROP SECURITY POLICY (row-level security)
  keyword_security: (_) => make_keyword('security'),
  keyword_policy: (_) => make_keyword('policy'),
  keyword_predicate: (_) => make_keyword('predicate'),
  keyword_filter: (_) => make_keyword('filter'),
  keyword_block: (_) => make_keyword('block'),
  keyword_before: (_) => make_keyword('before'),
  // CREATE/ALTER/DROP XML SCHEMA COLLECTION
  keyword_collection: (_) => make_keyword('collection'),
  // CREATE EXTERNAL { DATA SOURCE | FILE FORMAT | TABLE }
  keyword_external: (_) => make_keyword('external'),
  keyword_data: (_) => make_keyword('data'),
  keyword_file: (_) => make_keyword('file'),
  keyword_format: (_) => make_keyword('format'),
  keyword_authorization: (_) => make_keyword('authorization'),
  keyword_member: (_) => make_keyword('member'),
  keyword_transfer: (_) => make_keyword('transfer'),
  keyword_rebuild: (_) => make_keyword('rebuild'),
  keyword_reorganize: (_) => make_keyword('reorganize'),
  keyword_resume: (_) => make_keyword('resume'),
  keyword_pause: (_) => make_keyword('pause'),
  keyword_abort: (_) => make_keyword('abort'),
  keyword_enable: (_) => make_keyword('enable'),
  keyword_disable: (_) => make_keyword('disable'),
  keyword_modify: (_) => make_keyword('modify'),
  keyword_without: (_) => make_keyword('without'),
  keyword_to: (_) => make_keyword('to'),
  // TRUNCATE TABLE ... WITH (PARTITIONS (1, 3 TO 5)).
  // Probed clean in both the AS-less-alias and bare-column identifier
  // positions.
  keyword_partitions: (_) => make_keyword('partitions'),
  keyword_grant: (_) => make_keyword('grant'),
  keyword_revoke: (_) => make_keyword('revoke'),
  keyword_deny: (_) => make_keyword('deny'),

  // Constraints and indexes
  keyword_constraint: (_) => make_keyword('constraint'),
  keyword_primary: (_) => make_keyword('primary'),
  keyword_key: (_) => make_keyword('key'),
  keyword_unique: (_) => make_keyword('unique'),
  keyword_foreign: (_) => make_keyword('foreign'),
  keyword_references: (_) => make_keyword('references'),
  keyword_check: (_) => make_keyword('check'),
  keyword_nocheck: (_) => make_keyword('nocheck'),
  keyword_clustered: (_) => make_keyword('clustered'),
  keyword_nonclustered: (_) => make_keyword('nonclustered'),
  keyword_columnstore: (_) => make_keyword('columnstore'),
  keyword_include: (_) => make_keyword('include'),
  keyword_identity: (_) => make_keyword('identity'),
  keyword_persisted: (_) => make_keyword('persisted'),
  keyword_cascade: (_) => make_keyword('cascade'),
  keyword_no: (_) => make_keyword('no'),
  keyword_action: (_) => make_keyword('action'),

  // Types
  keyword_bit: (_) => make_keyword('bit'),
  keyword_tinyint: (_) => make_keyword('tinyint'),
  keyword_smallint: (_) => make_keyword('smallint'),
  keyword_int: (_) => choice(make_keyword('int'), make_keyword('integer')),
  keyword_bigint: (_) => make_keyword('bigint'),
  keyword_decimal: (_) => choice(make_keyword('decimal'), make_keyword('dec')),
  keyword_numeric: (_) => make_keyword('numeric'),
  keyword_float: (_) => make_keyword('float'),
  keyword_real: (_) => make_keyword('real'),
  keyword_double: (_) => make_keyword('double'),
  keyword_precision: (_) => make_keyword('precision'),
  keyword_money: (_) => make_keyword('money'),
  keyword_smallmoney: (_) => make_keyword('smallmoney'),
  keyword_char: (_) => choice(make_keyword('char'), make_keyword('character')),
  keyword_varchar: ($) =>
    choice(make_keyword('varchar'), seq(make_keyword('character'), $.keyword_varying)),
  keyword_varying: (_) => make_keyword('varying'),
  keyword_nchar: (_) => make_keyword('nchar'),
  keyword_nvarchar: (_) => make_keyword('nvarchar'),
  keyword_text: (_) => make_keyword('text'),
  keyword_ntext: (_) => make_keyword('ntext'),
  keyword_binary: (_) => make_keyword('binary'),
  keyword_varbinary: (_) => make_keyword('varbinary'),
  keyword_image: (_) => make_keyword('image'),
  keyword_date: (_) => make_keyword('date'),
  keyword_datetime: (_) => make_keyword('datetime'),
  keyword_datetime2: (_) => make_keyword('datetime2'),
  keyword_datetimeoffset: (_) => make_keyword('datetimeoffset'),
  keyword_smalldatetime: (_) => make_keyword('smalldatetime'),
  keyword_time: (_) => make_keyword('time'),
  keyword_timestamp: (_) => make_keyword('timestamp'),
  keyword_rowversion: (_) => make_keyword('rowversion'),
  keyword_uniqueidentifier: (_) => make_keyword('uniqueidentifier'),
  keyword_sql_variant: (_) => make_keyword('sql_variant'),
  keyword_hierarchyid: (_) => make_keyword('hierarchyid'),
  keyword_geometry: (_) => make_keyword('geometry'),
  keyword_geography: (_) => make_keyword('geography'),
  keyword_max: (_) => make_keyword('max'),

  // Temporal tables, AT TIME ZONE, TABLESAMPLE, CHANGETABLE, OPENDATASOURCE
  //
  // Both of the next two are single atomic tokens for a multi-word phrase,
  // not a `seq` of separate keyword rules, and for two different reasons:
  //
  // `keyword_for_system_time` (FOR SYSTEM_TIME) exists because a bare FOR
  // is also valid a few tokens later — the select statement's own
  // trailing FOR XML/JSON/UPDATE/READ ONLY. The LALR follow set for the
  // empty branch of `optional(for_system_time_clause)` in `relation`
  // legitimately includes bare FOR, so a plain `seq(keyword_for,
  // keyword_system_time)` there is a genuine shift/reduce ambiguity on the
  // FOR token, not the kind a `conflicts` entry or prec.right resolves —
  // it needs two tokens of lookahead tree-sitter's LALR(1) tables don't
  // carry. Making the whole phrase one terminal moves the decision to the
  // lexer's own longest-match rule instead.
  //
  // `keyword_period_for_system_time` (PERIOD FOR SYSTEM_TIME) exists for a
  // different reason: PERIOD is not otherwise a keyword anywhere, so a
  // standalone `keyword_period` would be a valid symbol at the very start
  // of every `column_definitions` list item — the same position an
  // ordinary column named `period` occupies — and keyword extraction
  // always prefers a valid keyword over an identifier for the same text,
  // with no later token able to change that (unlike the join-hint or
  // `keyword_bulk` collisions this grammar accepts elsewhere, there is no
  // `AS <word>` position here to fall back to: a column name is never
  // preceded by AS). Requiring the whole three-word phrase up front is
  // what lets a bare `period int` column keep parsing normally.
  //
  // Both tokens tolerate only plain whitespace between their words, not a
  // comment — a comment is lexed as an `extras`-level token that can sit
  // between two ordinary tokens, but not inside the middle of one atomic
  // token's own match. `FOR /* c */ SYSTEM_TIME` and
  // `PERIOD /* c */ FOR SYSTEM_TIME` are accepted trade-offs of the same
  // shape, not oversights.
  keyword_for_system_time: (_) =>
    token(seq(make_keyword('for'), /\s+/, make_keyword('system_time'))),
  keyword_period_for_system_time: (_) =>
    token(
      seq(make_keyword('period'), /\s+/, make_keyword('for'), /\s+/, make_keyword('system_time')),
    ),
  keyword_contained: (_) => make_keyword('contained'),
  keyword_zone: (_) => make_keyword('zone'),
  keyword_tablesample: (_) => make_keyword('tablesample'),
  keyword_system: (_) => make_keyword('system'),
  keyword_changetable: (_) => make_keyword('changetable'),
  keyword_changes: (_) => make_keyword('changes'),
  keyword_version: (_) => make_keyword('version'),
  keyword_opendatasource: (_) => make_keyword('opendatasource'),
  keyword_switch: (_) => make_keyword('switch'),
  keyword_match: (_) => make_keyword('match'),
  keyword_shortest_path: (_) => make_keyword('shortest_path'),

  // Operators
  is_not: ($) => prec.left(seq($.keyword_is, $.keyword_not)),
  not_like: ($) => seq($.keyword_not, $.keyword_like),
  distinct_from: ($) => seq($.keyword_is, $.keyword_distinct, $.keyword_from),
  not_distinct_from: ($) => seq($.keyword_is, $.keyword_not, $.keyword_distinct, $.keyword_from),

  _not_null: ($) => seq($.keyword_not, $.keyword_null),
  _primary_key: ($) => seq($.keyword_primary, $.keyword_key),
  _if_exists: ($) => seq($.keyword_if, $.keyword_exists),
  // T-SQL spelling of "create or replace".
  _or_alter: ($) => seq($.keyword_or, $.keyword_alter),
  _current_row: ($) => seq($.keyword_current, $.keyword_row),
  _check_option: ($) => seq($.keyword_check, $.keyword_option),
  _not_for_replication: ($) => seq($.keyword_not, $.keyword_for, $.keyword_replication),
  direction: ($) => choice($.keyword_desc, $.keyword_asc),
};
