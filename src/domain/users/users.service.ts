import { Inject, Injectable } from '@nestjs/common';
import { eq, type SQL } from 'drizzle-orm';
import { firstOrThrow } from 'src/common/helpers/first-or-throw';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { user } from 'src/db/schema';
import type { User } from 'src/db/schema';
import { ImageFileStorageService } from 'src/infrastructure/file-storage/image-file-storage.service';
import { PasswordService } from 'src/infrastructure/password/password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserNotFoundException } from './exceptions/user-not-found.exception';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB) private readonly db: Database,
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

  async create(createUserDto: CreateUserDto) {
    const { password, name, surname, ...rest } = createUserDto;

    const hashedPassword = await this.passwordService.hash(password);

    const [created] = await this.db
      .insert(user)
      .values({
        ...rest,
        name: this.normalizeNameOrSurname(name),
        surname: this.normalizeNameOrSurname(surname),
        password: hashedPassword,
        registrationComplete: false,
      })
      .returning();

    return created;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    avatar?: Buffer<ArrayBufferLike>,
  ) {
    const existingUser = await this.findOne(id);

    const avatarSaved = avatar
      ? await this.imageFileStorageService.processAndSave(
          avatar,
          'avatar',
          false,
        )
      : undefined;

    const birthday = updateUserDto.birthday
      ? new Date(updateUserDto.birthday)
      : undefined;

    let updatedUser: User | undefined;

    try {
      // undefined-поля Drizzle в UPDATE не включает, то есть не затирает
      [updatedUser] = await this.db
        .update(user)
        .set({
          ...updateUserDto,
          birthday,
          name: updateUserDto.name
            ? this.normalizeNameOrSurname(updateUserDto.name)
            : undefined,
          surname: updateUserDto.surname
            ? this.normalizeNameOrSurname(updateUserDto.surname)
            : undefined,
          nickname: this.normalizeNickname(updateUserDto.nickname),
          avatar: avatarSaved,
          registrationComplete: !!(
            (birthday ?? existingUser.birthday) &&
            (updateUserDto.gender ?? existingUser.gender)
          ),
        })
        .where(eq(user.id, id))
        .returning();
    } catch (error) {
      if (avatarSaved) {
        this.imageFileStorageService.deleteImage(avatarSaved.image);
      }
      throw error;
    }

    if (!updatedUser) throw new UserNotFoundException();

    if (avatar && existingUser.avatar?.image) {
      this.imageFileStorageService.deleteImage(existingUser.avatar.image);
    }

    return updatedUser;
  }

  async findOne(id: string) {
    return this.findOneBy(eq(user.id, id));
  }

  async findOneByPhone(phone: string) {
    return this.findOneBy(eq(user.phone, phone));
  }

  async changeUserPassword(userId: string, newPasswordHash: string) {
    const updated = await this.db
      .update(user)
      .set({ password: newPasswordHash })
      .where(eq(user.id, userId))
      .returning({ id: user.id });

    if (updated.length === 0) throw new UserNotFoundException();
  }

  private async findOneBy(condition: SQL) {
    return firstOrThrow(
      await this.db.select().from(user).where(condition),
      () => new UserNotFoundException(),
    );
  }
}
