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

export interface RenderResult {
  renderedHTML: string;
  answers: Record<string, {
    correct_value: string;
    type: string;
  }>;
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

    // Extract errors from various possible fields
    const rawErrors = (data.errors as string) || (data.problem_result as Record<string, unknown>)?.errors as string || '';
    if (rawErrors) {
      errors.push(...rawErrors.split('\n').filter(Boolean).map(transformPerlError));
    }

    const rawWarnings = (data.warnings as string) || '';
    if (rawWarnings) {
      warnings.push(...rawWarnings.split('\n').filter(Boolean));
    }

    // Extract answers
    const answers: RenderResult['answers'] = {};
    const answerData = (data.answers as Record<string, Record<string, unknown>>) || {};
    for (const [name, info] of Object.entries(answerData)) {
      answers[name] = {
        correct_value: String(info.correct_value || info.correct_ans || ''),
        type: String(info.type || info.ans_name || 'unknown'),
      };
    }

    return {
      renderedHTML: String(data.renderedHTML || data.problem_rendered_html || data.text || ''),
      answers,
      errors,
      warnings,
      flags: (data.flags as Record<string, unknown>) || {},
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
