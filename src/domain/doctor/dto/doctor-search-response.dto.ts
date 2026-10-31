import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { PaginatedResponseDto } from 'src/common/pagination/paginated-response.dto';
import { DoctorResponseDto } from './doctor-response.dto';

export class DoctorSearchResponseDto extends PaginatedResponseDto<DoctorResponseDto> {
  @Expose()
  @ApiProperty({ description: 'Number of doctors matching the filters' })
  total: number;

  @Expose()
  @Type(() => DoctorResponseDto)
  @ApiProperty({ type: DoctorResponseDto, isArray: true })
  declare data: DoctorResponseDto[];
}
