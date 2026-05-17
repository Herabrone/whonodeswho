import type { MouseEvent } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import {
  getCategoryGfxColor,
  getCategoryGlowFilter,
} from "@/design-tokens";
import type { RelationshipCategory } from "../types";

export interface CategoryNodeData extends Record<string, unknown> {
  category: RelationshipCategory;
  label: string;
}

export type CategoryFlowNode = Node<CategoryNodeData, "category">;

function getCategorySubtleVar(category: RelationshipCategory): string {
  return `var(--rf-cat-${category}-subtle)`;
}

export function CategoryNode({ data }: NodeProps<CategoryFlowNode>) {
  const color = getCategoryGfxColor(data.category);
  const hiddenHandleClass = "!opacity-0 !w-0 !h-0 !min-w-0 !min-h-0 !border-0 !bg-transparent";

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      onClick={onClick}
      className="select-none rounded-full border px-3 py-2 text-center text-xs font-semibold tracking-wide"
      style={{
        borderColor: color,
        color,
        backgroundColor: getCategorySubtleVar(data.category),
        boxShadow: `0 0 0 1px ${color}22`,
        filter: getCategoryGlowFilter(data.category, "focused"),
        minWidth: 90,
        pointerEvents: "all",
      }}
      role="presentation"
    >
      <Handle id="cat-t" type="target" position={Position.Top} className={hiddenHandleClass} />
      {data.label}
      <Handle id="cat-b" type="source" position={Position.Bottom} className={hiddenHandleClass} />
    </div>
  );
}
