import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ScheduleDay } from 'src/entities/doctor-schedule.entity';

export class ScheduleRecord {
  @Expose()
  start: string;
  @Expose()
  end: string;
}

export class DoctorScheduleResponseDto {
  @ApiProperty({ isArray: true, type: ScheduleRecord })
  @Expose()
  [ScheduleDay.MONDAY]: ScheduleRecord[];
  @ApiProperty({ isArray: true, type: ScheduleRecord })
  @Expose()
  [ScheduleDay.THURSDAY]: ScheduleRecord[];
  @ApiProperty({ isArray: true, type: ScheduleRecord })
  @Expose()
  [ScheduleDay.WEDNESDAY]: ScheduleRecord[];
  @ApiProperty({ isArray: true, type: ScheduleRecord })
  @Expose()
  [ScheduleDay.TUESDAY]: ScheduleRecord[];
  @ApiProperty({ isArray: true, type: ScheduleRecord })
  @Expose()
  [ScheduleDay.FRIDAY]: ScheduleRecord[];
  @ApiProperty({ isArray: true, type: ScheduleRecord })
  @Expose()
  [ScheduleDay.SUNDAY]: ScheduleRecord[];
  @ApiProperty({ isArray: true, type: ScheduleRecord })
  @Expose()
  [ScheduleDay.SATURDAY]: ScheduleRecord[];
}
