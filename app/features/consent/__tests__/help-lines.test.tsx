import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import { Linking } from 'react-native';

import { ThemeProvider } from '../../../components/ThemeProvider';
import { i18n } from '../../../i18n';
import { HelpLineList } from '../HelpLineList';
import { CRISIS_LINES, YOUTH_LINES } from '../resources';

const EN_CA = [{ languageCode: 'en', languageTag: 'en-CA', regionCode: 'CA' }];
jest.mock('expo-localization', () => ({ getLocales: () => EN_CA, useLocales: () => EN_CA }));
jest.mock('../../../i18n/preferences');

function renderLines(lines = YOUTH_LINES) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <HelpLineList lines={lines} />
      </ThemeProvider>
    </I18nextProvider>,
  );
}

afterEach(() => jest.restoreAllMocks());

describe('help lines on a device that cannot call', () => {
  it('dials the line when the device can', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderLines();
    await act(async () => {
      fireEvent.press(screen.getByTestId('help-line-kidsHelpPhone'));
    });
    expect(open).toHaveBeenCalledWith('tel:18006686868');
    expect(screen.queryByTestId('help-line-kidsHelpPhone-fallback')).toBeNull();
  });

  it('shows the number to dial elsewhere when opening fails', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no telephony'));
    renderLines();
    await act(async () => {
      fireEvent.press(screen.getByTestId('help-line-kidsHelpPhone'));
    });
    expect(screen.getByText('This device can’t place the call. Dial 1-800-668-6868 from any phone.')).toBeOnTheScreen();
    expect(screen.getByText('1-800-668-6868').props.selectable).toBe(true);
  });

  it('says to open a web line in a browser when that fails', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no browser'));
    renderLines(CRISIS_LINES);
    await act(async () => {
      fireEvent.press(screen.getByTestId('help-line-sosAmitie'));
    });
    expect(screen.getByText('Open sos-amitie.com in a browser.')).toBeOnTheScreen();
  });
});
