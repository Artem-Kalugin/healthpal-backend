import { Inject, Injectable } from '@nestjs/common';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { doctorCategory } from 'src/db/schema';

@Injectable()
export class DoctorCategoryService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findAll() {
    return this.db.select().from(doctorCategory);
  }
}
