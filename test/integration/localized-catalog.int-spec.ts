import type { Pool } from 'pg';
import { Locale } from 'src/common/i18n/locale';
import type { RequestContext } from 'src/common/i18n/request-context';
import type { Database } from 'src/db/db.module';
import { Region } from 'src/db/enums';
import { onboardingSlide } from 'src/db/schema';
import { AppointmentService } from 'src/domain/appointment/appointment.service';
import { DoctorService } from 'src/domain/doctor/doctor.service';
import { MedicalCenterService } from 'src/domain/medical-center/medical-center.service';
import { OnboardingSlidesService } from 'src/domain/onboarding-slides/onboarding-slides.service';
import { clearDatabase, createTestDb } from './db';
import { createFactories } from './factories';

const RU: RequestContext = { locale: Locale.RU, region: Region.RU };
const EN: RequestContext = { locale: Locale.EN, region: Region.RU };

describe('localized catalog (integration)', () => {
  let db: Database;
  let pool: Pool;
  let doctors: DoctorService;
  let centers: MedicalCenterService;
  let appointments: AppointmentService;
  let onboarding: OnboardingSlidesService;
  let factories: ReturnType<typeof createFactories>;
  let centerId: string;
  let userId: string;
  let doctorId: string;

  beforeAll(async () => {
    ({ db, pool } = await createTestDb());
    factories = createFactories(db);
    doctors = new DoctorService(db);
    centers = new MedicalCenterService(db);
    appointments = new AppointmentService(db);
    onboarding = new OnboardingSlidesService(db);

    const center = await factories.medicalCenter({
      name: { ru: 'Клиника Север', en: 'North Clinic' },
      address: { ru: 'ул. Ленина, 5', en: '5 Lenin St.' },
      city: { ru: 'Москва', en: 'Moscow' },
    });
    centerId = center.id;
    const doctor = await factories.doctor({
      name: { ru: 'Анна', en: 'Anna' },
      surname: { ru: 'Смирнова', en: 'Smirnova' },
      description: { ru: 'Терапевт', en: 'General practitioner' },
      medicalCenterId: center.id,
    });
    doctorId = doctor.id;
    userId = (await factories.user()).id;

    await db.insert(onboardingSlide).values({
      title: { ru: 'Привет', en: 'Hello' },
      text: { ru: 'Текст', en: 'Text' },
      image: { image: 'image.jpg', thumbhash: 'thumbhash' },
    });
  });

  afterAll(async () => {
    await clearDatabase(db);
    await pool.end();
  });

  const search = async (searchFor: string, context: RequestContext) =>
    (
      await doctors.searchForUser(
        userId,
        { page: 1, size: 10, searchFor },
        context,
      )
    ).data.map(item => item.id);

  it('returns a doctor and the center in the request language', async () => {
    await expect(
      doctors.findOneForUser(userId, doctorId, RU),
    ).resolves.toMatchObject({
      name: 'Анна',
      surname: 'Смирнова',
      description: 'Терапевт',
      medicalCenter: { name: 'Клиника Север', address: 'ул. Ленина, 5' },
    });
    await expect(
      doctors.findOneForUser(userId, doctorId, EN),
    ).resolves.toMatchObject({
      name: 'Anna',
      surname: 'Smirnova',
      description: 'General practitioner',
      medicalCenter: { name: 'North Clinic', address: '5 Lenin St.' },
    });
  });

  it('searches over the request language only', async () => {
    await expect(search('smirn', EN)).resolves.toEqual([doctorId]);
    await expect(search('north', EN)).resolves.toEqual([doctorId]);
    await expect(search('смирн', EN)).resolves.toEqual([]);
    await expect(search('смирн', RU)).resolves.toEqual([doctorId]);
    await expect(search('smirn', RU)).resolves.toEqual([]);
  });

  it('searches regardless of accents and ё', async () => {
    const { id } = await factories.doctor({
      name: { ru: 'Ёжик', en: 'Jürgen' },
      surname: { ru: 'Лесной', en: 'Müller' },
      medicalCenterId: centerId,
    });
    await expect(search('muller', EN)).resolves.toEqual([id]);
    await expect(search('JURGEN MULLER', EN)).resolves.toEqual([id]);
    await expect(search('Müller', EN)).resolves.toEqual([id]);
    await expect(search('ежик', RU)).resolves.toEqual([id]);
    await expect(search('Ёжик', RU)).resolves.toEqual([id]);
  });

  it('returns centers in the request language', async () => {
    const [ru] = await centers.findForUser(userId, {} as never, RU);
    const [en] = await centers.findForUser(userId, {} as never, EN);

    expect([ru, en]).toMatchObject([
      { name: 'Клиника Север', address: 'ул. Ленина, 5', city: 'Москва' },
      { name: 'North Clinic', address: '5 Lenin St.', city: 'Moscow' },
    ]);
  });

  it('returns onboarding slides in the request language', async () => {
    await expect(onboarding.findActive(RU)).resolves.toMatchObject([
      { title: 'Привет', text: 'Текст' },
    ]);
    await expect(onboarding.findActive(EN)).resolves.toMatchObject([
      { title: 'Hello', text: 'Text' },
    ]);
  });

  it('keeps appointments readable after the client switches the language', async () => {
    const empty = await appointments.getForUser(
      userId,
      { page: 1, size: 10, type: 'FUTURE' as never },
      EN,
    );

    expect(empty.data).toEqual([]);
  });
});
