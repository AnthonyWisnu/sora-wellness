import { Module } from '@nestjs/common';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { BookingModule } from './booking/booking.module';
import { FinanceModule } from './finance/finance.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ContentModule } from './content/content.module';
import { HealthModule } from './health/health.module';
import { LockersModule } from './lockers/lockers.module';
import { MembershipModule } from './membership/membership.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [SharedModule, AuthModule, CatalogModule, BookingModule, FinanceModule,
    AttendanceModule, ContentModule, HealthModule, LockersModule, MembershipModule, PaymentsModule],
})
export class AppModule {}
