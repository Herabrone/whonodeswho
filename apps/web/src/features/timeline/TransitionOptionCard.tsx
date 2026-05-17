import type { EpisodeKind } from "../../types";
import type { TransitionOption } from "../../domain/timeline/transitionTypes";
import { KIND_TO_CATEGORY, EPISODE_KIND_LABELS } from "../../domain/timeline/timelineTypes";

interface TransitionOptionCardProps {
  option: TransitionOption;
  selected: boolean;
  onSelect: (option: TransitionOption) => void;
}

function KindBadge({ kind }: { kind: EpisodeKind }) {
  const category = KIND_TO_CATEGORY[kind];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 7px",
        borderRadius: 99,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.03em",
        background: `var(--rf-cat-${category}-subtle)`,
        color: `var(--rf-cat-${category}-ui)`,
        border: `1px solid var(--rf-cat-${category}-gfx)`,
        opacity: 0.9,
      }}
    >
      {EPISODE_KIND_LABELS[kind]}
    </span>
  );
}

export function TransitionOptionCard({ option, selected, onSelect }: TransitionOptionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option)}
      aria-pressed={selected}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 10,
        border: selected
          ? "2px solid var(--rf-accent)"
          : "1px solid var(--rf-border-default, var(--rf-graph-control-border))",
        background: selected ? "var(--rf-cat-other-subtle, rgba(99,102,241,0.06))" : "var(--rf-bg-surface, transparent)",
        cursor: "pointer",
        transition: "border-color 120ms ease, background 120ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--rf-text-primary, var(--rf-text))",
          }}
        >
          {option.label}
        </span>
        {option.startsKind && <KindBadge kind={option.startsKind} />}
      </div>
      <span
        style={{
          fontSize: 12,
          color: "var(--rf-text-secondary, var(--rf-muted))",
          lineHeight: 1.45,
        }}
      >
        {option.description}
      </span>
    </button>
  );
}

/** A compact selectable button used in the "More options" kind grid. */
interface KindButtonProps {
  kind: EpisodeKind;
  selected: boolean;
  onSelect: (kind: EpisodeKind) => void;
}

export function KindButton({ kind, selected, onSelect }: KindButtonProps) {
  const category = KIND_TO_CATEGORY[kind];
  return (
    <button
      type="button"
      onClick={() => onSelect(kind)}
      aria-pressed={selected}
      style={{
        padding: "5px 8px",
        borderRadius: 6,
        border: selected
          ? `1.5px solid var(--rf-cat-${category}-ui)`
          : "1px solid var(--rf-graph-control-border)",
        background: selected ? `var(--rf-cat-${category}-subtle)` : "transparent",
        color: selected ? `var(--rf-cat-${category}-ui)` : "var(--rf-text-secondary, var(--rf-muted))",
        fontSize: 11,
        fontWeight: 500,
        cursor: "pointer",
        transition: "border-color 100ms ease, background 100ms ease, color 100ms ease",
        whiteSpace: "nowrap",
      }}
    >
      {EPISODE_KIND_LABELS[kind]}
    </button>
  );
}
