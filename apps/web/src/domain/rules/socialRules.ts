import { canonicalizeRelationKind } from "../relations/relationAliases";
import type { RelationshipInput } from "../../types";
import type { RelationshipLike } from "./buildFactBase";
import type { Fact } from "./facts";
import { derivedFact, factKey, factSet } from "./facts";

function sortedPair(a: string, b: string): [string, string] {
  return [a, b].sort() as [string, string];
}

function addHubConnection(
  map: Map<string, Array<{ other: string; fact: Fact }>>,
  hub: string,
  other: string,
  fact: Fact,
): void {
  const entries = map.get(hub) ?? [];
  entries.push({ other, fact });
  map.set(hub, entries);
}

function hasFreshEvidence(evidence: Fact[], frontierKeys: Set<string>): boolean {
  return evidence.some((fact) => fact.source === "primary" || frontierKeys.has(factKey(fact)));
}

function pairKey(a: string, b: string): string {
  const [left, right] = sortedPair(a, b);
  return `${left}::${right}`;
}

function proposalArgsForPair(a: string, b: string, evidence: Fact[]): [string, string] {
  const primaryParticipant = evidence
    .filter((fact) => fact.source === "primary")
    .flatMap((fact) => fact.args)
    .find((participantId) => participantId === a || participantId === b);

  if (!primaryParticipant) {
    return [a, b];
  }

  return primaryParticipant === a ? [a, b] : [b, a];
}

function friendFacts(known: Fact[]): Fact[] {
  return known.filter((fact) => fact.predicate === "friend" && fact.derivationDepth === 0);
}

function roommateFacts(known: Fact[]): Fact[] {
  return known.filter((fact) => fact.predicate === "roommate" && fact.derivationDepth === 0);
}

function workFacts(known: Fact[]): Fact[] {
  return known.filter(
    (fact) =>
      (fact.predicate === "manages" || fact.predicate === "coworker") &&
      fact.derivationDepth === 0,
  );
}

function buildSharedNeighborMap(facts: Fact[]): Map<string, Array<{ other: string; fact: Fact }>> {
  const byHub = new Map<string, Array<{ other: string; fact: Fact }>>();

  for (const fact of facts) {
    const [first, second] = fact.args;
    addHubConnection(byHub, first, second, fact);
    addHubConnection(byHub, second, first, fact);
  }

  return byHub;
}

function deriveFriendsFromMutualFriends(known: Fact[], frontierKeys: Set<string>, depth: number): Fact[] {
  const byHub = buildSharedNeighborMap(friendFacts(known));
  const evidenceByPair = new Map<string, { pair: [string, string]; hubs: Set<string>; evidence: Fact[] }>();

  for (const [hub, connections] of byHub.entries()) {
    for (let i = 0; i < connections.length; i++) {
      for (let j = i + 1; j < connections.length; j++) {
        const first = connections[i];
        const second = connections[j];
        if (first.other === second.other) continue;

        const pair = sortedPair(first.other, second.other);
        const key = pairKey(pair[0], pair[1]);
        const current = evidenceByPair.get(key) ?? {
          pair,
          hubs: new Set<string>(),
          evidence: [],
        };

        if (current.hubs.has(hub)) continue;

        current.hubs.add(hub);
        current.evidence.push(first.fact, second.fact);
        evidenceByPair.set(key, current);
      }
    }
  }

  const derived: Fact[] = [];
  for (const entry of evidenceByPair.values()) {
    if (entry.hubs.size < 4) continue;
    if (!hasFreshEvidence(entry.evidence, frontierKeys)) continue;

    derived.push(
      derivedFact("friend", entry.pair, "mutual-friends-friend", entry.evidence, depth, {
        proposalArgs: proposalArgsForPair(entry.pair[0], entry.pair[1], entry.evidence),
      }),
    );
  }

  return derived;
}

function deriveFriendsFromSharedRoommates(known: Fact[], frontierKeys: Set<string>, depth: number): Fact[] {
  const byHub = buildSharedNeighborMap(roommateFacts(known));
  const derived: Fact[] = [];

  for (const connections of byHub.values()) {
    for (let i = 0; i < connections.length; i++) {
      for (let j = i + 1; j < connections.length; j++) {
        const first = connections[i];
        const second = connections[j];
        if (first.other === second.other) continue;

        const pair = sortedPair(first.other, second.other);
        const evidence = [first.fact, second.fact];
        if (!hasFreshEvidence(evidence, frontierKeys)) continue;

        derived.push(
          derivedFact("friend", pair, "shared-roommate-friend", evidence, depth, {
            proposalArgs: proposalArgsForPair(pair[0], pair[1], evidence),
          }),
        );
      }
    }
  }

  return derived;
}

function deriveCoworkersFromSharedWorkConnections(known: Fact[], frontierKeys: Set<string>, depth: number): Fact[] {
  const byHub = new Map<string, Array<{ other: string; fact: Fact }>>();

  for (const fact of workFacts(known)) {
    const [first, second] = fact.args;
    addHubConnection(byHub, first, second, fact);
    addHubConnection(byHub, second, first, fact);
  }

  const derived: Fact[] = [];

  for (const [hub, connections] of byHub.entries()) {
    for (let i = 0; i < connections.length; i++) {
      for (let j = i + 1; j < connections.length; j++) {
        const first = connections[i];
        const second = connections[j];
        if (first.other === second.other) continue;

        const directSharedManager =
          first.fact.predicate === "manages" &&
          second.fact.predicate === "manages" &&
          first.fact.args[0] === hub &&
          second.fact.args[0] === hub;

        const sharedReportOnly =
          first.fact.predicate === "manages" &&
          second.fact.predicate === "manages" &&
          first.fact.args[1] === hub &&
          second.fact.args[1] === hub;

        if (directSharedManager || sharedReportOnly) continue;

        const pair = sortedPair(first.other, second.other);
        const evidence = [first.fact, second.fact];
        if (!hasFreshEvidence(evidence, frontierKeys)) continue;

        derived.push(
          derivedFact("coworker", pair, "shared-work-connection-coworker", evidence, depth, {
            proposalArgs: proposalArgsForPair(pair[0], pair[1], evidence),
          }),
        );
      }
    }
  }

  return derived;
}

function romanticEvidenceFact(
  relationship: Pick<RelationshipLike | RelationshipInput, "source" | "target" | "type">,
  source: Fact["source"],
): Fact | null {
  const kind = canonicalizeRelationKind(relationship.type);
  if (kind !== "spouse" && kind !== "ex-spouse") {
    return null;
  }

  return {
    predicate: "spouse",
    args: sortedPair(relationship.source, relationship.target),
    source,
    derivationDepth: 0,
  };
}

function deriveComplicatedFromSharedRomanticHistory(
  frontierKeys: Set<string>,
  depth: number,
  existingRelationships: RelationshipLike[],
  primary: RelationshipInput,
): Fact[] {
  const evidenceFacts = [
    ...existingRelationships
      .map((relationship) => romanticEvidenceFact(relationship, "existing"))
      .filter((fact): fact is Fact => Boolean(fact)),
    ...[romanticEvidenceFact(primary, "primary")].filter((fact): fact is Fact => Boolean(fact)),
  ];

  const byHub = buildSharedNeighborMap(evidenceFacts);
  const derived: Fact[] = [];

  for (const connections of byHub.values()) {
    for (let i = 0; i < connections.length; i++) {
      for (let j = i + 1; j < connections.length; j++) {
        const first = connections[i];
        const second = connections[j];
        if (first.other === second.other) continue;

        const pair = sortedPair(first.other, second.other);
        const evidence = [first.fact, second.fact];
        if (!hasFreshEvidence(evidence, frontierKeys)) continue;

        derived.push(
          derivedFact("complicated", pair, "shared-romantic-history-complicated", evidence, depth, {
            proposalArgs: proposalArgsForPair(pair[0], pair[1], evidence),
          }),
        );
      }
    }
  }

  return derived;
}

export function applySocialRules(
  known: Fact[],
  frontier: Fact[],
  depth: number,
  existingRelationships: RelationshipLike[],
  primary: RelationshipInput,
): Fact[] {
  const frontierKeys = factSet(frontier);
  return [
    ...deriveFriendsFromMutualFriends(known, frontierKeys, depth),
    ...deriveCoworkersFromSharedWorkConnections(known, frontierKeys, depth),
    ...deriveComplicatedFromSharedRomanticHistory(frontierKeys, depth, existingRelationships, primary),
    ...deriveFriendsFromSharedRoommates(known, frontierKeys, depth),
  ];
}