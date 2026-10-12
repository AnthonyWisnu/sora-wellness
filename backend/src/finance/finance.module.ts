import { Module } from '@nestjs/common';
import { AdminFinanceController } from './admin-finance';
import { AdminWithdrawalController, CustomerWithdrawalController } from './withdrawals';

@Module({
  controllers: [AdminFinanceController, AdminWithdrawalController, CustomerWithdrawalController],
})
export class FinanceModule {}
