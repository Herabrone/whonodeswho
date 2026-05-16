# Track C — Filtering & Search

> **Agent brief.** Build the filtering panel, people search, and reset view.
> Work **only** inside `src/features/filtering/`. You deliver *controls* — the
> canvas restyles itself when you set store fields. Read `00-architecture.md`
> and `phase-0-foundation.md` first.

## 1. Mission

Keep the graph readable as it grows: filter by relationship category, toggle
edge labels, hide weak ties, search for people, and reset the view.

## 2. Boundaries

**You own:** everything under `src/features/filtering/`. Replace
`src/features/filtering/index.tsx`; add other files in this folder.

**Do not touch:** `src/types.ts`, `src/constants.ts`, `src/store/**`,
`src/graph/**`, `src/lib/**`, `src/App.tsx`, `src/components/AppShell.tsx`, or
the other tracks' folders. **Do not edit the canvas** — it already reacts to
the view store fields.

**Exported entry point:** `src/features/filtering/index.tsx` must keep
exporting a component named `FilteringFeature`. Signature: `() => JSX`.

## 3. Reserved UI region

- **Top-left** (`absolute left-4 top-4 z-20`): search bar + a "Filters" toggle
  button + reset button.
- **Left drawer** (`absolute left-0 top-0 h-full z-30`, width ~280px): the
  filter panel, opened by the toggle.

## 4. Contracts you consume

From `useGraphStore`:

```ts
// view — you WRITE these; the canvas reads them
visibleCategories: RelationshipCategory[]
showLabels: boolean
hideWeak: boolean
searchQuery: string
toggleCategory(category: RelationshipCategory): void
setVisibleCategories(categories: RelationshipCategory[]): void
setShowLabels(value: boolean): void
setHideWeak(value: boolean): void
setSearchQuery(query: string): void
resetView(): void                       // restores view defaults + clears focus/path
// reads / optional
people: Person[]
selectPerson(id: string | null): void   // for search-result click-through
```

From `src/constants.ts`: `CATEGORIES`, `CATEGORY_LABELS`, `CATEGORY_COLORS`,
`WEAK_RELATIONSHIP_TYPES`.

From `src/types.ts`: `Person`, `RelationshipCategory`.

> The canvas already removes edges whose category is not in
> `visibleCategories`, hides edges whose `type` is in `WEAK_RELATIONSHIP_TYPES`
> when `hideWeak` is true, shows/hides labels per `showLabels`, and rings
> nodes whose name matches `searchQuery`. Your job is purely the controls.

## 5. Tasks

### C1 — Top-left bar
A compact bar containing:
- a **search input** (placeholder "Search people…") bound to `searchQuery` →
  `setSearchQuery(value)`; include a clear (×) button → `setSearchQuery("")`.
- a **Filters** toggle button (shows a count badge of how many categories are
  hidden, if any) → opens/closes the left drawer.
- a **Reset** button → `resetView()`.

### C2 — Search results dropdown
While `searchQuery` is non-empty, show a dropdown under the input listing
people whose `name` includes the query (case-insensitive). Clicking a result
calls `selectPerson(id)` (which opens Track A's detail panel) and may clear the
query. Keep it lightweight — names only. Show an empty state ("No matches").

### C3 — Filter drawer
Left drawer with three groups:

1. **Relationship categories** — one row per `CATEGORIES` entry: a checkbox +
   the `CATEGORY_LABELS` text + a color dot (`CATEGORY_COLORS`). Checked =
   present in `visibleCategories`. Toggling a row → `toggleCategory(category)`.
   Provide "Select all" / "Select none" shortcuts (use
   `setVisibleCategories`).
2. **Display** — a "Show relationship labels" switch bound to `showLabels` →
   `setShowLabels`.
3. **Weak ties** — a "Hide acquaintances & weak ties" switch bound to
   `hideWeak` → `setHideWeak`. Caption the affected types from
   `WEAK_RELATIONSHIP_TYPES`.

Include a close (×) on the drawer.

### C4 — Empty / clutter states
- When all categories are unchecked, the canvas shows nodes with no edges —
  that is expected; optionally show a hint in the drawer.
- The Reset button must visibly restore: all categories on, labels on,
  hide-weak off, search cleared (`resetView` does all of this plus clearing
  Track B's focus/path — that is intentional).

## 6. Tests (Vitest)

If you extract pure helpers (e.g. a `filterPeopleByQuery(people, query)` used
by the search dropdown), unit-test them in
`src/features/filtering/lib/*.test.ts`:
- `filterPeopleByQuery` is case-insensitive and matches substrings.
- empty query returns an empty result (dropdown hidden) — or document your
  chosen behavior.

## 7. Acceptance criteria

- [ ] Unchecking a category removes those edges from the canvas; re-checking
      restores them.
- [ ] "Show labels" toggles edge labels on the canvas.
- [ ] "Hide weak ties" removes acquaintance/neighbour edges.
- [ ] Typing in search rings matching nodes on the canvas; the results
      dropdown lists matches and clicking one selects that person.
- [ ] Reset restores all view defaults and clears the search.
- [ ] `npm run build`, `npm run typecheck`, `npm test` all pass.
- [ ] No file outside `src/features/filtering/` is modified.

## 8. Definition of done

All acceptance criteria met, tests added and green, `FilteringFeature`
exported from `src/features/filtering/index.tsx`, PR opened against `main`.
