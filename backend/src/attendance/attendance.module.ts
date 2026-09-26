import { Module } from '@nestjs/common';
import { AdminAttendanceController, AttendanceService, CoachController } from './attendance';

@Module({ controllers: [CoachController, AdminAttendanceController], providers: [AttendanceService] })
export class AttendanceModule {}
