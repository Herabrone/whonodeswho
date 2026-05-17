import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  useInternalNode,
  type EdgeProps,
} from "@xyflow/react";
import { getEdgeParams } from "./floating";
import type { TreeShape } from "../types";

interface RelationshipEdgeData {
  layoutMode: "free" | "tree";
  treeShape: TreeShape;
  secondary?: boolean;
}

function FloatingEdgeComponent(props: EdgeProps) {
  const {
    id,
    source,
    target,
    markerEnd,
    style,
    label,
    labelStyle,
    labelBgStyle,
    labelBgPadding,
    labelBgBorderRadius,
    data,
  } = props;

  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);
  const edgeData = data as RelationshipEdgeData | undefined;

  let pathResult: [string, number, number];

  if (
    edgeData?.layoutMode === "tree" &&
    (edgeData.treeShape === "layered" || edgeData.treeShape === "grouped")
  ) {
    const [path, labelX, labelY] = getSmoothStepPath({
      sourceX: sx,
      sourceY: sy,
      targetX: tx,
      targetY: ty,
      sourcePosition: sourcePos,
      targetPosition: targetPos,
      borderRadius: 10,
      offset: 16,
    });
    pathResult = [path, labelX, labelY];
  } else if (edgeData?.layoutMode === "tree" && edgeData.treeShape === "radial") {
    const [path, labelX, labelY] = getStraightPath({
      sourceX: sx,
      sourceY: sy,
      targetX: tx,
      targetY: ty,
    });
    pathResult = [path, labelX, labelY];
  } else {
    const [path, labelX, labelY] = getBezierPath({
      sourceX: sx,
      sourceY: sy,
      sourcePosition: sourcePos,
      targetX: tx,
      targetY: ty,
      targetPosition: targetPos,
      curvature: 0.18,
    });
    pathResult = [path, labelX, labelY];
  }

  const [path, labelX, labelY] = pathResult;
  const [paddingX = 4, paddingY = 2] = labelBgPadding ?? [4, 2];
  const bgFill = labelBgStyle?.fill ?? "#ffffff";
  const bgOpacity = labelBgStyle?.opacity ?? 0.9;
  const borderRadius = labelBgBorderRadius ?? 4;

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: `${paddingY}px ${paddingX}px`,
                borderRadius,
                background: bgFill,
                opacity: bgOpacity,
                color: labelStyle?.fill ?? "#1a1d24",
                fontSize: labelStyle?.fontSize ?? 11,
                fontWeight: labelStyle?.fontWeight ?? 500,
              }}
            >
              {label}
            </span>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const FloatingEdge = memo(FloatingEdgeComponent);
