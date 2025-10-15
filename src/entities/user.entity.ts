import { NotUniqueErrorMetadata } from 'src/common/helpers/decorators/not-unique-error-metadata.decorator';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Check,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { MedicalCenter } from './medical-center.entity';
import { ManyToManyJoinOptions } from 'declarations';
import { Doctor } from './doctor.entity';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum UserRelationKeys {
  FAVORITE_MEDICAL_CENTERS = 'favoriteMedicalCenters',
  FAVORITE_DOCTORS = 'favoriteDoctors',
}

export const UserJoinsStructure: {
  [x in UserRelationKeys]: ManyToManyJoinOptions;
} = {
  [UserRelationKeys.FAVORITE_MEDICAL_CENTERS]: {
    name: 'user_favorite_medical_centers',
    joinColumn: {
      name: 'userId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'centerId',
      referencedColumnName: 'id',
    },
  },
  [UserRelationKeys.FAVORITE_DOCTORS]: {
    name: 'user_favorite_doctors',
    joinColumn: {
      name: 'userId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'doctorId',
      referencedColumnName: 'id',
    },
  },
};

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  surname: string;

  @NotUniqueErrorMetadata(
    'Пользователь с таким номером телефона уже существует',
  )
  @Column({ unique: true })
  @Check(`"phone" ~ '^\\+\\d{11}$'`)
  phone: string;

  @Column()
  password: string;

  @NotUniqueErrorMetadata(
    'Пользователь с таким именем пользователя уже существует',
  )
  @Column({ nullable: true, unique: true })
  nickname?: string;

  @Column({ nullable: true })
  @Check(`"birthday" <= CURRENT_DATE`)
  birthday: Date;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender;

  @Column({ type: 'jsonb', nullable: true })
  avatar?: { image: string; thumbhash: string };

  @ManyToMany(() => MedicalCenter)
  @JoinTable(UserJoinsStructure[UserRelationKeys.FAVORITE_MEDICAL_CENTERS])
  [UserRelationKeys.FAVORITE_MEDICAL_CENTERS]: MedicalCenter[];

  @ManyToMany(() => Doctor)
  @JoinTable(UserJoinsStructure[UserRelationKeys.FAVORITE_DOCTORS])
  [UserRelationKeys.FAVORITE_DOCTORS]: Doctor[];

  @Column({ nullable: true })
  registrationComplete: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
