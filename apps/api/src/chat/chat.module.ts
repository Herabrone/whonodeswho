import { Module } from '@nestjs/common';
import { ConfirmationModule } from '../confirmation/confirmation.module';
import { GraphToolsModule } from '../graph-tools/graph-tools.module';
import { OpenRouterModule } from '../openrouter/openrouter.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConversationService } from './conversation.service';

@Module({
  imports: [OpenRouterModule, GraphToolsModule, ConfirmationModule],
  controllers: [ChatController],
  providers: [ChatService, ConversationService],
})
export class ChatModule {}
