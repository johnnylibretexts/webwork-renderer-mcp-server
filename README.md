# WeBWorK MCP Renderer Server

An MCP (Model Context Protocol) server that connects AI tools like Claude Desktop, Claude Code, and Cursor to a hosted WeBWorK PG Renderer. This lets you write, render, and validate WeBWorK homework problems directly from your AI assistant — no local Perl or Docker setup required.

## What It Does

This server exposes 5 tools over MCP:

| Tool | What it does |
|------|-------------|
| `webwork_render_problem` | Renders PG/PGML source code and returns the HTML output, answer data, and errors |
| `webwork_validate_syntax` | Quick pass/fail syntax check — faster than a full render for iterating |
| `webwork_render_multi_seed` | Renders a problem across multiple random seeds to catch randomization bugs |
| `webwork_check_answer` | Submits answers to a problem and checks if they're correct |
| `webwork_list_macros` | Lists available WeBWorK PG macro files with descriptions |

## Architecture

```
Claude Desktop / Claude Code / Cursor
        │
        ▼  (MCP over HTTPS)
   Caddy reverse proxy (TLS)
        │
        ▼  (localhost:3001)
   MCP Server (Node.js + Express)
        │
        ▼  (localhost:3000)
   WeBWorK PG Renderer (Docker)
```

The MCP server is a stateless Streamable HTTP endpoint. Each request gets its own MCP transport — no sessions to manage.

## Client Setup

Once you have the server running (see Self-Hosting below), connect your AI tool to it.

### Claude Code

```bash
claude mcp add --transport http webwork-renderer \
  https://your-domain.example.com/mcp
```

### Claude Desktop

Claude Desktop doesn't natively support remote HTTP MCP servers in its config file. Use the `mcp-remote` bridge (requires Node.js 18+):

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "webwork-renderer": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-domain.example.com/mcp",
        "--transport",
        "http-only"
      ]
    }
  }
}
```

Restart Claude Desktop after saving. The first launch may take a moment while `npx` downloads `mcp-remote`.

### Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "webwork-renderer": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-domain.example.com/mcp",
        "--transport",
        "http-only"
      ]
    }
  }
}
```

## Recommended: WeBWorK Writer Skill

For the best experience, pair this MCP server with the **webwork-writer** skill. The MCP server gives Claude the *tools* to render and validate problems — the skill gives Claude the *knowledge* of PG/PGML authoring best practices, common pitfalls, and problem structure conventions.

### Claude Desktop

This repo includes an MCP-adapted version of the skill that uses the MCP tools directly (no local renderer needed):

1. Download [`skills/webwork-writer.zip`](skills/webwork-writer.zip) from this repo
2. In Claude Desktop, go to **Customize > Skills**, click **+**, and upload the ZIP

This is a modified version adapted for MCP tool usage. Original skill by [Neil R. Voss](https://github.com/vosslab) ([vosslab-skills](https://github.com/vosslab/vosslab-skills)).

### Claude Code

For Claude Code, use the upstream skill plugin which includes additional tooling:

```bash
claude plugin marketplace add https://github.com/vosslab/vosslab-skills
claude plugin install vosslab-skills
```

Then invoke it with `/vosslab-skills:webwork-writer`.

## Self-Hosting

### Prerequisites

- Node.js 22+
- Docker & Docker Compose
- A WeBWorK PG Renderer instance (e.g., [vosslab/webwork-pg-renderer](https://github.com/vosslab/webwork-pg-renderer))

### Setup

```bash
git clone https://github.com/johnnylibretexts/webwork-renderer-mcp-server.git
cd webwork-renderer-mcp-server
npm install
```

Create a `.env` file:

```env
PORT=3001
RENDERER_URL=http://localhost:3000
NODE_ENV=development
```

### Run the renderer

```bash
git clone https://github.com/vosslab/webwork-pg-renderer.git
cd webwork-pg-renderer
docker compose up -d
```

### Run the MCP server

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

### Tests

```bash
# Unit tests (no Docker required)
npm test

# Integration tests run automatically if the renderer is reachable at RENDERER_URL
```

## Test Prompts

Copy-paste these into Claude Desktop or Claude Code to verify everything works. Answers are included so you can check the results.

---

### Prompt 1: Simple Derivative

> Write a WeBWorK problem that asks students to find the derivative of f(x) = 3x^2 + 5x - 7. Render it to make sure it works, then check the answer.

**Expected answer**: `6x + 5`

Power rule: bring down the exponent and subtract 1. So 3x^2 becomes 6x, 5x becomes 5, and the constant -7 drops off.

---

### Prompt 2: Quadratic Equation

> Create a WeBWorK problem that asks students to solve x^2 - 5x + 6 = 0. Use PGML formatting. Render it and verify the correct answer.

**Expected answer**: `2, 3` (both roots)

Factors as (x - 2)(x - 3) = 0, so x = 2 or x = 3.

---

### Prompt 3: Multiple Choice

> Write a WeBWorK multiple choice problem asking: "What is the integral of 2x?" with options A) x^2, B) x^2 + C, C) 2, D) x. The correct answer should be B. Render it and confirm it works.

**Expected answer**: `B) x^2 + C`

The integral of 2x is x^2 plus an arbitrary constant C.

---

### Prompt 4: Fraction Arithmetic

> Create a WeBWorK problem that asks students to simplify 3/4 + 1/6. Use the contextFraction macro so the answer must be an exact fraction. Render and check the answer.

**Expected answer**: `11/12`

Common denominator is 12: 9/12 + 2/12 = 11/12.

---

### Prompt 5: Multi-Seed Stress Test

> Write a WeBWorK problem with randomized coefficients that asks students to compute the area of a rectangle with random integer sides between 1 and 20. Render it across 10 different seeds to make sure no seed produces errors.

**Expected answer**: Varies by seed (it's randomized). The render should pass on all 10 seeds with no errors.

---

### Prompt 6: System Check

> Use the webwork_list_macros tool to show me all available macros, then validate this code:
>
> ```
> DOCUMENT();
> loadMacros("PGstandard.pl", "PGML.pl", "MathObjects.pl", "PGcourse.pl");
> TEXT(beginproblem());
> Context("Numeric");
> $answer = Compute("42");
> BEGIN_PGML
> What is the answer to life, the universe, and everything?
> [_____]{$answer}
> END_PGML
> ENDDOCUMENT();
> ```

**Expected answer**: `42`. The validation should pass with no errors.

---

## Acknowledgments

This project is built on top of the work of **[Neil R. Voss](https://github.com/vosslab)** (Associate Professor of Biology, Roosevelt University):

- **[webwork-pg-renderer](https://github.com/vosslab/webwork-pg-renderer)** — The WeBWorK PG rendering engine that powers this MCP server. This project would not exist without it.
- **[vosslab-skills](https://github.com/vosslab/vosslab-skills)** — The `webwork-writer` Claude skill and its extensive reference documentation on PG/PGML authoring, common pitfalls, and renderer API usage informed the design of this server's tools and error handling.

The WeBWorK PG system itself is developed by the [openwebwork](https://github.com/openwebwork) community. The original [WeBWorK2](https://github.com/openwebwork/webwork2) open-source homework platform has been serving students and instructors since the mid-1990s.

## License

This project is licensed under the **GNU General Public License v3.0** (GPLv3), consistent with the upstream [webwork-pg-renderer](https://github.com/vosslab/webwork-pg-renderer) project. See [LICENSE](LICENSE) for details.
