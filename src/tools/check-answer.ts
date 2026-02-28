import { renderProblem } from '../renderer-client.js';

export async function handleCheckAnswer(args: {
  pgCode: string;
  seed: number;
  answers: Record<string, string>;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    // Step 1: Render the problem to get answer blank names
    const initialRender = await renderProblem(args.pgCode, { seed: args.seed });

    if (initialRender.errors.length > 0) {
      return {
        content: [{
          type: 'text',
          text: `## Answer Check Failed\n\nProblem has render errors:\n${initialRender.errors.map((e) => `- ${e}`).join('\n')}`,
        }],
        isError: true,
      };
    }

    // Step 2: Submit the answers
    const result = await renderProblem(args.pgCode, {
      seed: args.seed,
      answersSubmitted: true,
      formData: args.answers,
    });

    const sections: string[] = [];
    sections.push(`## Answer Check (seed: ${args.seed})`);

    if (result.errors.length > 0) {
      sections.push(`### Errors\n${result.errors.map((e) => `- ${e}`).join('\n')}`);
    }

    // Parse answer results from the raw response
    const answerResults = (result.raw.answers as Record<string, Record<string, unknown>>) || {};
    const entries: string[] = [];

    for (const [name, info] of Object.entries(answerResults)) {
      const score = Number(info.score ?? 0);
      const correct = score >= 1;
      const submitted = String(args.answers[name] ?? '(not provided)');
      const expected = String(info.correct_value || info.correct_ans || '');
      const message = String(info.ans_message || info.error_message || '');
      const preview = String(info.preview || info.student_ans || submitted);

      entries.push(
        `- **${name}**: ${correct ? 'CORRECT' : 'INCORRECT'} (score: ${score})\n` +
        `  - Submitted: \`${submitted}\`\n` +
        `  - Expected: \`${expected}\`\n` +
        `  - Preview: \`${preview}\`` +
        (message ? `\n  - Message: ${message}` : ''),
      );
    }

    if (entries.length > 0) {
      sections.push(`### Results\n${entries.join('\n')}`);
    } else {
      sections.push('No answer results returned. The answer blank names may not match.');
      sections.push(`Available answer blanks: ${Object.keys(initialRender.answers).join(', ') || 'none'}`);
    }

    return {
      content: [{ type: 'text', text: sections.join('\n\n') }],
      isError: result.errors.length > 0,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `## Answer Check Failed\n\n${message}` }],
      isError: true,
    };
  }
}
