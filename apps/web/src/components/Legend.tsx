import { useState } from "react";
import { CATEGORIES } from "../constants";
import { useGraphStore } from "../store/useGraphStore";
import type { RelationshipCategory } from "../types";

export function Legend() {
  const [isOpen, setIsOpen] = useState(false);
  const categoryLabels = useGraphStore((s) => s.categoryLabels);
  const relationshipColors = useGraphStore((s) => s.relationshipColors);
  const relationshipCatalog = useGraphStore((s) => s.relationshipCatalog);
  const showLabels = useGraphStore((s) => s.showLabels);
  const setShowLabels = useGraphStore((s) => s.setShowLabels);
  const updateCategoryLabel = useGraphStore((s) => s.updateCategoryLabel);
  const updateCategoryColor = useGraphStore((s) => s.updateCategoryColor);
  const addRelationshipType = useGraphStore((s) => s.addRelationshipType);
  const removeRelationshipType = useGraphStore((s) => s.removeRelationshipType);

  const [editingCategory, setEditingCategory] = useState<RelationshipCategory | null>(null);
  const [newType, setNewType] = useState("");

  return (
    <div className="pointer-events-none absolute bottom-28 left-0 z-20 flex items-end">
      {isOpen && (
        <div className="pointer-events-auto w-72 rounded-r-xl border border-l-0 border-rf-border bg-rf-surface p-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-rf-text">Legend & Groupings</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-rf-accent hover:underline"
            >
              Collapse
            </button>
          </div>

          <div className="max-h-[50vh] space-y-4 overflow-auto pr-1">
            {CATEGORIES.map((cat) => (
              <div key={cat} className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={relationshipColors[cat]}
                    onChange={(e) => updateCategoryColor(cat, e.target.value)}
                    className="h-6 w-8 rounded border border-rf-border bg-rf-subtle p-0"
                    aria-label={`Color for ${categoryLabels[cat]}`}
                  />
                  <input
                    className="w-full rounded border-none bg-transparent px-1 text-xs font-medium text-rf-text focus:ring-1 focus:ring-rf-accent"
                    value={categoryLabels[cat]}
                    onChange={(e) => updateCategoryLabel(cat, e.target.value)}
                  />
                  <button
                    onClick={() => setEditingCategory(editingCategory === cat ? null : cat)}
                    className="text-[10px] text-rf-muted hover:text-rf-accent"
                  >
                    {editingCategory === cat ? "done" : "edit types"}
                  </button>
                </div>

                {editingCategory === cat && (
                  <div className="ml-5 space-y-2 border-l border-rf-border py-1 pl-3">
                    <ul className="space-y-1">
                      {relationshipCatalog[cat].map((type) => (
                        <li key={type} className="group flex items-center justify-between text-[11px] text-rf-muted">
                          <span>{type}</span>
                          <button
                            onClick={() => removeRelationshipType(cat, type)}
                            className="hidden font-bold text-red-500 hover:text-red-700 group-hover:block"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-1">
                      <input
                        placeholder="Add type..."
                        className="w-full rounded border border-rf-border bg-rf-subtle px-1 py-0.5 text-[10px] text-rf-text placeholder:text-rf-muted"
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newType.trim()) {
                            addRelationshipType(cat, newType.trim());
                            setNewType("");
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newType.trim()) {
                            addRelationshipType(cat, newType.trim());
                            setNewType("");
                          }
                        }}
                        className="rounded bg-rf-accent px-1.5 text-[10px] text-white transition-opacity hover:opacity-90"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-rf-border pt-3">
            <label className="flex cursor-pointer items-center justify-between text-xs font-medium text-rf-text">
              <span>Relationship Labels</span>
              <div className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                />
                <div className="peer h-5 w-9 rounded-full bg-rf-subtle after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-rf-accent peer-checked:after:translate-x-full peer-checked:after:border-white focus:outline-none"></div>
              </div>
            </label>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        className="pointer-events-auto rounded-r-lg border border-l-0 border-rf-border bg-rf-surface px-2 py-3 text-xs font-medium text-rf-text shadow"
      >
        {isOpen ? "<" : ">"} Legend
      </button>
    </div>
  );
}
