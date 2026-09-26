import { wrapped_in_parenthesis } from './helpers.js';

// SQL Server's data types. Anything not listed here — a user-defined type,
// `sysname`, or a type written in brackets the way SSMS scripts it
// (`[nvarchar](max)`) — is a `custom_type`: an object reference with an
// optional parameter list.
export default {
  _type: ($) =>
    prec.left(
      choice(
        $.keyword_bit,
        $.keyword_tinyint,
        $.keyword_smallint,
        $.keyword_int,
        $.keyword_bigint,
        $.decimal,
        $.numeric,
        $.float,
        $.double,
        $.keyword_money,
        $.keyword_smallmoney,

        $.char,
        $.varchar,
        $.nchar,
        $.nvarchar,
        $.keyword_text,
        $.keyword_ntext,

        $.binary,
        $.varbinary,
        $.keyword_image,

        $.keyword_date,
        $.keyword_datetime,
        $.datetime2,
        $.datetimeoffset,
        $.keyword_smalldatetime,
        $.time,
        $.keyword_timestamp,
        $.keyword_rowversion,

        $.keyword_uniqueidentifier,
        $.keyword_xml,
        $.keyword_json,
        $.keyword_sql_variant,
        $.keyword_hierarchyid,
        $.keyword_geometry,
        $.keyword_geography,

        $.custom_type,
      ),
    ),

  // A user-defined or bracket-quoted type, with the parameter list SSMS
  // writes after a bracketed built-in: `[nvarchar](max)`, `[decimal](18, 4)`.
  // The second parameter may also name a base type — `VECTOR(3, float16)`
  // (2025) — which lexes as an identifier.
  custom_type: ($) =>
    prec.right(
      seq(
        $.object_reference,
        optional(
          wrapped_in_parenthesis(
            seq(
              field('size', choice(alias($._natural_number, $.literal), $.keyword_max)),
              optional(
                seq(
                  ',',
                  choice(
                    field('scale', alias($._natural_number, $.literal)),
                    field('base_type', $.identifier),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),

  decimal: ($) => parametric_type($, $.keyword_decimal, ['precision', 'scale']),
  numeric: ($) => parametric_type($, $.keyword_numeric, ['precision', 'scale']),
  float: ($) => parametric_type($, $.keyword_float, ['precision']),
  double: ($) => choice(seq($.keyword_double, $.keyword_precision), $.keyword_real),

  char: ($) => parametric_type($, $.keyword_char),
  varchar: ($) => parametric_type($, $.keyword_varchar),
  nchar: ($) => parametric_type($, $.keyword_nchar),
  nvarchar: ($) => parametric_type($, $.keyword_nvarchar),

  binary: ($) => parametric_type($, $.keyword_binary),
  varbinary: ($) => parametric_type($, $.keyword_varbinary),

  datetime2: ($) => parametric_type($, $.keyword_datetime2),
  datetimeoffset: ($) => parametric_type($, $.keyword_datetimeoffset),
  time: ($) => parametric_type($, $.keyword_time),
};

// A type keyword with an optional parameter list. Every parameter accepts
// `max` as well as a number, because T-SQL spells the unbounded size of
// varchar/nvarchar/varbinary as `(max)` and nothing downstream cares
// which types actually allow it.
function parametric_type($, type, params = ['size']) {
  return prec.right(
    1,
    choice(
      type,
      seq(
        type,
        wrapped_in_parenthesis(
          seq(
            field(params[0], choice(alias($._natural_number, $.literal), $.keyword_max)),
            ...params
              .slice(1)
              .map((p) => optional(seq(',', field(p, alias($._natural_number, $.literal))))),
          ),
        ),
      ),
    ),
  );
}
