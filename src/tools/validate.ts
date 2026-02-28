import { renderProblem } from '../renderer-client.js';

export async function handleValidateSyntax(args: {
  pgCode: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    const result = await renderProblem(args.pgCode, { seed: 1 });

    const valid = result.errors.length === 0;

    const sections: string[] = [];
    sections.push(`## Syntax Validation: ${valid ? 'PASS' : 'FAIL'}`);

    if (result.errors.length > 0) {
      sections.push(`### Errors\n${result.errors.map((e) => `- ${e}`).join('\n')}`);
    }

    if (result.warnings.length > 0) {
      sections.push(`### Warnings\n${result.warnings.map((w) => `- ${w}`).join('\n')}`);
    }

    if (valid) {
      sections.push('The PG code compiled and rendered without errors.');
    }

    return {
      content: [{ type: 'text', text: sections.join('\n\n') }],
      isError: !valid,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `## Validation Failed\n\n${message}` }],
      isError: true,
    };
  }
}
