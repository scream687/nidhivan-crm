import { UnauthorizedException } from '@nestjs/common';
import { CronController } from './cron.controller';
import { toWaNumber } from '../whatsapp/whatsapp.service';

const config = { get: jest.fn() };
const followUp = { sweepDueReminders: jest.fn() };
const workflows = { fire: jest.fn().mockResolvedValue(undefined) };

describe('CronController.tick', () => {
  const controller = new CronController(config as any, followUp as any, workflows as any);

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue('s3cret');
  });

  it('rejects a missing or wrong secret', async () => {
    await expect(controller.tick(undefined)).rejects.toThrow(UnauthorizedException);
    await expect(controller.tick('nope')).rejects.toThrow(UnauthorizedException);
    expect(followUp.sweepDueReminders).not.toHaveBeenCalled();
  });

  it('rejects everything when CRON_SECRET is unset', async () => {
    config.get.mockReturnValue(undefined);
    await expect(controller.tick('')).rejects.toThrow(UnauthorizedException);
  });

  it('sends due reminders and fires TASK_DUE for each', async () => {
    followUp.sweepDueReminders.mockResolvedValue([
      { id: 't1', leadId: 'l1', assignedToId: 'u1', lead: { name: 'Akash' } },
    ]);
    await expect(controller.tick('s3cret')).resolves.toEqual({ reminded: 1 });
    expect(workflows.fire).toHaveBeenCalledWith('TASK_DUE', {
      leadId: 'l1',
      name: 'Akash',
      assignedToId: 'u1',
    });
  });
});

describe('toWaNumber', () => {
  it.each([
    ['9876543210', '919876543210'],
    ['+91 98765 43210', '919876543210'],
    ['09876543210', '919876543210'],
    ['919876543210', '919876543210'],
  ])('%s -> %s', (input, out) => expect(toWaNumber(input)).toBe(out));
});
