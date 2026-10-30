import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAppointmentDto } from './create-appointment.dto';

const TIME_SLOT_ID = '22222222-2222-4222-8222-222222222222';

const validateDto = (plain: object) =>
  validate(plainToInstance(CreateAppointmentDto, plain));

describe('CreateAppointmentDto', () => {
  it('accepts a valid timeSlotId', async () => {
    await expect(
      validateDto({ timeSlotId: TIME_SLOT_ID }),
    ).resolves.toHaveLength(0);
  });

  it('rejects a body without timeSlotId', async () => {
    const errors = await validateDto({});

    expect(errors.map(error => error.property)).toContain('timeSlotId');
  });
});
