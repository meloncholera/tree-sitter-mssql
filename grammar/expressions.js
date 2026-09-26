import {
  optional_parenthesis,
  paren_list,
  comma_list,
  wrapped_in_parenthesis,
  IDENTIFIER_START,
  IDENTIFIER_CONTINUE,
} from './helpers.js';

export default {
  _expression: ($) =>
    prec(
      1,
      choice(
        $.literal,
        alias($._qualified_field, $.field),
        $.list,
        $.case,
        $.window_function,
        $.subquery,
        $.cast,
        $.exists,
        $.graph_match_predicate,
        $.invocation,
        $.binary_expression,
        $.unary_expression,
        $.between_expression,
        $.parenthesized_expression,
        $.next_value_for,
        $.odbc_function_escape,
        $.method_call,
        $.trim,
        $.json_object,
        $.json_array,
        $.ai_generate_embeddings,
      ),
    ),

  // AT TIME ZONE, as a `binary_expression` operator — the same treatment
  // `distinct_from`/`not_distinct_from` (also multi-keyword) already get
  // in the operator map below, rather than a separate expression rule.
  at_time_zone: ($) => seq($.keyword_at, $.keyword_time, $.keyword_zone),

  // TRIM([LEADING | TRAILING | BOTH] [characters FROM] string) — the
  // 2022 form puts a FROM keyword inside the argument list, so TRIM is its
  // own node rather than an invocation. A plain TRIM(x) is this node too:
  // TRIM lexes as a keyword wherever an expression can start.
  trim: ($) =>
    seq(
      $.keyword_trim,
      wrapped_in_parenthesis(
        seq(
          optional(choice($.keyword_leading, $.keyword_trailing, $.keyword_both)),
          optional(seq(field('characters', $._expression), $.keyword_from)),
          field('parameter', $._expression),
        ),
      ),
    ),

  // JSON_OBJECT('key' : value [, ...] [NULL ON NULL | ABSENT ON NULL] [RETURNING json])
  // JSON_ARRAY(value [, ...] [NULL ON NULL | ABSENT ON NULL] [RETURNING json])
  // The 2022 JSON constructors: a `key : value` pair list and two trailing
  // keyword clauses that no ordinary function call has.
  json_object: ($) =>
    seq(
      $.keyword_json_object,
      wrapped_in_parenthesis(
        seq(
          comma_list($.json_key_value),
          optional($.json_null_clause),
          optional($.returning_clause),
        ),
      ),
    ),

  json_key_value: ($) => seq(field('key', $._expression), ':', field('value', $._expression)),

  json_array: ($) =>
    seq(
      $.keyword_json_array,
      wrapped_in_parenthesis(
        seq(comma_list($._expression), optional($.json_null_clause), optional($.returning_clause)),
      ),
    ),

  json_null_clause: ($) =>
    seq(choice($.keyword_null, $.keyword_absent), $.keyword_on, $.keyword_null),

  // RETURNING type — the result type of JSON_OBJECT/JSON_ARRAY (2022) and
  // of JSON_VALUE (2025), where it is the last thing in the argument list.
  returning_clause: ($) => seq($.keyword_returning, $._type),

  // WITH ARRAY WRAPPER — JSON_QUERY's (2025) request to wrap a scalar or
  // object result in an array, the last thing in its argument list.
  json_wrapper_clause: ($) => seq($.keyword_with, $.keyword_array, $.keyword_wrapper),

  // AI_GENERATE_EMBEDDINGS(expression USE MODEL model [PARAMETERS json]) (2025)
  ai_generate_embeddings: ($) =>
    seq(
      $.keyword_ai_generate_embeddings,
      wrapped_in_parenthesis(
        seq(
          field('parameter', $._expression),
          $.keyword_use,
          $.keyword_model,
          field('model', $.object_reference),
          optional(seq($.keyword_parameters, field('parameters', $._expression))),
        ),
      ),
    ),

  // A method call on a parenthesized expression or subquery, which is how
  // the XML and CLR methods are applied to a query result:
  //   (SELECT ... FOR XML PATH(''), TYPE).value('.', 'nvarchar(max)')
  // A method on a variable or column (`@x.value(...)`) is an ordinary
  // invocation whose object reference happens to be two-part.
  method_call: ($) =>
    prec(
      1,
      seq(
        choice($.subquery, $.parenthesized_expression),
        '.',
        field('method', $.identifier),
        paren_list(field('parameter', $.term)),
      ),
    ),

  // ODBC scalar-function escape sequence, e.g. {fn OCTET_LENGTH(@x)}.
  // A compatibility form for drivers that don't speak T-SQL's own function
  // syntax directly; SQL Server unwraps it and evaluates the call inside.
  odbc_function_escape: ($) => seq('{', $.keyword_fn, $.invocation, '}'),

  // NEXT VALUE FOR sequence
  next_value_for: ($) => seq($.keyword_next, $.keyword_value, $.keyword_for, $.object_reference),

  // Up to four parts: server.database.schema.name. A linked-server
  // reference is the only place the fourth part appears. Any middle part
  // may be omitted to mean "the default", leaving two consecutive dots
  // (`mydb..mytable`, `srv.db..t`) — the omitted field is left absent
  // rather than filled with a sentinel, so consumers can tell "defaulted"
  // from "named" by field presence.
  object_reference: ($) =>
    choice(
      seq(
        field('server', $.identifier),
        '.',
        field('database', $.identifier),
        '.',
        field('schema', $.identifier),
        '.',
        field('name', $.identifier),
      ),
      seq(
        field('server', $.identifier),
        '.',
        field('database', $.identifier),
        '.',
        '.',
        field('name', $.identifier),
      ),
      seq(
        field('server', $.identifier),
        '.',
        '.',
        field('schema', $.identifier),
        '.',
        field('name', $.identifier),
      ),
      seq(field('server', $.identifier), '.', '.', '.', field('name', $.identifier)),
      seq(
        field('database', $.identifier),
        '.',
        field('schema', $.identifier),
        '.',
        field('name', $.identifier),
      ),
      seq(field('database', $.identifier), '.', '.', field('name', $.identifier)),
      seq(field('schema', $.identifier), '.', field('name', $.identifier)),
      field('name', $.identifier),
    ),

  field: ($) => field('name', $.identifier),

  _qualified_field: ($) =>
    seq(optional(seq(optional_parenthesis($.object_reference), '.')), field('name', $.identifier)),

  // CASE input WHEN value THEN result ... [ELSE result] END
  // CASE WHEN predicate THEN result ... [ELSE result] END
  // Each WHEN branch is a named node so a consumer can count it as a
  // decision point.
  case: ($) =>
    seq(
      $.keyword_case,
      optional(field('input', $._expression)),
      repeat1($.when_clause),
      optional(seq($.keyword_else, field('else', $._expression))),
      $.keyword_end,
    ),

  when_clause: ($) =>
    seq(
      $.keyword_when,
      field('condition', $._expression),
      $.keyword_then,
      field('result', $._expression),
    ),

  // CAST(x AS type) and TRY_CAST(x AS type). CONVERT, TRY_CONVERT and PARSE
  // are ordinary invocations — their type argument reads as an identifier.
  cast: ($) =>
    seq(
      field('name', choice($.keyword_cast, $.keyword_try_cast)),
      wrapped_in_parenthesis(seq(field('parameter', $._expression), $.keyword_as, $._type)),
    ),

  exists: ($) => seq($.keyword_exists, $.subquery),

  // MATCH(...) — a graph-table predicate (SQL Server 2017). The arrow
  // pattern (-()->, <-()-) is modeled explicitly rather than left to the
  // ordinary expression grammar: `-`, `(`, `)` and `>` all already lex as
  // operators, so falling through to _expression would produce a plausible
  // but meaningless binary_expression tree instead of a clean parse.
  graph_match_predicate: ($) => seq($.keyword_match, wrapped_in_parenthesis($.graph_match_expr)),

  graph_match_expr: ($) => comma_list(choice($.graph_shortest_path, $.graph_path), true),

  // SHORTEST_PATH(path+) — the arbitrary-length form of a path. SQL Server
  // supports only the `+` (one-or-more) quantifier here, not `*` — a
  // shortest-path search needs at least one edge to traverse.
  graph_shortest_path: ($) =>
    seq($.keyword_shortest_path, wrapped_in_parenthesis(seq($.graph_path, '+'))),

  // node -(edge)-> node [ -(edge)-> node ... ], or the reverse <-(edge)-
  // form. Each hop is one edge traversal; a path chains one or more.
  graph_path: ($) => seq(field('node', $.identifier), repeat1($.graph_hop)),

  graph_hop: ($) =>
    seq(
      choice(
        seq('-', wrapped_in_parenthesis($._graph_edge_names), '->'),
        seq('<-', wrapped_in_parenthesis($._graph_edge_names), '-'),
      ),
      field('node', $.identifier),
    ),

  // One or more `|`-separated edge-table names — a polymorphic edge
  // pattern spanning heterogeneous edge tables, e.g. `-(led_by|reports_to)->`.
  _graph_edge_names: ($) =>
    seq(field('edge', $.identifier), repeat(seq('|', field('edge', $.identifier)))),

  // name(args). `DEFAULT` is a legal argument to a procedure or function
  // call, and STRING_AGG takes a WITHIN GROUP (ORDER BY ...) suffix. The
  // argument list may end in `RETURNING type` (JSON_VALUE, 2025) or in
  // JSON_QUERY's `WITH ARRAY WRAPPER` (2025).
  invocation: ($) =>
    prec(
      1,
      seq(
        $.object_reference,
        wrapped_in_parenthesis(
          seq(
            comma_list(
              seq(
                optional($.keyword_distinct),
                field('parameter', choice($.term, $.keyword_default)),
              ),
            ),
            optional($.returning_clause),
            optional($.json_wrapper_clause),
          ),
        ),
        optional(seq($.keyword_within, $.keyword_group, wrapped_in_parenthesis($.order_by))),
      ),
    ),

  parenthesized_expression: ($) => prec(2, wrapped_in_parenthesis($._expression)),

  // Bitwise operators. SQL Server groups `~` above `* / %`, and `+ - & ^ |`
  // as one left-associative level below that — so `^` and `op_other` (`|`,
  // `&`) share `binary_plus` with `+`/`-` rather than sitting above `*`.
  op_other: (_) => token(choice('|', '&')),

  binary_expression: ($) =>
    choice(
      ...[
        ['+', 'binary_plus'],
        ['-', 'binary_plus'],
        ['*', 'binary_times'],
        ['/', 'binary_times'],
        ['%', 'binary_times'],
        ['^', 'binary_plus'],
        ['=', 'binary_relation'],
        ['<', 'binary_relation'],
        ['<=', 'binary_relation'],
        ['!=', 'binary_relation'],
        ['>=', 'binary_relation'],
        ['>', 'binary_relation'],
        ['<>', 'binary_relation'],
        ['!<', 'binary_relation'],
        ['!>', 'binary_relation'],
        [$.op_other, 'binary_plus'],
        [$.keyword_is, 'binary_is'],
        [$.is_not, 'binary_is'],
        [$.keyword_collate, 'binary_is'],
        [$.keyword_like, 'pattern_matching'],
        [$.not_like, 'pattern_matching'],
        // binary_is precedence disambiguates `(is not distinct from)` from an
        // `is (not distinct from)` with a unary `not`
        [$.distinct_from, 'binary_is'],
        [$.not_distinct_from, 'binary_is'],
        // AT TIME ZONE — same precedence family as COLLATE, the closest
        // existing analogue (a postfix modifier over an expression). Left
        // associative, so it chains: `d AT TIME ZONE 'UTC' AT TIME ZONE
        // 'Eastern Standard Time'`.
        [$.at_time_zone, 'binary_is'],
      ].map(([operator, precedence]) =>
        prec.left(
          precedence,
          seq(
            field('left', $._expression),
            field('operator', operator),
            field('right', $._expression),
          ),
        ),
      ),
      ...[
        [$.keyword_and, 'clause_connective'],
        [$.keyword_or, 'clause_disjunctive'],
      ].map(([operator, precedence]) =>
        prec.left(
          precedence,
          seq(
            field('left', $._expression),
            field('operator', operator),
            field('right', $._expression),
          ),
        ),
      ),
      ...[
        [$.keyword_in, 'binary_in'],
        [$.not_in, 'binary_in'],
      ].map(([operator, precedence]) =>
        prec.left(
          precedence,
          seq(
            field('left', $._expression),
            field('operator', operator),
            field('right', choice($.list, $.subquery)),
          ),
        ),
      ),
    ),

  unary_expression: ($) =>
    choice(
      // `keyword_not` sits at `logical_not`, below every comparison level, so
      // `NOT a = b` negates the whole comparison rather than just `a`.
      // `ANY`/`SOME`/`ALL` stay at the high `unary_not` level — they bind to
      // a subquery immediately after a comparison operator (`a = ANY (...)`),
      // and moving them down would break that.
      prec.left(
        'logical_not',
        seq(field('operator', $.keyword_not), field('operand', $._expression)),
      ),
      ...[
        [$.keyword_any, 'unary_not'],
        [$.keyword_some, 'unary_not'],
        [$.keyword_all, 'unary_not'],
        ['-', 'unary_sign'],
        ['+', 'unary_sign'],
        ['~', 'unary_sign'],
      ].map(([operator, precedence]) =>
        prec.left(precedence, seq(field('operator', operator), field('operand', $._expression))),
      ),
    ),

  between_expression: ($) =>
    choice(
      ...[
        [$.keyword_between, 'between'],
        [seq($.keyword_not, $.keyword_between), 'between'],
      ].map(([operator, precedence]) =>
        prec.left(
          precedence,
          seq(
            field('left', $._expression),
            field('operator', operator),
            field('low', $._expression),
            $.keyword_and,
            field('high', $._expression),
          ),
        ),
      ),
    ),

  not_in: ($) => seq($.keyword_not, $.keyword_in),

  // No leading CTE: `FROM (WITH c AS (SELECT 1) SELECT 1) d` and
  // `WHERE id IN (WITH c AS (SELECT 1) SELECT 1)` are not legal T-SQL.
  subquery: ($) => wrapped_in_parenthesis($._query_expression),

  list: ($) => paren_list($._expression),

  literal: ($) =>
    prec(2, choice($._integer, $._decimal_number, $._literal_string, $._money, $.keyword_null)),
  // Money literal: $5, $1,234.56. `$action` is an identifier, not money.
  _money: (_) => /\$\d+(,\d{3})*(\.\d+)?/,
  // Character string, optionally with the N prefix for nvarchar. A quote
  // inside the string is doubled; there is no backslash escaping.
  _single_quote_string: (_) => /[nN]?'([^']|'')*'/,
  _literal_string: ($) => $._single_quote_string,
  _natural_number: (_) => /\d+/,
  // Decimal integers and hexadecimal binary literals (`0x4D5A`, `0x`).
  _integer: (_) => /(0[xX][0-9A-Fa-f]*)|(\d+)/,
  _decimal_number: (_) => /((\d+\.\d*|\.\d+)([eE][+-]?\d+)?)|(\d+[eE][+-]?\d+)/,

  identifier: ($) =>
    choice(
      $._identifier,
      $._bracketed_identifier,
      $._double_quote_string,
      $._tsql_parameter,
      $._tsql_system_variable,
      $._temporary_table,
      // $action: T-SQL's pseudo-column for the action taken by a MERGE's
      // OUTPUT clause (INSERT/UPDATE/DELETE). Not a valid _identifier on its
      // own, since identifiers can't start with `$`.
      $._dollar_action,
      // $PARTITION: the pseudo-function prefix for querying which partition
      // a value belongs to ($PARTITION.fn(col)). Follows the same pattern as
      // $action — not a valid _identifier on its own, modeled as one more
      // identifier spelling so it can stand in object_reference's leading part.
      $._dollar_partition,
      // $(var): a SQLCMD scripting variable, substituted by the sqlcmd/SSMS
      // client before the batch reaches the server. Textual substitution, so
      // it can appear anywhere an identifier or literal can — modeled as one
      // more identifier spelling rather than a distinct node, the same
      // treatment as every other identifier variant here.
      $._sqlcmd_variable,
    ),
  // A regular identifier: letters, digits, `_`, `#` and `$` after the first
  // character, per SQL Server's identifier rules (`addr##1` is legal).
  _identifier: (_) => new RegExp(`[${IDENTIFIER_START}][${IDENTIFIER_CONTINUE}]*`),
  _tsql_parameter: (_) => new RegExp(`@[${IDENTIFIER_START}][${IDENTIFIER_CONTINUE}]*`),
  _tsql_system_variable: (_) => /@@[A-Za-z_][0-9A-Za-z_]*/,
  _temporary_table: (_) => new RegExp(`#{1,2}[${IDENTIFIER_START}][${IDENTIFIER_CONTINUE}]*`),
  _bracketed_identifier: (_) => /\[([^\]]|\]\])+\]/,
  // "quoted identifier" — a string only when QUOTED_IDENTIFIER is OFF,
  // which the grammar does not track. A double quote inside is doubled to
  // escape it, the same convention `_bracketed_identifier` follows for `]]`.
  _double_quote_string: (_) => /"([^"]|"")+"/,
  _dollar_action: (_) => /\$[aA][cC][tT][iI][oO][nN]/,
  _dollar_partition: (_) => /\$[pP][aA][rR][tT][iI][tT][iI][oO][nN]/,
  _sqlcmd_variable: (_) => /\$\([A-Za-z_][0-9A-Za-z_]*\)/,
};
