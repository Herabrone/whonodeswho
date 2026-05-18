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
  RelationshipPhase,
} from "../../types";
import {
  OPEN_RELATIONSHIP_COMPOSER_EVENT,
  type OpenRelationshipComposerDetail,
  OPEN_IMPORT_EXPORT_EVENT,
  OPEN_QUICK_ADD_RELATIONSHIPS_EVENT,
  type OpenQuickAddRelationshipsDetail,
} from "./relationshipComposerEvent";
import { RelationshipTransitionDialog } from "../timeline/RelationshipTransitionDialog";
import { RelationshipHistoryPanel } from "../timeline/RelationshipHistoryPanel";
import { validateRelationshipDrafts } from "../../domain/rules/validationRules";
import { createRelationshipKey, inferAutoRelationships } from "./useAutoRelationships";
import ConfirmRelationshipsDialog, { ProposalItem } from "./ConfirmRelationshipsDialog";
import QuickAddRelationshipsDialog from "./QuickAddRelationshipsDialog";
import { capitalizeWords } from "../../lib/string";
import { newId } from "../../lib/id";

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

interface RelationshipPhaseDraft {
  id: string;
  typeKey: string;
  fromYear?: number;
  fromMonth?: number;
  toYear?: number;
  toMonth?: number;
  isCurrent: boolean;
}

interface RelationshipDraft {
  source: string;
  target: string;
  category: RelationshipCategory;
  typeChoice: string;
  customType: string;
  secondaryCategory: RelationshipCategory;
  secondaryTypeChoice: string;
  secondaryCustomType: string;
  direction: RelationshipDirection;
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  isEnded: boolean;
  phases: RelationshipPhaseDraft[];
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
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
const PHASE_TYPE_SEPARATOR = "::";

function encodePhaseTypeKey(category: RelationshipCategory, type: string): string {
  return `${category}${PHASE_TYPE_SEPARATOR}${type}`;
}

function decodePhaseTypeKey(
  typeKey: string,
): { category: RelationshipCategory; type: string } | null {
  if (!typeKey) return null;

  const separatorIndex = typeKey.indexOf(PHASE_TYPE_SEPARATOR);
  if (separatorIndex === -1) return null;

  const category = typeKey.slice(0, separatorIndex) as RelationshipCategory;
  const type = typeKey.slice(separatorIndex + PHASE_TYPE_SEPARATOR.length);

  if (!CATEGORIES.includes(category) || !type) {
    return null;
  }

  return { category, type };
}

function compareRelationshipPhases(
  left: Pick<RelationshipPhase, "fromYear" | "fromMonth" | "toYear" | "toMonth" | "isCurrent">,
  right: Pick<RelationshipPhase, "fromYear" | "fromMonth" | "toYear" | "toMonth" | "isCurrent">,
): number {
  if (left.fromYear !== right.fromYear) return left.fromYear - right.fromYear;

  const leftFromMonth = left.fromMonth ?? 0;
  const rightFromMonth = right.fromMonth ?? 0;
  if (leftFromMonth !== rightFromMonth) return leftFromMonth - rightFromMonth;

  const leftToYear = left.isCurrent ? Number.MAX_SAFE_INTEGER : left.toYear ?? Number.MAX_SAFE_INTEGER;
  const rightToYear = right.isCurrent ? Number.MAX_SAFE_INTEGER : right.toYear ?? Number.MAX_SAFE_INTEGER;
  if (leftToYear !== rightToYear) return leftToYear - rightToYear;

  const leftToMonth = left.isCurrent ? Number.MAX_SAFE_INTEGER : left.toMonth ?? Number.MAX_SAFE_INTEGER;
  const rightToMonth = right.isCurrent ? Number.MAX_SAFE_INTEGER : right.toMonth ?? Number.MAX_SAFE_INTEGER;
  return leftToMonth - rightToMonth;
}

function compareRelationshipPhaseDrafts(
  left: RelationshipPhaseDraft,
  right: RelationshipPhaseDraft,
): number {
  const leftFromYear = left.fromYear ?? Number.MAX_SAFE_INTEGER;
  const rightFromYear = right.fromYear ?? Number.MAX_SAFE_INTEGER;
  if (leftFromYear !== rightFromYear) return leftFromYear - rightFromYear;

  const leftFromMonth = left.fromMonth ?? Number.MAX_SAFE_INTEGER;
  const rightFromMonth = right.fromMonth ?? Number.MAX_SAFE_INTEGER;
  if (leftFromMonth !== rightFromMonth) return leftFromMonth - rightFromMonth;

  const leftToYear = left.isCurrent ? Number.MAX_SAFE_INTEGER : left.toYear ?? Number.MAX_SAFE_INTEGER;
  const rightToYear = right.isCurrent ? Number.MAX_SAFE_INTEGER : right.toYear ?? Number.MAX_SAFE_INTEGER;
  if (leftToYear !== rightToYear) return leftToYear - rightToYear;

  const leftToMonth = left.isCurrent ? Number.MAX_SAFE_INTEGER : left.toMonth ?? Number.MAX_SAFE_INTEGER;
  const rightToMonth = right.isCurrent ? Number.MAX_SAFE_INTEGER : right.toMonth ?? Number.MAX_SAFE_INTEGER;
  if (leftToMonth !== rightToMonth) return leftToMonth - rightToMonth;

  return left.id.localeCompare(right.id);
}

function sortRelationshipPhaseDrafts(phases: RelationshipPhaseDraft[]): RelationshipPhaseDraft[] {
  return [...phases].sort(compareRelationshipPhaseDrafts);
}

function relationshipPhaseToDraft(phase: RelationshipPhase): RelationshipPhaseDraft {
  return {
    id: newId(),
    typeKey: encodePhaseTypeKey(phase.category, phase.type),
    fromYear: phase.fromYear,
    fromMonth: phase.fromMonth,
    toYear: phase.toYear,
    toMonth: phase.toMonth,
    isCurrent: phase.isCurrent,
  };
}

function createRelationshipPhaseDraft(): RelationshipPhaseDraft {
  return {
    id: newId(),
    typeKey: "",
    isCurrent: true,
  };
}

function isRelationshipPhaseDraftBlank(phase: RelationshipPhaseDraft): boolean {
  return !phase.typeKey &&
    phase.fromYear === undefined &&
    phase.fromMonth === undefined &&
    phase.toYear === undefined &&
    phase.toMonth === undefined;
}

function resolveRelationshipPhaseDraft(phase: RelationshipPhaseDraft): RelationshipPhase | null {
  const decodedType = decodePhaseTypeKey(phase.typeKey);
  if (!decodedType || phase.fromYear === undefined) {
    return null;
  }

  return {
    type: decodedType.type,
    category: decodedType.category,
    fromYear: phase.fromYear,
    ...(phase.fromMonth !== undefined ? { fromMonth: phase.fromMonth } : {}),
    ...(!phase.isCurrent && phase.toYear !== undefined ? { toYear: phase.toYear } : {}),
    ...(!phase.isCurrent && phase.toMonth !== undefined ? { toMonth: phase.toMonth } : {}),
    isCurrent: phase.isCurrent,
  };
}

function getResolvedRelationshipHistory(phases: RelationshipPhaseDraft[]): RelationshipPhase[] {
  return phases
    .map(resolveRelationshipPhaseDraft)
    .filter((phase): phase is RelationshipPhase => Boolean(phase))
    .sort(compareRelationshipPhases);
}

function syncRelationshipDraftWithHistory(draft: RelationshipDraft): RelationshipDraft {
  const phases = sortRelationshipPhaseDrafts(draft.phases);
  const resolvedHistory = getResolvedRelationshipHistory(phases);

  if (resolvedHistory.length === 0) {
    return {
      ...draft,
      phases,
    };
  }

  const firstPhase = resolvedHistory[0];
  const latestPhase = resolvedHistory[resolvedHistory.length - 1];

  return {
    ...draft,
    phases,
    category: latestPhase.category,
    typeChoice: latestPhase.type,
    customType: "",
    startYear: firstPhase.fromYear,
    startMonth: firstPhase.fromMonth,
    endYear: latestPhase.isCurrent ? undefined : latestPhase.toYear,
    isEnded: !latestPhase.isCurrent,
  };
}

function formatRelationshipDate(year?: number, month?: number, fallback = "Not recorded"): string {
  if (year === undefined) return fallback;
  return month !== undefined ? `${year} / ${String(month).padStart(2, "0")}` : `${year}`;
}

function formatRelationshipPhaseRange(phase: RelationshipPhase): string {
  const from = formatRelationshipDate(phase.fromYear, phase.fromMonth);
  const to = phase.isCurrent
    ? "Present"
    : formatRelationshipDate(phase.toYear, phase.toMonth, "Unknown");

  return `${from} -> ${to}`;
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function relationshipDebugSnapshot(relationship: Relationship | undefined | null) {
  if (!relationship) return null;

  return {
    id: relationship.id,
    source: relationship.source,
    target: relationship.target,
    type: relationship.type,
    secondaryType: relationship.secondaryType,
    secondaryCategory: relationship.secondaryCategory,
    isActive: relationship.isActive,
    startYear: relationship.startYear,
    startMonth: relationship.startMonth,
    endYear: relationship.endYear,
    autoCreatedReciprocalOfId: relationship.autoCreatedReciprocalOfId,
  };
}

function logRelationshipDebug(label: string, payload?: unknown) {
  if (!import.meta.env.DEV) return;

  if (payload === undefined) {
    console.debug(`[relationships] ${label}`);
    return;
  }

  console.debug(`[relationships] ${label}`, payload);
}

function resolveTypeSelection(
  category: RelationshipCategory,
  type?: string,
): { typeChoice: string; customType: string } {
  const availableTypes = RELATIONSHIP_CATALOG[category];
  const hasCatalogType = Boolean(type && availableTypes.includes(type));

  return {
    typeChoice: hasCatalogType
      ? type ?? availableTypes[0] ?? ""
      : type
        ? "__custom__"
        : availableTypes[0] ?? "",
    customType: hasCatalogType ? "" : type ?? "",
  };
}

function resolveDraftTypeValue(typeChoice: string, customType: string): string | undefined {
  const resolved = typeChoice === "__custom__" ? customType.trim() : typeChoice.trim();
  return resolved || undefined;
}

function typeBadgeStyle(color: string) {
  return {
    borderColor: color,
    backgroundColor: `${color}18`,
    color,
  };
}

function proposalKey(proposal: Pick<ProposalItem, "source" | "target" | "type">): string {
  return createRelationshipKey(proposal.source, proposal.target, proposal.type);
}

function proposalToRelationshipInput(proposal: ProposalItem): RelationshipInput {
  return {
    source: proposal.source,
    target: proposal.target,
    category: proposal.category,
    type: proposal.type,
    secondaryType: proposal.secondaryType,
    secondaryCategory: proposal.secondaryCategory,
    direction: proposal.direction,
    startYear: proposal.startYear,
    startMonth: proposal.startMonth,
    endYear: proposal.endYear,
    isActive: proposal.isActive,
    phases: proposal.phases,
    color: proposal.color,
    notes: proposal.notes || undefined,
  };
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
  const secondaryCategory = relationship?.secondaryCategory ?? "friend";
  const primarySelection = resolveTypeSelection(category, relationship?.type);
  const secondarySelection = resolveTypeSelection(
    secondaryCategory,
    relationship?.secondaryType,
  );
  return syncRelationshipDraftWithHistory({
    source: relationship?.source ?? "",
    target: relationship?.target ?? "",
    category,
    typeChoice: primarySelection.typeChoice,
    customType: primarySelection.customType,
    secondaryCategory,
    secondaryTypeChoice: secondarySelection.typeChoice,
    secondaryCustomType: secondarySelection.customType,
    direction: relationship?.direction ?? "two-way",
    startYear: relationship?.startYear,
    startMonth: relationship?.startMonth,
    endYear: relationship?.endYear,
    isEnded: relationship?.isActive === false || relationship?.endYear !== undefined,
    phases: relationship?.phases?.map(relationshipPhaseToDraft) ?? [],
    color: relationship?.color ?? "",
    notes: relationship?.notes ?? "",
  });
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
  const [secondaryLayerEnabled, setSecondaryLayerEnabled] = useState(false);
  const [secondaryLayerOpen, setSecondaryLayerOpen] = useState(false);
  const [relationshipError, setRelationshipError] = useState("");
  const [endConfirmId, setEndConfirmId] = useState<string | null>(null);
  const [endConfirmYear, setEndConfirmYear] = useState<number>(new Date().getFullYear());
  const [transitionContext, setTransitionContext] = useState<{
    threadId: string;
    relationshipId: string;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPrimary, setConfirmPrimary] = useState<ProposalItem | null>(null);
  const [confirmProposals, setConfirmProposals] = useState<ProposalItem[]>([]);
  const [quickAddPerson, setQuickAddPerson] = useState<Person | null>(null);
  const [confirmWarnings, setConfirmWarnings] = useState<string[]>([]);
  const [declinedProposalKeys, setDeclinedProposalKeys] = useState<Set<string>>(() => new Set());

  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const csvPeopleInputRef = useRef<HTMLInputElement | null>(null);
  const csvRelationshipsInputRef = useRef<HTMLInputElement | null>(null);
  const personNameRef = useRef<HTMLInputElement | null>(null);

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
  const ensureLegacyRelationshipMigrated = useGraphStore((s) => s.ensureLegacyRelationshipMigrated);
  const replaceGraph = useGraphStore((s) => s.replaceGraph);

  const selectRelationship = useGraphStore((s) => s.selectRelationship);
  const clearSelection = useGraphStore((s) => s.clearSelection);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const canonicalSelectedRelationship = useMemo(() => {
    if (!selectedRelationship) return null;
    if (!selectedRelationship.autoCreatedReciprocalOfId) return selectedRelationship;

    return (
      relationships.find(
        (relationship) => relationship.id === selectedRelationship.autoCreatedReciprocalOfId,
      ) ?? selectedRelationship
    );
  }, [relationships, selectedRelationship]);
  const phaseTypeGroups = useMemo(
    () => CATEGORIES.map((category) => ({
      category,
      types: relationshipCatalog[category],
    })),
    [relationshipCatalog],
  );
  const resolvedDraftHistory = useMemo(
    () => getResolvedRelationshipHistory(relationshipDraft.phases),
    [relationshipDraft.phases],
  );
  const latestDraftHistoryPhase = resolvedDraftHistory[resolvedDraftHistory.length - 1] ?? null;
  const historyAutoFillsPrimary = latestDraftHistoryPhase !== null;
  const selectedRelationshipPhases = useMemo(
    () => [...(selectedRelationship?.phases ?? [])].sort(compareRelationshipPhases),
    [selectedRelationship],
  );

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
    setSecondaryLayerEnabled(false);
    setSecondaryLayerOpen(false);
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

    const onOpenQuickAdd = (event: Event) => {
      const customEvent = event as CustomEvent<OpenQuickAddRelationshipsDetail>;
      const p = people.find((x) => x.id === customEvent.detail.personId);
      if (p) setQuickAddPerson(p);
    };
    window.addEventListener(OPEN_QUICK_ADD_RELATIONSHIPS_EVENT, onOpenQuickAdd);

    return () => {
      window.removeEventListener(OPEN_RELATIONSHIP_COMPOSER_EVENT, onOpenComposer);
      window.removeEventListener(OPEN_IMPORT_EXPORT_EVENT, onOpenImportExport);
      window.removeEventListener(OPEN_QUICK_ADD_RELATIONSHIPS_EVENT, onOpenQuickAdd);
    };
  }, [people]); // dependency on people since we use it in the event listener

  function sanitizeFileName(name: string) {
    if (!name) return "";
    // Allow letters, numbers, dash, underscore. Strip everything else.
    return name.replace(/[^a-zA-Z0-9-_]/g, "").trim();
  }

  const openRelationshipEdit = (relationship: Relationship) => {
    setRelationshipDraft(initialRelationshipDraft(relationship));
    setSecondaryLayerEnabled(Boolean(relationship.secondaryType));
    setSecondaryLayerOpen(false);
    setRelationshipError("");
    setModal({ type: "relationship-edit", relationship });
  };

  const closeModal = () => {
    setModal({ type: "none" });
    setImportMessage("");
    setPersonError("");
    setRelationshipError("");
    setEndConfirmId(null);
    setSecondaryLayerEnabled(false);
    setSecondaryLayerOpen(false);
  };

  const updateRelationshipHistoryDraft = (
    updater: (phases: RelationshipPhaseDraft[]) => RelationshipPhaseDraft[],
  ) => {
    setRelationshipDraft((draft) => syncRelationshipDraftWithHistory({
      ...draft,
      phases: updater(draft.phases),
    }));
  };

  useEffect(() => {
    if (modal.type === "person-create") {
      // focus and select the name input when opening the Add Person modal
      // use a microtask to ensure the input is mounted
      setTimeout(() => {
        personNameRef.current?.focus();
        personNameRef.current?.select();
      }, 0);
    }
  }, [modal.type]);

  useEffect(() => {
    if (!canonicalSelectedRelationship) return;
    ensureLegacyRelationshipMigrated(canonicalSelectedRelationship);
  }, [canonicalSelectedRelationship, ensureLegacyRelationshipMigrated]);

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
    const resolvedType = resolveDraftTypeValue(
      relationshipDraft.typeChoice,
      relationshipDraft.customType,
    );
    const resolvedSecondaryType = resolveDraftTypeValue(
      relationshipDraft.secondaryTypeChoice,
      relationshipDraft.secondaryCustomType,
    );

    if (!relationshipDraft.source || !relationshipDraft.target) {
      setRelationshipError("Choose both source and target.");
      return;
    }
    if (relationshipDraft.source === relationshipDraft.target) {
      setRelationshipError("Source and target must be different.");
      return;
    }

    const historyPhases: RelationshipPhase[] = [];
    for (const [index, phaseDraft] of relationshipDraft.phases.entries()) {
      if (isRelationshipPhaseDraftBlank(phaseDraft)) {
        continue;
      }

      const decodedType = decodePhaseTypeKey(phaseDraft.typeKey);
      if (!decodedType) {
        setRelationshipError(`Relationship history phase ${index + 1} needs a type.`);
        return;
      }
      if (phaseDraft.fromYear === undefined) {
        setRelationshipError(`Relationship history phase ${index + 1} needs a start year.`);
        return;
      }
      if (
        phaseDraft.fromMonth !== undefined &&
        (phaseDraft.fromMonth < 1 || phaseDraft.fromMonth > 12)
      ) {
        setRelationshipError(`Relationship history phase ${index + 1} has an invalid start month.`);
        return;
      }
      if (!phaseDraft.isCurrent && phaseDraft.toYear === undefined) {
        setRelationshipError(`Relationship history phase ${index + 1} needs an end year or Present.`);
        return;
      }
      if (phaseDraft.toMonth !== undefined && phaseDraft.toYear === undefined) {
        setRelationshipError(`Relationship history phase ${index + 1} needs an end year before adding a month.`);
        return;
      }
      if (
        phaseDraft.toMonth !== undefined &&
        (phaseDraft.toMonth < 1 || phaseDraft.toMonth > 12)
      ) {
        setRelationshipError(`Relationship history phase ${index + 1} has an invalid end month.`);
        return;
      }

      const nextPhase: RelationshipPhase = {
        type: decodedType.type,
        category: decodedType.category,
        fromYear: phaseDraft.fromYear,
        ...(phaseDraft.fromMonth !== undefined ? { fromMonth: phaseDraft.fromMonth } : {}),
        ...(!phaseDraft.isCurrent && phaseDraft.toYear !== undefined ? { toYear: phaseDraft.toYear } : {}),
        ...(!phaseDraft.isCurrent && phaseDraft.toMonth !== undefined ? { toMonth: phaseDraft.toMonth } : {}),
        isCurrent: phaseDraft.isCurrent,
      };

      if (!nextPhase.isCurrent && nextPhase.toYear !== undefined) {
        const fromMonth = nextPhase.fromMonth ?? 0;
        const toMonth = nextPhase.toMonth ?? 0;
        if (
          nextPhase.toYear < nextPhase.fromYear ||
          (nextPhase.toYear === nextPhase.fromYear && toMonth < fromMonth)
        ) {
          setRelationshipError(`Relationship history phase ${index + 1} ends before it starts.`);
          return;
        }
      }

      historyPhases.push(nextPhase);
    }

    historyPhases.sort(compareRelationshipPhases);
    const firstHistoryPhase = historyPhases[0];
    const latestHistoryPhase = historyPhases[historyPhases.length - 1];
    const effectiveType = latestHistoryPhase?.type ?? resolvedType;
    const effectiveCategory = latestHistoryPhase?.category ?? relationshipDraft.category;

    if (!effectiveType) {
      setRelationshipError("Relationship type is required.");
      return;
    }

    const payload: RelationshipInput = {
      source: relationshipDraft.source,
      target: relationshipDraft.target,
      category: effectiveCategory,
      type: effectiveType,
      secondaryType: secondaryLayerEnabled ? resolvedSecondaryType : undefined,
      secondaryCategory: secondaryLayerEnabled && resolvedSecondaryType
        ? relationshipDraft.secondaryCategory
        : undefined,
      direction: relationshipDraft.direction,
      startYear: firstHistoryPhase?.fromYear ?? relationshipDraft.startYear,
      startMonth: firstHistoryPhase?.fromMonth ?? relationshipDraft.startMonth,
      endYear: latestHistoryPhase
        ? latestHistoryPhase.isCurrent
          ? undefined
          : latestHistoryPhase.toYear
        : relationshipDraft.isEnded
          ? relationshipDraft.endYear
          : undefined,
      isActive: latestHistoryPhase ? latestHistoryPhase.isCurrent : !relationshipDraft.isEnded,
      phases: historyPhases.length > 0 ? historyPhases : undefined,
      color: relationshipDraft.color || undefined,
      notes: relationshipDraft.notes.trim() || undefined,
    };

    if (
      payload.startYear !== undefined &&
      payload.endYear !== undefined &&
      payload.endYear < payload.startYear
    ) {
      setRelationshipError("End year cannot be earlier than the start year.");
      return;
    }

    if (modal.type === "relationship-edit") {
      logRelationshipDebug("submitRelationship:edit", {
        relationshipId: modal.relationship.id,
        existing: relationshipDebugSnapshot(modal.relationship),
        payload,
      });
      updateRelationship(modal.relationship.id, payload);
      closeModal();
    } else {
      const inference = inferAutoRelationships(payload, relationships);
      const fatalIssues = inference.issues.filter((issue) => issue.severity === "fatal");
      if (fatalIssues.length > 0) {
        setRelationshipError(fatalIssues.map((issue) => issue.message).join(" "));
        return;
      }

      const generatedProposals = inference.proposals;
      const proposals = generatedProposals.filter(
        (proposal) => !declinedProposalKeys.has(proposalKey(proposal)),
      );
      const warnings = inference.issues
        .filter((issue) => issue.severity === "warning")
        .map((issue) => issue.message);

      if ((!proposals || proposals.length === 0) && warnings.length === 0) {
        addRelationship(payload);
        closeModal();
      } else {
        const primaryProposal: ProposalItem = { ...payload };
        setConfirmPrimary(primaryProposal);
        setConfirmProposals(proposals.map((p) => ({ ...p })));
        setConfirmWarnings(warnings);
        setConfirmOpen(true);
      }
    }
  };

  const handleConfirmAddAll = (selected: ProposalItem[], declined: ProposalItem[]) => {
    const drafts = [
      ...(confirmPrimary ? [proposalToRelationshipInput(confirmPrimary)] : []),
      ...selected.map(proposalToRelationshipInput),
    ];
    const validationIssues = validateRelationshipDrafts(relationships, drafts);
    const fatalIssues = validationIssues.filter((issue) => issue.severity === "fatal");
    if (fatalIssues.length > 0) {
      const messages = fatalIssues.map((issue) => issue.message);
      setRelationshipError(messages.join(" "));
      setConfirmWarnings(messages);
      return;
    }

    rememberDeclinedProposals(declined);
    if (confirmPrimary) {
      addRelationship(proposalToRelationshipInput(confirmPrimary));
    }
    for (const p of selected) {
      addRelationship(proposalToRelationshipInput(p));
    }
    setConfirmOpen(false);
    setConfirmPrimary(null);
    setConfirmProposals([]);
    setConfirmWarnings([]);
    setModal({ type: "none" });
  };

  const handleAddPrimaryOnly = (_declined: ProposalItem[]) => {
    // Do NOT remember declined proposals here — the user clicked "Skip suggestions"
    // which means "just add the primary relationship now". Proposals for future
    // relationships involving these people should still surface normally.
    if (confirmPrimary) {
      addRelationship(proposalToRelationshipInput(confirmPrimary));
    }
    setConfirmOpen(false);
    setConfirmPrimary(null);
    setConfirmProposals([]);
    setConfirmWarnings([]);
    setModal({ type: "none" });
  };

  const handleCancelConfirm = () => {
    // Keep the relationship composer open so the user can revise the primary relationship.
    setConfirmOpen(false);
    setConfirmPrimary(null);
    setConfirmProposals([]);
    setConfirmWarnings([]);
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
        "secondaryCategory",
        "secondaryType",
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
        r.secondaryCategory ?? "",
        r.secondaryType ?? "",
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
          <div className="pointer-events-auto h-full overflow-y-auto border-l border-rf-border bg-rf-surface p-4 shadow-xl">
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
                <div className="mb-3 text-base text-rf-text">{capitalizeWords(selectedPerson.name)}</div>
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
                          <div className="text-sm text-rf-text">{capitalizeWords(rel.type)} · {capitalizeWords(otherName)}</div>
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
                    Add relationship for {capitalizeWords(selectedPerson.name)}
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
                    <dd>{capitalizeWords(peopleById.get(selectedRelationship.source)?.name ?? "Unknown")}</dd>
                  </div>
                  <div>
                    <dt className="text-rf-muted">Target</dt>
                    <dd>{capitalizeWords(peopleById.get(selectedRelationship.target)?.name ?? "Unknown")}</dd>
                  </div>
                  <div>
                    <dt className="text-rf-muted">Category</dt>
                    <dd>{categoryLabels[selectedRelationship.category]}</dd>
                  </div>
                  <div>
                    <dt className="text-rf-muted">Type</dt>
                    <dd>
                      <span
                        className="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium"
                        style={typeBadgeStyle(relationshipColors[selectedRelationship.category])}
                      >
                        {capitalizeWords(selectedRelationship.type)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-rf-muted">Current dynamic</dt>
                    <dd>
                      {selectedRelationship.secondaryType && selectedRelationship.secondaryCategory ? (
                        <span
                          className="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium"
                          style={typeBadgeStyle(relationshipColors[selectedRelationship.secondaryCategory])}
                        >
                          {capitalizeWords(selectedRelationship.secondaryType)}
                        </span>
                      ) : (
                        "None"
                      )}
                    </dd>
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
                  {selectedRelationshipPhases.length > 0 ? (
                    <div>
                      <dt className="text-rf-muted">Relationship history</dt>
                      <dd className="mt-2">
                        <div className="space-y-3">
                          {selectedRelationshipPhases.map((phase, index) => (
                            <div
                              key={`${selectedRelationship.id}-phase-${index}`}
                              className="grid grid-cols-[auto,1fr] gap-3"
                            >
                              <div className="flex flex-col items-center pt-1">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: relationshipColors[phase.category] }}
                                />
                                {index < selectedRelationshipPhases.length - 1 ? (
                                  <span className="mt-1 h-full w-px bg-rf-border" />
                                ) : null}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-rf-text">
                                  {capitalizeWords(phase.type)}
                                </div>
                                <div className="text-xs text-rf-muted">
                                  {formatRelationshipPhaseRange(phase)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-rf-muted">Notes</dt>
                    <dd>{selectedRelationship.notes || "No notes"}</dd>
                  </div>
                </dl>

                <RelationshipHistoryPanel
                  relationship={selectedRelationship}
                  relationshipColors={relationshipColors}
                />

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
                      }}
                      className="rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text hover:bg-rf-base"
                    >
                      Reactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        logRelationshipDebug("transitionDialog:open", {
                          selectedRelationship: relationshipDebugSnapshot(selectedRelationship),
                        });
                        const { threadId } = ensureLegacyRelationshipMigrated(selectedRelationship);
                        setTransitionContext({
                          threadId,
                          relationshipId: selectedRelationship.id,
                        });
                      }}
                      className="rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text hover:bg-rf-base"
                    >
                      Update relationship
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
                      as ended.
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs text-red-700">Year ended:</label>
                      <select
                        value={endConfirmYear}
                        onChange={(e) => setEndConfirmYear(Number(e.target.value))}
                        className="rounded border border-red-300 bg-white px-2 py-0.5 text-xs text-red-800"
                      >
                        {Array.from(
                          { length: new Date().getFullYear() - (selectedRelationship.startYear ?? 1900) + 1 },
                          (_, i) => (selectedRelationship.startYear ?? 1900) + i,
                        )
                          .reverse()
                          .map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          endRelationship(selectedRelationship.id, endConfirmYear);
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

      {transitionContext && (
        <RelationshipTransitionDialog
          threadId={transitionContext.threadId}
          relationshipId={transitionContext.relationshipId}
          onClose={() => setTransitionContext(null)}
        />
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
                  ref={personNameRef}
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitRelationship();
            }}
            className="flex max-h-[85vh] w-[640px] max-w-full flex-col overflow-hidden rounded-xl border border-rf-border bg-rf-surface shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-rf-border px-4 py-4">
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

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
                        {capitalizeWords(person.name)}
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
                        {capitalizeWords(person.name)}
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
                      const firstType = relationshipCatalog[category][0] ?? "";
                      setRelationshipDraft((d) => ({
                        ...d,
                        category,
                        typeChoice: firstType,
                        customType: "",
                      }));
                    }}
                    disabled={historyAutoFillsPrimary}
                    className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text disabled:cursor-not-allowed disabled:opacity-70"
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
                    disabled={historyAutoFillsPrimary}
                    className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {relationshipCatalog[relationshipDraft.category].map((type) => (
                      <option key={type} value={type}>
                        {capitalizeWords(type)}
                      </option>
                    ))}
                    <option value="__custom__">Custom...</option>
                  </select>
                </label>

                {relationshipDraft.typeChoice === "__custom__" && !historyAutoFillsPrimary ? (
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
                ) : null}

                {historyAutoFillsPrimary ? (
                  <p className="sm:col-span-2 -mt-1 text-xs text-rf-muted">
                    Auto-filled from your most recent history phase.
                  </p>
                ) : null}

                <div className="sm:col-span-2 rounded-lg border border-rf-border bg-rf-subtle/50 p-3">
                  <div className="text-sm font-medium text-rf-text">Start date</div>
                  <div className="mt-1 text-xs text-rf-muted">
                    {historyAutoFillsPrimary
                      ? "Pulled from the first history phase while relationship history is present."
                      : "Optional when you only need the current relationship state."}
                  </div>
                  <div className="mt-3 grid max-w-[320px] grid-cols-2 gap-3">
                    <label className="text-sm text-rf-text">
                      Year
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={relationshipDraft.startYear ?? ""}
                        onChange={(e) =>
                          setRelationshipDraft((draft) => ({
                            ...draft,
                            startYear: parseOptionalNumber(e.target.value),
                            endYear:
                              draft.endYear !== undefined &&
                              parseOptionalNumber(e.target.value) !== undefined &&
                              draft.endYear < (parseOptionalNumber(e.target.value) ?? 0)
                                ? parseOptionalNumber(e.target.value)
                                : draft.endYear,
                          }))
                        }
                        disabled={historyAutoFillsPrimary}
                        placeholder="e.g. 2018"
                        className="mt-1 w-full rounded-lg border border-rf-border bg-rf-surface px-3 py-2 text-sm text-rf-text disabled:cursor-not-allowed disabled:opacity-70"
                      />
                    </label>

                    <label className="text-sm text-rf-text">
                      Month
                      <select
                        value={relationshipDraft.startMonth ?? ""}
                        onChange={(e) =>
                          setRelationshipDraft((draft) => ({
                            ...draft,
                            startMonth: e.target.value ? Number(e.target.value) : undefined,
                          }))
                        }
                        disabled={historyAutoFillsPrimary}
                        className="mt-1 w-full rounded-lg border border-rf-border bg-rf-surface px-3 py-2 text-sm text-rf-text disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <option value="">Year only</option>
                        {MONTH_OPTIONS.map((month) => (
                          <option key={month} value={month}>
                            {month}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2 rounded-lg border border-dashed border-rf-border bg-rf-subtle/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-rf-text">Add a second layer (optional)</div>
                      <div className="text-xs text-rf-muted">
                        Use the primary type for the core relationship (e.g. Ex-Partner, Sibling) and the secondary type for how things currently stand (e.g. Friends, Estranged).
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!secondaryLayerEnabled) {
                          setSecondaryLayerEnabled(true);
                          setSecondaryLayerOpen(true);
                          return;
                        }

                        setSecondaryLayerOpen((open) => !open);
                      }}
                      className="rounded border border-rf-border bg-rf-surface px-2 py-1 text-xs text-rf-text hover:bg-rf-base"
                    >
                      {secondaryLayerOpen
                        ? "Hide layer"
                        : secondaryLayerEnabled
                          ? "Edit layer"
                          : "+ Add layer"}
                    </button>
                  </div>

                  {secondaryLayerEnabled && secondaryLayerOpen ? (
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="text-sm text-rf-text">
                        Secondary category
                        <select
                          value={relationshipDraft.secondaryCategory}
                          onChange={(e) => {
                            const secondaryCategory = e.target.value as RelationshipCategory;
                            const nextType = relationshipCatalog[secondaryCategory][0] ?? "";
                            setRelationshipDraft((d) => ({
                              ...d,
                              secondaryCategory,
                              secondaryTypeChoice: nextType,
                              secondaryCustomType: "",
                            }));
                          }}
                          className="mt-1 w-full rounded-lg border border-rf-border bg-rf-surface px-3 py-2 text-sm text-rf-text"
                        >
                          {CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                              {categoryLabels[category]}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="text-sm text-rf-text">
                        Secondary type
                        <select
                          value={relationshipDraft.secondaryTypeChoice}
                          onChange={(e) =>
                            setRelationshipDraft((d) => ({ ...d, secondaryTypeChoice: e.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-rf-border bg-rf-surface px-3 py-2 text-sm text-rf-text"
                        >
                          {relationshipCatalog[relationshipDraft.secondaryCategory].map((type) => (
                            <option key={type} value={type}>
                              {capitalizeWords(type)}
                            </option>
                          ))}
                          <option value="__custom__">Custom...</option>
                        </select>
                      </label>

                      {relationshipDraft.secondaryTypeChoice === "__custom__" ? (
                        <label className="sm:col-span-2 text-sm text-rf-text">
                          Secondary custom type
                          <input
                            value={relationshipDraft.secondaryCustomType}
                            onChange={(e) =>
                              setRelationshipDraft((d) => ({
                                ...d,
                                secondaryCustomType: e.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-rf-border bg-rf-surface px-3 py-2 text-sm text-rf-text"
                          />
                        </label>
                      ) : null}

                      <div className="sm:col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const fallbackCategory = "friend" as RelationshipCategory;
                            setRelationshipDraft((d) => ({
                              ...d,
                              secondaryCategory: fallbackCategory,
                              secondaryTypeChoice: relationshipCatalog[fallbackCategory][0] ?? "",
                              secondaryCustomType: "",
                            }));
                            setSecondaryLayerEnabled(false);
                            setSecondaryLayerOpen(false);
                          }}
                          className="rounded border border-rf-border bg-rf-surface px-2 py-1 text-xs text-rf-muted hover:bg-rf-base"
                        >
                          Clear layer
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

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

                <div className="sm:col-span-2 rounded-xl border border-rf-border bg-rf-subtle/50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-rf-text">Relationship history</div>
                      <div className="text-xs text-rf-muted">
                        Add phases from oldest to newest. Leave this empty to keep only the current relationship type and optional start date.
                      </div>
                    </div>
                  </div>

                  {relationshipDraft.phases.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {relationshipDraft.phases.map((phase, index) => {
                        const resolvedPhaseType = decodePhaseTypeKey(phase.typeKey);
                        const phaseColor = resolvedPhaseType
                          ? relationshipColors[resolvedPhaseType.category]
                          : relationshipColors[relationshipDraft.category];
                        const phaseOptionMissing = resolvedPhaseType
                          ? !relationshipCatalog[resolvedPhaseType.category].includes(resolvedPhaseType.type)
                          : false;

                        return (
                          <div
                            key={phase.id}
                            className="grid grid-cols-[auto,1fr] gap-3 rounded-lg border border-rf-border bg-rf-surface p-3"
                          >
                            <div className="flex flex-col items-center pt-1">
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: phaseColor }}
                              />
                              {index < relationshipDraft.phases.length - 1 ? (
                                <span className="mt-1 h-full w-px bg-rf-border" />
                              ) : null}
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-rf-text">
                                    {resolvedPhaseType
                                      ? capitalizeWords(resolvedPhaseType.type)
                                      : "Select a relationship type"}
                                  </div>
                                  <div className="text-xs text-rf-muted">
                                    {resolvedPhaseType
                                      ? formatRelationshipDate(phase.fromYear, phase.fromMonth, "From?")
                                      : "Add a type"}{" "}
                                    {resolvedPhaseType ? "->" : ""}{" "}
                                    {resolvedPhaseType
                                      ? phase.isCurrent
                                        ? "Present"
                                        : formatRelationshipDate(phase.toYear, phase.toMonth, "To?")
                                      : ""}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateRelationshipHistoryDraft((phases) =>
                                      phases.filter((candidate) => candidate.id !== phase.id),
                                    )
                                  }
                                  className="rounded border border-rf-border px-2 py-1 text-xs text-rf-muted hover:bg-rf-base"
                                  aria-label={`Remove history phase ${index + 1}`}
                                >
                                  x
                                </button>
                              </div>

                              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                                <label className="text-sm text-rf-text">
                                  Type
                                  <select
                                    value={phase.typeKey}
                                    onChange={(e) =>
                                      updateRelationshipHistoryDraft((phases) =>
                                        phases.map((candidate) =>
                                          candidate.id === phase.id
                                            ? { ...candidate, typeKey: e.target.value }
                                            : candidate,
                                        ),
                                      )
                                    }
                                    className="mt-1 w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text"
                                  >
                                    <option value="">Select type</option>
                                    {phaseOptionMissing && resolvedPhaseType ? (
                                      <option value={phase.typeKey}>
                                        {capitalizeWords(resolvedPhaseType.type)} ({categoryLabels[resolvedPhaseType.category]})
                                      </option>
                                    ) : null}
                                    {phaseTypeGroups.map((group) => (
                                      <optgroup
                                        key={group.category}
                                        label={categoryLabels[group.category]}
                                      >
                                        {group.types.map((type) => (
                                          <option
                                            key={encodePhaseTypeKey(group.category, type)}
                                            value={encodePhaseTypeKey(group.category, type)}
                                          >
                                            {capitalizeWords(type)}
                                          </option>
                                        ))}
                                      </optgroup>
                                    ))}
                                  </select>
                                </label>

                                <div>
                                  <div className="text-sm text-rf-text">From</div>
                                  <div className="mt-1 grid grid-cols-2 gap-2">
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      min={0}
                                      value={phase.fromYear ?? ""}
                                      onChange={(e) =>
                                        updateRelationshipHistoryDraft((phases) =>
                                          phases.map((candidate) =>
                                            candidate.id === phase.id
                                              ? {
                                                  ...candidate,
                                                  fromYear: parseOptionalNumber(e.target.value),
                                                }
                                              : candidate,
                                          ),
                                        )
                                      }
                                      placeholder="Year"
                                      className="w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text"
                                    />
                                    <select
                                      value={phase.fromMonth ?? ""}
                                      onChange={(e) =>
                                        updateRelationshipHistoryDraft((phases) =>
                                          phases.map((candidate) =>
                                            candidate.id === phase.id
                                              ? {
                                                  ...candidate,
                                                  fromMonth: e.target.value ? Number(e.target.value) : undefined,
                                                }
                                              : candidate,
                                          ),
                                        )
                                      }
                                      className="w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text"
                                    >
                                      <option value="">Month</option>
                                      {MONTH_OPTIONS.map((month) => (
                                        <option key={month} value={month}>
                                          {month}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm text-rf-text">To</div>
                                    <label className="flex items-center gap-2 text-xs text-rf-muted">
                                      <input
                                        type="checkbox"
                                        checked={phase.isCurrent}
                                        onChange={(e) =>
                                          updateRelationshipHistoryDraft((phases) =>
                                            phases.map((candidate) =>
                                              candidate.id === phase.id
                                                ? {
                                                    ...candidate,
                                                    isCurrent: e.target.checked,
                                                    toYear: e.target.checked ? undefined : candidate.toYear,
                                                    toMonth: e.target.checked ? undefined : candidate.toMonth,
                                                  }
                                                : candidate,
                                            ),
                                          )
                                        }
                                      />
                                      Present
                                    </label>
                                  </div>
                                  <div className="mt-1 grid grid-cols-2 gap-2">
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      min={0}
                                      value={phase.toYear ?? ""}
                                      onChange={(e) =>
                                        updateRelationshipHistoryDraft((phases) =>
                                          phases.map((candidate) =>
                                            candidate.id === phase.id
                                              ? {
                                                  ...candidate,
                                                  toYear: parseOptionalNumber(e.target.value),
                                                }
                                              : candidate,
                                          ),
                                        )
                                      }
                                      disabled={phase.isCurrent}
                                      placeholder="Year"
                                      className="w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text disabled:cursor-not-allowed disabled:opacity-70"
                                    />
                                    <select
                                      value={phase.toMonth ?? ""}
                                      onChange={(e) =>
                                        updateRelationshipHistoryDraft((phases) =>
                                          phases.map((candidate) =>
                                            candidate.id === phase.id
                                              ? {
                                                  ...candidate,
                                                  toMonth: e.target.value ? Number(e.target.value) : undefined,
                                                }
                                              : candidate,
                                          ),
                                        )
                                      }
                                      disabled={phase.isCurrent}
                                      className="w-full rounded-lg border border-rf-border bg-rf-subtle px-3 py-2 text-sm text-rf-text disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                      <option value="">Month</option>
                                      {MONTH_OPTIONS.map((month) => (
                                        <option key={month} value={month}>
                                          {month}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-lg border border-dashed border-rf-border bg-rf-surface/70 px-3 py-4 text-sm text-rf-muted">
                      No history phases yet. Add phases when you want to show how this relationship changed over time.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      updateRelationshipHistoryDraft((phases) => [
                        ...phases,
                        createRelationshipPhaseDraft(),
                      ])
                    }
                    className="mt-3 rounded-lg border border-rf-border bg-rf-surface px-3 py-2 text-sm text-rf-text hover:bg-rf-base"
                  >
                    + Add phase
                  </button>
                </div>

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
            </div>

            <div className="flex-shrink-0 border-t border-rf-border bg-rf-surface px-4 py-3">
              {relationshipError ? (
                <p className="mb-3 text-sm text-red-600">{relationshipError}</p>
              ) : null}

              <div className="flex justify-end gap-2">
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
            </div>
          </form>
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
          warnings={confirmWarnings}
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
    const secondaryCategory = get("secondaryCategory") as RelationshipCategory;
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
      secondaryCategory: CATEGORIES.includes(secondaryCategory)
        ? secondaryCategory
        : undefined,
      secondaryType: get("secondaryType") || undefined,
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
