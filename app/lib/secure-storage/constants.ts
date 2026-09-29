// Names chosen once, on 2026-09-29 (D44). Moving Keychain items later is painful:
// the iOS Notification Service Extension (M4, docs/07 §6) must read the same items.

/** Keychain service under which the session material lives. */
export const KEYCHAIN_SERVICE = 'app.rustle.session';

/**
 * Keychain access group shared with the widget and the notification extension.
 * An App Group name works as a keychain access group without the team-ID prefix,
 * and the widget needs the same App Group for its storage (docs/07 §1).
 * Declared in app.json under ios.entitlements.
 */
export const KEYCHAIN_ACCESS_GROUP = 'group.app.rustle';

/**
 * Key of the refresh token inside the Keychain service, the Android Keystore and Block Store,
 * namespaced by the Supabase project so dev, staging and prod builds under the same App Group
 * never read (and then invalidate) each other's token.
 */
export function refreshTokenKey(projectRef: string): string {
  return `refresh_token:${projectRef}`;
}

/** The project ref is the first label of the Supabase URL host; `local` when not configured. */
export function projectRefFromUrl(url: string | undefined): string {
  if (!url) return 'local';
  try {
    return new URL(url).hostname.split('.')[0] || 'local';
  } catch {
    return 'local';
  }
}

/** Key of the MMKV encryption key that protects the cached session on disk. */
export const SESSION_CACHE_KEY_NAME = 'session_cache_key';

/** MMKV instance id for the cached Supabase session. */
export const SESSION_CACHE_ID = 'rustle.session';
