import { Image } from 'src/common/helpers/image.dto';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class OnboardingSlide {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  image: Image;

  @Column({ length: 128 })
  title: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ default: true })
  isActive: boolean;
}
