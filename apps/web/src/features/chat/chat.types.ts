import type { PendingAction } from "@relationflow/contracts";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  streaming?: boolean;
}

export interface PendingChatAction {
  action: PendingAction;
  token: string;
}
