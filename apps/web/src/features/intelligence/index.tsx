import { useMemo, useState } from "react";
import { buildAdjacency, findShortestPath, getNodesWithinDegrees } from "../../lib/graph";
import { useGraphStore } from "../../store/useGraphStore";
import type { FocusDegrees } from "../../types";

export function IntelligenceFeature() {
  const [pathModalOpen, setPathModalOpen] = useState(false);
  const [personAId, setPersonAId] = useState("");
  const [personBId, setPersonBId] = useState("");
  const [pathMessage, setPathMessage] = useState("");

  const people = useGraphStore((s) => s.people);
  const relationships = useGraphStore((s) => s.relationships);
  const focusPersonId = useGraphStore((s) => s.focusPersonId);
  const focusDegrees = useGraphStore((s) => s.focusDegrees);
  const pathPersonIds = useGraphStore((s) => s.pathPersonIds);

  const setFocus = useGraphStore((s) => s.setFocus);
  const setFocusDegrees = useGraphStore((s) => s.setFocusDegrees);
  const clearFocus = useGraphStore((s) => s.clearFocus);
  const setPath = useGraphStore((s) => s.setPath);
  const clearPath = useGraphStore((s) => s.clearPath);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const adjacency = useMemo(
    () => buildAdjacency({ people, relationships }),
    [people, relationships],
  );

  const focusCount = useMemo(() => {
    if (!focusPersonId) return 0;
    return getNodesWithinDegrees(adjacency, focusPersonId, focusDegrees).size;
  }, [adjacency, focusDegrees, focusPersonId]);

  const focusedPersonName = focusPersonId ? byId.get(focusPersonId)?.name ?? "Unknown" : null;

  const hopDescriptions = useMemo(() => {
    if (pathPersonIds.length < 2) return [] as string[];
    const hops: string[] = [];
    for (let i = 0; i < pathPersonIds.length - 1; i++) {
      const a = pathPersonIds[i];
      const b = pathPersonIds[i + 1];
      const relation = relationships.find(
        (r) =>
          (r.source === a && r.target === b) ||
          (r.source === b && r.target === a),
      );
      const from = byId.get(a)?.name ?? "Unknown";
      const to = byId.get(b)?.name ?? "Unknown";
      const capitalize = (t: string | undefined) =>
        !t || t.length === 0
          ? t ?? t
          : t
              .split(" ")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ");

      const label = capitalize(relation?.type ?? "connected");
      hops.push(`${from} -${label}-> ${to}`);
    }
    return hops;
  }, [byId, pathPersonIds, relationships]);

  const pathChain = pathPersonIds
    .map((id) => byId.get(id)?.name ?? "Unknown")
    .join(" -> ");

  const applyDegrees = (degrees: FocusDegrees) => {
    setFocusDegrees(degrees);
    if (focusPersonId) setFocus(focusPersonId, degrees);
  };

  const runPathSearch = () => {
    if (!personAId || !personBId || personAId === personBId) {
      setPathMessage("Choose two different people.");
      clearPath();
      return;
    }
    const path = findShortestPath(adjacency, personAId, personBId);
    if (!path) {
      setPathMessage("No connection found between the selected people.");
      clearPath();
      return;
    }
    setPath(path);
    setPathMessage(`Path found with ${path.length - 1} degree(s) of separation.`);
    setPathModalOpen(false);
  };

  return (
    <>
      <div className="pointer-events-none absolute bottom-4 left-4 z-20 w-[480px] max-w-[calc(100vw-2rem)]">
        <div className="pointer-events-auto rounded-xl border border-line bg-panel/95 p-2 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <select
              value={focusPersonId ?? ""}
              onChange={(e) => {
                const nextId = e.target.value;
                if (!nextId) {
                  clearFocus();
                  return;
                }
                setFocus(nextId, focusDegrees);
              }}
              className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
            >
              <option value="">Focus off</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>

              {focusPersonId ? (
                <button
                  aria-label="Clear focus"
                  onClick={() => clearFocus()}
                  className="rounded-full border border-line bg-canvas px-2 py-1 text-xs text-muted hover:bg-panel"
                >
                  x
                </button>
              ) : null}
            </div>

            {focusPersonId ? (
              <div className="flex items-center rounded-lg border border-line bg-canvas p-1 text-xs">
                {([
                  { label: "Direct", value: 1 as FocusDegrees },
                  { label: "2", value: 2 as FocusDegrees },
                  { label: "3", value: 3 as FocusDegrees },
                  { label: "All", value: "all" as FocusDegrees },
                ]).map((item) => (
                  <button
                    key={String(item.value)}
                    type="button"
                    onClick={() => applyDegrees(item.value)}
                    className={`rounded px-2 py-1 ${
                      focusDegrees === item.value ? "bg-accent text-white" : "text-ink hover:bg-panel"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}

            {/* Clear focus button removed; use inline X next to focused person */}

            <button
              type="button"
              onClick={() => setPathModalOpen(true)}
              className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink hover:bg-panel"
            >
              Degrees between people
            </button>

            {/* Clear path button removed from the bottom bar; use the Clear inside the path panel */}
          </div>

          <div className="mt-2 text-xs text-muted">
            {focusPersonId && focusedPersonName
              ? `Showing ${focusedPersonName} + ${Math.max(focusCount - 1, 0)} people within ${String(focusDegrees)} degree(s).`
              : "Focus mode is off."}
          </div>
          {pathMessage && <div className="mt-1 text-xs text-muted">{pathMessage}</div>}
        </div>
      </div>

      {pathPersonIds.length > 0 && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 z-20 w-[520px] max-w-[calc(100vw-2rem)] -translate-x-1/2">
          <div className="pointer-events-auto rounded-xl border border-line bg-panel/95 p-2 shadow-lg">
            <h4 className="mb-1 text-sm font-semibold text-ink">Shortest path</h4>
            <p className="mb-1 text-sm text-ink">{pathChain}</p>
            <p className="mb-2 text-xs text-muted">
              {Math.max(pathPersonIds.length - 1, 0)} degree(s) of separation
            </p>
            <ul className="mb-2 list-disc space-y-1 pl-4 text-xs text-muted">
              {hopDescriptions.map((hop) => (
                <li key={hop}>{hop}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                clearPath();
                setPathMessage("");
              }}
              className="rounded-lg border border-line bg-canvas px-2 py-1 text-xs text-ink hover:bg-panel"
            >
              Clear path
            </button>
          </div>
        </div>
      )}

      {pathModalOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
          <div className="w-[460px] max-w-full rounded-xl border border-line bg-panel p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg text-ink">Find degrees of separation</h3>
              <button
                type="button"
                onClick={() => setPathModalOpen(false)}
                className="rounded border border-line px-2 py-1 text-xs text-muted hover:bg-canvas"
              >
                x
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm text-ink">
                Person A
                <select
                  value={personAId}
                  onChange={(e) => setPersonAId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm"
                >
                  <option value="">Select person</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-ink">
                Person B
                <select
                  value={personBId}
                  onChange={(e) => setPersonBId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm"
                >
                  <option value="">Select person</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPathModalOpen(false)}
                className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runPathSearch}
                className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white"
              >
                Find path
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
