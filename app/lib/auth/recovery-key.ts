import * as Crypto from 'expo-crypto';

/**
 * Recovery key (docs/07 §5 point 6, docs/21 §3.4): a code the user can write down to restore an
 * anonymous account on a new device without an email. Crockford base32: no I, L, O or U, so it
 * survives handwriting in both languages. 120 random bits as six groups of four.
 * Only the SHA-256 hash ever leaves the device; the exchange endpoint arrives with account linking.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const GROUPS = 6;
const GROUP_LENGTH = 4;

export function generateRecoveryKey(): string {
  const bytes = Crypto.getRandomBytes(15); // 120 bits = 24 symbols of 5 bits
  let bits = 0;
  let value = 0;
  const symbols: string[] = [];
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      symbols.push(ALPHABET[(value >> bits) & 31] ?? '0');
    }
  }
  const groups: string[] = [];
  for (let i = 0; i < GROUPS; i += 1) {
    groups.push(symbols.slice(i * GROUP_LENGTH, (i + 1) * GROUP_LENGTH).join(''));
  }
  return groups.join('-');
}

/** Accepts what a person typed: lower case, spaces, missing dashes, and the usual look-alikes. */
export function normalizeRecoveryKey(input: string): string | null {
  const cleaned = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0')
    .replace(/U/g, 'V');
  if (cleaned.length !== GROUPS * GROUP_LENGTH) return null;
  if (![...cleaned].every((c) => ALPHABET.includes(c))) return null;
  const groups: string[] = [];
  for (let i = 0; i < GROUPS; i += 1) groups.push(cleaned.slice(i * GROUP_LENGTH, (i + 1) * GROUP_LENGTH));
  return groups.join('-');
}

/** What the server stores. The key itself is never sent or persisted by the app. */
export async function hashRecoveryKey(normalizedKey: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalizedKey);
}
