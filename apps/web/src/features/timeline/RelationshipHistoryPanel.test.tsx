import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RelationshipHistoryPanel } from "./RelationshipHistoryPanel";
import type { Relationship } from "../../types";
import { CATEGORY_COLORS } from "../../constants";

function hexToRgbString(value: string): string {
  const normalized = value.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgb(${red}, ${green}, ${blue})`;
}

function buildRelationship(overrides: Partial<Relationship> = {}): Relationship {
  return {
    id: overrides.id ?? "r1",
    source: overrides.source ?? "p1",
    target: overrides.target ?? "p2",
    type: overrides.type ?? "friend",
    category: overrides.category ?? "friend",
    direction: overrides.direction ?? "two-way",
    createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("RelationshipHistoryPanel", () => {
  it("renders chronological segments directly from relationship phases", () => {
    const relationship = buildRelationship({
      type: "complicated",
      category: "conflict",
      phases: [
        {
          type: "complicated",
          category: "conflict",
          fromYear: 2023,
          isCurrent: true,
        },
        {
          type: "close friend",
          category: "friend",
          fromYear: 2015,
          toYear: 2022,
          isCurrent: false,
        },
      ],
    });

    render(
      <RelationshipHistoryPanel
        relationship={relationship}
        relationshipColors={CATEGORY_COLORS}
      />,
    );

    expect(screen.getByText("close friend")).toBeDefined();
    expect(screen.getByText("complicated")).toBeDefined();

    const closeFriendSegment = screen.getByTitle("close friend (2015 to 2022)");
    const complicatedSegment = screen.getByTitle("complicated (2023 to Present)");

    expect((closeFriendSegment as HTMLElement).style.backgroundColor).toBe(
      hexToRgbString(CATEGORY_COLORS.friend),
    );
    expect((complicatedSegment as HTMLElement).style.backgroundColor).toBe(
      hexToRgbString(CATEGORY_COLORS.conflict),
    );
  });

  it("falls back to a single segment for relationships without phases", () => {
    const relationship = buildRelationship({
      type: "friend",
      category: "friend",
      startYear: 2019,
      isActive: true,
    });

    render(
      <RelationshipHistoryPanel
        relationship={relationship}
        relationshipColors={CATEGORY_COLORS}
      />,
    );

    expect(screen.getByTitle("friend (2019 to Present)")).toBeDefined();
  });
});
