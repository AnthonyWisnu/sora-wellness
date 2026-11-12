import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { AuthRequest, assertPermission, assertRole, SessionGuard } from '../shared/security'
import { CreateEventDto, RegisterEventDto } from './events.dto'
import { EventsService } from './events.service'

@ApiTags('public events')
@Controller('public/events')
export class PublicEventsController {
  constructor(private readonly service: EventsService) {}

  @Get()
  list() {
    return this.service.listPublic()
  }

  @Get('ticket/:ticketCode')
  @UseGuards(ThrottlerGuard) @Throttle({ default: { limit: 30, ttl: 60_000 } })
  ticket(@Param('ticketCode') ticketCode: string) {
    return this.service.getTicket(ticketCode)
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.service.getPublic(slug)
  }

  @Post(':slug/register')
  @UseGuards(ThrottlerGuard)
  register(@Param('slug') slug: string, @Body() body: RegisterEventDto) {
    return this.service.register(slug, body)
  }
}

@ApiTags('admin events')
@ApiCookieAuth('wellness.sid')
@UseGuards(SessionGuard)
@Controller('admin/events')
export class AdminEventsController {
  constructor(private readonly service: EventsService) {}

  @Get()
  list(@Req() req: AuthRequest) {
    assertPermission(req, 'community_events')
    return this.service.listAdmin()
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() body: CreateEventDto) {
    assertPermission(req, 'community_events')
    return this.service.createEvent(body)
  }

  @Get(':slug')
  detail(@Req() req: AuthRequest, @Param('slug') slug: string) {
    assertPermission(req, 'community_events')
    return this.service.getPublic(slug, true)
  }

  @Put(':id')
  update(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateEventDto,
  ) {
    assertPermission(req, 'community_events')
    return this.service.updateEvent(id, body)
  }

  @Delete(':id')
  delete(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    assertPermission(req, 'community_events')
    return this.service.deleteEvent(id)
  }

  @Get(':id/registrations')
  registrations(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    assertPermission(req, 'community_events')
    return this.service.listRegistrations(id)
  }

  @Post('registrations/:regId/check-in')
  checkIn(@Req() req: AuthRequest, @Param('regId') regId: string) {
    assertPermission(req, 'community_events')
    return this.service.checkIn(regId)
  }
}

@ApiTags('coach events')
@ApiCookieAuth('wellness.sid')
@UseGuards(SessionGuard)
@Controller('coach/events')
export class CoachEventsController {
  constructor(private readonly service: EventsService) {}

  @Get()
  list(@Req() req: AuthRequest) {
    const actor = assertRole(req, 'coach')
    return this.service.listCoach(actor.id)
  }
}
