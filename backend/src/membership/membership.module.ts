import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { MeController } from './me';
import { MembershipPurchasesController, MembershipPurchasesService } from './membership-purchases';

@Module({ imports: [PaymentsModule], controllers: [MeController, MembershipPurchasesController], providers: [MembershipPurchasesService] })
export class MembershipModule {}
