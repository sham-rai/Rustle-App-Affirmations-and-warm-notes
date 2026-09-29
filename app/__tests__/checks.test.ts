import { AA_TEXT, checkContrast, contrastRatio } from '../../scripts/check-contrast';
import { STRING_FILES, findStringViolations } from '../../scripts/check-strings';

describe('scripts/check-contrast', () => {
  it('computes WCAG ratios', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrastRatio([255, 255, 255], [255, 255, 255])).toBe(1);
  });

  it('passes on the current tokens', () => {
    const failures = checkContrast().filter((r) => !r.pass);
    expect(failures.map((f) => `${f.label} ${f.ratio.toFixed(2)}`)).toEqual([]);
  });

  it('fails a pair below AA', () => {
    const [result] = checkContrast([{ label: 'grey on grey', fg: [150, 150, 150], bg: [200, 200, 200] }]);
    expect(result?.pass).toBe(false);
    expect(result?.ratio).toBeLessThan(AA_TEXT);
  });
});

describe('scripts/check-strings', () => {
  it('passes on en.json and fr.json', () => {
    expect(findStringViolations(STRING_FILES)).toEqual([]);
  });

  it('flags "!" and "affirmation" in any case', () => {
    const violations = findStringViolations({ 'x.json': { a: 'Hello!', b: { c: 'Daily Affirmations' } } });
    expect(violations.map((v) => `${v.key}:${v.rule}`)).toEqual(['a:exclamation', 'b.c:affirmation']);
  });
});
