import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { StyleSheet } from 'react-native';

import RootLayout from '../../../app/_layout';
import OnboardingLayout from '../../../app/(onboarding)/_layout';
import AgeScreen from '../../../app/(onboarding)/age';
import AiConsent from '../../../app/(onboarding)/consent/ai';
import Goodbye from '../../../app/(onboarding)/consent/goodbye';
import SpecialCategoryConsent from '../../../app/(onboarding)/consent/special-category';
import TermsConsent from '../../../app/(onboarding)/consent/terms';
import HelpScreen from '../../../app/(onboarding)/help';
import RustleScreen from '../../../app/(onboarding)/rustle';
import TabLayout from '../../../app/(tabs)/_layout';
import NotesScreen from '../../../app/(tabs)/notes';
import TodayScreen from '../../../app/(tabs)/today';
import Index from '../../../app/index';
import YouScreen from '../../../app/(tabs)/you';
import { isIntroSeen, markIntroSeen } from '../../intro/intro-seen';
import { CONTENT_DELAY_MS, CONTENT_FADE_MS } from '../../intro/timing';
import { clearAgeBlockedForTests, isAgeBlocked, isConsentsComplete, markConsentsComplete, resetConsentsComplete } from '../block-flag';
import { fake, USER_ID } from './fake-supabase';

// An English (Canada) device; fonts load at once; Skia is stood in for (its maths is tested elsewhere).
const EN_CA = [{ languageCode: 'en', languageTag: 'en-CA', regionCode: 'CA' }];
jest.mock('expo-localization', () => ({ getLocales: () => EN_CA, useLocales: () => EN_CA }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('../../../i18n/preferences');
jest.mock('../../../lib/supabase', () => jest.requireActual('./fake-supabase').fakeSupabaseModule);
jest.mock('../../intro/tree/Tree', () => ({ Tree: () => null }));
jest.mock('../../intro/FoldedNoteMark', () => ({ FoldedNoteMark: () => null }));

const routes = {
  _layout: RootLayout,
  index: Index,
  '(onboarding)/_layout': OnboardingLayout,
  '(onboarding)/rustle': RustleScreen,
  '(onboarding)/age': AgeScreen,
  '(onboarding)/help': HelpScreen,
  '(onboarding)/consent/terms': TermsConsent,
  '(onboarding)/consent/ai': AiConsent,
  '(onboarding)/consent/special-category': SpecialCategoryConsent,
  '(onboarding)/consent/goodbye': Goodbye,
  '(tabs)/_layout': TabLayout,
  '(tabs)/today': TodayScreen,
  '(tabs)/notes': NotesScreen,
  '(tabs)/you': YouScreen,
};

// Whole-router renders: a loaded CI machine can take longer than Jest's 5 s default.
jest.setTimeout(30000);

async function renderAt(url: string) {
  const router = renderRouter(routes, { initialUrl: url });
  await act(async () => {});
  return router;
}

async function enterBirthDate(day: string, month: string, year: string) {
  fireEvent.changeText(screen.getByTestId('age-day'), day);
  fireEvent.changeText(screen.getByTestId('age-month'), month);
  fireEvent.changeText(screen.getByTestId('age-year'), year);
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  });
}

async function press(name: string) {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
}

const thisYear = new Date().getFullYear();

beforeEach(() => {
  fake.reset();
  clearAgeBlockedForTests();
  resetConsentsComplete();
  markIntroSeen();
});

describe('the Rustle screen hands over to the gate (M1-09)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  async function showRustle() {
    const router = await renderAt('/rustle');
    act(() => {
      jest.advanceTimersByTime(CONTENT_DELAY_MS + CONTENT_FADE_MS);
    });
    return router;
  }

  it('Begin opens the age gate', async () => {
    const router = await showRustle();
    fireEvent.press(screen.getByRole('button', { name: 'Begin' }));
    expect(router.getPathname()).toBe('/age');
  });

  it('"get help now" opens the crisis lines, the device’s country first', async () => {
    const router = await showRustle();
    expect(screen.getByText('get help now')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('intro-get-help'));
    await act(async () => {});
    expect(router.getPathname()).toBe('/help');
    expect(screen.getByText('Get help now')).toBeOnTheScreen();
    const lines = screen.getAllByTestId(/^help-line-/).map((row) => row.props.testID as string);
    expect(lines.slice(0, 2)).toEqual(['help-line-canada988', 'help-line-quebecAppelle']);
    expect(screen.getByLabelText('Call Suicide Crisis Helpline, call or text at 9-8-8')).toBeOnTheScreen();
  });
});

describe('the age gate (docs/21 §1.2)', () => {
  it('asks neutrally, with nothing about the threshold', async () => {
    await renderAt('/age');
    expect(screen.getByText('When were you born?')).toBeOnTheScreen();
    expect(screen.getByText('Rustle asks everyone this once. The date itself is never kept.')).toBeOnTheScreen();
    expect(screen.queryByText(/18/)).toBeNull();
  });

  it('refuses an impossible date without writing anything', async () => {
    await renderAt('/age');
    await enterBirthDate('31', '2', '1990');
    expect(screen.getByText('That date doesn’t look right. Check the day, month and year.')).toBeOnTheScreen();
    expect(fake.writes).toEqual([]);
    expect(fake.deleteAnonymousAccount).not.toHaveBeenCalled();
  });

  it('under 18: sets the flag, deletes the account, resets the intro, then shows the youth lines', async () => {
    const router = await renderAt('/age');
    await enterBirthDate('15', '6', String(thisYear - 15));

    expect(isAgeBlocked()).toBe(true);
    expect(fake.deleteAnonymousAccount).toHaveBeenCalledTimes(1);
    expect(isIntroSeen()).toBe(false);
    // The date is never written anywhere, and neither is anything else.
    expect(fake.writes).toEqual([]);

    expect(router.getPathname()).toBe('/age');
    expect(screen.getByText('Rustle is for adults')).toBeOnTheScreen();
    expect(screen.getByTestId('help-line-kidsHelpPhone')).toBeOnTheScreen();
    expect(screen.getByText('1-800-668-6868')).toBeOnTheScreen();
    expect(screen.getByText('0 800 235 236')).toBeOnTheScreen();
    expect(screen.getByText('0800 1111')).toBeOnTheScreen();
    // No retry: the inputs are gone.
    expect(screen.queryByTestId('age-year')).toBeNull();
  });

  it('a blocked install sees the block screen again, with no inputs, and its new account goes too', async () => {
    await renderAt('/age');
    await enterBirthDate('15', '6', String(thisYear - 15));
    screen.unmount();
    fake.reset();

    await renderAt('/age');
    expect(screen.getByText('Rustle is for adults')).toBeOnTheScreen();
    expect(screen.queryByTestId('age-day')).toBeNull();
    expect(fake.deleteAnonymousAccount).toHaveBeenCalledTimes(1);
  });

  it('18 and over: stores only age_confirmed_at, then opens the first consent', async () => {
    const router = await renderAt('/age');
    await enterBirthDate('7', '3', '1990');

    expect(fake.writes).toHaveLength(1);
    expect(fake.writes[0]).toMatchObject({ table: 'users', op: 'update', filter: ['id', USER_ID] });
    expect(Object.keys(fake.writes[0]?.row ?? {})).toEqual(['age_confirmed_at']);
    expect(JSON.stringify(fake.writes)).not.toMatch(/1990/);
    expect(fake.deleteAnonymousAccount).not.toHaveBeenCalled();
    expect(router.getPathname()).toBe('/consent/terms');
  });

  it('a failed save stays on the gate with a calm message', async () => {
    fake.failWrites = true;
    const router = await renderAt('/age');
    await enterBirthDate('7', '3', '1990');
    expect(router.getPathname()).toBe('/age');
    expect(screen.getByText('Something went wrong. Nothing was saved; try again in a moment.')).toBeOnTheScreen();
  });
});

describe('the three consents (docs/21 §1.3–1.4)', () => {
  it('each writes its own row with kind, version and locale, then Today', async () => {
    const router = await renderAt('/consent/terms');

    // No step numbers in onboarding (docs/05 §3).
    expect(screen.queryByText(/Step \d/)).toBeNull();
    expect(screen.getByText('Rustle is AI, not a therapist or a crisis service.')).toBeOnTheScreen();
    await press('I agree');
    expect(router.getPathname()).toBe('/consent/ai');

    expect(screen.getByText('Your words and our AI partner')).toBeOnTheScreen();
    expect(screen.getByText('Rustle is AI, not a therapist or a crisis service.')).toBeOnTheScreen();
    await press('I agree');
    expect(router.getPathname()).toBe('/consent/special-category');

    expect(screen.getByText('The personal things you share')).toBeOnTheScreen();
    expect(isConsentsComplete()).toBe(false);
    await press('I agree');
    expect(isConsentsComplete()).toBe(true);
    expect(router.getPathname()).toBe('/today');

    expect(fake.writes).toEqual([
      { table: 'consents', op: 'insert', row: { kind: 'terms', version: '2026-10-01', locale: 'en' } },
      { table: 'consents', op: 'insert', row: { kind: 'ai_processing', version: '2026-10-01', locale: 'en' } },
      { table: 'consents', op: 'insert', row: { kind: 'special_category', version: '2026-10-01', locale: 'en' } },
    ]);
    expect(fake.deleteAnonymousAccount).not.toHaveBeenCalled();
  });

  it('declining AI processing deletes the account, resets the intro, then says goodbye kindly', async () => {
    markConsentsComplete(); // as if left over: leaving must clear it
    const router = await renderAt('/consent/ai');
    expect(screen.getByText('If you’d rather not, Rustle stops here and keeps nothing.')).toBeOnTheScreen();

    await press('Not now');

    expect(fake.deleteAnonymousAccount).toHaveBeenCalledTimes(1);
    expect(isIntroSeen()).toBe(false);
    expect(isConsentsComplete()).toBe(false);
    expect(fake.writes).toEqual([]);
    expect(router.getPathname()).toBe('/consent/goodbye');
    expect(screen.getByText('That’s all right')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('a failed write stays on the step and says so', async () => {
    fake.failWrites = true;
    const router = await renderAt('/consent/terms');
    await press('I agree');
    expect(router.getPathname()).toBe('/consent/terms');
    expect(screen.getByText('Something went wrong. Nothing was saved; try again in a moment.')).toBeOnTheScreen();
  });

  it('a failed write on the last consent does not mark the consents complete', async () => {
    fake.failWrites = true;
    const router = await renderAt('/consent/special-category');
    await press('I agree');
    expect(router.getPathname()).toBe('/consent/special-category');
    expect(isConsentsComplete()).toBe(false);
  });

  it('"Not now" is the same size as "I agree" (docs/20 §7.5)', async () => {
    await renderAt('/consent/terms');
    const size = (name: string) => {
      const style = StyleSheet.flatten(screen.getByRole('button', { name }).props.style);
      return { minHeight: style.minHeight, alignSelf: style.alignSelf };
    };
    expect(size('Not now')).toEqual(size('I agree'));
  });
});
