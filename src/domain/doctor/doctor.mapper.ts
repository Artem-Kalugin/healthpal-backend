import { Doctor } from 'src/entities/doctor.entity';
import { favoritedByUserPropertyName } from '../users/specification/with-user-favorite.specifiaction';

export function mapDoctorWithRaw(payload: {
  entities: Doctor[];
  raw: Record<string, any>[];
}): (Doctor & {
  isFavorite: boolean;
})[] {
  const { entities, raw: raws } = payload;
  return entities.map((center, index) => {
    const raw = raws[index];

    return {
      ...center,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      [favoritedByUserPropertyName]: raw[favoritedByUserPropertyName],
    };
  });
}
