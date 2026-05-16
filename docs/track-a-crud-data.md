# Track A — CRUD & Data Management

> **Agent brief.** Build all create/edit/delete UI for people and
> relationships, the detail panels, and JSON + CSV import/export. Work **only**
> inside `src/features/crud/`. Integrate **only** through the store. Read
> `00-architecture.md` and `phase-0-foundation.md` first.

## 1. Mission

Make the seeded graph fully editable and portable. By the end, a user can build
a real relationship graph by hand and save/share it as a file.

## 2. Boundaries

**You own:** everything under `src/features/crud/`. Replace
`src/features/crud/index.tsx`; add any other files in this folder (suggested:
`components/`, `lib/`).

**Do not touch:** `src/types.ts`, `src/constants.ts`, `src/store/**`,
`src/graph/**`, `src/lib/**`, `src/App.tsx`, `src/components/AppShell.tsx`, or
the other tracks' folders.

**Exported entry point:** `src/features/crud/index.tsx` must keep exporting a
component named `CrudFeature` (App.tsx imports it). Signature: `() => JSX`.

## 3. Reserved UI region

- **Top-right** (`absolute right-4 top-4 z-20`): action button cluster.
- **Right drawer** (`absolute right-0 top-0 h-full z-30`, width ~340px):
  detail panels.
- **Centered modals** (`z-40`, dimmed backdrop): create/edit forms, import/export.

Do not render outside these regions (top-left, left drawer, bottom-center
belong to Tracks C and B).

## 4. Contracts you consume

From `useGraphStore` (`src/store/useGraphStore.ts`):

```ts
// data
addPerson(input: PersonInput): Person
updatePerson(id, patch: Partial<PersonInput>): void
deletePerson(id): void                       // cascades to relationships
addRelationship(input: RelationshipInput): Relationship
updateRelationship(id, patch: Partial<RelationshipInput>): void
deleteRelationship(id): void
replaceGraph(graph: GraphData): void          // for import
// selection (read to drive detail panels)
selectedPersonId: string | null
selectedRelationshipId: string | null
selectPerson(id | null): void
selectRelationship(id | null): void
clearSelection(): void
// data reads
people: Person[]
relationships: Relationship[]
```

Selectors: `selectPersonById`, `selectRelationshipById`,
`selectRelationshipsOf` (all from `useGraphStore.ts`).

From `src/constants.ts`: `CATEGORIES`, `CATEGORY_LABELS`, `CATEGORY_COLORS`,
`RELATIONSHIP_CATALOG`.

From `src/types.ts`: `Person`, `Relationship`, `PersonInput`,
`RelationshipInput`, `GraphData`, `RelationshipCategory`,
`RelationshipDirection`.

## 5. Tasks

### A1 — Action button cluster
Top-right cluster with three buttons: **+ Person**, **+ Relationship**,
**Import / Export**. Each opens the relevant modal. Manage modal open state
with local React state inside `CrudFeature` (no store changes).

### A2 — Person form modal (create + edit)
Fields: `name` (required, non-empty), `notes` (optional textarea), `color`
(optional — a small swatch picker; allow "none"). On submit:
- create → `addPerson({ name, notes, color })`
- edit → `updatePerson(id, patch)`

Validation: trim name; block submit if empty. Reuse one component for both
modes via a `person?: Person` prop.

### A3 — Relationship form modal (create + edit)
Fields:
- `source` — person `<select>` (list `people` by name)
- `target` — person `<select>`; must differ from source
- `category` — `<select>` over `CATEGORIES` (show `CATEGORY_LABELS`)
- `type` — `<select>` seeded from `RELATIONSHIP_CATALOG[category]` **plus** a
  free-text option ("Custom…") that reveals a text input
- `direction` — toggle: `two-way` / `one-way`
- `color` — optional override (default shows the category color)
- `notes` — optional
On submit: `addRelationship(input)` or `updateRelationship(id, patch)`.
Validation: source ≠ target, both set, type non-empty.

### A4 — Person detail panel (right drawer)
Renders when `selectedPersonId !== null`. Use
`selectPersonById(selectedPersonId)` and
`selectRelationshipsOf(selectedPersonId)`. Show:
- name, notes
- "Direct relationships": for each touching relationship, the **other**
  person's name + the relationship `type` + a category color dot; clicking a
  row calls `selectRelationship(r.id)`
- **Edit** button → opens A2 in edit mode
- **Delete** button → confirmation (A6) → `deletePerson(id)` then
  `clearSelection()`
- close button → `clearSelection()`

### A5 — Relationship detail panel (right drawer)
Renders when `selectedRelationshipId !== null`. Show:
- `sourceName → targetName` (use the arrow for `one-way`, `↔` for `two-way`)
- `type`, `category` (with color), `direction`, `notes`
- **Edit** → A3 edit mode · **Delete** → A6 → `deleteRelationship(id)` →
  `clearSelection()`
- close → `clearSelection()`

Only one drawer shows at a time (selection actions are mutually exclusive — see
the store).

### A6 — Delete confirmation
Small confirm dialog before any delete. For a person, warn that its
relationships will also be removed (the store cascades).

### A7 — JSON import / export
In the Import/Export modal:
- **Export JSON** — serialize `{ people, relationships }` (a `GraphData`) and
  trigger a download (`relationflow-export.json`).
- **Import JSON** — file `<input type="file">`, parse, **validate shape**
  (arrays present, required fields), then `replaceGraph(parsed)`. On invalid
  input show an inline error; never call `replaceGraph` with bad data.

### A8 — CSV import / export
CSV columns (header row required):

```
source,target,type,category,direction,notes
Alice,Bob,sibling,family,two-way,grew up together
Alice,John,parent,family,one-way,
```

- CSV uses **person names** (not ids) for `source`/`target`.
- **Export CSV** — one row per relationship; resolve ids → names.
- **Import CSV** — parse rows; for each unique name not already present, create
  a `Person`; then create relationships. Build the resulting `GraphData` and
  call `replaceGraph`. Validate `category` ∈ `CATEGORIES` and `direction` ∈
  `{one-way,two-way}`; collect row errors and show a summary; import only if
  there are no fatal errors (decide and document your rule).
- Put CSV/JSON parsing + serialization in `src/features/crud/lib/` as **pure
  functions** so they are unit-testable without React.

## 6. Tests (Vitest)

Add `src/features/crud/lib/*.test.ts`:
- JSON round-trip: `serialize` then `parse` yields an equal graph.
- JSON import rejects malformed input (missing arrays, missing fields).
- CSV round-trip: export then import reproduces the relationships.
- CSV import creates one Person per unique name and flags bad
  category/direction values.

## 7. Acceptance criteria

- [ ] Can create, edit, and delete a person; deleting cascades to its edges.
- [ ] Can create, edit, and delete a relationship; source ≠ target enforced.
- [ ] Clicking a node opens the person panel; clicking an edge opens the
      relationship panel; clicking empty canvas closes the panel.
- [ ] JSON export downloads a file; importing it restores the same graph.
- [ ] CSV export/import works with the documented format.
- [ ] Malformed JSON/CSV shows an error and does not corrupt the graph.
- [ ] `npm run build`, `npm run typecheck`, `npm test` all pass.
- [ ] No file outside `src/features/crud/` is modified.

## 8. Definition of done

All acceptance criteria met, tests added and green, `CrudFeature` exported from
`src/features/crud/index.tsx`, PR opened against `main`.
