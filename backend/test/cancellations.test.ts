import assert from 'node:assert/strict';
import test from 'node:test';
import { isCancellationTimely } from '../src/booking/cancellations';

test('batas pembatalan tepat 24 jam sudah terlambat', () => {
  const startsAt = Date.parse('2026-09-28T08:00:00Z');
  assert.equal(isCancellationTimely(startsAt - 1440 * 60000 - 1,startsAt,1440),true);
  assert.equal(isCancellationTimely(startsAt - 1440 * 60000,startsAt,1440),false);
  assert.equal(isCancellationTimely(startsAt - 1440 * 60000 + 1,startsAt,1440),false);
});

test('sesi yang sudah lewat waktu mulai atau berakhir tidak dapat dibatalkan', () => {
  const startsAt = Date.parse('2026-09-28T08:00:00Z');
  const nowAfterStarts = Date.parse('2026-09-28T08:05:00Z');
  assert.equal(isCancellationTimely(nowAfterStarts, startsAt, 120), false);
  const nowAfterEnds = Date.parse('2026-09-28T10:00:00Z');
  assert.equal(isCancellationTimely(nowAfterEnds, startsAt, 120), false);
});
