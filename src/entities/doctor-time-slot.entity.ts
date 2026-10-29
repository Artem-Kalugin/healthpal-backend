import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { Appointment } from './appointment.entity';

@Entity()
export class DoctorTimeSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  doctorId: string;
  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorId' })
  doctor: Doctor;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @OneToOne(() => Appointment, appointment => appointment.timeSlot, {
    onDelete: 'CASCADE',
  })
  appointment: Appointment;
}
