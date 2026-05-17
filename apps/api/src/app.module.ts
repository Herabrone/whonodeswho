import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { ConfirmationModule } from './confirmation/confirmation.module';
import { GraphModule } from './graph/graph.module';
import { GraphToolsModule } from './graph-tools/graph-tools.module';
import { HealthModule } from './health/health.module';
import { OpenRouterModule } from './openrouter/openrouter.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS ?? 60000),
        limit: Number(process.env.CHAT_RATE_LIMIT_MAX_REQUESTS ?? 20),
      },
    ]),
    PrismaModule,
    AuthModule,
    GraphModule,
    GraphToolsModule,
    OpenRouterModule,
    ConfirmationModule,
    ChatModule,
    HealthModule,
  ],
})
export class AppModule {}
