import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
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
  labelRank?: number;
  labelCount?: number;
  labelShiftPx?: number;
  primaryLabel?: string;
  primaryLabelColor?: string;
  secondaryLabel?: string;
  secondaryLabelColor?: string;
}

interface NodeGeometry {
  measured?: {
    width?: number;
    height?: number;
  };
  width?: number;
  height?: number;
  internals?: {
    positionAbsolute?: { x: number; y: number };
  };
}

function nodeRect(node: NodeGeometry) {
  const width = node.measured?.width ?? node.width ?? 96;
  const height = node.measured?.height ?? node.height ?? 48;
  const x = node.internals?.positionAbsolute?.x ?? 0;
  const y = node.internals?.positionAbsolute?.y ?? 0;
  return { x, y, width, height };
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

  const sourceHandleId = (props as EdgeProps & { sourceHandleId?: string }).sourceHandleId;
  const targetHandleId = (props as EdgeProps & { targetHandleId?: string }).targetHandleId;
  let { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);
  const edgeData = data as RelationshipEdgeData | undefined;

  if (edgeData?.layoutMode === "tree" && edgeData.treeShape === "grouped") {
    const sourceRect = nodeRect(sourceNode);
    const targetRect = nodeRect(targetNode);

    if (sourceHandleId === "sb" || sourceHandleId === "cat-b") {
      sx = sourceRect.x + sourceRect.width / 2;
      sy = sourceRect.y + sourceRect.height;
      sourcePos = Position.Bottom;
    } else if (sourceHandleId === "st" || sourceHandleId === "cat-t") {
      sx = sourceRect.x + sourceRect.width / 2;
      sy = sourceRect.y;
      sourcePos = Position.Top;
    }

    if (targetHandleId === "cat-t" || targetHandleId === "t") {
      tx = targetRect.x + targetRect.width / 2;
      ty = targetRect.y;
      targetPos = Position.Top;
    } else if (targetHandleId === "cat-b" || targetHandleId === "b") {
      tx = targetRect.x + targetRect.width / 2;
      ty = targetRect.y + targetRect.height;
      targetPos = Position.Bottom;
    }
  }

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

  const [path, labelX, baseLabelY] = pathResult;
  const labelShiftY =
    typeof edgeData?.labelShiftPx === "number"
      ? edgeData.labelShiftPx
      : edgeData?.layoutMode === "tree" &&
        edgeData.treeShape === "grouped" &&
        typeof edgeData.labelRank === "number" &&
        typeof edgeData.labelCount === "number"
      ? (edgeData.labelRank - (edgeData.labelCount - 1) / 2) * 14
      : 0;
  const labelY = baseLabelY + labelShiftY;
  const [paddingX = 4, paddingY = 2] = labelBgPadding ?? [4, 2];
  const bgFill = labelBgStyle?.fill ?? "#ffffff";
  const bgOpacity = labelBgStyle?.opacity ?? 0.9;
  const borderRadius = labelBgBorderRadius ?? 4;
  const hasSecondaryLabel = Boolean(edgeData?.primaryLabel && edgeData?.secondaryLabel);

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
            {hasSecondaryLabel ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                  gap: 4,
                  minWidth: 84,
                  padding: `${paddingY + 1}px ${paddingX + 1}px`,
                  borderRadius,
                  background: bgFill,
                  opacity: bgOpacity,
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    color: edgeData?.primaryLabelColor ?? labelStyle?.fill ?? "#1a1d24",
                    fontSize: labelStyle?.fontSize ?? 11,
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}
                >
                  {edgeData?.primaryLabel}
                </span>
                <span
                  style={{
                    display: "block",
                    height: 1,
                    background: "var(--rf-border-default, rgba(28,25,23,0.16))",
                  }}
                />
                <span
                  style={{
                    color: edgeData?.secondaryLabelColor ?? labelStyle?.fill ?? "#1a1d24",
                    fontSize: Math.max(10, Number(labelStyle?.fontSize ?? 11) - 1),
                    fontWeight: 500,
                    lineHeight: 1.2,
                  }}
                >
                  {edgeData?.secondaryLabel}
                </span>
              </div>
            ) : (
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
            )}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const FloatingEdge = memo(FloatingEdgeComponent);
