import { useCallback, useRef, useState } from "react";
import type {
  ChatSseEvent,
  ConfirmActionResponse,
} from "@relationflow/contracts";
import { apiPost } from "../../lib/apiClient";
import { useGraphStore } from "../../store/useGraphStore";
import type { ChatMessage, PendingChatAction } from "./chat.types";

// Empty string means "use Vite proxy / same origin". Only set for non-proxied deploys.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function newMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseSseBuffer(buffer: string): {
  events: ChatSseEvent[];
  remainder: string;
} {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const frames = normalized.split("\n\n");
  const remainder = normalized.endsWith("\n\n") ? "" : frames.pop() ?? "";
  const completeFrames = normalized.endsWith("\n\n") ? frames.slice(0, -1) : frames;
  const events: ChatSseEvent[] = [];

  for (const frame of completeFrames) {
    const data = frame
      .split("\n")
      .filter((line) => line.startsWith("data: "))
      .map((line) => line.slice(6))
      .join("\n");
    if (!data) continue;
    events.push(JSON.parse(data) as ChatSseEvent);
  }

  return { events, remainder };
}

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingChatAction | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | undefined>();
  const replaceGraph = useGraphStore((s) => s.replaceGraph);

  const appendAssistantToken = useCallback((content: string) => {
    setMessages((current) => {
      const last = current[current.length - 1];
      if (last?.role === "assistant" && last.streaming) {
        return current.map((message) =>
          message.id === last.id
            ? { ...message, content: `${message.content}${content}` }
            : message,
        );
      }
      return [
        ...current,
        {
          id: newMessageId(),
          role: "assistant",
          content,
          streaming: true,
        },
      ];
    });
  }, []);

  const addAssistantMessage = useCallback((content: string) => {
    setMessages((current) => [
      ...current.map((message) => ({ ...message, streaming: false })),
      { id: newMessageId(), role: "assistant", content },
    ]);
  }, []);

  const handleEvent = useCallback(
    (event: ChatSseEvent) => {
      if (event.type === "conversation") {
        conversationIdRef.current = event.conversationId;
        setConversationId(event.conversationId);
        return;
      }
      if (event.type === "token") {
        appendAssistantToken(event.content);
        return;
      }
      if (event.type === "tool_start") {
        setActiveToolName(event.toolName);
        return;
      }
      if (event.type === "tool_end") {
        setActiveToolName((current) =>
          current === event.toolName ? null : current,
        );
        return;
      }
      if (event.type === "pending_action") {
        setPendingAction({ action: event.pendingAction, token: event.token });
        setStreaming(false);
        addAssistantMessage("I found a change that needs your confirmation.");
        return;
      }
      if (event.type === "done") {
        setStreaming(false);
        setActiveToolName(null);
        setMessages((current) =>
          current.map((message) => ({ ...message, streaming: false })),
        );
        return;
      }
      if (event.type === "error") {
        setError(event.message);
        setStreaming(false);
        setActiveToolName(null);
        addAssistantMessage(event.message);
      }
    },
    [addAssistantMessage, appendAssistantToken],
  );

  const sendMessage = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || streaming) return;

      setError(null);
      setPendingAction(null);
      setStreaming(true);
      setMessages((current) => [
        ...current,
        { id: newMessageId(), role: "user", content: trimmed },
      ]);

      try {
        const response = await fetch(`${API_BASE_URL}/chat/stream`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            conversationId: conversationIdRef.current,
          }),
        });

        if (!response.ok) {
          throw new Error(`Chat request failed with status ${response.status}.`);
        }
        if (!response.body) {
          throw new Error("Chat response did not include a stream.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parsed = parseSseBuffer(buffer);
          buffer = parsed.remainder;
          for (const event of parsed.events) {
            handleEvent(event);
          }
        }

        buffer += decoder.decode();
        const parsed = parseSseBuffer(buffer);
        for (const event of parsed.events) {
          handleEvent(event);
        }
      } catch (caught) {
        const messageText =
          caught instanceof Error ? caught.message : "Unable to reach chat.";
        setError(messageText);
        addAssistantMessage(messageText);
        setStreaming(false);
        setActiveToolName(null);
      }
    },
    [activeToolName, addAssistantMessage, handleEvent, streaming],
  );

  const confirmPendingAction = useCallback(async () => {
    if (!pendingAction) return;
    setError(null);
    try {
      const response = await apiPost<ConfirmActionResponse>("/actions/confirm", {
        token: pendingAction.token,
      });
      if (response.graph) {
        replaceGraph(response.graph);
      }
      setPendingAction(null);
      addAssistantMessage("Done. The graph has been updated.");
    } catch (caught) {
      const messageText =
        caught instanceof Error ? caught.message : "Unable to confirm action.";
      setError(messageText);
      addAssistantMessage(messageText);
    }
  }, [addAssistantMessage, pendingAction, replaceGraph]);

  const cancelPendingAction = useCallback(() => {
    setPendingAction(null);
    addAssistantMessage("Okay, I will leave the graph unchanged.");
  }, [addAssistantMessage]);

  return {
    messages,
    pendingAction,
    conversationId,
    activeToolName,
    streaming,
    error,
    sendMessage,
    confirmPendingAction,
    cancelPendingAction,
  };
}
