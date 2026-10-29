import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class PaginatedResponseDto<T> {
  @Expose()
  @ApiProperty({ description: 'Текущая страница' })
  page: number;

  @Expose()
  @ApiProperty({ description: 'Размер страницы' })
  size: number;

  @Expose()
  @ApiProperty({ description: 'Есть ли следующая страница' })
  hasMore: boolean;

  @Expose()
  @ApiProperty({ isArray: true, description: 'Массив данных' })
  @Type(() => Object)
  data: T[];

  constructor(partial: Partial<PaginatedResponseDto<T>>) {
    Object.assign(this, partial);
  }
}

export function PaginatedResponseOf<T>(
  classReference: new () => T,
): new (partial: Partial<PaginatedResponseDto<T>>) => PaginatedResponseDto<T> {
  class PaginatedResponseWithType extends PaginatedResponseDto<T> {
    @Expose()
    @Type(() => classReference)
    declare data: T[];
  }
  return PaginatedResponseWithType;
}
