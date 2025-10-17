import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsUUID } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsUUID()
  @Expose()
  @ApiProperty()
  newTimeSlotId: string;
}
