import { IsString, IsUUID } from 'class-validator';

export class RefreshDto {
  @IsUUID()
  userId: string;

  @IsString({ message: 'Пароль должен быть строкой' })
  refreshToken: string;
}
