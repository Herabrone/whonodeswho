import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ConfirmActionResponse,
  GraphData,
  PendingAction,
  Relationship,
  RelationshipCategory,
  RelationshipDirection,
} from '@relationflow/contracts';
import type {
  Person as DbPerson,
  Relationship as DbRelationship,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { GraphService } from '../graph/graph.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  categoryForRelationshipType,
  isAllowedRelationshipType,
  type RelationshipType,
} from './constants';
import { resolvePersonReference as resolvePersonReferenceInList } from './reference-resolver';
import { suggestRelationshipType as suggestRelationshipTypeValue } from './type-suggester';

interface CreateRelationshipInput {
  fromPersonId: string;
  toPersonId: string;
  relationshipType: string;
  notes?: string;
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  isActive?: boolean;
}

interface ValidationResult {
  fromPerson: DbPerson;
  toPerson: DbPerson;
  relationshipType: RelationshipType;
  category: RelationshipCategory;
  direction: RelationshipDirection;
}

@Injectable()
export class GraphToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly graphService: GraphService,
  ) {}

  async searchPeople(userId: string, query: string, limit = 10) {
    const cappedLimit = this.cap(limit, 1, 10);
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    await this.ensureGraphLoaded(userId);
    const [people, relationships] = await Promise.all([
      this.prisma.person.findMany({
        where: { userId },
        orderBy: { name: 'asc' },
      }),
      this.prisma.relationship.findMany({ where: { userId } }),
    ]);

    return people
      .filter((person) => person.name.toLowerCase().includes(normalizedQuery))
      .slice(0, cappedLimit)
      .map((person) => ({
        person: this.toContractPerson(person),
        relationships: relationships
          .filter(
            (relationship) =>
              relationship.sourceId === person.id ||
              relationship.targetId === person.id,
          )
          .slice(0, 6)
          .map((relationship) => this.toContractRelationship(relationship)),
      }));
  }

  async listCapabilities() {
    return {
      version: '1.0.0',
      tools: [
        {
          name: 'list_capabilities',
          description: 'Enumerate the graph assistant tool surface.',
          category: 'meta' as const,
        },
        {
          name: 'resolve_person_reference',
          description: 'Resolve natural-language person references to stable IDs.',
          category: 'read' as const,
        },
        {
          name: 'search_people',
          description: 'Search people by name or partial name.',
          category: 'read' as const,
        },
        {
          name: 'get_person',
          description: 'Fetch one person and their relationships.',
          category: 'read' as const,
        },
        {
          name: 'find_path',
          description: 'Find the shortest path between two people.',
          category: 'read' as const,
        },
        {
          name: 'get_neighborhood',
          description: 'Get a local subgraph around one person.',
          category: 'read' as const,
        },
        {
          name: 'check_duplicate_relationship',
          description: 'Check whether any relationship already exists between two people.',
          category: 'read' as const,
        },
        {
          name: 'suggest_relationship_type',
          description: 'Map free text to a canonical relationship type.',
          category: 'read' as const,
        },
        {
          name: 'propose_create_relationship',
          description: 'Create a pending relationship proposal for user confirmation.',
          category: 'propose-write' as const,
        },
      ],
      writeProtections: [
        'All writes require user confirmation.',
        'The backend executes writes only after confirmation.',
      ],
      rateLimits: {
        readsPerMinute: Number(process.env.CHAT_RATE_LIMIT_MAX_REQUESTS ?? 20),
        writesPerMessage: 1,
      },
    };
  }

  async resolvePersonReference(userId: string, text: string) {
    await this.ensureGraphLoaded(userId);
    const [people, relationships] = await Promise.all([
      this.prisma.person.findMany({
        where: { userId },
        orderBy: { name: 'asc' },
      }),
      this.prisma.relationship.findMany({ where: { userId } }),
    ]);

    const directRelationshipCount = new Map<string, number>();
    for (const relationship of relationships) {
      directRelationshipCount.set(
        relationship.sourceId,
        (directRelationshipCount.get(relationship.sourceId) ?? 0) + 1,
      );
      directRelationshipCount.set(
        relationship.targetId,
        (directRelationshipCount.get(relationship.targetId) ?? 0) + 1,
      );
    }

    const result = resolvePersonReferenceInList(
      text,
      people.map((person) => ({
        id: person.id,
        name: person.name,
        notes: person.notes,
        aliasesJson: (person as DbPerson & { aliasesJson?: string | null }).aliasesJson,
        directRelationshipCount: directRelationshipCount.get(person.id) ?? 0,
      })),
    );

    if (!result) {
      throw new NotFoundException(`No person matching "${text}" was found.`);
    }

    return result;
  }

  async suggestRelationshipType(freeText: string) {
    return suggestRelationshipTypeValue(freeText);
  }

  async checkDuplicateRelationship(
    userId: string,
    fromPersonId: string,
    toPersonId: string,
  ) {
    await this.ensureGraphLoaded(userId);

    const [fromPerson, toPerson, relationships] = await Promise.all([
      this.prisma.person.findUnique({
        where: { userId_id: { userId, id: fromPersonId } },
      }),
      this.prisma.person.findUnique({
        where: { userId_id: { userId, id: toPersonId } },
      }),
      this.prisma.relationship.findMany({ where: { userId } }),
    ]);

    if (!fromPerson || !toPerson) {
      throw new NotFoundException('One or both people were not found.');
    }

    const existing = relationships
      .filter(
        (relationship) =>
          (relationship.sourceId === fromPersonId &&
            relationship.targetId === toPersonId) ||
          (relationship.sourceId === toPersonId &&
            relationship.targetId === fromPersonId),
      )
      .map((relationship) => this.toContractRelationship(relationship));

    return {
      hasDuplicate: existing.length > 0,
      existing,
    };
  }

  async getPerson(userId: string, personId: string) {
    await this.ensureGraphLoaded(userId);
    const person = await this.prisma.person.findUnique({
      where: { userId_id: { userId, id: personId } },
    });
    if (!person) {
      throw new NotFoundException('Person not found.');
    }

    const relationships = await this.prisma.relationship.findMany({
      where: {
        userId,
        OR: [{ sourceId: personId }, { targetId: personId }],
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      person: this.toContractPerson(person),
      relationships: relationships.map((relationship) =>
        this.toContractRelationship(relationship),
      ),
    };
  }

  async findPath(
    userId: string,
    fromPersonId: string,
    toPersonId: string,
    maxDepth = 4,
  ) {
    const cappedDepth = this.cap(maxDepth, 1, 4);
    const graph = await this.getGraphData(userId);
    const peopleById = new Map(
      graph.people.map((person) => [person.id, person]),
    );
    if (!peopleById.has(fromPersonId) || !peopleById.has(toPersonId)) {
      throw new NotFoundException('One or both people were not found.');
    }

    const adjacency = this.buildAdjacency(graph.relationships);
    const queue: Array<{
      personId: string;
      path: string[];
      relationshipIds: string[];
    }> = [
      { personId: fromPersonId, path: [fromPersonId], relationshipIds: [] },
    ];
    const visited = new Set<string>([fromPersonId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.personId === toPersonId) {
        return this.pathResponse(graph, current.path, current.relationshipIds);
      }

      if (current.path.length - 1 >= cappedDepth) {
        continue;
      }

      for (const edge of adjacency.get(current.personId) ?? []) {
        if (visited.has(edge.personId)) {
          continue;
        }
        visited.add(edge.personId);
        queue.push({
          personId: edge.personId,
          path: [...current.path, edge.personId],
          relationshipIds: [...current.relationshipIds, edge.relationshipId],
        });
      }
    }

    return {
      found: false,
      degreeCount: null,
      people: [],
      relationships: [],
    };
  }

  async getNeighborhood(userId: string, personId: string, depth = 2) {
    const cappedDepth = this.cap(depth, 1, 2);
    const graph = await this.getGraphData(userId);
    if (!graph.people.some((person) => person.id === personId)) {
      throw new NotFoundException('Person not found.');
    }

    const adjacency = this.buildAdjacency(graph.relationships);
    const distances = new Map<string, number>([[personId, 0]]);
    const queue = [personId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDepth = distances.get(current) ?? 0;
      if (currentDepth >= cappedDepth) {
        continue;
      }

      for (const edge of adjacency.get(current) ?? []) {
        if (distances.has(edge.personId)) {
          continue;
        }
        distances.set(edge.personId, currentDepth + 1);
        queue.push(edge.personId);
      }
    }

    const personIds = new Set(distances.keys());
    return {
      people: graph.people.filter((person) => personIds.has(person.id)),
      relationships: graph.relationships.filter(
        (relationship) =>
          personIds.has(relationship.source) &&
          personIds.has(relationship.target),
      ),
      distances: Object.fromEntries(distances),
    };
  }

  async proposeCreateRelationship(
    userId: string,
    fromPersonId: string,
    toPersonId: string,
    relationshipType: string,
    notes?: string,
    startYear?: number,
    startMonth?: number,
    endYear?: number,
    isActive?: boolean,
  ): Promise<PendingAction> {
    const validation = await this.validateCreateRelationship(userId, {
      fromPersonId,
      toPersonId,
      relationshipType,
      notes,
      startYear,
      startMonth,
      endYear,
      isActive,
    });

    return {
      type: 'create_relationship',
      createdAt: new Date().toISOString(),
      payload: {
        fromPersonId,
        fromPersonName: validation.fromPerson.name,
        toPersonId,
        toPersonName: validation.toPerson.name,
        relationshipType: validation.relationshipType,
        category: validation.category,
        direction: validation.direction,
        ...(startYear === undefined ? {} : { startYear }),
        ...(startMonth === undefined ? {} : { startMonth }),
        ...(endYear === undefined ? {} : { endYear }),
        ...(isActive === undefined ? {} : { isActive }),
        ...(notes ? { notes } : {}),
      },
    };
  }

  async validateAction(userId: string, action: PendingAction): Promise<void> {
    if (action.type !== 'create_relationship') {
      throw new BadRequestException('Unsupported pending action.');
    }

    await this.validateCreateRelationship(userId, {
      fromPersonId: action.payload.fromPersonId,
      toPersonId: action.payload.toPersonId,
      relationshipType: action.payload.relationshipType,
      notes: action.payload.notes,
      startYear: action.payload.startYear,
      startMonth: action.payload.startMonth,
      endYear: action.payload.endYear,
      isActive: action.payload.isActive,
    });
  }

  async executeAction(
    userId: string,
    action: PendingAction,
  ): Promise<ConfirmActionResponse> {
    await this.validateAction(userId, action);

    if (action.type === 'create_relationship') {
      const relationship = await this.executeCreateRelationship(userId, action);
      const state = await this.graphService.getGraph(userId);
      await this.prisma.user.update({
        where: { id: userId },
        data: { graphJson: JSON.stringify(state.graph) },
      });
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: action.type,
          payload: JSON.stringify(action),
        },
      });

      return {
        success: true,
        action,
        relationship,
        graph: state.graph,
      };
    }

    throw new BadRequestException('Unsupported pending action.');
  }

  async getGraphData(userId: string): Promise<GraphData> {
    const state = await this.graphService.getGraph(userId);
    return state.graph;
  }

  private async executeCreateRelationship(
    userId: string,
    action: PendingAction,
  ): Promise<Relationship> {
    const now = new Date();
    const created = await this.prisma.relationship.create({
      data: {
        id: randomUUID(),
        userId,
        sourceId: action.payload.fromPersonId,
        targetId: action.payload.toPersonId,
        type: action.payload.relationshipType,
        category: action.payload.category,
        direction: action.payload.direction,
        startYear: action.payload.startYear ?? null,
        startMonth: action.payload.startMonth ?? null,
        endYear: action.payload.endYear ?? null,
        isActive: action.payload.isActive ?? null,
        notes: action.payload.notes ?? null,
        createdAt: now,
        updatedAt: now,
      },
    });

    return this.toContractRelationship(created);
  }

  private async validateCreateRelationship(
    userId: string,
    input: CreateRelationshipInput,
  ): Promise<ValidationResult> {
    await this.ensureGraphLoaded(userId);

    if (input.fromPersonId === input.toPersonId) {
      throw new BadRequestException(
        'A relationship needs two different people.',
      );
    }

    if (!isAllowedRelationshipType(input.relationshipType)) {
      throw new BadRequestException('Relationship type is not allowed.');
    }

    if (input.startYear !== undefined && !Number.isInteger(input.startYear)) {
      throw new BadRequestException('Start year must be a whole number.');
    }

    if (input.startMonth !== undefined && !Number.isInteger(input.startMonth)) {
      throw new BadRequestException('Start month must be a whole number.');
    }

    if (input.startMonth !== undefined && (input.startMonth < 1 || input.startMonth > 12)) {
      throw new BadRequestException('Start month must be between 1 and 12.');
    }

    if (input.startMonth !== undefined && input.startYear === undefined) {
      throw new BadRequestException('Start month requires a start year.');
    }

    if (input.endYear !== undefined && !Number.isInteger(input.endYear)) {
      throw new BadRequestException('End year must be a whole number.');
    }

    if (
      input.startYear !== undefined &&
      input.endYear !== undefined &&
      input.endYear < input.startYear
    ) {
      throw new BadRequestException(
        'End year cannot be earlier than the start year.',
      );
    }

    const [fromPerson, toPerson, existingRelationships] = await Promise.all([
      this.prisma.person.findUnique({
        where: { userId_id: { userId, id: input.fromPersonId } },
      }),
      this.prisma.person.findUnique({
        where: { userId_id: { userId, id: input.toPersonId } },
      }),
      this.prisma.relationship.findMany({ where: { userId } }),
    ]);

    if (!fromPerson || !toPerson) {
      throw new NotFoundException('One or both people were not found.');
    }

    const normalizedType = input.relationshipType.toLowerCase();
    const duplicate = existingRelationships.some((relationship) => {
      const samePair =
        (relationship.sourceId === input.fromPersonId &&
          relationship.targetId === input.toPersonId) ||
        (relationship.sourceId === input.toPersonId &&
          relationship.targetId === input.fromPersonId);
      return samePair && relationship.type.toLowerCase() === normalizedType;
    });

    if (duplicate) {
      throw new BadRequestException('That relationship already exists.');
    }

    return {
      fromPerson,
      toPerson,
      relationshipType: input.relationshipType,
      category: categoryForRelationshipType(input.relationshipType),
      direction: 'two-way',
    };
  }

  private async ensureGraphLoaded(userId: string): Promise<void> {
    await this.graphService.getGraph(userId);
  }

  private buildAdjacency(relationships: Relationship[]) {
    const adjacency = new Map<
      string,
      Array<{ personId: string; relationshipId: string }>
    >();
    for (const relationship of relationships) {
      const sourceEdges = adjacency.get(relationship.source) ?? [];
      sourceEdges.push({
        personId: relationship.target,
        relationshipId: relationship.id,
      });
      adjacency.set(relationship.source, sourceEdges);

      const targetEdges = adjacency.get(relationship.target) ?? [];
      targetEdges.push({
        personId: relationship.source,
        relationshipId: relationship.id,
      });
      adjacency.set(relationship.target, targetEdges);
    }
    return adjacency;
  }

  private pathResponse(
    graph: GraphData,
    personIds: string[],
    relationshipIds: string[],
  ) {
    const peopleById = new Map(
      graph.people.map((person) => [person.id, person]),
    );
    const relationshipsById = new Map(
      graph.relationships.map((relationship) => [
        relationship.id,
        relationship,
      ]),
    );

    return {
      found: true,
      degreeCount: Math.max(personIds.length - 1, 0),
      people: personIds
        .map((personId) => peopleById.get(personId))
        .filter(Boolean),
      relationships: relationshipIds
        .map((relationshipId) => relationshipsById.get(relationshipId))
        .filter(Boolean),
    };
  }

  private cap(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      return min;
    }
    return Math.min(Math.max(Math.trunc(value), min), max);
  }

  private toContractPerson(person: DbPerson) {
    const aliases = this.parseAliases(person.aliasesJson);
    return {
      id: person.id,
      name: person.name,
      ...(aliases.length > 0 ? { aliases } : {}),
      ...(person.notes ? { notes: person.notes } : {}),
      ...(person.color ? { color: person.color } : {}),
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString(),
    };
  }

  private toContractRelationship(relationship: DbRelationship): Relationship {
    return {
      id: relationship.id,
      source: relationship.sourceId,
      target: relationship.targetId,
      type: relationship.type,
      category: relationship.category as RelationshipCategory,
      direction: relationship.direction as RelationshipDirection,
      ...(relationship.startYear === null
        ? {}
        : { startYear: relationship.startYear }),
      ...(relationship.startMonth === null
        ? {}
        : { startMonth: relationship.startMonth }),
      ...(relationship.endYear === null
        ? {}
        : { endYear: relationship.endYear }),
      ...(relationship.isActive === null
        ? {}
        : { isActive: relationship.isActive }),
      ...(relationship.color ? { color: relationship.color } : {}),
      ...(relationship.notes ? { notes: relationship.notes } : {}),
      createdAt: relationship.createdAt.toISOString(),
      updatedAt: relationship.updatedAt.toISOString(),
    };
  }

  private parseAliases(value: string): string[] {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  }
}
