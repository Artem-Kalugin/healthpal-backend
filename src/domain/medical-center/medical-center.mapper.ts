import { MedicalCenter } from 'src/entities/medical-center.entity';
import { favoritedByUserPropertyName } from '../users/specification/with-user-favorite.specifiaction';

export function mapMedicalCenterWithRaw<T extends MedicalCenter>(payload: {
  entities: T[];
  raw: Record<string, any>[];
}): T[] {
  const { entities, raw: raws } = payload;
  return entities.map((center, index) => {
    const raw = raws[index];
    const distance = raw?.distance ? +(+raw.distance).toFixed(1) : undefined;

    return {
      ...center,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      [favoritedByUserPropertyName]: raw[favoritedByUserPropertyName],
      distance,

      reviewsCount: raw.reviewsCount,

      rating: raw.rating,
      walkingTimeMinutes: distance
        ? Math.round((distance / 5) * 60)
        : undefined,
    };
  });
}
