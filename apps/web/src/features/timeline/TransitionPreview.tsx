import type { EpisodeKind } from "../../types";
import type { TransitionOption } from "../../domain/timeline/transitionTypes";
import { EPISODE_KIND_LABELS } from "../../domain/timeline/timelineTypes";

interface TransitionPreviewProps {
  option: TransitionOption;
  resolvedStartsKind: EpisodeKind | undefined;
  transitionYear: number;
  otherPersonName: string;
}

export function TransitionPreview({
  option,
  resolvedStartsKind,
  transitionYear,
  otherPersonName,
}: TransitionPreviewProps) {
  const closingLabel = EPISODE_KIND_LABELS[option.endsKind];
  const openingLabel = resolvedStartsKind ? EPISODE_KIND_LABELS[resolvedStartsKind] : null;

  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid var(--rf-graph-control-border)",
        background: "var(--rf-bg-subtle, rgba(99,102,241,0.04))",
        fontSize: 12,
        lineHeight: 1.6,
        color: "var(--rf-text-secondary, var(--rf-muted))",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--rf-text-primary, var(--rf-text))", marginBottom: 6 }}>
        Summary
      </div>
      <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
        <li>
          <span style={{ color: "var(--rf-text-primary, var(--rf-text))" }}>{closingLabel}</span> with{" "}
          <span style={{ color: "var(--rf-text-primary, var(--rf-text))" }}>{otherPersonName}</span> closes at{" "}
          <span style={{ color: "var(--rf-text-primary, var(--rf-text))" }}>{transitionYear}</span>
        </li>
        {openingLabel && (
          <li>
            New{" "}
            <span style={{ color: "var(--rf-text-primary, var(--rf-text))" }}>{openingLabel}</span> episode opens at{" "}
            <span style={{ color: "var(--rf-text-primary, var(--rf-text))" }}>{transitionYear}</span>
          </li>
        )}
        <li>A milestone event is recorded at {transitionYear}</li>
      </ul>
    </div>
  );
}
