import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  GraphData,
  LayoutMode,
  PersistedState,
  Person as ContractPerson,
  Relationship as ContractRelationship,
  RelationshipCategory,
  RelationshipDirection,
  TreeShape,
} from '@relationflow/contracts';
import type { Person, Prisma, Relationship } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const EMPTY_STATE: PersistedState = {
  graph: { people: [], relationships: [] },
  positions: {},
  layout: {
    layoutMode: 'free',
    treeShape: 'grouped',
    treeRootId: null,
    familyAwareLayered: true,
  },
};

@Injectable()
export class GraphService {
  constructor(private readonly prisma: PrismaService) {}

  async getGraph(userId: string): Promise<PersistedState> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    await this.ensureRelationalGraph(userId, user.graphJson);

    const [people, relationships] = await Promise.all([
      this.prisma.person.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.relationship.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      graph: {
        people: people.map((person) => this.toContractPerson(person)),
        relationships: relationships.map((relationship) =>
          this.toContractRelationship(relationship),
        ),
      },
      positions: JSON.parse(user.positionsJson) as PersistedState['positions'],
      layout: {
        layoutMode: user.layoutMode as LayoutMode,
        treeShape: user.treeShape as TreeShape,
        treeRootId: user.treeRootId,
        familyAwareLayered: true,
      },
    };
  }

  async saveGraph(userId: string, payload: unknown): Promise<PersistedState> {
    if (!this.isPersistedState(payload)) {
      throw new BadRequestException('Invalid graph payload.');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.replaceRelationalGraph(tx, userId, payload.graph);
      await tx.user.update({
        where: { id: userId },
        data: {
          graphJson: JSON.stringify(payload.graph),
          positionsJson: JSON.stringify(payload.positions),
          layoutMode: payload.layout.layoutMode,
          treeShape: payload.layout.treeShape,
          treeRootId: payload.layout.treeRootId,
        },
      });
    });

    return this.getGraph(userId);
  }

  async clearGraph(userId: string): Promise<PersistedState> {
    await this.prisma.$transaction(async (tx) => {
      await tx.relationship.deleteMany({ where: { userId } });
      await tx.person.deleteMany({ where: { userId } });
      await tx.user.update({
        where: { id: userId },
        data: {
          graphJson: JSON.stringify(EMPTY_STATE.graph),
          positionsJson: JSON.stringify(EMPTY_STATE.positions),
          layoutMode: EMPTY_STATE.layout.layoutMode,
          treeShape: EMPTY_STATE.layout.treeShape,
          treeRootId: EMPTY_STATE.layout.treeRootId,
        },
      });
    });

    return EMPTY_STATE;
  }

  private async ensureRelationalGraph(
    userId: string,
    graphJson: string,
  ): Promise<void> {
    const existingPeople = await this.prisma.person.count({
      where: { userId },
    });
    if (existingPeople > 0) {
      return;
    }

    const graph = this.parseGraphJson(graphJson);
    if (graph.people.length === 0) {
      return;
    }

    await this.prisma.$transaction((tx) =>
      this.replaceRelationalGraph(tx, userId, graph),
    );
  }

  private parseGraphJson(graphJson: string): GraphData {
    try {
      const value = JSON.parse(graphJson) as unknown;
      return this.isGraphData(value) ? value : EMPTY_STATE.graph;
    } catch {
      return EMPTY_STATE.graph;
    }
  }

  private async replaceRelationalGraph(
    tx: Prisma.TransactionClient,
    userId: string,
    graph: GraphData,
  ): Promise<void> {
    await tx.relationship.deleteMany({ where: { userId } });
    await tx.person.deleteMany({ where: { userId } });

    if (graph.people.length > 0) {
      await tx.person.createMany({
        data: graph.people.map((person) => ({
          id: person.id,
          userId,
          name: person.name,
          aliasesJson: JSON.stringify(person.aliases ?? []),
          notes: person.notes ?? null,
          color: person.color ?? null,
          createdAt: this.toDate(person.createdAt),
          updatedAt: this.toDate(person.updatedAt),
        })),
      });
    }

    if (graph.relationships.length > 0) {
      await tx.relationship.createMany({
        data: graph.relationships.map((relationship) => ({
          id: relationship.id,
          userId,
          sourceId: relationship.source,
          targetId: relationship.target,
          type: relationship.type,
          category: relationship.category,
          direction: relationship.direction,
          startYear: relationship.startYear ?? null,
          startMonth: relationship.startMonth ?? null,
          endYear: relationship.endYear ?? null,
          isActive: relationship.isActive ?? null,
          color: relationship.color ?? null,
          notes: relationship.notes ?? null,
          createdAt: this.toDate(relationship.createdAt),
          updatedAt: this.toDate(relationship.updatedAt),
        })),
      });
    }
  }

  private toContractPerson(person: Person): ContractPerson {
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

  private toContractRelationship(
    relationship: Relationship,
  ): ContractRelationship {
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

  private toDate(value: string): Date {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
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

  private isPersistedState(value: unknown): value is PersistedState {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as PersistedState;
    return (
      !!candidate.graph &&
      this.isGraphData(candidate.graph) &&
      !!candidate.positions &&
      !!candidate.layout &&
      typeof candidate.layout.layoutMode === 'string' &&
      typeof candidate.layout.treeShape === 'string' &&
      (candidate.layout.familyAwareLayered === undefined ||
        typeof candidate.layout.familyAwareLayered === 'boolean')
    );
  }

  private isGraphData(value: unknown): value is GraphData {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as GraphData;
    if (
      !Array.isArray(candidate.people) ||
      !Array.isArray(candidate.relationships)
    ) {
      return false;
    }

    const personIds = new Set<string>();
    for (const person of candidate.people) {
      if (
        !person ||
        typeof person !== 'object' ||
        typeof person.id !== 'string' ||
        typeof person.name !== 'string' ||
        typeof person.createdAt !== 'string' ||
        typeof person.updatedAt !== 'string' ||
        personIds.has(person.id)
      ) {
        return false;
      }
      personIds.add(person.id);
    }

    const relationshipIds = new Set<string>();
    for (const relationship of candidate.relationships) {
      if (
        !relationship ||
        typeof relationship !== 'object' ||
        typeof relationship.id !== 'string' ||
        typeof relationship.source !== 'string' ||
        typeof relationship.target !== 'string' ||
        typeof relationship.type !== 'string' ||
        !this.isRelationshipCategory(relationship.category) ||
        !this.isRelationshipDirection(relationship.direction) ||
        typeof relationship.createdAt !== 'string' ||
        typeof relationship.updatedAt !== 'string' ||
        relationshipIds.has(relationship.id) ||
        !personIds.has(relationship.source) ||
        !personIds.has(relationship.target)
      ) {
        return false;
      }
      relationshipIds.add(relationship.id);
    }

    return true;
  }

  private isRelationshipCategory(
    value: unknown,
  ): value is RelationshipCategory {
    return (
      value === 'family' ||
      value === 'friend' ||
      value === 'romantic' ||
      value === 'conflict' ||
      value === 'work' ||
      value === 'education' ||
      value === 'other'
    );
  }

  private isRelationshipDirection(
    value: unknown,
  ): value is RelationshipDirection {
    return value === 'one-way' || value === 'two-way';
  }
}
