import { ConflictException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import type { SafeRepository } from 'src/common/helpers/safe-repository.provider';
import type { ImageFileStorageService } from 'src/infrastructure/file-storage/image-file-storage.service';
import type { PasswordService } from 'src/infrastructure/password/password.service';
import type { User } from 'src/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserNotFoundException } from './exceptions/user-not-found.exception';
import { UsersService } from './users.service';

const USER_ID = 'user-1';
const HASH = 'hashed-password';
const NEW_IMAGE = { image: 'new.jpg', thumbhash: 'new-hash' };
const OLD_IMAGE = { image: 'old.jpg', thumbhash: 'old-hash' };
const AVATAR = Buffer.from('avatar');

const createDto: CreateUserDto = {
  phone: '+79001234567',
  // eslint-disable-next-line sonarjs/no-hardcoded-passwords
  password: 'secret',
  name: 'иВАН-пЕТРОВ',
  surname: 'сИДОРОВ',
};

describe('UsersService', () => {
  const repo = {
    findOne: jest.fn(),
    create: jest.fn((entity: unknown) => entity),
    safeSave: jest.fn(),
    safeUpdate: jest.fn(),
  };
  const storage = {
    processAndSave: jest.fn(),
    deleteImage: jest.fn(),
  };
  const passwordService = { hash: jest.fn() };
  // транзакция выполняет колбэк сразу, репозиторий из менеджера — тот же мок
  const dataSource = {
    transaction: jest.fn((callback: (manager: unknown) => unknown) =>
      callback({ withRepository: () => repo }),
    ),
  };

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    passwordService.hash.mockResolvedValue(HASH);
    storage.processAndSave.mockResolvedValue(NEW_IMAGE);
    repo.safeSave.mockImplementation((user: User) => Promise.resolve(user));
    repo.safeUpdate.mockResolvedValue({ id: USER_ID });

    service = new UsersService(
      repo as unknown as SafeRepository<User>,
      storage as unknown as ImageFileStorageService,
      passwordService as unknown as PasswordService,
      dataSource as unknown as DataSource,
    );
  });

  // DTO типизирован как обязательный, хотя валидатор допускает частичное обновление
  const update = (id: string, dto: Partial<UpdateUserDto>, avatar?: Buffer) =>
    service.update(id, dto as UpdateUserDto, avatar);

  describe('create', () => {
    it('хеширует пароль, нормализует имя и фамилию, регистрация не завершена', async () => {
      await service.create(createDto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          password: HASH,
          name: 'Иван-Петров',
          surname: 'Сидоров',
          registrationComplete: false,
        }),
      );
    });

    it('при ошибке сохранения пробрасывает ошибку', async () => {
      repo.safeSave.mockRejectedValue(new ConflictException());

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('несуществующий пользователь → UserNotFoundException без побочных эффектов', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(update(USER_ID, {}, AVATAR)).rejects.toBeInstanceOf(
        UserNotFoundException,
      );
      expect(storage.processAndSave).not.toHaveBeenCalled();
      expect(repo.safeUpdate).not.toHaveBeenCalled();
    });

    it('с новым аватаром сохраняет его без защиты и удаляет старый файл', async () => {
      repo.findOne.mockResolvedValue({ id: USER_ID, avatar: OLD_IMAGE });

      await update(USER_ID, {}, AVATAR);

      expect(storage.processAndSave).toHaveBeenCalledWith(
        AVATAR,
        'avatar',
        false,
      );
      expect(repo.safeUpdate).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ avatar: NEW_IMAGE }),
      );
      expect(storage.deleteImage).toHaveBeenCalledTimes(1);
      expect(storage.deleteImage).toHaveBeenCalledWith(OLD_IMAGE.image);
    });

    it('если старого аватара не было, удалять нечего', async () => {
      repo.findOne.mockResolvedValue({ id: USER_ID });

      await update(USER_ID, {}, AVATAR);

      expect(storage.deleteImage).not.toHaveBeenCalled();
    });

    it('при ошибке обновления удаляет новый файл и сохраняет старый', async () => {
      repo.findOne.mockResolvedValue({ id: USER_ID, avatar: OLD_IMAGE });
      const error = new ConflictException();
      repo.safeUpdate.mockRejectedValue(error);

      await expect(update(USER_ID, {}, AVATAR)).rejects.toBe(error);
      expect(storage.deleteImage).toHaveBeenCalledTimes(1);
      expect(storage.deleteImage).toHaveBeenCalledWith(NEW_IMAGE.image);
    });

    it('без аватара не трогает файловое хранилище', async () => {
      repo.findOne.mockResolvedValue({ id: USER_ID, avatar: OLD_IMAGE });

      await update(USER_ID, { name: 'иван' });

      expect(storage.processAndSave).not.toHaveBeenCalled();
      expect(storage.deleteImage).not.toHaveBeenCalled();
    });
  });

  describe('поиск', () => {
    it.each(['findOne', 'findOneByPhone'] as const)(
      '%s: не найден → UserNotFoundException',
      async method => {
        repo.findOne.mockResolvedValue(null);

        await expect(service[method]('x')).rejects.toBeInstanceOf(
          UserNotFoundException,
        );
      },
    );
  });
});
