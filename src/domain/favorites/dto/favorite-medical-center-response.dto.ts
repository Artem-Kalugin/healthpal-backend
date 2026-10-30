import { Expose } from 'class-transformer';

export class FavoriteMedicalCenterResponseDto {
  @Expose()
  success: boolean;

  @Expose()
  medicalCenterId: string;
}
