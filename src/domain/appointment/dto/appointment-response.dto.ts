import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { DoctorResponseDto } from 'src/domain/doctor/dto/doctor-response.dto';

export class AppointmentResponseDto {
  @Expose()
  id: string;
  @Expose()
  userId: string;
  @Expose()
  doctorId: string;
  @ApiProperty({
    description: 'Null for a cancelled appointment: cancelling frees the slot',
    nullable: true,
  })
  @Expose()
  timeSlotId: string | null;
  @Expose()
  date: string;
  @Expose()
  startTime: string;
  @Expose()
  endTime: string;
  @Expose()
  isCancelled: boolean;
  @Expose()
  @Type(() => DoctorResponseDto)
  doctor: DoctorResponseDto;
}
