import { RENDERER_URL, RENDER_ENDPOINT, RENDER_TIMEOUT_MS } from './constants.js';

export interface RenderOptions {
  seed?: number;
  outputFormat?: number;
  isInstructor?: boolean;
  answersSubmitted?: boolean;
  formData?: Record<string, string>;
}

export interface AnswerResult {
  score: number;
  message: string;
  correct: boolean;
  preview: string;
}

export interface AnswerInfo {
  correct_value: string;
  correct_ans: string;
  type: string;
  score: number;
  ans_message: string;
  error_message: string;
  student_ans: string;
  preview_text_string: string;
}

export interface RenderResult {
  renderedHTML: string;
  answers: Record<string, AnswerInfo>;
  answerOrder: string[];
  errors: string[];
  warnings: string[];
  flags: Record<string, unknown>;
  raw: Record<string, unknown>;
}

export interface AnswerCheckResult {
  results: Record<string, AnswerResult>;
  errors: string[];
}

function transformPerlError(rawError: string): string {
  // Extract line number from Perl errors
  const lineMatch = rawError.match(/at line (\d+)/);
  const lineInfo = lineMatch ? ` (line ${lineMatch[1]})` : '';

  // Missing macro patterns
  if (rawError.includes("Can't locate") || rawError.includes('Undefined subroutine')) {
    const macroMatch = rawError.match(/(?:Can't locate |Undefined subroutine &?(?:main::)?)(\w+)/);
    const macroName = macroMatch?.[1];
    if (macroName) {
      return `Missing macro or function: "${macroName}"${lineInfo}. Check your loadMacros() call includes the correct .pl file.`;
    }
  }

  // Syntax errors
  if (rawError.includes('syntax error')) {
    return `Perl syntax error${lineInfo}: ${rawError.replace(/\n/g, ' ').slice(0, 200)}`;
  }

  // Answer checker errors
  if (rawError.includes('checker') || rawError.includes('Answer')) {
    return `Answer checker error${lineInfo}: ${rawError.replace(/\n/g, ' ').slice(0, 200)}`;
  }

  // Generic: trim and truncate
  return rawError.replace(/\n/g, ' ').trim().slice(0, 300);
}

export async function renderProblem(pgCode: string, options: RenderOptions = {}): Promise<RenderResult> {
  const {
    seed = Math.floor(Math.random() * 9999) + 1,
    outputFormat = 2,
    isInstructor = true,
    answersSubmitted = false,
    formData = {},
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);

  const body = new URLSearchParams({
    problemSource: pgCode,
    problemSeed: String(seed),
    outputFormat: String(outputFormat),
    isInstructor: isInstructor ? '1' : '0',
    answersSubmitted: answersSubmitted ? '1' : '0',
    _format: 'json',
    ...formData,
  });

  try {
    const response = await fetch(`${RENDERER_URL}${RENDER_ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Renderer returned HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as Record<string, unknown>;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Extract errors from problem_result
    const problemResult = (data.problem_result as Record<string, unknown>) || {};
    const rawErrors = String(problemResult.errors || '');
    if (rawErrors) {
      errors.push(...rawErrors.split('\n').filter(Boolean).map(transformPerlError));
    }

    // Extract warnings from debug fields
    const debug = (data.debug as Record<string, unknown>) || {};
    const pgWarn = debug.pg_warn;
    if (Array.isArray(pgWarn)) {
      warnings.push(...pgWarn.filter(Boolean).map(String));
    } else if (typeof pgWarn === 'string' && pgWarn) {
      warnings.push(...pgWarn.split('\n').filter(Boolean));
    }
    const perlWarn = debug.perl_warn;
    if (typeof perlWarn === 'string' && perlWarn) {
      errors.push(...perlWarn.split('\n').filter(Boolean).map(transformPerlError));
    }

    // Check error_flag in flags
    const flags = (data.flags as Record<string, unknown>) || {};
    if (flags.error_flag && errors.length === 0) {
      errors.push('Problem flagged an error (error_flag set). Check PG code for issues.');
    }

    // Extract answers
    const answers: RenderResult['answers'] = {};
    const answerData = (data.answers as Record<string, Record<string, unknown>>) || {};
    for (const [name, info] of Object.entries(answerData)) {
      answers[name] = {
        correct_value: String(info.correct_value ?? ''),
        correct_ans: String(info.correct_ans ?? ''),
        type: String(info.type ?? 'unknown'),
        score: Number(info.score ?? 0),
        ans_message: String(info.ans_message ?? ''),
        error_message: String(info.error_message ?? ''),
        student_ans: String(info.student_ans ?? ''),
        preview_text_string: String(info.preview_text_string ?? ''),
      };
    }

    const answerOrder = (flags.ANSWER_ENTRY_ORDER as string[]) || Object.keys(answers);

    return {
      renderedHTML: String(data.renderedHTML || ''),
      answers,
      answerOrder,
      errors,
      warnings,
      flags,
      raw: data,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Renderer timed out after 30 seconds. The problem may contain an infinite loop.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkRendererHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${RENDERER_URL}${RENDER_ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        problemSource: 'DOCUMENT(); loadMacros("PGstandard.pl"); TEXT("health check"); ENDDOCUMENT();',
        problemSeed: '1',
        _format: 'json',
      }).toString(),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}
