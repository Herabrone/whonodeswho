import { useMemo } from "react";
import type {
  Relationship,
  RelationshipCategory,
} from "../../types";

interface RelationshipHistoryPanelProps {
  relationship: Relationship;
  relationshipColors: Record<RelationshipCategory, string>;
}

interface HistorySegment {
  id: string;
  type: string;
  category: RelationshipCategory;
  fromYear: number;
  fromMonth?: number;
  toYear?: number;
  toMonth?: number;
  isCurrent: boolean;
}

function monthIndex(value: { year: number; month?: number }): number {
  return value.year * 12 + ((value.month ?? 1) - 1);
}

function segmentPosition(
  start: { year: number; month?: number },
  end: { year: number; month?: number } | undefined,
  minIndex: number,
  span: number,
): { leftPercent: number; widthPercent: number } {
  const startIndex = monthIndex(start);
  const endIndexExclusive = end
    ? monthIndex(end) + 1
    : monthIndex({ year: new Date().getFullYear(), month: 12 }) + 1;

  const normalizedStart = Math.max(minIndex, Math.min(startIndex, minIndex + span));
  const normalizedEnd = Math.max(
    normalizedStart + 1,
    Math.min(endIndexExclusive, minIndex + span),
  );

  return {
    leftPercent: ((normalizedStart - minIndex) / span) * 100,
    widthPercent: ((normalizedEnd - normalizedStart) / span) * 100,
  };
}

function compareSegments(left: HistorySegment, right: HistorySegment): number {
  if (left.fromYear !== right.fromYear) return left.fromYear - right.fromYear;

  const leftFromMonth = left.fromMonth ?? 0;
  const rightFromMonth = right.fromMonth ?? 0;
  if (leftFromMonth !== rightFromMonth) return leftFromMonth - rightFromMonth;

  const leftToYear = left.isCurrent ? Number.MAX_SAFE_INTEGER : left.toYear ?? Number.MAX_SAFE_INTEGER;
  const rightToYear = right.isCurrent ? Number.MAX_SAFE_INTEGER : right.toYear ?? Number.MAX_SAFE_INTEGER;
  if (leftToYear !== rightToYear) return leftToYear - rightToYear;

  const leftToMonth = left.isCurrent ? Number.MAX_SAFE_INTEGER : left.toMonth ?? Number.MAX_SAFE_INTEGER;
  const rightToMonth = right.isCurrent ? Number.MAX_SAFE_INTEGER : right.toMonth ?? Number.MAX_SAFE_INTEGER;
  if (leftToMonth !== rightToMonth) return leftToMonth - rightToMonth;

  return left.id.localeCompare(right.id);
}

function formatDateLabel(year?: number, month?: number, fallback = "Unknown"): string {
  if (year === undefined) return fallback;
  return month !== undefined ? `${year}-${String(month).padStart(2, "0")}` : `${year}`;
}

function formatSegmentRange(segment: HistorySegment): string {
  const start = formatDateLabel(segment.fromYear, segment.fromMonth);
  const end = segment.isCurrent
    ? "Present"
    : formatDateLabel(segment.toYear, segment.toMonth, "Unknown");
  return `${start} to ${end}`;
}

function getHistorySegments(relationship: Relationship): HistorySegment[] {
  if (relationship.phases && relationship.phases.length > 0) {
    return [...relationship.phases]
      .map((phase, index) => ({
        id: `${relationship.id}:phase:${index}`,
        type: phase.type,
        category: phase.category,
        fromYear: phase.fromYear,
        ...(phase.fromMonth !== undefined ? { fromMonth: phase.fromMonth } : {}),
        ...(!phase.isCurrent && phase.toYear !== undefined ? { toYear: phase.toYear } : {}),
        ...(!phase.isCurrent && phase.toMonth !== undefined ? { toMonth: phase.toMonth } : {}),
        isCurrent: phase.isCurrent,
      }))
      .sort(compareSegments);
  }

  if (relationship.startYear === undefined && !relationship.type) {
    return [];
  }

  return [{
    id: `${relationship.id}:current`,
    type: relationship.type,
    category: relationship.category,
    fromYear: relationship.startYear ?? new Date().getFullYear(),
    ...(relationship.startMonth !== undefined ? { fromMonth: relationship.startMonth } : {}),
    ...(relationship.isActive === false && relationship.endYear !== undefined
      ? { toYear: relationship.endYear }
      : {}),
    isCurrent: relationship.isActive !== false,
  }];
}

export function RelationshipHistoryPanel({
  relationship,
  relationshipColors,
}: RelationshipHistoryPanelProps) {
  const segments = useMemo(() => getHistorySegments(relationship), [relationship]);

  const range = useMemo(() => {
    if (segments.length === 0) return null;

    const currentDate = { year: new Date().getFullYear(), month: 12 };
    let minIndex = Number.POSITIVE_INFINITY;
    let maxIndex = Number.NEGATIVE_INFINITY;

    for (const segment of segments) {
      const startIndex = monthIndex({
        year: segment.fromYear,
        ...(segment.fromMonth !== undefined ? { month: segment.fromMonth } : {}),
      });
      const endIndex = !segment.isCurrent && segment.toYear !== undefined
        ? monthIndex({
            year: segment.toYear,
            ...(segment.toMonth !== undefined ? { month: segment.toMonth } : {}),
          }) + 1
        : monthIndex(currentDate) + 1;
      minIndex = Math.min(minIndex, startIndex);
      maxIndex = Math.max(maxIndex, endIndex);
    }

    if (!Number.isFinite(minIndex) || !Number.isFinite(maxIndex) || maxIndex <= minIndex) {
      return null;
    }

    return {
      minIndex,
      span: maxIndex - minIndex,
      minYear: Math.floor(minIndex / 12),
      maxYear: Math.ceil(maxIndex / 12),
    };
  }, [segments]);

  if (segments.length === 0) return null;

  return (
    <div className="mt-5 rounded-lg border border-rf-border bg-rf-subtle p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-rf-muted">
        Relationship history
      </h4>

      {range && (
        <div className="mt-3 space-y-2">
          {segments.map((segment) => {
            const color = relationshipColors[segment.category] ?? "var(--rf-accent)";
            const position = segmentPosition(
              {
                year: segment.fromYear,
                ...(segment.fromMonth !== undefined ? { month: segment.fromMonth } : {}),
              },
              !segment.isCurrent && segment.toYear !== undefined
                ? {
                    year: segment.toYear,
                    ...(segment.toMonth !== undefined ? { month: segment.toMonth } : {}),
                  }
                : undefined,
              range.minIndex,
              range.span,
            );

            return (
              <div key={segment.id} className="grid grid-cols-[110px_1fr] items-center gap-2">
                <div className="text-[11px] text-rf-muted">{formatSegmentRange(segment)}</div>
                <div className="relative h-6 rounded bg-rf-base/70">
                  <div
                    className="absolute inset-y-1 rounded"
                    style={{
                      left: `${position.leftPercent}%`,
                      width: `${position.widthPercent}%`,
                      backgroundColor: color,
                      minWidth: 6,
                    }}
                    title={`${segment.type} (${formatSegmentRange(segment)})`}
                  />
                  <div className="absolute inset-0 flex items-center px-2 text-[11px] font-medium text-rf-text">
                    {segment.type}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between text-[10px] text-rf-muted">
            <span>{range.minYear}</span>
            <span>{Math.round((range.minYear + range.maxYear) / 2)}</span>
            <span>{range.maxYear}</span>
          </div>
        </div>
      )}
    </div>
  );
}
