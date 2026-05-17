import { GraphToolsService } from './graph-tools.service';

const graph = {
  people: [
    {
      id: 'alice',
      name: 'Alice Tran',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'bob',
      name: 'Bob Tran',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'carol',
      name: 'Carol Tran',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ],
  relationships: [
    {
      id: 'r1',
      source: 'alice',
      target: 'bob',
      type: 'friend',
      category: 'friend' as const,
      direction: 'two-way' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'r2',
      source: 'bob',
      target: 'carol',
      type: 'family',
      category: 'family' as const,
      direction: 'two-way' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ],
};

describe('GraphToolsService', () => {
  it('finds shortest paths over the loaded graph', async () => {
    const graphService = {
      getGraph: jest.fn().mockResolvedValue({ graph }),
    };
    const service = new GraphToolsService({} as never, graphService as never);

    await expect(
      service.findPath('user-1', 'alice', 'carol'),
    ).resolves.toMatchObject({
      found: true,
      degreeCount: 2,
      people: [{ id: 'alice' }, { id: 'bob' }, { id: 'carol' }],
      relationships: [{ id: 'r1' }, { id: 'r2' }],
    });
  });

  it('returns pending create relationship actions after validation', async () => {
    const prisma = {
      person: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'alice', name: 'Alice Tran' })
          .mockResolvedValueOnce({ id: 'carol', name: 'Carol Tran' }),
      },
      relationship: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const graphService = {
      getGraph: jest.fn().mockResolvedValue({ graph }),
    };
    const service = new GraphToolsService(
      prisma as never,
      graphService as never,
    );

    await expect(
      service.proposeCreateRelationship(
        'user-1',
        'alice',
        'carol',
        'coworker',
        'Project team',
      ),
    ).resolves.toMatchObject({
      type: 'create_relationship',
      payload: {
        fromPersonName: 'Alice Tran',
        toPersonName: 'Carol Tran',
        relationshipType: 'coworker',
        category: 'work',
        notes: 'Project team',
      },
    });
  });
});
