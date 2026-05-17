import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { PendingAction } from '@relationflow/contracts';
import { ConfirmationService } from './confirmation.service';

const action: PendingAction = {
  type: 'create_relationship',
  createdAt: '2026-01-01T00:00:00.000Z',
  payload: {
    fromPersonId: 'alice',
    fromPersonName: 'Alice Tran',
    toPersonId: 'bob',
    toPersonName: 'Bob Tran',
    relationshipType: 'friend',
    category: 'friend',
    direction: 'two-way',
  },
};

describe('ConfirmationService', () => {
  it('signs and verifies pending actions', () => {
    const service = new ConfirmationService(new JwtService(), {
      get: (key: string) =>
        key === 'CONFIRMATION_TOKEN_SECRET' ? 'test-secret' : '900',
    } as never);

    const token = service.sign(action);

    expect(service.verify(token)).toMatchObject(action);
  });

  it('rejects malformed pending action payloads', () => {
    const service = new ConfirmationService(new JwtService(), {
      get: (key: string) =>
        key === 'CONFIRMATION_TOKEN_SECRET' ? 'test-secret' : '900',
    } as never);
    const token = new JwtService().sign(
      { type: 'create_relationship', payload: {} },
      { secret: 'test-secret' },
    );

    expect(() => service.verify(token)).toThrow(BadRequestException);
  });
});
