; Local variable and scope resolution — first slice.
;
; Covers the two most common definition sites a consumer needs to resolve a
; qualified column reference (`t.col`) against: a FROM relation's alias, and
; a CTE name. APPLY, PIVOT and MERGE's two-relation scope are not yet
; covered.
;
; `statement` is the scope of a lone query. Its `ORDER BY` sits beside
; `query_specification`, not inside it, so the table alias has to be
; visible from that outer scope. A `query_specification` is its own scope
; when it is one arm of a set operation, or the body of a subquery, so
; those aliases do not leak into the enclosing statement. A CTE name stays
; in the outer statement scope, next to the query that references it.
(statement) @local.scope

(set_operation
  (query_specification) @local.scope)

(subquery
  (query_specification) @local.scope)

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
