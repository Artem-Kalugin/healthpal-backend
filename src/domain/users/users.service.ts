import { Inject, Injectable } from '@nestjs/common';
import { eq, sql, type SQL } from 'drizzle-orm';
import { firstOrThrow } from 'src/common/helpers/first-or-throw';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { user } from 'src/db/schema';
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
    return value.trim();
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
    // fails fast, before the image is processed
    await this.findById(id);

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

    let result;

    try {
      // The row lock makes concurrent updates take turns, so each one deletes the avatar it actually replaced
      result = await this.db.transaction(async tx => {
        const [current] = await tx
          .select({ avatar: user.avatar })
          .from(user)
          .where(eq(user.id, id))
          .for('update');

        if (!current) throw new UserNotFoundException();

        // Drizzle leaves undefined fields out of UPDATE, so it does not overwrite them
        const [updated] = await tx
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
            // computed in SQL from the stored row: concurrent updates of different fields must not overwrite each other's flag
            registrationComplete: sql<boolean>`coalesce(${birthday?.toISOString() ?? null}::timestamp, ${user.birthday}) is not null and coalesce(${updateUserDto.gender ?? null}::gender, ${user.gender}) is not null`,
          })
          .where(eq(user.id, id))
          .returning();

        return { updatedUser: updated, previousAvatar: current.avatar };
      });
    } catch (error) {
      if (avatarSaved) {
        this.imageFileStorageService.deleteImage(avatarSaved.image);
      }
      throw error;
    }

    const { updatedUser, previousAvatar } = result;

    if (avatarSaved && previousAvatar) {
      this.imageFileStorageService.deleteImage(previousAvatar.image);
    }

    return updatedUser;
  }

  async findById(id: string) {
    return this.findOneBy(eq(user.id, id));
  }

  async findByPhone(phone: string) {
    return this.findOneBy(eq(user.phone, phone));
  }

  async changePassword(userId: string, newPassword: string) {
    const updated = await this.db
      .update(user)
      .set({ password: await this.passwordService.hash(newPassword) })
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
