import { ManyToOne, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';
import { Doctor } from './doctor.entity';

@Entity()
export class UserFavoriteDoctor {
  @PrimaryColumn('uuid')
  userId: string;

  @PrimaryColumn('uuid')
  doctorId: string;

  @ManyToOne(() => User, user => user.favoriteDoctors, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  doctor: Doctor;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
