import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class PaginatedResponseDto<T> {
  @Expose()
  @ApiProperty({ description: 'Current page' })
  page: number;

  @Expose()
  @ApiProperty({ description: 'Page size' })
  size: number;

  @Expose()
  @ApiProperty({ description: 'Whether there is a next page' })
  hasMore: boolean;

  @Expose()
  @ApiProperty({ isArray: true, description: 'Array of data' })
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
