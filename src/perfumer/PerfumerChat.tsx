"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlyraMark } from "@/components/brand/AlyraMark";
import { useAuthStore } from "@/store/authStore";
import {
  checkPerfumerHealth,
  createServerChat,
  deleteServerChat,
  fetchServerChat,
  listServerChats,
  renameServerChat,
  streamChat,
} from "./api";
import { ErrorBanner, WarningBanner } from "./ErrorBanner";
import { FormulaCard } from "./FormulaCard";
import {
  ChatModeToggle,
  PlanModeNudge,
  wordCount,
} from "./ChatModeToggle";
import {
  loadLocalStore,
  newLocalChat,
  saveLocalStore,
  uid,
} from "./storage";
import {
  buildLabBridgeFromStructured,
  consumeChatBridge,
  consumeGuidePrompt,
} from "./labBridge";
import { Prose } from "./Prose";
import { ThinkingPanel } from "./ThinkingPanel";
import { useBuilderStore } from "@/store/builderStore";
import { useChatSessionsStore } from "@/perfumer/chatSessionsStore";
import { ChatDockHandle } from "@/desk/ChatDockDrag";
import { track } from "@/lib/analytics/track";
import type {
  ChatMessage,
  ChatSession,
  LabBridgeFormula,
  PerfumerApiError,
  ToolTraceItem,
} from "./types";

function formatChatTime(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function PerfumerChat({
  variant = "page",
  onCloseSheet,
  showDockControls = false,
  dock = "right",
}: {
  /** page = standalone (redirect target); shell = Lab right rail / phone sheet */
  variant?: "page" | "shell";
  onCloseSheet?: () => void;
  /** Desktop Lab: dock drag handle */
  showDockControls?: boolean;
  /** Desktop placement when embedded in Lab shell */
  dock?: "right" | "bottom" | "sheet";
} = {}) {
  const shell = variant === "shell";
  const bottomDock = shell && dock === "bottom";
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const openAuthGate = useAuthStore((s) => s.openAuthGate);
  const setPlanFromStructured = useBuilderStore((s) => s.setPlanFromStructured);
  const setPlan = useBuilderStore((s) => s.setPlan);
  const narration = useBuilderStore((s) => s.narration);
  const chatAgentMode = useBuilderStore((s) => s.chatAgentMode);
  const setChatAgentMode = useBuilderStore((s) => s.setChatAgentMode);
  const chatDock = useBuilderStore((s) => s.chatDock);
  const setChatDock = useBuilderStore((s) => s.setChatDock);
  const setRightOpen = useBuilderStore((s) => s.setRightOpen);
  const centerView = useBuilderStore((s) => s.centerView);
  const toggleChatHistory = useBuilderStore((s) => s.toggleChatHistory);
  const closeChatHistory = useBuilderStore((s) => s.closeChatHistory);
  const builderMode = useBuilderStore((s) => s.mode);
  const buildStepIndex = useBuilderStore((s) => s.buildStepIndex);
  const buildSteps = useBuilderStore((s) => s.buildSteps);
  const publishSessions = useChatSessionsStore((s) => s.publish);
  const registerSessionActions = useChatSessionsStore((s) => s.registerActions);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<PerfumerApiError | null>(null);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  /** Nudge dismissed for current long draft (resets when composer clears). */
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [nudgeShownForDraft, setNudgeShownForDraft] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatsRef = useRef<ChatSession[]>([]);
  const activeIdRef = useRef<string | null>(null);
  const planTracked = useRef<string | null>(null);
  const building = builderMode === "building";
  const inputWords = wordCount(input);

  /** Auto-grow composer up to ~6–8 lines, then scroll (JS fallback if no field-sizing). */
  const syncComposerHeight = useCallback(() => {
    const el = composerRef.current;
    if (!el) return;
    // Native grow: Chrome/Safari/Firefox modern — clear any stale inline height.
    if (
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("field-sizing", "content")
    ) {
      el.style.height = "";
      el.style.overflowY = "";
      return;
    }
    const maxPx = shell ? (bottomDock ? 112 : 128) : 160;
    const minPx = shell ? (bottomDock ? 28 : 32) : 44;
    el.style.overflowY = "hidden";
    el.style.maxHeight = "none";
    el.style.height = "0px";
    const full = el.scrollHeight;
    el.style.maxHeight = "";
    el.style.height = `${Math.min(Math.max(full, minPx), maxPx)}px`;
    el.style.overflowY = full > maxPx ? "auto" : "hidden";
  }, [shell, bottomDock]);

  useEffect(() => {
    syncComposerHeight();
  }, [input, syncComposerHeight]);
  const showPlanNudge =
    shell &&
    chatAgentMode === "agent" &&
    !building &&
    inputWords > 10 &&
    !nudgeDismissed;

  const publishPlan = useCallback(
    (structured: ChatMessage["structured"] | undefined) => {
      if (!shell || !structured) return;
      const bridge =
        structured.lab_bridge || buildLabBridgeFromStructured(structured);
      if (!bridge?.lines?.length) return;
      setPlanFromStructured(structured, bridge);
      const key = `${bridge.title}:${bridge.mappingReport?.mappedCount}:${bridge.lines.length}`;
      if (planTracked.current !== key) {
        planTracked.current = key;
        track("builder_plan_ready", {
          mapped: bridge.mappingReport?.mappedCount ?? 0,
          unmapped: bridge.mappingReport?.unmappedCount ?? 0,
          title: bridge.title,
        });
      }
    },
    [shell, setPlanFromStructured],
  );

  const onUseInPlan = useCallback(
    (bridge: LabBridgeFormula) => {
      setPlan(bridge);
      track("builder_plan_ready", {
        mapped: bridge.mappingReport?.mappedCount ?? 0,
        unmapped: bridge.mappingReport?.unmappedCount ?? 0,
        title: bridge.title,
        from: "formula_card",
      });
    },
    [setPlan],
  );

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const active = useMemo(
    () => chats.find((c) => c.id === activeId) || null,
    [chats, activeId],
  );

  const persist = useCallback(
    (nextChats: ChatSession[], nextActive: string | null) => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        saveLocalStore({ version: 1, activeId: nextActive, chats: nextChats });
      }, 80);
    },
    [],
  );

  const updateChats = useCallback(
    (updater: (prev: ChatSession[]) => ChatSession[]) => {
      setChats((prev) => {
        const next = updater(prev);
        persist(next, activeIdRef.current);
        return next;
      });
    },
    [persist],
  );

  useEffect(() => {
    const local = loadLocalStore();
    let nextChats = local.chats;
    let nextActive = local.activeId;
    if (!nextChats.length) {
      const fresh = newLocalChat();
      nextChats = [fresh];
      nextActive = fresh.id;
    }
    if (!nextActive || !nextChats.some((c) => c.id === nextActive)) {
      nextActive = nextChats[0].id;
    }

    // Lab → Chat: ingest desk blend (Continue in Chat / fromLab bridge)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const fromLab =
        params.get("fromLab") === "1" ||
        params.get("bridge") === "1" ||
        params.get("tab") === "chat";
      if (fromLab || shell) {
        const payload = consumeChatBridge();
        if (payload?.structured?.formula?.formula?.length) {
          if (!shell) {
            window.history.replaceState({}, "", "/perfumer");
          }
          const now = new Date().toISOString();
          const msg: ChatMessage = {
            id: uid("msg"),
            role: "assistant",
            content: payload.assistantMessage,
            structured: payload.structured,
            status: "ok",
            createdAt: now,
          };
          const chat = newLocalChat(
            payload.title?.slice(0, 48) || "Lab blend",
          );
          chat.messages = [msg];
          chat.updatedAt = now;
          nextChats = [chat, ...nextChats];
          nextActive = chat.id;
          // Plan artifact for shell
          if (shell) {
            const bridge =
              payload.structured.lab_bridge ||
              buildLabBridgeFromStructured(payload.structured);
            if (bridge) setPlanFromStructured(payload.structured, bridge);
          }
        }
      }
    }

    setChats(nextChats);
    setActiveId(nextActive);
    setHydrated(true);
    saveLocalStore({ version: 1, activeId: nextActive, chats: nextChats });

    // /lab/guide → Try in chat: autofill composer once
    const guidePrompt = consumeGuidePrompt();
    if (guidePrompt) setInput(guidePrompt);

    void checkPerfumerHealth().then((h) => {
      if (!h.ok && h.error) setBanner(h.error);
      else setHealth(h.data || null);
    });
  }, []);

  // Server chat list only when signed in (API is auth-gated).
  useEffect(() => {
    if (!authReady || !user || !hydrated) return;
    const nextActive = activeIdRef.current;
    void listServerChats().then(async (res) => {
      if (!res.ok) {
        if (res.error.code === "auth_required" || res.error.code === "auth_invalid") {
          setBanner(res.error);
        }
        return;
      }
      setChats((prev) => {
        const byServer = new Map(
          prev.filter((c) => c.serverId).map((c) => [c.serverId!, c]),
        );
        const merged = [...prev];
        for (const s of res.chats) {
          if (byServer.has(s.id) || merged.some((c) => c.id === s.id)) continue;
          merged.push({
            id: s.id,
            serverId: s.id,
            title: s.title,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            messages: [],
          });
        }
        merged.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        saveLocalStore({
          version: 1,
          activeId: nextActive,
          chats: merged,
        });
        return merged;
      });
    });
  }, [authReady, user, hydrated]);

  useEffect(() => {
    if (hydrated) persist(chats, activeId);
  }, [chats, activeId, hydrated, persist]);

  useEffect(() => {
    if (!shell) return;
    publishSessions({ chats, activeId, loadingChatId });
  }, [shell, chats, activeId, loadingChatId, publishSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages, busy, active?.id, narration.length]);

  // Once per long draft: mark shown; clear dismiss when composer empties.
  useEffect(() => {
    if (inputWords === 0) {
      setNudgeDismissed(false);
      setNudgeShownForDraft(false);
      return;
    }
    if (showPlanNudge && !nudgeShownForDraft) {
      setNudgeShownForDraft(true);
    }
  }, [inputWords, showPlanNudge, nudgeShownForDraft]);

  function changeChatMode(next: "plan" | "agent") {
    if (next === chatAgentMode) return;
    setChatAgentMode(next);
    track("builder_chat_mode", { mode: next });
    if (next === "plan") {
      setNudgeDismissed(true);
    }
  }

  async function ensureServerId(chat: ChatSession): Promise<string | null> {
    if (chat.serverId) return chat.serverId;
    const created = await createServerChat(
      chat.title !== "New chat" ? chat.title : undefined,
    );
    if (!created.ok) return null;
    const serverId = created.chat.id;
    updateChats((prev) =>
      prev.map((c) => (c.id === chat.id ? { ...c, serverId } : c)),
    );
    return serverId;
  }

  function restorePlanFromChat(chat: ChatSession) {
    if (!shell) return;
    for (let i = chat.messages.length - 1; i >= 0; i -= 1) {
      const structured = chat.messages[i].structured;
      if (!structured) continue;
      const bridge =
        structured.lab_bridge || buildLabBridgeFromStructured(structured);
      if (bridge?.lines?.length) {
        setPlanFromStructured(structured, bridge);
        return;
      }
    }
  }

  async function selectChat(id: string) {
    setActiveId(id);
    setSidebarOpen(false);
    setBanner(null);
    let chat = chatsRef.current.find((c) => c.id === id);
    if (!chat) return;

    // Always hydrate full history from server when we only have a stub
    // or when local is empty but a server id exists.
    if (chat.serverId && chat.messages.length === 0) {
      setLoadingChatId(id);
      try {
        const remote = await fetchServerChat(chat.serverId);
        if (remote.ok && remote.chat.messages.length) {
          const hydratedChat: ChatSession = {
            ...chat,
            title: remote.chat.title || chat.title,
            messages: remote.chat.messages,
            updatedAt: remote.chat.updatedAt,
          };
          updateChats((prev) =>
            prev.map((c) => (c.id === id ? hydratedChat : c)),
          );
          chat = hydratedChat;
        }
      } finally {
        setLoadingChatId(null);
      }
    }
    restorePlanFromChat(chat);
    if (shell) closeChatHistory();
  }

  function createChat() {
    const fresh = newLocalChat();
    const next = [fresh, ...chatsRef.current];
    setChats(next);
    setActiveId(fresh.id);
    persist(next, fresh.id);
    setSidebarOpen(false);
    setInput("");
    setBanner(null);
    if (shell) closeChatHistory();
  }

  function renameChatById(id: string, title: string) {
    const nextTitle = title.trim().slice(0, 120) || "New chat";
    const target = chatsRef.current.find((c) => c.id === id);
    updateChats((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, title: nextTitle, updatedAt: new Date().toISOString() }
          : c,
      ),
    );
    if (target?.serverId) {
      void renameServerChat(target.serverId, nextTitle);
    }
  }

  async function removeChat(id: string) {
    const target = chatsRef.current.find((c) => c.id === id);
    if (target?.serverId) void deleteServerChat(target.serverId);
    const next = chatsRef.current.filter((c) => c.id !== id);
    let nextActive = activeIdRef.current;
    if (activeIdRef.current === id) {
      nextActive = next[0]?.id || null;
    }
    if (!next.length) {
      const fresh = newLocalChat();
      next.push(fresh);
      nextActive = fresh.id;
    }
    setChats(next);
    setActiveId(nextActive);
    persist(next, nextActive);
  }

  function startRename(chat: ChatSession) {
    setRenamingId(chat.id);
    setRenameValue(chat.title);
  }

  function commitRename() {
    if (!renamingId) return;
    renameChatById(renamingId, renameValue);
    setRenamingId(null);
  }

  const sessionActionsRef = useRef({
    selectChat,
    createChat,
    removeChat,
    renameChat: renameChatById,
  });
  sessionActionsRef.current = {
    selectChat,
    createChat,
    removeChat,
    renameChat: renameChatById,
  };

  useEffect(() => {
    if (!shell) return;
    registerSessionActions({
      selectChat: (id) => sessionActionsRef.current.selectChat(id),
      createChat: () => sessionActionsRef.current.createChat(),
      removeChat: (id) => sessionActionsRef.current.removeChat(id),
      renameChat: (id, title) =>
        sessionActionsRef.current.renameChat(id, title),
    });
    return () => registerSessionActions(null);
  }, [shell, registerSessionActions]);

  async function sendText(textRaw: string) {
    const text = textRaw.trim();
    const current = chatsRef.current.find((c) => c.id === activeIdRef.current);
    if (!text || busy || !current) return;

    if (!user) {
      openAuthGate();
      setBanner({
        code: "auth_required",
        title: "Sign in required",
        message: "Sign in to chat with Master Perfumer.",
        actionable: "Use Sign in in the top bar, then send again.",
      });
      return;
    }

    setBanner(null);
    setBusy(true);
    setInput("");

    const clientMessageId = uid("cm");
    const userMsg: ChatMessage = {
      id: uid("msg"),
      role: "user",
      content: text,
      clientMessageId,
      createdAt: new Date().toISOString(),
    };
    const assistantId = uid("msg");
    const now = new Date().toISOString();
    const chatLocalId = current.id;

    updateChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatLocalId) return c;
        const title =
          c.title === "New chat"
            ? text.slice(0, 48) + (text.length > 48 ? "…" : "")
            : c.title;
        return {
          ...c,
          title,
          updatedAt: now,
          messages: [
            ...c.messages,
            userMsg,
            {
              id: assistantId,
              role: "assistant",
              content: "",
              status: "streaming",
              thinkingLabel: "Listening to the brief...",
              toolTrace: [],
            },
          ],
        };
      }),
    );

    const patchAssistant = (
      patch: Partial<ChatMessage> | ((m: ChatMessage) => ChatMessage),
    ) => {
      updateChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatLocalId) return c;
          return {
            ...c,
            messages: c.messages.map((m) => {
              if (m.id !== assistantId) return m;
              return typeof patch === "function" ? patch(m) : { ...m, ...patch };
            }),
          };
        }),
      );
    };

    const serverId = await ensureServerId(current);
    const historyForApi = current.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .filter((m) => m.content)
      .map((m) => ({ role: m.role, content: m.content }));

    await streamChat(
      {
        chatId: serverId || undefined,
        message: text,
        clientMessageId,
        mode: chatAgentMode,
        messages: serverId
          ? undefined
          : [...historyForApi, { role: "user", content: text }],
      },
      {
        onMeta: ({ chatId, toolTrace }) => {
          updateChats((prev) =>
            prev.map((c) =>
              c.id === chatLocalId
                ? {
                    ...c,
                    serverId: chatId || c.serverId,
                  }
                : c,
            ),
          );
          if (toolTrace?.length) {
            patchAssistant((m) => ({
              ...m,
              toolTrace: toolTrace.map((t) => ({
                tool: t.tool,
                ok: t.ok,
              })),
            }));
          }
        },
        onStatus: (label) => {
          patchAssistant({ thinkingLabel: label });
        },
        onTool: (tool, ok) => {
          patchAssistant((m) => {
            const next: ToolTraceItem[] = [
              ...(m.toolTrace || []),
              { tool, ok },
            ];
            // dedupe consecutive identical
            const deduped = next.filter(
              (t, i, arr) => i === 0 || t.tool !== arr[i - 1].tool,
            );
            return { ...m, toolTrace: deduped };
          });
        },
        onToken: (chunk) => {
          patchAssistant((m) => ({
            ...m,
            content: (m.content || "") + chunk,
            thinkingLabel: undefined,
          }));
        },
        onStructured: (structured, sections) => {
          patchAssistant({
            structured,
            sections: sections || undefined,
          });
          publishPlan(structured);
        },
        onLabBridge: (payload) => {
          patchAssistant((m) => {
            const nextStructured = {
              ...(m.structured || {}),
              lab_bridge: payload,
            };
            publishPlan(nextStructured);
            return {
              ...m,
              structured: nextStructured,
            };
          });
        },
        onDone: (reply, sections, structured, chatId) => {
          publishPlan(structured);
          updateChats((prev) =>
            prev.map((c) => {
              if (c.id !== chatLocalId) return c;
              return {
                ...c,
                serverId: chatId || c.serverId,
                updatedAt: new Date().toISOString(),
                messages: c.messages.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: reply || m.content,
                        sections,
                        structured: structured || m.structured,
                        status: "ok" as const,
                        thinkingLabel: undefined,
                      }
                    : m,
                ),
              };
            }),
          );
          setBusy(false);
        },
        onError: (error, chatId) => {
          setBanner(error);
          updateChats((prev) =>
            prev.map((c) => {
              if (c.id !== chatLocalId) return c;
              return {
                ...c,
                serverId: chatId || c.serverId,
                messages: c.messages.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        role: "error" as const,
                        content: error.message,
                        error,
                        status: "error" as const,
                        thinkingLabel: undefined,
                      }
                    : m,
                ),
              };
            }),
          );
          setBusy(false);
        },
      },
    );
  }

  async function onSend() {
    await sendText(input);
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-lab-muted">
        Loading atelier…
      </div>
    );
  }

  const messages = active?.messages || [];
  const empty = messages.length === 0 && loadingChatId !== active?.id;

  return (
    <div
      className={`flex h-full min-h-0 flex-1 flex-col ${
        shell ? "gap-0" : "gap-2 md:gap-3"
      }`}
    >
      {banner ? (
        <div className={shell ? "px-2 pt-2" : "px-3 md:px-0"}>
          <ErrorBanner error={banner} onDismiss={() => setBanner(null)} />
        </div>
      ) : null}

      {health && !health.groqConfigured ? (
        <div className={shell ? "px-2 pt-2" : "px-3 md:px-0"}>
          <ErrorBanner
            error={{
              code: "missing_env",
              title: "Model not configured",
              message: "Chat needs a model key on the server before it can reply.",
              actionable: "Ask whoever runs the backend to set the Groq key and restart.",
            }}
          />
        </div>
      ) : null}

      <div
        className={`relative flex min-h-0 flex-1 overflow-hidden ${
          shell
            ? "h-full border-0 bg-lab-panel"
            : "border-y border-lab-line/70 bg-lab-panel/80 md:rounded-2xl md:border md:border-lab-line/70"
        }`}
      >
        {/* Shell uses center ChatHistoryCanvas; page keeps side rail / drawer */}
        {!shell && sidebarOpen ? (
          <button
            type="button"
            aria-label="Close chats"
            className="absolute inset-0 z-20 bg-lab-ink/35 backdrop-blur-[1px] md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        {!shell ? (
        <aside
          className={`absolute inset-y-0 left-0 z-30 flex w-[min(16rem,86vw)] flex-col border-r border-lab-line bg-lab-panel shadow-[8px_0_24px_-16px_rgba(12,12,12,0.35)] transition-transform duration-300 ease-out md:static md:z-0 md:w-[15.5rem] md:translate-x-0 md:shadow-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-lab-line/60 px-3 py-2">
            <p className="text-xs font-semibold tracking-wide text-lab-ink">
              Chats
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={createChat}
                className="min-h-8 rounded-md bg-lab-ink px-2.5 text-[11px] font-semibold text-lab-foam hover:bg-black"
              >
                New
              </button>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className={`min-h-8 rounded-md px-2 text-[11px] font-medium text-lab-muted hover:text-lab-ink ${
                  shell ? "" : "md:hidden"
                }`}
              >
                Close
              </button>
            </div>
          </div>
          <ul className="scroll-thin flex-1 space-y-0.5 overflow-y-auto p-1.5">
            {chats.map((c) => {
              const selected = c.id === activeId;
              return (
                <li key={c.id} className="group relative">
                  {renamingId === c.id ? (
                    <form
                      className="px-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        commitRename();
                      }}
                    >
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        className="min-h-9 w-full rounded-md border border-lab-line bg-white px-2 py-1.5 text-xs text-lab-ink"
                      />
                    </form>
                  ) : (
                    <div
                      className={`flex items-stretch gap-0.5 rounded-md ${
                        selected ? "bg-lab-ink" : "hover:bg-lab-wash"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => void selectChat(c.id)}
                        className={`flex min-h-9 min-w-0 flex-1 items-center justify-between gap-2 px-2.5 py-1.5 text-left ${
                          selected ? "text-lab-foam" : "text-lab-ink"
                        }`}
                      >
                        <span className="line-clamp-1 flex-1 text-xs font-medium leading-snug">
                          {c.title}
                        </span>
                        <span
                          className={`shrink-0 font-mono text-[10px] ${
                            selected ? "text-lab-foam/50" : "text-lab-muted"
                          }`}
                        >
                          {formatChatTime(c.updatedAt)}
                        </span>
                      </button>
                      <div className="hidden shrink-0 items-center gap-0.5 pr-1 opacity-0 transition-opacity group-hover:opacity-100 md:flex">
                        <button
                          type="button"
                          title="Rename"
                          onClick={() => startRename(c)}
                          className={`rounded px-1.5 py-0.5 text-[10px] ${
                            selected
                              ? "bg-white/15 text-lab-foam"
                              : "text-lab-muted hover:bg-white"
                          }`}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => void removeChat(c.id)}
                          className={`rounded px-1.5 py-0.5 text-[10px] ${
                            selected
                              ? "bg-white/15 text-lab-foam"
                              : "text-lab-muted hover:bg-white"
                          }`}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {health ? (
            <p className="border-t border-lab-line px-3 py-2 font-mono text-[9px] leading-relaxed text-lab-muted">
              {String(health.ingredients || 0)} materials ·{" "}
              {String(health.formulas || 0)} formulas
              {health.searchConfigured ? " · research on" : ""}
            </p>
          ) : null}
        </aside>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {shell ? (
            <div
              className={`flex shrink-0 items-center gap-1 border-b border-lab-line/60 ${
                bottomDock
                  ? "h-8 bg-lab-wash/40 px-1.5"
                  : "h-9 px-2"
              }`}
            >
              {showDockControls ? (
                <ChatDockHandle
                  dock={chatDock}
                  onDock={setChatDock}
                  variant={bottomDock ? "bar" : "dots"}
                />
              ) : null}

              {bottomDock ? (
                <div className="flex min-w-0 flex-1 items-end gap-0 self-stretch pl-1">
                  <span className="relative flex h-full items-center border-b-2 border-lab-ink px-2 text-[11px] font-semibold text-lab-ink">
                    Perfumer
                  </span>
                  {building ? (
                    <span className="mb-1.5 ml-1 rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-lab-amber">
                      {buildSteps.length
                        ? `${Math.min(buildStepIndex + 1, buildSteps.length)}/${buildSteps.length}`
                        : "Build"}
                    </span>
                  ) : null}
                </div>
              ) : (
                <>
                  <p className="truncate text-[11px] font-semibold tracking-wide text-lab-ink">
                    {active?.title || "Perfumer"}
                  </p>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium ${
                      building
                        ? "bg-lab-amber/15 text-lab-amber"
                        : "text-lab-muted"
                    }`}
                    title={
                      building
                        ? "Build queue running on the desk"
                        : chatAgentMode === "plan"
                          ? "Plan mode: propose only, no desk pours"
                          : "Agent mode: tools on, Build still explicit"
                    }
                  >
                    {building
                      ? buildSteps.length
                        ? `Building ${Math.min(buildStepIndex + 1, buildSteps.length)}/${buildSteps.length}`
                        : "Building"
                      : chatAgentMode === "plan"
                        ? "Plan"
                        : "Agent"}
                  </span>
                  <div className="flex-1" />
                </>
              )}

              {bottomDock ? (
                <div className="mr-1 hidden md:block">
                  <ChatModeToggle
                    mode={chatAgentMode}
                    onChange={changeChatMode}
                    disabled={building}
                    size="sm"
                  />
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  if (shell) {
                    const wasOpen = centerView === "history";
                    toggleChatHistory();
                    track(
                      wasOpen
                        ? "builder_history_close"
                        : "builder_history_open",
                      { dock: chatDock, via: "toggle" },
                    );
                    return;
                  }
                  setSidebarOpen(true);
                }}
                className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-lab-wash hover:text-lab-ink ${
                  shell && centerView === "history"
                    ? "bg-lab-wash text-lab-ink"
                    : "text-lab-muted"
                }`}
                title={
                  shell && centerView === "history"
                    ? "Back to desk"
                    : "Chat history"
                }
                aria-label={
                  shell && centerView === "history"
                    ? "Back to desk"
                    : "Chat history"
                }
                aria-pressed={shell ? centerView === "history" : undefined}
              >
                <span aria-hidden className="font-mono text-[12px] leading-none">
                  ◷
                </span>
              </button>
              <button
                type="button"
                onClick={createChat}
                className="flex h-7 w-7 items-center justify-center rounded-md text-lab-muted hover:bg-lab-wash hover:text-lab-ink"
                title="New chat"
                aria-label="New chat"
              >
                <span aria-hidden className="text-[15px] leading-none">
                  +
                </span>
              </button>
              {showDockControls ? (
                <button
                  type="button"
                  onClick={() => setRightOpen(false)}
                  className="hidden h-7 w-7 items-center justify-center rounded-md text-lab-muted hover:bg-lab-wash hover:text-lab-ink md:flex"
                  title="Hide chat (⌘T)"
                  aria-label="Hide chat"
                >
                  <span aria-hidden className="text-[14px] leading-none">
                    ×
                  </span>
                </button>
              ) : null}
              {onCloseSheet ? (
                <button
                  type="button"
                  onClick={onCloseSheet}
                  className="min-h-8 rounded-md bg-lab-ink px-2.5 text-[11px] font-semibold text-lab-foam md:hidden"
                >
                  Done
                </button>
              ) : null}
            </div>
          ) : (
            <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-lab-line/50 px-2.5 md:px-3">
              <button
                type="button"
                className="min-h-9 rounded-md border border-lab-line px-3 text-sm font-medium text-lab-ink md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                Chats
              </button>
              <h2 className="min-w-0 flex-1 truncate font-display text-base text-lab-ink md:text-lg">
                {active?.title || "Master Perfumer"}
              </h2>
            </div>
          )}

          <div
            className={`scroll-thin min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain ${
              bottomDock
                ? "px-2.5 py-2"
                : shell
                  ? "space-y-3 px-3 py-3"
                  : "space-y-3 px-3 py-3 md:space-y-4 md:px-5 md:py-4"
            }`}
          >
            {loadingChatId === active?.id ? (
              <p className="py-8 text-center text-sm text-lab-muted">
                Loading conversation…
              </p>
            ) : empty && !narration.length ? (
              <EmptyState
                compact={shell}
                dense={bottomDock}
                chatAgentMode={chatAgentMode}
              />
            ) : (
              <>
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    onBuild={shell ? onUseInPlan : undefined}
                    hideLabCta={shell}
                  />
                ))}
                {narration.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-md border border-lab-line/50 bg-lab-wash/60 px-2.5 py-1.5 text-sm leading-relaxed text-lab-ink/90"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-lab-muted">
                      Build
                    </p>
                    <p className="mt-0.5">{n.text}</p>
                  </div>
                ))}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          <div
            className={`mt-auto shrink-0 border-t border-lab-line/50 bg-lab-panel ${
              bottomDock
                ? "px-2 py-1.5"
                : shell
                  ? "px-2.5 py-2 pb-2"
                  : "px-2.5 py-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:px-4 md:py-3 md:pb-3"
            }`}
          >
            {building && shell ? (
              <div
                role="status"
                className="mb-1.5 flex items-center gap-2 rounded-md border border-lab-amber/30 bg-lab-amber/10 px-2 py-1"
              >
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-lab-amber" />
                <p className="min-w-0 flex-1 text-[11px] font-medium text-lab-ink">
                  Building on desk
                  {buildSteps.length
                    ? ` · ${Math.min(buildStepIndex + 1, buildSteps.length)}/${buildSteps.length}`
                    : ""}
                </p>
                <p className="shrink-0 text-[10px] text-lab-muted">
                  Stop from Plan
                </p>
              </div>
            ) : null}

            {showPlanNudge ? (
              <PlanModeNudge
                onSwitch={() => changeChatMode("plan")}
                onDismiss={() => setNudgeDismissed(true)}
              />
            ) : null}

            {shell && !bottomDock ? (
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <ChatModeToggle
                  mode={chatAgentMode}
                  onChange={changeChatMode}
                  disabled={building}
                  size="sm"
                />
                <p className="truncate text-[10px] text-lab-muted">
                  {chatAgentMode === "plan"
                    ? "Propose only · Build is explicit"
                    : "Tools on · Build still explicit"}
                </p>
              </div>
            ) : null}

            {shell && bottomDock ? (
              <div className="mb-1 flex md:hidden">
                <ChatModeToggle
                  mode={chatAgentMode}
                  onChange={changeChatMode}
                  disabled={building}
                  size="sm"
                />
              </div>
            ) : null}

            <div
              className={`flex items-end gap-1.5 ${
                shell
                  ? "rounded-md border border-lab-line/80 bg-white px-1.5 py-1"
                  : ""
              }`}
            >
              <textarea
                ref={composerRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  requestAnimationFrame(syncComposerHeight);
                }}
                onInput={syncComposerHeight}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSend();
                  }
                }}
                rows={1}
                placeholder={
                  user
                    ? shell
                      ? chatAgentMode === "plan"
                        ? "Plan a brief: vibe, occasion, format…"
                        : "Brief a vibe, occasion, format…"
                      : "Brief me: goal, type, vibe…"
                    : "Sign in to brief the Perfumer…"
                }
                className={
                  shell
                    ? `[field-sizing:content] min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 focus:outline-none ${
                        bottomDock
                          ? "max-h-28 min-h-7 py-1 text-[13px] leading-snug text-lab-ink placeholder:text-lab-muted/65"
                          : "max-h-32 min-h-8 py-1.5 text-[13px] leading-snug text-lab-ink placeholder:text-lab-muted/70"
                      }`
                    : "[field-sizing:content] max-h-40 min-h-12 min-w-0 flex-1 resize-none overflow-y-auto rounded-xl border border-lab-line bg-lab-panel px-3 py-3 text-[15px] leading-snug text-lab-ink placeholder:text-lab-muted/70 focus:outline-none focus:ring-1 focus:ring-lab-ink/30 md:min-h-11 md:rounded-lg md:py-2.5 md:text-[13px]"
                }
                disabled={busy || building}
              />
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    openAuthGate();
                    return;
                  }
                  void onSend();
                }}
                disabled={busy || building || (!user ? false : !input.trim())}
                className={
                  shell
                    ? `mb-0.5 shrink-0 rounded-md bg-lab-ink font-semibold text-lab-foam transition hover:bg-black disabled:opacity-40 ${
                        bottomDock
                          ? "h-7 px-2.5 text-[10px]"
                          : "h-8 px-3 text-[11px]"
                      }`
                    : "h-12 w-16 shrink-0 self-end rounded-xl bg-lab-ink text-sm font-semibold text-lab-foam transition-opacity hover:bg-black disabled:opacity-50 md:h-11 md:w-auto md:rounded-lg md:px-4"
                }
              >
                {user ? "Send" : "Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  compact,
  dense,
  chatAgentMode,
}: {
  compact?: boolean;
  dense?: boolean;
  chatAgentMode?: "plan" | "agent";
} = {}) {
  if (compact) {
    return (
      <div
        className={`flex w-full max-w-sm flex-col items-start px-1 ${
          dense ? "py-2" : "py-4"
        }`}
      >
        <p
          className={`leading-relaxed text-lab-muted ${
            dense ? "text-xs" : "text-sm"
          }`}
        >
          {chatAgentMode === "plan"
            ? "Plan mode: structure a formula first. Build pours only when you press Build."
            : "Brief a vibe. Agent drafts a formula; Build pours on the desk when you say so."}
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-2 py-10 text-center md:py-16">
      <AlyraMark size="md" href={null} className="justify-center" />
      <p className="mt-6 font-display text-2xl leading-snug tracking-tight text-lab-ink">
        Hey, welcome to Alyra Labs
      </p>
      <p className="mt-3 text-sm leading-relaxed text-lab-muted">
        I&apos;m your Master Perfumer for Indian makers. Brief me like a client:
        solid, oil, or EDP, occasion and vibe, and we&apos;ll compose for heat,
        with materials, IFRA caution, and cost in ₹. Nothing silent-pours.
        Press Build when the Plan looks right.
      </p>
    </div>
  );
}

function MessageBubble({
  message,
  onBuild,
  hideLabCta,
}: {
  message: ChatMessage;
  onBuild?: (bridge: LabBridgeFormula) => void;
  hideLabCta?: boolean;
}) {
  if (message.role === "error") {
    return message.error ? <ErrorBanner error={message.error} /> : null;
  }

  const isUser = message.role === "user";
  const streamingEmpty =
    !isUser &&
    message.status === "streaming" &&
    !(message.content && message.content.length);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[min(42rem,100%)] ${
          isUser
            ? "rounded-2xl bg-lab-ink px-4 py-2.5 text-lab-foam"
            : "w-full space-y-3"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
            {message.content}
          </p>
        ) : (
          <>
            {message.warnings?.map((w) => (
              <WarningBanner
                key={w.code + w.message}
                title={w.title}
                message={w.message}
              />
            ))}
            {(message.structured?.ifraFlags || []).some(
              (f) => f.severity === "blocked" || f.severity === "warning",
            ) ? (
              <WarningBanner
                title="IFRA caution"
                message={(message.structured?.ifraFlags || [])
                  .map((f) => `${f.name}: ${f.ifraNotes || f.severity}`)
                  .join(" · ")}
              />
            ) : null}

            {streamingEmpty ? (
              <ThinkingPanel label={message.thinkingLabel} />
            ) : null}

            {message.content ? (
              <div>
                {message.status === "streaming" &&
                !message.content &&
                message.thinkingLabel ? (
                  <ThinkingPanel label={message.thinkingLabel} />
                ) : null}
                <Prose text={message.content} />
                {message.status === "streaming" ? (
                  <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-lab-ink/50" />
                ) : null}
              </div>
            ) : null}

            {message.toolTrace?.length && message.status === "ok" ? (
              <details className="text-[11px] text-lab-muted">
                <summary className="cursor-pointer tracking-wide">
                  Tools used
                </summary>
                <ul className="mt-1.5 space-y-0.5 font-mono">
                  {message.toolTrace.map((t, i) => (
                    <li key={`${t.tool}-${i}`}>
                      {t.tool.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            <FormulaCard
              structured={message.structured}
              sections={message.sections}
              onBuild={onBuild}
              hideLabCta={hideLabCta}
            />
          </>
        )}
      </div>
    </div>
  );
}
