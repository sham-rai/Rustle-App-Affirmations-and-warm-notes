import * as Sentry from '@sentry/react-native';

/**
 * Crash reporting with no content (docs/07 §10, CLAUDE.md). Bodies, PII, breadcrumb data and any
 * long string never leave the device. Off when the DSN is empty.
 */

/**
 * The real rule is that no code path ever attaches content (notes, replies, memory) to an event.
 * This scrubber is defence in depth; the length bound is only a backstop for long strings.
 */
export const MAX_STRING_LENGTH = 200;
const REDACTED = '[scrubbed]';

function scrubValue(value: unknown, depth: number): unknown {
  if (typeof value === 'string') return value.length > MAX_STRING_LENGTH ? REDACTED : value;
  if (depth > 8 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[k] = scrubValue(v, depth + 1);
  return out;
}

/** Applied to every error event. Exported for the test. */
export function scrubEvent<T extends Sentry.ErrorEvent>(event: T): T {
  const scrubbed = scrubValue(event, 0) as T;
  // Request and response bodies, cookies, query strings and any user identity.
  if (scrubbed.request) {
    delete scrubbed.request.data;
    delete scrubbed.request.cookies;
    delete scrubbed.request.headers;
    delete scrubbed.request.query_string;
  }
  delete scrubbed.user;
  // The one place free text would land if someone attached it; nothing we need lives here.
  delete scrubbed.extra;
  // Breadcrumbs keep their category and level; their data and messages are dropped.
  if (scrubbed.breadcrumbs) {
    scrubbed.breadcrumbs = scrubbed.breadcrumbs.map((b) => ({
      timestamp: b.timestamp,
      type: b.type,
      category: b.category,
      level: b.level,
    }));
  }
  return scrubbed;
}

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry(): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    attachStacktrace: true,
    maxBreadcrumbs: 20,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => ({
      timestamp: breadcrumb.timestamp,
      type: breadcrumb.type,
      category: breadcrumb.category,
      level: breadcrumb.level,
    }),
  });
}
