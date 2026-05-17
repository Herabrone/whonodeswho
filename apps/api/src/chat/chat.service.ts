import { Injectable, Logger } from '@nestjs/common';
import type { ChatSseEvent, PendingAction } from '@relationflow/contracts';
import type OpenAI from 'openai';
import { ConfirmationService } from '../confirmation/confirmation.service';
import { GraphToolExecutorService } from '../graph-tools/graph-tool-executor.service';
import { errorToolResponse } from '../graph-tools/tool-response';
import { OpenRouterService } from '../openrouter/openrouter.service';
import {
  GRAPH_TOOL_SCHEMAS,
  MAX_TOOL_CALL_ROUNDS,
  SYSTEM_PROMPT,
} from './chat.constants';
import { ConversationService } from './conversation.service';

type MessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type ToolCall = OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall;
type SendEvent = (event: ChatSseEvent) => void;

interface ToolExecutionResult {
  data?: unknown;
  pendingAction?: PendingAction;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly openrouter: OpenRouterService,
    private readonly graphTools: GraphToolExecutorService,
    private readonly conversationService: ConversationService,
    private readonly confirmationService: ConfirmationService,
  ) {}

  async chat(
    userId: string,
    conversationId: string | undefined,
    userMessage: string,
    sendEvent: SendEvent,
  ): Promise<void> {
    try {
      const resolvedConversationId =
        await this.conversationService.resolveConversation(
          userId,
          conversationId,
          userMessage,
        );
      sendEvent({
        type: 'conversation',
        conversationId: resolvedConversationId,
      });

      await this.conversationService.saveMessage(
        resolvedConversationId,
        'user',
        userMessage,
      );

      const history = await this.conversationService.getHistory(
        resolvedConversationId,
      );
      const messages: MessageParam[] = [SYSTEM_PROMPT, ...history];

      console.log('Sending request to OpenRouter with model:', this.openrouter.model);
      let rounds = 0;
      while (rounds < MAX_TOOL_CALL_ROUNDS) {
        rounds += 1;
        const response = await this.openrouter.sdk.chat.completions.create({
          model: this.openrouter.model,
          messages,
          tools: GRAPH_TOOL_SCHEMAS,
          tool_choice: 'auto',
          stream: false,
        });

        const choice = response.choices[0];
        const toolCalls = (choice?.message.tool_calls ?? []).filter(
          (toolCall): toolCall is ToolCall => toolCall.type === 'function',
        );
        if (toolCalls.length === 0) {
          break;
        }

        messages.push({
          role: 'assistant',
          content: choice.message.content ?? null,
          tool_calls: toolCalls,
        });

        for (const toolCall of toolCalls) {
          sendEvent({ type: 'tool_start', toolName: toolCall.function.name });
          const result = await this.executeTool(userId, toolCall);
          sendEvent({ type: 'tool_end', toolName: toolCall.function.name });

          if (result.pendingAction) {
            const token = this.confirmationService.sign(
              userId,
              result.pendingAction,
            );
            sendEvent({
              type: 'pending_action',
              pendingAction: result.pendingAction,
              token,
            });
            return;
          }

          const content = JSON.stringify(result.data ?? null);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content,
          });
          await this.conversationService.saveMessage(
            resolvedConversationId,
            'tool',
            content,
            toolCall.id,
            toolCall.function.name,
          );
        }
      }

      if (rounds >= MAX_TOOL_CALL_ROUNDS) {
        sendEvent({ type: 'error', message: 'Max tool call rounds exceeded.' });
        return;
      }

      await this.streamFinalResponse(
        messages,
        resolvedConversationId,
        sendEvent,
      );
    } catch (error) {
      this.logger.error('Chat error:', error);
      if (this.isOpenRouterTransportError(error)) {
        this.logger.error(`OpenRouter HTTP status: ${(error as any).status}`);
        this.logger.error(
          `OpenRouter error body: ${JSON.stringify((error as any).error ?? (error as any).message)}`,
        );
      }
      sendEvent({ type: 'error', message: this.errorMessage(error) });
    }
  }

  private async streamFinalResponse(
    messages: MessageParam[],
    conversationId: string,
    sendEvent: SendEvent,
  ): Promise<void> {
    const stream = await this.openrouter.sdk.chat.completions.create({
      model: this.openrouter.model,
      messages,
      stream: true,
    });

    let fullContent = '';
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? '';
      if (!token) {
        continue;
      }
      fullContent += token;
      sendEvent({ type: 'token', content: token });
    }

    await this.conversationService.saveMessage(
      conversationId,
      'assistant',
      fullContent,
    );
    sendEvent({ type: 'done' });
  }

  private async executeTool(
    userId: string,
    toolCall: ToolCall,
  ): Promise<ToolExecutionResult> {
    const args = this.parseToolArguments(toolCall.function.arguments);

    switch (toolCall.function.name) {
      case 'list_capabilities':
        return {
          data: await this.graphTools.listCapabilities(),
        };
      case 'resolve_person_reference':
        return {
          data: await this.graphTools.resolvePersonReference(
            userId,
            this.stringArg(args, 'text'),
          ),
        };
      case 'search_people':
        return {
          data: await this.graphTools.searchPeople(
            userId,
            this.stringArg(args, 'query'),
            this.numberArg(args, 'limit', 5),
          ),
        };
      case 'get_person':
        return {
          data: await this.graphTools.getPerson(
            userId,
            this.stringArg(args, 'personId'),
          ),
        };
      case 'find_path':
        return {
          data: await this.graphTools.findPath(
            userId,
            this.stringArg(args, 'fromPersonId'),
            this.stringArg(args, 'toPersonId'),
            this.numberArg(args, 'maxDepth', 4),
          ),
        };
      case 'get_neighborhood':
        return {
          data: await this.graphTools.getNeighborhood(
            userId,
            this.stringArg(args, 'personId'),
            this.numberArg(args, 'depth', 2),
          ),
        };
      case 'check_duplicate_relationship':
        return {
          data: await this.graphTools.checkDuplicateRelationship(
            userId,
            this.stringArg(args, 'fromPersonId'),
            this.stringArg(args, 'toPersonId'),
          ),
        };
      case 'suggest_relationship_type':
        return {
          data: await this.graphTools.suggestRelationshipType(
            this.stringArg(args, 'freeText'),
          ),
        };
      case 'propose_create_relationship':
        {
          const data = await this.graphTools.proposeCreateRelationship(
            userId,
            this.stringArg(args, 'fromPersonId'),
            this.stringArg(args, 'toPersonId'),
            this.stringArg(args, 'relationshipType'),
            this.optionalStringArg(args, 'notes'),
          );
          return {
            data,
            pendingAction: this.graphTools.extractPendingAction(data),
          };
        }
      default:
        return {
          data: errorToolResponse(
            'VALIDATION_ERROR',
            `Unknown tool: ${toolCall.function.name}`,
          ),
        };
    }
  }

  private parseToolArguments(value: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private stringArg(args: Record<string, unknown>, key: string): string {
    const value = args[key];
    return typeof value === 'string' ? value : '';
  }

  private optionalStringArg(
    args: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = args[key];
    return typeof value === 'string' && value.trim().length > 0
      ? value
      : undefined;
  }

  private numberArg(
    args: Record<string, unknown>,
    key: string,
    fallback: number,
  ): number {
    const value = args[key];
    return typeof value === 'number' ? value : fallback;
  }

  private errorMessage(error: any): string {
    if (this.isLocalHttpException(error)) {
      return typeof error.message === 'string' && error.message.length > 0
        ? error.message
        : 'Chat request failed.';
    }
    if (error?.status === 401) {
      return 'Authentication error: Check your OPENROUTER_API_KEY in the backend .env file.';
    }
    if (error?.status === 404) {
      return `Model not found: Check your OPENROUTER_MODEL ("${this.openrouter.model}") in the backend .env file.`;
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Chat request failed.';
  }

  private isLocalHttpException(error: unknown): boolean {
    return (
      !!error &&
      typeof error === 'object' &&
      'response' in error &&
      !!(error as any).response &&
      typeof (error as any).response === 'object' &&
      typeof (error as any).response.statusCode === 'number'
    );
  }

  private isOpenRouterTransportError(error: unknown): boolean {
    return (
      !!error &&
      typeof error === 'object' &&
      'status' in error &&
      typeof (error as any).status === 'number' &&
      !this.isLocalHttpException(error)
    );
  }
}
