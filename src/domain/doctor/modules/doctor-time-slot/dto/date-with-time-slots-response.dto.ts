import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class TimeSlotDto {
  @ApiProperty()
  @Expose()
  startTime: string;
  @ApiProperty()
  @Expose()
  id: string;
  @ApiProperty()
  @Expose()
  endTime: string;
  @ApiProperty()
  @Expose()
  available: boolean;
}

export class DateWithTimeSlots {
  @ApiProperty()
  @Expose()
  date: string;
  @ApiProperty({ isArray: true, type: TimeSlotDto })
  @Expose()
  @Type(() => TimeSlotDto)
  slots: TimeSlotDto[];
}
