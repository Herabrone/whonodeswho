import { useMemo } from "react";
import { CATEGORY_UI_COLORS } from "../../constants";
import type { Person } from "../../types";
import type {
  DerivedRelationshipEpisode,
  DerivedRelationshipThread,
} from "../../domain/timeline/threadEpisodes";

interface TimelineRelationshipBarsProps {
  threads: DerivedRelationshipThread[];
  episodesByThread: Record<string, DerivedRelationshipEpisode[]>;
  people: Person[];
  currentYear: number;
  minYear: number;
  maxYear: number;
}

const LABEL_WIDTH = 176;
const PIXELS_PER_YEAR = 88;

function startOffset(year: number, minYear: number): number {
  return (year - minYear) * PIXELS_PER_YEAR;
}

function phaseWidth(startYear: number, endYear: number | undefined, maxYear: number): number {
  const visibleEnd = endYear ?? maxYear;
  return Math.max(1, visibleEnd - startYear) * PIXELS_PER_YEAR;
}

export function TimelineRelationshipBars({
  threads,
  episodesByThread,
  people,
  currentYear,
  minYear,
  maxYear,
}: TimelineRelationshipBarsProps) {
  const namesById = useMemo(() => new Map(people.map((person) => [person.id, person.name])), [people]);
  const rows = useMemo(() => {
    return threads
      .map((thread) => ({
        thread,
        episodes: [...(episodesByThread[thread.id] ?? [])].sort((left, right) =>
          left.startYear - right.startYear || left.id.localeCompare(right.id),
        ),
      }))
      .filter((row) => row.episodes.some((episode) => episode.startYear <= maxYear))
      .sort((left, right) => {
        const leftStart = left.episodes[0]?.startYear ?? Number.MAX_SAFE_INTEGER;
        const rightStart = right.episodes[0]?.startYear ?? Number.MAX_SAFE_INTEGER;
        if (leftStart !== rightStart) return leftStart - rightStart;

        const leftLabel = `${namesById.get(left.thread.personAId) ?? left.thread.personAId} ${namesById.get(left.thread.personBId) ?? left.thread.personBId}`;
        const rightLabel = `${namesById.get(right.thread.personAId) ?? right.thread.personAId} ${namesById.get(right.thread.personBId) ?? right.thread.personBId}`;
        return leftLabel.localeCompare(rightLabel);
      });
  }, [episodesByThread, maxYear, namesById, threads]);

  const trackWidth = (maxYear - minYear + 1) * PIXELS_PER_YEAR;
  const contentWidth = LABEL_WIDTH + trackWidth;
  const playheadLeft = LABEL_WIDTH + startOffset(Math.floor(currentYear), minYear);

  return (
    <div className="relative min-w-max" style={{ width: contentWidth }}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: playheadLeft,
          width: 2,
          background: "var(--rf-accent)",
          opacity: 0.9,
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      <div className="sticky top-0 z-[1] grid border-b border-rf-border bg-rf-surface/95 backdrop-blur" style={{ gridTemplateColumns: `${LABEL_WIDTH}px ${trackWidth}px` }}>
        <div className="px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-rf-muted">
          Relationship thread
        </div>
        <div className="relative h-10">
          {Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index).map((year) => (
            <div
              key={year}
              style={{
                position: "absolute",
                left: startOffset(year, minYear),
                top: 0,
                bottom: 0,
                width: PIXELS_PER_YEAR,
                borderLeft: "1px solid var(--rf-border-subtle)",
              }}
            >
              <div className="px-2 pt-2 text-[11px] text-rf-muted">{year}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="divide-y divide-rf-border">
        {rows.map(({ thread, episodes }) => {
          const leftName = namesById.get(thread.personAId) ?? thread.personAId;
          const rightName = namesById.get(thread.personBId) ?? thread.personBId;

          return (
            <div
              key={thread.id}
              className="grid items-stretch"
              style={{ gridTemplateColumns: `${LABEL_WIDTH}px ${trackWidth}px` }}
            >
              <div className="sticky left-0 z-[1] flex items-center bg-rf-surface px-3 py-3 text-sm text-rf-text">
                <div>
                  <div className="font-medium text-rf-text">{leftName}</div>
                  <div className="text-xs text-rf-muted">{rightName}</div>
                </div>
              </div>

              <div className="relative min-h-14 py-2">
                {Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index).map((year) => (
                  <div
                    key={year}
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: startOffset(year, minYear),
                      top: 0,
                      bottom: 0,
                      width: PIXELS_PER_YEAR,
                      borderLeft: "1px solid var(--rf-border-subtle)",
                    }}
                  />
                ))}

                <div className="relative space-y-1 px-1">
                  {episodes.map((episode) => {
                    const startYear = episode.startYear;
                    const endYear = episode.endYear;
                    const category = episode.category;

                    return (
                      <div key={episode.id} className="relative h-5">
                        <div
                          title={`${episode.label}: ${startYear}-${endYear ?? "present"}`}
                          style={{
                            position: "absolute",
                            left: startOffset(startYear, minYear),
                            top: 0,
                            height: 20,
                            width: phaseWidth(startYear, endYear, maxYear),
                            minWidth: 10,
                            borderRadius: 999,
                            backgroundColor: CATEGORY_UI_COLORS[category],
                            opacity: endYear !== undefined && Math.floor(currentYear) >= endYear ? 0.35 : 0.95,
                            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
                            overflow: "hidden",
                          }}
                        >
                          <span className="block truncate px-2 py-[2px] text-[11px] font-medium text-white">
                            {episode.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}