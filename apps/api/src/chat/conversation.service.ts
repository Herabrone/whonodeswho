import { Injectable, NotFoundException } from '@nestjs/common';
import type OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

type StoredChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveConversation(
    userId: string,
    conversationId: string | undefined,
    firstMessage: string,
  ): Promise<string> {
    if (conversationId) {
      const existing = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (existing) {
        if (existing.userId !== userId) {
          throw new NotFoundException('Conversation not found.');
        }
        return existing.id;
      }
    }

    const title = this.titleFromMessage(firstMessage);
    const created = await this.prisma.conversation.create({
      data: {
        ...(conversationId ? { id: conversationId } : {}),
        userId,
        title,
      },
    });

    return created.id;
  }

  async getHistory(
    conversationId: string,
    maxMessages = 20,
  ): Promise<StoredChatMessage[]> {
    const messages = await this.prisma.conversationMessage.findMany({
      where: {
        conversationId,
        role: { in: ['user', 'assistant'] },
      },
      orderBy: { createdAt: 'desc' },
      take: maxMessages,
    });

    return messages
      .reverse()
      .filter((message) => message.content.length > 0)
      .map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      }));
  }

  async saveMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'tool',
    content: string,
    toolCallId?: string,
    toolName?: string,
  ): Promise<void> {
    await this.prisma.conversationMessage.create({
      data: {
        conversationId,
        role,
        content,
        toolCallId,
        toolName,
      },
    });
  }

  private titleFromMessage(message: string): string {
    const trimmed = message.trim().replace(/\s+/g, ' ');
    if (trimmed.length <= 60) {
      return trimmed || 'New conversation';
    }
    return `${trimmed.slice(0, 57)}...`;
  }
}
