import { describe, it, expect } from 'vitest';
import {
  RenderProblemSchema,
  ValidateSyntaxSchema,
  RenderMultiSeedSchema,
  CheckAnswerSchema,
  ListMacrosSchema,
} from '../../src/schemas/tools.js';

describe('RenderProblemSchema', () => {
  it('accepts valid pgCode with no seed', () => {
    const result = RenderProblemSchema.safeParse({ pgCode: 'DOCUMENT();' });
    expect(result.success).toBe(true);
  });

  it('accepts pgCode with a valid seed', () => {
    const result = RenderProblemSchema.safeParse({ pgCode: 'DOCUMENT();', seed: 42 });
    expect(result.success).toBe(true);
  });

  it('rejects missing pgCode', () => {
    const result = RenderProblemSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects seed outside range', () => {
    expect(RenderProblemSchema.safeParse({ pgCode: 'x', seed: 0 }).success).toBe(false);
    expect(RenderProblemSchema.safeParse({ pgCode: 'x', seed: 10000 }).success).toBe(false);
  });

  it('rejects non-integer seed', () => {
    const result = RenderProblemSchema.safeParse({ pgCode: 'x', seed: 3.14 });
    expect(result.success).toBe(false);
  });
});

describe('ValidateSyntaxSchema', () => {
  it('accepts valid pgCode', () => {
    const result = ValidateSyntaxSchema.safeParse({ pgCode: 'DOCUMENT();' });
    expect(result.success).toBe(true);
  });

  it('rejects missing pgCode', () => {
    const result = ValidateSyntaxSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('RenderMultiSeedSchema', () => {
  it('accepts pgCode only (defaults apply)', () => {
    const result = RenderMultiSeedSchema.safeParse({ pgCode: 'DOCUMENT();' });
    expect(result.success).toBe(true);
  });

  it('accepts explicit seeds array', () => {
    const result = RenderMultiSeedSchema.safeParse({ pgCode: 'x', seeds: [1, 100, 9999] });
    expect(result.success).toBe(true);
  });

  it('accepts count parameter', () => {
    const result = RenderMultiSeedSchema.safeParse({ pgCode: 'x', count: 10 });
    expect(result.success).toBe(true);
  });

  it('rejects count over 20', () => {
    const result = RenderMultiSeedSchema.safeParse({ pgCode: 'x', count: 21 });
    expect(result.success).toBe(false);
  });

  it('rejects seeds outside range', () => {
    const result = RenderMultiSeedSchema.safeParse({ pgCode: 'x', seeds: [0] });
    expect(result.success).toBe(false);
  });
});

describe('CheckAnswerSchema', () => {
  it('accepts valid input', () => {
    const result = CheckAnswerSchema.safeParse({
      pgCode: 'DOCUMENT();',
      seed: 1,
      answers: { AnSwEr0001: '42' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing seed', () => {
    const result = CheckAnswerSchema.safeParse({
      pgCode: 'x',
      answers: { AnSwEr0001: '42' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing answers', () => {
    const result = CheckAnswerSchema.safeParse({
      pgCode: 'x',
      seed: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe('ListMacrosSchema', () => {
  it('accepts empty input', () => {
    const result = ListMacrosSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts filter string', () => {
    const result = ListMacrosSchema.safeParse({ filter: 'PGML' });
    expect(result.success).toBe(true);
  });
});
