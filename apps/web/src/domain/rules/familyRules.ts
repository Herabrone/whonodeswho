import type { Fact } from "./facts";
import { derivedFact, factKey, factSet } from "./facts";

function sortedPair(a: string, b: string): [string, string] {
  return [a, b].sort() as [string, string];
}

function hasFrontierEvidence(evidence: Fact[], frontierKeys: Set<string>): boolean {
  return evidence.some((fact) => frontierKeys.has(factKey(fact)));
}

function parentsByChild(facts: Fact[]): Map<string, Fact[]> {
  const map = new Map<string, Fact[]>();
  for (const fact of facts.filter((item) => item.predicate === "parent")) {
    const list = map.get(fact.args[1]) ?? [];
    list.push(fact);
    map.set(fact.args[1], list);
  }
  return map;
}

function siblings(facts: Fact[]): Fact[] {
  return facts.filter((fact) => fact.predicate === "sibling");
}

function parentsOf(childId: string, parentMap: Map<string, Fact[]>): Fact[] {
  return parentMap.get(childId) ?? [];
}

function hasParent(parentMap: Map<string, Fact[]>, parentId: string, childId: string): boolean {
  return parentsOf(childId, parentMap).some((fact) => fact.args[0] === parentId);
}

function emit(
  facts: Fact[],
  frontierKeys: Set<string>,
  fact: Fact,
  evidence: Fact[],
): void {
  if (fact.args[0] === fact.args[1]) return;
  if (!hasFrontierEvidence(evidence, frontierKeys)) return;
  facts.push(fact);
}

function deriveSiblingsFromParents(known: Fact[], frontierKeys: Set<string>, depth: number): Fact[] {
  const derived: Fact[] = [];
  const parentMap = parentsByChild(known);
  const children = [...parentMap.keys()].sort();

  for (let i = 0; i < children.length; i++) {
    for (let j = i + 1; j < children.length; j++) {
      const firstChild = children[i];
      const secondChild = children[j];
      const firstParents = parentsOf(firstChild, parentMap);
      const secondParents = parentsOf(secondChild, parentMap);
      const sharedParents = firstParents
        .map((parentFact) => ({
          first: parentFact,
          second: secondParents.find((candidate) => candidate.args[0] === parentFact.args[0]),
        }))
        .filter((pair): pair is { first: Fact; second: Fact } => Boolean(pair.second));

      if (sharedParents.length === 0) continue;

      const evidence = sharedParents.flatMap((pair) => [pair.first, pair.second]);
      const primaryChild = evidence.find((fact) => fact.source === "primary")?.args[1];
      const proposalArgs = primaryChild
        ? ([primaryChild, primaryChild === firstChild ? secondChild : firstChild] as [string, string])
        : ([firstChild, secondChild] as [string, string]);
      const subtype = sharedParents.length >= 2 ? "full" : "unknown";
      emit(
        derived,
        frontierKeys,
        derivedFact(
          "sibling",
          sortedPair(firstChild, secondChild),
          subtype === "full" ? "shared-parent-full-sibling" : "shared-parent-sibling",
          evidence,
          depth,
          { subtype, proposalArgs },
        ),
        evidence,
      );
    }
  }

  return derived;
}

function deriveParentsFromSiblings(known: Fact[], frontierKeys: Set<string>, depth: number): Fact[] {
  const derived: Fact[] = [];
  const parentMap = parentsByChild(known);

  for (const sibling of siblings(known)) {
    if (sibling.subtype === "step") continue;
    const [first, second] = sibling.args;
    const firstParents = parentsOf(first, parentMap);
    const secondParents = parentsOf(second, parentMap);
    const sharedParentIds = new Set(
      firstParents
        .map((fact) => fact.args[0])
        .filter((parentId) => secondParents.some((fact) => fact.args[0] === parentId)),
    );
    if (sibling.subtype === "half" && sharedParentIds.size > 0) continue;
    const ruleId = sibling.subtype === "half"
      ? "half-sibling-shared-parent"
      : sibling.subtype === "full"
        ? "full-sibling-parent-shared"
        : "sibling-parent-shared";

    for (const parentFact of firstParents) {
      if (hasParent(parentMap, parentFact.args[0], second)) continue;
      emit(
        derived,
        frontierKeys,
        derivedFact(
          "parent",
          [parentFact.args[0], second],
          ruleId,
          [sibling, parentFact],
          depth,
          { proposalArgs: [parentFact.args[0], second] },
        ),
        [sibling, parentFact],
      );
    }

    for (const parentFact of secondParents) {
      if (hasParent(parentMap, parentFact.args[0], first)) continue;
      emit(
        derived,
        frontierKeys,
        derivedFact(
          "parent",
          [parentFact.args[0], first],
          ruleId,
          [sibling, parentFact],
          depth,
          { proposalArgs: [parentFact.args[0], first] },
        ),
        [sibling, parentFact],
      );
    }
  }

  return derived;
}

function deriveSiblingsFromSharedSiblings(known: Fact[], frontierKeys: Set<string>, depth: number): Fact[] {
  const derived: Fact[] = [];
  const siblingList = siblings(known).filter((fact) => fact.subtype !== "step" && fact.subtype !== "half");

  for (let i = 0; i < siblingList.length; i++) {
    for (let j = i + 1; j < siblingList.length; j++) {
      const first = siblingList[i];
      const second = siblingList[j];
      const shared = first.args.find((personId) => second.args.includes(personId));
      if (!shared) continue;
      const otherFirst = first.args.find((personId) => personId !== shared)!;
      const otherSecond = second.args.find((personId) => personId !== shared)!;
      if (otherFirst === otherSecond) continue;
      const subtype = first.subtype === "full" && second.subtype === "full" ? "full" : "unknown";
      emit(
        derived,
        frontierKeys,
        derivedFact(
          "sibling",
          sortedPair(otherFirst, otherSecond),
          "shared-sibling-also-sibling",
          [first, second],
          depth,
          { subtype, proposalArgs: [otherFirst, otherSecond] },
        ),
        [first, second],
      );
    }
  }

  return derived;
}

function deriveGrandparents(known: Fact[], frontierKeys: Set<string>, depth: number): Fact[] {
  const derived: Fact[] = [];
  const parentFacts = known.filter((fact) => fact.predicate === "parent");

  for (const parent of parentFacts) {
    for (const childParent of parentFacts) {
      if (parent.args[1] !== childParent.args[0]) continue;
      emit(
        derived,
        frontierKeys,
        derivedFact(
          "grandparent",
          [parent.args[0], childParent.args[1]],
          "parent-chain-grandparent",
          [parent, childParent],
          depth,
          { proposalArgs: [parent.args[0], childParent.args[1]] },
        ),
        [parent, childParent],
      );
    }
  }

  return derived;
}

function deriveAuntsUncles(known: Fact[], frontierKeys: Set<string>, depth: number): Fact[] {
  const derived: Fact[] = [];
  const parentFacts = known.filter((fact) => fact.predicate === "parent");

  for (const sibling of siblings(known)) {
    if (sibling.subtype === "step") continue;
    const [first, second] = sibling.args;
    for (const parent of parentFacts) {
      if (parent.args[0] === first) {
        emit(
          derived,
          frontierKeys,
          derivedFact("auntUncle", [second, parent.args[1]], "parent-sibling-aunt-uncle", [sibling, parent], depth, {
            proposalArgs: [second, parent.args[1]],
          }),
          [sibling, parent],
        );
      }
      if (parent.args[0] === second) {
        emit(
          derived,
          frontierKeys,
          derivedFact("auntUncle", [first, parent.args[1]], "parent-sibling-aunt-uncle", [sibling, parent], depth, {
            proposalArgs: [first, parent.args[1]],
          }),
          [sibling, parent],
        );
      }
    }
  }

  return derived;
}

function deriveCousinsFromSiblingParents(known: Fact[], frontierKeys: Set<string>, depth: number): Fact[] {
  const derived: Fact[] = [];
  const parentMap = parentsByChild(known);

  for (const sibling of siblings(known)) {
    if (sibling.subtype === "step") continue;
    const [firstParent, secondParent] = sibling.args;
    const firstChildren = [...parentMap.entries()].filter(([, parents]) => parents.some((parent) => parent.args[0] === firstParent));
    const secondChildren = [...parentMap.entries()].filter(([, parents]) => parents.some((parent) => parent.args[0] === secondParent));

    for (const [firstChild, firstChildParents] of firstChildren) {
      for (const [secondChild, secondChildParents] of secondChildren) {
        if (firstChild === secondChild) continue;
        const firstEvidence = firstChildParents.find((parent) => parent.args[0] === firstParent);
        const secondEvidence = secondChildParents.find((parent) => parent.args[0] === secondParent);
        if (!firstEvidence || !secondEvidence) continue;
        emit(
          derived,
          frontierKeys,
          derivedFact("cousin", sortedPair(firstChild, secondChild), "sibling-parents-cousin", [sibling, firstEvidence, secondEvidence], depth, {
            proposalArgs: [firstChild, secondChild],
          }),
          [sibling, firstEvidence, secondEvidence],
        );
      }
    }
  }

  return derived;
}

function deriveSpousesFromSharedChildren(known: Fact[], frontierKeys: Set<string>, depth: number): Fact[] {
  const derived: Fact[] = [];
  const parentMap = parentsByChild(known);

  for (const parentFacts of parentMap.values()) {
    for (let i = 0; i < parentFacts.length; i++) {
      for (let j = i + 1; j < parentFacts.length; j++) {
        const first = parentFacts[i];
        const second = parentFacts[j];
        const evidence = [first, second];
        if (!evidence.some((fact) => fact.source === "primary")) continue;
        const primaryParent = evidence.find((fact) => fact.source === "primary")?.args[0];
        const otherParent = evidence.find((fact) => fact.source !== "primary")?.args[0];
        const proposalArgs = otherParent && primaryParent
          ? ([otherParent, primaryParent] as [string, string])
          : ([first.args[0], second.args[0]] as [string, string]);

        emit(
          derived,
          frontierKeys,
          derivedFact(
            "spouse",
            sortedPair(first.args[0], second.args[0]),
            "shared-child-spouse",
            evidence,
            depth,
            { proposalArgs },
          ),
          evidence,
        );
      }
    }
  }

  return derived;
}

function deriveSpouseInLaws(known: Fact[], frontierKeys: Set<string>, depth: number): Fact[] {
  const derived: Fact[] = [];
  const spouseFacts = known.filter((fact) => fact.predicate === "spouse");
  const parentFacts = known.filter((fact) => fact.predicate === "parent");

  for (const spouse of spouseFacts) {
    const [first, second] = spouse.args;
    for (const parent of parentFacts) {
      if (parent.args[1] === first) {
        emit(
          derived,
          frontierKeys,
          derivedFact("parentInLaw", [parent.args[0], second], "spouse-parent-in-law", [spouse, parent], depth, {
            proposalArgs: [parent.args[0], second],
          }),
          [spouse, parent],
        );
      }
      if (parent.args[1] === second) {
        emit(
          derived,
          frontierKeys,
          derivedFact("parentInLaw", [parent.args[0], first], "spouse-parent-in-law", [spouse, parent], depth, {
            proposalArgs: [parent.args[0], first],
          }),
          [spouse, parent],
        );
      }
    }

    for (const sibling of siblings(known)) {
      if (sibling.subtype === "step") continue;
      if (sibling.args.includes(first)) {
        const siblingId = sibling.args.find((personId) => personId !== first)!;
        emit(
          derived,
          frontierKeys,
          derivedFact("siblingInLaw", sortedPair(siblingId, second), "spouse-sibling-in-law", [spouse, sibling], depth, {
            proposalArgs: [siblingId, second],
          }),
          [spouse, sibling],
        );
      }
      if (sibling.args.includes(second)) {
        const siblingId = sibling.args.find((personId) => personId !== second)!;
        emit(
          derived,
          frontierKeys,
          derivedFact("siblingInLaw", sortedPair(siblingId, first), "spouse-sibling-in-law", [spouse, sibling], depth, {
            proposalArgs: [siblingId, first],
          }),
          [spouse, sibling],
        );
      }
    }
  }

  return derived;
}

function deriveGrandparentRules(known: Fact[], frontierKeys: Set<string>, depth: number): Fact[] {
  const derived: Fact[] = [];
  const grandparents = known.filter((fact) => fact.predicate === "grandparent");
  const spouses = known.filter((fact) => fact.predicate === "spouse");
  const parents = known.filter((fact) => fact.predicate === "parent");

  for (const grandparent of grandparents) {
    for (const spouse of spouses) {
      if (spouse.args.includes(grandparent.args[0])) {
        const spouseId = spouse.args.find((personId) => personId !== grandparent.args[0])!;
        emit(
          derived,
          frontierKeys,
          derivedFact("grandparent", [spouseId, grandparent.args[1]], "grandparent-spouse", [grandparent, spouse], depth, {
            proposalArgs: [spouseId, grandparent.args[1]],
          }),
          [grandparent, spouse],
        );
      }
    }

    for (const parent of parents) {
      if (parent.args[0] !== grandparent.args[0]) continue;
      emit(
        derived,
        frontierKeys,
        derivedFact("parent", [parent.args[1], grandparent.args[1]], "grandparent-child-parent", [grandparent, parent], depth, {
          proposalArgs: [parent.args[1], grandparent.args[1]],
        }),
        [grandparent, parent],
      );
    }
  }

  for (let i = 0; i < grandparents.length; i++) {
    for (let j = i + 1; j < grandparents.length; j++) {
      const first = grandparents[i];
      const second = grandparents[j];
      if (first.args[0] !== second.args[0] || first.args[1] === second.args[1]) continue;
      emit(
        derived,
        frontierKeys,
        derivedFact("cousin", sortedPair(first.args[1], second.args[1]), "shared-grandparent-cousin", [first, second], depth, {
          proposalArgs: [first.args[1], second.args[1]],
        }),
        [first, second],
      );
    }
  }

  return derived;
}

export function applyFamilyRules(known: Fact[], frontier: Fact[], depth: number): Fact[] {
  const frontierKeys = factSet(frontier);
  return [
    ...deriveSiblingsFromParents(known, frontierKeys, depth),
    ...deriveParentsFromSiblings(known, frontierKeys, depth),
    ...deriveSiblingsFromSharedSiblings(known, frontierKeys, depth),
    ...deriveGrandparents(known, frontierKeys, depth),
    ...deriveAuntsUncles(known, frontierKeys, depth),
    ...deriveCousinsFromSiblingParents(known, frontierKeys, depth),
    ...deriveSpousesFromSharedChildren(known, frontierKeys, depth),
    ...deriveSpouseInLaws(known, frontierKeys, depth),
    ...deriveGrandparentRules(known, frontierKeys, depth),
  ];
}