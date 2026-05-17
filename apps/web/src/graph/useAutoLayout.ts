/**
 * useAutoLayout — d3-force–based auto-layout for the "free" (web) mode.
 *
 * Runs a full simulation synchronously (300+ ticks) so we get a stable
 * settled layout before animating to the result.  The returned function
 * smoothly interpolates every node from its current position to the new one
 * over 600 ms using requestAnimationFrame.
 */
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceCenter,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { useGraphStore } from "../store/useGraphStore";

// Treat every node as a 160 × 50 px bounding box (generous enough to keep
// labels clear).  forceCollide uses the radius of the bounding-circle.
const NODE_W = 160;
const NODE_H = 50;
const COLLISION_RADIUS = Math.hypot(NODE_W / 2, NODE_H / 2) + 24; // ≈ 108
const LINK_DISTANCE = 200;
const REPULSION_STRENGTH = -600;
const SIMULATION_TICKS = 300;
const TRANSITION_MS = 600;

interface ForceNode extends SimulationNodeDatum {
  id: string;
}

interface ForceLink extends SimulationLinkDatum<ForceNode> {
  /** stored separately so we can walk the degrees */
  sourceId: string;
  targetId: string;
  /** count of parallel edges between the same pair */
  parallel: number;
}

/**
 * Computes a clean d3-force layout for all people, returns a map of id→{x,y}.
 * Does NOT mutate store state.
 */
export function computeAutoLayout(
  people: { id: string }[],
  relationships: { source: string; target: string }[],
  currentPositions: Record<string, { x: number; y: number }>,
  centerX = 0,
  centerY = 0,
): Record<string, { x: number; y: number }> {
  if (people.length === 0) return {};

  // Build ForceNode array — seed from existing positions so the simulation
  // starts "close to" the current layout and converges faster.
  const nodes: ForceNode[] = people.map((p) => {
    const pos = currentPositions[p.id];
    return {
      id: p.id,
      x: pos?.x ?? 0,
      y: pos?.y ?? 0,
    };
  });

  // Count parallel edges per pair (undirected)
  const parallelCount: Record<string, number> = {};
  for (const r of relationships) {
    const key = r.source < r.target ? `${r.source}:${r.target}` : `${r.target}:${r.source}`;
    parallelCount[key] = (parallelCount[key] ?? 0) + 1;
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const links: ForceLink[] = relationships
    .map((r) => {
      const src = nodeById.get(r.source);
      const tgt = nodeById.get(r.target);
      if (!src || !tgt) return null;
      const key = r.source < r.target ? `${r.source}:${r.target}` : `${r.target}:${r.source}`;
      return {
        source: src,
        target: tgt,
        sourceId: r.source,
        targetId: r.target,
        parallel: parallelCount[key] ?? 1,
      } satisfies ForceLink;
    })
    .filter(Boolean) as ForceLink[];

  // Degree map — highly connected nodes get more breathing room
  const degree: Record<string, number> = {};
  for (const r of relationships) {
    degree[r.source] = (degree[r.source] ?? 0) + 1;
    degree[r.target] = (degree[r.target] ?? 0) + 1;
  }

  const sim = forceSimulation<ForceNode>(nodes)
    .force(
      "link",
      forceLink<ForceNode, ForceLink>(links)
        .id((d) => d.id)
        .distance((link) => {
          const srcDeg = degree[(link.source as ForceNode).id] ?? 1;
          const tgtDeg = degree[(link.target as ForceNode).id] ?? 1;
          const extra = Math.log(Math.max(srcDeg, tgtDeg) + 1) * 40;
          return LINK_DISTANCE + extra + (link.parallel - 1) * 30;
        })
        .strength(0.6),
    )
    .force("charge", forceManyBody<ForceNode>().strength(REPULSION_STRENGTH))
    .force(
      "collide",
      forceCollide<ForceNode>().radius(COLLISION_RADIUS).strength(0.9).iterations(4),
    )
    .force("center", forceCenter<ForceNode>(centerX, centerY).strength(0.15))
    .alphaMin(0.001)
    .stop();

  // Run ticks synchronously — avoids any async complexity
  sim.tick(SIMULATION_TICKS);

  const result: Record<string, { x: number; y: number }> = {};
  for (const node of nodes) {
    result[node.id] = { x: node.x ?? 0, y: node.y ?? 0 };
  }
  return result;
}

/**
 * Returns a callback that, when called, computes a fresh force layout and
 * smoothly animates every node to its new position.
 *
 * The hook must be called inside a React component so it can read the store.
 */
export function useAutoLayout(): () => void {
  const people = useGraphStore((s) => s.people);
  const relationships = useGraphStore((s) => s.relationships);
  const positions = useGraphStore((s) => s.positions);
  const setPosition = useGraphStore((s) => s.setPosition);

  return () => {
    if (people.length === 0) return;

    // 1 — Compute the settled layout
    const target = computeAutoLayout(people, relationships, positions, 0, 0);

    // 2 — Capture start positions
    const start: Record<string, { x: number; y: number }> = {};
    for (const p of people) {
      const pos = positions[p.id];
      start[p.id] = pos ?? { x: 0, y: 0 };
    }

    // 3 — Animate via rAF over TRANSITION_MS ms
    const startTime = performance.now();
    function easeInOut(t: number): number {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function tick() {
      const elapsed = performance.now() - startTime;
      const raw = Math.min(elapsed / TRANSITION_MS, 1);
      const t = easeInOut(raw);

      for (const p of people) {
        const s = start[p.id] ?? { x: 0, y: 0 };
        const tgt = target[p.id] ?? s;
        setPosition(p.id, {
          x: s.x + (tgt.x - s.x) * t,
          y: s.y + (tgt.y - s.y) * t,
        });
      }

      if (raw < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  };
}
