import type { ChatMessage } from "./chat.types";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "bg-accent text-white"
            : "border border-line bg-canvas text-ink"
        }`}
      >
        {message.content}
        {message.streaming ? <span className="ml-0.5 text-muted">|</span> : null}
      </div>
    </div>
  );
}
