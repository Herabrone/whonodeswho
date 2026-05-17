import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

type McpRequest = Request & { mcpUserId?: string };

interface McpTokenPayload {
  sub: string;
}

@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<McpRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      throw new UnauthorizedException('Missing MCP bearer token.');
    }

    try {
      const payload = this.jwt.verify<McpTokenPayload>(token, {
        secret: this.secret,
      });
      request.mcpUserId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid MCP bearer token.');
    }
  }

  private get secret(): string {
    return (
      this.config.get<string>('MCP_TOKEN_SECRET') ??
      'whonodeswho-local-mcp-secret'
    );
  }
}