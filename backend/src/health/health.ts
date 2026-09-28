import { BadRequestException, Body, Controller, Delete, Get, Injectable, Put, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Equals, IsBoolean, IsString, Length } from 'class-validator';
import { Db } from '../shared/db';
import { AuthRequest, assertRole, SessionGuard } from '../shared/security';

class HealthDto {
  @ApiProperty({ description: 'Catatan sederhana yang relevan untuk kelas.', maxLength: 2000 })
  @IsString() @Length(1, 2000) note!: string;
  @ApiProperty({ example: true, description: 'Persetujuan jelas pelanggan sebelum data kesehatan disimpan.' })
  @IsBoolean() @Equals(true) consent!: boolean;
}

@Injectable()
export class HealthService {
  constructor(private readonly db: Db) {}

  async read(customerId: string) {
    const found = await this.db.query<{ note: string; consentedAt: Date; updatedAt: Date }>('SELECT note,consented_at AS "consentedAt",updated_at AS "updatedAt" FROM health_profiles WHERE customer_id=$1', [customerId]);
    return found.rows[0] ?? { note: null, consentedAt: null, updatedAt: null };
  }

  async save(customerId: string, note: string) {
    const cleaned = note.trim();
    if (!cleaned || cleaned.length > 2000) throw new BadRequestException('Catatan kesehatan harus 1-2000 karakter');
    await this.db.transaction(async (client) => {
      await client.query('SELECT id FROM app_users WHERE id=$1 FOR UPDATE', [customerId]);
      const timestamp = await client.query<{ at: Date }>('SELECT clock_timestamp() AS at');
      const at = timestamp.rows[0].at;
      await client.query(`INSERT INTO health_profiles (customer_id,note,consented_at,updated_at) VALUES ($1,$2,$3,$3) ON CONFLICT (customer_id) DO UPDATE SET note=$2,consented_at=$3,updated_at=$3`, [customerId,cleaned,at]);
      await client.query('INSERT INTO health_profile_revisions (customer_id,note,recorded_at) VALUES ($1,$2,$3)', [customerId,cleaned,at]);
    });
    return this.read(customerId);
  }

  async remove(customerId: string) {
    await this.db.transaction(async (client) => {
      await client.query('SELECT id FROM app_users WHERE id=$1 FOR UPDATE', [customerId]);
      await client.query('DELETE FROM health_snapshots WHERE customer_id=$1', [customerId]);
      await client.query('DELETE FROM health_profile_revisions WHERE customer_id=$1', [customerId]);
      await client.query('DELETE FROM health_profiles WHERE customer_id=$1', [customerId]);
    });
    return { deleted: true };
  }

  async cleanup() {
    await this.db.query('DELETE FROM health_snapshots WHERE delete_after<=now()');
    await this.db.query(`DELETE FROM health_profile_revisions r WHERE r.recorded_at < now()-interval '1 year' AND EXISTS (SELECT 1 FROM health_profile_revisions newer WHERE newer.customer_id=r.customer_id AND newer.recorded_at < now()-interval '1 year' AND (newer.recorded_at>r.recorded_at OR newer.recorded_at=r.recorded_at AND newer.id>r.id))`);
  }
}

@ApiTags('health') @ApiCookieAuth('wellness.sid') @UseGuards(SessionGuard)
@Controller('me/health')
export class HealthController {
  constructor(private readonly health: HealthService) {}
  @Get()
  read(@Req() req: AuthRequest) { return this.health.read(assertRole(req,'customer').id); }
  @Put()
  save(@Req() req: AuthRequest, @Body() body: HealthDto) { return this.health.save(assertRole(req,'customer').id,body.note); }
  @Delete()
  remove(@Req() req: AuthRequest) { return this.health.remove(assertRole(req,'customer').id); }
}
