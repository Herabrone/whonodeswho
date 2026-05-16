/**
 * TRACK A — CRUD & DATA MANAGEMENT  (STUB)
 * ========================================
 * Owned by the Track A agent. Replace this stub per docs/track-a-crud-data.md.
 *
 * Reserved screen region: TOP-RIGHT (action buttons) + RIGHT DRAWER (detail
 * panels) + CENTERED MODALS (forms).
 *
 * This component is mounted by App.tsx as an overlay. The Track A agent may
 * create any files under src/features/crud/ and may edit ONLY this folder.
 * It integrates exclusively through the store actions in useGraphStore.
 */
export function CrudFeature() {
  return (
    <div className="pointer-events-none absolute right-4 top-4 z-20">
      <div className="pointer-events-auto rounded-lg border border-dashed border-line bg-panel/90 px-3 py-2 text-xs text-muted">
        Track A · CRUD &amp; Data — stub
      </div>
    </div>
  );
}
