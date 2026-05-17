import type {
  Person,
  Relationship,
  RelationshipCategory,
  RelationshipDirection,
} from "../../types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ProposalConfidence = "High" | "Medium" | "Low";

export interface ProposedRelationship {
  source: string;
  target: string;
  category: RelationshipCategory;
  type: string;
  direction: RelationshipDirection;
  notes?: string;
  rule: string;
  reason: string;
  confidence: ProposalConfidence;
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

/**
 * Map every recognized label (and common combined forms) to a canonical token
 * so the rule engine can use a single string comparison.
 */
const CANONICAL: Record<string, string> = {
  // bidirectional / combined legacy forms
  "parent/child": "parent",
  "aunt/uncle/niece/nephew": "aunt/uncle",
  // forward direction
  parent: "parent",
  child: "child",
  sibling: "sibling",
  spouse: "spouse",
  partner: "spouse",      // treat partner == spouse for inference
  "ex-spouse": "ex-spouse",
  "ex-partner": "ex-spouse",
  grandparent: "grandparent",
  grandchild: "grandchild",
  "aunt/uncle": "aunt/uncle",
  "niece/nephew": "niece/nephew",
  cousin: "cousin",
  "step-parent": "step-parent",
  "step-child": "step-child",
  "step-sibling": "step-sibling",
  "half-sibling": "half-sibling",
  "parent-in-law": "parent-in-law",
  "child-in-law": "child-in-law",
  "sibling-in-law": "sibling-in-law",
  "grandparent-in-law": "grandparent-in-law",
  "grandchild-in-law": "grandchild-in-law",
  // work
  manager: "manager",
  employee: "employee",
  coworker: "coworker",
  mentor: "mentor",
  mentee: "mentee",
  // social
  friend: "friend",
  "close friend": "close friend",
  "best friend": "best friend",
  acquaintance: "acquaintance",
  roommate: "roommate",
};

/** Return the canonical token for a raw type string, or the lowercased raw value if unknown. */
function canonical(raw: string): string {
  return CANONICAL[raw.trim().toLowerCase()] ?? raw.trim().toLowerCase();
}

/**
 * Directional inverse map. Symmetric types map to themselves.
 */
const INVERSE: Record<string, string> = {
  parent: "child",
  child: "parent",
  grandparent: "grandchild",
  grandchild: "grandparent",
  "aunt/uncle": "niece/nephew",
  "niece/nephew": "aunt/uncle",
  "step-parent": "step-child",
  "step-child": "step-parent",
  "parent-in-law": "child-in-law",
  "child-in-law": "parent-in-law",
  "grandparent-in-law": "grandchild-in-law",
  "grandchild-in-law": "grandparent-in-law",
  manager: "employee",
  employee: "manager",
  mentor: "mentee",
  mentee: "mentor",
  // symmetric — map to self
  sibling: "sibling",
  spouse: "spouse",
  cousin: "cousin",
  "step-sibling": "step-sibling",
  "half-sibling": "half-sibling",
  "sibling-in-law": "sibling-in-law",
  coworker: "coworker",
  friend: "friend",
  "close friend": "close friend",
  "best friend": "best friend",
  acquaintance: "acquaintance",
  roommate: "roommate",
};

// ---------------------------------------------------------------------------
// Debug logging helpers
// Enable in the browser DevTools console with: window.DEBUG_HEURISTICS = true
// ---------------------------------------------------------------------------

function hlog(scope: string, ...args: unknown[]): void {
  if (
    typeof window === "undefined" ||
    !(window as unknown as Record<string, unknown>)["DEBUG_HEURISTICS"]
  ) {
    return;
  }
  console.debug(`[Heuristics:${scope}]`, ...args);
}

// ---------------------------------------------------------------------------
// Graph query helpers
// ---------------------------------------------------------------------------

/**
 * For symmetric relationship types. Returns all people connected to `personId`
 * via any of the given types, regardless of edge direction.
 * Only use this for types where INVERSE[type] === type (sibling, spouse, etc.).
 */
function relatedByTypes(
  relationships: Relationship[],
  personId: string,
  ...types: string[]
): string[] {
  const typeSet = new Set(types.map(canonical));
  const results = new Set<string>();
  for (const r of relationships) {
    const ct = canonical(r.type);
    if (!typeSet.has(ct)) continue;
    if (r.source === personId) results.add(r.target);
    if (r.target === personId) results.add(r.source);
  }
  results.delete(personId);
  return [...results];
}

/**
 * Return people X such that `personId --role--> X` (personId is the actor).
 * For role="parent": returns personId's children.
 * For role="manager": returns personId's direct reports.
 * Also resolves the case where the edge is stored with the inverse type.
 */
function getOutgoing(
  relationships: Relationship[],
  personId: string,
  role: string,
): string[] {
  const ct = canonical(role);
  const inv = INVERSE[ct] ?? ct;
  const results = new Set<string>();
  for (const r of relationships) {
    const rt = canonical(r.type);
    // Direct: personId --role--> X
    if (rt === ct && r.source === personId) results.add(r.target);
    // Inverse-stored asymmetric: "X --inv(role)--> personId" means personId holds role over X
    // e.g., "A --child--> mom" stored, but we want children of mom (role="parent")
    if (ct !== inv && rt === inv && r.target === personId) results.add(r.source);
    // Symmetric: reverse direction also counts
    if (ct === inv && rt === ct && r.target === personId) results.add(r.source);
  }
  results.delete(personId);
  return [...results];
}

/**
 * Return people X such that `X --role--> personId` (personId is the receiver).
 * For role="parent": returns personId's parents.
 * For role="manager": returns personId's managers.
 * Also resolves the case where the edge is stored with the inverse type.
 */
function getIncoming(
  relationships: Relationship[],
  personId: string,
  role: string,
): string[] {
  const ct = canonical(role);
  const inv = INVERSE[ct] ?? ct;
  const results = new Set<string>();
  for (const r of relationships) {
    const rt = canonical(r.type);
    // Direct: X --role--> personId
    if (rt === ct && r.target === personId) results.add(r.source);
    // Inverse-stored asymmetric: "personId --inv(role)--> X" means X holds role over personId
    // e.g., "personId --child--> mom" stored, role="parent" → mom is a parent of personId
    if (ct !== inv && rt === inv && r.source === personId) results.add(r.target);
    // Symmetric: forward direction also counts
    if (ct === inv && rt === ct && r.source === personId) results.add(r.target);
  }
  results.delete(personId);
  return [...results];
}

// ---------------------------------------------------------------------------
// Duplicate-check helpers
// ---------------------------------------------------------------------------

export function createRelationshipKey(source: string, target: string, type: string): string {
  const ct = canonical(type);
  const inv = INVERSE[ct] ?? ct;
  if (ct === inv) {
    // symmetric — canonicalize pair order so A↔B == B↔A
    const [a, b] = [source, target].sort();
    return `${a}::${b}::${ct}`;
  }
  return `${source}::${target}::${ct}`;
}

function buildExistingKeys(relationships: Relationship[]): Set<string> {
  const keys = new Set<string>();
  for (const r of relationships) {
    const ct = canonical(r.type);
    const inv = INVERSE[ct] ?? ct;
    keys.add(createRelationshipKey(r.source, r.target, ct));
    keys.add(createRelationshipKey(r.target, r.source, inv));
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Proposal accumulator — tracks generated and existing keys
// ---------------------------------------------------------------------------

class ProposalAccumulator {
  private existing: Set<string>;
  private batch = new Set<string>();
  private results: ProposedRelationship[] = [];

  constructor(
    existingRelationships: Relationship[],
    primary: { source: string; target: string; type: string },
  ) {
    this.existing = buildExistingKeys(existingRelationships);
    // Mark primary as already accounted for in both directions
    const pt = canonical(primary.type);
    const pInv = INVERSE[pt] ?? pt;
    this.existing.add(createRelationshipKey(primary.source, primary.target, pt));
    this.existing.add(createRelationshipKey(primary.target, primary.source, pInv));
  }

  add(proposal: ProposedRelationship): void {
    const label = `${proposal.source} --${proposal.type}--> ${proposal.target}`;
    if (proposal.source === proposal.target) {
      hlog("propose", `REJECTED self-link: ${label}`);
      return; // no self-links
    }
    const ct = canonical(proposal.type);
    const key = createRelationshipKey(proposal.source, proposal.target, ct);
    if (this.existing.has(key)) {
      hlog("propose", `REJECTED already-exists: ${label}`);
      return; // already in graph
    }
    if (this.batch.has(key)) {
      hlog("propose", `REJECTED batch-dup: ${label}`);
      return;    // duplicate within this pass
    }

    this.batch.add(key);
    // Mark symmetric flip so we don't emit the same undirected pair twice
    const inv = INVERSE[ct] ?? ct;
    if (ct === inv) {
      this.batch.add(createRelationshipKey(proposal.target, proposal.source, inv));
    }
    hlog("propose", `ACCEPTED [${proposal.confidence}] ${label} | rule: "${proposal.rule}"`);
    this.results.push(proposal);
  }

  get proposals(): ProposedRelationship[] {
    return this.results;
  }
}

// ---------------------------------------------------------------------------
// Category / direction defaults per canonical type
// ---------------------------------------------------------------------------

const TYPE_DEFAULTS: Record<
  string,
  { category: RelationshipCategory; direction: RelationshipDirection }
> = {
  parent:               { category: "family",   direction: "one-way" },
  child:                { category: "family",   direction: "one-way" },
  sibling:              { category: "family",   direction: "two-way" },
  spouse:               { category: "romantic", direction: "two-way" },
  grandparent:          { category: "family",   direction: "one-way" },
  grandchild:           { category: "family",   direction: "one-way" },
  "aunt/uncle":         { category: "family",   direction: "one-way" },
  "niece/nephew":       { category: "family",   direction: "one-way" },
  cousin:               { category: "family",   direction: "two-way" },
  "step-parent":        { category: "family",   direction: "one-way" },
  "step-child":         { category: "family",   direction: "one-way" },
  "step-sibling":       { category: "family",   direction: "two-way" },
  "half-sibling":       { category: "family",   direction: "two-way" },
  "parent-in-law":      { category: "family",   direction: "one-way" },
  "child-in-law":       { category: "family",   direction: "one-way" },
  "sibling-in-law":     { category: "family",   direction: "two-way" },
  "grandparent-in-law": { category: "family",   direction: "one-way" },
  "grandchild-in-law":  { category: "family",   direction: "one-way" },
  manager:              { category: "work",     direction: "one-way" },
  employee:             { category: "work",     direction: "one-way" },
  coworker:             { category: "work",     direction: "two-way" },
  mentor:               { category: "other",    direction: "one-way" },
  mentee:               { category: "other",    direction: "one-way" },
  friend:               { category: "friend",   direction: "two-way" },
  "close friend":       { category: "friend",   direction: "two-way" },
  "best friend":        { category: "friend",   direction: "two-way" },
  acquaintance:         { category: "friend",   direction: "two-way" },
  roommate:             { category: "other",    direction: "two-way" },
};

function typeDefaults(type: string): { category: RelationshipCategory; direction: RelationshipDirection } {
  return TYPE_DEFAULTS[canonical(type)] ?? { category: "other", direction: "two-way" };
}

function propose(
  acc: ProposalAccumulator,
  source: string,
  target: string,
  type: string,
  reason: string,
  confidence: ProposalConfidence,
  rule = reason,
): void {
  const { category, direction } = typeDefaults(type);
  acc.add({ source, target, type, category, direction, rule, reason, confidence });
}

// ---------------------------------------------------------------------------
// Rule functions — one per relationship category
// ---------------------------------------------------------------------------

// ── FAMILY — IMMEDIATE ──────────────────────────────────────────────────────

function rulesParentChild(
  A: string,
  B: string,
  role: "parent" | "child",
  rels: Relationship[],
  acc: ProposalAccumulator,
): void {
  const parent = role === "parent" ? A : B;
  const child  = role === "parent" ? B : A;
  hlog("rulesParentChild", `parent="${parent}" child="${child}"`);

  // Parent's other children → sibling with new child
  const otherChildren = getOutgoing(rels, parent, "parent").filter((id) => id !== child);
  hlog("rulesParentChild", `${parent}'s other children:`, otherChildren.length ? otherChildren : "(none)");
  for (const sib of otherChildren) {
    propose(
      acc,
      child,
      sib,
      "sibling",
      `${parent} is also parent of ${sib}`,
      "High",
      "Shared Parent -> Sibling",
    );
  }

  // Parent's spouse/partner → parent/child with new child
  const spouses = relatedByTypes(rels, parent, "spouse");
  hlog("rulesParentChild", `${parent}'s spouses:`, spouses.length ? spouses : "(none)");
  for (const sp of spouses) {
    propose(
      acc,
      sp,
      child,
      "parent",
      `${sp} is spouse of ${parent}`,
      "High",
      "Parent's Spouse -> Other Parent",
    );
  }

  // Parent's parents → grandparent with new child
  const grandparents = getIncoming(rels, parent, "parent");
  hlog("rulesParentChild", `${parent}'s parents (= grandparents of ${child}):`, grandparents.length ? grandparents : "(none)");
  for (const gp of grandparents) {
    propose(
      acc,
      gp,
      child,
      "grandparent",
      `${gp} is parent of ${parent}`,
      "High",
      "Parent's Parent -> Grandparent",
    );
  }

  // Parent's siblings → aunt/uncle with new child
  const auntsUncles = relatedByTypes(rels, parent, "sibling");
  hlog("rulesParentChild", `${parent}'s siblings:`, auntsUncles.length ? auntsUncles : "(none)");
  for (const au of auntsUncles) {
    propose(
      acc,
      au,
      child,
      "aunt/uncle",
      `${au} is sibling of ${parent}`,
      "High",
      "Parent's Sibling -> Aunt/Uncle",
    );
  }
}

function rulesSibling(
  A: string,
  B: string,
  rels: Relationship[],
  acc: ProposalAccumulator,
): void {
  hlog("rulesSibling", `Examining ${A}'s connections to propose for ${B}`);

  // A's parents → parent with B  (core sibling rule)
  const directParents = getIncoming(rels, A, "parent");
  hlog("rulesSibling", `${A}'s parents:`, directParents.length ? directParents : "(none)");
  for (const p of directParents) {
    propose(
      acc,
      p,
      B,
      "parent",
      `${p} is parent of ${A}`,
      "High",
      "Sibling's Parent -> Shared Parent",
    );
  }

  // A's other siblings → sibling with B
  const otherSibs = relatedByTypes(rels, A, "sibling").filter((id) => id !== B);
  hlog("rulesSibling", `${A}'s other siblings:`, otherSibs.length ? otherSibs : "(none)");
  for (const sib of otherSibs) {
    propose(
      acc,
      B,
      sib,
      "sibling",
      `Both are siblings of ${A}`,
      "High",
      "Shared Sibling -> Also Sibling",
    );
  }

  // A's children → aunt/uncle from B  (B is now a sibling of their parent)
  const children = getOutgoing(rels, A, "parent");
  hlog("rulesSibling", `${A}'s children:`, children.length ? children : "(none)");
  for (const ch of children) {
    propose(
      acc,
      B,
      ch,
      "aunt/uncle",
      `${B} is sibling of ${A}`,
      "High",
      "Parent's Sibling -> Aunt/Uncle",
    );
  }
}

function rulesSpouse(
  A: string,
  B: string,
  rels: Relationship[],
  acc: ProposalAccumulator,
): void {
  hlog("rulesSpouse", `Examining ${A}'s connections to propose for ${B}`);

  // A's parents → parent-in-law with B
  const parents = getIncoming(rels, A, "parent");
  hlog("rulesSpouse", `${A}'s parents:`, parents.length ? parents : "(none)");
  for (const p of parents) {
    propose(
      acc,
      p,
      B,
      "parent-in-law",
      `${p} is parent of ${A}`,
      "High",
      "Spouse's Parent -> Parent-in-Law",
    );
  }

  // A's siblings → sibling-in-law with B
  const siblings = relatedByTypes(rels, A, "sibling");
  hlog("rulesSpouse", `${A}'s siblings:`, siblings.length ? siblings : "(none)");
  for (const sib of siblings) {
    propose(
      acc,
      sib,
      B,
      "sibling-in-law",
      `${sib} is sibling of ${A}`,
      "High",
      "Spouse's Sibling -> Sibling-in-Law",
    );
  }
}

// ── FAMILY — EXTENDED ───────────────────────────────────────────────────────

function rulesGrandparent(
  A: string,
  B: string,
  role: "grandparent" | "grandchild",
  rels: Relationship[],
  acc: ProposalAccumulator,
): void {
  const gp = role === "grandparent" ? A : B;
  const gc = role === "grandparent" ? B : A;
  hlog("rulesGrandparent", `gp="${gp}" gc="${gc}"`);

  // GP's spouse → also grandparent of gc
  const gpSpouses = relatedByTypes(rels, gp, "spouse");
  hlog("rulesGrandparent", `${gp}'s spouses:`, gpSpouses.length ? gpSpouses : "(none)");
  for (const sp of gpSpouses) {
    propose(
      acc,
      sp,
      gc,
      "grandparent",
      `${sp} is spouse of ${gp}`,
      "High",
      "Grandparent's Spouse -> Also Grandparent",
    );
  }

  // GP's other grandchildren → cousin with gc
  const otherGC = getOutgoing(rels, gp, "grandparent").filter((id) => id !== gc);
  hlog("rulesGrandparent", `${gp}'s other grandchildren:`, otherGC.length ? otherGC : "(none)");
  for (const other of otherGC) {
    propose(
      acc,
      gc,
      other,
      "cousin",
      `Both grandchildren of ${gp}`,
      "High",
      "Shared Grandparent -> Cousin",
    );
  }

  // GP's children → parent of gc  (gp's child is gc's parent)
  const gpChildren = getOutgoing(rels, gp, "parent");
  hlog("rulesGrandparent", `${gp}'s children (= ${gc}'s potential parents):`, gpChildren.length ? gpChildren : "(none)");
  for (const ch of gpChildren) {
    propose(
      acc,
      ch,
      gc,
      "parent",
      `${ch} is child of ${gp}`,
      "High",
      "Grandparent's Child -> Parent",
    );
  }
}

// ── WORK ─────────────────────────────────────────────────────────────────────

function rulesManager(
  A: string,
  B: string,
  role: "manager" | "employee",
  rels: Relationship[],
  acc: ProposalAccumulator,
): void {
  const manager  = role === "manager" ? A : B;
  const employee = role === "manager" ? B : A;
  hlog("rulesManager", `manager="${manager}" employee="${employee}"`);

  // Manager's other direct reports → coworker with new employee
  const reports = getOutgoing(rels, manager, "manager").filter((id) => id !== employee);
  hlog("rulesManager", `${manager}'s other reports:`, reports.length ? reports : "(none)");
  for (const dr of reports) {
    propose(
      acc,
      dr,
      employee,
      "coworker",
      `Both report to ${manager}`,
      "High",
      "Shared Manager -> Coworker",
    );
  }
  // No chain-of-command proposals per spec
}

// ---------------------------------------------------------------------------
// Main entrypoint — function name preserved for backward compatibility
// ---------------------------------------------------------------------------

export function useAutoRelationships(
  relationshipType: string,
  sourceId: string,
  targetId: string,
  _category: RelationshipCategory,
  _people: Person[],
  relationships: Relationship[],
): ProposedRelationship[] {
  const ct = canonical(relationshipType);

  const isDebug =
    typeof window !== "undefined" &&
    !!(window as unknown as Record<string, unknown>)["DEBUG_HEURISTICS"];

  if (isDebug) {
    console.group(`[HeuristicEngine] trigger="${ct}"  ${sourceId} → ${targetId}`);
    console.debug(
      "[Heuristics:graph]",
      `${relationships.length} existing relationship(s):`,
      relationships.length
        ? relationships.map((r) => `${r.source} --${r.type}--> ${r.target}`).join(" | ")
        : "(none)",
    );
  }

  const acc = new ProposalAccumulator(relationships, {
    source: sourceId,
    target: targetId,
    type: ct,
  });

  // Deterministic-only mode: keep just the near-certain graph-topology rules.
  switch (ct) {
    case "parent":
      rulesParentChild(sourceId, targetId, "parent", relationships, acc);
      break;
    case "child":
      rulesParentChild(sourceId, targetId, "child", relationships, acc);
      break;
    case "sibling":
      // Sibling is symmetric — examine connections from both sides
      rulesSibling(sourceId, targetId, relationships, acc);
      rulesSibling(targetId, sourceId, relationships, acc);
      break;
    case "spouse":
      rulesSpouse(sourceId, targetId, relationships, acc);
      rulesSpouse(targetId, sourceId, relationships, acc);
      break;
    case "grandparent":
      rulesGrandparent(sourceId, targetId, "grandparent", relationships, acc);
      break;
    case "grandchild":
      rulesGrandparent(sourceId, targetId, "grandchild", relationships, acc);
      break;
    case "manager":
      rulesManager(sourceId, targetId, "manager", relationships, acc);
      break;
    case "employee":
      rulesManager(sourceId, targetId, "employee", relationships, acc);
      break;
    default:
      break;
  }

  // Sort: High → Medium → Low; within same confidence sort by type name
  const order: Record<ProposalConfidence, number> = { High: 0, Medium: 1, Low: 2 };
  acc.proposals.sort((a, b) => {
    const co = order[a.confidence] - order[b.confidence];
    return co !== 0 ? co : a.type.localeCompare(b.type);
  });

  if (isDebug) {
    if (acc.proposals.length === 0) {
      console.debug("[Heuristics:result] No proposals generated.");
    } else {
      console.debug(`[Heuristics:result] ${acc.proposals.length} proposal(s):`);
      for (const p of acc.proposals) {
        console.debug(`  [${p.confidence}] ${p.source} --${p.type}--> ${p.target}  |  rule: "${p.rule}"`);
      }
    }
    console.groupEnd();
  }

  return acc.proposals;
}

export default useAutoRelationships;

