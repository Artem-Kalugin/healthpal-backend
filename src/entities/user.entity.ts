import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotUniqueErrorMetadata } from 'src/common/decorators/not-unique-error-metadata.decorator';
import { Entity, PrimaryGeneratedColumn, Column, Check } from 'typeorm';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

@Entity()
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Имя и фамилия пользователя',
    example: 'Пользователь Приложения',
  })
  @Column()
  fullName: string;

  @ApiProperty({
    description: 'Телефон в формате +7...',
    example: '+79323572448',
  })
  @NotUniqueErrorMetadata(
    'Пользователь с таким номером телефона уже существует',
  )
  @Column({ unique: true })
  @Check(`"phone" ~ '^\\+\\d{11}$'`)
  phone: string;

  @ApiProperty({ description: 'Пароль пользователя', example: 'password' })
  @Column()
  password: string;

  @ApiPropertyOptional({
    description: 'Никнейм пользователя',
    example: 'user1337',
  })
  @NotUniqueErrorMetadata(
    'Пользователь с таким именем пользователя уже существует',
  )
  @Column({ nullable: true, unique: true })
  nickname?: string;

  @ApiProperty({
    description: 'Дата рождения',
    example: '2025-10-06',
    type: String,
    format: 'date',
  })
  @Column({ nullable: true })
  @Check(`"birthday" <= CURRENT_DATE`)
  birthday: Date;

  @ApiProperty({
    description: 'Пол',
    example: Gender.MALE,
    enum: Gender,
    enumName: 'Gender',
  })
  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender;

  @ApiPropertyOptional({
    description: 'Аватар: { image: ссылка на файл, thumbhash: хэш превью }',
  })
  @Column({ type: 'jsonb', nullable: true })
  avatar?: { image: string; thumbhash: string };

  @ApiProperty({
    description: 'Никнейм пользователя',
    type: 'boolean',
  })
  @Column({ nullable: true })
  registrationComplete: boolean;
}
