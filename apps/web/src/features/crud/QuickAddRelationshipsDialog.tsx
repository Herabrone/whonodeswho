import { useEffect, useMemo, useState } from "react";
import type { Person, RelationshipInput } from "../../types";
import { CATEGORIES, RELATIONSHIP_CATALOG } from "../../constants";
import { useGraphStore } from "../../store/useGraphStore";
import useAutoRelationships from "./useAutoRelationships";
import { capitalizeWords } from "../../lib/string";

interface PerPersonConfig {
  category: typeof CATEGORIES[number];
  typeChoice: string;
  customType: string;
  direction: "one-way" | "two-way";
  notes: string;
  color: string;
}

interface Props {
  open: boolean;
  person: Person;
  onClose: () => void;
}

function resolveInitialType(category: typeof CATEGORIES[number]) {
  const list = RELATIONSHIP_CATALOG[category] ?? [];
  return list[0] ?? "";
}

export default function QuickAddRelationshipsDialog({ open, person, onClose }: Props) {
  const people = useGraphStore((s) => s.people);
  const relationships = useGraphStore((s) => s.relationships);
  const addRelationship = useGraphStore((s) => s.addRelationship);
  const selectPerson = useGraphStore((s) => s.selectPerson);

  const candidates = useMemo(() => people.filter((p) => p.id !== person.id), [people, person.id]);

  const [search, setSearch] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [perPerson, setPerPerson] = useState<Record<string, PerPersonConfig>>({});

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSearch("");
      setSelectedIds([]);
      setPerPerson({});
    }
  }, [open]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q === "" ? candidates : candidates.filter((c) => c.name.toLowerCase().includes(q));
  }, [candidates, search]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  
  function prefillPerPerson(ids: string[]) {
    const next: Record<string, PerPersonConfig> = {};
    for (const otherId of ids) {
      // Try heuristic proposals using a sensible default trigger ('friend')
      const proposals = useAutoRelationships("friend", person.id, otherId, "friend", people, relationships);
      const best = proposals[0];
      if (best) {
        next[otherId] = {
          category: best.category,
          typeChoice: best.type,
          customType: "",
          direction: best.direction,
          notes: best.notes ?? "",
          color: "",
        };
      } else {
        next[otherId] = {
          category: "friend",
          typeChoice: resolveInitialType("friend"),
          customType: "",
          direction: "two-way",
          notes: "",
          color: "",
        };
      }
    }
    setPerPerson(next);
  }

  function updatePerPerson(id: string, patch: Partial<PerPersonConfig>) {
    setPerPerson((prev) => ({ ...prev, [id]: { ...(prev[id] as PerPersonConfig), ...patch } }));
  }

  function handleNext() {
    if (selectedIds.length === 0) return;
    prefillPerPerson(selectedIds);
    setStep(2);
  }

  function handleBack() {
    setStep(1);
  }

  function handleSave() {
    for (const otherId of selectedIds) {
      const cfg = perPerson[otherId];
      if (!cfg) continue;
      const resolvedType = cfg.typeChoice === "__custom__" ? cfg.customType.trim() : cfg.typeChoice;
      if (!resolvedType) continue;
      const payload = {
        source: person.id,
        target: otherId,
        category: cfg.category,
        type: resolvedType,
        direction: cfg.direction,
        startYear: undefined,
        startMonth: undefined,
        color: cfg.color || undefined,
        notes: cfg.notes?.trim() || undefined,
      } as RelationshipInput;
      addRelationship(payload as RelationshipInput);
    }
    // keep new person selected
    selectPerson(person.id);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-[760px] max-w-full rounded-xl border border-rf-border bg-rf-surface p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg text-rf-text">Quick Add Relationships</h3>
          <button onClick={onClose} className="rounded border border-rf-border px-2 py-1 text-xs text-rf-muted hover:bg-rf-base">x</button>
        </div>

        {step === 1 ? (
          <div>
            <p className="mb-3 text-sm text-rf-muted">Select existing people to connect with {capitalizeWords(person.name)}.</p>
            <div className="mb-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people..."
                className="w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text"
              />
            </div>
            <div className="mb-3">
              <div className="text-sm text-rf-muted">{selectedIds.length} selected</div>
            </div>

            <ul className="max-h-64 overflow-auto space-y-2 rounded border border-rf-border bg-rf-subtle p-2">
              {matches.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                  <div className="flex-1 text-sm text-rf-text">{capitalizeWords(p.name)}</div>
                </li>
              ))}
              {matches.length === 0 && <li className="px-2 py-2 text-xs text-rf-muted">No matches</li>}
            </ul>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text">Cancel</button>
              <button
                onClick={handleNext}
                disabled={selectedIds.length === 0}
                className="rounded-lg bg-rf-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-sm text-rf-muted">Configure relationship details for each selected person.</p>

            <div className="mb-3 space-y-2 max-h-64 overflow-auto">
              {selectedIds.map((id) => {
                const other = people.find((p) => p.id === id)!;
                const cfg = perPerson[id];
                if (!cfg) return (
                  <div key={id} className="rounded border border-rf-border bg-rf-subtle p-2">Loading…</div>
                );
                return (
                  <div key={id} className="rounded border border-rf-border bg-rf-subtle p-3">
                    <div className="mb-2 flex items-center gap-3">
                      <strong className="text-sm">{capitalizeWords(other.name)}</strong>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <label className="text-sm text-rf-text">
                        Category
                        <select value={cfg.category} onChange={(e) => updatePerPerson(id, { category: e.target.value as any, typeChoice: resolveInitialType(e.target.value as any), customType: "", direction: "two-way" })} className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-2 py-1 text-sm">
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </label>

                      <label className="text-sm text-rf-text">
                        Type
                        <select value={cfg.typeChoice} onChange={(e) => updatePerPerson(id, { typeChoice: e.target.value })} className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-2 py-1 text-sm">
                          {(RELATIONSHIP_CATALOG[cfg.category] || []).map((t) => <option key={t} value={t}>{t}</option>)}
                          <option value="__custom__">Custom...</option>
                        </select>
                      </label>

                      <div className="text-sm text-rf-text">
                        Direction
                        <div className="mt-1 flex items-center gap-2">
                          <button type="button" onClick={() => updatePerPerson(id, { direction: "two-way" })} className={`rounded px-3 py-1 text-xs ${cfg.direction === "two-way" ? "bg-rf-accent text-white" : "text-rf-text"}`}>two-way</button>
                          <button type="button" onClick={() => updatePerPerson(id, { direction: "one-way" })} className={`rounded px-3 py-1 text-xs ${cfg.direction === "one-way" ? "bg-rf-accent text-white" : "text-rf-text"}`}>one-way</button>
                        </div>
                      </div>

                      {cfg.typeChoice === "__custom__" && (
                        <label className="sm:col-span-3 text-sm text-rf-text">Custom type<input value={cfg.customType} onChange={(e) => updatePerPerson(id, { customType: e.target.value })} className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-2 py-1 text-sm" /></label>
                      )}

                      <label className="sm:col-span-3 text-sm text-rf-text">Notes<input value={cfg.notes} onChange={(e) => updatePerPerson(id, { notes: e.target.value })} className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-2 py-1 text-sm" /></label>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={handleBack} className="rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text">Back</button>
              <button onClick={onClose} className="rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text">Cancel</button>
              <button onClick={handleSave} className="rounded-lg bg-rf-accent px-3 py-2 text-sm font-medium text-white">Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
