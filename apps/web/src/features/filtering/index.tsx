import { useMemo, useState } from "react";
import {
  CATEGORIES,
  WEAK_RELATIONSHIP_TYPES,
} from "../../constants";
import { useGraphStore } from "../../store/useGraphStore";
import { capitalizeWords } from "../../lib/string";

export function FilteringFeature() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const people = useGraphStore((s) => s.people);
  const visibleCategories = useGraphStore((s) => s.visibleCategories);
  const showLabels = useGraphStore((s) => s.showLabels);
  const hideWeak = useGraphStore((s) => s.hideWeak);
  const searchQuery = useGraphStore((s) => s.searchQuery);

  const toggleCategory = useGraphStore((s) => s.toggleCategory);
  const setVisibleCategories = useGraphStore((s) => s.setVisibleCategories);
  const setShowLabels = useGraphStore((s) => s.setShowLabels);
  const setHideWeak = useGraphStore((s) => s.setHideWeak);
  const setSearchQuery = useGraphStore((s) => s.setSearchQuery);
  const resetView = useGraphStore((s) => s.resetView);
  const selectPerson = useGraphStore((s) => s.selectPerson);
  const categoryLabels = useGraphStore((s) => s.categoryLabels);
  const relationshipColors = useGraphStore((s) => s.relationshipColors);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const matches = useMemo(
    () =>
      trimmedQuery.length === 0
        ? people
        : people.filter((p) => p.name.toLowerCase().includes(trimmedQuery)),
    [people, trimmedQuery],
  );

  const hiddenCount = CATEGORIES.length - visibleCategories.length;

  return (
    <>
      <div className="pointer-events-none absolute left-4 top-4 z-20 w-[360px] max-w-[calc(100vw-2rem)]">
        <div className="pointer-events-auto rounded-xl border border-rf-border bg-rf-surface p-2 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchFocused(false);
                  }
                }}
                placeholder="Search people..."
                className="w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text outline-none ring-0 placeholder:text-rf-muted focus:border-rf-accent"
              />
              {(searchQuery || searchFocused) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchFocused(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 text-xs text-rf-muted hover:bg-rf-base"
                >
                  Clear
                </button>
              )}
              {searchFocused && (
                <div className="absolute left-0 top-[calc(100%+0.4rem)] w-full overflow-hidden rounded-lg border border-rf-border bg-rf-surface shadow-xl">
                  {matches.length > 0 ? (
                    <ul className="max-h-56 overflow-auto py-1">
                      {matches.map((person) => (
                        <li key={person.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery(capitalizeWords(person.name));
                              selectPerson(person.id);
                              setSearchFocused(false);
                            }}
                            className="block w-full px-3 py-2 text-left text-sm text-rf-text hover:bg-rf-base"
                          >
                            {capitalizeWords(person.name)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-3 py-3 text-sm text-rf-muted">No matches</div>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen((v) => !v)}
              className="relative rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text hover:bg-rf-base"
            >
              Filters
              {hiddenCount > 0 && (
                <span className="ml-2 rounded-full bg-rf-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {hiddenCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={resetView}
              className="rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text hover:bg-rf-base"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {drawerOpen && (
        <div className="pointer-events-none absolute inset-0 z-30">
          <div className="pointer-events-auto absolute left-0 top-0 h-full w-[290px] max-w-[90vw] border-r border-rf-border bg-rf-surface p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg text-rf-text">Filters</h3>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded border border-rf-border px-2 py-1 text-xs text-rf-muted hover:bg-rf-base"
              >
                x
              </button>
            </div>

            <section className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-rf-text">Relationship Categories</h4>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setVisibleCategories([...CATEGORIES])}
                    className="text-rf-accent hover:underline"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleCategories([])}
                    className="text-rf-accent hover:underline"
                  >
                    Select none
                  </button>
                </div>
              </div>
              <ul className="space-y-2">
                {CATEGORIES.map((category) => {
                  const checked = visibleCategories.includes(category);
                  return (
                    <li key={category}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-rf-base">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategory(category)}
                        />
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: relationshipColors[category] }}
                        />
                        <span className="text-sm text-rf-text">{categoryLabels[category]}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {visibleCategories.length === 0 && (
                <p className="mt-2 text-xs text-rf-muted">
                  No categories selected. Edges are hidden until at least one category is enabled.
                </p>
              )}
            </section>

            <section className="mb-6">
              <h4 className="mb-2 text-sm font-semibold text-rf-text">Display</h4>
              <label className="flex items-center gap-2 text-sm text-rf-text">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                />
                Show relationship labels
              </label>
            </section>

            <section>
              <h4 className="mb-2 text-sm font-semibold text-rf-text">Weak ties</h4>
              <label className="flex items-center gap-2 text-sm text-rf-text">
                <input
                  type="checkbox"
                  checked={hideWeak}
                  onChange={(e) => setHideWeak(e.target.checked)}
                />
                Hide acquaintances and weak ties
              </label>
              <p className="mt-1 text-xs text-rf-muted">
                Affected types: {[...WEAK_RELATIONSHIP_TYPES].join(", ")}
              </p>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
