import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString } from 'class-validator';

// Клиент шлёт полный ISO, в запросе нужна только дата
const toDatePart = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.slice(0, 10) : value;

export class TimeSlotsQueryDto {
  @ApiProperty({ example: '2026-10-29' })
  @Transform(toDatePart)
  @IsDateString({ strict: true })
  startDate: string;

  @ApiProperty({ example: '2026-11-05' })
  @Transform(toDatePart)
  @IsDateString({ strict: true })
  endDate: string;
}
