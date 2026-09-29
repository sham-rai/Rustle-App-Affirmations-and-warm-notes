import { generateRecoveryKey, hashRecoveryKey, normalizeRecoveryKey } from '../recovery-key';

jest.mock('expo-crypto', () => ({
  getRandomBytes: (n: number) => Uint8Array.from({ length: n }, () => Math.floor(Math.random() * 256)),
  digestStringAsync: async (_algorithm: string, value: string) => `sha256:${value}`,
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

describe('recovery key', () => {
  it('is six groups of four Crockford base32 symbols', () => {
    const key = generateRecoveryKey();
    expect(key).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){5}[0-9A-HJKMNP-TV-Z]{4}$/);
  });

  it('does not repeat', () => {
    const keys = new Set(Array.from({ length: 50 }, generateRecoveryKey));
    expect(keys.size).toBe(50);
  });

  it('normalizes what a person typed', () => {
    expect(normalizeRecoveryKey('abcd efgh jkmn pqrs tvwx yz01')).toBe('ABCD-EFGH-JKMN-PQRS-TVWX-YZ01');
    expect(normalizeRecoveryKey('ILOU-0000-0000-0000-0000-0000')).toBe('110V-0000-0000-0000-0000-0000');
    expect(normalizeRecoveryKey('too short')).toBeNull();
    expect(normalizeRecoveryKey('ABCD-EFGH-JKMN-PQRS-TVWX-YZ0!')).toBeNull();
  });

  it('hashes the normalized key only', async () => {
    await expect(hashRecoveryKey('ABCD-EFGH-JKMN-PQRS-TVWX-YZ01')).resolves.toBe('sha256:ABCD-EFGH-JKMN-PQRS-TVWX-YZ01');
  });
});
