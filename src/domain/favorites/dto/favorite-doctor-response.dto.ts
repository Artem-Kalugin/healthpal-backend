import { Expose } from 'class-transformer';

export class FavoriteDoctorResponseDto {
  @Expose()
  success: boolean;

  @Expose()
  doctorId: string;
}
