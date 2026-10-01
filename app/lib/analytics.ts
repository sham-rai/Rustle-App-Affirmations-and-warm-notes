import { EVENT_PREFIXES } from '@rustle/shared';
import PostHog from 'posthog-react-native';
import { Platform } from 'react-native';

/**
 * PostHog receives bare events and pre-approved metadata only (docs/12 §4, D48). There is no free
 * text anywhere in this file's types: every property value is an enumerated union, a boolean, or
 * (app_version only) a strict semver. A runtime guard drops anything else.
 */

/** Never a life area, mood, check-in value, safety level, crisis-screen, resource or safety-report event. */
export const ANALYTICS_EVENTS = [
  'app_opened',
  'onboarding_step_viewed',
  'onboarding_step_completed',
  'onboarding_completed',
  'delivery_first_shown',
  'delivery_reaction',
  'delivery_opened',
  'board_note_created',
  'board_note_edited',
  'board_note_deleted',
  'reply_viewed',
  'reply_reaction',
  'warm_note_created',
  'warm_note_sent',
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** Glossary prefixes (docs/00): the events that name a thing must use its prefix. */
const PREFIXES: readonly string[] = Object.values(EVENT_PREFIXES);
export function isGlossaryEvent(event: string): boolean {
  return event === 'app_opened' || event.startsWith('onboarding_') || PREFIXES.some((p) => event.startsWith(p));
}

/** The closed allowlist. Add a key or a value here only with the lead's approval. */
export const ALLOWED_PROPERTIES = {
  /** Screen or step name. */
  screen: ['company_splash', 'rustle', 'today', 'board', 'memory', 'settings', 'paywall', 'onboarding'],
  step: ['age_gate', 'consent', 'write', 'tone', 'key_date', 'slots', 'first_note', 'notifications'],
  locale: ['en', 'fr'],
  platform: ['ios', 'android'],
  entitlement_state: ['premium', 'welcome_week', 'door_open'],
  slot: ['morning', 'midday', 'evening', 'before_sleep'],
  delivery_kind: ['daily', 'date_eve', 'date_day', 'follow_up', 'quiet_presence', 'win_celebration', 'first', 'seed', 'reengage'],
  reaction: ['heart', 'not_quite'],
  source: ['push', 'widget', 'deeplink', 'icon', 'local'],
} as const;

type AllowedValues = typeof ALLOWED_PROPERTIES;

export type AnalyticsProperties = {
  [K in keyof AllowedValues]?: AllowedValues[K][number];
} & {
  /** Strict semver, for example 1.0.0. */
  app_version?: string;
  offline?: boolean;
};

const SEMVER = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;

/** Returns only the properties that pass: known key, and a value from its set. Unknown keys and values are dropped. */
export function sanitizeProperties(input: Record<string, unknown>): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === 'offline') {
      if (typeof value === 'boolean') out[key] = value;
    } else if (key === 'app_version') {
      if (typeof value === 'string' && SEMVER.test(value)) out[key] = value;
    } else if (Object.prototype.hasOwnProperty.call(ALLOWED_PROPERTIES, key)) {
      const allowed: readonly string[] = ALLOWED_PROPERTIES[key as keyof AllowedValues];
      if (typeof value === 'string' && allowed.includes(value)) out[key] = value;
    }
  }
  return out;
}

const POSTHOG_HOST = 'https://eu.i.posthog.com';
const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;

let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client !== undefined) return client;
  if (!key) {
    client = null;
    return client;
  }
  client = new PostHog(key, {
    host: POSTHOG_HOST,
    disableGeoip: true, // IP is not used to locate the user
    personProfiles: 'identified_only',
    captureAppLifecycleEvents: false,
    enableSessionReplay: false,
  });
  return client;
}

export function isAnalyticsEnabled(): boolean {
  return Boolean(key);
}

/** Ties events to the anonymous Supabase user id, nothing else. */
export function identifyAnalyticsUser(anonymousUserId: string): void {
  getClient()?.identify(anonymousUserId);
}

export function resetAnalyticsUser(): void {
  getClient()?.reset();
}

/** The platform is added to every event; everything else comes from the caller. */
export function track(event: AnalyticsEvent, properties: AnalyticsProperties = {}): void {
  const posthog = getClient();
  if (!posthog) return;
  const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : undefined;
  posthog.capture(event, sanitizeProperties({ ...(platform ? { platform } : {}), ...properties }));
}
