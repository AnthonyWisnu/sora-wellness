import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { encryptHealth, decryptHealth } from '../src/health/health-crypto';

test('cipher kesehatan acak, terikat pemilik, mendeteksi perubahan dan mendukung rotasi', () => {
  const previous = { id: process.env.HEALTH_DATA_KEY_ID, keys: process.env.HEALTH_DATA_KEYS };
  const first = randomBytes(32).toString('base64');
  const second = randomBytes(32).toString('base64');
  try {
    process.env.HEALTH_DATA_KEY_ID = 'first';
    process.env.HEALTH_DATA_KEYS = JSON.stringify({ first, second });
    const encrypted = encryptHealth('Catatan sintetis untuk uji', 'customer-a');
    assert.notEqual(encrypted, encryptHealth('Catatan sintetis untuk uji', 'customer-a'));
    assert.ok(!encrypted.includes('sintetis'));
    assert.equal(decryptHealth(encrypted, 'customer-a'), 'Catatan sintetis untuk uji');
    assert.throws(() => decryptHealth(encrypted, 'customer-b'));
    const parts = encrypted.split(':'); parts[5] = randomBytes(24).toString('base64url');
    assert.throws(() => decryptHealth(parts.join(':'), 'customer-a'));
    process.env.HEALTH_DATA_KEY_ID = 'second';
    assert.equal(decryptHealth(encrypted,'customer-a'),'Catatan sintetis untuk uji');
    assert.match(encryptHealth('Rotasi','customer-a'), /^health:v1:second:/);
    process.env.HEALTH_DATA_KEYS = JSON.stringify({ second });
    assert.throws(() => decryptHealth(encrypted,'customer-a'));
    assert.throws(() => decryptHealth('plaintext lama','customer-a'));
  } finally {
    if (previous.id === undefined) delete process.env.HEALTH_DATA_KEY_ID; else process.env.HEALTH_DATA_KEY_ID = previous.id;
    if (previous.keys === undefined) delete process.env.HEALTH_DATA_KEYS; else process.env.HEALTH_DATA_KEYS = previous.keys;
  }
});
