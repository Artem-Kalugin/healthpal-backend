import { Expose } from 'class-transformer';

export class TimeSlotsRangeResponseDto {
  @Expose()
  minDate: string;

  @Expose()
  maxDate: string;
}
