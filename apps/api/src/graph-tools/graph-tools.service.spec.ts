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

  it('resolves people by alias and returns direct relationship context', async () => {
    const prisma = {
      person: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'alice',
            name: 'Alice Tran',
            aliasesJson: JSON.stringify(['Ally']),
            notes: 'The graph owner.',
          },
          {
            id: 'bob',
            name: 'Bob Tran',
            aliasesJson: '[]',
            notes: null,
          },
        ]),
      },
      relationship: {
        findMany: jest.fn().mockResolvedValue([
          { sourceId: 'alice', targetId: 'bob' },
        ]),
      },
    };
    const graphService = {
      getGraph: jest.fn().mockResolvedValue({ graph }),
    };
    const service = new GraphToolsService(
      prisma as never,
      graphService as never,
    );

    await expect(service.resolvePersonReference('user-1', 'Ally')).resolves.toEqual(
      {
        resolved: true,
        personId: 'alice',
        name: 'Alice Tran',
        context: 'The graph owner. 1 direct relationship.',
      },
    );
  });

  it('suggests canonical relationship types from free text', async () => {
    const service = new GraphToolsService({} as never, {} as never);

    await expect(service.suggestRelationshipType('my boss')).resolves.toMatchObject({
      bestMatch: 'manager',
    });
  });

  it('reports duplicate relationships in either direction', async () => {
    const prisma = {
      person: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'alice', name: 'Alice Tran' })
          .mockResolvedValueOnce({ id: 'bob', name: 'Bob Tran' }),
      },
      relationship: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'r1',
            sourceId: 'bob',
            targetId: 'alice',
            type: 'friend',
            category: 'friend',
            direction: 'two-way',
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
            updatedAt: new Date('2024-01-01T00:00:00.000Z'),
          },
        ]),
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
      service.checkDuplicateRelationship('user-1', 'alice', 'bob'),
    ).resolves.toMatchObject({
      hasDuplicate: true,
      existing: [{ id: 'r1', source: 'bob', target: 'alice' }],
    });
  });

  it('lists supported capabilities for the current domain tool surface', async () => {
    const service = new GraphToolsService({} as never, {} as never);

    await expect(service.listCapabilities()).resolves.toMatchObject({
      version: '1.0.0',
      tools: expect.arrayContaining([
        expect.objectContaining({ name: 'resolve_person_reference' }),
        expect.objectContaining({ name: 'check_duplicate_relationship' }),
      ]),
      rateLimits: {
        readsPerMinute: expect.any(Number),
        writesPerMessage: 1,
      },
    });
  });
});
