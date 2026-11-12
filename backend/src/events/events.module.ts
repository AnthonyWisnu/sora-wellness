import { Module } from '@nestjs/common'
import { AdminEventsController, CoachEventsController, PublicEventsController } from './events.controller'
import { EventsService } from './events.service'
import { PaymentsModule } from '../payments/payments.module'
import { EventCheckoutService } from './event-checkout.service'
import { EventCheckoutController } from './event-checkout.controller'

@Module({
  imports: [PaymentsModule],
  controllers: [PublicEventsController, AdminEventsController, CoachEventsController, EventCheckoutController],
  providers: [EventsService, EventCheckoutService],
  exports: [EventsService],
})
export class EventsModule {}
