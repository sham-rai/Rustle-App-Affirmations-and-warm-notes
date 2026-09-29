import { act, renderHook } from '@testing-library/react-native';

import { i18n, resolveLanguage } from '../index';
import { setAddress } from '../preferences';
import { useT } from '../useT';

jest.mock('../preferences');

describe('resolveLanguage', () => {
  it.each([
    [[{ languageCode: 'fr', languageTag: 'fr-CA' }], 'fr'],
    [[{ languageCode: 'fr', languageTag: 'fr-FR' }], 'fr'],
    [[{ languageCode: 'en', languageTag: 'en-CA' }], 'en'],
    [[{ languageCode: 'es', languageTag: 'es-MX' }], 'en'],
    [[{ languageCode: 'es', languageTag: 'es-MX' }, { languageCode: 'fr', languageTag: 'fr-CA' }], 'fr'],
    [[], 'en'],
  ])('%j resolves to %s', (locales, expected) => {
    expect(resolveLanguage(locales)).toBe(expected);
  });
});

describe('useT', () => {
  afterEach(async () => {
    act(() => setAddress('tu'));
    await act(() => i18n.changeLanguage('en'));
  });

  it('returns the tu form by default in French', async () => {
    await act(() => i18n.changeLanguage('fr'));
    const { result } = renderHook(() => useT());
    expect(result.current.address).toBe('tu');
    expect(result.current.t('tabs.you.title')).toBe('Toi');
    expect(result.current.t('common.errorSaved')).toContain('Ta note');
  });

  it('returns the _vous variant when the address is vous', async () => {
    await act(() => i18n.changeLanguage('fr'));
    const { result } = renderHook(() => useT());
    act(() => setAddress('vous'));
    expect(result.current.address).toBe('vous');
    expect(result.current.t('tabs.you.title')).toBe('Vous');
    expect(result.current.t('common.errorSaved')).toContain('Votre note');
    // Keys without a _vous sibling fall back to the shared form.
    expect(result.current.t('common.notNow')).toBe('Pas maintenant');
  });

  it('ignores the address in English', async () => {
    const { result } = renderHook(() => useT());
    act(() => setAddress('vous'));
    expect(result.current.language).toBe('en');
    expect(result.current.t('tabs.you.title')).toBe('You');
  });
});
