/**
 * PersonNode — custom React Flow node for a person.
 * Pure presentational component driven entirely by the data computed in
 * useGraphView. Styling reflects dim / highlight / path / search / selected.
 */
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { PersonNode as PersonNodeType } from "./useGraphView";
import { DEFAULT_PERSON_COLOR } from "../constants";

export function PersonNode({ data }: NodeProps<PersonNodeType>) {
  const { person, dimmed, highlighted, onPath, searchMatch, selected } = data;
  const accent = person.color ?? DEFAULT_PERSON_COLOR;

  const ring = selected
    ? "ring-2 ring-accent ring-offset-2"
    : highlighted
      ? "ring-2 ring-ink ring-offset-2"
      : onPath
        ? "ring-2 ring-romantic ring-offset-2"
        : searchMatch
          ? "ring-2 ring-work ring-offset-2"
          : "";

  return (
    <div
      className={`rounded-full bg-panel px-4 py-3 shadow-panel transition-opacity ${ring}`}
      style={{
        opacity: dimmed ? 0.18 : 1,
        borderLeft: `4px solid ${accent}`,
        minWidth: 96,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-line" />
      <span className="block text-center text-sm font-medium text-ink">
        {person.name}
      </span>
      <Handle type="source" position={Position.Bottom} className="!bg-line" />
    </div>
  );
}
