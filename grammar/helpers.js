export function make_keyword(word) {
  let str = '';
  for (var i = 0; i < word.length; i++) {
    str = str + '[' + word.charAt(i).toLowerCase() + word.charAt(i).toUpperCase() + ']';
  }
  return new RegExp(str);
}

export function optional_parenthesis(node) {
  return prec.right(choice(node, wrapped_in_parenthesis(node)));
}

export function wrapped_in_parenthesis(node) {
  if (node) {
    return seq('(', node, ')');
  }
  return seq('(', ')');
}

export function comma_list(field, requireFirst) {
  let sequence = seq(field, repeat(seq(',', field)));

  if (requireFirst) {
    return sequence;
  }

  return optional(sequence);
}

export function paren_list(field, requireFirst) {
  return wrapped_in_parenthesis(comma_list(field, requireFirst));
}

// A parenthesized two-item pair, e.g. `(start, end)` or `('provider', 'init
// string')` — shared by any rule whose argument list is exactly two items
// rather than an arbitrary comma list.
export function paren_pair(first, second) {
  return wrapped_in_parenthesis(seq(first, ',', second));
}

// A table source's optional `[AS] alias [(col, ...)]` tail, shared by
// `relation`, `_relation_with_hint`'s OPENJSON branch, and `apply_join`.
export function aliased_with_columns($) {
  return optional(seq($._alias, optional(alias($._column_list, $.list))));
}

// The shared write-target preamble for INSERT, UPDATE, DELETE and MERGE:
// the target object plus its optional table hint.
//
// `allowRowsetFunction` widens the target itself beyond a plain object
// reference to also accept SQL Server's `rowset_function_limited`
// alternative (OPENQUERY, OPENROWSET, OPENDATASOURCE) for writing through a
// linked server, e.g. `UPDATE OPENQUERY(lnk, 'SELECT a FROM t') SET a = 1`.
// `update.js` and `delete.js` pass true; `insert.js` and `merge.js` don't —
// an unqualified `invocation` alternative right before INSERT's own column
// list reopens the exact column-list ambiguity `allowBareHint` below exists
// to avoid, and MERGE's target syntax documents no rowset-function form.
//
// The table hint accepts either the modern `WITH (...)` spelling or the
// deprecated bare `(NOLOCK)` form — except where `allowBareHint` is false.
// INSERT is the one caller that passes false: an INSERT target's own `(...)`
// position is unambiguously a column list (`INSERT INTO t (col, ...) VALUES
// ...`), and several deprecated hint names (NOLOCK, SNAPSHOT, TABLOCK, ...)
// are also legal, unreserved column names, so accepting the bare form there
// hijacks a real column list — `INSERT INTO t (nolock) VALUES (1)` would
// parse as a hinted, column-less insert instead of a one-column one.
// UPDATE/DELETE/MERGE have no column list at this position, so the bare
// form is unambiguous for them.
//
// Per SQL Server's own syntax reference, only MERGE's target may carry a
// direct `[AS] alias` clause — INSERT/UPDATE/DELETE's target position is
// either the object itself or a bare name referencing an alias established
// later in a FROM clause, which `object_reference` already expresses with
// no separate alias clause needed. `merge.js` keeps its own
// `optional($._alias)` call immediately after this one rather than folding
// it in here, so this shared rule can't accidentally widen what the other
// three writers accept.
export function write_target($, { allowBareHint = true, allowRowsetFunction = false } = {}) {
  return seq(
    allowRowsetFunction
      ? choice($.object_reference, $.invocation, $.opendatasource_reference)
      : $.object_reference,
    optional(
      allowBareHint ? choice($.table_hint, alias($._bare_table_hint, $.table_hint)) : $.table_hint,
    ),
  );
}

// The Unicode ranges SQL Server accepts as "a letter" in an identifier,
// shared by `_identifier`, `_tsql_parameter` and `_temporary_table` so a
// future change to the class only has to be made once. Deliberately
// excludes U+00D7 `×` and U+00F7 `÷` — both fall inside a naive `À-ſ` span
// but are Unicode `Sm` (math symbol), not letters.
export const IDENTIFIER_START = 'A-Za-z_À-ÖØ-öø-ſ';
export const IDENTIFIER_CONTINUE = '0-9A-Za-z_#$À-ÖØ-öø-ſ';
