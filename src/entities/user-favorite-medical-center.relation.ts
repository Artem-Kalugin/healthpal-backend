import { ManyToOne, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';
import { MedicalCenter } from './medical-center.entity';

@Entity()
export class UserFavoriteMedicalCenter {
  @PrimaryColumn('uuid')
  userId: string;

  @PrimaryColumn('uuid')
  medicalCenterId: string;

  @ManyToOne(() => User, user => user.favoriteDoctors, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => MedicalCenter, { onDelete: 'CASCADE' })
  medicalCenter: MedicalCenter;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
