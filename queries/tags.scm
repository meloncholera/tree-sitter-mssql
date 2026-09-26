; Symbol extraction — first slice.
;
; None of these definitions carry a real `name` field yet, so the object
; name is matched positionally: it is always the first child immediately
; after the statement's own defining keyword. The
; trigger patterns need an explicit anchor for this reason — a trigger's ON
; target is a second object_reference later in the same node, and without
; the anchor a bare `(object_reference)` pattern would tag it too.

(create_procedure
  [(keyword_procedure) (keyword_proc)] . (object_reference) @name) @definition.function

(alter_procedure
  [(keyword_procedure) (keyword_proc)] . (object_reference) @name) @definition.function

(create_function
  (keyword_function) . (object_reference) @name) @definition.function

(alter_function
  (keyword_function) . (object_reference) @name) @definition.function

(create_trigger
  (keyword_trigger) . (object_reference) @name) @definition.function

(alter_trigger
  (keyword_trigger) . (object_reference) @name) @definition.function

(create_table
  (keyword_table) . (object_reference) @name) @definition.class

(create_view
  (keyword_view) . (object_reference) @name) @definition.class

(alter_view
  (keyword_view) . (object_reference) @name) @definition.class

(create_type
  (keyword_type) . (object_reference) @name) @definition.type

(create_index
  name: (identifier) @name) @definition.class
