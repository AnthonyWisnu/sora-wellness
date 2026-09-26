import { Module } from '@nestjs/common';
import { PaymentSettingsController } from './payment-settings-controller';
import { PaymentSettings } from './payment-settings';
import { PaymentsController } from './payments-controller';
import { PaymentsService } from './payments';

@Module({ controllers: [PaymentSettingsController, PaymentsController], providers: [PaymentSettings, PaymentsService], exports: [PaymentSettings, PaymentsService] })
export class PaymentsModule {}
