# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0](https://github.com/meloncholic/tree-sitter-mssql/compare/v0.1.6...v0.2.0) - 2026-09-26

### Added

- publish prebuilt native addons and WASM, add fuzzing and a perf summary ([#39](https://github.com/meloncholic/tree-sitter-mssql/pull/39))
- [**breaking**] group GO-separated statements into a batch node, add query files ([#33](https://github.com/meloncholic/tree-sitter-mssql/pull/33))

### Fixed

- *(grammar)* add missing DDL statements and fix trailing-clause bugs ([#32](https://github.com/meloncholic/tree-sitter-mssql/pull/32))
- *(grammar)* give union branches a visible boundary and fix two DML gaps ([#29](https://github.com/meloncholic/tree-sitter-mssql/pull/29))
- *(grammar)* unify DML write-target modeling and fix two DDL gaps ([#25](https://github.com/meloncholic/tree-sitter-mssql/pull/25))
- *(grammar)* correct operator precedence and identifier/alias typing ([#22](https://github.com/meloncholic/tree-sitter-mssql/pull/22))

### Other

- drop macOS from the release prebuild matrix ([#40](https://github.com/meloncholic/tree-sitter-mssql/pull/40))
- clean up grammar structure, field tagging, and JS tooling ([#38](https://github.com/meloncholic/tree-sitter-mssql/pull/38))
- add consumer-facing usage docs and node-kind stability metadata ([#37](https://github.com/meloncholic/tree-sitter-mssql/pull/37))
- remove .npmrc from the tree ([#36](https://github.com/meloncholic/tree-sitter-mssql/pull/36))
- scope gitattributes and editorconfig to tracked file types ([#35](https://github.com/meloncholic/tree-sitter-mssql/pull/35))
- sync .gitattributes and .editorconfig with org template ([#34](https://github.com/meloncholic/tree-sitter-mssql/pull/34))

## [0.1.6](https://github.com/meloncholic/tree-sitter-mssql/compare/v0.1.5...v0.1.6) - 2026-09-12

### Added

- *(grammar)* add column security, column-level GRANT, and resumable index DDL ([#13](https://github.com/meloncholic/tree-sitter-mssql/pull/13))

### Fixed

- *(node)* correct binding package contract ([#16](https://github.com/meloncholic/tree-sitter-mssql/pull/16))

### Other

- *(release)* verify package contents before publishing ([#15](https://github.com/meloncholic/tree-sitter-mssql/pull/15))
- *(tooling)* adopt Rust 2024 ([#14](https://github.com/meloncholic/tree-sitter-mssql/pull/14))
- *(grammar)* move select trailing clauses off FROM, add named windows
- *(deps)* bump cargo-bins/cargo-binstall from 1.22.0 to 1.23.0 in the github-actions group across 1 directory ([#1](https://github.com/meloncholic/tree-sitter-mssql/pull/1))

## [0.1.5](https://github.com/meloncholic/tree-sitter-mssql/compare/v0.1.4...v0.1.5) - 2026-09-08

### Added

- parse ALTER TABLE SWITCH PARTITION, the $PARTITION pseudo-function, and graph table MATCH querying ([#8](https://github.com/meloncholic/tree-sitter-mssql/pull/8))
- parse FOR SYSTEM_TIME, AT TIME ZONE, TABLESAMPLE, and rowset function coverage ([#5](https://github.com/meloncholic/tree-sitter-mssql/pull/5))

### Fixed

- *(grammar)* correct identifier and multipart-name parsing, dedup helpers ([#3](https://github.com/meloncholic/tree-sitter-mssql/pull/3))

### Other

- *(docs)* correct LICENSE copyright name ([#4](https://github.com/meloncholic/tree-sitter-mssql/pull/4))
- promote dev to main ([#6](https://github.com/meloncholic/tree-sitter-mssql/pull/6))
- sync dev from main ([#7](https://github.com/meloncholic/tree-sitter-mssql/pull/7))
