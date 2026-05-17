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
  const handleClass = "!opacity-0 !w-3 !h-3 !min-w-0 !min-h-0";

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
      <Handle id="t" type="target" position={Position.Top} className={handleClass} />
      <Handle id="r" type="target" position={Position.Right} className={handleClass} />
      <Handle id="b" type="target" position={Position.Bottom} className={handleClass} />
      <Handle id="l" type="target" position={Position.Left} className={handleClass} />
      <Handle id="st" type="source" position={Position.Top} className={handleClass} />
      <Handle id="sr" type="source" position={Position.Right} className={handleClass} />
      <Handle id="sb" type="source" position={Position.Bottom} className={handleClass} />
      <Handle id="sl" type="source" position={Position.Left} className={handleClass} />
      <span className="block text-center text-sm font-medium text-ink">
        {person.name}
      </span>
    </div>
  );
}
