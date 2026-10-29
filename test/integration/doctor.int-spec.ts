import type { Pool } from 'pg';
import type { Database } from 'src/db/db.module';
import { DoctorCategoryType } from 'src/db/enums';
import { userFavoriteDoctor } from 'src/db/schema';
import { DoctorService } from 'src/domain/doctor/doctor.service';
import { DoctorSearchQueryDto } from 'src/domain/doctor/dto/doctor-search-query.dto';
import { SortOrder } from 'src/common/config';
import { createTestDb } from './db';
import { createFactories } from './factories';

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const [D1, D2, D3, D4] = [id(1), id(2), id(3), id(4)];

/**
 * Датасет подобран под тай-брейки: у D2 и D3 одинаковые рейтинг и год практики,
 * у D2 и D4 — число отзывов. Читаем только, поэтому сидим один раз.
 *
 * | врач | центр | категория  | рейтинг | отзывы | год  |
 * | D1   | Север | general    | 4.9     | 50     | 2005 |
 * | D2   | Север | cardiology | 4.5     | 20     | 2012 |
 * | D3   | Юг    | general    | 4.5     | 30     | 2012 |
 * | D4   | Юг    | cardiology | 3.0     | 20     | 2020 |
 */
describe('DoctorService (integration)', () => {
  let db: Database;
  let pool: Pool;
  let service: DoctorService;
  let userA: string;
  let userB: string;
  let userWithoutFavorites: string;
  let generalId: string;
  let cardiologyId: string;
  let northId: string;
  let southId: string;

  beforeAll(async () => {
    ({ db, pool } = await createTestDb());
    const factories = createFactories(db);
    service = new DoctorService(db);

    const north = await factories.medicalCenter({
      name: 'Клиника Север',
      address: 'ул. Ленина, 5',
    });
    const south = await factories.medicalCenter({
      name: 'Центр Юг',
      address: 'пр. Мира, 10',
    });
    const general = await factories.category({
      type: DoctorCategoryType.GENERAL,
    });
    const cardiology = await factories.category({
      type: DoctorCategoryType.CARDIOLOGY,
    });
    [northId, southId] = [north.id, south.id];
    [generalId, cardiologyId] = [general.id, cardiology.id];

    const doctor = (
      doctorId: string,
      name: string,
      surname: string,
      rest: {
        medicalCenter: { id: string };
        category: { id: string };
        rating: number;
        reviewsCount: number;
        practiceStartYear: number;
      },
    ) => {
      const { medicalCenter, category, ...fields } = rest;

      return factories.doctor({
        id: doctorId,
        name,
        surname,
        medicalCenterId: medicalCenter.id,
        categoryId: category.id,
        ...fields,
      });
    };

    await doctor(D1, 'Анна', 'Смирнова', {
      medicalCenter: north,
      category: general,
      rating: 4.9,
      reviewsCount: 50,
      practiceStartYear: 2005,
    });
    await doctor(D2, 'Борис', 'Сидоров', {
      medicalCenter: north,
      category: cardiology,
      rating: 4.5,
      reviewsCount: 20,
      practiceStartYear: 2012,
    });
    await doctor(D3, 'Виктор', 'Орлов', {
      medicalCenter: south,
      category: general,
      rating: 4.5,
      reviewsCount: 30,
      practiceStartYear: 2012,
    });
    await doctor(D4, 'Галина', 'Орлова', {
      medicalCenter: south,
      category: cardiology,
      rating: 3,
      reviewsCount: 20,
      practiceStartYear: 2020,
    });

    userA = (await factories.user()).id;
    userB = (await factories.user()).id;
    userWithoutFavorites = (await factories.user()).id;

    // Порядок добавления (D2, D1, D4) не совпадает ни с порядком id, ни с обратным
    const favorite = (userId: string, doctorId: string, createdAt: string) =>
      db
        .insert(userFavoriteDoctor)
        .values({ userId, doctorId, createdAt: new Date(createdAt) });
    await favorite(userA, D2, '2026-01-01T00:00:00Z');
    await favorite(userA, D1, '2026-02-01T00:00:00Z');
    await favorite(userA, D4, '2026-03-01T00:00:00Z');
    await favorite(userB, D1, '2026-01-01T00:00:00Z');
  });

  afterAll(async () => {
    await pool.end();
  });

  const search = async (
    query: Partial<DoctorSearchQueryDto> = {},
    userId = userA,
  ) => {
    const result = await service.searchDoctorsForUser({
      page: 1,
      size: 10,
      ...query,
      userId,
    });

    return result.data.map(item => item.id);
  };

  describe('searchDoctorsForUser', () => {
    it('возвращает всех врачей по id с центром, категорией и isFavorite', async () => {
      const { data } = await service.searchDoctorsForUser({
        page: 1,
        size: 10,
        userId: userA,
      });

      expect(data.map(item => item.id)).toEqual([D1, D2, D3, D4]);
      expect(data[0]).toMatchObject({
        medicalCenter: { name: 'Клиника Север', address: 'ул. Ленина, 5' },
        category: { type: DoctorCategoryType.GENERAL },
      });
    });

    it('isFavorite считается для конкретного пользователя и не дублирует строки', async () => {
      const favoritesOf = async (userId: string) => {
        const { data } = await service.searchDoctorsForUser({
          page: 1,
          size: 10,
          userId,
        });

        return data.map(item => [item.id, item.isFavorite]);
      };

      await expect(favoritesOf(userA)).resolves.toEqual([
        [D1, true],
        [D2, true],
        [D3, false],
        [D4, true],
      ]);
      await expect(favoritesOf(userB)).resolves.toEqual([
        [D1, true],
        [D2, false],
        [D3, false],
        [D4, false],
      ]);
    });

    it('фильтры по категории и центру работают по отдельности и вместе (AND)', async () => {
      await expect(search({ categoryId: cardiologyId })).resolves.toEqual([
        D2,
        D4,
      ]);
      await expect(search({ medicalCenterId: southId })).resolves.toEqual([
        D3,
        D4,
      ]);
      await expect(
        search({ categoryId: generalId, medicalCenterId: southId }),
      ).resolves.toEqual([D3]);
    });

    it('searchFor ищет по имени и фамилии, названию и адресу центра без учёта регистра', async () => {
      await expect(search({ searchFor: 'СИДОР' })).resolves.toEqual([D2]);
      await expect(search({ searchFor: 'борис сид' })).resolves.toEqual([D2]);
      await expect(search({ searchFor: 'север' })).resolves.toEqual([D1, D2]);
      await expect(search({ searchFor: 'МИРА' })).resolves.toEqual([D3, D4]);
    });

    it('searchFor сочетается с фильтром как AND', async () => {
      await expect(
        search({ searchFor: 'север', categoryId: cardiologyId }),
      ).resolves.toEqual([D2]);
      await expect(
        search({ searchFor: 'орлов', medicalCenterId: northId }),
      ).resolves.toEqual([]);
    });

    it.each(['%', '_', '\\'])(
      'спецсимвол %s в searchFor считается обычным текстом',
      async searchFor => {
        await expect(search({ searchFor })).resolves.toEqual([]);
      },
    );

    it.each([
      ['rating', SortOrder.DESC, [D1, D2, D3, D4]],
      ['rating', SortOrder.ASC, [D4, D2, D3, D1]],
      ['reviews', SortOrder.DESC, [D1, D3, D2, D4]],
      ['reviews', SortOrder.ASC, [D2, D4, D3, D1]],
      ['practiceStartYear', SortOrder.DESC, [D4, D2, D3, D1]],
      ['practiceStartYear', SortOrder.ASC, [D1, D2, D3, D4]],
    ] as const)(
      'sort=%s order=%s, равные значения идут по id',
      async (sort, order, expected) => {
        await expect(search({ sort, order })).resolves.toEqual(expected);
      },
    );

    it('без order сортирует по убыванию', async () => {
      await expect(search({ sort: 'rating' })).resolves.toEqual([
        D1,
        D2,
        D3,
        D4,
      ]);
    });

    it('страницы с join не пересекаются и вместе дают всех врачей', async () => {
      const query = { sort: 'rating', order: SortOrder.ASC, size: 2 } as const;

      const first = await search({ ...query, page: 1 });
      const second = await search({ ...query, page: 2 });
      const third = await search({ ...query, page: 3 });

      expect([first, second, third]).toEqual([[D4, D2], [D3, D1], []]);
    });
  });

  describe('findFavoritesForUser', () => {
    const favoritesFor = async (userId: string, page = 1, size = 10) => {
      const { data } = await service.findFavoritesForUser({
        userId,
        page,
        size,
      });

      return data;
    };

    it('возвращает только избранное пользователя, последние добавленные первыми', async () => {
      const data = await favoritesFor(userA);

      expect(data.map(item => item.id)).toEqual([D4, D1, D2]);
      expect(data.every(item => item.isFavorite)).toBe(true);
      expect(data[0]).toMatchObject({
        medicalCenter: { name: 'Центр Юг' },
        category: { type: DoctorCategoryType.CARDIOLOGY },
      });
    });

    it('не подмешивает избранное других пользователей', async () => {
      expect((await favoritesFor(userB)).map(item => item.id)).toEqual([D1]);
      await expect(favoritesFor(userWithoutFavorites)).resolves.toEqual([]);
    });

    it('страницы не пересекаются', async () => {
      const first = await favoritesFor(userA, 1, 2);
      const second = await favoritesFor(userA, 2, 2);

      expect([first, second].map(page => page.map(item => item.id))).toEqual([
        [D4, D1],
        [D2],
      ]);
    });
  });

  describe('findOneForUser', () => {
    it('возвращает врача с центром, категорией и isFavorite для пользователя', async () => {
      await expect(service.findOneForUser(userA, D2)).resolves.toMatchObject({
        id: D2,
        isFavorite: true,
        medicalCenter: { name: 'Клиника Север' },
        category: { type: DoctorCategoryType.CARDIOLOGY },
      });
      await expect(service.findOneForUser(userB, D2)).resolves.toMatchObject({
        id: D2,
        isFavorite: false,
      });
    });
  });
});
