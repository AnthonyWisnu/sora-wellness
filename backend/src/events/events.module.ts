import { Module } from '@nestjs/common'
import { AdminEventsController, CoachEventsController, PublicEventsController } from './events.controller'
import { EventsService } from './events.service'

@Module({
  controllers: [PublicEventsController, AdminEventsController, CoachEventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
