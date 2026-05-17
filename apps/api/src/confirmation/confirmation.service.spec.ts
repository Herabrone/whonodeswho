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
  const prisma = {
    usedToken: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue(undefined),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.usedToken.findUnique.mockResolvedValue(null);
  });

  it('signs and verifies pending actions', async () => {
    const service = new ConfirmationService(new JwtService(), {
      get: (key: string) =>
        key === 'CONFIRMATION_TOKEN_SECRET' ? 'test-secret' : '900',
    } as never, prisma as never);

    const token = service.sign('user-1', action);

    await expect(service.verify(token, 'user-1')).resolves.toMatchObject({
      action,
    });
  });

  it('rejects malformed pending action payloads', async () => {
    const service = new ConfirmationService(new JwtService(), {
      get: (key: string) =>
        key === 'CONFIRMATION_TOKEN_SECRET' ? 'test-secret' : '900',
    } as never, prisma as never);
    const token = new JwtService().sign(
      { type: 'create_relationship', payload: {}, sub: 'user-1', jti: 'abc' },
      { secret: 'test-secret' },
    );

    await expect(service.verify(token, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects tokens signed for a different user', async () => {
    const service = new ConfirmationService(new JwtService(), {
      get: (key: string) =>
        key === 'CONFIRMATION_TOKEN_SECRET' ? 'test-secret' : '900',
    } as never, prisma as never);

    const token = service.sign('user-1', action);

    await expect(service.verify(token, 'user-2')).rejects.toThrow(
      'Confirmation token does not belong to the current user.',
    );
  });

  it('returns stored results for reused confirmation tokens', async () => {
    const result = {
      success: true as const,
      action,
      relationship: {
        id: 'edge-1',
        source: 'alice',
        target: 'bob',
        type: 'friend',
        category: 'friend' as const,
        direction: 'two-way' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    };
    prisma.usedToken.findUnique.mockResolvedValueOnce({
      tokenHash: 'hash',
      userId: 'user-1',
      actionType: 'create_relationship',
      resultJson: JSON.stringify(result),
      expiresAt: new Date('2026-01-01T00:15:00.000Z'),
      usedAt: new Date('2026-01-01T00:01:00.000Z'),
    });
    const service = new ConfirmationService(new JwtService(), {
      get: (key: string) =>
        key === 'CONFIRMATION_TOKEN_SECRET' ? 'test-secret' : '900',
    } as never, prisma as never);

    await expect(service.getStoredResult('token', 'user-1')).resolves.toEqual(
      result,
    );
  });
});
