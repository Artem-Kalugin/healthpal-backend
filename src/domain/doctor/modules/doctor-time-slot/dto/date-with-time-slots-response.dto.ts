import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class TimeSlotDto {
  @Expose()
  startTime: string;
  @Expose()
  id: string;
  @Expose()
  endTime: string;
  @Expose()
  available: boolean;
}

export class DateWithTimeSlots {
  @Expose()
  date: string;
  @ApiProperty({ isArray: true, type: TimeSlotDto })
  @Expose()
  @Type(() => TimeSlotDto)
  slots: TimeSlotDto[];
}
