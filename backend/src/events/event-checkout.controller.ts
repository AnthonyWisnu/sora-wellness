import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { AuthRequest, assertRole, SessionGuard } from '../shared/security';
import { EventCheckoutService } from './event-checkout.service';

class CheckoutActivityDto {
  @IsUUID() activityId!: string;
}

@ApiTags('event checkout')
@ApiCookieAuth('wellness.sid')
@UseGuards(SessionGuard)
@Controller('events')
export class EventCheckoutController {
  constructor(private readonly checkout: EventCheckoutService) {}

  @Post(':slug/checkout')
  create(@Req() req: AuthRequest, @Param('slug') slug: string, @Body() body: CheckoutActivityDto, @Headers('idempotency-key') key?: string) {
    return this.checkout.create(slug,body.activityId,assertRole(req,'customer').id,key);
  }

  @Get('registrations/:id')
  one(@Req() req: AuthRequest, @Param('id',ParseUUIDPipe) id: string) {
    return this.checkout.one(assertRole(req,'customer').id,id);
  }

  @Get(':slug/my-registration')
  latest(@Req() req: AuthRequest, @Param('slug') slug: string, @Query('activityId',ParseUUIDPipe) activityId: string) {
    return this.checkout.latest(slug,activityId,assertRole(req,'customer').id);
  }

  @Post('registrations/:id/resume-payment')
  resume(@Req() req: AuthRequest, @Param('id',ParseUUIDPipe) id: string) {
    return this.checkout.resume(assertRole(req,'customer').id,id);
  }

  @Post('registrations/:id/refresh-payment')
  refresh(@Req() req: AuthRequest, @Param('id',ParseUUIDPipe) id: string) {
    return this.checkout.refresh(assertRole(req,'customer').id,id);
  }
}
