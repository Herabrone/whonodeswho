import { CATEGORY_COLORS } from "../../constants";
import type { Person, Relationship } from "../../types";

interface LifespanBarsProps {
  relationships: Relationship[];
  people: Person[];
  currentYear: number;
  minYear: number;
  maxYear: number;
}

function toPercent(year: number, minYear: number, maxYear: number) {
  return `${((year - minYear) / (maxYear - minYear)) * 100}%`;
}

export function LifespanBars({
  relationships,
  people,
  currentYear,
  minYear,
  maxYear,
}: LifespanBarsProps) {
  const datedRelationships = relationships.filter(
    (relationship) => relationship.startYear !== undefined,
  );
  const peopleById = new Map(people.map((person) => [person.id, person]));

  return (
    <div className="mt-3">
      <style>{`
        @keyframes timeline-pulse {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.55; }
          50% { transform: translate(-50%, -50%) scale(1.25); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
      <div className="max-h-[92px] overflow-auto pr-1">
        <div className="relative">
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 18,
              left: toPercent(currentYear, minYear, maxYear),
              width: 2,
              background: "#7c3aed",
              pointerEvents: "none",
            }}
          />
          <div className="space-y-1">
            {datedRelationships.map((relationship) => {
              const personName =
                peopleById.get(relationship.target)?.name ??
                peopleById.get(relationship.source)?.name ??
                "Unknown";
              const startYear = relationship.startYear!;
              const endYear = relationship.endYear ?? maxYear;
              const ended = relationship.isActive === false;
              return (
                <div key={relationship.id} className="grid grid-cols-[60px_1fr] items-center gap-3">
                  <div className="truncate text-right text-[11px] text-muted">
                    {personName.split(" ")[0]}
                  </div>
                  <div className="relative h-[10px] rounded-full bg-canvas/80">
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: toPercent(startYear, minYear, maxYear),
                        width: `calc(${toPercent(endYear, minYear, maxYear)} - ${toPercent(startYear, minYear, maxYear)})`,
                        minWidth: 6,
                        borderRadius: 999,
                        backgroundColor: CATEGORY_COLORS[relationship.category],
                        opacity: ended ? 0.3 : 1,
                        backgroundImage: ended
                          ? "repeating-linear-gradient(135deg, rgba(255,255,255,0.35) 0 6px, rgba(255,255,255,0) 6px 12px)"
                          : undefined,
                      }}
                      title={`${personName} (${relationship.type})`}
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: toPercent(startYear, minYear, maxYear),
                        top: "50%",
                        width: 8,
                        height: 8,
                        borderRadius: "999px",
                        backgroundColor: CATEGORY_COLORS[relationship.category],
                        animation: "timeline-pulse 1s ease forwards",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="relative mt-3 h-4">
        {Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index).map((year) => (
          <div
            key={year}
            style={{
              position: "absolute",
              left: toPercent(year, minYear, maxYear),
              transform: "translateX(-50%)",
              textAlign: "center",
            }}
          >
            <div className="mx-auto h-2 w-px bg-line" />
            <div className="mt-1 text-[10px] text-muted">{year}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
