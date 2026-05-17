import { Injectable } from '@nestjs/common';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Request, Response } from 'express';
import * as z from 'zod/v4';
import { ConfirmationService } from '../confirmation/confirmation.service';
import { GraphToolExecutorService } from '../graph-tools/graph-tool-executor.service';
import {
  toolResponseText,
  type ToolResponse,
} from '../graph-tools/tool-response';

@Injectable()
export class McpService {
  constructor(
    private readonly graphTools: GraphToolExecutorService,
    private readonly confirmationService: ConfirmationService,
  ) {}

  async handleRequest(
    userId: string,
    request: Request,
    response: Response,
    body?: unknown,
  ): Promise<void> {
    const server = this.createServer(userId);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    response.on('close', () => {
      void transport.close();
      void server.close();
    });

    await transport.handleRequest(request, response, body);
  }

  methodNotAllowed(response: Response): void {
    response.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed.',
      },
      id: null,
    });
  }

  private createServer(userId: string): McpServer {
    const server = new McpServer({
      name: 'whonodeswho-mcp',
      version: '1.0.0',
    });

    server.registerTool(
      'list_capabilities',
      {
        description: 'Enumerate the graph assistant tool surface.',
        outputSchema: toolResponseOutputSchema,
      },
      async () => this.toCallToolResult(await this.graphTools.listCapabilities()),
    );

    server.registerTool(
      'resolve_person_reference',
      {
        description:
          'Resolve a natural-language person reference to a stable person ID.',
        inputSchema: {
          text: z.string().min(1).max(200),
        },
        outputSchema: toolResponseOutputSchema,
      },
      async ({ text }) =>
        this.toCallToolResult(
          await this.graphTools.resolvePersonReference(userId, text),
        ),
    );

    server.registerTool(
      'search_people',
      {
        description: 'Search for people in the graph by name or partial name.',
        inputSchema: {
          query: z.string().min(1).max(200),
          limit: z.number().int().min(1).max(10).optional(),
        },
        outputSchema: toolResponseOutputSchema,
      },
      async ({ query, limit }) =>
        this.toCallToolResult(
          await this.graphTools.searchPeople(userId, query, limit),
        ),
    );

    server.registerTool(
      'get_person',
      {
        description: 'Fetch a single person profile and relationships.',
        inputSchema: {
          personId: z.string().min(1).max(200),
        },
        outputSchema: toolResponseOutputSchema,
      },
      async ({ personId }) =>
        this.toCallToolResult(await this.graphTools.getPerson(userId, personId)),
    );

    server.registerTool(
      'find_path',
      {
        description: 'Find the shortest relationship chain between two people.',
        inputSchema: {
          fromPersonId: z.string().min(1).max(200),
          toPersonId: z.string().min(1).max(200),
          maxDepth: z.number().int().min(1).max(4).optional(),
        },
        outputSchema: toolResponseOutputSchema,
      },
      async ({ fromPersonId, toPersonId, maxDepth }) =>
        this.toCallToolResult(
          await this.graphTools.findPath(
            userId,
            fromPersonId,
            toPersonId,
            maxDepth,
          ),
        ),
    );

    server.registerTool(
      'get_neighborhood',
      {
        description: 'Get the local graph context around one person.',
        inputSchema: {
          personId: z.string().min(1).max(200),
          depth: z.number().int().min(1).max(2).optional(),
        },
        outputSchema: toolResponseOutputSchema,
      },
      async ({ personId, depth }) =>
        this.toCallToolResult(
          await this.graphTools.getNeighborhood(userId, personId, depth),
        ),
    );

    server.registerTool(
      'check_duplicate_relationship',
      {
        description:
          'Check whether any relationship already exists between two people.',
        inputSchema: {
          fromPersonId: z.string().min(1).max(200),
          toPersonId: z.string().min(1).max(200),
        },
        outputSchema: toolResponseOutputSchema,
      },
      async ({ fromPersonId, toPersonId }) =>
        this.toCallToolResult(
          await this.graphTools.checkDuplicateRelationship(
            userId,
            fromPersonId,
            toPersonId,
          ),
        ),
    );

    server.registerTool(
      'suggest_relationship_type',
      {
        description:
          'Map a natural-language relationship description to an allowed type.',
        inputSchema: {
          freeText: z.string().min(1).max(300),
        },
        outputSchema: toolResponseOutputSchema,
      },
      async ({ freeText }) =>
        this.toCallToolResult(
          await this.graphTools.suggestRelationshipType(freeText),
        ),
    );

    server.registerTool(
      'propose_create_relationship',
      {
        description:
          'Create a pending relationship proposal that still requires user confirmation.',
        inputSchema: {
          fromPersonId: z.string().min(1).max(200),
          toPersonId: z.string().min(1).max(200),
          relationshipType: z.string().min(1).max(100),
          notes: z.string().max(500).optional(),
        },
        outputSchema: toolResponseOutputSchema,
      },
      async ({ fromPersonId, toPersonId, relationshipType, notes }) => {
        const toolResponse = await this.graphTools.proposeCreateRelationship(
          userId,
          fromPersonId,
          toPersonId,
          relationshipType,
          notes,
        );
        const pendingAction = this.graphTools.extractPendingAction(toolResponse);
        if (!pendingAction) {
          return this.toCallToolResult(toolResponse);
        }

        const confirmationToken = this.confirmationService.sign(
          userId,
          pendingAction,
        );

        return this.toCallToolResult({
          ...toolResponse,
          data: {
            ...(toolResponse.data as object),
            confirmationToken,
            expiresInSeconds: this.confirmationService.tokenTtlSeconds,
            summary: `Create a ${pendingAction.payload.relationshipType} relationship between ${pendingAction.payload.fromPersonName} and ${pendingAction.payload.toPersonName}.`,
          },
        });
      },
    );

    return server;
  }

  private toCallToolResult(response: ToolResponse): CallToolResult {
    return {
      content: [
        {
          type: 'text',
          text: toolResponseText(response),
        },
      ],
      structuredContent: response as unknown as Record<string, unknown>,
      isError: !response.ok,
    };
  }
}

const toolResponseOutputSchema = {
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      detail: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  meta: z.object({
    toolVersion: z.literal('1'),
    latencyMs: z.number().optional(),
  }),
};