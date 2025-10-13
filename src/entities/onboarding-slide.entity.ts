import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class OnboardingSlide {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: '{ image: ссылка на файл, thumbhash: хэш превью }',
  })
  image: { image: string; thumbhash: string };

  @Column({ length: 128 })
  title: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
