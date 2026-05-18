import type { Person, Relationship } from "../types";
import {
  getFamilyRelationKind,
  isFamilyRelationship,
} from "../domain/family/familyRelationshipTypes";

export type FamilyGenerationRole =
  | "root"
  | "sibling"
  | "parent"
  | "grandparent"
  | "child"
  | "grandchild"
  | "spouse"
  | "other-family";

export type FamilyGenerationNode = {
  personId: string;
  generation: number;
  role: FamilyGenerationRole;
  sortKey: string;
};

export type FamilyGenerationLayoutResult = {
  hasFamily: boolean;
  generationByPersonId: Map<string, number>;
  roleByPersonId: Map<string, FamilyGenerationNode["role"]>;
  primaryFamilyEdgeIds: Set<string>;
  secondaryFamilyEdgeIds: Set<string>;
  semanticFamilyPersonIds: Set<string>;
  relatedFamilyPersonIds: Set<string>;
};

type Assignment = {
  generation: number;
  role: FamilyGenerationRole;
  priority: number;
};

const ROLE_PRIORITY: Record<FamilyGenerationRole, number> = {
  root: 0,
  parent: 1,
  child: 1,
  sibling: 2,
  spouse: 3,
  grandparent: 4,
  grandchild: 4,
  "other-family": 5,
};

type AdjacencyMap = Map<string, Set<string>>;
type EdgeIdMap = Map<string, string[]>;

function pairKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function directedKey(a: string, b: string): string {
  return `${a}::${b}`;
}

function ensureSet(map: AdjacencyMap, key: string): Set<string> {
  const existing = map.get(key);
  if (existing) return existing;
  const created = new Set<string>();
  map.set(key, created);
  return created;
}

function addAdjacency(map: AdjacencyMap, from: string, to: string): void {
  ensureSet(map, from).add(to);
}

function addEdgeId(map: EdgeIdMap, key: string, edgeId: string): void {
  const existing = map.get(key);
  if (existing) {
    existing.push(edgeId);
    return;
  }
  map.set(key, [edgeId]);
}

function markEdgeIds(target: Set<string>, map: EdgeIdMap, key: string): void {
  for (const edgeId of map.get(key) ?? []) {
    target.add(edgeId);
  }
}

function compareAssignments(candidate: Assignment, current: Assignment): boolean {
  if (candidate.priority !== current.priority) {
    return candidate.priority < current.priority;
  }

  const candidateDistance = Math.abs(candidate.generation);
  const currentDistance = Math.abs(current.generation);
  if (candidateDistance !== currentDistance) {
    return candidateDistance < currentDistance;
  }

  return false;
}

function assignNode(
  assignments: Map<string, Assignment>,
  personId: string,
  generation: number,
  role: FamilyGenerationRole,
): void {
  const candidate: Assignment = {
    generation,
    role,
    priority: ROLE_PRIORITY[role],
  };
  const current = assignments.get(personId);
  if (!current || compareAssignments(candidate, current)) {
    assignments.set(personId, candidate);
  }
}

function buildSortKey(peopleById: Map<string, Person>, personId: string): string {
  return peopleById.get(personId)?.name.toLowerCase() ?? personId;
}

export function buildFamilyGenerationLayout(
  people: Person[],
  relationships: Relationship[],
  rootId: string,
): FamilyGenerationLayoutResult {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const generationByPersonId = new Map<string, number>();
  const roleByPersonId = new Map<string, FamilyGenerationRole>();
  const primaryFamilyEdgeIds = new Set<string>();
  const secondaryFamilyEdgeIds = new Set<string>();
  const semanticFamilyPersonIds = new Set<string>();
  const relatedFamilyPersonIds = new Set<string>();

  if (!peopleById.has(rootId)) {
    return {
      hasFamily: false,
      generationByPersonId,
      roleByPersonId,
      primaryFamilyEdgeIds,
      secondaryFamilyEdgeIds,
      semanticFamilyPersonIds,
      relatedFamilyPersonIds,
    };
  }

  const assignments = new Map<string, Assignment>();
  const parentsOf = new Map<string, Set<string>>();
  const childrenOf = new Map<string, Set<string>>();
  const siblingsOf = new Map<string, Set<string>>();
  const spousesOf = new Map<string, Set<string>>();
  const familyPeersOf = new Map<string, Set<string>>();
  const parentEdgeIds = new Map<string, string[]>();
  const siblingEdgeIds = new Map<string, string[]>();
  const spouseEdgeIds = new Map<string, string[]>();
  const familyEdgeIdsByPair = new Map<string, string[]>();

  assignNode(assignments, rootId, 0, "root");

  for (const relationship of relationships) {
    if (!peopleById.has(relationship.source) || !peopleById.has(relationship.target)) continue;
    if (!isFamilyRelationship(relationship)) continue;

    relatedFamilyPersonIds.add(relationship.source);
    relatedFamilyPersonIds.add(relationship.target);
    addEdgeId(familyEdgeIdsByPair, pairKey(relationship.source, relationship.target), relationship.id);

    const sourceKind = getFamilyRelationKind(relationship, relationship.source);
    const targetKind = getFamilyRelationKind(relationship, relationship.target);

    if (sourceKind === "child" && targetKind === "parent") {
      addAdjacency(childrenOf, relationship.source, relationship.target);
      addAdjacency(parentsOf, relationship.target, relationship.source);
      addEdgeId(parentEdgeIds, directedKey(relationship.source, relationship.target), relationship.id);
      continue;
    }

    if (sourceKind === "parent" && targetKind === "child") {
      addAdjacency(parentsOf, relationship.source, relationship.target);
      addAdjacency(childrenOf, relationship.target, relationship.source);
      addEdgeId(parentEdgeIds, directedKey(relationship.target, relationship.source), relationship.id);
      continue;
    }

    if (sourceKind === "sibling" && targetKind === "sibling") {
      addAdjacency(siblingsOf, relationship.source, relationship.target);
      addAdjacency(siblingsOf, relationship.target, relationship.source);
      addEdgeId(siblingEdgeIds, pairKey(relationship.source, relationship.target), relationship.id);
      continue;
    }

    if (
      (sourceKind === "spouse" || sourceKind === "partner") &&
      (targetKind === "spouse" || targetKind === "partner")
    ) {
      addAdjacency(spousesOf, relationship.source, relationship.target);
      addAdjacency(spousesOf, relationship.target, relationship.source);
      addEdgeId(spouseEdgeIds, pairKey(relationship.source, relationship.target), relationship.id);
      continue;
    }

    addAdjacency(familyPeersOf, relationship.source, relationship.target);
    addAdjacency(familyPeersOf, relationship.target, relationship.source);
  }

  const rootParents = [...(parentsOf.get(rootId) ?? [])].sort((a, b) =>
    buildSortKey(peopleById, a).localeCompare(buildSortKey(peopleById, b)),
  );
  const rootChildren = [...(childrenOf.get(rootId) ?? [])].sort((a, b) =>
    buildSortKey(peopleById, a).localeCompare(buildSortKey(peopleById, b)),
  );
  const rootSiblings = new Set<string>(siblingsOf.get(rootId) ?? []);
  const rootSpouses = new Set<string>(spousesOf.get(rootId) ?? []);

  for (const parentId of rootParents) {
    if (parentId === rootId) continue;
    assignNode(assignments, parentId, 1, "parent");
    markEdgeIds(primaryFamilyEdgeIds, parentEdgeIds, directedKey(parentId, rootId));

    const grandparents = [...(parentsOf.get(parentId) ?? [])].sort((a, b) =>
      buildSortKey(peopleById, a).localeCompare(buildSortKey(peopleById, b)),
    );
    for (const grandparentId of grandparents) {
      if (grandparentId === rootId) continue;
      assignNode(assignments, grandparentId, 2, "grandparent");
      markEdgeIds(primaryFamilyEdgeIds, parentEdgeIds, directedKey(grandparentId, parentId));
    }

    const siblingCandidates = [...(childrenOf.get(parentId) ?? [])].sort((a, b) =>
      buildSortKey(peopleById, a).localeCompare(buildSortKey(peopleById, b)),
    );
    for (const siblingId of siblingCandidates) {
      if (siblingId === rootId) continue;
      rootSiblings.add(siblingId);
      assignNode(assignments, siblingId, 0, "sibling");
      markEdgeIds(primaryFamilyEdgeIds, parentEdgeIds, directedKey(parentId, siblingId));
    }
  }

  for (const childId of rootChildren) {
    if (childId === rootId) continue;
    assignNode(assignments, childId, -1, "child");
    markEdgeIds(primaryFamilyEdgeIds, parentEdgeIds, directedKey(rootId, childId));

    const grandchildren = [...(childrenOf.get(childId) ?? [])].sort((a, b) =>
      buildSortKey(peopleById, a).localeCompare(buildSortKey(peopleById, b)),
    );
    for (const grandchildId of grandchildren) {
      if (grandchildId === rootId) continue;
      assignNode(assignments, grandchildId, -2, "grandchild");
      markEdgeIds(primaryFamilyEdgeIds, parentEdgeIds, directedKey(childId, grandchildId));
    }
  }

  for (const siblingId of [...rootSiblings].sort((a, b) =>
    buildSortKey(peopleById, a).localeCompare(buildSortKey(peopleById, b)),
  )) {
    assignNode(assignments, siblingId, 0, "sibling");
    markEdgeIds(primaryFamilyEdgeIds, siblingEdgeIds, pairKey(rootId, siblingId));
  }

  for (const spouseId of [...rootSpouses].sort((a, b) =>
    buildSortKey(peopleById, a).localeCompare(buildSortKey(peopleById, b)),
  )) {
    if (spouseId === rootId) continue;
    assignNode(assignments, spouseId, 0, "spouse");
    markEdgeIds(primaryFamilyEdgeIds, spouseEdgeIds, pairKey(rootId, spouseId));
  }

  for (const relationship of relationships) {
    if (!isFamilyRelationship(relationship)) continue;

    const fromRoot = getFamilyRelationKind(relationship, rootId);
    const otherId = relationship.source === rootId ? relationship.target : relationship.target === rootId ? relationship.source : null;
    if (!otherId) continue;

    switch (fromRoot) {
      case "grandparent":
        assignNode(assignments, otherId, 2, "grandparent");
        secondaryFamilyEdgeIds.add(relationship.id);
        break;
      case "grandchild":
        assignNode(assignments, otherId, -2, "grandchild");
        secondaryFamilyEdgeIds.add(relationship.id);
        break;
      case "uncle_aunt":
      case "niece_nephew":
      case "cousin":
      case "in_law":
      case "unknown_family":
        assignNode(assignments, otherId, 0, "other-family");
        secondaryFamilyEdgeIds.add(relationship.id);
        break;
      default:
        break;
    }
  }

  for (const relationship of relationships) {
    if (!isFamilyRelationship(relationship)) continue;
    if (primaryFamilyEdgeIds.has(relationship.id)) continue;

    const key = pairKey(relationship.source, relationship.target);
    const touchesSemanticPair = assignments.has(relationship.source) || assignments.has(relationship.target);
    const hasExplicitFamilyPair = (familyEdgeIdsByPair.get(key)?.length ?? 0) > 0;
    if (touchesSemanticPair || hasExplicitFamilyPair) {
      secondaryFamilyEdgeIds.add(relationship.id);
    }
  }

  for (const [personId, assignment] of assignments) {
    generationByPersonId.set(personId, assignment.generation);
    roleByPersonId.set(personId, assignment.role);
    if (assignment.role !== "other-family") {
      semanticFamilyPersonIds.add(personId);
    }
  }

  if (relatedFamilyPersonIds.size === 0) {
    relatedFamilyPersonIds.add(rootId);
  }

  return {
    hasFamily: relatedFamilyPersonIds.size > 1,
    generationByPersonId,
    roleByPersonId,
    primaryFamilyEdgeIds,
    secondaryFamilyEdgeIds,
    semanticFamilyPersonIds,
    relatedFamilyPersonIds,
  };
}