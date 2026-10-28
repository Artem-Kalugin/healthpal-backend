import { DataSource } from 'typeorm';
import { createSafeRepository } from 'src/common/helpers/safe-repository.provider';
import { MedicalCentersService } from 'src/domain/medical-center/medical-center.service';
import { MedicalCenter } from 'src/entities/medical-center.entity';
import { UserFavoriteMedicalCenter } from 'src/entities/user-favorite-medical-center.relation';
import { createTestDataSource } from './db';
import { createFactories } from './factories';

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const [C1, C2, C3, C4, C5, C6] = [id(1), id(2), id(3), id(4), id(5), id(6)];

const SPB = { lat: 59.9343, lon: 30.3351 };
const EQUATOR_ORIGIN = { lat: 0, lon: 0 };

/**
 * Центры C2..C6 лежат на экваторе (1° долготы ≈ 111.19 км), пользователь в (0, 0).
 * C1 стоит в Петербурге: на этих координатах `acos` без зажима падает при совпадении точек.
 *
 * | центр | lon   | до (0,0), км | врачи (рейтинг × отзывы)     | rating | reviewsCount |
 * | C1    | СПб   | далеко       | 5.0 × 10, 4.0 × 30           | 4.25   | 40           |
 * | C2    | 0.01  | 1.1          | 4.6 × 5                      | 4.60   | 5            |
 * | C3    | 0.02  | 2.2          | нет                          | null   | 0            |
 * | C4    | 0.03  | 3.3          | 5.0 × 0                      | null   | 0            |
 * | C5    | 0.04  | 4.4          | 4.2 × 10, 4.3 × 10           | 4.25   | 20           |
 * | C6    | 0.05  | 5.6          | 3.0 × 10                     | 3.00   | 10           |
 */
describe('MedicalCentersService (integration)', () => {
  let dataSource: DataSource;
  let service: MedicalCentersService;
  let userA: string;
  let userB: string;
  let userWithoutFavorites: string;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    const factories = createFactories(dataSource);
    service = new MedicalCentersService(
      createSafeRepository(dataSource.getRepository(MedicalCenter)),
    );

    const center = (centerId: string, lat: number, lon: number) =>
      factories.medicalCenter({ id: centerId, name: centerId, lat, lon });
    const c1 = await center(C1, SPB.lat, SPB.lon);
    const c2 = await center(C2, 0, 0.01);
    await center(C3, 0, 0.02);
    const c4 = await center(C4, 0, 0.03);
    const c5 = await center(C5, 0, 0.04);
    const c6 = await center(C6, 0, 0.05);

    const doctor = (
      medicalCenter: MedicalCenter,
      rating: number,
      reviewsCount: number,
    ) => factories.doctor({ medicalCenter, rating, reviewsCount });
    await doctor(c1, 5, 10);
    await doctor(c1, 4, 30);
    await doctor(c2, 4.6, 5);
    await doctor(c4, 5, 0);
    await doctor(c5, 4.2, 10);
    await doctor(c5, 4.3, 10);
    await doctor(c6, 3, 10);

    userA = (await factories.user()).id;
    userB = (await factories.user()).id;
    userWithoutFavorites = (await factories.user()).id;

    // Порядок добавления (C3, C1, C6) не совпадает ни с порядком id, ни с обратным
    const favorite = (userId: string, medicalCenterId: string, at: string) =>
      dataSource.getRepository(UserFavoriteMedicalCenter).save({
        userId,
        medicalCenterId,
        createdAt: new Date(at),
      });
    await favorite(userA, C3, '2026-01-01T00:00:00Z');
    await favorite(userA, C1, '2026-02-01T00:00:00Z');
    await favorite(userA, C6, '2026-03-01T00:00:00Z');
    await favorite(userB, C1, '2026-01-01T00:00:00Z');
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const byRating = async (userId = userWithoutFavorites, top5Only = false) =>
    service.findByRatingForUser(userId, top5Only);

  // сервис подмешивает distance через @ts-expect-error, в его типе поля нет
  type WithDistance = MedicalCenter & {
    distance?: number;
    walkingTimeMinutes?: number;
  };
  const byDistance = async (
    point: { lat: number; lon: number } = EQUATOR_ORIGIN,
    top5Only = false,
  ) =>
    (await service.findWithDistanceForUser(
      userWithoutFavorites,
      point.lat,
      point.lon,
      top5Only,
    )) as WithDistance[];

  describe('findByRatingForUser', () => {
    it('rating — среднее, взвешенное по отзывам, reviewsCount — их сумма', async () => {
      const centers = await byRating();
      const aggregates = Object.fromEntries(
        centers.map(item => [item.id, [item.rating, item.reviewsCount]]),
      );

      expect(aggregates).toMatchObject({
        // простое среднее дало бы 4.5
        [C1]: ['4.25', '40'],
        [C2]: ['4.60', '5'],
        [C5]: ['4.25', '20'],
        [C6]: ['3.00', '10'],
      });
    });

    it('центры без врачей и без отзывов остаются в выдаче с rating = null и reviewsCount = 0', async () => {
      const centers = await byRating();
      const aggregates = Object.fromEntries(
        centers.map(item => [item.id, [item.rating, item.reviewsCount]]),
      );

      expect(centers).toHaveLength(6);
      expect(aggregates).toMatchObject({
        [C3]: [null, '0'],
        [C4]: [null, '0'],
      });
    });

    it('сортирует по убыванию рейтинга, центры без рейтинга в конце, равные — по id', async () => {
      const centers = await byRating();

      expect(centers.map(item => item.id)).toEqual([C2, C1, C5, C6, C3, C4]);
    });

    it('isFavorite считается для конкретного пользователя и не раздувает агрегаты', async () => {
      const flags = async (userId: string) =>
        (await byRating(userId)).map(item => [item.id, item.isFavorite]);

      await expect(flags(userA)).resolves.toEqual([
        [C2, false],
        [C1, true],
        [C5, false],
        [C6, true],
        [C3, true],
        [C4, false],
      ]);
      await expect(flags(userB)).resolves.toEqual([
        [C2, false],
        [C1, true],
        [C5, false],
        [C6, false],
        [C3, false],
        [C4, false],
      ]);
      const favoriteCenter = (await byRating(userA)).find(
        item => item.id === C1,
      );
      expect(favoriteCenter).toMatchObject({
        rating: '4.25',
        reviewsCount: '40',
      });
    });

    it('top5Only ограничивает выдачу пятью лучшими, без него приходят все', async () => {
      const top5 = await byRating(userWithoutFavorites, true);
      const all = await byRating(userWithoutFavorites, false);

      expect(top5.map(item => item.id)).toEqual([C2, C1, C5, C6, C3]);
      expect(all).toHaveLength(6);
    });
  });

  describe('findWithDistanceForUser', () => {
    it('считает расстояние в км с одним знаком и время пешком, ближайшие первыми', async () => {
      const centers = await byDistance();

      expect(centers.map(item => item.id)).toEqual([C2, C3, C4, C5, C6, C1]);
      expect(
        centers
          .slice(0, 5)
          .map(item => [item.distance, item.walkingTimeMinutes]),
      ).toEqual([
        [1.1, 13],
        [2.2, 26],
        [3.3, 40],
        [4.4, 53],
        [5.6, 67],
      ]);
      expect(centers[5].distance).toBeGreaterThan(5000);
    });

    it('top5Only возвращает пять ближайших, а не пять первых по id', async () => {
      const centers = await byDistance(EQUATOR_ORIGIN, true);

      expect(centers.map(item => item.id)).toEqual([C2, C3, C4, C5, C6]);
    });

    it('пользователь в точке центра: запрос не падает, distance и walkingTimeMinutes равны 0', async () => {
      const centers = await byDistance(SPB);

      expect(centers[0]).toMatchObject({
        id: C1,
        distance: 0,
        walkingTimeMinutes: 0,
      });
    });
  });

  describe('findFavoritesForUser', () => {
    const favoritesFor = async (userId: string, page = 1, size = 10) =>
      service.findFavoritesForUser({ userId, page, size });

    it('возвращает только избранное пользователя, последние добавленные первыми', async () => {
      const { data } = await favoritesFor(userA);

      expect(data.map(item => item.id)).toEqual([C6, C1, C3]);
      expect(data.every(item => item.isFavorite)).toBe(true);
      expect(data[1]).toMatchObject({ rating: '4.25', reviewsCount: '40' });
    });

    it('не подмешивает избранное других пользователей', async () => {
      expect((await favoritesFor(userB)).data.map(item => item.id)).toEqual([
        C1,
      ]);
      expect((await favoritesFor(userWithoutFavorites)).data).toEqual([]);
    });

    it('страницы не пересекаются, count и lastPage верны при группировке', async () => {
      const first = await favoritesFor(userA, 1, 2);
      const second = await favoritesFor(userA, 2, 2);
      const third = await favoritesFor(userA, 3, 2);

      expect(
        [first, second, third].map(page => page.data.map(c => c.id)),
      ).toEqual([[C6, C1], [C3], []]);
      expect(first).toMatchObject({ count: 3, lastPage: 2 });
    });
  });
});
