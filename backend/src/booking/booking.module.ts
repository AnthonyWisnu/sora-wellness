import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { BookingController } from './bookings';
import { CancellationsService } from './cancellations';

@Module({ imports: [PaymentsModule], controllers: [BookingController], providers: [CancellationsService], exports: [CancellationsService] })
export class BookingModule {}
