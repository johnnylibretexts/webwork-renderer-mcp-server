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

    const entries: string[] = [];

    for (const name of result.answerOrder) {
      const info = result.answers[name];
      if (!info) continue;
      const correct = info.score >= 1;
      const submitted = args.answers[name] ?? '(not provided)';
      const message = info.ans_message || info.error_message;
      const preview = info.preview_text_string || info.student_ans || submitted;

      entries.push(
        `- **${name}**: ${correct ? 'CORRECT' : 'INCORRECT'} (score: ${info.score})\n` +
        `  - Submitted: \`${submitted}\`\n` +
        `  - Expected: \`${info.correct_value}\` (expression: \`${info.correct_ans}\`)\n` +
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
