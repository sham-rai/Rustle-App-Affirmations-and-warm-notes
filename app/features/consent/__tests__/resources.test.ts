import { leaves } from '../../../../scripts/check-strings';
import en from '../../../i18n/en.json';
import fr from '../../../i18n/fr.json';
import { CRISIS_LINES, linesFor, YOUTH_LINES } from '../resources';

const enKeys = new Set([...leaves(en)].map(([key]) => key));
const frKeys = new Set([...leaves(fr)].map(([key]) => key));

describe('help lines (docs/11 §5, §5b)', () => {
  it('has the three youth lines of docs/11 §5', () => {
    expect(YOUTH_LINES.map((line) => [line.id, line.display])).toEqual([
      ['kidsHelpPhone', '1-800-668-6868'],
      ['filSanteJeunes', '0 800 235 236'],
      ['childline', '0800 1111'],
    ]);
  });

  it('dials what it displays', () => {
    for (const line of [...YOUTH_LINES, ...CRISIS_LINES].filter((l) => l.phone)) {
      expect(line.href).toMatch(/^tel:\d+$/);
    }
  });

  it('names every line and country in English and French', () => {
    for (const line of [...YOUTH_LINES, ...CRISIS_LINES]) {
      expect(enKeys.has(`resources.lines.${line.id}`)).toBe(true);
      expect(frKeys.has(`resources.lines.${line.id}`)).toBe(true);
      for (const country of line.countries) {
        expect(enKeys.has(`resources.countries.${country}`)).toBe(true);
        expect(frKeys.has(`resources.countries.${country}`)).toBe(true);
      }
    }
  });

  it('puts the device’s country first and keeps the rest', () => {
    expect(linesFor(YOUTH_LINES, 'fr').map((line) => line.id)).toEqual(['filSanteJeunes', 'kidsHelpPhone', 'childline']);
    expect(linesFor(CRISIS_LINES, 'CA').slice(0, 2).map((line) => line.id)).toEqual(['canada988', 'quebecAppelle']);
    expect(linesFor(YOUTH_LINES, null)).toEqual(YOUTH_LINES);
  });
});
