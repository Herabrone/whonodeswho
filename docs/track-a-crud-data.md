# Track A — CRUD & Data

**Owner:** `apps/web/src/features/crud/`

Track A adds the UI for creating, reading, updating, and deleting people and
relationships, plus import/export of graph data.

## Integration contract

Track A must only:
- Read state from `useGraphStore` selectors.
- Call store actions from the **Data actions** section of
  `docs/phase-0-foundation.md`.
- Render inside the overlay slot provided by `AppShell`.
- Write files only under `src/features/crud/`.

## Feature scope

### Person management
- [ ] Add person form (name, notes, color)
- [ ] Edit person panel (inline or side panel)
- [ ] Delete person (store handles cascade)

### Relationship management
- [ ] Add relationship form (source, target, type, category, direction, notes)
- [ ] Edit relationship panel
- [ ] Delete relationship

### Import / Export
- [ ] JSON export — round-trip via `GraphData` type from `@relationflow/contracts`
- [ ] JSON import — validate shape before calling `replaceGraph`
- [ ] CSV export — flat rows of people and relationships

## Store actions to use

```ts
addPerson(input: PersonInput): Person
updatePerson(id: string, patch: Partial<PersonInput>): void
deletePerson(id: string): void                    // cascade is handled by store
addRelationship(input: RelationshipInput): Relationship
updateRelationship(id: string, patch: Partial<RelationshipInput>): void
deleteRelationship(id: string): void
replaceGraph(graph: GraphData): void              // used by JSON import
selectPerson(id: string | null): void
selectRelationship(id: string | null): void
clearSelection(): void
```

## Types

All types come from `@relationflow/contracts` (or the re-export at
`../../types`). Do not add new domain types to this feature directory.

## Relationship catalog

`apps/web/src/constants.ts` provides `RELATIONSHIP_CATALOG` for suggested
relationship type strings per category. The form should show these as
suggestions but allow free-text entry.
