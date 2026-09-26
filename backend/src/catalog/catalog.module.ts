import { Module } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { AdminController } from './admin';
import { PublicController } from './public';

@Module({ imports: [BookingModule], controllers: [PublicController, AdminController] })
export class CatalogModule {}
