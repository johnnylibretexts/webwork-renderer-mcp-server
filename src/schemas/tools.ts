import { z } from 'zod';

export const RenderProblemSchema = z.object({
  pgCode: z.string().describe('WeBWorK PG/PGML source code to render'),
  seed: z
    .number()
    .int()
    .min(1)
    .max(9999)
    .optional()
    .describe('Random seed (1-9999). Defaults to a random value.'),
});

export const ValidateSyntaxSchema = z.object({
  pgCode: z.string().describe('WeBWorK PG/PGML source code to validate'),
});

export const RenderMultiSeedSchema = z.object({
  pgCode: z.string().describe('WeBWorK PG/PGML source code to render across multiple seeds'),
  seeds: z
    .array(z.number().int().min(1).max(9999))
    .optional()
    .describe('Specific seeds to test. Defaults to [1, 2, 3, 4, 5].'),
  count: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe('Number of random seeds to test (ignored if seeds is provided). Max 20.'),
});

export const CheckAnswerSchema = z.object({
  pgCode: z.string().describe('WeBWorK PG/PGML source code'),
  seed: z.number().int().min(1).max(9999).describe('Seed used for rendering'),
  answers: z
    .record(z.string(), z.string())
    .describe('Map of answer blank names to submitted answer strings (e.g. {"AnSwEr0001": "42"})'),
});

export const ListMacrosSchema = z.object({
  filter: z
    .string()
    .optional()
    .describe('Substring to filter macro names (e.g. "PGML" to find PGML-related macros)'),
});
