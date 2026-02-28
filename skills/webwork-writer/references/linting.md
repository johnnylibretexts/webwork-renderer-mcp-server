# Lint and Render Checks (MCP Tools)

All rendering and validation is done through MCP tools — no local renderer or scripts needed.

## Quick Syntax Check

Use `webwork_validate_syntax` for fast pass/fail validation while iterating:

- Pass the full PG/PGML source code as `problemSource`.
- Returns a pass/fail result with any syntax errors or warnings.
- Faster than a full render — use this for quick checks during development.

## Full Render

Use `webwork_render_problem` to render the problem and inspect output:

- Pass `problemSource` with the full PG/PGML source code.
- Optionally set `problemSeed` (defaults to random).
- Returns `renderedHTML`, `flags`, `debug`, and `problem_result`.
- Check these fields for issues:
  - `flags.error_flag` — indicates a rendering error.
  - `debug.pg_warn` — Perl/PG warnings.
  - `debug.internal` — internal renderer messages.
  - `problem_result.errors` — problem-level errors.

## Answer Verification

Use `webwork_check_answer` to verify that expected answers are graded correctly:

- Pass `problemSource`, `answers` (a map of answer IDs to values), and optionally `problemSeed`.
- Returns grading results for each submitted answer.

## Multi-Seed Testing

Use `webwork_render_multi_seed` when the problem uses randomization:

- Pass `problemSource` and optionally `numSeeds` (default: 10) and `seeds` (specific seeds to test).
- Renders the problem across multiple random seeds.
- Reports any seeds that produce errors or warnings.
- Use this to catch edge cases in randomized problems (e.g., division by zero for certain coefficient combinations).

## Lint Notes

- PGML parses once; avoid tag wrapper syntax inside Perl strings.
- Use `[$var]*` when a variable contains HTML spans.
- Avoid `<table>`, `<tr>`, `<td>` in PGML (blocked by whitelist).
