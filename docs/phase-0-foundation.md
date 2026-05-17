# Phase 0 — Foundation

Phase 0 is the complete running baseline that all feature tracks build on. It is
**done**. This document describes what it delivers and how it works.

## What Phase 0 delivers

- Graph canvas (React Flow) that renders people as nodes and relationships as
  colored, labeled edges.
- Zustand store with a full state shape for data, selection, view filters, focus,
  layout, and legend.
- Async `RelationshipStore` persistence abstraction, currently backed by an HTTP
  store that round-trips to the NestJS backend.
- NestJS backend with email/password auth, server-side sessions, and full-graph
  snapshot persistence in SQLite via Prisma.
- Shared TypeScript contracts package (`@relationflow/contracts`) consumed by
  both apps.
- Demo seed graph written server-side on first registration so every new account
  starts with the same graph on any device.
- Three feature track stubs in `src/features/crud`, `src/features/intelligence`,
  and `src/features/filtering`, all in-progress in parallel.

## Store API reference

All tracks integrate through `useGraphStore`. The full interface is defined in
`apps/web/src/store/useGraphStore.ts`.

### Lifecycle

| Action | Signature | Notes |
|--------|-----------|-------|
| `hydrate` | `() => Promise<void>` | Loads the user's graph from the backend. Called once on auth. |
| `signOut` | `() => void` | Clears all graph state in memory. Called by `AuthContext` on logout. |

### Data actions (Track A)

| Action | Signature |
|--------|-----------|
| `addPerson` | `(input: PersonInput) => Person` |
| `updatePerson` | `(id, patch: Partial<PersonInput>) => void` |
| `deletePerson` | `(id) => void` — cascades: removes touching relationships and positions |
| `addRelationship` | `(input: RelationshipInput) => Relationship` |
| `updateRelationship` | `(id, patch: Partial<RelationshipInput>) => void` |
| `deleteRelationship` | `(id) => void` |
| `replaceGraph` | `(graph: GraphData) => void` — replaces entire graph; resets positions |
| `setPosition` | `(personId, pos: XYPosition) => void` |

### Selection actions

| Action | Signature |
|--------|-----------|
| `selectPerson` | `(id \| null) => void` |
| `selectRelationship` | `(id \| null) => void` |
| `clearSelection` | `() => void` |

### View actions (Track C)

| Action | Signature |
|--------|-----------|
| `setVisibleCategories` | `(categories: RelationshipCategory[]) => void` |
| `toggleCategory` | `(category) => void` |
| `setShowLabels` | `(value: boolean) => void` |
| `setHideWeak` | `(value: boolean) => void` |
| `setSearchQuery` | `(query: string) => void` |
| `resetView` | `() => void` |

### Focus actions (Track B)

| Action | Signature |
|--------|-----------|
| `setFocus` | `(personId \| null, degrees?: FocusDegrees) => void` |
| `setFocusDegrees` | `(degrees: FocusDegrees) => void` |
| `clearFocus` | `() => void` |
| `setPath` | `(personIds: string[]) => void` |
| `clearPath` | `() => void` |

### Layout actions

| Action | Signature |
|--------|-----------|
| `setLayoutMode` | `(mode: LayoutMode) => void` |
| `setTreeShape` | `(shape: TreeShape) => void` |
| `setTreeRoot` | `(personId \| null) => void` |

## Persistence contract

```ts
interface RelationshipStore {
  load(): Promise<PersistedState>;
  save(state: PersistedState): Promise<void>;
  clear(): Promise<void>;
}
```

The store calls `save` with a 400 ms debounce after every mutation. The
production implementation (`HttpStore`) calls `PUT /graph` with the full
`PersistedState` snapshot. The store only ever references this interface; the
implementation can be swapped without touching the store.

## Graph algorithms

`apps/web/src/lib/graph.ts` provides pure functions (no React, no store):

- `getNeighbours(graph, personId, degrees)` — BFS neighbours within N degrees
- `getShortestPath(graph, fromId, toId)` — BFS shortest path as ordered id array
- `getConnectedIds(graph, personId, degrees)` — ids reachable within N degrees

## Type contract

The canonical types live in `packages/contracts/src/index.ts`. The frontend
`apps/web/src/types.ts` is a pure re-export so old `../types` imports continue
to resolve. No logic should be added to `src/types.ts`.

## Backend persistence model

User data is stored in a single `User` row per account. The graph is stored as
two JSON columns (`graphJson`, `positionsJson`) and three scalar layout columns.
The full `PersistedState` round-trips between the frontend snapshot model and the
database row in `GraphService`.

## What each track must not touch

- `apps/web/src/types.ts` — re-export only
- `apps/web/src/store/useGraphStore.ts` — tracks add actions through the file's
  declared interface but must not add track-specific state to the store
- `apps/web/src/graph/` — Phase 0 canvas; tracks do not edit canvas primitives
- `apps/api/` — tracks do not modify the backend
- `packages/contracts/` — additive changes only, by agreement
