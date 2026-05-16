/**
 * RelationFlow — SEED DATA
 * A small, believable relationship web used to populate an empty graph on
 * first run so every track has something to develop against. Loaded by App.tsx
 * only when persistence returns an empty graph.
 */
import type { GraphData, Person, Relationship, XYPosition } from "../types";

const ts = "2024-01-01T00:00:00.000Z";

function p(id: string, name: string, notes?: string): Person {
  return { id, name, notes, createdAt: ts, updatedAt: ts };
}

function r(
  id: string,
  source: string,
  target: string,
  type: string,
  category: Relationship["category"],
  direction: Relationship["direction"] = "two-way",
  notes?: string,
): Relationship {
  return { id, source, target, type, category, direction, notes, createdAt: ts, updatedAt: ts };
}

export const SEED_GRAPH: GraphData = {
  people: [
    p("alice", "Alice Tran", "The graph owner."),
    p("bob", "Bob Tran", "Alice's younger brother."),
    p("carol", "Carol Tran", "Alice and Bob's mother."),
    p("dan", "Dan Mercer", "Alice's partner."),
    p("erin", "Erin Walsh", "College friend."),
    p("frank", "Frank Osei", "Works with Alice."),
    p("grace", "Grace Lim", "Alice's manager."),
    p("henry", "Henry Park", "Erin's husband."),
    p("ivy", "Ivy Sokol", "Old roommate, now an acquaintance."),
    p("jack", "Jack Reyes", "Frank's college classmate."),
    p("kim", "Kim Novak", "Dan's sister."),
  ],
  relationships: [
    r("e1", "alice", "bob", "sibling", "family", "two-way", "Grew up together."),
    r("e2", "carol", "alice", "parent", "family", "one-way"),
    r("e3", "carol", "bob", "parent", "family", "one-way"),
    r("e4", "alice", "dan", "partner", "romantic", "two-way"),
    r("e5", "alice", "erin", "close friend", "friend", "two-way"),
    r("e6", "alice", "frank", "coworker", "work", "two-way"),
    r("e7", "grace", "alice", "manager", "work", "one-way"),
    r("e8", "grace", "frank", "manager", "work", "one-way"),
    r("e9", "erin", "henry", "spouse", "romantic", "two-way"),
    r("e10", "alice", "ivy", "acquaintance", "friend", "two-way", "Lost touch."),
    r("e11", "frank", "jack", "classmate", "other", "two-way"),
    r("e12", "dan", "kim", "sibling", "family", "two-way"),
  ],
};

/** Hand-tuned starting positions so the seed graph reads well immediately. */
export const SEED_POSITIONS: Record<string, XYPosition> = {
  alice: { x: 0, y: 0 },
  bob: { x: -220, y: 120 },
  carol: { x: -260, y: -120 },
  dan: { x: 240, y: 80 },
  erin: { x: 60, y: -240 },
  frank: { x: 280, y: -120 },
  grace: { x: 120, y: -380 },
  henry: { x: -120, y: -360 },
  ivy: { x: -360, y: 40 },
  jack: { x: 480, y: -220 },
  kim: { x: 460, y: 160 },
};
