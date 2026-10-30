import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.setup';
import { ErrorCode } from 'src/common/errors/error-code';
import { AuthService } from 'src/domain/auth/auth.service';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';
import { DB, type Database } from 'src/db/db.module';
import { clearDatabase, resetSchema } from '../integration/db';
import { createFactories } from '../integration/factories';
import { freezeDate } from '../integration/time';

const NOW = new Date('2026-10-29T12:00:00.000Z');
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

type Body = Record<string, unknown>;

describe('Appointments (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;
  let factories: ReturnType<typeof createFactories>;
  let authService: AuthService;

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    configureApp(app);
    await app.init();

    db = app.get<Database>(DB);
    await resetSchema(db);
    factories = createFactories(db);
    authService = app.get(AuthService, { strict: false });
  });

  afterAll(async () => {
    // RedisModule does not close its connection, Jest would not exit
    await app.get<Redis>(REDIS_PROVIDER_KEY, { strict: false }).quit();
    await app.close();
  });

  beforeEach(async () => {
    freezeDate(NOW);
    await clearDatabase(db);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const send = async (
    method: 'get' | 'post' | 'patch',
    url: string,
    options: { token?: string; query?: object; body?: object } = {},
  ) => {
    let pending = request(app.getHttpServer())[method](url);
    if (options.token) pending = pending.set('Authorization', options.token);
    if (options.query) pending = pending.query(options.query);
    if (options.body) pending = pending.send(options.body);
    const response = await pending;

    return { status: response.status, body: response.body as Body };
  };

  const newUser = async () => {
    const user = await factories.user({ registrationComplete: true });
    const { accessToken } = await authService.generateTokens(user, 'e2e');

    return { user, token: `Bearer ${accessToken}` };
  };

  const givenFreeSlot = async (day = 3) => {
    const doctor = await factories.doctor();
    const slot = await factories.timeSlot(doctor.id, {
      date: `2026-11-${String(day).padStart(2, '0')}`,
    });

    return { doctor, slot };
  };

  const givenBooking = async (userId: string, day = 3) => {
    const { doctor, slot } = await givenFreeSlot(day);
    const appointment = await factories.appointment(userId, slot);

    return { doctor, slot, appointment };
  };

  const expectAppointmentShape = (body: Body) => {
    expect(body).toEqual(
      expect.objectContaining({
        id: expect.any(String) as string,
        userId: expect.any(String) as string,
        doctorId: expect.any(String) as string,
        date: expect.any(String) as string,
        startTime: expect.any(String) as string,
        endTime: expect.any(String) as string,
        isCancelled: expect.any(Boolean) as boolean,
      }),
    );
  };

  it('rejects requests without a token', async () => {
    const { status } = await send('get', '/appointments', {
      query: { type: 'FUTURE' },
    });

    expect(status).toBe(401);
  });

  describe('POST /appointments', () => {
    it('books a free slot', async () => {
      const { user, token } = await newUser();
      const { doctor, slot } = await givenFreeSlot();

      const { status, body } = await send('post', '/appointments', {
        token,
        body: { timeSlotId: slot.id },
      });

      expect(status).toBe(201);
      expectAppointmentShape(body);
      expect(body).toMatchObject({
        userId: user.id,
        doctorId: doctor.id,
        timeSlotId: slot.id,
        date: '2026-11-03',
        isCancelled: false,
      });
    });

    it('answers 409 APPOINTMENT_SLOT_TAKEN when the slot is already taken', async () => {
      const { token } = await newUser();
      const owner = await factories.user();
      const { slot } = await givenFreeSlot();
      await factories.appointment(owner.id, slot);

      const { status, body } = await send('post', '/appointments', {
        token,
        body: { timeSlotId: slot.id },
      });

      expect(status).toBe(409);
      expect(body).toEqual({
        statusCode: 409,
        code: ErrorCode.APPOINTMENT_SLOT_TAKEN,
      });
    });
  });

  describe('GET /appointments', () => {
    it('returns the paginated list of the user', async () => {
      const { user, token } = await newUser();
      await givenBooking(user.id);

      const { status, body } = await send('get', '/appointments', {
        token,
        query: { type: 'FUTURE', page: 1, size: 10 },
      });

      expect(status).toBe(200);
      expect(body.hasMore).toBe(false);
      expectAppointmentShape((body.data as Body[])[0]);
    });
  });

  describe('PATCH /appointments/:id/cancel', () => {
    it('returns the cancelled appointment as declared in Swagger', async () => {
      const { user, token } = await newUser();
      const { appointment } = await givenBooking(user.id);

      const { status, body } = await send(
        'patch',
        `/appointments/${appointment.id}/cancel`,
        { token },
      );

      expect(status).toBe(200);
      expectAppointmentShape(body);
      expect(body).toMatchObject({
        id: appointment.id,
        isCancelled: true,
        timeSlotId: null,
      });
    });

    it('answers 404 APPOINTMENT_NOT_FOUND for an unknown appointment', async () => {
      const { token } = await newUser();

      const { status, body } = await send(
        'patch',
        `/appointments/${UNKNOWN_ID}/cancel`,
        { token },
      );

      expect(status).toBe(404);
      expect(body).toEqual({
        statusCode: 404,
        code: ErrorCode.APPOINTMENT_NOT_FOUND,
      });
    });
  });

  describe('PATCH /appointments/:id/reschedule', () => {
    it('returns the moved appointment as declared in Swagger', async () => {
      const { user, token } = await newUser();
      const { doctor, appointment } = await givenBooking(user.id);
      const newSlot = await factories.timeSlot(doctor.id, {
        date: '2026-11-05',
      });

      const { status, body } = await send(
        'patch',
        `/appointments/${appointment.id}/reschedule`,
        { token, body: { newTimeSlotId: newSlot.id } },
      );

      expect(status).toBe(200);
      expectAppointmentShape(body);
      expect(body).toMatchObject({
        id: appointment.id,
        timeSlotId: newSlot.id,
        date: '2026-11-05',
      });
    });
  });
});
