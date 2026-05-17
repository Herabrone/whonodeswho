import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { AuthSessionResponse } from '@relationflow/contracts';
import type { Request, Response } from 'express';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { AuthService } from './auth.service';

type SessionRequest = Request & { session: Request['session'] & { userId?: string } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() credentials: AuthCredentialsDto,
    @Req() request: SessionRequest,
  ): Promise<AuthSessionResponse> {
    const user = await this.authService.register(
      credentials.email,
      credentials.password,
    );
    request.session.userId = user.id;
    return { user };
  }

  @Post('login')
  async login(
    @Body() credentials: AuthCredentialsDto,
    @Req() request: SessionRequest,
  ): Promise<AuthSessionResponse> {
    const user = await this.authService.login(
      credentials.email,
      credentials.password,
    );
    request.session.userId = user.id;
    return { user };
  }

  @Get('me')
  async me(@Req() request: SessionRequest): Promise<AuthSessionResponse> {
    if (!request.session.userId) {
      return { user: null };
    }

    const user = await this.authService.getCurrentUser(request.session.userId);
    if (!user) {
      delete request.session.userId;
    }

    return { user };
  }

  @Post('logout')
  async logout(
    @Req() request: SessionRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponse> {
    await new Promise<void>((resolve, reject) => {
      request.session.destroy((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    response.clearCookie('relationflow.sid');
    return { user: null };
  }
}
