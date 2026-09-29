import { createClient, FunctionRegion, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { getRefreshTokenStore } from './secure-storage/refresh-token-store';
import { createSessionStorage } from './secure-storage/session-cache';
import { openSessionCache } from './secure-storage/session-cache-store';

/**
 * Every Edge Function call carries the region so no note text is processed outside Canada
 * (docs/07 §8, Law 25). The region chosen at project creation pins only the database.
 */
export const FUNCTION_REGION = FunctionRegion.CaCentral1;

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** False until app/.env.local names the dev project (docs/15 §2). The app must run either way. */
export function isSupabaseConfigured(): boolean {
  return typeof url === 'string' && url.length > 0 && typeof anonKey === 'string' && anonKey.length > 0;
}

let client: SupabaseClient | null | undefined;

/** The one Supabase client, or null when the project is not configured. */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!isSupabaseConfigured() || !url || !anonKey) {
    client = null;
    return client;
  }
  client = createClient(url, anonKey, {
    auth: {
      storage: createSessionStorage({ cache: openSessionCache(), refreshTokens: getRefreshTokenStore() }),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  // Refresh only while the app is in the foreground, as supabase-js recommends for React Native.
  const created = client;
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void created.auth.startAutoRefresh();
    else void created.auth.stopAutoRefresh();
  });
  return client;
}

export interface DeleteAnonymousAccountResult {
  /** True when the server confirmed the deletion. False when the function is unreachable or absent. */
  serverDeleted: boolean;
  /** The local session and the reinstall-proof tokens are always cleared. */
  localCleared: true;
}

/**
 * For M1-09: when the 18+ gate blocks, the anonymous account created on first launch is removed.
 * The server side is the `account-delete` Edge Function (M1-02, service role, cascades). Until it
 * exists the call fails and only the local material is wiped, which the result says.
 */
export async function deleteAnonymousAccount(): Promise<DeleteAnonymousAccountResult> {
  const supabase = getSupabase();
  let serverDeleted = false;
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user.is_anonymous) {
      const { error } = await supabase.functions.invoke('account-delete', { region: FUNCTION_REGION });
      serverDeleted = error === null;
    }
    await supabase.auth.signOut({ scope: 'local' });
  }
  await getRefreshTokenStore().clear();
  return { serverDeleted, localCleared: true };
}
