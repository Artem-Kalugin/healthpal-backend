import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { localized } from 'src/common/i18n/locale';
import type { RequestContext } from 'src/common/i18n/request-context';
import { onboardingSlide } from 'src/db/schema';

@Injectable()
export class OnboardingSlidesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findActive({ locale }: RequestContext) {
    return this.db
      .select({
        image: onboardingSlide.image,
        title: localized(onboardingSlide.title, locale),
        text: localized(onboardingSlide.text, locale),
      })
      .from(onboardingSlide)
      .where(eq(onboardingSlide.isActive, true))
      .orderBy(asc(onboardingSlide.order), asc(onboardingSlide.id));
  }
}
