import { Expose, Type } from 'class-transformer';
import { DoctorResponseDto } from 'src/domain/doctor/dto/doctor-response.dto';

export class AppointmentResponseDto {
  @Expose()
  id: string;
  @Expose()
  userId: string;
  @Expose()
  doctorId: string;
  @Expose()
  timeSlotId?: string | null;
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
