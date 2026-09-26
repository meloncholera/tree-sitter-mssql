import { comma_list, paren_list } from '../helpers.js';

// Encryption-key and certificate DDL (master, symmetric and asymmetric
// keys, certificates, OPEN / CLOSE ... KEY) and row-level security
// policies. Option names (ALGORITHM, KEY_SOURCE, SUBJECT, EXPIRY_DATE,
// STATE, ...) are identifiers through the shared option rule, the same as
// every other option list in this grammar.
export default {
  // { ENCRYPTION | DECRYPTION } BY encryptor
  encryption_mechanism: ($) =>
    seq(choice($.keyword_encryption, $.keyword_decryption), $.keyword_by, $._encryptor),

  // PASSWORD = 'x' | CERTIFICATE name | SYMMETRIC KEY name | ASYMMETRIC KEY name | SERVICE MASTER KEY
  _encryptor: ($) =>
    choice(
      $.option,
      seq($.keyword_certificate, $.identifier),
      seq(choice($.keyword_symmetric, $.keyword_asymmetric), $.keyword_key, $.identifier),
      seq($.keyword_service, $.keyword_master, $.keyword_key),
    ),

  // A continuation element of a CREATE SYMMETRIC KEY encryptor list (after
  // the mandatory head element — see `create_symmetric_key` below, which
  // aliases the head directly rather than through this rule). SQL Server
  // allows a continuation element to omit the `[ENCRYPTION | DECRYPTION]
  // BY` prefix, implicitly repeating the head's; the head itself may not
  // omit it. Both forms alias to `key_encryptor` so every element of the
  // list is the same node kind, unlike splicing a bare `_encryptor`
  // directly into the parent as a loose sibling.
  _key_encryptor_continuation: ($) =>
    choice(alias($.encryption_mechanism, $.key_encryptor), alias($._encryptor, $.key_encryptor)),

  // WITH PRIVATE KEY ( FILE = 'path' | BINARY = 0x..., { ENCRYPTION | DECRYPTION } BY PASSWORD = 'x' [, ...] )
  private_key_clause: ($) =>
    seq(
      $.keyword_with,
      $.keyword_private,
      $.keyword_key,
      paren_list(choice($.option, $.encryption_mechanism), true),
    ),

  // FROM { ASSEMBLY name | PROVIDER name | FILE = 'path' | BINARY = 0x... }
  // Shared by CREATE CERTIFICATE and CREATE ASYMMETRIC KEY; only the latter
  // takes PROVIDER, a knowing over-acceptance.
  _key_source: ($) =>
    seq(
      $.keyword_from,
      choice(
        seq($.keyword_assembly, $.identifier),
        seq($.keyword_provider, $.identifier),
        $.option,
      ),
    ),

  // ACTIVE FOR BEGIN_DIALOG = { ON | OFF }
  active_for_clause: ($) => seq($.keyword_active, $.keyword_for, $.option),

  // CREATE MASTER KEY [ENCRYPTION BY PASSWORD = 'password']
  // The password is mandatory on SQL Server and optional on Azure SQL
  // Database and Synapse, which protect the key themselves.
  create_master_key: ($) =>
    seq($.keyword_create, $.keyword_master, $.keyword_key, optional($.encryption_mechanism)),

  // ALTER MASTER KEY { [FORCE] REGENERATE WITH ENCRYPTION BY PASSWORD = 'x'
  //                  | { ADD | DROP } ENCRYPTION BY { SERVICE MASTER KEY | PASSWORD = 'x' } }
  alter_master_key: ($) =>
    seq(
      $.keyword_alter,
      $.keyword_master,
      $.keyword_key,
      choice(
        seq(
          optional($.keyword_force),
          $.keyword_regenerate,
          $.keyword_with,
          $.encryption_mechanism,
        ),
        seq(choice($.keyword_add, $.keyword_drop), $.encryption_mechanism),
      ),
    ),

  // DROP MASTER KEY
  drop_master_key: ($) => seq($.keyword_drop, $.keyword_master, $.keyword_key),

  // OPEN MASTER KEY DECRYPTION BY PASSWORD = 'x'
  // OPEN SYMMETRIC KEY name DECRYPTION BY encryptor [WITH PASSWORD = 'x']
  // prec.right: the trailing WITH is otherwise the next statement's CTE.
  //
  // MASTER, SYMMETRIC and ALL become keywords right after OPEN / CLOSE,
  // which is also the cursor-name slot of open_cursor_statement and
  // close_cursor_statement (index.js), so a cursor named `master`,
  // `symmetric` or `all` can no longer be opened or closed by its bare
  // name: `OPEN master` errors and `CLOSE master` yields a
  // close_key_statement with a missing KEY. The keyword is not valid after
  // GLOBAL or inside brackets, so `OPEN GLOBAL master` and `CLOSE [master]`
  // are the workarounds. Same collision class as `bulk` (index.js) and the
  // Service Broker verbs (service-broker.js).
  open_key_statement: ($) =>
    prec.right(
      seq(
        $.keyword_open,
        choice(
          seq($.keyword_master, $.keyword_key),
          seq($.keyword_symmetric, $.keyword_key, field('name', $.identifier)),
        ),
        $.encryption_mechanism,
        optional($.with_clause),
      ),
    ),

  // CLOSE MASTER KEY | CLOSE SYMMETRIC KEY name | CLOSE ALL SYMMETRIC KEYS
  close_key_statement: ($) =>
    seq(
      $.keyword_close,
      choice(
        seq($.keyword_master, $.keyword_key),
        seq($.keyword_symmetric, $.keyword_key, field('name', $.identifier)),
        seq($.keyword_all, $.keyword_symmetric, $.keyword_keys),
      ),
    ),

  // CREATE CERTIFICATE name [AUTHORIZATION user]
  //   { FROM source [WITH PRIVATE KEY (...)]
  //   | [ENCRYPTION BY PASSWORD = 'x'] WITH SUBJECT = 'x' [, START_DATE = 'x'] [, EXPIRY_DATE = 'x'] }
  //   [ACTIVE FOR BEGIN_DIALOG = { ON | OFF }]
  // The two branches are exclusive: a certificate is either loaded from an
  // existing source or generated with a subject, so they are separate
  // alternatives rather than independent optionals, and
  // test/corpus/errors.txt pins that the combination errors.
  create_certificate: ($) =>
    prec.right(
      seq(
        $.keyword_create,
        $.keyword_certificate,
        field('name', $.identifier),
        optional(seq($.keyword_authorization, $.identifier)),
        choice(
          seq($._key_source, optional($.private_key_clause)),
          seq(optional($.encryption_mechanism), $.with_clause),
        ),
        optional($.active_for_clause),
      ),
    ),

  // ALTER CERTIFICATE name { REMOVE PRIVATE KEY | WITH PRIVATE KEY (...) | WITH ACTIVE FOR BEGIN_DIALOG = { ON | OFF } }
  alter_certificate: ($) =>
    seq(
      $.keyword_alter,
      $.keyword_certificate,
      field('name', $.identifier),
      choice(
        seq($.keyword_remove, $.keyword_private, $.keyword_key),
        $.private_key_clause,
        seq($.keyword_with, $.active_for_clause),
      ),
    ),

  // DROP CERTIFICATE name
  drop_certificate: ($) => seq($.keyword_drop, $.keyword_certificate, field('name', $.identifier)),

  // CREATE SYMMETRIC KEY name [AUTHORIZATION owner] [FROM PROVIDER name]
  //   [WITH option [, ...]] [ENCRYPTION BY encryptor [, [ENCRYPTION BY] encryptor ...]]
  // `WITH ALGORITHM = AES_256 ENCRYPTION BY CERTIFICATE c` has no comma
  // before ENCRYPTION, so the encryptor list is its own clause after the
  // with_clause rather than one more option in it.
  create_symmetric_key: ($) =>
    prec.right(
      seq(
        $.keyword_create,
        $.keyword_symmetric,
        $.keyword_key,
        field('name', $.identifier),
        optional(seq($.keyword_authorization, $.identifier)),
        optional(seq($.keyword_from, $.keyword_provider, $.identifier)),
        optional($.with_clause),
        optional(
          seq(
            alias($.encryption_mechanism, $.key_encryptor),
            repeat(seq(',', $._key_encryptor_continuation)),
          ),
        ),
      ),
    ),

  // ALTER SYMMETRIC KEY name { ADD | DROP } ENCRYPTION BY encryptor
  alter_symmetric_key: ($) =>
    seq(
      $.keyword_alter,
      $.keyword_symmetric,
      $.keyword_key,
      field('name', $.identifier),
      choice($.keyword_add, $.keyword_drop),
      $.encryption_mechanism,
    ),

  // DROP SYMMETRIC KEY name [REMOVE PROVIDER KEY]
  drop_symmetric_key: ($) =>
    seq(
      $.keyword_drop,
      $.keyword_symmetric,
      $.keyword_key,
      field('name', $.identifier),
      optional(seq($.keyword_remove, $.keyword_provider, $.keyword_key)),
    ),

  // CREATE ASYMMETRIC KEY name [AUTHORIZATION owner]
  //   [FROM source] [WITH option [, ...]] [ENCRYPTION BY PASSWORD = 'x']
  // Unlike CREATE CERTIFICATE, FROM and WITH combine here: an EKM key is
  // `FROM PROVIDER p WITH PROVIDER_KEY_NAME = 'x', CREATION_DISPOSITION = y`.
  create_asymmetric_key: ($) =>
    prec.right(
      seq(
        $.keyword_create,
        $.keyword_asymmetric,
        $.keyword_key,
        field('name', $.identifier),
        optional(seq($.keyword_authorization, $.identifier)),
        optional($._key_source),
        optional($.with_clause),
        optional($.encryption_mechanism),
      ),
    ),

  // ALTER ASYMMETRIC KEY name { REMOVE PRIVATE KEY | WITH PRIVATE KEY (ENCRYPTION BY PASSWORD = 'x' [, DECRYPTION BY PASSWORD = 'y']) }
  alter_asymmetric_key: ($) =>
    seq(
      $.keyword_alter,
      $.keyword_asymmetric,
      $.keyword_key,
      field('name', $.identifier),
      choice(seq($.keyword_remove, $.keyword_private, $.keyword_key), $.private_key_clause),
    ),

  // DROP ASYMMETRIC KEY name [REMOVE PROVIDER KEY]
  drop_asymmetric_key: ($) =>
    seq(
      $.keyword_drop,
      $.keyword_asymmetric,
      $.keyword_key,
      field('name', $.identifier),
      optional(seq($.keyword_remove, $.keyword_provider, $.keyword_key)),
    ),

  // CREATE COLUMN ENCRYPTION KEY name WITH VALUES
  //   (COLUMN_MASTER_KEY = cmk, ALGORITHM = 'x', ENCRYPTED_VALUE = 0x...)
  //   [, (...)]                                            — Always Encrypted.
  // Each parenthesized group is one encrypted value of the key, one per
  // column master key it's encrypted under — usually one, two when
  // rotating to a new column master key. Each group is its own named
  // encryption_key_value node (not a bare paren_list of options flattened
  // into the parent) so a consumer pairing COLUMN_MASTER_KEY with its own
  // ENCRYPTED_VALUE during rotation has a group boundary to read the pair
  // from — otherwise two groups' options are indistinguishable siblings.
  create_column_encryption_key: ($) =>
    seq(
      $.keyword_create,
      $.keyword_column,
      $.keyword_encryption,
      $.keyword_key,
      field('name', $.identifier),
      $.keyword_with,
      $.keyword_values,
      comma_list($.encryption_key_value, true),
    ),

  encryption_key_value: ($) => paren_list($.option, true),

  // ALTER COLUMN ENCRYPTION KEY name { ADD | DROP } VALUE (COLUMN_MASTER_KEY = cmk [, ...])
  alter_column_encryption_key: ($) =>
    seq(
      $.keyword_alter,
      $.keyword_column,
      $.keyword_encryption,
      $.keyword_key,
      field('name', $.identifier),
      choice($.keyword_add, $.keyword_drop),
      $.keyword_value,
      $.encryption_key_value,
    ),

  // DROP COLUMN ENCRYPTION KEY name
  drop_column_encryption_key: ($) =>
    seq(
      $.keyword_drop,
      $.keyword_column,
      $.keyword_encryption,
      $.keyword_key,
      field('name', $.identifier),
    ),

  // CREATE COLUMN MASTER KEY name
  //   WITH (KEY_STORE_PROVIDER_NAME = 'x', KEY_PATH = 'x' [, ENCLAVE_COMPUTATIONS (...)])
  // No ALTER COLUMN MASTER KEY exists — SQL Server only lets one be created
  // or dropped, never modified in place.
  create_column_master_key: ($) =>
    seq(
      $.keyword_create,
      $.keyword_column,
      $.keyword_master,
      $.keyword_key,
      field('name', $.identifier),
      $.with_options,
    ),

  // DROP COLUMN MASTER KEY name
  drop_column_master_key: ($) =>
    seq(
      $.keyword_drop,
      $.keyword_column,
      $.keyword_master,
      $.keyword_key,
      field('name', $.identifier),
    ),

  // CREATE SECURITY POLICY name ADD predicate [, ...] [WITH (STATE = ON | OFF [, SCHEMABINDING = ON | OFF])] [NOT FOR REPLICATION]
  // Only ADD is valid here; ALTER and DROP predicates belong to ALTER
  // SECURITY POLICY. Both statements expose their predicates as
  // security_predicate nodes.
  create_security_policy: ($) =>
    prec.right(
      seq(
        $.keyword_create,
        $.keyword_security,
        $.keyword_policy,
        field('name', $.object_reference),
        comma_list(alias($._add_security_predicate, $.security_predicate), true),
        optional($.with_options),
        optional($._not_for_replication),
      ),
    ),

  // ALTER SECURITY POLICY name
  //   { predicate [, ...] [WITH (options)] [NOT FOR REPLICATION]
  //   | WITH (options) [NOT FOR REPLICATION]
  //   | NOT FOR REPLICATION }
  // At least one clause is required; a predicate here is ADD, ALTER or
  // DROP [FILTER | BLOCK] PREDICATE.
  alter_security_policy: ($) =>
    prec.right(
      seq(
        $.keyword_alter,
        $.keyword_security,
        $.keyword_policy,
        field('name', $.object_reference),
        choice(
          seq(
            comma_list(alias($._alter_security_predicate, $.security_predicate), true),
            optional($.with_options),
            optional($._not_for_replication),
          ),
          seq($.with_options, optional($._not_for_replication)),
          $._not_for_replication,
        ),
      ),
    ),

  // DROP SECURITY POLICY [IF EXISTS] name
  drop_security_policy: ($) =>
    seq(
      $.keyword_drop,
      $.keyword_security,
      $.keyword_policy,
      optional($._if_exists),
      field('name', $.object_reference),
    ),

  // ADD [FILTER | BLOCK] PREDICATE function(args) ON table [AFTER { INSERT | UPDATE } | BEFORE { UPDATE | DELETE }]
  _add_security_predicate: ($) => seq($.keyword_add, $._security_predicate_body),

  // { ADD | ALTER } [FILTER | BLOCK] PREDICATE function(args) ON table [...]
  // DROP [FILTER | BLOCK] PREDICATE ON table
  _alter_security_predicate: ($) =>
    choice(
      seq(choice($.keyword_add, $.keyword_alter), $._security_predicate_body),
      seq(
        $.keyword_drop,
        optional(choice($.keyword_filter, $.keyword_block)),
        $.keyword_predicate,
        $.keyword_on,
        field('table', $.object_reference),
      ),
    ),

  _security_predicate_body: ($) =>
    prec.right(
      seq(
        optional(choice($.keyword_filter, $.keyword_block)),
        $.keyword_predicate,
        field('function', $.invocation),
        $.keyword_on,
        field('table', $.object_reference),
        optional(
          choice(
            seq($.keyword_after, choice($.keyword_insert, $.keyword_update)),
            seq($.keyword_before, choice($.keyword_update, $.keyword_delete)),
          ),
        ),
      ),
    ),
};
