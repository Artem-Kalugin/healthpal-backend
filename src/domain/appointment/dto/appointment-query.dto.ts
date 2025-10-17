import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginatedQueryDto } from 'src/common/helpers/pagination/paginated-query.dto';

export enum AppointmentType {
  CANCELED = 'CANCELED',
  FUTURE = 'FUTURE',
  PAST = 'PAST',
}
export class AppointmentQueryDto extends PaginatedQueryDto {
  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  isCancelled?: boolean;

  @IsEnum(AppointmentType)
  @ApiProperty({ enum: AppointmentType, enumName: 'AppointmentType' })
  @Expose()
  type: AppointmentType;
}
