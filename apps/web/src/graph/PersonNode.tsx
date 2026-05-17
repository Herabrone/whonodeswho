/**
 * PersonNode — custom React Flow node for a person.
 * Pure presentational component driven entirely by the data computed in
 * useGraphView. Styling reflects dim / highlight / path / search / selected.
 */
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { categoryTokens, getCategoryGlowFilter } from "@/design-tokens";
import type { PersonNode as PersonNodeType } from "./useGraphView";
import { DEFAULT_PERSON_COLOR } from "../constants";
import { capitalizeWords } from "../lib/string";

export function PersonNode({ data }: NodeProps<PersonNodeType>) {
  const { person, dimmed, highlighted, onPath, searchMatch, selected } = data;
  const accent = person.color ?? DEFAULT_PERSON_COLOR;
  const handleClass = "!opacity-0 !w-3 !h-3 !min-w-0 !min-h-0";
  const outlineColor = selected
    ? "var(--rf-graph-node-root-border)"
    : highlighted
      ? "var(--rf-border-strong)"
      : onPath
        ? categoryTokens.romantic.gfx
        : searchMatch
          ? categoryTokens.work.gfx
          : "transparent";
  const filter = selected
    ? getCategoryGlowFilter("other")
    : onPath
      ? getCategoryGlowFilter("romantic", "focused")
      : searchMatch
        ? getCategoryGlowFilter("work", "focused")
        : undefined;

  return (
    <div
      className="rounded-full px-4 py-3 transition-opacity"
      style={{
        backgroundColor: "var(--rf-graph-node-bg)",
        boxShadow: `var(--rf-graph-node-shadow), 0 0 0 2px ${outlineColor}`,
        color: "var(--rf-graph-node-text)",
        opacity: dimmed ? 0.18 : 1,
        borderLeft: `4px solid ${accent}`,
        filter,
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
      <span className="block text-center text-sm font-medium">
        {capitalizeWords(person.name)}
      </span>
    </div>
  );
}
