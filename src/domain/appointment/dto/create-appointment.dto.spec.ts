import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAppointmentDto } from './create-appointment.dto';

const DOCTOR_ID = '11111111-1111-4111-8111-111111111111';
const TIME_SLOT_ID = '22222222-2222-4222-8222-222222222222';

const validateDto = (plain: object) =>
  validate(plainToInstance(CreateAppointmentDto, plain));

describe('CreateAppointmentDto', () => {
  it('accepts doctorId together with timeSlotId', async () => {
    await expect(
      validateDto({ doctorId: DOCTOR_ID, timeSlotId: TIME_SLOT_ID }),
    ).resolves.toHaveLength(0);
  });

  it('rejects a body without timeSlotId', async () => {
    const errors = await validateDto({ doctorId: DOCTOR_ID });

    expect(errors.map(error => error.property)).toContain('timeSlotId');
  });

  it('rejects a body without doctorId', async () => {
    const errors = await validateDto({ timeSlotId: TIME_SLOT_ID });

    expect(errors.map(error => error.property)).toContain('doctorId');
  });
});
