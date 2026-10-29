import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { userFavoriteDoctor, userFavoriteMedicalCenter } from 'src/db/schema';
import { DoctorService } from '../doctor/doctor.service';
import { MedicalCentersService } from '../medical-center/medical-center.service';

@Injectable()
export class FavoritesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly doctorService: DoctorService,
    private readonly medicalCenterService: MedicalCentersService,
  ) {}

  async addDoctorToFavorites(userId: string, doctorId: string) {
    if (!(await this.doctorService.existsById(doctorId))) {
      throw new NotFoundException('Доктор не найден');
    }

    // Пустой результат значит, что связь уже была (в том числе при гонке запросов)
    const inserted = await this.db
      .insert(userFavoriteDoctor)
      .values({ userId, doctorId })
      .onConflictDoNothing()
      .returning({ doctorId: userFavoriteDoctor.doctorId });

    if (inserted.length === 0) {
      throw new ConflictException('Доктор уже в избранном');
    }

    return { success: true, doctorId };
  }

  async addMedicalCenterToFavorites(userId: string, medicalCenterId: string) {
    if (!(await this.medicalCenterService.existsById(medicalCenterId))) {
      throw new NotFoundException('Медицинский центр не найден');
    }

    const inserted = await this.db
      .insert(userFavoriteMedicalCenter)
      .values({ userId, medicalCenterId })
      .onConflictDoNothing()
      .returning({
        medicalCenterId: userFavoriteMedicalCenter.medicalCenterId,
      });

    if (inserted.length === 0) {
      throw new ConflictException('Медицинский центр уже в избранном');
    }

    return { success: true, medicalCenterId };
  }

  async removeDoctorFromFavorites(userId: string, doctorId: string) {
    await this.db
      .delete(userFavoriteDoctor)
      .where(
        and(
          eq(userFavoriteDoctor.userId, userId),
          eq(userFavoriteDoctor.doctorId, doctorId),
        ),
      );
  }

  async removeMedicalCenterFromFavorites(
    userId: string,
    medicalCenterId: string,
  ) {
    await this.db
      .delete(userFavoriteMedicalCenter)
      .where(
        and(
          eq(userFavoriteMedicalCenter.userId, userId),
          eq(userFavoriteMedicalCenter.medicalCenterId, medicalCenterId),
        ),
      );
  }
}
