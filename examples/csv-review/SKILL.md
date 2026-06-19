---
name: csv-review
description: Reviews CSV datasets, validates structure, and produces evidence-based summaries. Use when a user needs to inspect, clean, or summarize CSV files.
license: MIT
compatibility: Requires a runtime capable of reading UTF-8 text files.
metadata:
  author: skillcheck
  version: "1.0.0"
---
# CSV review

## Workflow

1. Confirm the input exists and is a delimited text file.
2. Detect the delimiter and character encoding before parsing rows.
3. Validate that every row has the expected number of columns.
4. Report missing values, duplicate rows, and inconsistent column types.
5. Return a concise summary with row counts and representative evidence.

Read [the edge-case guide](references/edge-cases.md) when the input contains
multiline fields, inconsistent quoting, or malformed rows.

## Output

Include the detected delimiter, encoding, row and column counts, validation
failures, and any transformations performed. Never silently discard malformed
rows.
