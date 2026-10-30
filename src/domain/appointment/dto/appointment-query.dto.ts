import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum } from 'class-validator';
import { PaginatedQueryDto } from 'src/common/pagination/paginated-query.dto';

export enum AppointmentType {
  CANCELED = 'CANCELED',
  FUTURE = 'FUTURE',
  PAST = 'PAST',
}
export class AppointmentQueryDto extends PaginatedQueryDto {
  @IsEnum(AppointmentType)
  @ApiProperty({ enum: AppointmentType, enumName: 'AppointmentType' })
  @Expose()
  type: AppointmentType;
}
