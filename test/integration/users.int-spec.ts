import { Constraint } from 'src/db/constraints';
import { DrizzleQueryError, eq } from 'drizzle-orm';
import type { Pool } from 'pg';
import type { Database } from 'src/db/db.module';
import { Gender } from 'src/db/enums';
import { user as userTable } from 'src/db/schema';
import { UpdateUserDto } from 'src/domain/users/dto/update-user.dto';
import { UserNotFoundException } from 'src/domain/users/exceptions/user-not-found.exception';
import { UsersService } from 'src/domain/users/users.service';
import type { ImageFileStorageService } from 'src/infrastructure/file-storage/image-file-storage.service';
import { PasswordService } from 'src/infrastructure/password/password.service';
import { clearDatabase, createTestDb } from './db';
import { createFactories } from './factories';

const BIRTHDAY = '1990-05-20';
const NEW_IMAGE = { image: 'new.jpg', thumbhash: 'new-hash' };
const OLD_IMAGE = { image: 'old.jpg', thumbhash: 'old-hash' };
const AVATAR = Buffer.from('avatar');
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

/** Postgres code and constraint from the driver error `cause`; the HTTP status comes with the global filter. */
const violation = (error: unknown) => {
  expect(error).toBeInstanceOf(DrizzleQueryError);
  const { code, constraint } = (error as DrizzleQueryError)
    .cause as unknown as {
    code: string;
    constraint: string;
  };

  return { code, constraint };
};

describe('UsersService (integration)', () => {
  let db: Database;
  let pool: Pool;
  let factories: ReturnType<typeof createFactories>;
  let service: UsersService;
  const passwordService = new PasswordService();
  const storage = {
    processAndSave: jest.fn(),
    deleteImage: jest.fn(),
  };

  beforeAll(async () => {
    ({ db, pool } = await createTestDb());
    factories = createFactories(db);
    service = new UsersService(
      db,
      storage as unknown as ImageFileStorageService,
      passwordService,
    );
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    storage.processAndSave.mockResolvedValue(NEW_IMAGE);
    await clearDatabase(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  // The DTO is typed as required although the validator allows a partial update
  const update = (id: string, dto: Partial<UpdateUserDto>) =>
    service.update(id, dto as UpdateUserDto);

  const reload = async (id: string) => {
    const [found] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, id));

    return found;
  };

  it('create: hashes the password, trims first and last name, registration is not complete', async () => {
    const created = await service.create({
      phone: '+79001234567',
      password: 'secret',
      name: '  Anna-Maria ',
      surname: ' van der Berg  ',
    });

    expect(await reload(created.id)).toMatchObject({
      name: 'Anna-Maria',
      surname: 'van der Berg',
      registrationComplete: false,
    });
    expect(
      await passwordService.compare(
        'secret',
        (await reload(created.id)).password,
      ),
    ).toBe(true);
  });

  it('create: taken phone → uniqueness violation', async () => {
    const existing = await factories.user();

    const error: unknown = await service
      .create({
        phone: existing.phone,
        password: 'secret',
        name: 'Anna',
        surname: 'Orlova',
      })
      .catch((caught: unknown) => caught);

    expect(violation(error)).toEqual({
      code: '23505',
      constraint: Constraint.USER_PHONE_UNIQUE,
    });
  });

  it('update: taken nickname → uniqueness violation', async () => {
    await factories.user({ nickname: 'taken' });
    const user = await factories.user();

    const error: unknown = await update(user.id, { nickname: 'TAKEN' }).catch(
      (caught: unknown) => caught,
    );

    expect(violation(error)).toEqual({
      code: '23505',
      constraint: Constraint.USER_NICKNAME_UNIQUE,
    });
  });

  it('update: nickname is stored in lowercase', async () => {
    const user = await factories.user();

    await update(user.id, { nickname: 'MiXeD' });

    expect((await reload(user.id)).nickname).toBe('mixed');
  });

  it('update: fields not passed are not overwritten', async () => {
    const user = await factories.user({
      name: 'Ivan',
      surname: 'Ivanov',
      nickname: 'ivan',
    });

    await update(user.id, { birthday: BIRTHDAY });

    const saved = await reload(user.id);
    expect(saved).toMatchObject({
      name: 'Ivan',
      surname: 'Ivanov',
      nickname: 'ivan',
    });
  });

  describe('update: registrationComplete', () => {
    it('birthday and gender passed together → true', async () => {
      const user = await factories.user({ registrationComplete: false });

      await update(user.id, {
        birthday: BIRTHDAY,
        gender: Gender.MALE,
      });

      expect((await reload(user.id)).registrationComplete).toBe(true);
    });

    it('only one of the fields passed → false', async () => {
      const user = await factories.user({ registrationComplete: false });

      await update(user.id, { birthday: BIRTHDAY });

      expect((await reload(user.id)).registrationComplete).toBe(false);
    });

    it('for a user who completed registration, editing the name does not reset the flag', async () => {
      const user = await factories.user({
        registrationComplete: true,
        birthday: new Date(BIRTHDAY),
        gender: Gender.MALE,
      });

      await update(user.id, { name: 'пётр' });

      expect((await reload(user.id)).registrationComplete).toBe(true);
    });
  });

  describe('avatar', () => {
    it('is saved unprotected, the old file is deleted', async () => {
      const user = await factories.user({ avatar: OLD_IMAGE });

      await service.update(user.id, {} as UpdateUserDto, AVATAR);

      expect(storage.processAndSave).toHaveBeenCalledWith(
        AVATAR,
        'avatar',
        false,
      );
      expect((await reload(user.id)).avatar).toEqual(NEW_IMAGE);
      expect(storage.deleteImage).toHaveBeenCalledTimes(1);
      expect(storage.deleteImage).toHaveBeenCalledWith(OLD_IMAGE.image);
    });

    it('if there was no old avatar, there is nothing to delete', async () => {
      const user = await factories.user();

      await service.update(user.id, {} as UpdateUserDto, AVATAR);

      expect(storage.deleteImage).not.toHaveBeenCalled();
    });

    it('on update error the new file is deleted, the old one stays', async () => {
      await factories.user({ nickname: 'taken' });
      const user = await factories.user({ avatar: OLD_IMAGE });

      const error: unknown = await service
        .update(user.id, { nickname: 'taken' } as UpdateUserDto, AVATAR)
        .catch((caught: unknown) => caught);

      expect(violation(error).code).toBe('23505');
      expect(storage.deleteImage).toHaveBeenCalledTimes(1);
      expect(storage.deleteImage).toHaveBeenCalledWith(NEW_IMAGE.image);
      expect((await reload(user.id)).avatar).toEqual(OLD_IMAGE);
    });

    it('parallel avatar updates: every replaced file is deleted, only the winner stays', async () => {
      const first = { image: 'first.jpg', thumbhash: 'first-hash' };
      const second = { image: 'second.jpg', thumbhash: 'second-hash' };
      storage.processAndSave
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(second);
      const user = await factories.user({ avatar: OLD_IMAGE });

      await Promise.all([
        service.update(user.id, {} as UpdateUserDto, AVATAR),
        service.update(user.id, {} as UpdateUserDto, AVATAR),
      ]);

      const { avatar } = await reload(user.id);
      const deleted = storage.deleteImage.mock.calls.map(
        ([image]: [string]) => image,
      );
      expect(deleted).toHaveLength(2);
      expect(deleted).toContain(OLD_IMAGE.image);
      expect(deleted).not.toContain(avatar?.image);
      expect([first.image, second.image]).toContain(avatar?.image);
    });

    it('without an avatar the file storage is untouched', async () => {
      const user = await factories.user({ avatar: OLD_IMAGE });

      await update(user.id, { name: 'иван' });

      expect(storage.processAndSave).not.toHaveBeenCalled();
      expect(storage.deleteImage).not.toHaveBeenCalled();
      expect((await reload(user.id)).avatar).toEqual(OLD_IMAGE);
    });
  });

  describe('not found', () => {
    it('update: UserNotFoundException without side effects', async () => {
      await expect(
        service.update(MISSING_ID, {} as UpdateUserDto, AVATAR),
      ).rejects.toBeInstanceOf(UserNotFoundException);
      expect(storage.processAndSave).not.toHaveBeenCalled();
    });

    it('findById: UserNotFoundException', async () => {
      await expect(service.findById(MISSING_ID)).rejects.toBeInstanceOf(
        UserNotFoundException,
      );
    });

    it('findByPhone: UserNotFoundException', async () => {
      await expect(service.findByPhone('+70000000000')).rejects.toBeInstanceOf(
        UserNotFoundException,
      );
    });

    it('changePassword: UserNotFoundException', async () => {
      await expect(
        service.changePassword(MISSING_ID, 'x'),
      ).rejects.toBeInstanceOf(UserNotFoundException);
    });
  });

  it('changePassword: saves the hash of the new password', async () => {
    const user = await factories.user();

    await service.changePassword(user.id, 'NewPassword1');

    expect(
      await passwordService.compare(
        'NewPassword1',
        (await reload(user.id)).password,
      ),
    ).toBe(true);
  });
});
