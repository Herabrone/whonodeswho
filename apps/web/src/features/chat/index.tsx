import { useState } from "react";
import { graphTokens } from "@/design-tokens";
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
        className="pointer-events-auto absolute bottom-4 right-4 z-[46] rounded-full border px-4 py-2 text-sm font-semibold shadow-panel transition-opacity hover:opacity-90"
        style={{
          borderColor: graphTokens.control.border,
          backgroundColor: graphTokens.node.bgDefault,
          color: graphTokens.node.textPrimary,
        }}
      >
        {open ? "Hide chat" : "Chat"}
      </button>
    </div>
  );
}
