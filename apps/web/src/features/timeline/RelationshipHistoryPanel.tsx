import { useMemo } from "react";
import type {
  RelationshipEpisode,
  RelationshipEvent,
  RelationshipCategory,
} from "../../types";
import { episodeCategory, episodeDisplayLabel } from "../../domain/timeline/timelineTypes";
import { getTimelineMarkers } from "../../domain/timeline/timelineMarkers";

interface RelationshipHistoryPanelProps {
  episodes: RelationshipEpisode[];
  events: RelationshipEvent[];
  relationshipColors: Record<RelationshipCategory, string>;
}

function parseTimelineDate(input: string): { year: number; month: number } {
  const [yearRaw, monthRaw] = input.split("-");
  const year = Number.parseInt(yearRaw ?? "", 10);
  const month = Number.parseInt(monthRaw ?? "", 10);

  return {
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    month: Number.isFinite(month) ? Math.min(12, Math.max(1, month)) : 1,
  };
}

function monthIndex(value: { year: number; month: number }): number {
  return value.year * 12 + (value.month - 1);
}

function segmentPosition(
  startDate: string,
  endDate: string | undefined,
  minIndex: number,
  span: number,
): { leftPercent: number; widthPercent: number } {
  const startIndex = monthIndex(parseTimelineDate(startDate));
  const endIndexExclusive = endDate
    ? monthIndex(parseTimelineDate(endDate)) + 1
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

function formatDateLabel(date: string): string {
  const { year, month } = parseTimelineDate(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatEpisodeRange(episode: RelationshipEpisode): string {
  const start = formatDateLabel(episode.startDate);
  const end = episode.endDate ? formatDateLabel(episode.endDate) : "Now";
  return `${start} to ${end}`;
}

export function RelationshipHistoryPanel({
  episodes,
  events,
  relationshipColors,
}: RelationshipHistoryPanelProps) {
  const sortedEpisodes = useMemo(
    () => [...episodes].sort((left, right) => left.startDate.localeCompare(right.startDate)),
    [episodes],
  );

  const timelineMarkers = useMemo(
    () => getTimelineMarkers(sortedEpisodes, events),
    [events, sortedEpisodes],
  );

  const range = useMemo(() => {
    if (sortedEpisodes.length === 0) return null;

    const currentDate = { year: new Date().getFullYear(), month: 12 };
    let minIndex = Number.POSITIVE_INFINITY;
    let maxIndex = Number.NEGATIVE_INFINITY;

    for (const episode of sortedEpisodes) {
      const startIndex = monthIndex(parseTimelineDate(episode.startDate));
      const endIndex = episode.endDate
        ? monthIndex(parseTimelineDate(episode.endDate)) + 1
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
  }, [sortedEpisodes]);

  if (sortedEpisodes.length === 0) {
    return (
      <div className="mt-5 rounded-lg border border-rf-border bg-rf-subtle p-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-rf-muted">
          Relationship history
        </h4>
        <p className="mt-2 text-xs text-rf-muted">No history episodes found for this pair.</p>
      </div>
    );
  }

  const markerStart = timelineMarkers.slice(0, 10);

  return (
    <div className="mt-5 rounded-lg border border-rf-border bg-rf-subtle p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-rf-muted">
        Relationship history
      </h4>

      {range && (
        <div className="mt-3 space-y-2">
          {sortedEpisodes.map((episode) => {
            const category = episodeCategory(episode.kind);
            const color = relationshipColors[category] ?? "var(--rf-accent)";
            const position = segmentPosition(
              episode.startDate,
              episode.endDate,
              range.minIndex,
              range.span,
            );

            return (
              <div key={episode.id} className="grid grid-cols-[110px_1fr] items-center gap-2">
                <div className="text-[11px] text-rf-muted">{formatEpisodeRange(episode)}</div>
                <div className="relative h-6 rounded bg-rf-base/70">
                  <div
                    className="absolute inset-y-1 rounded"
                    style={{
                      left: `${position.leftPercent}%`,
                      width: `${position.widthPercent}%`,
                      backgroundColor: color,
                      minWidth: 6,
                    }}
                    title={`${episodeDisplayLabel(episode)} (${formatEpisodeRange(episode)})`}
                  />
                  <div className="absolute inset-0 flex items-center px-2 text-[11px] font-medium text-rf-text">
                    {episodeDisplayLabel(episode)}
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

      {markerStart.length > 0 && (
        <div className="mt-4 border-t border-rf-border pt-3">
          <h5 className="text-[11px] font-semibold uppercase tracking-wide text-rf-muted">
            Key events
          </h5>
          <ul className="mt-2 space-y-1">
            {markerStart.map((marker, index) => (
              <li key={`${marker.date}-${marker.kind}-${index}`} className="text-xs text-rf-text">
                <span className="text-rf-muted">{formatDateLabel(marker.date)}</span>
                {" "}
                {marker.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
