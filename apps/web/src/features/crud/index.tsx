import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORIES,
  RELATIONSHIP_CATALOG,
} from "../../constants";
import {
  useGraphStore,
} from "../../store/useGraphStore";
import type {
  GraphData,
  Person,
  PersonInput,
  Relationship,
  RelationshipCategory,
  RelationshipDirection,
  RelationshipInput,
} from "../../types";
import {
  OPEN_RELATIONSHIP_COMPOSER_EVENT,
  type OpenRelationshipComposerDetail,
  OPEN_IMPORT_EXPORT_EVENT,
} from "./relationshipComposerEvent";
import { YearMonthPicker } from "../timeline/YearMonthPicker";
import useAutoRelationships, { createRelationshipKey } from "./useAutoRelationships";
import ConfirmRelationshipsDialog, { ProposalItem } from "./ConfirmRelationshipsDialog";
import QuickAddRelationshipsDialog from "./QuickAddRelationshipsDialog";

type ModalState =
  | { type: "none" }
  | { type: "person-create" }
  | { type: "person-edit"; person: Person }
  | { type: "relationship-create" }
  | { type: "relationship-edit"; relationship: Relationship }
  | { type: "import-export" };

interface PersonDraft {
  name: string;
  notes: string;
  color: string;
}

interface RelationshipDraft {
  source: string;
  target: string;
  category: RelationshipCategory;
  typeChoice: string;
  customType: string;
  direction: RelationshipDirection;
  startYear?: number;
  startMonth?: number;
  color: string;
  notes: string;
}

const PERSON_COLORS = [
  "",
  "#1a1d24",
  "#3b5bdb",
  "#2f9e44",
  "#e64980",
  "#f08c00",
  "#1098ad",
  "#7b2cbf",
];

const DEFAULT_EXPORT_NAME = "my-network";

function capitalizeWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function proposalKey(proposal: Pick<ProposalItem, "source" | "target" | "type">): string {
  return createRelationshipKey(proposal.source, proposal.target, proposal.type);
}

function initialPersonDraft(person?: Person): PersonDraft {
  return {
    name: person?.name ?? "",
    notes: person?.notes ?? "",
    color: person?.color ?? "",
  };
}

function initialRelationshipDraft(relationship?: Relationship): RelationshipDraft {
  const category = relationship?.category ?? "friend";
  const availableTypes = RELATIONSHIP_CATALOG[category];
  const hasCatalogType = relationship ? availableTypes.includes(relationship.type) : true;
  return {
    source: relationship?.source ?? "",
    target: relationship?.target ?? "",
    category,
    typeChoice: relationship ? (hasCatalogType ? relationship.type : "__custom__") : availableTypes[0],
    customType: relationship && !hasCatalogType ? relationship.type : "",
    direction: relationship?.direction ?? "two-way",
    startYear: relationship?.startYear,
    startMonth: relationship?.startMonth,
    color: relationship?.color ?? "",
    notes: relationship?.notes ?? "",
  };
}

function toCsvValue(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function buildCsvRows(headers: string[], rows: string[][]): string {
  const csvRows = [headers.join(",")];
  for (const row of rows) {
    csvRows.push(row.map((v) => toCsvValue(v)).join(","));
  }
  return csvRows.join("\n");
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(current);
      const isMeaningful = row.some((c) => c.trim().length > 0);
      if (isMeaningful) rows.push(row);
      row = [];
      current = "";
      continue;
    }
    current += ch;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((c) => c.trim().length > 0)) rows.push(row);
  }
  return rows;
}

function downloadTextFile(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function CrudFeature() {
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [importMessage, setImportMessage] = useState("");
  const [personDraft, setPersonDraft] = useState<PersonDraft>(initialPersonDraft());
  const [personError, setPersonError] = useState("");
  const [exportFileName, setExportFileName] = useState<string>(DEFAULT_EXPORT_NAME);
  const [relationshipDraft, setRelationshipDraft] = useState<RelationshipDraft>(initialRelationshipDraft());
  const [relationshipError, setRelationshipError] = useState("");
  const [endConfirmId, setEndConfirmId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPrimary, setConfirmPrimary] = useState<ProposalItem | null>(null);
  const [confirmProposals, setConfirmProposals] = useState<ProposalItem[]>([]);
  const [quickAddPerson, setQuickAddPerson] = useState<Person | null>(null);
  const [declinedProposalKeys, setDeclinedProposalKeys] = useState<Set<string>>(() => new Set());

  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const csvPeopleInputRef = useRef<HTMLInputElement | null>(null);
  const csvRelationshipsInputRef = useRef<HTMLInputElement | null>(null);

  const people = useGraphStore((s) => s.people);
  const relationships = useGraphStore((s) => s.relationships);
  const selectedPersonId = useGraphStore((s) => s.selectedPersonId);
  const selectedRelationshipId = useGraphStore((s) => s.selectedRelationshipId);
  const selectedPerson = useMemo(
    () => (selectedPersonId ? people.find((p) => p.id === selectedPersonId) ?? null : null),
    [people, selectedPersonId],
  );
  const selectedRelationship = useMemo(
    () =>
      selectedRelationshipId
        ? relationships.find((r) => r.id === selectedRelationshipId) ?? null
        : null,
    [relationships, selectedRelationshipId],
  );
  const relatedToSelectedPerson = useMemo(
    () =>
      selectedPersonId
        ? relationships.filter(
            (r) => r.source === selectedPersonId || r.target === selectedPersonId,
          )
        : [],
    [relationships, selectedPersonId],
  );

  const categoryLabels = useGraphStore((s) => s.categoryLabels);
  const relationshipCatalog = useGraphStore((s) => s.relationshipCatalog);
  const relationshipColors = useGraphStore((s) => s.relationshipColors);

  const addPerson = useGraphStore((s) => s.addPerson);
  const updatePerson = useGraphStore((s) => s.updatePerson);
  const deletePerson = useGraphStore((s) => s.deletePerson);

  const addRelationship = useGraphStore((s) => s.addRelationship);
  const updateRelationship = useGraphStore((s) => s.updateRelationship);
  const deleteRelationship = useGraphStore((s) => s.deleteRelationship);
  const endRelationship = useGraphStore((s) => s.endRelationship);
  const replaceGraph = useGraphStore((s) => s.replaceGraph);

  const selectRelationship = useGraphStore((s) => s.selectRelationship);
  const clearSelection = useGraphStore((s) => s.clearSelection);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const openPersonCreate = () => {
    setPersonDraft(initialPersonDraft());
    setPersonError("");
    setModal({ type: "person-create" });
  };

  const openPersonEdit = (person: Person) => {
    setPersonDraft(initialPersonDraft(person));
    setPersonError("");
    setModal({ type: "person-edit", person });
  };

  const openRelationshipCreate = (sourceId?: string, targetId?: string) => {
    const draft = initialRelationshipDraft();
    if (sourceId) draft.source = sourceId;
    if (targetId) draft.target = targetId;
    setRelationshipDraft(draft);
    setRelationshipError("");
    setModal({ type: "relationship-create" });
  };

  useEffect(() => {
    const onOpenComposer = (event: Event) => {
      const customEvent = event as CustomEvent<OpenRelationshipComposerDetail>;
      const detail = customEvent.detail;
      if (!detail?.sourceId || !detail?.targetId) return;
      openRelationshipCreate(detail.sourceId, detail.targetId);
    };

    window.addEventListener(OPEN_RELATIONSHIP_COMPOSER_EVENT, onOpenComposer);
    const onOpenImportExport = () => setModal({ type: "import-export" });
    window.addEventListener(OPEN_IMPORT_EXPORT_EVENT, onOpenImportExport);

    return () => {
      window.removeEventListener(OPEN_RELATIONSHIP_COMPOSER_EVENT, onOpenComposer);
      window.removeEventListener(OPEN_IMPORT_EXPORT_EVENT, onOpenImportExport);
    };
  }, []);

  function sanitizeFileName(name: string) {
    if (!name) return "";
    // Allow letters, numbers, dash, underscore. Strip everything else.
    return name.replace(/[^a-zA-Z0-9-_]/g, "").trim();
  }

  const openRelationshipEdit = (relationship: Relationship) => {
    setRelationshipDraft(initialRelationshipDraft(relationship));
    setRelationshipError("");
    setModal({ type: "relationship-edit", relationship });
  };

  const closeModal = () => {
    setModal({ type: "none" });
    setImportMessage("");
    setPersonError("");
    setRelationshipError("");
    setEndConfirmId(null);
  };

  const rememberDeclinedProposals = (proposals: ProposalItem[]) => {
    if (proposals.length === 0) return;
    setDeclinedProposalKeys((prev) => {
      const next = new Set(prev);
      for (const proposal of proposals) {
        next.add(proposalKey(proposal));
      }
      return next;
    });
  };

  const submitPerson = () => {
    const trimmedName = personDraft.name.trim();
    if (!trimmedName) {
      setPersonError("Name is required.");
      return;
    }

    const payload: PersonInput = {
      name: trimmedName,
      notes: personDraft.notes.trim() || undefined,
      color: personDraft.color || undefined,
    };

    if (modal.type === "person-edit") {
      updatePerson(modal.person.id, payload);
    } else {
      const created = addPerson(payload);
      // Close the person modal, then open quick-add relationships for the created person
      closeModal();
      setQuickAddPerson(created);
      return;
    }
    closeModal();
  };

  const submitRelationship = () => {
    const resolvedType =
      relationshipDraft.typeChoice === "__custom__"
        ? relationshipDraft.customType.trim()
        : relationshipDraft.typeChoice.trim();

    if (!relationshipDraft.source || !relationshipDraft.target) {
      setRelationshipError("Choose both source and target.");
      return;
    }
    if (relationshipDraft.source === relationshipDraft.target) {
      setRelationshipError("Source and target must be different.");
      return;
    }
    if (!resolvedType) {
      setRelationshipError("Relationship type is required.");
      return;
    }

    const payload: RelationshipInput = {
      source: relationshipDraft.source,
      target: relationshipDraft.target,
      category: relationshipDraft.category,
      type: resolvedType,
      direction: relationshipDraft.direction,
      startYear: relationshipDraft.startYear,
      startMonth: relationshipDraft.startMonth,
      color: relationshipDraft.color || undefined,
      notes: relationshipDraft.notes.trim() || undefined,
    };

    if (modal.type === "relationship-edit") {
      updateRelationship(modal.relationship.id, payload);
      closeModal();
    } else {
      const generatedProposals = useAutoRelationships(
        payload.type,
        payload.source,
        payload.target,
        payload.category,
        people,
        relationships,
      );
      const proposals = generatedProposals.filter(
        (proposal) => !declinedProposalKeys.has(proposalKey(proposal)),
      );

      if (!proposals || proposals.length === 0) {
        // No new heuristic suggestions: persist primary relationship immediately.
        addRelationship(payload);
        closeModal();
      } else {
        setConfirmPrimary(payload as ProposalItem);
        setConfirmProposals(proposals.map((p) => ({ ...p })));
        setConfirmOpen(true);
      }
    }
  };

  const handleConfirmAddAll = (selected: ProposalItem[], declined: ProposalItem[]) => {
    rememberDeclinedProposals(declined);
    if (confirmPrimary) {
      addRelationship({
        source: confirmPrimary.source,
        target: confirmPrimary.target,
        category: confirmPrimary.category,
        type: confirmPrimary.type,
        direction: confirmPrimary.direction,
        color: undefined,
        notes: confirmPrimary.notes || undefined,
      });
    }
    for (const p of selected) {
      addRelationship({
        source: p.source,
        target: p.target,
        category: p.category,
        type: p.type,
        direction: p.direction,
        color: undefined,
        notes: p.notes || undefined,
      });
    }
    setConfirmOpen(false);
    setConfirmPrimary(null);
    setConfirmProposals([]);
    setModal({ type: "none" });
  };

  const handleAddPrimaryOnly = (_declined: ProposalItem[]) => {
    // Do NOT remember declined proposals here — the user clicked "Skip suggestions"
    // which means "just add the primary relationship now". Proposals for future
    // relationships involving these people should still surface normally.
    if (confirmPrimary) {
      addRelationship({
        source: confirmPrimary.source,
        target: confirmPrimary.target,
        category: confirmPrimary.category,
        type: confirmPrimary.type,
        direction: confirmPrimary.direction,
        color: undefined,
        notes: confirmPrimary.notes || undefined,
      });
    }
    setConfirmOpen(false);
    setConfirmPrimary(null);
    setConfirmProposals([]);
    setModal({ type: "none" });
  };

  const handleCancelConfirm = () => {
    // Keep the relationship composer open so the user can revise the primary relationship.
    setConfirmOpen(false);
    setConfirmPrimary(null);
    setConfirmProposals([]);
  };

  const exportJson = () => {
    const graph: GraphData = { people, relationships };
    const base = sanitizeFileName(exportFileName) || DEFAULT_EXPORT_NAME;
    downloadTextFile(`${base}.json`, JSON.stringify(graph, null, 2), "application/json");
  };

  const exportPeopleCsv = () => {
    const csv = buildCsvRows(
      ["id", "name", "notes", "color", "createdAt", "updatedAt"],
      people.map((p) => [
        p.id,
        p.name,
        p.notes ?? "",
        p.color ?? "",
        p.createdAt,
        p.updatedAt,
      ]),
    );
    const base = sanitizeFileName(exportFileName) || DEFAULT_EXPORT_NAME;
    downloadTextFile(`${base}-people.csv`, csv, "text/csv");
  };

  const exportRelationshipsCsv = () => {
    const csv = buildCsvRows(
      [
        "id",
        "source",
        "target",
        "category",
        "type",
        "direction",
        "startYear",
        "startMonth",
        "endYear",
        "isActive",
        "color",
        "notes",
        "createdAt",
        "updatedAt",
      ],
      relationships.map((r) => [
        r.id,
        r.source,
        r.target,
        r.category,
        r.type,
        r.direction,
        r.startYear?.toString() ?? "",
        r.startMonth?.toString() ?? "",
        r.endYear?.toString() ?? "",
        r.isActive === undefined ? "" : String(r.isActive),
        r.color ?? "",
        r.notes ?? "",
        r.createdAt,
        r.updatedAt,
      ]),
    );
    const base = sanitizeFileName(exportFileName) || DEFAULT_EXPORT_NAME;
    downloadTextFile(`${base}-relationships.csv`, csv, "text/csv");
  };

  const importJsonFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as GraphData;
      if (!Array.isArray(parsed.people) || !Array.isArray(parsed.relationships)) {
        setImportMessage("Invalid JSON shape. Expected { people, relationships }.");
        return;
      }
      replaceGraph(parsed);
      clearSelection();
      setImportMessage("JSON import completed.");
    } catch {
      setImportMessage("Could not parse JSON file.");
    }
  };

  const importCsvFiles = async (peopleFile?: File, relationshipsFile?: File) => {
    if (!peopleFile && !relationshipsFile) {
      setImportMessage("Choose at least one CSV file.");
      return;
    }

    try {
      const nextPeople = peopleFile
        ? parsePeopleCsv(await peopleFile.text())
        : [];
      const nextRelationships = relationshipsFile
        ? parseRelationshipsCsv(await relationshipsFile.text())
        : [];

      replaceGraph({ people: nextPeople, relationships: nextRelationships });
      clearSelection();
      setImportMessage("CSV import completed.");
    } catch {
      setImportMessage("Could not parse CSV files.");
    }
  };

  return (
    <>
      <div className="pointer-events-none absolute right-4 top-4 z-20">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-rf-border bg-rf-surface p-2 shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={openPersonCreate}
            className="rounded-lg bg-rf-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            + Person
          </button>
          <button
            type="button"
            onClick={() => openRelationshipCreate()}
            className="rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text hover:bg-rf-base"
          >
            + Relationship
          </button>
          
        </div>
      </div>

      {(selectedPerson || selectedRelationship) && (
        <div className="pointer-events-none absolute right-0 top-0 z-30 h-full w-[360px] max-w-[92vw]">
          <div className="pointer-events-auto h-full border-l border-rf-border bg-rf-surface p-4 shadow-xl">
            {selectedPerson && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-lg text-rf-text">Person details</h3>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded border border-rf-border px-2 py-1 text-xs text-rf-muted hover:bg-rf-base"
                  >
                    x
                  </button>
                </div>
                <div className="mb-2 text-sm text-rf-muted">Name</div>
                <div className="mb-3 text-base text-rf-text">{selectedPerson.name}</div>
                <div className="mb-2 text-sm text-rf-muted">Notes</div>
                <div className="mb-4 rounded border border-rf-border bg-rf-subtle p-2 text-sm text-rf-text">
                  {selectedPerson.notes || "No notes"}
                </div>
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm text-rf-muted">Color</span>
                  <span
                    className="inline-block h-4 w-4 rounded-full border border-rf-border"
                    style={{ backgroundColor: selectedPerson.color || "#1a1d24" }}
                  />
                </div>

                <div className="mb-2 text-sm text-rf-muted">
                  Relationships ({relatedToSelectedPerson.length})
                </div>
                <ul className="mb-3 max-h-64 space-y-2 overflow-auto rounded border border-rf-border bg-rf-subtle p-2">
                  {relatedToSelectedPerson.map((rel) => {
                    const otherId = rel.source === selectedPerson.id ? rel.target : rel.source;
                    const otherName = peopleById.get(otherId)?.name ?? "Unknown";
                    return (
                      <li key={rel.id} className="rounded border border-rf-border bg-rf-surface p-2">
                        <button
                          type="button"
                          onClick={() => selectRelationship(rel.id)}
                          className="w-full rounded text-left hover:bg-rf-base"
                        >
                          <div className="text-sm text-rf-text">{capitalizeWords(rel.type)} · {otherName}</div>
                          <div className="mt-1 text-xs text-rf-muted">
                            {categoryLabels[rel.category]} · {rel.direction}
                          </div>
                          {rel.notes && (
                            <div className="mt-1 line-clamp-2 text-xs text-rf-muted">{rel.notes}</div>
                          )}
                        </button>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => openRelationshipEdit(rel)}
                            className="rounded border border-rf-border bg-rf-subtle px-2 py-1 text-xs text-rf-text hover:bg-rf-base"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Delete this relationship?")) {
                                deleteRelationship(rel.id);
                              }
                            }}
                            className="rounded border border-red-400 bg-red-50 px-2 py-1 text-xs text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    );
                  })}
                  {relatedToSelectedPerson.length === 0 && (
                    <li className="px-2 py-1 text-xs text-rf-muted">No relationships</li>
                  )}
                </ul>

                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => openRelationshipCreate(selectedPerson.id)}
                    className="rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text hover:bg-rf-base"
                  >
                    Add relationship for {selectedPerson.name}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openPersonEdit(selectedPerson)}
                    className="rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text hover:bg-rf-base"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Delete this person and all connected relationships?")) {
                        deletePerson(selectedPerson.id);
                      }
                    }}
                    className="rounded-lg border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {selectedRelationship && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-lg text-rf-text">Relationship details</h3>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded border border-rf-border px-2 py-1 text-xs text-rf-muted hover:bg-rf-base"
                  >
                    x
                  </button>
                </div>
                <dl className="space-y-2 text-sm text-rf-text">
                  <div>
                    <dt className="text-rf-muted">Source</dt>
                    <dd>{peopleById.get(selectedRelationship.source)?.name ?? "Unknown"}</dd>
                  </div>
                  <div>
                    <dt className="text-rf-muted">Target</dt>
                    <dd>{peopleById.get(selectedRelationship.target)?.name ?? "Unknown"}</dd>
                  </div>
                  <div>
                    <dt className="text-rf-muted">Category</dt>
                    <dd>{categoryLabels[selectedRelationship.category]}</dd>
                  </div>
                  <div>
                    <dt className="text-rf-muted">Type</dt>
                    <dd>{capitalizeWords(selectedRelationship.type)}</dd>
                  </div>
                  <div>
                    <dt className="text-rf-muted">Direction</dt>
                    <dd>{selectedRelationship.direction}</dd>
                  </div>
                  <div>
                    <dt className="text-rf-muted">Started</dt>
                    <dd>
                      {selectedRelationship.startYear
                        ? `${selectedRelationship.startYear}${
                            selectedRelationship.startMonth
                              ? ` / ${selectedRelationship.startMonth}`
                              : ""
                          }`
                        : "Not recorded"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-rf-muted">Status</dt>
                    <dd className={selectedRelationship.isActive === false ? "text-rf-muted" : ""}>
                      {selectedRelationship.isActive === false
                        ? `Ended ${selectedRelationship.endYear ?? "Unknown year"}`
                        : "Active"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-rf-muted">Notes</dt>
                    <dd>{selectedRelationship.notes || "No notes"}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openRelationshipEdit(selectedRelationship)}
                    className="rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text hover:bg-rf-base"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Delete this relationship?")) {
                        deleteRelationship(selectedRelationship.id);
                      }
                    }}
                    className="rounded-lg border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    Delete
                  </button>
                  {selectedRelationship.isActive === false ? (
                    <button
                      type="button"
                      onClick={() => {
                        updateRelationship(selectedRelationship.id, {
                          isActive: true,
                          endYear: undefined,
                        });
                        setEndConfirmId(null);
                      }}
                      className="rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text hover:bg-rf-base"
                    >
                      Reactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEndConfirmId(selectedRelationship.id)}
                      className="rounded-lg border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700"
                    >
                      End this relationship
                    </button>
                  )}
                </div>
                {selectedRelationship.isActive !== false && endConfirmId === selectedRelationship.id ? (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    <div>
                      Mark {capitalizeWords(selectedRelationship.type)} with{" "}
                      {peopleById.get(selectedRelationship.target)?.name ??
                        peopleById.get(selectedRelationship.source)?.name ??
                        "this person"}{" "}
                      as ended? This sets the end year to {new Date().getFullYear()}.
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          endRelationship(selectedRelationship.id);
                          setEndConfirmId(null);
                        }}
                        className="rounded border border-red-400 bg-red-600 px-2.5 py-1 text-xs font-medium text-white"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setEndConfirmId(null)}
                        className="rounded border border-rf-border bg-rf-surface px-2.5 py-1 text-xs text-rf-text"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {(modal.type === "person-create" || modal.type === "person-edit") && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitPerson();
            }}
            className="w-[520px] max-w-full rounded-xl border border-rf-border bg-rf-surface p-4 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg text-rf-text">
                {modal.type === "person-edit" ? "Edit person" : "Add person"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded border border-rf-border px-2 py-1 text-xs text-rf-muted hover:bg-rf-base"
              >
                x
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm text-rf-text">
                Name
                <input
                  value={personDraft.name}
                  onChange={(e) => setPersonDraft((d) => ({ ...d, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text"
                />
              </label>

              <label className="block text-sm text-rf-text">
                Notes
                <textarea
                  value={personDraft.notes}
                  onChange={(e) => setPersonDraft((d) => ({ ...d, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text"
                />
              </label>

              <div>
                <div className="mb-1 text-sm text-rf-text">Color</div>
                <div className="flex flex-wrap items-center gap-2">
                  {PERSON_COLORS.map((color) => {
                    const active = (color || "") === personDraft.color;
                    return (
                      <button
                        key={color || "none"}
                        type="button"
                        onClick={() => setPersonDraft((d) => ({ ...d, color }))}
                        className={`h-7 w-7 rounded-full border ${active ? "border-rf-accent ring-2 ring-rf-accent" : "border-rf-border"}`}
                        style={{ backgroundColor: color || "transparent" }}
                        title={color || "None"}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {personError && <p className="mt-3 text-sm text-red-600">{personError}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-rf-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {(modal.type === "relationship-create" || modal.type === "relationship-edit") && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
          <div className="w-[580px] max-w-full rounded-xl border border-rf-border bg-rf-surface p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg text-rf-text">
                {modal.type === "relationship-edit" ? "Edit relationship" : "Add relationship"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded border border-rf-border px-2 py-1 text-xs text-rf-muted hover:bg-rf-base"
              >
                x
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm text-rf-text">
                Source
                <select
                  value={relationshipDraft.source}
                  onChange={(e) => setRelationshipDraft((d) => ({ ...d, source: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text"
                >
                  <option value="">Select person</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-rf-text">
                Target
                <select
                  value={relationshipDraft.target}
                  onChange={(e) => setRelationshipDraft((d) => ({ ...d, target: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text"
                >
                  <option value="">Select person</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-rf-text">
                Category
                <select
                  value={relationshipDraft.category}
                  onChange={(e) => {
                    const category = e.target.value as RelationshipCategory;
                    const firstType = RELATIONSHIP_CATALOG[category][0] ?? "";
                    setRelationshipDraft((d) => ({
                      ...d,
                      category,
                      typeChoice: firstType,
                      customType: "",
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-rf-text">
                Type
                <select
                  value={relationshipDraft.typeChoice}
                  onChange={(e) =>
                    setRelationshipDraft((d) => ({ ...d, typeChoice: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text"
                >
                  {relationshipCatalog[relationshipDraft.category].map((type) => (
                    <option key={type} value={type}>
                      {capitalizeWords(type)}
                    </option>
                  ))}
                  <option value="__custom__">Custom...</option>
                </select>
              </label>

              {relationshipDraft.typeChoice === "__custom__" && (
                <label className="sm:col-span-2 text-sm text-rf-text">
                  Custom type
                  <input
                    value={relationshipDraft.customType}
                    onChange={(e) =>
                      setRelationshipDraft((d) => ({ ...d, customType: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text"
                  />
                </label>
              )}

              <div className="text-sm text-rf-text">
                Direction
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-rf-border bg-rf-subtle p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setRelationshipDraft((d) => ({ ...d, direction: "two-way" }))
                    }
                    className={`rounded px-3 py-1 text-xs ${
                      relationshipDraft.direction === "two-way"
                        ? "bg-rf-accent text-white"
                        : "text-rf-text"
                    }`}
                  >
                    two-way
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRelationshipDraft((d) => ({ ...d, direction: "one-way" }))
                    }
                    className={`rounded px-3 py-1 text-xs ${
                      relationshipDraft.direction === "one-way"
                        ? "bg-rf-accent text-white"
                        : "text-rf-text"
                    }`}
                  >
                    one-way
                  </button>
                </div>
              </div>

              <div className="text-sm text-rf-text">
                Color override
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRelationshipDraft((d) => ({ ...d, color: "" }))}
                    className={`rounded border px-2 py-1 text-xs ${
                      relationshipDraft.color ? "border-rf-border" : "border-rf-accent text-rf-accent"
                    }`}
                  >
                    Default
                  </button>
                  <input
                    type="color"
                    value={relationshipDraft.color || relationshipColors[relationshipDraft.category]}
                    onChange={(e) =>
                      setRelationshipDraft((d) => ({ ...d, color: e.target.value }))
                    }
                    className="h-9 w-12 rounded border border-rf-border bg-rf-subtle"
                  />
                </div>
              </div>

              <YearMonthPicker
                startYear={relationshipDraft.startYear}
                startMonth={relationshipDraft.startMonth}
                onYearChange={(startYear) =>
                  setRelationshipDraft((draft) => ({
                    ...draft,
                    startYear,
                  }))
                }
                onMonthChange={(startMonth) =>
                  setRelationshipDraft((draft) => ({
                    ...draft,
                    startMonth,
                  }))
                }
              />

              <label className="sm:col-span-2 text-sm text-rf-text">
                Notes
                <textarea
                  value={relationshipDraft.notes}
                  onChange={(e) => setRelationshipDraft((d) => ({ ...d, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text"
                />
              </label>
            </div>

            {relationshipError && <p className="mt-3 text-sm text-red-600">{relationshipError}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRelationship}
                className="rounded-lg bg-rf-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {modal.type === "import-export" && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
          <div className="w-[720px] max-w-full rounded-xl border border-rf-border bg-rf-surface p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg text-rf-text">Import / Export</h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded border border-rf-border px-2 py-1 text-xs text-rf-muted hover:bg-rf-base"
              >
                x
              </button>
            </div>

            <div className="mb-3">
              <label className="block text-sm text-rf-text">
                File name
                <input
                  value={exportFileName}
                  onChange={(e) => setExportFileName(e.target.value)}
                  placeholder={DEFAULT_EXPORT_NAME}
                  className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <section className="rounded-lg border border-rf-border bg-rf-subtle p-3">
                <h4 className="mb-2 text-sm font-semibold text-rf-text">JSON</h4>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={exportJson}
                    className="rounded-lg border border-rf-border bg-rf-surface px-3 py-2 text-sm text-rf-text"
                  >
                    Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => jsonInputRef.current?.click()}
                    className="rounded-lg border border-rf-border bg-rf-surface px-3 py-2 text-sm text-rf-text"
                  >
                    Import JSON
                  </button>
                  <input
                    ref={jsonInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void importJsonFile(file);
                    }}
                  />
                </div>
              </section>

              <section className="rounded-lg border border-rf-border bg-rf-subtle p-3">
                <h4 className="mb-2 text-sm font-semibold text-rf-text">CSV</h4>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={exportPeopleCsv}
                    className="rounded-lg border border-rf-border bg-rf-surface px-3 py-2 text-sm text-rf-text"
                  >
                    Export people.csv
                  </button>
                  <button
                    type="button"
                    onClick={exportRelationshipsCsv}
                    className="rounded-lg border border-rf-border bg-rf-surface px-3 py-2 text-sm text-rf-text"
                  >
                    Export relationships.csv
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => csvPeopleInputRef.current?.click()}
                    className="rounded-lg border border-rf-border bg-rf-surface px-3 py-2 text-sm text-rf-text"
                  >
                    Pick people.csv
                  </button>
                  <button
                    type="button"
                    onClick={() => csvRelationshipsInputRef.current?.click()}
                    className="rounded-lg border border-rf-border bg-rf-surface px-3 py-2 text-sm text-rf-text"
                  >
                    Pick relationships.csv
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void importCsvFiles(
                        csvPeopleInputRef.current?.files?.[0],
                        csvRelationshipsInputRef.current?.files?.[0],
                      )
                    }
                    className="rounded-lg bg-rf-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  >
                    Import CSV
                  </button>
                </div>
                <input
                  ref={csvPeopleInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                />
                <input
                  ref={csvRelationshipsInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                />
              </section>
            </div>

            {importMessage && <p className="mt-3 text-sm text-rf-muted">{importMessage}</p>}
          </div>
        </div>
      )}
      {confirmOpen && confirmPrimary && (
        <ConfirmRelationshipsDialog
          open={confirmOpen}
          primary={confirmPrimary}
          proposals={confirmProposals}
          people={people}
          onCancel={handleCancelConfirm}
          onAddAll={handleConfirmAddAll}
          onAddPrimaryOnly={handleAddPrimaryOnly}
        />
      )}
      {quickAddPerson && (
        <QuickAddRelationshipsDialog
          open={!!quickAddPerson}
          person={quickAddPerson}
          onClose={() => setQuickAddPerson(null)}
        />
      )}
    </>
  );
}

function parsePeopleCsv(content: string): Person[] {
  const rows = parseCsv(content);
  if (rows.length <= 1) return [];
  const header = rows[0].map((h) => h.trim());
  const idx = indexByHeader(header);
  return rows.slice(1).map((row) => {
    const get = (name: string) => row[idx[name] ?? -1] ?? "";
    return {
      id: get("id"),
      name: get("name"),
      notes: get("notes") || undefined,
      color: get("color") || undefined,
      createdAt: get("createdAt") || new Date().toISOString(),
      updatedAt: get("updatedAt") || new Date().toISOString(),
    };
  });
}

function parseRelationshipsCsv(content: string): Relationship[] {
  const rows = parseCsv(content);
  if (rows.length <= 1) return [];
  const header = rows[0].map((h) => h.trim());
  const idx = indexByHeader(header);
  return rows.slice(1).map((row) => {
    const get = (name: string) => row[idx[name] ?? -1] ?? "";
    const category = get("category") as RelationshipCategory;
    const direction = get("direction") as RelationshipDirection;
    const startYear = get("startYear");
    const startMonth = get("startMonth");
    const endYear = get("endYear");
    const isActive = get("isActive");
    return {
      id: get("id"),
      source: get("source"),
      target: get("target"),
      category: CATEGORIES.includes(category) ? category : "other",
      type: get("type"),
      direction: direction === "one-way" ? "one-way" : "two-way",
      startYear: startYear ? Number(startYear) : undefined,
      startMonth: startMonth ? Number(startMonth) : undefined,
      endYear: endYear ? Number(endYear) : undefined,
      isActive: isActive === "" ? undefined : isActive === "true",
      color: get("color") || undefined,
      notes: get("notes") || undefined,
      createdAt: get("createdAt") || new Date().toISOString(),
      updatedAt: get("updatedAt") || new Date().toISOString(),
    };
  });
}

function indexByHeader(header: string[]): Record<string, number> {
  const index: Record<string, number> = {};
  header.forEach((name, i) => {
    index[name] = i;
  });
  return index;
}
