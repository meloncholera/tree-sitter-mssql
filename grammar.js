import keyword_rules from './grammar/keywords.js';
import type_rules from './grammar/types.js';
import column_list_rules from './grammar/column-lists.js';
import expression_rules from './grammar/expressions.js';
import transaction_rules from './grammar/transactions.js';
import statement_rules from './grammar/statements/index.js';

export default grammar({
  name: 'mssql',

  extras: ($) => [/\s/, $.comment, $.marginalia],

  // The block comment is lexed by src/scanner.c rather than a regex because
  // T-SQL block comments nest, and a regex cannot match balanced nesting.
  externals: ($) => [$.marginalia],

  // Every entry arbitrates a real fork the parser must carry a few tokens
  // before it can settle; tree-sitter reports any that stop being needed
  // as "unnecessary conflicts" on generate, and those are removed.
  conflicts: ($) => [
    // `a.b` — the prefix of a qualified column vs. an object reference.
    [$.object_reference, $._qualified_field],
    // `a.b.c.d` — how many parts belong to the reference.
    [$.object_reference],
    // `x BETWEEN a AND b` vs. `x BETWEEN (a AND b)`.
    [$.between_expression, $.binary_expression],
    // A `(` after a DBCC command may open its argument list or start the
    // next statement; a `WITH` after RECONFIGURE, RAISERROR, an
    // unterminated CREATE MESSAGE TYPE's VALIDATION clause, TRUNCATE
    // TABLE, ALTER QUEUE's REBUILD/REORGANIZE, ALTER ASSEMBLY, ALTER
    // FULLTEXT CATALOG's REBUILD, ALTER FULLTEXT INDEX's SET/ADD/DROP, or
    // ALTER ROUTE may be its own option list (or WITH SCHEMA COLLECTION
    // suffix) or the next statement's CTE.
    [$.dbcc_statement],
    [$.reconfigure_statement],
    [$.raiserror_statement],
    [$.create_message_type],
    [$.truncate_statement],
    [$.alter_queue],
    [$.alter_assembly],
    [$.alter_fulltext_catalog],
    [$.alter_fulltext_index],
    [$.alter_route],
    // `OUTPUT a, b INTO t` — where the term list ends.
    [$.output_clause],
    // `FROM t WITH` — a table hint or the next statement's CTE.
    [$._relation_with_hint],
    // `SELECT a b` — `b` may be an alias or continue the expression.
    [$.term],
    // `IF cond stmt ;` — the `;` may start a `; ELSE` clause or end the IF;
    // see else_clause.
    [$.if_statement],
  ],

  precedences: (_) => [
    [
      'binary_is',
      'unary_not',
      'unary_sign',
      'binary_times',
      'binary_plus',
      'binary_in',
      'binary_relation',
      'pattern_matching',
      'between',
      'logical_not',
      'clause_connective',
      'clause_disjunctive',
    ],
  ],

  word: ($) => $._identifier,

  rules: {
    // A script is a sequence of batches — real T-SQL semantics, since `GO`
    // is a client-tool separator that sends everything before it to the
    // server as one unit before starting the next (see `go_statement`
    // below). Grouping by batch, rather than leaving `go_statement` a flat
    // sibling of `statement`, is what lets a consumer iterate a script's
    // batches directly instead of re-deriving them by scanning for
    // `go_statement` and slicing.
    program: ($) => repeat($.batch),

    // Each statement/block may be terminated by `;`; only the batch's last
    // one may instead (or additionally) be closed by `GO`, which is why the
    // trailing `go_statement` sits outside the `repeat1` rather than beside
    // `;` on every item — `;` doesn't end a batch, `GO` always does. A bare
    // `GO` with nothing before it (consecutive `GO`s, or a script that
    // opens with one) is the second alternative, since `repeat1` cannot
    // itself be empty.
    batch: ($) =>
      choice(
        prec.right(
          seq(
            repeat1(
              choice(
                seq(choice($.statement, $.block), optional(';')),
                $.sqlcmd_setvar,
                $.sqlcmd_include,
              ),
            ),
            optional($.go_statement),
          ),
        ),
        $.go_statement,
      ),

    // T-SQL batch separator. Not a T-SQL keyword at all — it's a command
    // recognized by client tools (sqlcmd, SSMS) that splits a script into
    // separate batches sent to the server one at a time. It takes an
    // optional repeat count (`GO 5`) and must otherwise stand alone.
    go_statement: ($) => seq($.keyword_go, optional(alias($._natural_number, $.literal))),

    // SQLCMD scripting variables — `:setvar name value` and `:r path` — are
    // interpreted by the sqlcmd/SSMS client, never sent to the server, the
    // same standing as GO. Unlike T-SQL keywords, sqlcmd command names are
    // case-sensitive, so they are plain literal tokens rather than
    // `make_keyword` regexes.
    //   :setvar DatabaseName "MyDatabase"
    // The value is an object reference rather than an identifier so a
    // schema-qualified name (`:setvar TableName sys.objects`) is one value.
    // The value is optional: `:setvar MyVar` with no value is sqlcmd's
    // documented way to remove a scripting variable.
    sqlcmd_setvar: ($) =>
      prec.right(
        seq(
          ':setvar',
          field('name', $.identifier),
          optional(field('value', choice($.object_reference, $.literal))),
        ),
      ),

    // :r path/to/script.sql — inlines another script file. The path can
    // contain characters (`.`, `/`, `\`) that are not valid identifier
    // characters, so it is a single raw token rather than composed from
    // identifiers, aliased to `identifier` since consumers need to see that
    // something is referenced here, not decompose the path.
    sqlcmd_include: ($) => seq(':r', alias($._sqlcmd_path, $.identifier)),
    _sqlcmd_path: (_) => /[^\s][^\r\n]*/,

    comment: (_) => /--.*/,
    // The block comment (`marginalia`) is an external token: see src/scanner.c.

    ...keyword_rules,
    ...type_rules,
    ...column_list_rules,
    ...expression_rules,
    ...transaction_rules,
    ...statement_rules,
  },
});
