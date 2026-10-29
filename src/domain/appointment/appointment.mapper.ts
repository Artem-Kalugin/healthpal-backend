import { Appointment } from 'src/entities/appointment.entity';

export function mapAppointmentWithRaw(payload: {
  entities: Appointment[];
  raw: Record<string, any>[];
}): Appointment[] {
  const { entities } = payload;

  return entities;
}
