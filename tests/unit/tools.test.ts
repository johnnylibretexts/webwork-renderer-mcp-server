import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the renderer client for all tool tests
const mockRenderProblem = vi.fn();
vi.mock('../../src/renderer-client.js', () => ({
  renderProblem: (...args: unknown[]) => mockRenderProblem(...args),
}));

import { handleRenderProblem } from '../../src/tools/render.js';
import { handleValidateSyntax } from '../../src/tools/validate.js';
import { handleRenderMultiSeed } from '../../src/tools/multi-seed.js';
import { handleCheckAnswer } from '../../src/tools/check-answer.js';
import { handleListMacros } from '../../src/tools/list-macros.js';

const successResult = {
  renderedHTML: '<p>Hello</p>',
  answers: { AnSwEr0001: { correct_value: '42', type: 'Real' } },
  errors: [],
  warnings: [],
  flags: {},
  raw: {
    answers: { AnSwEr0001: { correct_value: '42', type: 'Real', score: 1 } },
  },
};

const errorResult = {
  renderedHTML: '',
  answers: {},
  errors: ['Perl syntax error at line 5: missing semicolon'],
  warnings: [],
  flags: {},
  raw: {},
};

beforeEach(() => {
  mockRenderProblem.mockReset();
});

describe('handleRenderProblem', () => {
  it('returns rendered HTML and answer data on success', async () => {
    mockRenderProblem.mockResolvedValue(successResult);
    const result = await handleRenderProblem({ pgCode: 'DOCUMENT();', seed: 1 });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Render Result');
    expect(result.content[0].text).toContain('<p>Hello</p>');
    expect(result.content[0].text).toContain('AnSwEr0001');
    expect(result.content[0].text).toContain('42');
  });

  it('returns errors on render failure', async () => {
    mockRenderProblem.mockResolvedValue(errorResult);
    const result = await handleRenderProblem({ pgCode: 'bad code' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Errors');
    expect(result.content[0].text).toContain('syntax error');
  });

  it('handles renderer exceptions', async () => {
    mockRenderProblem.mockRejectedValue(new Error('Connection refused'));
    const result = await handleRenderProblem({ pgCode: 'x' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Connection refused');
  });
});

describe('handleValidateSyntax', () => {
  it('returns PASS for valid code', async () => {
    mockRenderProblem.mockResolvedValue(successResult);
    const result = await handleValidateSyntax({ pgCode: 'DOCUMENT();' });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('PASS');
  });

  it('returns FAIL for invalid code', async () => {
    mockRenderProblem.mockResolvedValue(errorResult);
    const result = await handleValidateSyntax({ pgCode: 'bad' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('FAIL');
  });
});

describe('handleRenderMultiSeed', () => {
  it('reports all seeds passing', async () => {
    mockRenderProblem.mockResolvedValue(successResult);
    const result = await handleRenderMultiSeed({ pgCode: 'x', seeds: [1, 2, 3] });
    expect(result.content[0].text).toContain('3/3 passed');
    expect(result.isError).toBeFalsy();
  });

  it('reports failing seeds', async () => {
    mockRenderProblem
      .mockResolvedValueOnce(successResult)
      .mockResolvedValueOnce(errorResult)
      .mockResolvedValueOnce(successResult);
    const result = await handleRenderMultiSeed({ pgCode: 'x', seeds: [1, 2, 3] });
    expect(result.content[0].text).toContain('2/3 passed');
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Seed 2');
  });

  it('uses default 5 seeds when none provided', async () => {
    mockRenderProblem.mockResolvedValue(successResult);
    await handleRenderMultiSeed({ pgCode: 'x' });
    expect(mockRenderProblem).toHaveBeenCalledTimes(5);
  });

  it('respects count parameter', async () => {
    mockRenderProblem.mockResolvedValue(successResult);
    await handleRenderMultiSeed({ pgCode: 'x', count: 3 });
    expect(mockRenderProblem).toHaveBeenCalledTimes(3);
  });
});

describe('handleCheckAnswer', () => {
  it('returns correctness for submitted answers', async () => {
    mockRenderProblem.mockResolvedValue(successResult);
    const result = await handleCheckAnswer({
      pgCode: 'x',
      seed: 1,
      answers: { AnSwEr0001: '42' },
    });
    expect(result.content[0].text).toContain('Answer Check');
    // Two calls: initial render + answer submission
    expect(mockRenderProblem).toHaveBeenCalledTimes(2);
  });

  it('fails early if initial render has errors', async () => {
    mockRenderProblem.mockResolvedValue(errorResult);
    const result = await handleCheckAnswer({
      pgCode: 'bad',
      seed: 1,
      answers: { AnSwEr0001: '42' },
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('render errors');
    // Only one call — should not attempt answer submission
    expect(mockRenderProblem).toHaveBeenCalledTimes(1);
  });
});

describe('handleListMacros', () => {
  it('returns all macros when no filter', async () => {
    const result = await handleListMacros({});
    expect(result.content[0].text).toContain('PGstandard.pl');
    expect(result.content[0].text).toContain('PGML.pl');
    expect(result.content[0].text).toContain('MathObjects.pl');
  });

  it('filters macros by name', async () => {
    const result = await handleListMacros({ filter: 'PGML' });
    expect(result.content[0].text).toContain('PGML.pl');
    expect(result.content[0].text).not.toContain('PGcourse.pl');
  });

  it('filters macros by description', async () => {
    const result = await handleListMacros({ filter: 'fraction' });
    expect(result.content[0].text).toContain('contextFraction.pl');
  });

  it('returns empty when no match', async () => {
    const result = await handleListMacros({ filter: 'zzz_nonexistent' });
    expect(result.content[0].text).toContain('0 found');
  });
});
