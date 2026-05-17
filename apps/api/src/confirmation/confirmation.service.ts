import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { ConfirmActionResponse, PendingAction } from '@relationflow/contracts';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

interface ConfirmationTokenPayload extends PendingAction {
  sub: string;
  jti: string;
  exp?: number;
}

interface VerifiedPendingAction {
  action: PendingAction;
  expiresAt: Date;
}

@Injectable()
export class ConfirmationService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  sign(userId: string, pendingAction: PendingAction): string {
    return this.jwt.sign(
      {
        ...pendingAction,
        sub: userId,
        jti: randomUUID(),
      },
      {
        secret: this.secret,
        expiresIn: `${this.ttlSeconds}s`,
      },
    );
  }

  get tokenTtlSeconds(): number {
    return this.ttlSeconds;
  }

  async verify(token: string, userId: string): Promise<VerifiedPendingAction> {
    const value = this.jwt.verify<ConfirmationTokenPayload>(token, {
      secret: this.secret,
    });

    if (!this.isConfirmationTokenPayload(value)) {
      throw new BadRequestException('Invalid confirmation token.');
    }

    if (value.sub !== userId) {
      throw new BadRequestException(
        'Confirmation token does not belong to the current user.',
      );
    }

    const existing = await this.prisma.usedToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });
    if (existing) {
      throw new BadRequestException('Confirmation token has already been used.');
    }

    const { sub: _sub, jti: _jti, exp, ...action } = value;

    return {
      action,
      expiresAt: new Date((exp ?? Math.floor(Date.now() / 1000)) * 1000),
    };
  }

  async getStoredResult(
    token: string,
    userId: string,
  ): Promise<ConfirmActionResponse | null> {
    const usedToken = await this.prisma.usedToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });
    if (!usedToken || usedToken.userId !== userId) {
      return null;
    }

    try {
      return JSON.parse(usedToken.resultJson) as ConfirmActionResponse;
    } catch {
      return null;
    }
  }

  async recordResult(
    token: string,
    userId: string,
    verified: VerifiedPendingAction,
    result: ConfirmActionResponse,
  ): Promise<void> {
    const tokenHash = this.hashToken(token);
    await this.prisma.usedToken.upsert({
      where: { tokenHash },
      update: {
        resultJson: JSON.stringify(result),
        expiresAt: verified.expiresAt,
      },
      create: {
        tokenHash,
        userId,
        actionType: verified.action.type,
        resultJson: JSON.stringify(result),
        expiresAt: verified.expiresAt,
      },
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
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

  private isConfirmationTokenPayload(
    value: unknown,
  ): value is ConfirmationTokenPayload {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as ConfirmationTokenPayload;
    return (
      candidate.type === 'create_relationship' &&
      typeof candidate.sub === 'string' &&
      typeof candidate.jti === 'string' &&
      !!candidate.payload &&
      typeof candidate.payload.fromPersonId === 'string' &&
      typeof candidate.payload.toPersonId === 'string' &&
      typeof candidate.payload.relationshipType === 'string' &&
      typeof candidate.createdAt === 'string'
    );
  }
}
