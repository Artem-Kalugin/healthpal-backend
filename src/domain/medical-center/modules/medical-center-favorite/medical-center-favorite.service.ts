import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';
import { paginate } from 'src/common/pagination/page';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { medicalCenter, userFavoriteMedicalCenter } from 'src/db/schema';
import { MedicalCenterService } from 'src/domain/medical-center/medical-center.service';
import { selectCenters } from 'src/domain/medical-center/medical-center.queries';
import { favoritedAt } from './medical-center-favorite.queries';
import { MedicalCenterFavoritesQueryDto } from './dto/medical-center-favorites.dto';

@Injectable()
export class MedicalCenterFavoriteService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly medicalCenterService: MedicalCenterService,
  ) {}

  async findFavoritesForUser(
    userId: string,
    query: MedicalCenterFavoritesQueryDto,
  ) {
    const { page, size } = query;
    const userFavorites = eq(userFavoriteMedicalCenter.userId, userId);

    return paginate(
      selectCenters(this.db, userId)
        .where(userFavorites)
        .orderBy(desc(favoritedAt), asc(medicalCenter.id)),
      { page, size },
    );
  }

  async addToFavoritesForUser(userId: string, medicalCenterId: string) {
    if (!(await this.medicalCenterService.existsById(medicalCenterId))) {
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
        message: 'Medical center is already in favorites',
      });
    }

    return { success: true, medicalCenterId };
  }

  async removeFromFavoritesForUser(userId: string, medicalCenterId: string) {
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
