import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class ClassTypeDto {
  @ApiProperty({ example: 'Gentle Flow' })
  @IsString() @Length(2, 120) title!: string;
  @ApiProperty({ example: 'Yoga' })
  @IsString() @Length(2, 80) category!: string;
  @ApiProperty({ enum: ['beginner', 'intermediate_1', 'intermediate_2'] })
  @IsIn(['beginner', 'intermediate_1', 'intermediate_2']) level!: string;
  @ApiProperty({ example: 'Gerak perlahan dan napas sadar.' })
  @IsString() description!: string;
  @ApiProperty({ example: 60 })
  @IsInt() @Min(15) @Max(480) durationMinutes!: number;
  @ApiProperty({ example: 12 })
  @IsInt() @Min(1) @Max(500) defaultCapacity!: number;
  @ApiProperty({ example: 75000 })
  @IsInt() @Min(0) defaultPriceIdr!: number;
}
export class PolicyDto {
  @ApiProperty({ example: 7 })
  @IsInt() @Min(1) @Max(90) guestScheduleDays!: number;
  @ApiProperty({ example: 30 })
  @IsInt() @Min(1) @Max(180) memberScheduleDays!: number;
  @ApiProperty({ example: 120 })
  @IsInt() @Min(0) @Max(10080) bookingCutoffMinutes!: number;
  @ApiProperty({ example: 1440 })
  @IsInt() @Min(0) @Max(10080) cancellationCutoffMinutes!: number;
  @ApiProperty({ example: 15 })
  @IsInt() @Min(1) @Max(60) seatHoldMinutes!: number;
  @ApiProperty({ example: 8 })
  @IsInt() @Min(0) @Max(100) monthlyClassQuota!: number;
  @ApiProperty({ example: true })
  @IsBoolean() lockerEnabled!: boolean;
}
export class SessionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID() classTypeId!: string;
  @ApiProperty({ format: 'uuid' })
  @IsUUID() coachId!: string;
  @ApiProperty({ format: 'date', example: '2026-09-27' })
  @IsDateString() localDate!: string;
  @ApiProperty({ example: '09:00' })
  @IsString() localStartTime!: string;
  @ApiProperty({ example: 12 })
  @IsInt() @Min(1) @Max(500) capacity!: number;
  @ApiProperty({ example: 75000 })
  @IsInt() @Min(0) priceIdr!: number;
}
export class AdminSessionFilter { @ApiPropertyOptional({ format: 'date', example: '2026-09-25' }) @IsOptional() @IsDateString() date?: string; }
export class PackageDto {
  @ApiProperty({ example: 1 })
  @IsInt() @Min(1) @Max(36) durationMonths!: number;
  @ApiProperty({ example: 450000 })
  @IsInt() @Min(0) priceIdr!: number;
}
export class PackageChangeDto {
  @ApiProperty({ example: 450000 })
  @IsInt() @Min(0) priceIdr!: number;
  @ApiProperty({ example: true })
  @IsBoolean() active!: boolean;
}
export class ScheduleRuleDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID() classTypeId!: string;
  @ApiProperty({ format: 'uuid' })
  @IsUUID() coachId!: string;
  @ApiProperty({ example: '09:00' })
  @IsString() localStartTime!: string;
  @ApiProperty({ example: 12 })
  @IsInt() @Min(1) @Max(500) capacity!: number;
  @ApiProperty({ example: 75000 })
  @IsInt() @Min(0) priceIdr!: number;
  @ApiProperty({ minimum: 1, maximum: 7, description: 'Senin=1, Minggu=7' })
  @IsInt() @Min(1) @Max(7) isoWeekday!: number;
  @ApiProperty({ format: 'date', example: '2026-09-27' })
  @IsDateString() startsOn!: string;
  @ApiProperty({ format: 'date', example: '2026-12-27' })
  @IsDateString() endsOn!: string;
}
