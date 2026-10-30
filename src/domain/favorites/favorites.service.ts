import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB } from 'src/db/db.module';
import { existsById } from 'src/db/exists';
import type { Database } from 'src/db/db.module';
import {
  doctor,
  medicalCenter,
  userFavoriteDoctor,
  userFavoriteMedicalCenter,
} from 'src/db/schema';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';

@Injectable()
export class FavoritesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async addDoctorToFavorites(userId: string, doctorId: string) {
    if (!(await existsById(this.db, doctor, doctorId))) {
      throw new AppException(ErrorCode.DOCTOR_NOT_FOUND);
    }

    // Пустой результат значит, что связь уже была (в том числе при гонке запросов)
    const inserted = await this.db
      .insert(userFavoriteDoctor)
      .values({ userId, doctorId })
      .onConflictDoNothing()
      .returning({ doctorId: userFavoriteDoctor.doctorId });

    if (inserted.length === 0) {
      throw new AppException(ErrorCode.FAVORITE_ALREADY_EXISTS, {
        message: 'Доктор уже в избранном',
      });
    }

    return { success: true, doctorId };
  }

  async addMedicalCenterToFavorites(userId: string, medicalCenterId: string) {
    if (!(await existsById(this.db, medicalCenter, medicalCenterId))) {
      throw new AppException(ErrorCode.MEDICAL_CENTER_NOT_FOUND);
    }

    const inserted = await this.db
      .insert(userFavoriteMedicalCenter)
      .values({ userId, medicalCenterId })
      .onConflictDoNothing()
      .returning({
        medicalCenterId: userFavoriteMedicalCenter.medicalCenterId,
      });

    if (inserted.length === 0) {
      throw new AppException(ErrorCode.FAVORITE_ALREADY_EXISTS, {
        message: 'Медицинский центр уже в избранном',
      });
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
