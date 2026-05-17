import { resolvePersonReference } from './reference-resolver';

const people = [
  {
    id: 'alice',
    name: 'Alice Tran',
    aliasesJson: JSON.stringify(['Ally']),
    notes: 'The graph owner.',
    directRelationshipCount: 3,
  },
  {
    id: 'alex',
    name: 'Alex Tran',
    directRelationshipCount: 1,
  },
  {
    id: 'grace',
    name: 'Grace Lim',
    notes: 'Alice manager.',
    directRelationshipCount: 2,
  },
];

describe('resolvePersonReference', () => {
  it('resolves an exact alias match', () => {
    expect(resolvePersonReference('Ally', people)).toMatchObject({
      resolved: true,
      personId: 'alice',
      name: 'Alice Tran',
    });
  });

  it('returns candidates for ambiguous partial names', () => {
    expect(resolvePersonReference('Tran', people)).toEqual({
      resolved: false,
      candidates: expect.arrayContaining([
        expect.objectContaining({ personId: 'alex' }),
        expect.objectContaining({ personId: 'alice' }),
      ]),
    });
  });

  it('uses notes as a lower-priority fallback', () => {
    expect(resolvePersonReference('manager', people)).toMatchObject({
      resolved: true,
      personId: 'grace',
    });
  });
});