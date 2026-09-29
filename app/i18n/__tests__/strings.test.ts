import { leaves } from '../../../scripts/check-strings';
import en from '../en.json';
import fr from '../fr.json';

const enStrings: Record<string, string> = Object.fromEntries(leaves(en));
const frStrings: Record<string, string> = Object.fromEntries(leaves(fr));
const VOUS = '_vous';

// Tu-forms from the M1-04 ticket: whole words (accent-aware), plus the elided t' / t’.
const TU_FORM = /(?<!\p{L})(tu|te|ton|ta|tes|toi)(?!\p{L})/iu;
const TU_FORM_ELIDED = /(?<!\p{L})t['’]/iu;
const hasTuForm = (value: string) => TU_FORM.test(value) || TU_FORM_ELIDED.test(value);

describe('fr.json: tu / vous (docs/21 §17.2)', () => {
  it('detects the tu-forms it is meant to catch', () => {
    expect(hasTuForm('Ta note est enregistrée')).toBe(true);
    expect(hasTuForm('Je t’écris')).toBe(true);
    expect(hasTuForm("Je t'écris")).toBe(true);
    expect(hasTuForm('Toi')).toBe(true);
    expect(hasTuForm('Votre note, tant mieux, toujours, été')).toBe(false);
  });

  it('every tu-form value has a _vous sibling', () => {
    const tuKeys = Object.entries(frStrings)
      .filter(([key, value]) => !key.endsWith(VOUS) && hasTuForm(value))
      .map(([key]) => key);
    const missing = tuKeys.filter((key) => !(`${key}${VOUS}` in frStrings));
    expect(missing).toEqual([]);
    console.info(`tu/vous: checked ${tuKeys.length} French keys with a tu-form, all have a _vous sibling`);
  });

  it('no _vous value contains a tu-form', () => {
    const offenders = Object.entries(frStrings).filter(([key, value]) => key.endsWith(VOUS) && hasTuForm(value));
    expect(offenders).toEqual([]);
  });

  it('every _vous key has a base key', () => {
    const orphans = Object.keys(frStrings).filter((key) => key.endsWith(VOUS) && !(key.slice(0, -VOUS.length) in frStrings));
    expect(orphans).toEqual([]);
  });

  it('uses typographic apostrophes and a non-breaking space before ; : ? !', () => {
    for (const value of Object.values(frStrings)) {
      expect(value).not.toMatch(/'/);
      expect(value).not.toMatch(/[^  ][;:?!]/);
    }
  });
});

describe('en.json and fr.json have the same keys', () => {
  const frBase = Object.keys(frStrings).filter((key) => !key.endsWith(VOUS));

  it('every English key exists in French', () => {
    expect(Object.keys(enStrings).filter((key) => !(key in frStrings))).toEqual([]);
  });

  it('every French key exists in English (_vous keys excepted)', () => {
    expect(frBase.filter((key) => !(key in enStrings))).toEqual([]);
  });

  it('English has no _vous keys', () => {
    expect(Object.keys(enStrings).filter((key) => key.endsWith(VOUS))).toEqual([]);
  });

  it('top-level keys are sorted (clean merges for M1-03)', () => {
    for (const file of [en, fr]) {
      const keys = Object.keys(file);
      expect(keys).toEqual([...keys].sort());
    }
  });
});
