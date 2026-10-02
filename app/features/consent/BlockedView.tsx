import { View } from 'react-native';

import { Text } from '../../components/Text';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n/useT';
import { HelpLineList } from './HelpLineList';
import { HelpLinesFooter } from './HelpLinesFooter';
import { OnboardingPage } from './OnboardingPage';
import { YOUTH_LINES } from './resources';

/**
 * The under-18 screen (docs/05 §3, docs/11 §5): kind, no way back into the gate, and youth lines
 * for the device's country first. No buttons: there is nothing to retry on this install.
 */
export function BlockedView() {
  const { t } = useT();
  const { space } = useTheme();
  return (
    <OnboardingPage title={t('age.blocked.title')} tree={false}>
      <View testID="age-blocked" style={{ gap: space[4] }}>
        <Text variant="body">{t('age.blocked.body')}</Text>
        <Text variant="body" color="ink2">
          {t('age.blocked.resourcesIntro')}
        </Text>
        <HelpLineList lines={YOUTH_LINES} />
        <HelpLinesFooter />
      </View>
    </OnboardingPage>
  );
}
