import {
  ManyToOne,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Doctor } from './doctor.entity';

@Entity()
export class UserFavoriteDoctor {
  @PrimaryColumn('uuid')
  userId: string;
  @ManyToOne(() => User, user => user.favoriteDoctors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @PrimaryColumn('uuid')
  doctorId: string;
  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorId' })
  doctor: Doctor;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
