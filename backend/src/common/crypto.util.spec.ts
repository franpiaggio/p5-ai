import { encrypt, decrypt } from './crypto.util';

const SECRET = 'test-secret';

describe('crypto.util', () => {
  it('round-trips plaintext', () => {
    const encoded = encrypt('sk-ant-api03-abcdef', SECRET);
    expect(decrypt(encoded, SECRET)).toBe('sk-ant-api03-abcdef');
  });

  it('round-trips unicode content', () => {
    const plaintext = '{"openai":"sk-ñandú-🔑"}';
    expect(decrypt(encrypt(plaintext, SECRET), SECRET)).toBe(plaintext);
  });

  it('round-trips the empty string', () => {
    expect(decrypt(encrypt('', SECRET), SECRET)).toBe('');
  });

  it('produces different ciphertexts for the same plaintext (random IV)', () => {
    expect(encrypt('same', SECRET)).not.toBe(encrypt('same', SECRET));
  });

  it('returns null with the wrong secret instead of throwing', () => {
    const encoded = encrypt('secret-value', SECRET);
    expect(decrypt(encoded, 'other-secret')).toBeNull();
  });

  it('returns null when the ciphertext is tampered', () => {
    const encoded = encrypt('secret-value', SECRET);
    const buf = Buffer.from(encoded, 'base64');
    buf[buf.length - 1] ^= 0xff;
    expect(decrypt(buf.toString('base64'), SECRET)).toBeNull();
  });

  it('returns null when the auth tag is tampered', () => {
    const encoded = encrypt('secret-value', SECRET);
    const buf = Buffer.from(encoded, 'base64');
    buf[12] ^= 0xff; // first tag byte (layout: iv(12) + tag(16) + ciphertext)
    expect(decrypt(buf.toString('base64'), SECRET)).toBeNull();
  });

  it('returns null for truncated input', () => {
    const encoded = encrypt('secret-value', SECRET);
    expect(decrypt(encoded.slice(0, 10), SECRET)).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(decrypt('not-even-base64!!!', SECRET)).toBeNull();
    expect(decrypt('', SECRET)).toBeNull();
  });
});
