import { Module } from '@nestjs/common';
import { AdminLockersController, LockersService, MyLockerController } from './lockers';

@Module({ controllers: [AdminLockersController, MyLockerController], providers: [LockersService], exports: [LockersService] })
export class LockersModule {}
