import {
  IntersectionType,
  OmitType,
  PartialType,
  PickType,
} from '@nestjs/swagger';
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

// мутации отдают врача без `category`
class AppointmentMutationDoctorDto extends IntersectionType(
  PickType(DoctorResponseDto, ['id'] as const),
  PartialType(OmitType(DoctorResponseDto, ['id', 'category'] as const)),
) {}

export class AppointmentMutationResponseDto extends OmitType(
  AppointmentResponseDto,
  ['doctor'] as const,
) {
  @Expose()
  @Type(() => AppointmentMutationDoctorDto)
  doctor: AppointmentMutationDoctorDto;
}
