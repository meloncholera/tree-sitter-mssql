// T-SQL SET, which covers three unrelated things under one keyword:
//
//   SET @var = expression            variable assignment (also +=, -=, ...)
//   SET NOCOUNT ON                   session option switches, one or several
//   SET ANSI_NULLS, QUOTED_IDENTIFIER ON
//   SET ROWCOUNT 0                   session options that take a value
//   SET LANGUAGE us_english
//   SET IDENTITY_INSERT dbo.t ON
//   SET CONTEXT_INFO @x
//   SET TRANSACTION ISOLATION LEVEL READ COMMITTED
//
// Option names are ordinary identifiers here rather than one keyword each:
// SQL Server has several dozen and nothing downstream distinguishes them.
export default {
  set_statement: ($) =>
    prec.right(
      seq(
        $.keyword_set,
        choice(
          seq(
            $.object_reference,
            choice(
              seq($.assignment_operator, $._expression),
              seq(repeat(seq(',', $.object_reference)), choice($.keyword_on, $.keyword_off)),
              seq($._expression, optional(choice($.keyword_on, $.keyword_off))),
            ),
          ),
          seq(
            $.keyword_transaction,
            $.keyword_isolation,
            $.keyword_level,
            choice(
              seq($.keyword_read, $.keyword_uncommitted),
              seq($.keyword_read, $.keyword_committed),
              seq($.keyword_repeatable, $.keyword_read),
              $.keyword_snapshot,
              $.keyword_serializable,
            ),
          ),
        ),
      ),
    ),

  assignment_operator: (_) => choice('=', '+=', '-=', '*=', '/=', '%=', '&=', '^=', '|='),
};
