import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { fontFamily, Text, textStyleFor } from '../../components/Text';
import { useTheme } from '../../hooks/useTheme';
import { useT, type StringKey } from '../../i18n/useT';
import { getSupabase } from '../../lib/supabase';
import { isAdult, parseDateOfBirth, type DateOfBirthEntry } from './age';
import { isAgeBlocked, markAgeBlocked } from './onboarding-flags';
import { BlockedView } from './BlockedView';
import { Button } from '../../components/Button';
import { leaveOnboarding } from './leave';
import { OnboardingPage } from './OnboardingPage';
import { confirmAge } from './records';

export const FIRST_CONSENT_ROUTE = '/consent/terms';

type Phase = 'ask' | 'invalid' | 'saving' | 'error' | 'leaving' | 'blocked';
type Field = keyof DateOfBirthEntry;

const EMPTY: DateOfBirthEntry = { day: '', month: '', year: '' };

const FIELDS: readonly { field: Field; label: StringKey; hint: StringKey; length: number }[] = [
  { field: 'day', label: 'age.day', hint: 'age.dayHint', length: 2 },
  { field: 'month', label: 'age.month', hint: 'age.monthHint', length: 2 },
  { field: 'year', label: 'age.year', hint: 'age.yearHint', length: 4 },
];

/**
 * The neutral date-of-birth gate (docs/05 §3, docs/11 §5, docs/21 §1.2). Neutral: it never says
 * which answer passes. The date stays in this component's state only; 18 and over stores
 * `users.age_confirmed_at` and moves to the consents; under 18 sets the local flag, deletes the
 * anonymous account and shows the youth lines. A blocked install sees the block screen again.
 */
export function AgeGate() {
  const router = useRouter();
  const { t } = useT();
  const { colors, radius, space } = useTheme();
  const [entry, setEntry] = useState<DateOfBirthEntry>(EMPTY);
  const [phase, setPhase] = useState<Phase>(() => (isAgeBlocked() ? 'blocked' : 'ask'));
  const inputs = useRef<Partial<Record<Field, TextInput | null>>>({});

  // A blocked install that opens Rustle again has a fresh anonymous account from the launch; it
  // goes too, so a minor never keeps an account (D46).
  const blockedOnArrival = useRef(phase === 'blocked');
  useEffect(() => {
    if (blockedOnArrival.current) void leaveOnboarding();
  }, []);

  if (phase === 'blocked') return <BlockedView />;

  const busy = phase === 'saving' || phase === 'leaving';
  const complete = entry.day !== '' && entry.month !== '' && entry.year.length === 4;

  const onChange = (field: Field, length: number, next: Field | undefined) => (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, length);
    setEntry((current) => ({ ...current, [field]: digits }));
    if (phase === 'invalid' || phase === 'error') setPhase('ask');
    if (digits.length === length && next) inputs.current[next]?.focus();
  };

  const onContinue = async () => {
    const now = new Date();
    const dateOfBirth = parseDateOfBirth(entry, now);
    if (!dateOfBirth) {
      setPhase('invalid');
      return;
    }
    if (!isAdult(dateOfBirth, now)) {
      setEntry(EMPTY);
      markAgeBlocked();
      setPhase('leaving');
      await leaveOnboarding();
      setPhase('blocked');
      return;
    }
    setPhase('saving');
    const result = await confirmAge(getSupabase(), now);
    if (result.ok) {
      setEntry(EMPTY);
      router.replace(FIRST_CONSENT_ROUTE);
    } else {
      setPhase('error');
    }
  };

  const message = phase === 'invalid' ? t('age.invalid') : phase === 'error' ? t('age.saveError') : null;

  return (
    <OnboardingPage
      title={t('age.title')}
      actions={
        <Button
          label={t('age.continue')}
          onPress={() => void onContinue()}
          busy={busy}
          disabled={busy || !complete}
          testID="age-continue"
        />
      }
    >
      <Text variant="body" color="ink2">
        {t('age.sub')}
      </Text>
      <View style={[styles.fields, { gap: space[3] }]}>
        {FIELDS.map(({ field, label, hint, length }, index) => (
          <View key={field} style={[styles.field, { flex: length, gap: space[1] }]}>
            <Text variant="label" color="ink2">
              {t(label)}
            </Text>
            <TextInput
              ref={(input) => {
                inputs.current[field] = input;
              }}
              testID={`age-${field}`}
              accessibilityLabel={t(label)}
              value={entry[field]}
              onChangeText={onChange(field, length, FIELDS[index + 1]?.field)}
              placeholder={t(hint)}
              placeholderTextColor={colors.ink2}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={length}
              autoComplete="off"
              autoCorrect={false}
              importantForAutofill="no"
              editable={!busy}
              returnKeyType={field === 'year' ? 'done' : 'next'}
              onSubmitEditing={field === 'year' && complete ? () => void onContinue() : undefined}
              style={[
                textStyleFor('body'),
                styles.input,
                {
                  color: colors.ink,
                  backgroundColor: colors.card,
                  borderColor: phase === 'invalid' ? colors.warm : colors.line,
                  borderRadius: radius.chip,
                  paddingHorizontal: space[3],
                  fontFamily: fontFamily.sansMedium,
                },
              ]}
            />
          </View>
        ))}
      </View>
      {message ? (
        <Text variant="label" color="warm" accessibilityLiveRegion="polite" testID="age-message">
          {message}
        </Text>
      ) : null}
    </OnboardingPage>
  );
}


const INPUT_HEIGHT = 52;

const styles = StyleSheet.create({
  fields: { flexDirection: 'row' },
  field: { minWidth: 0 },
  input: { minHeight: INPUT_HEIGHT, borderWidth: StyleSheet.hairlineWidth * 2, textAlign: 'center' },
});
