import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsString } from 'class-validator';

export const ALLOWED_STAFF_PERMISSIONS = [
  'front_desk',
  'lockers',
  'classes_schedule',
  'community_events',
  'studio_content',
  'studio_policy',
  'finance_reports',
  'finance_payouts',
  'staff_management',
] as const;

export type StaffPermission = (typeof ALLOWED_STAFF_PERMISSIONS)[number];

export class UpdateStaffPermissionsDto {
  @ApiProperty({
    example: ['front_desk', 'lockers'],
    description: 'Daftar kunci hak akses modular untuk staf admin',
    isArray: true,
  })
  @IsArray({ message: 'Daftar hak akses harus berupa array' })
  @IsString({ each: true, message: 'Setiap kunci hak akses harus berupa string' })
  @IsIn(ALLOWED_STAFF_PERMISSIONS, {
    each: true,
    message: 'Kunci hak akses tidak valid atau tidak dikenal',
  })
  permissions!: string[];
}
