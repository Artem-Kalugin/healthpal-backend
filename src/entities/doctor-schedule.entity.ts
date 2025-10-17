import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Doctor } from './doctor.entity';

export enum ScheduleDay {
  MONDAY = 1,
  THURSDAY = 2,
  WEDNESDAY = 3,
  TUESDAY = 4,
  FRIDAY = 5,
  SUNDAY = 6,
  SATURDAY = 7,
}

@Entity()
export class DoctorSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  doctorId: string;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  doctor: string;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ type: 'enum', enum: ScheduleDay })
  weekday: ScheduleDay;
}
