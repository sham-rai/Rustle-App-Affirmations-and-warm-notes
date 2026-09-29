import type { User, UserIdentity } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '../../components/Text';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n/useT';
import type { AuthBootstrapState } from '../../lib/auth/useAuthBootstrap';
import { getSupabase } from '../../lib/supabase';

/**
 * "Your notes are backed up" / "Not backed up" (docs/07 §5 point 5, docs/21 §3.4).
 * Reads the live session, not the `users` row (that table arrives with M1-02).
 * The short account id lets the PO confirm "same account after reinstall" on a device.
 */
export type BackupStatus =
  | { kind: 'not_connected' }
  | { kind: 'loading' }
  /** The bootstrap failed (offline, server); the row says so instead of "checking" for ever. */
  | { kind: 'unavailable' }
  | { kind: 'anonymous'; shortId: string }
  | { kind: 'linked'; shortId: string; provider: string };

export function shortAccountId(userId: string): string {
  return userId.slice(0, 8);
}

/** The part of the user the status depends on. */
export type UserIdentitySummary = Pick<User, 'is_anonymous'> & { identities?: Pick<UserIdentity, 'provider'>[] };

/** Pure mapping from the bootstrap state and the user's identities to what the row shows. */
export function resolveBackupStatus(auth: AuthBootstrapState, user: UserIdentitySummary | null): BackupStatus {
  if (auth.status === 'not_configured') return { kind: 'not_connected' };
  if (auth.status === 'failed') return { kind: 'unavailable' };
  if (auth.status !== 'ready') return { kind: 'loading' };
  const shortId = shortAccountId(auth.userId);
  const linked = user?.identities?.find((identity) => identity.provider !== 'anonymous');
  if (user && !user.is_anonymous && linked) return { kind: 'linked', shortId, provider: linked.provider };
  return { kind: 'anonymous', shortId };
}

export function useBackupStatus(auth: AuthBootstrapState): BackupStatus {
  const [status, setStatus] = useState<BackupStatus>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      let user: UserIdentitySummary | null = null;
      if (auth.status === 'ready') {
        // The cached session already carries the identities; no network round trip, and no false
        // "not backed up" for a linked user who happens to be offline.
        const client = getSupabase();
        user = client ? ((await client.auth.getSession()).data.session?.user ?? null) : null;
      }
      if (!cancelled) setStatus(resolveBackupStatus(auth, user));
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  return status;
}

type ProviderKey = 'settings.backup.provider.apple' | 'settings.backup.provider.google' | 'settings.backup.provider.email';

function providerKey(provider: string): ProviderKey {
  if (provider === 'apple') return 'settings.backup.provider.apple';
  if (provider === 'google') return 'settings.backup.provider.google';
  return 'settings.backup.provider.email';
}

export interface BackupStatusRowProps {
  auth: AuthBootstrapState;
  /** Opens "Keep your notes safe" (account linking, M2). Absent until then: the button is hidden. */
  onProtect?: () => void;
}

export function BackupStatusRow({ auth, onProtect }: BackupStatusRowProps) {
  const { t } = useT();
  const { colors, space, radius } = useTheme();
  const status = useBackupStatus(auth);

  return (
    <View
      accessibilityRole="summary"
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line, borderRadius: radius.card, padding: space[4], gap: space[1] }]}
    >
      <Text variant="label" color="ink2">
        {t('settings.backup.title')}
      </Text>
      {status.kind === 'loading' && <Text variant="body">{t('settings.backup.checking')}</Text>}
      {status.kind === 'not_connected' && <Text variant="body">{t('settings.backup.notConnected')}</Text>}
      {status.kind === 'unavailable' && <Text variant="body">{t('settings.backup.unavailable')}</Text>}
      {status.kind === 'linked' && (
        <Text variant="body">{t('settings.backup.backedUp', { provider: t(providerKey(status.provider)) })}</Text>
      )}
      {status.kind === 'anonymous' && (
        <>
          <Text variant="body">{t('settings.backup.notBackedUp')}</Text>
          {onProtect && (
            <Pressable
              accessibilityRole="button"
              onPress={onProtect}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: pressed ? colors.sageDeep : colors.sage, borderRadius: radius.chip, paddingVertical: space[2], paddingHorizontal: space[4], marginTop: space[2] },
              ]}
            >
              <Text variant="label" color="card">
                {t('settings.backup.protect')}
              </Text>
            </Pressable>
          )}
        </>
      )}
      {(status.kind === 'anonymous' || status.kind === 'linked') && (
        <Text variant="caption" color="ink2">
          {t('settings.backup.accountId', { id: status.shortId })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  button: { alignSelf: 'flex-start' },
});
