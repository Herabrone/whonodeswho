import type { EpisodeKind } from "../../types";
import { TRANSITION_MAP, type TransitionOption } from "./transitionTypes";

export const ALLOWED_EPISODE_KINDS: ReadonlySet<EpisodeKind> = new Set<EpisodeKind>([
  "coworker",
  "manager",
  "employee",
  "friend",
  "close_friend",
  "romantic_partner",
  "spouse",
  "ex_partner",
  "estranged",
  "no_contact",
  "rival",
  "enemy",
  "frenemy",
  "betrayed",
  "traitor",
  "on_bad_terms",
  "complicated",
  "family",
  "classmate",
  "roommate",
  "custom",
]);

/** Returns the contextually filtered transition options for a given episode kind. */
export function getAvailableTransitions(kind: EpisodeKind): TransitionOption[] {
  return TRANSITION_MAP[kind] ?? [];
}

/** Returns true when the value is a recognised EpisodeKind. */
export function isValidEpisodeKind(value: string): value is EpisodeKind {
  return ALLOWED_EPISODE_KINDS.has(value as EpisodeKind);
}

/** All episode kinds as an ordered array, for the "More options" grid. */
export const ALL_EPISODE_KINDS: EpisodeKind[] = [
  "romantic_partner",
  "spouse",
  "ex_partner",
  "estranged",
  "no_contact",
  "rival",
  "enemy",
  "frenemy",
  "betrayed",
  "traitor",
  "on_bad_terms",
  "complicated",
  "close_friend",
  "friend",
  "family",
  "coworker",
  "manager",
  "employee",
  "classmate",
  "roommate",
  "custom",
];
