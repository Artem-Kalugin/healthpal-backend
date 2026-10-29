import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { FileStorageModule } from 'src/infrastructure/file-storage/file-storage.module';
import { PasswordModule } from 'src/infrastructure/password/password.module';

@Module({
  imports: [FileStorageModule, PasswordModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
