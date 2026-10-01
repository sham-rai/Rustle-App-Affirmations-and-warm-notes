import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '../../components/Text';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n/useT';
import { getSupabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { leaveOnboarding } from './leave';
import { OnboardingPage } from './OnboardingPage';
import { markConsentsComplete } from './onboarding-flags';
import { CONSENT_KINDS, recordConsent, type ConsentKind } from './records';

const COPY = {
  terms: 'terms',
  ai_processing: 'ai',
  special_category: 'specialCategory',
} as const satisfies Record<ConsentKind, string>;

export const GOODBYE_ROUTE = '/consent/goodbye';

type Phase = 'ask' | 'saving' | 'error' | 'leaving';

/**
 * One consent, on its own screen (docs/11 §4.2, §4.4, docs/21 §1.3). Agreeing writes a `consents`
 * row with the kind, the copy's version and locale, then moves on. Declining ends onboarding
 * kindly: the anonymous account is deleted first, then the goodbye screen shows.
 */
export function ConsentStep({ kind, next }: { kind: ConsentKind; next: Href }) {
  const router = useRouter();
  const { t, language } = useT();
  const { space } = useTheme();
  const [phase, setPhase] = useState<Phase>('ask');
  const copy = COPY[kind];
  const busy = phase === 'saving' || phase === 'leaving';

  const onAgree = async () => {
    setPhase('saving');
    const result = await recordConsent(getSupabase(), kind, language);
    if (!result.ok) {
      setPhase('error');
      return;
    }
    // The last consent's row is written: from now on a restored session skips the gate.
    if (kind === CONSENT_KINDS[CONSENT_KINDS.length - 1]) markConsentsComplete();
    router.replace(next);
  };

  const onDecline = async () => {
    setPhase('leaving');
    await leaveOnboarding();
    router.replace(GOODBYE_ROUTE);
  };

  return (
    <OnboardingPage
      title={t(`consent.${copy}.title`)}
      actions={
        <View testID={`consent-${kind}`} style={{ gap: space[2] }}>
          <Text variant="label" color={phase === 'error' ? 'warm' : 'ink2'} accessibilityLiveRegion="polite">
            {phase === 'error' ? t('consent.saveError') : t('consent.declineNote')}
          </Text>
          <Button label={t('consent.agree')} onPress={() => void onAgree()} busy={phase === 'saving'} disabled={busy} />
          <Button
            kind="secondary"
            label={t('common.notNow')}
            onPress={() => void onDecline()}
            busy={phase === 'leaving'}
            disabled={busy}
          />
        </View>
      }
      footer={
        // docs/21 §1.4: the AI disclosure is visible on the consent screen.
        <Text variant="label" color="ink2" style={styles.centred}>
          {t('intro.aiDisclosure')}
        </Text>
      }
    >
      <Text variant="body">{t(`consent.${copy}.body`)}</Text>
    </OnboardingPage>
  );
}

const styles = StyleSheet.create({
  centred: { textAlign: 'center' },
});
