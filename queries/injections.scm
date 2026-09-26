; Dynamic SQL injection — first slice.
;
; Covers `EXEC('...')` / `EXECUTE('...')` and `sp_executesql`'s first
; (batch text) argument. Injection into a *concatenated* expression is out
; of scope for this first slice.

; EXEC('...'): the parenthesized-expression-list alternative of
; execute_statement places the literal as a direct, unfielded child right
; after the EXEC/EXECUTE keyword — unlike sp_executesql's argument below,
; which is wrapped in a fielded exec_argument node one level deeper, so
; this pattern does not also match that case. The anchor is required: a
; trailing `AS USER = '...'`/`AS LOGIN = '...'` clause is also a direct
; literal child of execute_statement, and a multi-argument form
; (`EXEC('...', @sql)`) has more than one literal child — without the
; anchor either would be captured as SQL too.
(execute_statement
  [(keyword_exec) (keyword_execute)] . (literal) @injection.content
  (#set! injection.language "sql"))

; sp_executesql's first argument is the dynamic SQL batch text — anchored
; so a later exec_argument (a parameter-declaration string, or a literal
; value bound to a named parameter) is not captured as SQL too. The name
; check spells out case-insensitivity letter by letter rather than an
; inline `(?i)` flag: the Rust `regex` crate accepts `(?i)`, but the Node
; binding compiles this pattern with a plain JS `RegExp`, which rejects it
; as an invalid group.
(execute_statement
  procedure: (object_reference
    name: (identifier) @_proc)
  . (exec_argument
    value: (literal) @injection.content)
  (#match? @_proc "^[sS][pP]_[eE][xX][eE][cC][uU][tT][eE][sS][qQ][lL]$")
  (#set! injection.language "sql"))
