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
    <div className="rounded-lg border border-rf-border bg-rf-surface p-3 shadow-sm">
      <div className="text-sm font-semibold text-rf-text">Confirm relationship</div>
      <p className="mt-1 text-sm leading-relaxed text-rf-muted">
        Add {payload.relationshipType.replace(/_/g, " ")} between {payload.fromPersonName} and {payload.toPersonName}.
      </p>
      {payload.notes ? (
        <p className="mt-2 rounded-md bg-rf-subtle px-2 py-1 text-xs text-rf-muted">
          {payload.notes}
        </p>
      ) : null}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={confirming}
          className="rounded-lg border border-rf-border bg-rf-subtle px-3 py-1.5 text-xs font-medium text-rf-text hover:bg-rf-base disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          className="rounded-lg bg-rf-accent px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {confirming ? "Confirming" : "Confirm"}
        </button>
      </div>
    </div>
  );
}
