import type { MouseEvent } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { CATEGORY_COLORS } from "../constants";
import type { RelationshipCategory } from "../types";

export interface CategoryNodeData extends Record<string, unknown> {
  category: RelationshipCategory;
  label: string;
}

export type CategoryFlowNode = Node<CategoryNodeData, "category">;

export function CategoryNode({ data }: NodeProps<CategoryFlowNode>) {
  const color = CATEGORY_COLORS[data.category];

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
        backgroundColor: `${color}22`,
        minWidth: 90,
        pointerEvents: "all",
      }}
      role="presentation"
    >
      {data.label}
    </div>
  );
}
