import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { FileStorageModule } from 'src/infrastructure/file-storage/file-storage.module';
import { createSafeRepositoryProviders } from 'src/common/providers/safe-repository.providers';

const UserModuleEntities = [User];

@Module({
  imports: [TypeOrmModule.forFeature(UserModuleEntities), FileStorageModule],
  providers: [
    UsersService,
    ...createSafeRepositoryProviders(UserModuleEntities),
  ],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
