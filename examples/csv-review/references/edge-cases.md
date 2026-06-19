# CSV edge cases

- Preserve quoted newlines inside a field.
- Treat doubled quote characters as escaped quotes.
- Report rows with extra or missing columns instead of truncating them.
- Remove a UTF-8 byte order mark before interpreting the first header.
- Do not infer a numeric type when non-empty values fail numeric parsing.
