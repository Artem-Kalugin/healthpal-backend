import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { User } from './user.entity';
import { DoctorTimeSlot } from './doctor-time-slot.entity';

@Entity()
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  doctorId: string;
  @ManyToOne(() => Doctor, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'doctorId' })
  doctor: Doctor;

  @Column({ type: 'uuid', nullable: true })
  timeSlotId: string | null;
  @OneToOne(() => DoctorTimeSlot, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'timeSlotId' })
  timeSlot?: DoctorTimeSlot;

  @Column({ type: 'boolean', default: false })
  isCancelled: boolean;

  //snapshot cols
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;
}
