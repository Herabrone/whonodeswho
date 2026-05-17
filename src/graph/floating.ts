import { Position, type XYPosition as RFXYPosition } from "@xyflow/react";

interface NodeGeometry {
  measured?: {
    width?: number;
    height?: number;
  };
  width?: number;
  height?: number;
  internals?: {
    positionAbsolute?: RFXYPosition;
  };
}

interface NodeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgeParams {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  sourcePos: Position;
  targetPos: Position;
}

function getNodeRect(node: NodeGeometry): NodeRect {
  const width = node.measured?.width ?? node.width ?? 96;
  const height = node.measured?.height ?? node.height ?? 48;
  const x = node.internals?.positionAbsolute?.x ?? 0;
  const y = node.internals?.positionAbsolute?.y ?? 0;

  return { x, y, width, height };
}

function getNodeCenter(node: NodeGeometry): RFXYPosition {
  const rect = getNodeRect(node);
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function getNodeIntersection(from: NodeGeometry, to: NodeGeometry): RFXYPosition {
  const fromRect = getNodeRect(from);
  const fromCenter = getNodeCenter(from);
  const toCenter = getNodeCenter(to);

  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  const hw = fromRect.width / 2;
  const hh = fromRect.height / 2;

  if (dx === 0 && dy === 0) {
    return {
      x: fromCenter.x,
      y: fromRect.y + fromRect.height,
    };
  }

  const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);

  return {
    x: fromCenter.x + dx * scale,
    y: fromCenter.y + dy * scale,
  };
}

function getEdgePosition(node: NodeGeometry, intersection: RFXYPosition): Position {
  const rect = getNodeRect(node);

  const left = Math.abs(intersection.x - rect.x);
  const right = Math.abs(intersection.x - (rect.x + rect.width));
  const top = Math.abs(intersection.y - rect.y);
  const bottom = Math.abs(intersection.y - (rect.y + rect.height));

  const min = Math.min(left, right, top, bottom);

  if (min === left) return Position.Left;
  if (min === right) return Position.Right;
  if (min === top) return Position.Top;
  return Position.Bottom;
}

export function getEdgeParams(sourceNode: NodeGeometry, targetNode: NodeGeometry): EdgeParams {
  const sourceIntersection = getNodeIntersection(sourceNode, targetNode);
  const targetIntersection = getNodeIntersection(targetNode, sourceNode);

  return {
    sx: sourceIntersection.x,
    sy: sourceIntersection.y,
    tx: targetIntersection.x,
    ty: targetIntersection.y,
    sourcePos: getEdgePosition(sourceNode, sourceIntersection),
    targetPos: getEdgePosition(targetNode, targetIntersection),
  };
}
