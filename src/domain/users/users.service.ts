import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ImageFileStorageService } from 'src/infrastructure/file-storage/image-file-storage.service';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { getEntityRepository } from 'src/common/helpers/get-entity-repository';
import type { SafeRepository } from 'src/common/helpers/safe-repository.provider';
import { UserNotFoundException } from './exceptions/user-not-found.exception';
import { PasswordService } from 'src/infrastructure/password/password.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject(getEntityRepository(User.name))
    private readonly repository: SafeRepository<User>,
    private readonly imageFileStorageService: ImageFileStorageService,
    private readonly passwordService: PasswordService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  private normalizeNameOrSurname(value: string): string {
    return value
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('-');
  }

  private normalizeNickname(nickname?: string): string | undefined {
    return nickname?.toLowerCase();
  }

  async create(
    createUserDto: CreateUserDto,
    avatar?: Buffer<ArrayBufferLike>,
  ): Promise<User> {
    let avatarSaved: User['avatar'];
    let savedFilePath: string | undefined;

    return await this.dataSource.transaction(async manager => {
      const userRepository = manager.withRepository(this.repository);

      const { password, name, surname, ...rest } = createUserDto;

      const hashedPassword = await this.passwordService.hash(password);

      if (avatar) {
        avatarSaved = await this.imageFileStorageService.processAndSave(
          avatar,
          'avatar',
          true,
        );
        savedFilePath = avatarSaved.image;
      }

      const user = userRepository.create({
        ...rest,
        name: this.normalizeNameOrSurname(name),
        surname: this.normalizeNameOrSurname(surname),
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
            false,
          );
          savedFilePath = avatarSaved.image;
        }

        try {
          return await userRepository.safeUpdate(id, {
            ...updateUserDto,
            name: updateUserDto.name
              ? this.normalizeNameOrSurname(updateUserDto.name)
              : undefined,
            surname: updateUserDto.surname
              ? this.normalizeNameOrSurname(updateUserDto.surname)
              : undefined,
            nickname: this.normalizeNickname(updateUserDto.nickname),
            avatar: avatarSaved,
            registrationComplete: !!(
              (updateUserDto.birthday ?? existingUser.birthday) &&
              (updateUserDto.gender ?? existingUser.gender)
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

  async findOne(id: string): Promise<User> {
    const user = await this.repository.findOne({ where: { id } });

    if (!user) {
      throw new UserNotFoundException();
    }

    return user;
  }

  async findOneByPhone(phone: string): Promise<User> {
    const user = await this.repository.findOne({ where: { phone } });

    if (!user) {
      throw new UserNotFoundException();
    }

    return user;
  }

  async changeUserPassword(userId: string, newPasswordHash: string) {
    await this.repository.safeUpdate(userId, { password: newPasswordHash });
  }
}
