import { color, motion, radius, shadow, space, tokens, typography } from '../tokens.ts';

const HEX = /^#[0-9A-F]{6}$/;

describe('design tokens (docs/20 §13)', () => {
  it('has the documented top-level groups', () => {
    expect(Object.keys(tokens).sort()).toEqual(
      ['color', 'motion', 'radius', 'shadow', 'space', 'typography'].sort(),
    );
  });

  it('has the sixteen documented colours', () => {
    expect(Object.keys(color)).toEqual([
      'paper',
      'card',
      'ink',
      'ink2',
      'line',
      'sage',
      'sageDeep',
      'sageWash',
      'warm',
      'remove',
      'calm',
      'noteButter',
      'noteBlush',
      'noteSage',
      'noteSky',
      'noteLilac',
    ]);
  });

  it.each(Object.entries(color))('%s has a light and a dark hex value', (_name, value) => {
    expect(Object.keys(value).sort()).toEqual(['dark', 'light']);
    expect(value.light).toMatch(HEX);
    expect(value.dark).toMatch(HEX);
  });

  it('has a [size, lineHeight] pair for every type-scale entry', () => {
    expect(typography.serif).toBe('Literata');
    expect(typography.sans).toBe('Instrument Sans');
    for (const [size, lineHeight] of Object.values(typography.scale)) {
      expect(lineHeight).toBeGreaterThan(size);
    }
  });

  it('keeps space, radius, shadow and motion as documented', () => {
    expect(space).toEqual([4, 8, 12, 16, 20, 24, 32, 40]);
    expect(radius).toEqual({ chip: 12, sticky: 6, card: 18, hero: 24 });
    expect(shadow.card).toEqual({ color: 'rgba(60,45,30,0.10)', y: 6, blur: 18 });
    expect(motion).toEqual({ fast: 200, base: 400, slow: 600, ease: 'cubic-bezier(0.2, 0, 0, 1)' });
  });
});
