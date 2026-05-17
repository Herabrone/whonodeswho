import { useEffect, useMemo, useState } from "react";
import type {
  Person,
  RelationshipCategory,
  RelationshipDirection,
} from "../../types";
import type { ProposalConfidence } from "./useAutoRelationships";
import { CATEGORIES } from "../../constants";

export interface ProposalItem {
  source: string;
  target: string;
  category: RelationshipCategory;
  type: string;
  direction: RelationshipDirection;
  notes?: string;
  rule?: string;
  reason?: string;
  confidence?: ProposalConfidence;
  checked?: boolean;
}

interface Props {
  open: boolean;
  primary: ProposalItem;
  proposals: ProposalItem[];
  people: Person[];
  onCancel: () => void;
  onAddAll: (selected: ProposalItem[], declined: ProposalItem[]) => void;
  onAddPrimaryOnly: (declined: ProposalItem[]) => void;
  onUpdateProposal?: (p: ProposalItem) => void;
}

function nameFor(id: string, people: Person[]) {
  return people.find((p) => p.id === id)?.name ?? id;
}

export function ConfirmRelationshipsDialog({
  open,
  primary,
  proposals,
  people,
  onCancel,
  onAddAll,
  onAddPrimaryOnly,
}: Props) {
  const [local, setLocal] = useState<ProposalItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    // Only High-confidence proposals are preselected; Medium and Low start unchecked.
    setLocal(proposals.map((p) => ({ ...p, checked: p.confidence === "High" || p.confidence === undefined })));
  }, [proposals]);

  const toggleChecked = (i: number) => {
    setLocal((prev) => prev.map((p, idx) => (idx === i ? { ...p, checked: !p.checked } : p)));
  };

  const applyEdit = (i: number, updated: Partial<ProposalItem>) => {
    setLocal((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...updated } : p)));
  };

  const selected = useMemo(() => local.filter((p) => p.checked), [local]);
  const declined = useMemo(() => local.filter((p) => !p.checked), [local]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-[720px] max-w-full rounded-xl border border-line bg-panel p-4 shadow-xl">
        <h3 className="mb-1 text-lg font-semibold text-ink">Review Heuristic Suggestions</h3>
        <p className="mb-3 text-sm text-muted">Uncheck any suggestion you want to decline for the rest of this session.</p>

        <div className="mb-3">
          <div className="mb-1 text-sm text-muted">Primary relationship</div>
          <div className="rounded border border-line bg-canvas p-3">
            <strong>{nameFor(primary.source, people)}</strong>
            <span className="mx-2">→</span>
            <strong>{nameFor(primary.target, people)}</strong>
            <span className="ml-3 rounded bg-panel px-2 py-1 text-xs">{primary.type}</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-sm text-muted">Heuristic suggestions</div>
          {local.length === 0 ? (
            <div className="text-xs text-muted">No proposals — confirm primary relationship below.</div>
          ) : (
            <ul className="space-y-2">
              {local.map((p, i) => (
                <li key={`${p.source}-${p.target}-${p.type}-${i}`} className="flex items-start gap-3">
                  <input type="checkbox" checked={!!p.checked} onChange={() => toggleChecked(i)} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm">
                        <strong>{nameFor(p.source, people)}</strong>
                        <span className="mx-2">→</span>
                        <strong>{nameFor(p.target, people)}</strong>
                      </div>
                      <div className="ml-2 rounded bg-panel px-2 py-1 text-xs">{p.type}</div>
                      {p.confidence && (
                        <div
                          className={[
                            "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            p.confidence === "High"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : p.confidence === "Medium"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                          ].join(" ")}
                        >
                          {p.confidence}
                        </div>
                      )}
                      <button
                        onClick={() => setEditingIndex(i)}
                        className="ml-auto text-xs text-muted hover:text-ink"
                        aria-label="Edit proposal"
                      >
                        ✎
                      </button>
                    </div>
                    {(p.rule || p.reason) ? (
                      <div className="mt-1 text-xs text-muted">
                        {p.rule ?? "Heuristic rule"}
                        {p.reason ? `: ${p.reason}` : ""}
                      </div>
                    ) : null}
                    {editingIndex === i ? (
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
                        <select
                          value={p.category}
                          onChange={(e) => applyEdit(i, { category: e.target.value as RelationshipCategory })}
                          className="rounded border border-line bg-canvas px-2 py-1 text-sm"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <input
                          value={p.type}
                          onChange={(e) => applyEdit(i, { type: e.target.value })}
                          className="rounded border border-line bg-canvas px-2 py-1 text-sm"
                        />
                        <select
                          value={p.direction}
                          onChange={(e) => applyEdit(i, { direction: e.target.value as RelationshipDirection })}
                          className="rounded border border-line bg-canvas px-2 py-1 text-sm"
                        >
                          <option value="two-way">two-way</option>
                          <option value="one-way">one-way</option>
                        </select>
                        <input
                          value={p.notes ?? ""}
                          placeholder="Notes"
                          onChange={(e) => applyEdit(i, { notes: e.target.value })}
                          className="rounded border border-line bg-canvas px-2 py-1 text-sm"
                        />
                        <div className="sm:col-span-4 flex justify-end gap-2">
                          <button onClick={() => setEditingIndex(null)} className="rounded border border-line px-2 py-1 text-xs">Done</button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink">Cancel</button>
          <button
            onClick={() => onAddPrimaryOnly(declined)}
            className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink"
          >
            Add Primary Only
          </button>
          <button
            onClick={() => onAddAll(selected, declined)}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white"
          >
            Add All
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmRelationshipsDialog;
