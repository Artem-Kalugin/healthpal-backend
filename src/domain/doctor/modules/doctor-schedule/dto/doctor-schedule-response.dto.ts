import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ScheduleDay } from 'src/db/enums';

export class ScheduleRecord {
  @Expose()
  start: string;
  @Expose()
  end: string;
}

export class DoctorScheduleResponseDto {
  @ApiProperty({ isArray: true, type: ScheduleRecord })
  @Expose()
  @Type(() => ScheduleRecord)
  [ScheduleDay.MONDAY]: ScheduleRecord[];
  @ApiProperty({ isArray: true, type: ScheduleRecord })
  @Expose()
  @Type(() => ScheduleRecord)
  [ScheduleDay.THURSDAY]: ScheduleRecord[];
  @ApiProperty({ isArray: true, type: ScheduleRecord })
  @Expose()
  @Type(() => ScheduleRecord)
  [ScheduleDay.WEDNESDAY]: ScheduleRecord[];
  @ApiProperty({ isArray: true, type: ScheduleRecord })
  @Expose()
  @Type(() => ScheduleRecord)
  [ScheduleDay.TUESDAY]: ScheduleRecord[];
  @ApiProperty({ isArray: true, type: ScheduleRecord })
  @Expose()
  @Type(() => ScheduleRecord)
  [ScheduleDay.FRIDAY]: ScheduleRecord[];
  @ApiProperty({ isArray: true, type: ScheduleRecord })
  @Expose()
  @Type(() => ScheduleRecord)
  [ScheduleDay.SUNDAY]: ScheduleRecord[];
  @ApiProperty({ isArray: true, type: ScheduleRecord })
  @Expose()
  @Type(() => ScheduleRecord)
  [ScheduleDay.SATURDAY]: ScheduleRecord[];
}
