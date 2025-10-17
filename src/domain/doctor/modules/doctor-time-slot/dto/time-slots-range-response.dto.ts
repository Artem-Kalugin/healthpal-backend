import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TimeSlotsRangeResponseDto {
  @Expose()
  @ApiProperty()
  minDate: string;

  @Expose()
  @ApiProperty()
  maxDate: string;
}
