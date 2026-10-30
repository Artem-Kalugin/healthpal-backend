import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';
import { paginate } from 'src/common/pagination/page';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { doctor, userFavoriteDoctor } from 'src/db/schema';
import { DoctorService } from 'src/domain/doctor/doctor.service';
import { selectDoctors } from 'src/domain/doctor/doctor.queries';
import { DoctorFavoritesQueryDto } from './dto/doctor-favorites.dto';

@Injectable()
export class DoctorFavoriteService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly doctorService: DoctorService,
  ) {}

  async findFavoritesForUser(userId: string, query: DoctorFavoritesQueryDto) {
    const { page, size } = query;
    const userFavorites = eq(userFavoriteDoctor.userId, userId);

    return paginate(
      selectDoctors(this.db, userId)
        .where(userFavorites)
        .orderBy(desc(userFavoriteDoctor.createdAt), asc(doctor.id)),
      { page, size },
    );
  }

  async addToFavoritesForUser(userId: string, doctorId: string) {
    if (!(await this.doctorService.existsById(doctorId))) {
      throw new AppException(ErrorCode.DOCTOR_NOT_FOUND);
    }

    // An empty result means the link already existed (including a request race)
    const inserted = await this.db
      .insert(userFavoriteDoctor)
      .values({ userId, doctorId })
      .onConflictDoNothing()
      .returning({ doctorId: userFavoriteDoctor.doctorId });

    if (inserted.length === 0) {
      throw new AppException(ErrorCode.FAVORITE_ALREADY_EXISTS, {
        message: 'Doctor is already in favorites',
      });
    }

    return { success: true, doctorId };
  }

  async removeFromFavoritesForUser(userId: string, doctorId: string) {
    await this.db
      .delete(userFavoriteDoctor)
      .where(
        and(
          eq(userFavoriteDoctor.userId, userId),
          eq(userFavoriteDoctor.doctorId, doctorId),
        ),
      );
  }
}
