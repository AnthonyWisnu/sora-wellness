import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { AdminAccountController } from '../src/auth/auth';
import { AuthRequest, Actor } from '../src/shared/security';
import { Db } from '../src/shared/db';

function setup(role: Actor['role'], permissions: string[], targetRole: string) {
  const queries: string[] = [];
  const db = { transaction: async (run: (client: unknown) => unknown) => run({
    query: async (sql: string) => {
      queries.push(sql);
      return sql.startsWith('SELECT role') ? { rows: [{ role: targetRole }] } : { rowCount: 1, rows: [] };
    },
  }) } as unknown as Db;
  const req = { actor: { id: randomUUID(), role, permissions } } as AuthRequest;
  return { controller: new AdminAccountController(db), req, queries };
}

test('front desk tidak dapat memulai reset superadmin', async () => {
  const { controller, req, queries } = setup('admin', ['front_desk'], 'superadmin');
  await assert.rejects(controller.resetPassword(req, { verificationNote: 'Verifikasi fixture' }, randomUUID()), /Akses ditolak/);
  assert.equal(queries.length, 0);
});

for (const target of ['admin', 'superadmin']) {
  test(`staff_management tidak dapat mereset ${target}`, async () => {
    const { controller, req, queries } = setup('admin', ['staff_management'], target);
    await assert.rejects(controller.resetPassword(req, { verificationNote: 'Verifikasi fixture' }, randomUUID()), /tidak berhak/);
    assert.equal(queries.some(sql => sql.startsWith('UPDATE')), false);
  });
}

for (const [role, target] of [['admin', 'coach'], ['admin', 'customer'], ['superadmin', 'admin']] as const) {
  test(`${role} dapat mereset ${target} dan mencabut sesi`, async () => {
    const { controller, req, queries } = setup(role, ['staff_management'], target);
    const result = await controller.resetPassword(req, { verificationNote: 'Verifikasi fixture' }, randomUUID());
    assert.ok(result.temporaryPassword.length >= 24);
    assert.ok(queries.some(sql => sql.includes('DELETE FROM "session"')));
    assert.ok(queries.some(sql => sql.includes('INSERT INTO audit_logs')));
  });
}

test('reset diri sendiri tidak mencabut sesi melalui jalur admin', async () => {
  const { controller, req, queries } = setup('superadmin', [], 'superadmin');
  await assert.rejects(controller.resetPassword(req, { verificationNote: 'Verifikasi fixture' }, req.actor!.id), /akun sendiri/);
  assert.equal(queries.length, 0);
});
