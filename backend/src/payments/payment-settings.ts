import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Db } from '../shared/db';

type StoredSettings = { merchant_id: string; client_key: string; server_key_nonce: Buffer; server_key_ciphertext: Buffer; server_key_tag: Buffer; updated_at: Date };
export type PaymentCredentials = { merchantId: string; clientKey: string; serverKey: string };

function masterKey(): Buffer {
  const encoded = process.env.MIDTRANS_SETTINGS_KEY ?? '';
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw new ServiceUnavailableException('Kunci penyimpanan pembayaran belum disetel');
  return key;
}

export function encryptServerKey(serverKey: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', masterKey(), nonce);
  const ciphertext = Buffer.concat([cipher.update(serverKey, 'utf8'), cipher.final()]);
  return { nonce, ciphertext, tag: cipher.getAuthTag() };
}

function decryptServerKey(row: StoredSettings): string {
  const decipher = createDecipheriv('aes-256-gcm', masterKey(), row.server_key_nonce);
  decipher.setAuthTag(row.server_key_tag);
  return Buffer.concat([decipher.update(row.server_key_ciphertext), decipher.final()]).toString('utf8');
}

@Injectable()
export class PaymentSettings {
  constructor(private readonly db: Db) {}

  async readPublic() {
    const result = await this.db.query<StoredSettings>('SELECT merchant_id,client_key,updated_at FROM payment_settings WHERE studio_id=1');
    const row = result.rows[0];
    return row ? { configured: true, environment: 'sandbox', merchantId: row.merchant_id, clientKey: row.client_key, serverKeyConfigured: true, updatedAt: row.updated_at } : { configured: false, environment: 'sandbox' };
  }

  async credentials(): Promise<PaymentCredentials> {
    const result = await this.db.query<StoredSettings>('SELECT * FROM payment_settings WHERE studio_id=1');
    const row = result.rows[0];
    if (!row) throw new ServiceUnavailableException('Pengaturan Midtrans belum tersedia');
    return { merchantId: row.merchant_id, clientKey: row.client_key, serverKey: decryptServerKey(row) };
  }

  async save(value: PaymentCredentials): Promise<void> {
    const encrypted = encryptServerKey(value.serverKey);
    await this.db.query(`INSERT INTO payment_settings (studio_id,merchant_id,client_key,server_key_nonce,server_key_ciphertext,server_key_tag) VALUES (1,$1,$2,$3,$4,$5) ON CONFLICT (studio_id) DO UPDATE SET merchant_id=$1,client_key=$2,server_key_nonce=$3,server_key_ciphertext=$4,server_key_tag=$5,updated_at=now()`, [value.merchantId,value.clientKey,encrypted.nonce,encrypted.ciphertext,encrypted.tag]);
  }
}
