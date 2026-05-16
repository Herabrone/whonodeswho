# Track B — Graph Intelligence

> **Agent brief.** Build Focus Mode and the Degrees-of-Separation finder. Work
> **only** inside `src/features/intelligence/`. You deliver *controls* — the
> canvas restyles itself when you set store fields. Read `00-architecture.md`
> and `phase-0-foundation.md` first.

## 1. Mission

Make the graph *useful*: let the user focus on one person's local network at a
chosen depth, and explain how any two people are connected.

## 2. Boundaries

**You own:** everything under `src/features/intelligence/`. Replace
`src/features/intelligence/index.tsx`; add other files in this folder.

**Do not touch:** `src/types.ts`, `src/constants.ts`, `src/store/**`,
`src/graph/**`, `src/lib/**`, `src/App.tsx`, `src/components/AppShell.tsx`, or
the other tracks' folders. In particular **do not edit the canvas** — it
already reacts to the focus/path store fields.

**Exported entry point:** `src/features/intelligence/index.tsx` must keep
exporting a component named `IntelligenceFeature`. Signature: `() => JSX`.

## 3. Reserved UI region

- **Bottom-center** (`absolute bottom-4 left-1/2 -translate-x-1/2 z-20`):
  the control bar.
- **Centered modal** (`z-40`): the degrees-of-separation person picker (if you
  use a modal rather than inline dropdowns).

## 4. Contracts you consume

From `useGraphStore`:

```ts
// focus — you WRITE these; the canvas reads them
focusPersonId: string | null
focusDegrees: FocusDegrees                 // 1 | 2 | 3 | "all"
setFocus(personId: string | null, degrees?: FocusDegrees): void
setFocusDegrees(degrees: FocusDegrees): void
clearFocus(): void
// degrees-of-separation path — you WRITE this; the canvas highlights it
pathPersonIds: string[]
setPath(personIds: string[]): void
clearPath(): void
// reads
people: Person[]
relationships: Relationship[]
selectedPersonId: string | null            // optional convenience
```

From `src/lib/graph.ts`:

```ts
buildAdjacency(graph): Adjacency
findShortestPath(adj, startId, targetId): string[] | null
getNodesWithinDegrees(adj, startId, degrees|"all"): Set<string>  // for counts
```

From `src/types.ts`: `Person`, `Relationship`, `FocusDegrees`.

> The canvas already dims everything outside the focus set and highlights the
> path. Your job is purely the controls + the textual explanation.

## 5. Tasks

### B1 — Focus Mode control bar
A bar in the bottom-center region with:
- a **person picker** (`<select>` over `people` by name, plus an "off" option)
  → on change `setFocus(personId, focusDegrees)`; "off" → `clearFocus()`.
- a **degree segmented control**: `Direct (1)` · `2` · `3` · `All` →
  `setFocusDegrees(value)`. Reflect the current `focusDegrees`.
- a small live caption: when a focus is active, show e.g.
  *"Showing Alice + 12 people within 2 degrees."* Compute the count with
  `getNodesWithinDegrees`.
- a **clear** button → `clearFocus()`.
- **Convenience:** a "Focus selected" affordance that reads `selectedPersonId`
  and calls `setFocus(selectedPersonId)` so clicking a node then this button
  focuses it. Optional but recommended.

### B2 — Degrees-of-Separation finder
A control (button in the bar → opens a small panel or modal) that lets the user
pick **Person A** and **Person B**:
- two `<select>`s over `people`, A ≠ B.
- **Find path** button:
  - `const adj = buildAdjacency({ people, relationships })`
  - `const path = findShortestPath(adj, a, b)`
  - if `path` → `setPath(path)`
  - if `null` → show *"No connection found between A and B."* and `clearPath()`.

### B3 — Path explanation
When `pathPersonIds.length > 0`, render an explanation panel:
- A readable chain: `Alice → Sarah → Mike → Daniel`.
- The **degree count**: `path.length - 1` degrees of separation.
- The **relationship label on each hop**: for each consecutive pair, find the
  relationship connecting them and show its `type`, e.g.
  *"Alice —friend→ Sarah —coworker→ Mike —sibling→ Daniel"*.
- A **clear path** button → `clearPath()`.

Handle the trivial cases: A === B (0 degrees), and a direct relationship
(1 degree).

### B4 — Interaction hygiene
- Focus and path can be active at the same time; that is fine (canvas handles
  both). But provide a single visible "clear" affordance for each.
- When the focused person is deleted elsewhere, the store already nulls
  `focusPersonId`/`pathPersonIds` — just make sure your controls read store
  state (don't cache person ids in local state without re-syncing).

## 6. Tests (Vitest)

The core algorithms are already tested in `src/lib/graph.test.ts`. Add tests
for **your orchestration logic** if you extract pure helpers, e.g.
`src/features/intelligence/lib/explainPath.ts`:
- given a graph and a path, `explainPath` returns the ordered list of
  `{ from, to, type }` hops.
- `explainPath` of a 1-person path returns `[]` (0 degrees).

## 7. Acceptance criteria

- [ ] Selecting a person in the focus picker dims everyone outside the focus
      set; changing degrees (1/2/3/all) changes how much is shown.
- [ ] The live caption shows the correct count of people in focus.
- [ ] Clear focus restores the full graph.
- [ ] The degrees-of-separation finder highlights the shortest path on the
      canvas and shows a textual chain with relationship labels and a degree
      count.
- [ ] "No connection found" is shown when two people are unconnected.
- [ ] `npm run build`, `npm run typecheck`, `npm test` all pass.
- [ ] No file outside `src/features/intelligence/` is modified.

## 8. Definition of done

All acceptance criteria met, tests added and green, `IntelligenceFeature`
exported from `src/features/intelligence/index.tsx`, PR opened against `main`.
