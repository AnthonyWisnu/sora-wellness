import { Module } from '@nestjs/common';
import { AdminAccountController, AuthController } from './auth';

@Module({ controllers: [AuthController, AdminAccountController] })
export class AuthModule {}
