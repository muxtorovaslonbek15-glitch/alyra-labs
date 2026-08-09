"use client";

import { create } from "zustand";
import type { ChatSession } from "./types";

export interface ChatListItem {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
  hasPlan: boolean;
}

export type ChatSessionActions = {
  selectChat: (id: string) => void | Promise<void>;
  createChat: () => void;
  removeChat: (id: string) => void | Promise<void>;
  renameChat: (id: string, title: string) => void;
};

interface ChatSessionsState {
  items: ChatListItem[];
  activeId: string | null;
  loadingChatId: string | null;
  actions: ChatSessionActions | null;

  publish: (payload: {
    chats: ChatSession[];
    activeId: string | null;
    loadingChatId?: string | null;
  }) => void;
  registerActions: (actions: ChatSessionActions | null) => void;
}

function previewFromChat(chat: ChatSession): string {
  for (let i = chat.messages.length - 1; i >= 0; i -= 1) {
    const m = chat.messages[i];
    if (m.role === "user" && m.content?.trim()) {
      return m.content.trim().slice(0, 120);
    }
  }
  for (let i = chat.messages.length - 1; i >= 0; i -= 1) {
    const m = chat.messages[i];
    if (m.role === "assistant" && m.content?.trim()) {
      return m.content.trim().slice(0, 120);
    }
  }
  return "Empty chat";
}

function chatHasPlan(chat: ChatSession): boolean {
  return chat.messages.some(
    (m) =>
      Boolean(m.structured?.lab_bridge?.lines?.length) ||
      Boolean(m.structured?.formula?.formula?.length),
  );
}

export function toChatListItems(chats: ChatSession[]): ChatListItem[] {
  return chats.map((c) => ({
    id: c.id,
    title: c.title || "New chat",
    updatedAt: c.updatedAt,
    preview: previewFromChat(c),
    hasPlan: chatHasPlan(c),
  }));
}

export const useChatSessionsStore = create<ChatSessionsState>((set) => ({
  items: [],
  activeId: null,
  loadingChatId: null,
  actions: null,

  publish: ({ chats, activeId, loadingChatId }) => {
    set({
      items: toChatListItems(chats),
      activeId,
      loadingChatId: loadingChatId ?? null,
    });
  },

  registerActions: (actions) => set({ actions }),
}));
