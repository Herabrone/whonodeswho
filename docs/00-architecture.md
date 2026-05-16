# RelationFlow — Architecture & Parallel Build Plan

A personal relationship graph app: people are nodes, relationships are colored
edges, and the app helps you explore your network (focus mode, degrees of
separation, filtering).

This document is the **master plan**. Read it first. It explains how the build
is split so that three coding agents (Copilot / Codex) can work **in parallel**
without colliding.

---

## 1. The parallelization model

You cannot parallelize *everything* — if three agents each invent their own
`Person` type and store, you get merge hell. So the build is:

```
        ┌─────────────────────────────┐
        │  PHASE 0 — FOUNDATION        │   (blocking, build first, DONE)
        │  types · store · canvas ·    │
        │  graph algorithms · stubs    │
        └──────────────┬──────────────┘
                       │  freeze the contracts
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌─────────┐   ┌───────────┐   ┌────────────┐
   │ TRACK A │   │  TRACK B  │   │  TRACK C   │   (fully parallel)
   │ CRUD &  │   │  Graph    │   │ Filtering  │
   │ Data    │   │ Intelligence│ │ & Search   │
   └─────────┘   └───────────┘   └────────────┘
```

**Phase 0 is already built** (this repo). It is the contract layer. Once you
accept it, Tracks A/B/C can run at the same time because each one:

- works **only inside its own folder** (`src/features/<track>/`),
- integrates **only through the store** (`src/store/useGraphStore.ts`) and the
  graph primitives (`src/lib/graph.ts`),
- renders into its **own reserved screen region** (no shared layout).

Result: near-zero merge conflict. The store is the single integration point,
and no track edits it.

---

## 2. The three tracks

| Track | Owns folder | Scope | Spec |
|------|-------------|-------|------|
| **A — CRUD & Data** | `src/features/crud/` | Add/edit/delete people & relationships, detail panels, JSON + CSV import/export | `track-a-crud-data.md` |
| **B — Graph Intelligence** | `src/features/intelligence/` | Focus mode (1/2/3/all degrees), degrees-of-separation path finder | `track-b-graph-intelligence.md` |
| **C — Filtering & Search** | `src/features/filtering/` | Category filters, label toggle, hide-weak, people search, reset view | `track-c-filtering-search.md` |

Each track replaces its stub `index.tsx` and may add any files **under its own
folder only**.

---

## 3. File ownership map — THE RULES

| Path | Owner | Other tracks may… |
|------|-------|-------------------|
| `src/types.ts` | Phase 0 — **frozen** | read/import only |
| `src/constants.ts` | Phase 0 — **frozen** | read/import only |
| `src/lib/graph.ts` | Phase 0 — **frozen** | read/import only |
| `src/store/**` | Phase 0 — **frozen** | call actions, read state — never edit |
| `src/graph/**` | Phase 0 — **frozen** | never edit (canvas reacts to store) |
| `src/components/AppShell.tsx` | Phase 0 — **frozen** | never edit |
| `src/App.tsx` | Phase 0 — **frozen** | never edit |
| `src/features/crud/**` | Track A | A only |
| `src/features/intelligence/**` | Track B | B only |
| `src/features/filtering/**` | Track C | C only |

**Frozen** means: do not change the shape of an existing type, action, or
function. Additive-only changes (a new optional field, a new action) are
allowed **only by explicit agreement** and must be made in a separate, merged
"contract amendment" commit *before* tracks consume them — never silently
inside a track branch.

If a track believes it needs a contract change, it must stop and request it
rather than editing a frozen file on its own branch.

---

## 4. The integration contract

Everything a track needs to touch the rest of the app:

### 4.1 Store — `src/store/useGraphStore.ts`
A single Zustand store. All state slices and actions already exist. Tracks
**call actions** and **read state**; they never add logic to this file.

- Data (Track A drives): `addPerson`, `updatePerson`, `deletePerson`,
  `addRelationship`, `updateRelationship`, `deleteRelationship`,
  `replaceGraph`, `setPosition`.
- Selection (canvas drives, any track reads): `selectedPersonId`,
  `selectedRelationshipId`, `selectPerson`, `selectRelationship`,
  `clearSelection`.
- View (Track C drives): `visibleCategories`, `showLabels`, `hideWeak`,
  `searchQuery`, `toggleCategory`, `setVisibleCategories`, `setShowLabels`,
  `setHideWeak`, `setSearchQuery`, `resetView`.
- Focus (Track B drives): `focusPersonId`, `focusDegrees`, `pathPersonIds`,
  `setFocus`, `setFocusDegrees`, `clearFocus`, `setPath`, `clearPath`.

Selectors exported: `selectPersonById`, `selectRelationshipById`,
`selectRelationshipsOf`.

### 4.2 Graph primitives — `src/lib/graph.ts`
Pure functions: `buildAdjacency`, `getNeighbors`, `getNodesWithinDegrees`,
`findShortestPath`, `pathEdgeIds`, `autoLayout`. Track B builds its features on
top of these.

### 4.3 The canvas reacts automatically
`src/graph/useGraphView.ts` derives the rendered nodes/edges from store state.
When Track B sets `focusPersonId`/`pathPersonIds` or Track C sets
`visibleCategories`/`showLabels`/`hideWeak`/`searchQuery`, the canvas restyles
itself. **No track ever touches the canvas.**

### 4.4 Reserved screen regions (no layout collisions)
Each feature mounts as an absolute overlay in its own region:

```
┌────────────────────────────────────────────────────┐
│ [Track C: search + filter toggle]   [Track A: +Add] │
│                                                      │
│  Track C                                  Track A    │
│  filter drawer        GRAPH CANVAS         detail     │
│  (left)                                    drawer     │
│                                            (right)    │
│            [Track B: focus + path bar]               │
└────────────────────────────────────────────────────┘
Modals (Track A forms, Track B picker): centered, z-40.
```

z-index bands: canvas 0 · overlays 20 · drawers 30 · modals 40.

---

## 5. Workflow for running three agents

1. **Merge Phase 0 to `main`.** Verify: `npm install && npm run build && npm test`.
2. Create three branches: `track-a`, `track-b`, `track-c`.
3. Give each agent: this file + its own track spec + the repo.
4. Each agent works only in its folder, opens a PR.
5. Merges are independent and conflict-free (different folders + frozen
   contracts). Merge order does not matter.
6. After all three merge, run the **integration checklist** in §6.

---

## 6. MVP definition of done

The MVP is complete when, on `main`:

- [ ] `npm run build` and `npm test` pass.
- [ ] You can add/edit/delete a person and a relationship (Track A).
- [ ] Clicking a node/edge opens a detail panel (Track A).
- [ ] JSON export then re-import reproduces the graph (Track A).
- [ ] CSV import/export works (Track A).
- [ ] Selecting a person and choosing 1/2/3/all degrees dims the rest of the
      graph (Track B).
- [ ] Degrees-of-separation between two people highlights the shortest path
      and shows a textual explanation (Track B).
- [ ] Category filters, label toggle, hide-weak, and search all visibly affect
      the canvas (Track C).
- [ ] Reset view restores the default state (Track C).
- [ ] State survives a page reload (Phase 0 persistence).

---

## 7. Tech stack

React 18 + TypeScript · Vite · Tailwind CSS · React Flow (`@xyflow/react`) ·
Zustand · Vitest. Persistence is `localStorage` behind an async
`RelationshipStore` interface — swapping to Supabase later means writing one
new class (see `phase-0-foundation.md` §6).
