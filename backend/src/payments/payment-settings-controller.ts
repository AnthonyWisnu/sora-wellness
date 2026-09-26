import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { AuthRequest, assertRole, SessionGuard } from '../shared/security';
import { PaymentSettings } from './payment-settings';
import { MidtransClient } from './midtrans';

class PaymentSettingsDto {
  @ApiProperty({ example: 'G123456789' }) @IsString() merchantId!: string;
  @ApiProperty({ example: 'Mid-client-example' }) @IsString() @Matches(/^Mid-client-/) clientKey!: string;
  @ApiProperty({ writeOnly: true, example: 'Mid-server-example' }) @IsString() @Matches(/^Mid-server-/) serverKey!: string;
}

@ApiTags('admin payment settings') @ApiCookieAuth('wellness.sid') @UseGuards(SessionGuard)
@Controller('admin/payment-settings')
export class PaymentSettingsController {
  constructor(private readonly settings: PaymentSettings) {}

  @Get()
  async read(@Req() req: AuthRequest) { assertRole(req, 'admin'); return this.settings.readPublic(); }

  @Put()
  async save(@Req() req: AuthRequest, @Body() body: PaymentSettingsDto) {
    assertRole(req, 'admin');
    await this.settings.save(body);
    return this.settings.readPublic();
  }

  @Post('test')
  async test(@Req() req: AuthRequest) {
    assertRole(req, 'admin');
    const { serverKey } = await this.settings.credentials();
    const orderId = `wellness-check-${randomUUID().slice(0, 8)}`;
    const result = await new MidtransClient(serverKey).createSnapTransaction(orderId, 10000);
    return { orderId, tokenReceived: Boolean(result.token), redirectHost: new URL(result.redirect_url).hostname };
  }
}
