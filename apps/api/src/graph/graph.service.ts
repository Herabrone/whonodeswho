import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PersistedState, TreeShape, LayoutMode } from '@relationflow/contracts';
import { PrismaService } from '../prisma/prisma.service';

const EMPTY_STATE: PersistedState = {
  graph: { people: [], relationships: [] },
  positions: {},
  layout: {
    layoutMode: 'free',
    treeShape: 'grouped',
    treeRootId: null,
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

    return {
      graph: JSON.parse(user.graphJson) as PersistedState['graph'],
      positions: JSON.parse(user.positionsJson) as PersistedState['positions'],
      layout: {
        layoutMode: user.layoutMode as LayoutMode,
        treeShape: user.treeShape as TreeShape,
        treeRootId: user.treeRootId,
      },
    };
  }

  async saveGraph(userId: string, payload: unknown): Promise<PersistedState> {
    if (!this.isPersistedState(payload)) {
      throw new BadRequestException('Invalid graph payload.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        graphJson: JSON.stringify(payload.graph),
        positionsJson: JSON.stringify(payload.positions),
        layoutMode: payload.layout.layoutMode,
        treeShape: payload.layout.treeShape,
        treeRootId: payload.layout.treeRootId,
      },
    });

    return {
      graph: JSON.parse(updatedUser.graphJson) as PersistedState['graph'],
      positions: JSON.parse(updatedUser.positionsJson) as PersistedState['positions'],
      layout: {
        layoutMode: updatedUser.layoutMode as LayoutMode,
        treeShape: updatedUser.treeShape as TreeShape,
        treeRootId: updatedUser.treeRootId,
      },
    };
  }

  async clearGraph(userId: string): Promise<PersistedState> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        graphJson: JSON.stringify(EMPTY_STATE.graph),
        positionsJson: JSON.stringify(EMPTY_STATE.positions),
        layoutMode: EMPTY_STATE.layout.layoutMode,
        treeShape: EMPTY_STATE.layout.treeShape,
        treeRootId: EMPTY_STATE.layout.treeRootId,
      },
    });

    return EMPTY_STATE;
  }

  private isPersistedState(value: unknown): value is PersistedState {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as PersistedState;
    return (
      !!candidate.graph &&
      Array.isArray(candidate.graph.people) &&
      Array.isArray(candidate.graph.relationships) &&
      !!candidate.positions &&
      !!candidate.layout &&
      typeof candidate.layout.layoutMode === 'string' &&
      typeof candidate.layout.treeShape === 'string'
    );
  }
}
