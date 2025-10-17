import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { DoctorResponseDto } from 'src/domain/doctor/dto/doctor-response.dto';

export class AppointmentResponseDto {
  @Expose()
  @ApiProperty()
  id: string;
  @Expose()
  @ApiProperty()
  userId: string;
  @Expose()
  @ApiProperty()
  doctorId: string;
  @Expose()
  @ApiPropertyOptional()
  timeSlotId?: string | null;
  @Expose()
  @ApiProperty()
  date: string;
  @Expose()
  @ApiProperty()
  startTime: string;
  @Expose()
  @ApiProperty()
  endTime: string;
  @Expose()
  @ApiProperty()
  isCancelled: boolean;
  @Expose()
  @ApiProperty()
  @Type(() => DoctorResponseDto)
  doctor: DoctorResponseDto;
}
