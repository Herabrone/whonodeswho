import type { EpisodeKind } from "../../types";

export interface TransitionOption {
  id: string;
  label: string;
  description: string;
  /** The episode kind that will end. Always the current episode. */
  endsKind: EpisodeKind;
  /**
   * The new episode kind to open at the same date, if any.
   * Absent for "ended, no continuation" options.
   */
  startsKind?: EpisodeKind;
  /** A follow-up question to ask before completing the transition. */
  followUp?: "friend_level" | "confirm_date" | "add_note";
}

export interface TransitionOutcome {
  /** The episode being closed. */
  closedEpisodeId: string;
  /** The date at which the transition occurred (ISO date, YYYY-MM-DD). */
  transitionDate: string;
  /**
   * Optional start date for the episode being closed, if it needs correction.
   * If provided, the closed episode's startDate will be updated to this value.
   */
  correctedStartDate?: string;
  /**
   * A new episode to open at the transition date, if the relationship
   * continues in a different form.
   */
  newEpisode?: {
    kind: EpisodeKind;
    certainty: "exact" | "approximate";
    notes?: string;
  };
  /** An optional milestone event to record at the transition date. */
  event?: {
    type: "milestone" | "custom";
    title: string;
  };
}

export type TransitionResult =
  | { ok: true; warning?: string }
  | { ok: false; error: string };

export const TRANSITION_MAP: Record<EpisodeKind, TransitionOption[]> = {
  romantic_partner: [
    {
      id: "partner_to_spouse",
      label: "Got married",
      description: "Becomes a spouse relationship from this date.",
      endsKind: "romantic_partner",
      startsKind: "spouse",
    },
    {
      id: "partner_ended_friends",
      label: "Broke up — stayed friends",
      description: "The romantic relationship ends and a friendship begins.",
      endsKind: "romantic_partner",
      startsKind: "friend",
      followUp: "friend_level",
    },
    {
      id: "partner_ended",
      label: "Broke up",
      description: "The relationship ended. No ongoing connection.",
      endsKind: "romantic_partner",
      startsKind: "ex_partner",
    },
  ],

  spouse: [
    {
      id: "spouse_ended_friends",
      label: "Divorced — stayed friends",
      description: "The marriage ends and a friendship continues.",
      endsKind: "spouse",
      startsKind: "friend",
      followUp: "friend_level",
    },
    {
      id: "spouse_ended",
      label: "Divorced",
      description: "The marriage ended. No ongoing connection.",
      endsKind: "spouse",
      startsKind: "ex_partner",
    },
  ],

  coworker: [
    {
      id: "coworker_to_manager",
      label: "Became your manager",
      description: "Coworker relationship transitions to a manager relationship.",
      endsKind: "coworker",
      startsKind: "manager",
    },
    {
      id: "coworker_to_friend",
      label: "Became a friend",
      description: "Still coworkers, but also friends.",
      endsKind: "coworker",
      startsKind: "friend",
    },
    {
      id: "coworker_ended",
      label: "No longer work together",
      description: "One of you left or moved teams.",
      endsKind: "coworker",
    },
    {
      id: "coworker_ended_friends",
      label: "No longer work together — stayed friends",
      description: "Work relationship ended but friendship continues.",
      endsKind: "coworker",
      startsKind: "friend",
      followUp: "friend_level",
    },
  ],

  friend: [
    {
      id: "friend_to_close",
      label: "Became a close friend",
      description: "The friendship deepened.",
      endsKind: "friend",
      startsKind: "close_friend",
    },
    {
      id: "friend_to_romantic",
      label: "Started dating",
      description: "The friendship transitioned to a romantic relationship.",
      endsKind: "friend",
      startsKind: "romantic_partner",
    },
    {
      id: "friend_drifted",
      label: "Drifted apart",
      description: "Lost touch; no active relationship.",
      endsKind: "friend",
    },
    {
      id: "friend_fell_out",
      label: "Fell out",
      description: "The friendship ended on bad terms.",
      endsKind: "friend",
    },
  ],

  close_friend: [
    {
      id: "close_to_romantic",
      label: "Started dating",
      description: "The close friendship became a romantic relationship.",
      endsKind: "close_friend",
      startsKind: "romantic_partner",
    },
    {
      id: "close_drifted",
      label: "Drifted apart",
      description: "The closeness faded.",
      endsKind: "close_friend",
    },
  ],

  manager: [
    {
      id: "manager_to_coworker",
      label: "Became a coworker",
      description: "The reporting structure changed.",
      endsKind: "manager",
      startsKind: "coworker",
    },
    {
      id: "manager_ended",
      label: "No longer work together",
      description: "One of you left the organisation.",
      endsKind: "manager",
    },
  ],

  employee: [
    {
      id: "employee_to_coworker",
      label: "Became a coworker",
      description: "The reporting structure changed.",
      endsKind: "employee",
      startsKind: "coworker",
    },
    {
      id: "employee_ended",
      label: "No longer work together",
      description: "One of you left the organisation.",
      endsKind: "employee",
    },
  ],

  family: [],

  classmate: [
    {
      id: "classmate_to_friend",
      label: "Became a friend",
      description: "The relationship continued after school.",
      endsKind: "classmate",
      startsKind: "friend",
    },
    {
      id: "classmate_ended",
      label: "Lost touch",
      description: "No longer in contact.",
      endsKind: "classmate",
    },
  ],

  roommate: [
    {
      id: "roommate_to_friend",
      label: "Remained friends",
      description: "No longer living together, but stayed friends.",
      endsKind: "roommate",
      startsKind: "friend",
    },
    {
      id: "roommate_ended",
      label: "Lost touch",
      description: "No ongoing relationship after living together.",
      endsKind: "roommate",
    },
  ],

  ex_partner: [],

  custom: [],
};
