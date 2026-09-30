import { color } from '@rustle/shared';

import { checkAppConfig } from '../../../../scripts/check-app-config';
import appJson from '../../../app.json';

// The native splash must be paper in both schemes, or the hand-off to the company splash flashes.
describe('scripts/check-app-config', () => {
  it('passes for app/app.json', () => {
    expect(checkAppConfig(appJson.expo.plugins)).toEqual([]);
  });

  it('fails when a splash colour drifts from the paper token, or is missing', () => {
    const drifted = [['expo-splash-screen', { backgroundColor: color.paper.light, dark: { backgroundColor: color.ink.dark } }]];
    expect(checkAppConfig(drifted).map((v) => v.field)).toEqual(['expo-splash-screen.dark.backgroundColor']);
    expect(checkAppConfig(['expo-router'])).toHaveLength(2);
  });
});
