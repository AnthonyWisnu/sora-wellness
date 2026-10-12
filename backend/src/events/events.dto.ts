import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

export class CreateActivityDto {
  @ApiProperty({ example: 'Sunrise Yoga Flow' })
  @IsString()
  @Length(2, 120)
  title!: string

  @ApiPropertyOptional({ example: 'Yoga' })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  category?: string

  @ApiPropertyOptional({ example: 'Nadia Putri' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  coachName?: string

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classTypeId?: string

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  coachId?: string

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isGuestCoach?: boolean

  @ApiPropertyOptional({ example: 'Bima Satria (Tamu)' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  guestCoachName?: string

  @ApiProperty({ example: '06:30' })
  @IsString()
  startTime!: string

  @ApiProperty({ example: '08:00' })
  @IsString()
  endTime!: string

  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity!: number

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priceIdr?: number
}

export class CreateEventDto {
  @ApiProperty({ example: 'SORA Sunrise Yoga & Wellness Gathering' })
  @IsString()
  @Length(3, 150)
  title!: string

  @ApiPropertyOptional({ example: 'sora-sunrise-gathering' })
  @IsOptional()
  @IsString()
  @Length(3, 120)
  slug?: string

  @ApiPropertyOptional({ example: 'Event komunitas terbuka menyambut akhir tahun bersama Sora.' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ example: 'Pantai Sanur, Denpasar' })
  @IsString()
  @Length(2, 150)
  locationName!: string

  @ApiPropertyOptional({ example: 'Jl. Cemara, Sanur, Denpasar Selatan' })
  @IsOptional()
  @IsString()
  locationAddress?: string

  @ApiProperty({ example: '2026-12-19' })
  @IsDateString()
  startDate!: string

  @ApiProperty({ example: '2026-12-19' })
  @IsDateString()
  endDate!: string

  @ApiPropertyOptional({ enum: ['draft', 'published', 'completed', 'cancelled'] })
  @IsOptional()
  @IsIn(['draft', 'published', 'completed', 'cancelled'])
  status?: 'draft' | 'published' | 'completed' | 'cancelled'

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  bannerMediaId?: string

  @ApiProperty({ type: [CreateActivityDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateActivityDto)
  activities!: CreateActivityDto[]
}

export class RegisterEventDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  activityId!: string

  @ApiProperty({ example: 'Budi Santoso' })
  @IsString()
  @Length(2, 100)
  guestName!: string

  @ApiProperty({ example: 'budi@example.com' })
  @IsEmail()
  guestEmail!: string

  @ApiPropertyOptional({ example: '081234567890' })
  @IsOptional()
  @IsString()
  guestPhone?: string
}
