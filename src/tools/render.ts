import { renderProblem } from '../renderer-client.js';

export async function handleRenderProblem(args: {
  pgCode: string;
  seed?: number;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const seed = args.seed ?? Math.floor(Math.random() * 9999) + 1;

  try {
    const result = await renderProblem(args.pgCode, { seed });

    const sections: string[] = [];

    sections.push(`## Render Result (seed: ${seed})`);

    if (result.errors.length > 0) {
      sections.push(`### Errors\n${result.errors.map((e) => `- ${e}`).join('\n')}`);
    }

    if (result.warnings.length > 0) {
      sections.push(`### Warnings\n${result.warnings.map((w) => `- ${w}`).join('\n')}`);
    }

    if (result.renderedHTML) {
      sections.push(`### Rendered HTML\n\`\`\`html\n${result.renderedHTML}\n\`\`\``);
    }

    if (Object.keys(result.answers).length > 0) {
      sections.push(`### Answer Blanks`);
      for (const [name, info] of Object.entries(result.answers)) {
        sections.push(`- **${name}**: correct answer = \`${info.correct_value}\` (type: ${info.type})`);
      }
    }

    const hasErrors = result.errors.length > 0;

    return {
      content: [{ type: 'text', text: sections.join('\n\n') }],
      isError: hasErrors,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `## Render Failed\n\n${message}` }],
      isError: true,
    };
  }
}
