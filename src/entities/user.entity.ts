import { NotUniqueErrorMetadata } from 'src/common/decorators/not-unique-error-metadata.decorator';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Check,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

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

  @Column({ nullable: true })
  registrationComplete: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
