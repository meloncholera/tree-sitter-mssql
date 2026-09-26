# Fixtures

Real T-SQL that the grammar must parse with zero `ERROR` and `MISSING` nodes: sanitized real
objects, SQL snippets a T-SQL linter/formatter's own test suite feeds its parser, and examples
from Microsoft's T-SQL reference. They are the integration check that sits next to the
per-construct corpus tests: a construct that first appears in a fixture also gets a corpus test.

Run the check with:

```bash
for f in test/fixtures/*.sql; do printf "%s: " "$f"; CC=gcc CXX=g++ ./node_modules/tree-sitter-cli/tree-sitter.exe parse "$f" | grep -c "ERROR\|MISSING"; done
```

Files are named for the T-SQL construct(s) they exercise, not for where the SQL came from. The
handful of T-SQL shapes the grammar deliberately does not parse are listed in the last section.

## Statements and DDL

| File | Constructs |
|---|---|
| `table_bracketed_types_and_index.sql` | `CREATE TABLE` with bracketed parameterized types, `PRIMARY KEY CLUSTERED ... ON [PRIMARY]`, `CREATE UNIQUE NONCLUSTERED INDEX`, `ALTER TABLE ... ADD CONSTRAINT ... DEFAULT` |
| `table_with_defaults_and_check.sql` | `CREATE TABLE` with user-defined and bracketed types, `CREATE CLUSTERED INDEX ... WITH (...)`, a run of guarded `ADD CONSTRAINT ... DEFAULT ... FOR`, `WITH CHECK ADD CONSTRAINT ... CHECK`, `CHECK CONSTRAINT` |
| `table_identity_collate_defaults.sql` | `CREATE TABLE` with `IDENTITY`, `COLLATE`, a wide column list, `CREATE NONCLUSTERED INDEX`, guarded `ADD CONSTRAINT ... DEFAULT` |
| `primary_key_clustered.sql` | `ALTER TABLE ... ADD CONSTRAINT ... PRIMARY KEY CLUSTERED (...) WITH (...) ON [PRIMARY]` |
| `unique_constraint_nonclustered.sql` | `ALTER TABLE ... ADD CONSTRAINT ... UNIQUE NONCLUSTERED (...) WITH (...) ON [PRIMARY]` |
| `check_constraint_enable.sql` | `WITH CHECK ADD CONSTRAINT ... CHECK (...)`, `CHECK CONSTRAINT` |
| `foreign_key_enable.sql` | `FOREIGN KEY (...) REFERENCES`, `CHECK CONSTRAINT` |
| `user_defined_type_alias.sql` | `CREATE TYPE ... FROM [nvarchar](22) NULL` |
| `user_defined_table_type.sql` | `CREATE TYPE ... AS TABLE (...)` |
| `database_role.sql` | `CREATE ROLE` |
| `database_user_for_login.sql` | `CREATE USER ... FOR LOGIN ... WITH DEFAULT_SCHEMA` |
| `login_from_windows.sql` | `CREATE LOGIN ... FROM WINDOWS WITH ...`, `ALTER SERVER ROLE ... ADD MEMBER` |
| `schema_wrapped_dynamic_sql.sql` | `CREATE SCHEMA` inside an `sp_executesql` string |
| `synonym_for_remote_object.sql` | `CREATE SYNONYM ... FOR` a three-part name |
| `view_wrapped_dynamic_sql.sql` | `CREATE VIEW` module inside an `sp_executesql` string |
| `view_body_context_info.sql` | Bare `CREATE VIEW` with `CAST(CONTEXT_INFO() AS NVARCHAR(8))` |
| `view_body_bracketed_columns.sql` | Bare `CREATE VIEW` with a bracketed column list |
| `trigger_wrapped_dynamic_sql.sql` | `CREATE TRIGGER` module inside an `sp_executesql` string, then `ALTER TABLE ... ENABLE TRIGGER`, `EXEC sp_settriggerorder` |
| `trigger_instead_of_insert_enable.sql` | `CREATE TRIGGER ... INSTEAD OF INSERT`, the `inserted` pseudo-table, a table hint, `ALTER TABLE ... ENABLE TRIGGER` |
| `trigger_body_instead_of_insert.sql` | Bare `INSTEAD OF INSERT` trigger body, `IF @@ROWCOUNT = 0 RETURN`, `INSERT` without `INTO` |
| `trigger_body_delete_join.sql` | Bare `FOR DELETE` trigger body, `DELETE alias FROM ... JOIN` |
| `trigger_body_after_update.sql` | Bare `AFTER UPDATE` trigger body, `UPDATE ... FROM inserted` |
| `server_ddl_trigger_guarded_enable.sql` | A guarded (`IF NOT EXISTS (SELECT ... FROM master.sys.server_triggers)`) bare `CREATE TRIGGER ... ON ALL SERVER FOR LOGON`, followed by `ENABLE TRIGGER ... ON ALL SERVER` |
| `server_ddl_trigger_body.sql` | Bare `CREATE TRIGGER ... ON ALL SERVER WITH EXECUTE AS CALLER FOR DDL_DATABASE_LEVEL_EVENTS` body: `TRY`/`CATCH`, XML methods (`.value()`), `DECLARE ... = expression`, a table variable with `IDENTITY ... PRIMARY KEY`, `VALUES` derived tables, `UNION ALL`, bitwise `\|`, `sp_executesql` with `@params` |
| `logon_trigger_body.sql` | Bare `CREATE TRIGGER ... ON ALL SERVER FOR LOGON` body, `SET CONTEXT_INFO` |
| `function_wrapped_dynamic_sql.sql` | Scalar `CREATE FUNCTION` module inside an `sp_executesql` string |
| `function_scalar_and_multi_statement_tvf.sql` | A scalar function and a multi-statement table-valued function |
| `function_body_case_exists.sql` | Bare scalar function body: `CASE WHEN EXISTS (...)` returning a user-defined type |
| `function_body_not_in.sql` | Bare scalar function body: `NOT IN` returning a user-defined type |
| `function_body_if_else_chain.sql` | Bare scalar function body: a long `IF ... ELSE IF ...` chain with and without `BEGIN`/`END` |
| `procedure_stub_then_alter.sql` | A stub `CREATE PROCEDURE ... AS` inside an `sp_executesql` string, followed by the real `ALTER PROCEDURE` with a bare body: generated touch-point blocks, `WHILE EXISTS`, `EXEC @status = @procedure_variable`, `DELETE @tablevar` |
| `procedure_report_with_temp_tables.sql` | A report procedure: `BEGIN TRANSACTION`, `SET XACT_ABORT`, `IF ... SET TRANSACTION ISOLATION LEVEL ... ELSE ...`, temp tables with indexes, `UPDATE ... FROM (derived table)`, nested `BEGIN`/`END` groups, simple `CASE` |
| `procedure_report_with_table_variables.sql` | A report procedure: table variables with `##` in column names, `RANK() OVER`, `DEFAULT` as a function argument, `IIF`, `OUT` parameters |
| `linked_server_setup.sql` | `sp_addlinkedserver`/`sp_serveroption` calls |
| `linked_server_query.sql` | A four-part linked-server name in `FROM`, and `OPENQUERY(server, 'query')` |
| `linked_server_remove.sql` | `EXEC sp_dropserver @server = ..., @droplogins = ...` |
| `openrowset_example.sql` | `OPENROWSET('provider', 'connection string', 'query')` and `OPENROWSET(BULK 'path', SINGLE_CLOB)`, both as a `FROM` source |
| `system_variables.sql` | `@@VERSION`, `@@SERVERNAME`, `@@SPID`, `@@TRANCOUNT`, `@@ERROR`, `@@NESTLEVEL`, `@@MAX_CONNECTIONS` |
| `system_property_functions.sql` | `SERVERPROPERTY`, `OBJECTPROPERTY`, `OBJECTPROPERTYEX`, `DATABASEPROPERTYEX`, `COLUMNPROPERTY` |
| `service_route.sql` | `CREATE ROUTE` |
| `fulltext_catalog.sql` | `CREATE FULLTEXT CATALOG` |
| `server_audit_create_and_enable.sql` | `CREATE SERVER AUDIT ... TO FILE (...) WITH (...)`, `ALTER SERVER AUDIT` |
| `assembly_from_binary.sql` | `CREATE ASSEMBLY ... FROM 0x... WITH PERMISSION_SET` (the binary is truncated) |
| `exec_output_return_value.sql` | `DECLARE` plus `EXEC @return_value = ... OUTPUT` |
| `insert_select_where_not_exists.sql` | Multi-statement `INSERT ... SELECT ... WHERE NOT EXISTS` inside a top-level `BEGIN`/`END` |
| `cursor_temp_table.sql` | Cursor lifecycle, a `#temp` table, a table variable, nested `IF` without `BEGIN`/`END` |
| `dynamic_sql_try_catch.sql` | `TRY`/`CATCH`, `EXEC sp_executesql`, `QUOTENAME`, output parameters with a default |
| `merge_upsert.sql` | Bare `MERGE`, `WHEN [NOT] MATCHED`, `OUTPUT $action ... INTO`, a table variable with an `IDENTITY` primary key |
| `merge_full.sql` | `MERGE` with two `WHEN MATCHED` clauses (conditional `DELETE` vs `UPDATE`) and a bare `OUTPUT $action, Inserted.*, Deleted.*` with no `INTO` |
| `transaction_throw.sql` | `BEGIN TRANSACTION`, `THROW`, `RAISERROR ... WITH LOG`, `ROLLBACK`/`COMMIT` |
| `create_table_basic.sql` | A single `CREATE TABLE` statement |
| `sp_configure_reconfigure.sql` | `EXEC sp_configure` with positional arguments, `RECONFIGURE WITH OVERRIDE` |
| `raiserror_format.sql` | `RAISERROR` with a format string held in a variable, inline `--` comments between arguments, a string literal containing `\<` |
| `dbcc.sql` | `DBCC CHECKDB WITH NO_INFOMSGS`, `DBCC HELP (@variable)`, `sysname` |
| `dbcc_shrinkdatabase.sql` | `DBCC SHRINKDATABASE (db, pct)`, `TRUNCATEONLY` |
| `dbcc_freeproccache.sql` | `DBCC FREEPROCCACHE` with a plan-handle literal, `WITH NO_INFOMSGS`, a resource-pool name |
| `sequence.sql` | `CREATE SEQUENCE` with `START WITH`/`INCREMENT BY`/`AS type`/`MINVALUE`/`MAXVALUE`/`CYCLE`/`CACHE n`, `NEXT VALUE FOR` |
| `sp_rename.sql` | `EXECUTE sp_rename` renaming a table, column, index, alias type, and constraints, plus the named-parameter (`@objname=`) form |
| `partition_function_scheme.sql` | `CREATE PARTITION FUNCTION ... AS RANGE LEFT/RIGHT FOR VALUES`, `CREATE PARTITION SCHEME ... AS PARTITION ... TO (...)` incl. `ALL TO`, `ALTER TABLE ... SWITCH [PARTITION n] TO table [PARTITION n]`, `$PARTITION.fn(col)` |
| `columnstore_index.sql` | `CREATE CLUSTERED/NONCLUSTERED COLUMNSTORE INDEX`, `DROP_EXISTING`, a quoted index name, a `WHERE` filter |
| `sql_variant_property.sql` | `sql_variant` column, `SQL_VARIANT_PROPERTY`, string-literal column aliases (`AS 'Base Type'`), statements with no separator at all |
| `inline_tvf.sql` | `USE`, `IF OBJECT_ID(...) IS NOT NULL DROP FUNCTION`, inline table-valued function (`RETURNS TABLE AS RETURN (...)`) with a three-way `INNER JOIN` and `GROUP BY` |
| `trigger_alter_and_bare_body.sql` | Bare (no `BEGIN`/`END`) `CREATE TRIGGER` body, and a bare `ALTER TRIGGER ... AS BEGIN ... END` |
| `cursor_scope_local_global.sql` | `DECLARE cursor CURSOR LOCAL FOR ...` / `CURSOR GLOBAL FOR ...` (optional cursor-scope keyword) |
| `cursor_declaration_scope_keywords.sql` | `DECLARE CURSOR LOCAL FORWARD_ONLY FOR ...` / `CURSOR GLOBAL SCROLL FOR ...` |
| `type_bare_varchar_without_length.sql` | Bare `VARCHAR` with no length, as a column type and as a `CAST(... AS VARCHAR)` target |
| `column_type_money_float.sql` | `MONEY` and `FLOAT` column types with no precision/scale |
| `inline_clustered_primary_key.sql` | Column-level inline `PRIMARY KEY CLUSTERED` (no named `CONSTRAINT`) |
| `update_target_table_variable.sql` | `UPDATE @T SET ...` / `UPDATE #T SET ...` with no `FROM`, no `WHERE` |
| `table_hint_bare_nolock.sql` | Bare `NOLOCK` table hint vs. `WITH (NOLOCK)` |
| `execute_as_context_switch.sql` | `EXECUTE AS USER = '...'` context switch |
| `alter_index_rebuild_reorganize.sql` | `ALTER INDEX ALL ON ... REBUILD` / `REORGANIZE` / `RESUME [WITH (...)]` / `PAUSE` / `ABORT` |
| `set_option_values.sql` | `SET OFFSETS FROM ON`, `SET ROWCOUNT n` (`SET` options taking a non-boolean value) |
| `alter_database_set_options.sql` | `ALTER DATABASE ... SET PAGE_VERIFY TORN_PAGE_DETECTION` |
| `grant_deny_revoke_all.sql` | `GRANT`/`DENY`/`REVOKE ALL ON ... TO PUBLIC` |
| `create_proc_abbreviated.sql` | The abbreviated `CREATE PROC` keyword form |
| `drop_index_forms.sql` | Dotted two-part `DROP INDEX table.index` vs. `DROP INDEX index ON table` |
| `exec_parameter_forms.sql` | `EXEC` argument lists: all-named, all-positional, and a named `OUTPUT` parameter |
| `exec_qualified_procedure_name.sql` | `EXEC` target as a two-part vs. three-part (cross-database) name |
| `cross_database_references.sql` | A three-part-qualified function call, and `SELECT`/`UPDATE`/`INSERT` targets against a three-part table name |
| `alter_table_add_not_null_default.sql` | `ALTER TABLE ... ADD Col type NOT NULL DEFAULT ...` |
| `view_and_inline_function_order_by.sql` | `CREATE VIEW`/inline table-valued function with `TOP ... ORDER BY` |
| `insert_exec.sql` | `INSERT INTO ... EXEC proc` |
| `waitfor_delay.sql` | `WAITFOR DELAY '...'` |
| `named_transaction.sql` | `BEGIN TRANSACTION <name>` and the bracketed-name form `BEGIN TRANSACTION [name]` |
| `procedure_body_begin_forms.sql` | A procedure body that is a single `BEGIN...END` block, and one starting with `BEGIN TRAN` (disambiguating transaction-start `BEGIN` from block-opening `BEGIN`) |
| `goto_and_label.sql` | `GOTO label; ... label: ...` |
| `global_temp_table.sql` | `CREATE TABLE ##Temp (...)` (double-hash global temp table) |
| `execution_issue_snippets.sql` | Positioned cursor updates: `UPDATE`/`DELETE ... WHERE CURRENT OF cursor`, and dynamic SQL with a context switch, `EXECUTE('...') AS USER = '...'` |
| `deprecated_syntax_snippets.sql` | Deprecated statements that still execute: `READTEXT`/`WRITETEXT`/`UPDATETEXT`, `SETUSER`, `BACKUP DATABASE ... TO DISK/TAPE = '...' [WITH ...]`, and a numbered procedure (`CREATE PROC p;1`) |
| `style_snippets.sql` | A procedure with an empty body (`CREATE PROCEDURE dbo.p AS`, the shape a scripted stub uses) |
| `kill.sql` | `KILL session_id [WITH STATUSONLY]`, `KILL 'UOW guid'` |
| `external_table.sql` | `CREATE EXTERNAL DATA SOURCE`/`FILE FORMAT`/`TABLE`, incl. a `FORMAT_OPTIONS (...)` sub-option list |
| `create_statistics.sql` | `CREATE STATISTICS name ON table (cols) WITH SAMPLE n PERCENT` |
| `columnstore_index_ordered.sql` | Ordered clustered columnstore index `ORDER (col [, ...])` clause (2022), with and without `WITH (DROP_EXISTING = ON)` |
| `dbcc_shrinkdatabase_wait_at_low_priority.sql` | `DBCC SHRINKDATABASE (...) WITH WAIT_AT_LOW_PRIORITY (ABORT_AFTER_WAIT = ...)` |
| `sqlcmd_setvar.sql` | `:setvar` with a bare and a schema-qualified (`sys.objects`) value, then `$(var)` substitution in a query |

## Query clauses and expressions

| File | Constructs |
|---|---|
| `case_expression_tiers.sql` | `CASE WHEN ... THEN ... ELSE ... END` with several tiers |
| `cte_multiple.sql` | A two-CTE `WITH` |
| `dml_insert_update_delete.sql` | `INSERT`/`UPDATE`/`DELETE` |
| `group_having_order.sql` | `GROUP BY ... HAVING ... ORDER BY` |
| `if_while_delete_top.sql` | `IF ... ELSE` and `WHILE` with `DELETE TOP (1)` |
| `inner_join_basic.sql` | An `INNER JOIN` |
| `join_types_all.sql` | `INNER`/`LEFT OUTER`/`RIGHT`/`RIGHT OUTER`/`FULL`/`FULL OUTER`/`CROSS JOIN` chained in one query |
| `option_hint_and_cte_maxrecursion.sql` | `OPTION (RECOMPILE, OPTIMIZE FOR UNKNOWN)` on a plain query, and `OPTION (MAXRECURSION n)` on a recursive `WITH` |
| `derived_table_from.sql` | A derived table in `FROM` |
| `unpivot.sql` | `CREATE TABLE`, a run of single-row `INSERT ... VALUES`, `UNPIVOT (... FOR ... IN (...)) AS alias` over a derived table |
| `pivot.sql` | `PIVOT` with an aggregate and multiple pivoted columns, incl. a multi-join form |
| `offset_fetch.sql` | `OFFSET n ROWS [FETCH NEXT n ROWS ONLY]`, incl. a scalar-subquery row count |
| `window_frame.sql` | `OVER (... ROWS BETWEEN ... PRECEDING AND ... FOLLOWING)` explicit frame clauses |
| `grouping_sets.sql` | `GROUP BY ROLLUP(...)`, `CUBE(...)`, `GROUPING SETS(...)` incl. nested grouping items and an empty grouping set |
| `is_distinct_from.sql` | `IS [NOT] DISTINCT FROM` (2022) against a literal, `NULL`, and over a `#temp` table |
| `select_assignment_and_into.sql` | Assignment-style `SELECT @x = col FROM t`, and `SELECT col INTO #t FROM t` |
| `current_timestamp_comparison.sql` | Bare `CURRENT_TIMESTAMP` niladic function reference in a joined query's `WHERE` |
| `comma_join.sql` | Old-style comma-separated `FROM` list with a `WHERE`-based join condition (no `JOIN` keyword) |
| `inner_join_without_aliases.sql` | An `INNER JOIN` referencing schema-qualified table names directly in `ON`, no aliases |
| `if_else_begin_end_variants.sql` | `IF ... BEGIN...END ELSE <bare statement>` (asymmetric block presence), and a bare single-statement `IF` with no `ELSE`/`BEGIN`/`END` |
| `select_top_unparenthesized.sql` | `SELECT TOP 10 ...` (no parens) |
| `not_equal_bang_operator.sql` | `!=` as an alternate not-equal operator |
| `group_by_all.sql` | `GROUP BY ALL` vs. plain `GROUP BY` |
| `query_hint_option.sql` | `OPTION (FAST n)` query hint |
| `qualified_column_reference_depth.sql` | 2/3/4-part dotted column references |
| `performance_snippets.sql` | Physical join hints `INNER HASH JOIN`, `INNER LOOP JOIN`, `INNER MERGE JOIN`, and a cursor-driven `UPDATE ... WHERE CURRENT OF` |
| `best_practice_snippets.sql` | `DELETE alias FROM ... LEFT OUTER HASH JOIN` with no `WHERE` |
| `merge_as_from_source.sql` | `MERGE ... OUTPUT ...` used as a `FROM (...)` subquery source of an `INSERT ... SELECT` |
| `temporal_table_query.sql` | System-versioned temporal tables: `PERIOD FOR SYSTEM_TIME` in `CREATE TABLE` and `ALTER TABLE ... ADD`, and `FOR SYSTEM_TIME` querying (`AS OF`, `FROM ... TO`, `BETWEEN ... AND`, `CONTAINED IN`, `ALL`) |
| `at_time_zone.sql` | `AT TIME ZONE` (2016), incl. chained application and use in `WHERE` |
| `tablesample.sql` | `TABLESAMPLE (n PERCENT \| ROWS)`, `TABLESAMPLE SYSTEM (...) REPEATABLE (seed)`, and combined with a table alias |
| `opendatasource_changetable.sql` | `OPENDATASOURCE(...)` with a dotted object suffix, `CHANGETABLE(CHANGES ...)` joined against its source table, `CHANGETABLE(VERSION ...)` |
| `graph_match.sql` | Graph tables (2017): `CREATE TABLE ... AS NODE`/`AS EDGE`, and `MATCH(...)` in `WHERE` with the `-()->`/`<-()-` arrow pattern, `SHORTEST_PATH(...)`, and a `\|`-alternated (polymorphic) edge pattern |

## Functions

| File | Constructs |
|---|---|
| `greatest_least.sql` | `GREATEST`/`LEAST` (2022) across a join, `DECLARE`d variables, and mixed literal/column argument lists |
| `date_bucket.sql` | `DATE_BUCKET(datepart, n, date, [origin])` (2022), incl. a non-default `origin` and `FIRST_VALUE`/`LAST_VALUE OVER (ORDER BY ...)` |
| `generate_series.sql` | `GENERATE_SERIES(start, stop, [step])` (2022) as a table source, integer and `decimal` variable forms |
| `string_split.sql` | `STRING_SPLIT(string, separator, [enable_ordinal])` (2022) with the new `ordinal` output column, `CROSS APPLY`, a `JOIN` against the TVF |
| `string_agg_within_group.sql` | `STRING_AGG(...) WITHIN GROUP (ORDER BY ...)` combined with joins and `GROUP BY` |
| `translate.sql` | `TRANSLATE(inputString, characters, translations)` |
| `trim_functions.sql` | `TRIM(string)`, `TRIM(chars FROM string)` and `TRIM(LEADING\|TRAILING\|BOTH chars FROM string)` (2022), classic single-arg `LTRIM`/`RTRIM`, and the 2022 two-argument `LTRIM(string, characters)`/`RTRIM(string, characters)` form |
| `approx_functions.sql` | `APPROX_COUNT_DISTINCT`, `APPROX_PERCENTILE_CONT`/`APPROX_PERCENTILE_DISC` (2022) with `WITHIN GROUP (ORDER BY ...)` |
| `regexp_functions.sql` | `REGEXP_LIKE`/`REGEXP_REPLACE`/`REGEXP_SUBSTR`/`REGEXP_COUNT`/`REGEXP_INSTR` (2025), incl. flags, occurrence/group arguments, and use inside a `CHECK` constraint |
| `regexp_matches.sql` | `REGEXP_MATCHES` (2025) invoked directly as a `FROM` table source |
| `vector_type.sql` | `VECTOR(n)` column type (2025), vector string literals, `JSON_ARRAY(...)`, `DECLARE ... AS VECTOR(n)`, `VECTOR` procedure parameters, `ALTER DATABASE SCOPED CONFIGURATION SET PREVIEW_FEATURES` |
| `vector_distance.sql` | `VECTOR_DISTANCE('metric', v1, v2)` (2025) in a `SELECT` list, an assignment-select, `WHERE`, and `ORDER BY` |
| `vector_type_float16.sql` | `VECTOR(n, float16)` (2025), the two-argument form naming a half-precision base type, as a column type and in `DECLARE` |
| `ai_generate_embeddings.sql` | `AI_GENERATE_EMBEDDINGS(expr USE MODEL model [PARAMETERS @json])` (2025) in a `SELECT` list and an `UPDATE ... SET` |

## JSON and XML

| File | Constructs |
|---|---|
| `isjson.sql` | `ISJSON(expr)`, `ISJSON(expr, VALUE\|SCALAR)` (2022) |
| `json_data_type.sql` | native `json` column type (2025), `CHECK (JSON_PATH_EXISTS(...) = 1)`, `DECLARE @x JSON = '...'`, `UPDATE ... SET col.modify(...)` on a json column |
| `json_value_query.sql` | `JSON_VALUE` scalar extraction incl. computed columns and `RETURNING type` (2025); `JSON_QUERY` object/array extraction incl. embedding in `FOR JSON PATH` and `WITH ARRAY WRAPPER` (2025) |
| `json_object_array.sql` | `JSON_OBJECT('key' : value, ...)` and `JSON_ARRAY(...)` construction (2022), incl. empty, `NULL ON NULL`/`ABSENT ON NULL`, `RETURNING json`, variable keys and a scalar-subquery value |
| `json_modify.sql` | `JSON_MODIFY` update/insert/delete/append, nested `JSON_MODIFY(JSON_MODIFY(...))`, `UPDATE ... SET col = JSON_MODIFY(...)` |
| `json_path_exists.sql` | `JSON_PATH_EXISTS`, incl. a wildcard path (`$.info.address[*].town`) |
| `openjson.sql` | `OPENJSON(expr)` default key/value/type rowset, `INNER JOIN`/`CROSS APPLY OPENJSON(...)`, and the explicit `WITH (name type 'path' [AS JSON], ...)` schema in `FROM` and `CROSS APPLY` |
| `for_json.sql` | `FOR JSON AUTO` (incl. a temp-table `RIGHT JOIN`) and `FOR JSON PATH` (dot-alias nesting, multi-table join) |
| `for_xml.sql` | `FOR XML AUTO`/`ELEMENTS`/`TYPE, XMLSCHEMA, ELEMENTS XSINIL`, `CAST((SELECT ... FOR XML PATH('')) AS VARCHAR(MAX))` |
| `xml_methods.sql` | xml `.value()`, `.query()`, `.nodes()`, `.exist()` against variables and columns |
| `xml_dml.sql` | XML DML `insert`/`replace value of` via `SET @var.modify(...)` and `UPDATE ... SET col.modify(...)` |
| `xmlnamespaces_nodes.sql` | `WITH XMLNAMESPACES ('uri' AS prefix)` before a `SELECT` using `.nodes()` in `CROSS APPLY` and `.value()`/`.query()` |

## Formatter parity inputs

`create_table_basic.sql` and the eight `case_expression_tiers.sql`-style files above are a T-SQL
formatter's parity inputs, one statement group per file, copied verbatim.

Everything above that originated from a T-SQL linter's own rule-category test suite (best
practice, deprecated syntax, execution issues, miscellaneous, naming, performance, script
structure, style) has been split into the many small, per-construct files listed in the tables
above, keeping only the SQL shapes that exercise a parser path not already covered elsewhere in
this directory — the lint rule each snippet originally tested is not relevant to a grammar's
fixture corpus. Two of the source snippets were never valid T-SQL to begin with and were left out
entirely: a deliberately unterminated string literal, and a scalar function whose body is a bare
`RETURN` without `BEGIN`/`END`. Both are inputs the linter tolerates, not syntax SQL Server
accepts. Three more were dropped as out of scope rather than modeled: `COMPUTE` and the
`*=`/`=*` outer-join operators are syntax SQL Server removed outright (compatibility level 90 and
SQL Server 2012), nothing the grammar's consumers run can execute them, and no corpus shows them.

## Not parsed on purpose

Every file above parses with zero `ERROR`/`MISSING` nodes; nothing is pending. The T-SQL shapes
the grammar knowingly leaves out, so a new fixture does not go looking for a rule that was
decided against. `../../docs/accepted-gaps.md` consolidates this table alongside the grammar's
known over-acceptances (constructs accepted here that SQL Server itself rejects):

| Construct | Why |
|---|---|
| `COMPUTE`, the `*=`/`=*` outer-join operators | Removed from SQL Server; out of scope (see above) |
| `FROM a HASH JOIN b`, `LOOP JOIN`, `MERGE JOIN`, `REMOTE JOIN` — a physical join hint with no join type | With no join type the hint word sits where an AS-less alias goes, so `FROM dbo.t hash` would stop parsing and `FROM dbo.a remote JOIN dbo.b` would silently lose its alias; and after an unterminated `FROM`, `MERGE` is also the start of a `MERGE` statement, a fork that tripled `generate` time. `INNER HASH JOIN` and the other typed forms parse. |
| `WRITETEXT BULK ...`, `BACKUP ... MIRROR TO`, `KILL STATS JOB`/`KILL QUERY NOTIFICATION` | Rare sub-forms of deprecated or console statements, not modeled |
| `EXEC p 1 + 2`, `EXEC p @a = 1, 2` | Rejected here because SQL Server rejects them: a procedure argument is a constant, a variable or `DEFAULT`, and a positional argument cannot follow a named one (Msg 119) |
| `(SELECT TOP 1 a FROM t ORDER BY a) UNION ALL (SELECT TOP 1 b FROM u ORDER BY b)` — a parenthesized union branch with its own `ORDER BY` alongside `TOP`/`OFFSET`/`FETCH` | Not modeled either way; not a new gap from the `query_specification` split — this already failed to parse before that rule existed |
| `ALTER MESSAGE TYPE` | Service Broker message types have no `ALTER` statement in real SQL Server — only `CREATE`/`DROP` — so this is deliberately absent, unlike the other six object kinds `CREATE MESSAGE TYPE`'s siblings gained an `ALTER` for |
