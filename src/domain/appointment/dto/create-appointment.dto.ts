import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @Expose()
  @ApiProperty()
  @IsUUID()
  doctorId: string;

  @Expose()
  @ApiProperty()
  @IsUUID()
  timeSlotId: string;
}
