import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  it('creates a conversation when no id is supplied', async () => {
    const prisma = {
      conversation: {
        create: jest.fn().mockResolvedValue({ id: 'conversation-1' }),
      },
    };
    const service = new ConversationService(prisma as never);

    await expect(
      service.resolveConversation(
        'user-1',
        undefined,
        'Find Alice in the graph',
      ),
    ).resolves.toBe('conversation-1');

    expect(prisma.conversation.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        title: 'Find Alice in the graph',
      },
    });
  });

  it('returns stored user and assistant messages in ascending order', async () => {
    const prisma = {
      conversationMessage: {
        findMany: jest.fn().mockResolvedValue([
          { role: 'assistant', content: 'Second' },
          { role: 'user', content: 'First' },
        ]),
      },
    };
    const service = new ConversationService(prisma as never);

    await expect(service.getHistory('conversation-1')).resolves.toEqual([
      { role: 'user', content: 'First' },
      { role: 'assistant', content: 'Second' },
    ]);
  });
});
