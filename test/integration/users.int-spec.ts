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
import type { PasswordService } from 'src/infrastructure/password/password.service';
import { clearDatabase, createTestDb } from './db';
import { createFactories } from './factories';

const BIRTHDAY = '1990-05-20';
const NEW_IMAGE = { image: 'new.jpg', thumbhash: 'new-hash' };
const OLD_IMAGE = { image: 'old.jpg', thumbhash: 'old-hash' };
const AVATAR = Buffer.from('avatar');
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

/** Код и ограничение Postgres из `cause` ошибки драйвера; HTTP-статус появится с глобальным фильтром. */
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
      {
        hash: jest.fn().mockResolvedValue('hash'),
      } as unknown as PasswordService,
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

  // DTO типизирован как обязательный, хотя валидатор допускает частичное обновление
  const update = (id: string, dto: Partial<UpdateUserDto>) =>
    service.update(id, dto as UpdateUserDto);

  const reload = async (id: string) => {
    const [found] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, id));

    return found;
  };

  it('create: хеширует пароль, нормализует имя и фамилию, регистрация не завершена', async () => {
    const created = await service.create({
      phone: '+79001234567',
      password: 'secret',
      name: 'иВАН-пЕТРОВ',
      surname: 'сИДОРОВ',
    });

    expect(await reload(created.id)).toMatchObject({
      password: 'hash',
      name: 'Иван-Петров',
      surname: 'Сидоров',
      registrationComplete: false,
    });
  });

  it('create: занятый телефон → нарушение уникальности', async () => {
    const existing = await factories.user();

    const error: unknown = await service
      .create({
        phone: existing.phone,
        password: 'secret',
        name: 'Анна',
        surname: 'Орлова',
      })
      .catch((caught: unknown) => caught);

    expect(violation(error)).toEqual({
      code: '23505',
      constraint: Constraint.USER_PHONE_UNIQUE,
    });
  });

  it('update: занятый никнейм → нарушение уникальности', async () => {
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

  it('update: никнейм сохраняется в нижнем регистре', async () => {
    const user = await factories.user();

    await update(user.id, { nickname: 'MiXeD' });

    expect((await reload(user.id)).nickname).toBe('mixed');
  });

  it('update: не переданные поля не затираются', async () => {
    const user = await factories.user({
      name: 'Иван',
      surname: 'Иванов',
      nickname: 'ivan',
    });

    await update(user.id, { birthday: BIRTHDAY });

    const saved = await reload(user.id);
    expect(saved).toMatchObject({
      name: 'Иван',
      surname: 'Иванов',
      nickname: 'ivan',
    });
  });

  describe('update: registrationComplete', () => {
    it('birthday и gender переданы вместе → true', async () => {
      const user = await factories.user({ registrationComplete: false });

      await update(user.id, {
        birthday: BIRTHDAY,
        gender: Gender.MALE,
      });

      expect((await reload(user.id)).registrationComplete).toBe(true);
    });

    it('передано только одно из полей → false', async () => {
      const user = await factories.user({ registrationComplete: false });

      await update(user.id, { birthday: BIRTHDAY });

      expect((await reload(user.id)).registrationComplete).toBe(false);
    });

    it('у завершившего регистрацию правка имени флаг не сбрасывает', async () => {
      const user = await factories.user({
        registrationComplete: true,
        birthday: new Date(BIRTHDAY),
        gender: Gender.MALE,
      });

      await update(user.id, { name: 'пётр' });

      expect((await reload(user.id)).registrationComplete).toBe(true);
    });
  });

  describe('аватар', () => {
    it('сохраняется без защиты, старый файл удаляется', async () => {
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

    it('если старого аватара не было, удалять нечего', async () => {
      const user = await factories.user();

      await service.update(user.id, {} as UpdateUserDto, AVATAR);

      expect(storage.deleteImage).not.toHaveBeenCalled();
    });

    it('при ошибке обновления удаляется новый файл, старый остаётся', async () => {
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

    it('без аватара файловое хранилище не трогается', async () => {
      const user = await factories.user({ avatar: OLD_IMAGE });

      await update(user.id, { name: 'иван' });

      expect(storage.processAndSave).not.toHaveBeenCalled();
      expect(storage.deleteImage).not.toHaveBeenCalled();
      expect((await reload(user.id)).avatar).toEqual(OLD_IMAGE);
    });
  });

  describe('не найден', () => {
    it('update: UserNotFoundException без побочных эффектов', async () => {
      await expect(
        service.update(MISSING_ID, {} as UpdateUserDto, AVATAR),
      ).rejects.toBeInstanceOf(UserNotFoundException);
      expect(storage.processAndSave).not.toHaveBeenCalled();
    });

    it('findOne: UserNotFoundException', async () => {
      await expect(service.findOne(MISSING_ID)).rejects.toBeInstanceOf(
        UserNotFoundException,
      );
    });

    it('findOneByPhone: UserNotFoundException', async () => {
      await expect(
        service.findOneByPhone('+70000000000'),
      ).rejects.toBeInstanceOf(UserNotFoundException);
    });

    it('changeUserPassword: UserNotFoundException', async () => {
      await expect(
        service.changeUserPassword(MISSING_ID, 'x'),
      ).rejects.toBeInstanceOf(UserNotFoundException);
    });
  });

  it('changeUserPassword: сохраняет новый хеш', async () => {
    const user = await factories.user();

    await service.changeUserPassword(user.id, 'new-hash');

    expect((await reload(user.id)).password).toBe('new-hash');
  });
});
