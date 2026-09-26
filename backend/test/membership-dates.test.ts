import assert from 'node:assert/strict';
import test from 'node:test';
import { membershipEndDate } from '../src/membership/membership-dates';

test('paket satu bulan biasa berakhir sehari sebelum padanan tanggal', () => {
  assert.equal(membershipEndDate('2026-09-20', 1), '2026-10-19');
});

test('tanggal 31 berakhir pada akhir bulan tujuan jika padanannya tidak ada', () => {
  assert.equal(membershipEndDate('2027-01-31', 1), '2027-02-28');
  assert.equal(membershipEndDate('2028-01-31', 1), '2028-02-29');
});

test('tahun berganti dan tanggal padanan tetap benar', () => {
  assert.equal(membershipEndDate('2026-12-30', 1), '2027-01-29');
});
