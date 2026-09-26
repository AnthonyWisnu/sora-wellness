import { Module } from '@nestjs/common';
import { AdminFinanceController } from './admin-finance';

@Module({ controllers: [AdminFinanceController] })
export class FinanceModule {}
