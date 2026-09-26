import assert from 'node:assert/strict';
import test from 'node:test';
import { monthlyQuota } from '../src/membership/quota';

test('prorata September dan Oktober mengikuti bulan sesi', () => {
  const membership = [{ starts_on: '2026-09-20', ends_on: '2026-10-19' }];
  assert.equal(monthlyQuota(8, '2026-09', membership), 3);
  assert.equal(monthlyQuota(8, '2026-10', membership), 5);
});

test('perpanjangan dalam bulan yang sama tidak menggandakan hari', () => {
  const memberships = [
    { starts_on: '2026-09-01', ends_on: '2026-09-20' },
    { starts_on: '2026-09-20', ends_on: '2026-09-30' },
  ];
  assert.equal(monthlyQuota(8, '2026-09', memberships), 8);
});

test('Februari kabisat memakai jumlah hari kalender yang tepat', () => {
  assert.equal(monthlyQuota(8, '2028-02', [{ starts_on: '2028-02-15', ends_on: '2028-02-29' }]), 5);
});
