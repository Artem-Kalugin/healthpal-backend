import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginatedQueryDto } from 'src/common/helpers/pagination/paginated-query.dto';

export enum AppointmentType {
  CANCELED = 'CANCELED',
  FUTURE = 'FUTURE',
  PAST = 'PAST',
}
export class AppointmentQueryDto extends PaginatedQueryDto {
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isCancelled?: boolean;

  @IsEnum(AppointmentType)
  @ApiProperty({ enum: AppointmentType, enumName: 'AppointmentType' })
  @Expose()
  type: AppointmentType;
}
