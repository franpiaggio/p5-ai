import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, 'p5-ai-salt', 32);
}

export function encrypt(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv + tag + ciphertext → base64
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(encoded: string, secret: string): string | null {
  try {
    const key = deriveKey(secret);
    const buf = Buffer.from(encoded, 'base64');
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext) + decipher.final('utf8');
  } catch {
    return null;
  }
}
