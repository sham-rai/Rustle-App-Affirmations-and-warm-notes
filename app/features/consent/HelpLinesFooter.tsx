import { Linking, View } from 'react-native';

import { Text } from '../../components/Text';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n/useT';
import { LinkedSentence } from './LinkedSentence';
import { FIND_A_HELPLINE_URL } from './resources';

/** Under any list of lines: the fallback for other countries, then the emergency numbers. */
export function HelpLinesFooter() {
  const { t } = useT();
  const { space } = useTheme();
  return (
    <View style={{ gap: space[2] }}>
      <LinkedSentence
        variant="label"
        color="ink2"
        text={t('help.elsewhere')}
        linkTestID="find-a-helpline"
        onPressLink={() => void Linking.openURL(FIND_A_HELPLINE_URL).catch(() => undefined)}
      />
      <Text variant="label" color="ink2">
        {t('help.emergency')}
      </Text>
    </View>
  );
}
