import { Expose } from 'class-transformer';
import { IsUUID } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsUUID()
  @Expose()
  newTimeSlotId: string;
}
