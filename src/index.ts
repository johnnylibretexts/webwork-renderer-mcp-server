import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { authMiddleware } from './auth.js';
import { PORT } from './constants.js';
import { checkRendererHealth } from './renderer-client.js';
import { handleRenderProblem } from './tools/render.js';
import { handleValidateSyntax } from './tools/validate.js';
import { handleRenderMultiSeed } from './tools/multi-seed.js';
import { handleCheckAnswer } from './tools/check-answer.js';
import { handleListMacros } from './tools/list-macros.js';
import {
  RenderProblemSchema,
  ValidateSyntaxSchema,
  RenderMultiSeedSchema,
  CheckAnswerSchema,
  ListMacrosSchema,
} from './schemas/tools.js';

function createServer(): McpServer {
  const server = new McpServer(
    {
      name: 'webwork-renderer',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.tool(
    'webwork_render_problem',
    'Render WeBWorK PG/PGML source code and return the HTML output, answer data, and any errors. Use this to test and validate WeBWorK homework problems.',
    RenderProblemSchema.shape,
    async (args) => handleRenderProblem(args),
  );

  server.tool(
    'webwork_validate_syntax',
    'Quick syntax check for WeBWorK PG/PGML code. Returns pass/fail with error details. Faster than a full render for iterative debugging.',
    ValidateSyntaxSchema.shape,
    async (args) => handleValidateSyntax(args),
  );

  server.tool(
    'webwork_render_multi_seed',
    'Render the same WeBWorK problem across multiple random seeds to catch randomization bugs (e.g. division by zero on certain seeds).',
    RenderMultiSeedSchema.shape,
    async (args) => handleRenderMultiSeed(args),
  );

  server.tool(
    'webwork_check_answer',
    'Submit answers to a WeBWorK problem and check correctness. Renders the problem at the given seed, then submits the provided answers for grading.',
    CheckAnswerSchema.shape,
    async (args) => handleCheckAnswer(args),
  );

  server.tool(
    'webwork_list_macros',
    'List available WeBWorK PG macro files with descriptions. Optionally filter by name or description substring.',
    ListMacrosSchema.shape,
    async (args) => handleListMacros(args),
  );

  return server;
}

const host = process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0';
const app = createMcpExpressApp({ host });

// Health check endpoint (no auth required)
app.get('/health', async (_req, res) => {
  const rendererUp = await checkRendererHealth();
  res.status(rendererUp ? 200 : 503).json({
    status: rendererUp ? 'ok' : 'degraded',
    renderer: rendererUp ? 'connected' : 'unreachable',
    timestamp: new Date().toISOString(),
  });
});

// Auth middleware for MCP routes
app.use('/mcp', authMiddleware);

// MCP Streamable HTTP endpoint — stateless mode (new transport per request)
app.post('/mcp', async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Handle GET for SSE streams (required by protocol but we're stateless)
app.get('/mcp', async (_req, res) => {
  res.status(405).json({ error: 'SSE not supported in stateless mode. Use POST.' });
});

// Handle DELETE for session termination (not applicable in stateless mode)
app.delete('/mcp', async (_req, res) => {
  res.status(405).json({ error: 'Session termination not supported in stateless mode.' });
});

app.listen(PORT, host, () => {
  console.log(`WeBWorK MCP server listening on http://${host}:${PORT}`);
  console.log(`Health check: http://${host}:${PORT}/health`);
  console.log(`MCP endpoint: http://${host}:${PORT}/mcp`);
});
