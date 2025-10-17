import {
  ManyToOne,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { MedicalCenter } from './medical-center.entity';

@Entity()
export class UserFavoriteMedicalCenter {
  @PrimaryColumn('uuid')
  userId: string;
  @ManyToOne(() => User, user => user.favoriteMedicalCenters, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @PrimaryColumn('uuid')
  medicalCenterId: string;
  @ManyToOne(() => MedicalCenter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medicalCenterId' })
  medicalCenter: MedicalCenter;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
