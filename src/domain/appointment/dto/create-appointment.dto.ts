import { Expose } from 'class-transformer';
import { IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @Expose()
  @IsUUID()
  timeSlotId: string;
}
