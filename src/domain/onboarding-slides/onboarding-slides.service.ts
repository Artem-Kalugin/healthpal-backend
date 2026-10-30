import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { onboardingSlide } from 'src/db/schema';

@Injectable()
export class OnboardingSlidesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findActive() {
    return this.db
      .select()
      .from(onboardingSlide)
      .where(eq(onboardingSlide.isActive, true))
      .orderBy(asc(onboardingSlide.order), asc(onboardingSlide.id));
  }
}
