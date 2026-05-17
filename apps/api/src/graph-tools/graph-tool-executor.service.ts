import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PendingAction } from '@relationflow/contracts';
import { GraphToolsService } from './graph-tools.service';
import {
  errorToolResponse,
  okToolResponse,
  type ErrorCode,
  type ToolResponse,
} from './tool-response';

@Injectable()
export class GraphToolExecutorService {
  constructor(private readonly graphTools: GraphToolsService) {}

  async listCapabilities(): Promise<ToolResponse> {
    return this.wrap(() => this.graphTools.listCapabilities());
  }

  async resolvePersonReference(
    userId: string,
    text: string,
  ): Promise<ToolResponse> {
    return this.wrap(() => this.graphTools.resolvePersonReference(userId, text));
  }

  async searchPeople(
    userId: string,
    query: string,
    limit = 5,
  ): Promise<ToolResponse> {
    return this.wrap(() => this.graphTools.searchPeople(userId, query, limit));
  }

  async getPerson(userId: string, personId: string): Promise<ToolResponse> {
    return this.wrap(() => this.graphTools.getPerson(userId, personId));
  }

  async findPath(
    userId: string,
    fromPersonId: string,
    toPersonId: string,
    maxDepth = 4,
  ): Promise<ToolResponse> {
    return this.wrap(() =>
      this.graphTools.findPath(userId, fromPersonId, toPersonId, maxDepth),
    );
  }

  async getNeighborhood(
    userId: string,
    personId: string,
    depth = 2,
  ): Promise<ToolResponse> {
    return this.wrap(() =>
      this.graphTools.getNeighborhood(userId, personId, depth),
    );
  }

  async checkDuplicateRelationship(
    userId: string,
    fromPersonId: string,
    toPersonId: string,
  ): Promise<ToolResponse> {
    return this.wrap(() =>
      this.graphTools.checkDuplicateRelationship(userId, fromPersonId, toPersonId),
    );
  }

  async suggestRelationshipType(freeText: string): Promise<ToolResponse> {
    return this.wrap(() => this.graphTools.suggestRelationshipType(freeText));
  }

  async proposeCreateRelationship(
    userId: string,
    fromPersonId: string,
    toPersonId: string,
    relationshipType: string,
    notes?: string,
  ): Promise<ToolResponse<{ pendingAction: PendingAction }>> {
    return this.wrap(async () => ({
      pendingAction: await this.graphTools.proposeCreateRelationship(
        userId,
        fromPersonId,
        toPersonId,
        relationshipType,
        notes,
      ),
    }));
  }

  extractPendingAction(response: ToolResponse): PendingAction | undefined {
    if (!response.ok || !response.data || typeof response.data !== 'object') {
      return undefined;
    }

    const pendingAction = (response.data as { pendingAction?: PendingAction })
      .pendingAction;
    return pendingAction && pendingAction.type === 'create_relationship'
      ? pendingAction
      : undefined;
  }

  private async wrap<T>(action: () => Promise<T>): Promise<ToolResponse<T>> {
    const startedAt = Date.now();
    try {
      const data = await action();
      return okToolResponse(data, Date.now() - startedAt);
    } catch (error) {
      return this.mapError(error, Date.now() - startedAt);
    }
  }

  private mapError(error: unknown, latencyMs: number): ToolResponse<never> {
    if (error instanceof NotFoundException) {
      return errorToolResponse(
        this.notFoundCode(this.messageOf(error)),
        this.messageOf(error),
        undefined,
        latencyMs,
      );
    }

    if (error instanceof BadRequestException) {
      return errorToolResponse(
        this.badRequestCode(this.messageOf(error)),
        this.messageOf(error),
        undefined,
        latencyMs,
      );
    }

    return errorToolResponse(
      'INTERNAL_ERROR',
      'The tool request failed.',
      undefined,
      latencyMs,
    );
  }

  private messageOf(error: BadRequestException | NotFoundException): string {
    const response = error.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (
      response &&
      typeof response === 'object' &&
      'message' in response &&
      typeof (response as { message?: unknown }).message === 'string'
    ) {
      return (response as { message: string }).message;
    }
    return error.message;
  }

  private notFoundCode(message: string): ErrorCode {
    if (message.toLowerCase().includes('relationship')) {
      return 'RELATIONSHIP_NOT_FOUND';
    }
    return 'PERSON_NOT_FOUND';
  }

  private badRequestCode(message: string): ErrorCode {
    const lower = message.toLowerCase();
    if (lower.includes('already exists')) {
      return 'DUPLICATE_RELATIONSHIP';
    }
    if (lower.includes('not allowed')) {
      return 'INVALID_RELATIONSHIP_TYPE';
    }
    if (lower.includes('depth')) {
      return 'MAX_DEPTH_EXCEEDED';
    }
    return 'VALIDATION_ERROR';
  }
}