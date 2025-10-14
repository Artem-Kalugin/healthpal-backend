import { MedicalCenter } from 'src/entities/medical-center.entity';
import { MedicalCenterResponseFavoritePropertyName } from './dto/medical-center-response.dto';

export function mapMedicalCenterWithRaw(payload: {
  entities: MedicalCenter[];
  raw: Record<string, any>[];
}): (MedicalCenter & {
  isFavorite: boolean;
  distance?: number;
  walkingTimeMinutes?: number;
})[] {
  const { entities, raw: raws } = payload;
  return entities.map((center, index) => {
    const raw = raws[index];
    const distance = raw?.distance ? +(+raw.distance).toFixed(1) : undefined;

    return {
      ...center,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      [MedicalCenterResponseFavoritePropertyName]:
        raw[MedicalCenterResponseFavoritePropertyName],
      distance,
      walkingTimeMinutes: distance
        ? Math.round((distance / 5) * 60)
        : undefined,
    };
  });
}
