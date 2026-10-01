import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Text } from '../../components/Text';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n/useT';
import { Button } from './Button';
import { HelpLineList } from './HelpLineList';
import { HelpLinesFooter } from './HelpLinesFooter';
import { OnboardingPage } from './OnboardingPage';
import { CRISIS_LINES } from './resources';

/**
 * "Get help now" from the Rustle screen (docs/11 §5b): the crisis lines, the device's country
 * first. No account, consent or network is needed to read it. The full crisis screen (M-safety)
 * reuses the same lines.
 */
export function HelpView() {
  const { t } = useT();
  const { space } = useTheme();
  const router = useRouter();
  return (
    <OnboardingPage
      title={t('help.title')}
      tree={false}
      actions={<Button kind="secondary" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/rustle'))} />}
    >
      <View testID="help-now" style={{ gap: space[4] }}>
        <Text variant="body">{t('help.intro')}</Text>
        <HelpLineList lines={CRISIS_LINES} />
        <HelpLinesFooter />
      </View>
    </OnboardingPage>
  );
}
