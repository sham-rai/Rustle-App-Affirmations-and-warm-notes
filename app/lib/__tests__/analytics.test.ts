import { ALLOWED_PROPERTIES, ANALYTICS_EVENTS, isGlossaryEvent, sanitizeProperties } from '../analytics';

jest.mock('posthog-react-native', () => jest.fn());

describe('analytics property allowlist', () => {
  it('keeps every allowed value and drops free text', () => {
    expect(sanitizeProperties({ locale: 'fr', reaction: 'heart', offline: true, app_version: '1.0.0' })).toEqual({
      locale: 'fr',
      reaction: 'heart',
      offline: true,
      app_version: '1.0.0',
    });
    expect(sanitizeProperties({ locale: 'I feel tired today', source: 'a note I wrote', app_version: 'my note' })).toEqual({});
  });

  it('drops unknown keys, including every banned one', () => {
    const banned = ['life_areas', 'life_area', 'mood', 'checkin', 'safety_level', 'crisis_screen_shown', 'resource_tapped', 'body', 'text', 'kind'];
    for (const k of banned) expect(sanitizeProperties({ [k]: 'work' })).toEqual({});
  });

  it('accepts only booleans for offline, and no non-string values for enumerated keys', () => {
    expect(sanitizeProperties({ offline: 'yes', locale: 3, slot: null, reaction: { a: 1 } })).toEqual({});
  });

  it('has no allowed value that is a life area, a mood or a safety word', () => {
    const all = Object.values(ALLOWED_PROPERTIES).flat() as string[];
    for (const word of ['grief', 'health', 'breakup', 'divorce', 'crisis', 'elevated', 'heavy', 'mood']) {
      expect(all).not.toContain(word);
    }
  });

  it('names events with the glossary prefixes and none about safety', () => {
    for (const e of ANALYTICS_EVENTS) {
      expect(isGlossaryEvent(e)).toBe(true);
      expect(e).not.toMatch(/safety|crisis|resource|mood|checkin|life_area/);
    }
    for (const bad of ['affirmation_sent', 'message_sent', 'note_sent', 'note', 'delivery', 'reply', 'warm_note']) {
      expect(isGlossaryEvent(bad)).toBe(false);
    }
    for (const fine of ['consent_granted', 'paywall_viewed', 'board_note_created', 'warm_note_sent', 'delivery_opened']) {
      expect(isGlossaryEvent(fine)).toBe(true);
    }
  });
});
