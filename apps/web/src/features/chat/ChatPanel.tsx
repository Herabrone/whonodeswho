import { FormEvent, useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { PendingActionCard } from "./PendingActionCard";
import type { ChatMessage, PendingChatAction } from "./chat.types";

interface ChatPanelProps {
  messages: ChatMessage[];
  pendingAction: PendingChatAction | null;
  activeToolName: string | null;
  streaming: boolean;
  error: string | null;
  onSend: (message: string) => Promise<void>;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  onClose: () => void;
}

export function ChatPanel({
  messages,
  pendingAction,
  activeToolName,
  streaming,
  error,
  onSend,
  onConfirm,
  onCancel,
  onClose,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pendingAction, activeToolName]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = draft.trim();
    if (!next || streaming) return;
    setDraft("");
    void onSend(next);
  };

  const confirm = async () => {
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <section className="pointer-events-auto absolute bottom-4 right-4 z-[45] flex h-[480px] w-[400px] max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-line bg-panel shadow-panel max-sm:bottom-0 max-sm:right-0 max-sm:h-full max-sm:w-full max-sm:max-w-none max-sm:rounded-none">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Nodell chat</h2>
          <p className="text-xs text-muted">
            {activeToolName ? `Checking ${activeToolName.replace(/_/g, " ")}` : "Ready"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-line px-2 py-1 text-xs font-medium text-muted hover:bg-canvas hover:text-ink"
        >
          Close
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-canvas px-3 py-4 text-sm text-muted">
            Ask about people, paths, or relationship changes in your graph.
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        {pendingAction ? (
          <PendingActionCard
            pendingAction={pendingAction}
            confirming={confirming}
            onConfirm={() => void confirm()}
            onCancel={onCancel}
          />
        ) : null}
        {error ? <p className="text-xs text-muted">{error}</p> : null}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={submit} className="border-t border-line p-3">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={streaming}
            placeholder="Ask about your graph..."
            className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent disabled:opacity-70"
          />
          <button
            type="submit"
            disabled={streaming || draft.trim().length === 0}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
