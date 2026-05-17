import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ChatSseEvent } from '@relationflow/contracts';
import type { Request, Response } from 'express';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ChatService } from './chat.service';
import { ChatStreamDto } from './dto/chat-stream.dto';

type SessionRequest = Request & {
  session: Request['session'] & { userId?: string };
};

@Controller('chat')
@UseGuards(SessionAuthGuard, ThrottlerGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('stream')
  async streamChat(
    @Body() dto: ChatStreamDto,
    @Req() request: SessionRequest,
    @Res() response: Response,
  ): Promise<void> {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();

    const sendEvent = (event: ChatSseEvent) => {
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    await this.chatService.chat(
      request.session.userId!,
      dto.conversationId,
      dto.message,
      sendEvent,
    );
    response.end();
  }
}
