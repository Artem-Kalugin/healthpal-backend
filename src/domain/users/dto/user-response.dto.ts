import { OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { User } from '../../../entities/user.entity';

export class UserResponseDto extends OmitType(User, ['password'] as const) {
  @Exclude()
  password?: string;
}
