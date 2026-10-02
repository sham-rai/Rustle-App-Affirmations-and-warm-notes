import { View } from 'react-native';

import { Text } from '../../components/Text';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n/useT';
import { OnboardingPage } from './OnboardingPage';

/**
 * After a declined consent (docs/21 §1.3). The account is already gone, so there is nothing to
 * press: a new account is made the next time Rustle opens, and the intro shows again.
 */
export function GoodbyeView() {
  const { t } = useT();
  const { space } = useTheme();
  return (
    <OnboardingPage title={t('consent.goodbye.title')}>
      <View testID="consent-goodbye" style={{ gap: space[3] }}>
        <Text variant="body">{t('consent.goodbye.body')}</Text>
        <Text variant="body" color="ink2">
          {t('consent.goodbye.later')}
        </Text>
      </View>
    </OnboardingPage>
  );
}
