import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MedicalCenter } from './medical-center.entity';
import { DoctorCategory } from './doctor-category.entity';
import { MinimalManyToManyJoinOptions } from 'declarations';

export enum DoctorRelationKeys {
  MEDICAL_CENTER = 'medicalCenter',
  CATEGORY = 'category',
}

export const DoctorJoinsStructure: {
  [x in DoctorRelationKeys]: MinimalManyToManyJoinOptions;
} = {
  [DoctorRelationKeys.CATEGORY]: {
    name: 'categoryId',
  },
  [DoctorRelationKeys.MEDICAL_CENTER]: {
    name: 'medicalCenterId',
  },
} as const;

@Entity()
export class Doctor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, collation: 'ru_RU.UTF-8' })
  name: string;

  @Column({ length: 255, collation: 'ru_RU.UTF-8' })
  surname: string;

  @Column('int')
  practiceStartYear: number;

  @Column('int')
  patientsCount: number;

  @Column('int')
  reviewsCount: number;

  @Column({ type: 'jsonb' })
  image: { image: string; thumbhash: string };

  @Column('decimal', { precision: 2, scale: 1 })
  rating: number;

  @Column({ type: 'varchar', length: 1000 })
  description: string;

  @ManyToOne(() => DoctorCategory)
  @JoinColumn(DoctorJoinsStructure[DoctorRelationKeys.CATEGORY])
  [DoctorRelationKeys.CATEGORY]: DoctorCategory;

  @ManyToOne(() => MedicalCenter)
  @JoinColumn(DoctorJoinsStructure[DoctorRelationKeys.MEDICAL_CENTER])
  [DoctorRelationKeys.MEDICAL_CENTER]: MedicalCenter;
}
