import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { SafeRepository } from 'src/common/providers/safe-repository.provider';
import { DoctorCategory } from 'src/entities/doctor-category.entity';
import { CreateDoctorCategoryDto } from './dto/create-doctor-category.dto';

@Injectable()
export class DoctorCategoryService {
  constructor(
    @InjectRepository(DoctorCategory)
    private readonly repo: SafeRepository<DoctorCategory>,
  ) {}

  async create(dto: CreateDoctorCategoryDto) {
    const count = await this.repo.count();
    if (count >= 20) {
      throw new BadRequestException('Max 20 categories allowed');
    }

    const category = this.repo.create(dto);
    return this.repo.safeSave(category);
  }

  async findAll(): Promise<DoctorCategory[]> {
    return this.repo.find();
  }
}
