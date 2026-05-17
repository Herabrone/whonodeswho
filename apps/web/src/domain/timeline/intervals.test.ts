import { describe, expect, it } from "vitest";
import {
  intervalContains,
  intervalContainsDate,
  intervalEndsBeforeOrOnDate,
  intervalsEqual,
  intervalsMeet,
  intervalsOverlap,
} from "./intervals";

describe("timeline interval predicates", () => {
  it("treats touching intervals as meeting but not overlapping", () => {
    const first = { startDate: "2019-01-01", endDate: "2020-01-01" };
    const second = { startDate: "2020-01-01", endDate: "2022-01-01" };

    expect(intervalsMeet(first, second)).toBe(true);
    expect(intervalsOverlap(first, second)).toBe(false);
  });

  it("detects overlapping bounded intervals", () => {
    const first = { startDate: "2019-01-01", endDate: "2021-01-01" };
    const second = { startDate: "2020-01-01", endDate: "2022-01-01" };

    expect(intervalsOverlap(first, second)).toBe(true);
    expect(intervalsMeet(first, second)).toBe(false);
  });

  it("treats missing endDate as positive infinity", () => {
    const ongoing = { startDate: "2019-01-01" };
    const future = { startDate: "2025-01-01", endDate: "2026-01-01" };

    expect(intervalsOverlap(ongoing, future)).toBe(true);
    expect(intervalContainsDate(ongoing, "2040-01-01")).toBe(true);
  });

  it("uses half-open boundaries for point-in-time containment", () => {
    const interval = { startDate: "2019-01-01", endDate: "2020-01-01" };

    expect(intervalContainsDate(interval, "2019-01-01")).toBe(true);
    expect(intervalContainsDate(interval, "2020-01-01")).toBe(false);
    expect(intervalEndsBeforeOrOnDate(interval, "2020-01-01")).toBe(true);
  });

  it("checks containment and equality", () => {
    const outer = { startDate: "2019-01-01" };
    const inner = { startDate: "2020-01-01", endDate: "2021-01-01" };

    expect(intervalContains(outer, inner)).toBe(true);
    expect(intervalsEqual(inner, { ...inner })).toBe(true);
  });
});
