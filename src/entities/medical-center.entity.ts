import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum MedicalCenterType {
  HOSPITAL = 'hospital',
  CLINIC = 'clinc',
  CABINET = 'cabinet',
}

@Entity()
export class MedicalCenter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ collation: 'ru_RU.UTF-8' })
  name: string;

  @Column({ collation: 'ru_RU.UTF-8' })
  address: string;

  @Column()
  city: string;

  @Column({ type: 'jsonb' })
  image: { image: string; thumbhash: string };

  @Column({ type: 'float' })
  lat: number;

  @Column({ type: 'float' })
  lon: number;

  @Column({
    type: 'enum',
    enum: MedicalCenterType,
    default: MedicalCenterType.CLINIC,
  })
  type: MedicalCenterType;
}
