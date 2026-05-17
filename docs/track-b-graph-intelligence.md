# Track B — Graph Intelligence

**Owner:** `apps/web/src/features/intelligence/`

Track B adds focus mode (highlight a person's network up to N degrees) and
shortest-path finding between two people.

## Integration contract

Track B must only:
- Read state from `useGraphStore` selectors.
- Call store actions from the **Focus actions** section of
  `docs/phase-0-foundation.md`.
- Use graph algorithm helpers from `apps/web/src/lib/graph.ts`.
- Render inside the overlay slot provided by `AppShell`.
- Write files only under `src/features/intelligence/`.

## Feature scope

### Focus mode
- [ ] Select a focus person — dim all nodes/edges outside their N-degree network
- [ ] Degree selector (1 / 2 / 3 / all)
- [ ] Clear focus

### Path finder
- [ ] Select two people — highlight the shortest path between them
- [ ] Show path length and ordered node names
- [ ] Clear path

## Store actions to use

```ts
setFocus(personId: string | null, degrees?: FocusDegrees): void
setFocusDegrees(degrees: FocusDegrees): void
clearFocus(): void
setPath(personIds: string[]): void
clearPath(): void
```

## Graph helpers

```ts
import { getNeighbours, getShortestPath, getConnectedIds } from '../../lib/graph';
```

All helpers are pure functions; call them in event handlers or `useMemo`, not
in render.

## Types

```ts
type FocusDegrees = 1 | 2 | 3 | 'all';
```

Imported from `@relationflow/contracts` (or `../../types`).
