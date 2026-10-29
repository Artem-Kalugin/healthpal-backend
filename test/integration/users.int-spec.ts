import { DataSource } from 'typeorm';
import { createSafeRepository } from 'src/common/helpers/safe-repository.provider';
import { DatabaseEntityUniqueConstraintError } from 'src/common/errors/database-entity/database-entity-unique-constraint.error';
import { UpdateUserDto } from 'src/domain/users/dto/update-user.dto';
import { UsersService } from 'src/domain/users/users.service';
import { Gender, User } from 'src/entities/user.entity';
import type { ImageFileStorageService } from 'src/infrastructure/file-storage/image-file-storage.service';
import type { PasswordService } from 'src/infrastructure/password/password.service';
import { clearDatabase, createTestDataSource } from './db';
import { createFactories } from './factories';

const BIRTHDAY = '1990-05-20';

describe('UsersService (integration)', () => {
  let dataSource: DataSource;
  let factories: ReturnType<typeof createFactories>;
  let service: UsersService;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    factories = createFactories(dataSource);
    service = new UsersService(
      createSafeRepository(dataSource.getRepository(User)),
      {} as ImageFileStorageService,
      {
        hash: jest.fn().mockResolvedValue('hash'),
      } as unknown as PasswordService,
    );
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  // DTO типизирован как обязательный, хотя валидатор допускает частичное обновление
  const update = (id: string, dto: Partial<UpdateUserDto>) =>
    service.update(id, dto as UpdateUserDto);

  const reload = (id: string) =>
    dataSource.getRepository(User).findOneByOrFail({ id });

  it('create: занятый телефон → ошибка уникальности (409)', async () => {
    const existing = await factories.user();

    const error: unknown = await service
      .create({
        phone: existing.phone,
        password: 'secret',
        name: 'Анна',
        surname: 'Орлова',
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(DatabaseEntityUniqueConstraintError);
    expect((error as DatabaseEntityUniqueConstraintError).status).toBe(409);
  });

  it('update: занятый никнейм → ошибка уникальности (409)', async () => {
    await factories.user({ nickname: 'taken' });
    const user = await factories.user();

    const error: unknown = await update(user.id, { nickname: 'TAKEN' }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(DatabaseEntityUniqueConstraintError);
    expect((error as DatabaseEntityUniqueConstraintError).status).toBe(409);
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

  it('changeUserPassword: сохраняет новый хеш', async () => {
    const user = await factories.user();

    await service.changeUserPassword(user.id, 'new-hash');

    expect((await reload(user.id)).password).toBe('new-hash');
  });
});
