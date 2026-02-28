// Known WeBWorK PG macros with descriptions.
// This is a curated list since the renderer doesn't expose a macro introspection endpoint.
const KNOWN_MACROS: Array<{ name: string; description: string }> = [
  { name: 'PGstandard.pl', description: 'Standard PG macros — always loaded first' },
  { name: 'PGML.pl', description: 'PG Markup Language for modern problem formatting' },
  { name: 'MathObjects.pl', description: 'MathObject answer checkers (Real, Formula, etc.)' },
  { name: 'PGchoicemacros.pl', description: 'Multiple choice and matching question helpers' },
  { name: 'PGgraders.pl', description: 'Custom grading utilities (partial credit, etc.)' },
  { name: 'PGauxiliaryFunctions.pl', description: 'Additional math functions (step, ceil, floor, etc.)' },
  { name: 'parserMultiAnswer.pl', description: 'Multi-answer checker for coupled answer blanks' },
  { name: 'parserFormulaUpToConstant.pl', description: 'Formula answers that allow +C (integrals)' },
  { name: 'parserAssignment.pl', description: 'Answer checker for equations like y = mx + b' },
  { name: 'parserPopUp.pl', description: 'Drop-down/popup menu answer type' },
  { name: 'parserRadioButtons.pl', description: 'Radio button answer type' },
  { name: 'parserCheckboxList.pl', description: 'Checkbox list (select all that apply) answer type' },
  { name: 'PGgraphmacros.pl', description: 'Graph creation and display utilities' },
  { name: 'PGtikz.pl', description: 'TikZ graphics integration' },
  { name: 'PGnumericalmacros.pl', description: 'Numerical computation helpers' },
  { name: 'PGstatisticsmacros.pl', description: 'Statistics functions (mean, stdev, etc.)' },
  { name: 'PGmatrixmacros.pl', description: 'Matrix display and answer macros' },
  { name: 'parserFunction.pl', description: 'Custom function definition for answer checking' },
  { name: 'parserVectorUtils.pl', description: 'Vector operation utilities' },
  { name: 'contextLimitedNumeric.pl', description: 'Restricted numeric context (no operations allowed)' },
  { name: 'contextLimitedPolynomial.pl', description: 'Restricted polynomial context' },
  { name: 'contextFraction.pl', description: 'Fraction context for exact fraction answers' },
  { name: 'contextArbitraryString.pl', description: 'Accept arbitrary string answers' },
  { name: 'contextOrdering.pl', description: 'Ordering/ranking answer type' },
  { name: 'scaffold.pl', description: 'Multi-part scaffolded problems' },
  { name: 'niceTables.pl', description: 'HTML/LaTeX table formatting' },
  { name: 'unionTables.pl', description: 'Side-by-side layout tables' },
  { name: 'PGcourse.pl', description: 'Course-specific customizations (loaded last)' },
];

export async function handleListMacros(args: {
  filter?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  let macros = KNOWN_MACROS;

  if (args.filter) {
    const lower = args.filter.toLowerCase();
    macros = macros.filter(
      (m) =>
        m.name.toLowerCase().includes(lower) ||
        m.description.toLowerCase().includes(lower),
    );
  }

  const lines = macros.map((m) => `- **${m.name}** — ${m.description}`);

  const text = args.filter
    ? `## Macros matching "${args.filter}" (${macros.length} found)\n\n${lines.join('\n')}`
    : `## Available WeBWorK PG Macros (${macros.length})\n\n${lines.join('\n')}`;

  return {
    content: [{ type: 'text', text }],
  };
}
