import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getEntityRepository } from 'src/common/helpers/get-entity-repository';
import { DoctorService } from '../doctor/doctor.service';
import type { SafeRepository } from 'src/common/helpers/safe-repository.provider';
import { UserFavoriteDoctor } from 'src/entities/user-favorite-doctor.relation';
import { MedicalCentersService } from '../medical-center/medical-center.service';
import { UserFavoriteMedicalCenter } from 'src/entities/user-favorite-medical-center.relation';

@Injectable()
export class FavoritesService {
  constructor(
    @Inject(getEntityRepository(UserFavoriteDoctor.name))
    private readonly favoriteDoctorRepo: SafeRepository<UserFavoriteDoctor>,
    @Inject(getEntityRepository(UserFavoriteMedicalCenter.name))
    private readonly favoriteMedicalCenterRepo: SafeRepository<UserFavoriteMedicalCenter>,
    private readonly doctorService: DoctorService,
    private readonly medicalCenterService: MedicalCentersService,
  ) {}

  async addDoctorToFavorites(userId: string, doctorId: string) {
    const isDoctorExists = await this.doctorService.existsById(doctorId);

    if (!isDoctorExists) throw new NotFoundException('Доктор не найден');

    const isAlreadyFavorited = await this.favoriteDoctorRepo.existsBy({
      userId,
      doctorId,
    });

    if (isAlreadyFavorited)
      throw new ConflictException('Доктор уже в избранном');

    await this.favoriteDoctorRepo.save({ userId, doctorId });
    return { success: true, doctorId };
  }

  async addMedicalCenterToFavorites(userId: string, medicalCenterId: string) {
    const isMedicalCenterExists =
      await this.medicalCenterService.existsById(medicalCenterId);

    if (!isMedicalCenterExists) throw new NotFoundException('Доктор не найден');

    const isAlreadyFavorited = await this.favoriteMedicalCenterRepo.existsBy({
      userId,
      medicalCenterId,
    });

    if (isAlreadyFavorited)
      throw new ConflictException('Доктор уже в избранном');

    await this.favoriteMedicalCenterRepo.save({ userId, medicalCenterId });
    return { success: true, medicalCenterId };
  }

  async removeDoctorFromFavorites(userId: string, doctorId: string) {
    await this.favoriteDoctorRepo.delete({ userId, doctorId });
  }

  async removeMedicalCenterFromFavorites(
    userId: string,
    medicalCenterId: string,
  ) {
    await this.favoriteMedicalCenterRepo.delete({ userId, medicalCenterId });
  }
}
