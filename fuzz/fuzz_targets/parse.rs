#![no_main]

use libfuzzer_sys::fuzz_target;
use tree_sitter::Parser;

// Parses arbitrary bytes with this grammar and asserts only that it doesn't
// panic or hang — not that the result is a valid or error-free tree. This
// exercises src/scanner.c (the only hand-written C in an otherwise generated
// parser) against input nobody thought to write a corpus case for.
fuzz_target!(|data: &[u8]| {
    let Ok(source) = std::str::from_utf8(data) else {
        return;
    };
    let mut parser = Parser::new();
    parser
        .set_language(&tree_sitter_mssql::LANGUAGE.into())
        .expect("Error loading T-SQL parser");
    let _ = parser.parse(source, None);
});
