import { useState } from "react";
import { CATEGORIES } from "../constants";
import { useGraphStore } from "../store/useGraphStore";
import type { RelationshipCategory } from "../types";

export function Legend() {
  const [isOpen, setIsOpen] = useState(false);
  const categoryLabels = useGraphStore((s) => s.categoryLabels);
  const relationshipColors = useGraphStore((s) => s.relationshipColors);
  const relationshipCatalog = useGraphStore((s) => s.relationshipCatalog);
  const updateCategoryLabel = useGraphStore((s) => s.updateCategoryLabel);
  const updateCategoryColor = useGraphStore((s) => s.updateCategoryColor);
  const addRelationshipType = useGraphStore((s) => s.addRelationshipType);
  const removeRelationshipType = useGraphStore((s) => s.removeRelationshipType);

  const [editingCategory, setEditingCategory] = useState<RelationshipCategory | null>(null);
  const [newType, setNewType] = useState("");

  return (
    <div className="pointer-events-none absolute bottom-28 left-0 z-20 flex items-end">
      {isOpen && (
        <div className="pointer-events-auto w-72 rounded-r-xl border border-l-0 border-line bg-panel/95 p-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-ink">Legend & Groupings</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-accent hover:underline"
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
                    className="h-6 w-8 rounded border border-line bg-canvas p-0"
                    aria-label={`Color for ${categoryLabels[cat]}`}
                  />
                  <input
                    className="w-full rounded border-none bg-transparent px-1 text-xs font-medium focus:ring-1 focus:ring-accent"
                    value={categoryLabels[cat]}
                    onChange={(e) => updateCategoryLabel(cat, e.target.value)}
                  />
                  <button
                    onClick={() => setEditingCategory(editingCategory === cat ? null : cat)}
                    className="text-[10px] text-muted hover:text-accent"
                  >
                    {editingCategory === cat ? "done" : "edit types"}
                  </button>
                </div>

                {editingCategory === cat && (
                  <div className="ml-5 space-y-2 border-l border-line py-1 pl-3">
                    <ul className="space-y-1">
                      {relationshipCatalog[cat].map((type) => (
                        <li key={type} className="group flex items-center justify-between text-[11px] text-muted">
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
                        className="w-full rounded border border-line bg-canvas px-1 py-0.5 text-[10px]"
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
                        className="rounded bg-accent px-1.5 text-[10px] text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        className="pointer-events-auto rounded-r-lg border border-l-0 border-line bg-panel px-2 py-3 text-xs font-medium text-ink shadow"
      >
        {isOpen ? "<" : ">"} Legend
      </button>
    </div>
  );
}
