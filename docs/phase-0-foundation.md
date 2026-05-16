# Phase 0 — Foundation (DONE)

Phase 0 is **already built in this repo**. This document is the reference the
three track agents use: it describes every contract they will consume. Phase 0
is blocking — merge and verify it before starting Tracks A/B/C.

## 1. Verify Phase 0

```bash
npm install
npm run typecheck   # tsc -b, no errors
npm run build       # vite build succeeds
npm test            # vitest: graph primitive tests pass
npm run dev         # app loads, seed graph of 11 people is draggable
```

On first run the app seeds a demo graph (Alice Tran's network) so every track
has data to develop against. Three dashed placeholder cards mark the reserved
regions for Tracks A/B/C.

## 2. File map

```
src/
  types.ts                 Frozen domain types (the core contract)
  constants.ts             Category colors, relationship catalog, helpers
  lib/
    graph.ts               Graph algorithm primitives (frozen)
    graph.test.ts          Unit tests for the primitives
    id.ts                  newId() / nowIso() helpers
  data/seed.ts             Demo graph + hand-placed positions
  store/
    persistence.ts         RelationshipStore interface (backend-swap contract)
    localStorageStore.ts   localStorage implementation + singleton
    useGraphStore.ts       Zustand store — THE integration contract
  graph/
    useGraphView.ts        Derives styled RF nodes/edges from store state
    PersonNode.tsx         Custom RF node
    GraphCanvas.tsx        React Flow surface (pure fn of store)
  components/AppShell.tsx  App chrome
  App.tsx                  Composition root (hydrate + seed + compose)
  features/
    crud/index.tsx         Track A stub
    intelligence/index.tsx Track B stub
    filtering/index.tsx    Track C stub
```

## 3. Type contract — `src/types.ts`

```ts
type RelationshipCategory = "family" | "friend" | "romantic" | "work" | "other";
type RelationshipDirection = "one-way" | "two-way";
type FocusDegrees = 1 | 2 | 3 | "all";

interface Person {
  id: string; name: string; notes?: string; color?: string;
  createdAt: string; updatedAt: string;       // ISO 8601
}
interface Relationship {
  id: string; source: string; target: string; // source/target are Person.id
  type: string; category: RelationshipCategory;
  direction: RelationshipDirection; color?: string; notes?: string;
  createdAt: string; updatedAt: string;
}
interface GraphData { people: Person[]; relationships: Relationship[]; }
interface XYPosition { x: number; y: number; }
interface PersistedState { graph: GraphData; positions: Record<string, XYPosition>; }

type PersonInput       = Omit<Person, "id" | "createdAt" | "updatedAt">;
type RelationshipInput = Omit<Relationship, "id" | "createdAt" | "updatedAt">;
```

## 4. Store API — `src/store/useGraphStore.ts`

`useGraphStore` is a Zustand hook. Read state with a selector; call actions
directly. Example:

```ts
const people   = useGraphStore((s) => s.people);
const addPerson = useGraphStore((s) => s.addPerson);
```

### State
`people`, `relationships`, `positions`, `selectedPersonId`,
`selectedRelationshipId`, `visibleCategories`, `showLabels`, `hideWeak`,
`searchQuery`, `focusPersonId`, `focusDegrees`, `pathPersonIds`, `hydrated`.

### Actions
| Action | Signature | Notes |
|--------|-----------|-------|
| `addPerson` | `(PersonInput) => Person` | generates id/timestamps |
| `updatePerson` | `(id, Partial<PersonInput>) => void` | |
| `deletePerson` | `(id) => void` | cascades: removes touching relationships |
| `addRelationship` | `(RelationshipInput) => Relationship` | |
| `updateRelationship` | `(id, Partial<RelationshipInput>) => void` | |
| `deleteRelationship` | `(id) => void` | |
| `replaceGraph` | `(GraphData) => void` | used by import |
| `setPosition` | `(personId, XYPosition) => void` | canvas drag |
| `selectPerson` | `(id \| null) => void` | clears relationship selection |
| `selectRelationship` | `(id \| null) => void` | clears person selection |
| `clearSelection` | `() => void` | |
| `setVisibleCategories` | `(RelationshipCategory[]) => void` | |
| `toggleCategory` | `(RelationshipCategory) => void` | |
| `setShowLabels` | `(boolean) => void` | |
| `setHideWeak` | `(boolean) => void` | |
| `setSearchQuery` | `(string) => void` | |
| `resetView` | `() => void` | restores view + clears focus/path |
| `setFocus` | `(personId \| null, degrees?) => void` | |
| `setFocusDegrees` | `(FocusDegrees) => void` | |
| `clearFocus` | `() => void` | |
| `setPath` | `(personIds: string[]) => void` | degrees-of-separation result |
| `clearPath` | `() => void` | |

State auto-persists (debounced 400ms) after any data/position mutation.

### Selectors
```ts
selectPersonById(id)        // (store) => Person | null
selectRelationshipById(id)  // (store) => Relationship | null
selectRelationshipsOf(id)   // (store) => Relationship[]   (edges touching id)
```

## 5. Graph primitives — `src/lib/graph.ts`

All traversal treats relationships as **undirected**.

```ts
buildAdjacency(graph): Adjacency                          // Map<id, Set<id>>
getNeighbors(adj, personId): string[]
getNodesWithinDegrees(adj, startId, degrees|"all"): Set<string>
findShortestPath(adj, startId, targetId): string[] | null // BFS, inclusive
pathEdgeIds(graph, path): string[]                        // edges along a path
autoLayout(index, total, center?): XYPosition             // circular layout
```

## 6. Persistence / backend-swap — `src/store/persistence.ts`

```ts
interface RelationshipStore {
  load(): Promise<PersistedState>;
  save(state: PersistedState): Promise<void>;
  clear(): Promise<void>;
}
```

`LocalStorageStore` implements it today. To move to a backend later, write a
`SupabaseStore implements RelationshipStore` and change the single `export
const persistenceStore = …` line in `localStorageStore.ts`. The async interface
means no other file changes. **This swap is out of MVP scope** — listed here so
tracks build against the async API and never assume synchronous storage.

## 7. How the canvas restyles itself

`useGraphView.ts` recomputes React Flow nodes/edges whenever relevant store
fields change:

- `focusPersonId` + `focusDegrees` → nodes/edges outside the focus set get
  `opacity: 0.18 / 0.12` (dimmed).
- `pathPersonIds` → path nodes get a ring, path edges thicken.
- `searchQuery` → matching nodes get a highlight ring.
- `visibleCategories` / `hideWeak` → non-matching edges are removed.
- `showLabels` → edge labels shown/hidden.

So Tracks B and C deliver **controls only** — they flip store fields and the
canvas follows. They never import from `src/graph/`.
