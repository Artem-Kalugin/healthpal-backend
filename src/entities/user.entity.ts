import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Check,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ManyToManyJoinOptions } from 'declarations';
import { UserFavoriteDoctor } from './user-favorite-doctor.relation';
import { UserFavoriteMedicalCenter } from './user-favorite-medical-center.relation';
import { NotUniqueErrorMetadata } from 'src/common/helpers/decorators/not-unique-error-metadata.decorator';

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
    name: 'user_favorite_medical_center',
    joinColumn: {
      name: 'medicalCenterId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'userId',
      referencedColumnName: 'id',
    },
  },
  [UserRelationKeys.FAVORITE_DOCTORS]: {
    name: 'user_favorite_doctor',
    joinColumn: {
      name: 'doctorId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'userId',
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

  @OneToMany(() => UserFavoriteDoctor, favorite => favorite.user)
  [UserRelationKeys.FAVORITE_DOCTORS]: UserFavoriteDoctor[];

  @OneToMany(() => UserFavoriteMedicalCenter, favorite => favorite.user)
  [UserRelationKeys.FAVORITE_MEDICAL_CENTERS]: UserFavoriteMedicalCenter[];

  @Column({ nullable: true })
  registrationComplete: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
