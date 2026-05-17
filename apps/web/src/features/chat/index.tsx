import { useState } from "react";
import { ChatPanel } from "./ChatPanel";
import { useChatStream } from "./useChatStream";

export function ChatFeature() {
  const [open, setOpen] = useState(false);
  const chat = useChatStream();

  return (
    <div className="pointer-events-none absolute inset-0 z-[45]">
      {open ? (
        <ChatPanel
          messages={chat.messages}
          pendingAction={chat.pendingAction}
          activeToolName={chat.activeToolName}
          streaming={chat.streaming}
          error={chat.error}
          onSend={chat.sendMessage}
          onConfirm={chat.confirmPendingAction}
          onCancel={chat.cancelPendingAction}
          onClose={() => setOpen(false)}
        />
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="pointer-events-auto absolute bottom-4 right-4 z-[46] rounded-full border border-line bg-ink px-4 py-2 text-sm font-semibold text-canvas shadow-panel transition-colors hover:bg-accent"
      >
        {open ? "Hide chat" : "Chat"}
      </button>
    </div>
  );
}
