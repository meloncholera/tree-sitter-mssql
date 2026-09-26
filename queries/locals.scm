; Local variable and scope resolution — first slice.
;
; Covers the two most common definition sites a consumer needs to resolve a
; qualified column reference (`t.col`) against: a FROM relation's alias, and
; a CTE name. APPLY, PIVOT and MERGE's two-relation scope are not yet
; covered.
;
; `statement` is the scope, not `query_specification` — a lone (non-union)
; query has no `query_specification` node at all (its body inlines directly
; into `statement`; see grammar/statements/select.js's own note on this),
; and a CTE's name needs to sit in the same scope as the query that
; references it, not nested inside the CTE's own body. `query_specification`
; is still a scope in its own right for a UNION branch, so sibling branches
; can each reuse the same alias without colliding.
[(statement) (query_specification)] @local.scope

(relation
  alias: (identifier) @local.definition)

; Anchored to the first child: a CTE's optional column list
; (`WITH c (a, b) AS (...)`) is also a run of `identifier` children of the
; same `cte` node, and only the first one is the CTE's own name.
(cte
  . (identifier) @local.definition)

(field
  (object_reference
    name: (identifier) @local.reference))
