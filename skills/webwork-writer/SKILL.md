---
name: webwork-writer
description: Create, edit, and lint WeBWorK PG/PGML questions following docs/webwork guidance, HTML whitelist constraints, and MCP tool-based rendering and validation.
---

# WebWork Question Authoring (MCP Edition)

Adapted from [webwork-writer](https://github.com/vosslab/vosslab-skills) by Neil R. Voss (vosslab-skills). Modified to use MCP tools for rendering and validation instead of a local renderer.

## Overview

Use this skill to author or adjust PG/PGML problems using the WeBWorK MCP renderer tools and the docs in references/.

## Workflow

1) Identify the target repo and file, then read the relevant doc references.
2) Apply the PGML structure and rules from the WebWork author guide.
3) Make edits in the problem file and update docs/CHANGELOG.md in the target repo.
4) Use `webwork_render_problem` to render the problem and visually confirm layout and checkbox behavior.
5) Use `webwork_validate_syntax` for quick pass/fail syntax checks when iterating on PGML changes.
6) Use `webwork_check_answer` to verify that expected answers are graded correctly.
7) Use `webwork_render_multi_seed` to test across multiple random seeds when the problem uses randomization.

## MCP Tools Reference

| Tool | Purpose |
|------|---------|
| `webwork_render_problem` | Full render — returns HTML output, answer data, and any errors/warnings |
| `webwork_validate_syntax` | Quick syntax check — faster than a full render for iterating |
| `webwork_render_multi_seed` | Render across multiple seeds to catch randomization bugs |
| `webwork_check_answer` | Submit answers and check if they're graded correctly |
| `webwork_list_macros` | List available WeBWorK PG macro files |

## Core Rules (from repo docs)

- Use PGML-first structure with inline grading; keep setup, answers, and PGML text in separate sections.
- PGML is single-pass: do not build PGML tag wrappers inside Perl strings. If a variable contains HTML, render it with `[$var]*`.
- HTML whitelist blocks `table`, `tr`, `td`; use flexbox divs or niceTables instead.
- For matching problems on PG 2.17, use PopUp widgets and HTML-only `MODES(TeX => '', HTML => ...)` wrappers for layout.
- Prefer local `PGrandom` seeded with `problemSeed` for deterministic randomization; avoid `SRAND` unless you want to reset the global RNG; sort hash keys before random selection.
- Avoid MathJax color macros; use HTML spans and CSS for color.
- Always render with `webwork_render_problem` to visually confirm layout and checkbox behavior before reporting results.
- After rendering with `webwork_render_problem`, always create an HTML artifact (type: `text/html`) that displays the rendered problem in the browser. Take the `renderedHTML` from the render response and put it directly into the artifact as a complete HTML page — do NOT show the raw HTML as a code block. The user should see the problem as a student would see it, with MathJax rendering and input fields.

## Reference Files

- Read references/repos.md to locate local repos and paths.
- Read references/docs.md for the required WebWork authoring docs.
- Read references/linting.md for MCP tool-based rendering and validation workflows.
- Check bundled reference docs and examples; render them when needed to confirm renderer capabilities (for example, whether a macro is present).

## Notes

- Keep solution text plain when exporting to systems that do not render HTML.
- For matching problems, use the PG 2.17-safe patterns documented in docs/webwork.
