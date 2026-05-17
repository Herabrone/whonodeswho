import type { PendingChatAction } from "./chat.types";

interface PendingActionCardProps {
  pendingAction: PendingChatAction;
  confirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PendingActionCard({
  pendingAction,
  confirming,
  onConfirm,
  onCancel,
}: PendingActionCardProps) {
  const payload = pendingAction.action.payload;

  return (
    <div className="rounded-lg border border-line bg-panel p-3 shadow-sm">
      <div className="text-sm font-semibold text-ink">Confirm relationship</div>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Add {payload.relationshipType.replace(/_/g, " ")} between {payload.fromPersonName} and {payload.toPersonName}.
      </p>
      {payload.notes ? (
        <p className="mt-2 rounded-md bg-canvas px-2 py-1 text-xs text-muted">
          {payload.notes}
        </p>
      ) : null}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={confirming}
          className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink hover:bg-panel disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {confirming ? "Confirming" : "Confirm"}
        </button>
      </div>
    </div>
  );
}
