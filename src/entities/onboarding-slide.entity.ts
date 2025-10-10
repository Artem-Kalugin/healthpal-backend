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
  @Column({ type: 'jsonb', nullable: true })
  image: { image: string; thumbhash: string };

  @Column({ length: 128 })
  @ApiProperty()
  title: string;

  @Column({ type: 'text' })
  @ApiProperty()
  text: string;

  @Column({ type: 'int', default: 0 })
  @ApiProperty()
  order: number;

  @Column({ default: true })
  @ApiProperty()
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  @ApiProperty({ description: 'Дата создания слайда' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  @ApiProperty({ description: 'Дата последнего обновления слайда' })
  updatedAt: Date;
}
