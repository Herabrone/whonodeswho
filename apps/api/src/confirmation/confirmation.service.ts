import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { PendingAction } from '@relationflow/contracts';

@Injectable()
export class ConfirmationService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  sign(pendingAction: PendingAction): string {
    return this.jwt.sign(pendingAction, {
      secret: this.secret,
      expiresIn: `${this.ttlSeconds}s`,
    });
  }

  verify(token: string): PendingAction {
    const value = this.jwt.verify<PendingAction>(token, {
      secret: this.secret,
    });

    if (!this.isPendingAction(value)) {
      throw new BadRequestException('Invalid confirmation token.');
    }

    return value;
  }

  private get secret(): string {
    return (
      this.config.get<string>('CONFIRMATION_TOKEN_SECRET') ??
      'whonodeswho-local-confirmation-secret'
    );
  }

  private get ttlSeconds(): number {
    return Number(
      this.config.get<string>('CONFIRMATION_TOKEN_TTL_SECONDS') ?? 900,
    );
  }

  private isPendingAction(value: unknown): value is PendingAction {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as PendingAction;
    return (
      candidate.type === 'create_relationship' &&
      !!candidate.payload &&
      typeof candidate.payload.fromPersonId === 'string' &&
      typeof candidate.payload.toPersonId === 'string' &&
      typeof candidate.payload.relationshipType === 'string' &&
      typeof candidate.createdAt === 'string'
    );
  }
}
