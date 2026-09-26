// T-SQL transaction control. These are four independent statements, because
// that is what they are in T-SQL: a procedure routinely opens a transaction
// before a TRY block and commits in one branch and rolls back in another,
// which no block model can represent.
//
//   BEGIN [DISTRIBUTED] { TRAN | TRANSACTION } [ name ] [ WITH MARK [ 'description' ] ]
//   COMMIT [ { TRAN | TRANSACTION } [ name ] | WORK ]
//   ROLLBACK [ { TRAN | TRANSACTION } [ name ] | WORK ]
//   SAVE { TRAN | TRANSACTION } name
export default {
  _transaction_keyword: ($) => choice($.keyword_tran, $.keyword_transaction),

  begin_transaction_statement: ($) =>
    prec.right(
      seq(
        $.keyword_begin,
        optional($.keyword_distributed),
        $._transaction_keyword,
        optional(field('name', $.identifier)),
        optional(seq($.keyword_with, $.keyword_mark, optional($.literal))),
      ),
    ),

  commit_statement: ($) =>
    prec.right(
      seq(
        $.keyword_commit,
        optional(
          choice(
            seq($._transaction_keyword, optional(field('name', $.identifier))),
            $.keyword_work,
          ),
        ),
      ),
    ),

  rollback_statement: ($) =>
    prec.right(
      seq(
        $.keyword_rollback,
        optional(
          choice(
            seq($._transaction_keyword, optional(field('name', $.identifier))),
            $.keyword_work,
          ),
        ),
      ),
    ),

  save_transaction_statement: ($) =>
    seq($.keyword_save, $._transaction_keyword, field('name', $.identifier)),
};
