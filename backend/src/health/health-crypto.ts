import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';

const unavailable = () => new ServiceUnavailableException('Catatan kesehatan sementara belum tersedia. Hubungi pengelola studio.');

function keyFor(id: string): Buffer {
  try {
    const keys = JSON.parse(process.env.HEALTH_DATA_KEYS ?? '{}') as Record<string, unknown>;
    const encoded = keys[id];
    if (typeof encoded !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(encoded)) throw unavailable();
    const key = Buffer.from(encoded, 'base64');
    if (key.length !== 32 || key.equals(Buffer.from(process.env.MIDTRANS_SETTINGS_KEY ?? '', 'base64'))) throw unavailable();
    return key;
  } catch { throw unavailable(); }
}

export function encryptHealth(note: string, customerId: string): string {
  const id = process.env.HEALTH_DATA_KEY_ID ?? '';
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(id)) throw unavailable();
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFor(id), nonce);
  cipher.setAAD(Buffer.from(`sora-health:${customerId}`));
  const encrypted = Buffer.concat([cipher.update(note, 'utf8'), cipher.final()]);
  return ['health', 'v1', id, nonce.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join(':');
}

export function decryptHealth(envelope: string, customerId: string): string {
  try {
    const [prefix, version, id, nonce, tag, ciphertext, extra] = envelope.split(':');
    if (prefix !== 'health' || version !== 'v1' || !id || !nonce || !tag || !ciphertext || extra !== undefined) throw unavailable();
    const iv = Buffer.from(nonce,'base64url');
    const authTag = Buffer.from(tag,'base64url');
    if (iv.length !== 12 || authTag.length !== 16) throw unavailable();
    const decipher = createDecipheriv('aes-256-gcm',keyFor(id),iv);
    decipher.setAAD(Buffer.from(`sora-health:${customerId}`));
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(Buffer.from(ciphertext,'base64url')),decipher.final()]).toString('utf8');
  } catch { throw unavailable(); }
}
