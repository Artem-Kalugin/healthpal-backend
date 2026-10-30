import type { Pool } from 'pg';
import type { Database } from 'src/db/db.module';
import { userFavoriteMedicalCenter } from 'src/db/schema';
import { MedicalCenterService } from 'src/domain/medical-center/medical-center.service';
import { MedicalCenterFavoriteService } from 'src/domain/medical-center/modules/medical-center-favorite/medical-center-favorite.service';
import { createTestDb } from './db';
import { createFactories } from './factories';

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const [C1, C2, C3, C4, C5, C6] = [id(1), id(2), id(3), id(4), id(5), id(6)];

const SPB = { lat: 59.9343, lon: 30.3351 };
const EQUATOR_ORIGIN = { lat: 0, lon: 0 };

describe('MedicalCenterService (integration)', () => {
  let db: Database;
  let pool: Pool;
  let service: MedicalCenterService;
  let favoriteService: MedicalCenterFavoriteService;
  let userA: string;
  let userB: string;
  let userWithoutFavorites: string;

  beforeAll(async () => {
    ({ db, pool } = await createTestDb());
    const factories = createFactories(db);
    service = new MedicalCenterService(db);
    favoriteService = new MedicalCenterFavoriteService(db);

    const center = (centerId: string, lat: number, lon: number) =>
      factories.medicalCenter({ id: centerId, name: centerId, lat, lon });
    const c1 = await center(C1, SPB.lat, SPB.lon);
    const c2 = await center(C2, 0, 0.01);
    await center(C3, 0, 0.02);
    const c4 = await center(C4, 0, 0.03);
    const c5 = await center(C5, 0, 0.04);
    const c6 = await center(C6, 0, 0.05);

    const doctor = (
      medicalCenter: { id: string },
      rating: number,
      reviewsCount: number,
    ) =>
      factories.doctor({
        medicalCenterId: medicalCenter.id,
        rating,
        reviewsCount,
      });
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

    // The insertion order (C3, C1, C6) matches neither the id order nor its reverse
    const favorite = (userId: string, medicalCenterId: string, at: string) =>
      db.insert(userFavoriteMedicalCenter).values({
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
    await pool.end();
  });

  const byRating = async (userId = userWithoutFavorites, top5Only = false) =>
    service.findByRatingForUser(userId, top5Only);

  const byDistance = async (
    point: { lat: number; lon: number } = EQUATOR_ORIGIN,
    top5Only = false,
  ) =>
    service.findWithDistanceForUser(
      userWithoutFavorites,
      point.lat,
      point.lon,
      top5Only,
    );

  describe('findByRatingForUser', () => {
    it('rating is the average weighted by reviews, reviewsCount is their sum; centers without doctors or reviews stay with rating = null and reviewsCount = 0', async () => {
      const centers = await byRating();
      const aggregates = Object.fromEntries(
        centers.map(item => [item.id, [item.rating, item.reviewsCount]]),
      );

      expect(centers).toHaveLength(6);
      expect(aggregates).toMatchObject({
        // a plain average would give 4.5
        [C1]: ['4.25', '40'],
        [C2]: ['4.60', '5'],
        [C5]: ['4.25', '20'],
        [C6]: ['3.00', '10'],
        [C3]: [null, '0'],
        [C4]: [null, '0'],
      });
    });

    it('sorts by rating descending, centers without a rating last, ties by id', async () => {
      const centers = await byRating();

      expect(centers.map(item => item.id)).toEqual([C2, C1, C5, C6, C3, C4]);
    });

    it('isFavorite is computed for a specific user and does not inflate the aggregates', async () => {
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

    it('top5Only limits the result to the five best', async () => {
      const top5 = await byRating(userWithoutFavorites, true);

      expect(top5.map(item => item.id)).toEqual([C2, C1, C5, C6, C3]);
    });
  });

  describe('findWithDistanceForUser', () => {
    it('computes the distance in km with one decimal and the walking time, nearest first', async () => {
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

    it('top5Only returns the five nearest, not the first five by id', async () => {
      const centers = await byDistance(EQUATOR_ORIGIN, true);

      expect(centers.map(item => item.id)).toEqual([C2, C3, C4, C5, C6]);
    });

    it('user at the center point: the query does not fail, distance and walkingTimeMinutes are 0', async () => {
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
      favoriteService.findFavoritesForUser(userId, { page, size });

    it('returns only the favorites of the user, most recently added first', async () => {
      const { data } = await favoritesFor(userA);

      expect(data.map(item => item.id)).toEqual([C6, C1, C3]);
      expect(data.every(item => item.isFavorite)).toBe(true);
      expect(data[1]).toMatchObject({ rating: '4.25', reviewsCount: '40' });
      // C1 is a favorite of both users: each sees only their own list
      expect((await favoritesFor(userB)).data.map(item => item.id)).toEqual([
        C1,
      ]);
      expect((await favoritesFor(userWithoutFavorites)).data).toEqual([]);
    });

    it('pages do not overlap, hasMore is correct with grouping', async () => {
      const first = await favoritesFor(userA, 1, 2);
      const second = await favoritesFor(userA, 2, 2);
      const third = await favoritesFor(userA, 3, 2);

      expect(
        [first, second, third].map(page => page.data.map(c => c.id)),
      ).toEqual([[C6, C1], [C3], []]);
      expect([first, second, third].map(page => page.hasMore)).toEqual([
        true,
        false,
        false,
      ]);
    });
  });
});
