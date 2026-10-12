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
import { AuthRequest, assertRole, SessionGuard } from '../shared/security'
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
  ticket(@Param('ticketCode') ticketCode: string) {
    return this.service.getTicket(ticketCode)
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.service.getPublic(slug)
  }

  @Post(':slug/register')
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
    assertRole(req, 'admin', 'superadmin')
    return this.service.listAdmin()
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() body: CreateEventDto) {
    assertRole(req, 'admin', 'superadmin')
    return this.service.createEvent(body)
  }

  @Get(':slug')
  detail(@Req() req: AuthRequest, @Param('slug') slug: string) {
    assertRole(req, 'admin', 'superadmin')
    return this.service.getPublic(slug)
  }

  @Put(':id')
  update(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateEventDto,
  ) {
    assertRole(req, 'admin', 'superadmin')
    return this.service.updateEvent(id, body)
  }

  @Delete(':id')
  delete(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    assertRole(req, 'admin', 'superadmin')
    return this.service.deleteEvent(id)
  }

  @Get(':id/registrations')
  registrations(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    assertRole(req, 'admin', 'superadmin')
    return this.service.listRegistrations(id)
  }

  @Post('registrations/:regId/check-in')
  checkIn(@Req() req: AuthRequest, @Param('regId') regId: string) {
    assertRole(req, 'admin', 'superadmin')
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
