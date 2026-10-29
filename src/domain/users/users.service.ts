import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ImageFileStorageService } from 'src/infrastructure/file-storage/image-file-storage.service';
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

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { password, name, surname, ...rest } = createUserDto;

    const hashedPassword = await this.passwordService.hash(password);

    const user = this.repository.create({
      ...rest,
      name: this.normalizeNameOrSurname(name),
      surname: this.normalizeNameOrSurname(surname),
      password: hashedPassword,
      registrationComplete: false,
    });

    return await this.repository.safeSave(user);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    avatar?: Buffer<ArrayBufferLike>,
  ): Promise<User> {
    const existingUser = await this.repository.findOne({ where: { id } });

    if (!existingUser) {
      throw new UserNotFoundException();
    }

    let avatarSaved: User['avatar'];

    if (avatar) {
      avatarSaved = await this.imageFileStorageService.processAndSave(
        avatar,
        'avatar',
        false,
      );
    }

    let updatedUser: User;

    try {
      updatedUser = await this.repository.safeUpdate(id, {
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
      if (avatarSaved) {
        this.imageFileStorageService.deleteImage(avatarSaved.image);
      }
      throw error;
    }

    if (avatar && existingUser.avatar?.image) {
      this.imageFileStorageService.deleteImage(existingUser.avatar.image);
    }

    return updatedUser;
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
