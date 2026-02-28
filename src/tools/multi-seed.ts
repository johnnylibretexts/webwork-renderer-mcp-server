import { renderProblem } from '../renderer-client.js';

export async function handleRenderMultiSeed(args: {
  pgCode: string;
  seeds?: number[];
  count?: number;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  let seeds: number[];

  if (args.seeds && args.seeds.length > 0) {
    seeds = args.seeds;
  } else {
    const count = args.count ?? 5;
    seeds = Array.from({ length: count }, (_, i) => i + 1);
  }

  try {
    const results = await Promise.all(
      seeds.map(async (seed) => {
        try {
          const result = await renderProblem(args.pgCode, { seed });
          return { seed, success: result.errors.length === 0, errors: result.errors, answers: result.answers };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { seed, success: false, errors: [message], answers: {} };
        }
      }),
    );

    const succeeded = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    const sections: string[] = [];
    sections.push(`## Multi-Seed Render: ${succeeded.length}/${results.length} passed`);

    if (succeeded.length > 0) {
      sections.push(`### Successful Seeds\n${succeeded.map((r) => {
        const answerSummary = Object.entries(r.answers)
          .map(([name, info]) => `${name}=${info.correct_value}`)
          .join(', ');
        return `- Seed ${r.seed}: ${answerSummary || 'no answer blanks'}`;
      }).join('\n')}`);
    }

    if (failed.length > 0) {
      sections.push(`### Failed Seeds\n${failed.map((r) =>
        `- Seed ${r.seed}: ${r.errors.join('; ')}`,
      ).join('\n')}`);
    }

    return {
      content: [{ type: 'text', text: sections.join('\n\n') }],
      isError: failed.length > 0,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `## Multi-Seed Render Failed\n\n${message}` }],
      isError: true,
    };
  }
}
