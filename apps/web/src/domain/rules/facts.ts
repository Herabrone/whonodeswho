import type { FactPredicate, RelationSubtype } from "../relations/relationKinds";

export type FactSource = "existing" | "primary" | "derived";

export interface FactReference {
  key: string;
  predicate: FactPredicate;
  args: [string, string];
  subtype?: RelationSubtype;
  source: FactSource;
  derivationDepth: number;
  relationshipId?: string;
  ruleId?: string;
}

export interface Fact {
  predicate: FactPredicate;
  args: [string, string];
  subtype?: RelationSubtype;
  source: FactSource;
  derivationDepth: number;
  relationshipId?: string;
  ruleId?: string;
  evidence?: FactReference[];
  proposalArgs?: [string, string];
}

export function factKey(fact: Pick<Fact, "predicate" | "args">): string {
  return `${fact.predicate}::${fact.args[0]}::${fact.args[1]}`;
}

export function factRef(fact: Fact): FactReference {
  return {
    key: factKey(fact),
    predicate: fact.predicate,
    args: fact.args,
    subtype: fact.subtype,
    source: fact.source,
    derivationDepth: fact.derivationDepth,
    relationshipId: fact.relationshipId,
    ruleId: fact.ruleId,
  };
}

export function sortFacts(facts: Fact[]): Fact[] {
  return [...facts].sort((a, b) => {
    const keyOrder = factKey(a).localeCompare(factKey(b));
    if (keyOrder !== 0) return keyOrder;
    return a.derivationDepth - b.derivationDepth;
  });
}

export function uniqueFacts(facts: Fact[]): Fact[] {
  const seen = new Set<string>();
  const unique: Fact[] = [];
  for (const fact of sortFacts(facts)) {
    const key = factKey(fact);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(fact);
  }
  return unique;
}

export function hasFact(facts: Fact[], candidate: Pick<Fact, "predicate" | "args">): boolean {
  const key = factKey(candidate);
  return facts.some((fact) => factKey(fact) === key);
}

export function factSet(facts: Fact[]): Set<string> {
  return new Set(facts.map(factKey));
}

export function derivedFact(
  predicate: FactPredicate,
  args: [string, string],
  ruleId: string,
  evidence: Fact[],
  derivationDepth: number,
  options: { subtype?: RelationSubtype; proposalArgs?: [string, string] } = {},
): Fact {
  return {
    predicate,
    args,
    subtype: options.subtype,
    source: "derived",
    derivationDepth,
    ruleId,
    evidence: evidence.map(factRef),
    proposalArgs: options.proposalArgs,
  };
}