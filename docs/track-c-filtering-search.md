# Track C — Filtering & Search

**Owner:** `apps/web/src/features/filtering/`

Track C adds category filters, a search bar, and a reset-view control.

## Integration contract

Track C must only:
- Read state from `useGraphStore` selectors.
- Call store actions from the **View actions** section of
  `docs/phase-0-foundation.md`.
- Render inside the overlay slot provided by `AppShell`.
- Write files only under `src/features/filtering/`.

## Feature scope

### Category filters
- [ ] Toggle buttons or checkboxes for each `RelationshipCategory`
- [ ] Color indicators using `CATEGORY_COLORS` from `apps/web/src/constants.ts`
- [ ] "All / None" bulk toggle

### Search
- [ ] Text input that filters visible people by name (substring, case-insensitive)
- [ ] Clear button

### Weak-relationship toggle
- [ ] Checkbox to hide relationships whose `type` is in `WEAK_RELATIONSHIP_TYPES`

### Reset view
- [ ] Button to restore all filters to defaults (`resetView`)

## Store actions to use

```ts
setVisibleCategories(categories: RelationshipCategory[]): void
toggleCategory(category: RelationshipCategory): void
setShowLabels(value: boolean): void
setHideWeak(value: boolean): void
setSearchQuery(query: string): void
resetView(): void
```

## State selectors

```ts
const visibleCategories = useGraphStore(s => s.visibleCategories);
const searchQuery       = useGraphStore(s => s.searchQuery);
const hideWeak          = useGraphStore(s => s.hideWeak);
const showLabels        = useGraphStore(s => s.showLabels);
```

## Constants

```ts
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS, WEAK_RELATIONSHIP_TYPES }
  from '../../constants';
```
