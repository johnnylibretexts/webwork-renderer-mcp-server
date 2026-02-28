import { describe, it, expect } from 'vitest';
import { renderProblem, checkRendererHealth } from '../../src/renderer-client.js';

// These tests require the local WeBWorK renderer running on Docker.
// Skip if renderer is not available.
const RENDERER_URL = process.env.RENDERER_URL || 'http://localhost:3000';

async function isRendererUp(): Promise<boolean> {
  try {
    const res = await fetch(`${RENDERER_URL}/render-api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'problemSource=DOCUMENT();ENDDOCUMENT();&problemSeed=1&_format=json',
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

describe.skipIf(!(await isRendererUp()))('Integration: WeBWorK Renderer', () => {
  it('health check returns true', async () => {
    const healthy = await checkRendererHealth();
    expect(healthy).toBe(true);
  });

  it('renders a simple PG problem', async () => {
    const pgCode = `
DOCUMENT();
loadMacros("PGstandard.pl", "PGML.pl", "PGcourse.pl");

$a = random(2, 10, 1);
$b = random(2, 10, 1);
$answer = Compute("$a + $b");

BEGIN_PGML
What is [$a] + [$b]? [_____]{$answer}
END_PGML

ENDDOCUMENT();
    `.trim();

    const result = await renderProblem(pgCode, { seed: 42 });
    expect(result.errors).toHaveLength(0);
    expect(result.renderedHTML).toBeTruthy();
    expect(Object.keys(result.answers).length).toBeGreaterThan(0);
  });

  it('returns errors for broken PG code', async () => {
    const result = await renderProblem('this is not valid PG code at all', { seed: 1 });
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('renders across multiple seeds', async () => {
    const pgCode = `
DOCUMENT();
loadMacros("PGstandard.pl", "PGML.pl", "PGcourse.pl");
$x = random(1, 100, 1);
BEGIN_PGML
Value: [$x]

[_____]{$x}
END_PGML
ENDDOCUMENT();
    `.trim();

    const seeds = [1, 2, 3, 4, 5];
    const results = await Promise.all(
      seeds.map((seed) => renderProblem(pgCode, { seed })),
    );

    for (const result of results) {
      expect(result.errors).toHaveLength(0);
    }
  });
});
