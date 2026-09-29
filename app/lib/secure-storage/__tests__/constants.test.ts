import { projectRefFromUrl, refreshTokenKey } from '../constants';

describe('token key namespacing', () => {
  it('derives the project ref from the Supabase URL', () => {
    expect(projectRefFromUrl('https://abcdefghij.supabase.co')).toBe('abcdefghij');
    expect(projectRefFromUrl(undefined)).toBe('local');
    expect(projectRefFromUrl('not a url')).toBe('local');
  });
  it('namespaces the key', () => {
    expect(refreshTokenKey('abcdefghij')).toBe('refresh_token:abcdefghij');
  });
});
