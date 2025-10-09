import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { ImageFileStorageService } from 'src/infrastructure/file-storage/image-file-storage.service';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { UserNotFoundException } from './exceptions/user-not-found.exception';
import { getEntityRepository } from 'src/common/helpers/get-entity-repository';
import type { SafeRepository } from 'src/common/providers/safe-repository.providers';

@Injectable()
export class UsersService {
  constructor(
    @Inject(getEntityRepository(User.name))
    private readonly repository: SafeRepository<User>,
    private readonly imageFileStorageService: ImageFileStorageService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    avatar?: Buffer<ArrayBufferLike>,
  ): Promise<User> {
    let avatarSaved: User['avatar'];
    let savedFilePath: string | undefined;

    return await this.dataSource.transaction(async manager => {
      const userRepository = manager.withRepository(this.repository);

      const { password, ...rest } = createUserDto;
      const hashedPassword = await bcrypt.hash(password, 10);

      if (avatar) {
        avatarSaved = await this.imageFileStorageService.processAndSave(
          avatar,
          'avatar',
        );
        savedFilePath = avatarSaved.image;
      }

      const user = userRepository.create({
        ...rest,
        password: hashedPassword,
        avatar: avatarSaved,
        registrationComplete: false,
      });

      try {
        return await userRepository.safeSave(user);
      } catch (error) {
        if (savedFilePath) {
          this.imageFileStorageService.deleteImage(savedFilePath);
        }
        throw error;
      }
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.repository.findOne({ where: { id } });

    if (!user) {
      throw new UserNotFoundException();
    }

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    avatar?: Buffer<ArrayBufferLike>,
  ): Promise<User> {
    let avatarSaved: User['avatar'];
    let savedFilePath: string | undefined;
    let oldAvatarPath: string | undefined;

    return await this.dataSource
      .transaction(async manager => {
        const userRepository = manager.withRepository(this.repository);

        const existingUser = await userRepository.findOne({ where: { id } });

        if (!existingUser) {
          throw new UserNotFoundException();
        }

        if (avatar) {
          oldAvatarPath = existingUser.avatar?.image;
          avatarSaved = await this.imageFileStorageService.processAndSave(
            avatar,
            'avatar',
          );
          savedFilePath = avatarSaved.image;
        }

        try {
          return await userRepository.safeUpdate(id, {
            ...updateUserDto,
            avatar: avatarSaved,
            registrationComplete: !!(
              updateUserDto.birthday && updateUserDto.gender
            ),
          });
        } catch (error) {
          if (savedFilePath) {
            this.imageFileStorageService.deleteImage(savedFilePath);
          }
          throw error;
        }
      })
      .then(updatedUser => {
        if (oldAvatarPath && avatar) {
          this.imageFileStorageService.deleteImage(oldAvatarPath);
        }
        return updatedUser;
      });
  }

  async findOneByPhone(phone: string): Promise<User> {
    const user = await this.repository.findOne({ where: { phone } });

    if (!user) {
      throw new UserNotFoundException();
    }

    return user;
  }
}
