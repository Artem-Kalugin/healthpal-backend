import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum DoctorCategoryType {
  DENTISTRY = 'dentistry',
  CARDIOLOGY = 'cardiology',
  PULMONOLOGY = 'pulmonology',
  GENERAL = 'general',
  NEUROLOGY = 'neurology',
  GASTROENTEROLOGY = 'gastroenterology',
  LABORATORY = 'laboratory',
  VACCINATION = 'vaccination',
}

@Entity()
export class DoctorCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: DoctorCategoryType,
  })
  type: DoctorCategoryType;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ type: 'text', nullable: true })
  icon: string;
}
