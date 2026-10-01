import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import RootLayout from '../../../app/_layout';
import OnboardingLayout from '../../../app/(onboarding)/_layout';
import AgeScreen from '../../../app/(onboarding)/age';
import AiConsent from '../../../app/(onboarding)/consent/ai';
import Goodbye from '../../../app/(onboarding)/consent/goodbye';
import SpecialCategoryConsent from '../../../app/(onboarding)/consent/special-category';
import TermsConsent from '../../../app/(onboarding)/consent/terms';
import HelpScreen from '../../../app/(onboarding)/help';
import TabLayout from '../../../app/(tabs)/_layout';
import TodayScreen from '../../../app/(tabs)/today';
import Index from '../../../app/index';
import { setAddress } from '../../../i18n/preferences';
import { clearAgeBlockedForTests, resetConsentsComplete } from '../onboarding-flags';
import { fake } from './fake-supabase';

// A French (Quebec) device: "tu" by default, "vous" when chosen, never mixed.
const FR_CA = [{ languageCode: 'fr', languageTag: 'fr-CA', regionCode: 'CA' }];
jest.mock('expo-localization', () => ({ getLocales: () => FR_CA, useLocales: () => FR_CA }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('../../../i18n/preferences');
jest.mock('../../../lib/supabase', () => jest.requireActual('./fake-supabase').fakeSupabaseModule);
jest.mock('../../intro/tree/Tree', () => ({ Tree: () => null }));

const routes = {
  _layout: RootLayout,
  index: Index,
  '(onboarding)/_layout': OnboardingLayout,
  '(onboarding)/age': AgeScreen,
  '(onboarding)/help': HelpScreen,
  '(onboarding)/consent/terms': TermsConsent,
  '(onboarding)/consent/ai': AiConsent,
  '(onboarding)/consent/special-category': SpecialCategoryConsent,
  '(onboarding)/consent/goodbye': Goodbye,
  '(tabs)/_layout': TabLayout,
  '(tabs)/today': TodayScreen,
};

// Whole-router renders: a loaded CI machine can take longer than Jest's 5 s default.
jest.setTimeout(30000);

async function renderAt(url: string) {
  const router = renderRouter(routes, { initialUrl: url });
  await act(async () => {});
  return router;
}

async function enterBirthDate(year: string) {
  fireEvent.changeText(screen.getByTestId('age-day'), '15');
  fireEvent.changeText(screen.getByTestId('age-month'), '6');
  fireEvent.changeText(screen.getByTestId('age-year'), year);
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Continuer' }));
  });
}

beforeEach(() => {
  fake.reset();
  clearAgeBlockedForTests();
  resetConsentsComplete();
});
afterEach(() => setAddress('tu'));

describe('the age gate in French', () => {
  it('uses "tu" by default and "vous" when chosen', async () => {
    await renderAt('/age');
    expect(screen.getByText('Quelle est ta date de naissance ?')).toBeOnTheScreen();
    screen.unmount();

    setAddress('vous');
    await renderAt('/age');
    expect(screen.getByText('Quelle est votre date de naissance ?')).toBeOnTheScreen();
    expect(screen.queryByText(/\b(ta|tu|te|ton|tes)\b/)).toBeNull();
  });

  it('blocks kindly in French with the Quebec youth line first', async () => {
    await renderAt('/age');
    await enterBirthDate(String(new Date().getFullYear() - 16));
    expect(screen.getByText('Rustle est réservé aux adultes')).toBeOnTheScreen();
    expect(screen.getByText('Jeunesse, J’écoute')).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^help-line-/)[0]?.props.testID).toBe('help-line-kidsHelpPhone');
  });
});

describe('the consents in French', () => {
  it('records the fr-CA copy locale and shows the AI disclosure', async () => {
    fake.seed(true, []);
    const router = await renderAt('/consent/terms');
    // No step numbers in onboarding (docs/05 §3).
    expect(screen.queryByText(/Étape/)).toBeNull();
    expect(screen.getByText('Rustle est une IA, et non un thérapeute ni un service de crise.')).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'J’accepte' }));
    });
    expect(router.getPathname()).toBe('/consent/ai');
    expect(fake.writes[0]?.row).toEqual({ kind: 'terms', version: '2026-10-01', locale: 'fr-CA' });
  });

  it('never "tu"-es a "vous" user on the AI consent or the goodbye', async () => {
    setAddress('vous');
    await renderAt('/consent/ai');
    expect(screen.getByText('Vos mots et notre partenaire d’IA')).toBeOnTheScreen();
    expect(screen.getByText('Si vous préférez ne pas accepter, Rustle s’arrête ici et ne garde rien.')).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Pas maintenant' }));
    });
    expect(fake.deleteAnonymousAccount).toHaveBeenCalledTimes(1);
    expect(screen.getByText('C’est correct')).toBeOnTheScreen();
    expect(screen.getByText(/votre accord pour écrire vos notes/)).toBeOnTheScreen();
  });
});
