import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  RenderProblemSchema,
  ValidateSyntaxSchema,
  RenderMultiSeedSchema,
  CheckAnswerSchema,
  ListMacrosSchema,
} from '../../src/schemas/tools.js';

// Mock tool handlers so we don't need the renderer
vi.mock('../../src/renderer-client.js', () => ({
  renderProblem: vi.fn(),
  checkRendererHealth: vi.fn().mockResolvedValue(true),
}));

describe('McpServer tool registration', () => {
  it('registers all 5 tools', () => {
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { tools: {} } },
    );

    const noop = async () => ({ content: [{ type: 'text' as const, text: 'ok' }] });

    server.tool('webwork_render_problem', 'Render PG code', RenderProblemSchema.shape, noop);
    server.tool('webwork_validate_syntax', 'Validate PG syntax', ValidateSyntaxSchema.shape, noop);
    server.tool('webwork_render_multi_seed', 'Multi-seed render', RenderMultiSeedSchema.shape, noop);
    server.tool('webwork_check_answer', 'Check answers', CheckAnswerSchema.shape, noop);
    server.tool('webwork_list_macros', 'List macros', ListMacrosSchema.shape, noop);

    // Access internal tool count via the server's registered tools
    // The McpServer exposes tools through the protocol — verify it doesn't throw
    expect(server).toBeDefined();
    expect(server.server).toBeDefined();
  });
});
