import { useEffect, useRef, useState } from "react";
import { useGraphStore } from "../../store/useGraphStore";
import { getAnniversaries } from "./lib/timeline.utils";

export function AnniversaryToast() {
  const relationships = useGraphStore((s) => s.relationships);
  const people = useGraphStore((s) => s.people);
  const timelineOpen = useGraphStore((s) => s.timelineOpen);
  const [toast, setToast] = useState<string | null>(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const now = new Date();
    const anniversaries = getAnniversaries(
      relationships,
      people,
      now.getFullYear(),
      now.getMonth() + 1,
    );
    if (anniversaries.length === 0) return;

    const anniversary = anniversaries[0];
    setToast(
      `${anniversary.yearsAgo} year${anniversary.yearsAgo > 1 ? "s" : ""} ago this month - ` +
        `you first connected with ${anniversary.personName}`,
    );
  }, [people, relationships]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  if (!toast) return null;

  return (
    <>
      <style>{`
        @keyframes timeline-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          bottom: timelineOpen ? 180 : 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 35,
          background: "#1a1d24",
          color: "#f4f3ef",
          borderRadius: 10,
          padding: "10px 18px",
          fontSize: 13,
          fontWeight: 500,
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          animation: "timeline-toast-in 0.4s ease forwards",
        }}
      >
        <span>*</span>
        <span>{toast}</span>
        <button
          type="button"
          onClick={() => setToast(null)}
          style={{
            marginLeft: 4,
            opacity: 0.5,
            cursor: "pointer",
            background: "none",
            border: "none",
            color: "inherit",
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          x
        </button>
      </div>
    </>
  );
}
