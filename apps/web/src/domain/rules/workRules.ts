import type { Fact } from "./facts";
import { derivedFact, factKey, factSet } from "./facts";

function sortedPair(a: string, b: string): [string, string] {
  return [a, b].sort() as [string, string];
}

export function applyWorkRules(known: Fact[], frontier: Fact[], depth: number): Fact[] {
  const frontierKeys = factSet(frontier);
  const derived: Fact[] = [];
  const manages = known.filter((fact) => fact.predicate === "manages");

  for (let i = 0; i < manages.length; i++) {
    for (let j = i + 1; j < manages.length; j++) {
      const first = manages[i];
      const second = manages[j];
      if (first.args[0] !== second.args[0] || first.args[1] === second.args[1]) continue;
      if (!frontierKeys.has(factKey(first)) && !frontierKeys.has(factKey(second))) continue;
      const existingReport = first.source === "primary" ? second.args[1] : first.args[1];
      const newReport = first.source === "primary" ? first.args[1] : second.args[1];
      derived.push(
        derivedFact(
          "coworker",
          sortedPair(first.args[1], second.args[1]),
          "shared-manager-coworker",
          [first, second],
          depth,
          { proposalArgs: [existingReport, newReport] },
        ),
      );
    }
  }

  return derived;
}