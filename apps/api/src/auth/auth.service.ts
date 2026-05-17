import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import type { AuthUser } from '@relationflow/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { SEED_GRAPH, SEED_POSITIONS } from './seed-data';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(email: string, password: string): Promise<AuthUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('User already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        graphJson: JSON.stringify(SEED_GRAPH),
        positionsJson: JSON.stringify(SEED_POSITIONS),
      },
    });

    return this.toAuthUser(user);
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.toAuthUser(user);
  }

  async getCurrentUser(userId: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user ? this.toAuthUser(user) : null;
  }

  private toAuthUser(user: Pick<User, 'id' | 'email'>): AuthUser {
    return {
      id: user.id,
      email: user.email,
    };
  }
}
