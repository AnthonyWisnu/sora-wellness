import assert from 'node:assert/strict';
import test from 'node:test';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  ALLOWED_STAFF_PERMISSIONS,
  UpdateStaffPermissionsDto,
} from '../src/auth/dto/staff-permissions.dto';

test('UpdateStaffPermissionsDto menerima izin staf yang valid', async () => {
  const dto = plainToInstance(UpdateStaffPermissionsDto, {
    permissions: ['front_desk', 'lockers', 'finance_reports'],
  });
  const errors = await validate(dto);
  assert.equal(errors.length, 0);
});

test('UpdateStaffPermissionsDto menerima array kosong (mencabut semua izin)', async () => {
  const dto = plainToInstance(UpdateStaffPermissionsDto, {
    permissions: [],
  });
  const errors = await validate(dto);
  assert.equal(errors.length, 0);
});

test('UpdateStaffPermissionsDto menolak kunci izin yang tidak dikenal', async () => {
  const dto = plainToInstance(UpdateStaffPermissionsDto, {
    permissions: ['front_desk', 'super_admin_god_mode'],
  });
  const errors = await validate(dto);
  assert.equal(errors.length > 0, true);
  assert.match(
    JSON.stringify(errors),
    /Kunci hak akses tidak valid atau tidak dikenal/,
  );
});

test('UpdateStaffPermissionsDto menolak nilai permissions yang bukan array', async () => {
  const dto = plainToInstance(UpdateStaffPermissionsDto, {
    permissions: 'front_desk',
  });
  const errors = await validate(dto);
  assert.equal(errors.length > 0, true);
  assert.match(JSON.stringify(errors), /Daftar hak akses harus berupa array/);
});

test('Daftar ALLOWED_STAFF_PERMISSIONS mencakup sembilan kunci izin modular resmi', () => {
  assert.equal(ALLOWED_STAFF_PERMISSIONS.length, 9);
  assert.equal(ALLOWED_STAFF_PERMISSIONS.includes('front_desk'), true);
  assert.equal(ALLOWED_STAFF_PERMISSIONS.includes('lockers'), true);
  assert.equal(ALLOWED_STAFF_PERMISSIONS.includes('classes_schedule'), true);
  assert.equal(ALLOWED_STAFF_PERMISSIONS.includes('community_events'), true);
  assert.equal(ALLOWED_STAFF_PERMISSIONS.includes('studio_content'), true);
  assert.equal(ALLOWED_STAFF_PERMISSIONS.includes('studio_policy'), true);
  assert.equal(ALLOWED_STAFF_PERMISSIONS.includes('finance_reports'), true);
  assert.equal(ALLOWED_STAFF_PERMISSIONS.includes('finance_payouts'), true);
  assert.equal(ALLOWED_STAFF_PERMISSIONS.includes('staff_management'), true);
});
