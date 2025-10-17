import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsUUID, IsOptional } from 'class-validator';

export class CreateAppointmentDto {
  @Expose()
  @ApiProperty()
  @IsUUID()
  doctorId: string;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  timeSlotId?: string;
}
