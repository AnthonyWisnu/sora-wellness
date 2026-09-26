import assert from 'node:assert/strict';
import test from 'node:test';
import { isCancellationTimely } from '../src/booking/cancellations';

test('batas pembatalan tepat 24 jam sudah terlambat', () => {
  const startsAt = Date.parse('2026-09-28T08:00:00Z');
  assert.equal(isCancellationTimely(startsAt - 1440 * 60000 - 1,startsAt,1440),true);
  assert.equal(isCancellationTimely(startsAt - 1440 * 60000,startsAt,1440),false);
  assert.equal(isCancellationTimely(startsAt - 1440 * 60000 + 1,startsAt,1440),false);
});
