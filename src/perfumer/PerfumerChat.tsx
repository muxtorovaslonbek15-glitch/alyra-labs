"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlyraMark } from "@/components/brand/AlyraMark";
import {
  checkPerfumerHealth,
  createServerChat,
  deleteServerChat,
  fetchServerChat,
  getPerfumerBaseUrl,
  listServerChats,
  renameServerChat,
  streamChat,
} from "./api";
import { ErrorBanner, WarningBanner } from "./ErrorBanner";
import { FormulaCard } from "./FormulaCard";
import {
  loadLocalStore,
  newLocalChat,
  saveLocalStore,
  uid,
} from "./storage";
import { Prose } from "./Prose";
import { ThinkingPanel } from "./ThinkingPanel";
import type {
  ChatMessage,
  ChatSession,
  PerfumerApiError,
  ToolTraceItem,
} from "./types";

const SUGGESTIONS = [
  {
    label: "Solid woody rose",
    prompt:
      "Create a luxury niche solid perfume: deep woody rose with oud, sandalwood, and a touch of sweetness. Give top/heart/base, %, solid wax constraints, and cost if possible.",
  },
  {
    label: "Fix harsh opening",
    prompt:
      "Improve this weak formula: bergamot 18%, lemon 12%, rose absolute 8%, iso e super 25%, hedione 15%, ambroxan 5%, musks 12%, ethanol qs. Harsh opening, poor longevity. Give precise percent mods.",
  },
  {
    label: "Inspired-by woody rose",
    prompt:
      "Give an approximate inspired-by structure for a known woody-rose niche scent (disclaimer + useful accord, not a copy). Prefer materials we can source.",
  },
  {
    label: "IFRA / substitute",
    prompt:
      "What is a good IFRA-aware substitute for lyral in a floral heart, and what current IFRA notes should I watch for rose oxide / methyl ionone?",
  },
];

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

export function PerfumerChat() {
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatsRef = useRef<ChatSession[]>([]);
  const activeIdRef = useRef<string | null>(null);

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
    setChats(nextChats);
    setActiveId(nextActive);
    setHydrated(true);
    saveLocalStore({ version: 1, activeId: nextActive, chats: nextChats });

    void checkPerfumerHealth().then((h) => {
      if (!h.ok && h.error) setBanner(h.error);
      else setHealth(h.data || null);
    });

    void listServerChats().then(async (res) => {
      if (!res.ok) return;
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
  }, []);

  useEffect(() => {
    if (hydrated) persist(chats, activeId);
  }, [chats, activeId, hydrated, persist]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages, busy, active?.id]);

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

  async function selectChat(id: string) {
    setActiveId(id);
    setSidebarOpen(false);
    setBanner(null);
    const chat = chatsRef.current.find((c) => c.id === id);
    if (!chat) return;

    // Always hydrate full history from server when we only have a stub
    // or when local is empty but a server id exists.
    if (chat.serverId && chat.messages.length === 0) {
      setLoadingChatId(id);
      try {
        const remote = await fetchServerChat(chat.serverId);
        if (remote.ok && remote.chat.messages.length) {
          updateChats((prev) =>
            prev.map((c) =>
              c.id === id
                ? {
                    ...c,
                    title: remote.chat.title || c.title,
                    messages: remote.chat.messages,
                    updatedAt: remote.chat.updatedAt,
                  }
                : c,
            ),
          );
        }
      } finally {
        setLoadingChatId(null);
      }
    }
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
    const title = renameValue.trim().slice(0, 120) || "New chat";
    const target = chatsRef.current.find((c) => c.id === renamingId);
    updateChats((prev) =>
      prev.map((c) =>
        c.id === renamingId
          ? { ...c, title, updatedAt: new Date().toISOString() }
          : c,
      ),
    );
    if (target?.serverId) void renameServerChat(target.serverId, title);
    setRenamingId(null);
  }

  async function sendText(textRaw: string) {
    const text = textRaw.trim();
    const current = chatsRef.current.find((c) => c.id === activeIdRef.current);
    if (!text || busy || !current) return;

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
        },
        onDone: (reply, sections, structured, chatId) => {
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
    <div className="flex min-h-0 flex-1 flex-col gap-2 md:gap-3">
      {banner ? (
        <div className="px-3 md:px-0">
          <ErrorBanner error={banner} onDismiss={() => setBanner(null)} />
        </div>
      ) : null}

      {health && !health.groqConfigured ? (
        <div className="px-3 md:px-0">
          <ErrorBanner
            error={{
              code: "missing_env",
              title: "Groq key missing",
              message:
                "The server has no GROQ_API_KEY — chat will fail until it is set.",
              actionable: "Add GROQ_API_KEY to ZPL_BACKEND/.env and restart.",
            }}
          />
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1 overflow-hidden border-y border-lab-line/70 bg-lab-panel/80 md:rounded-2xl md:border md:border-lab-line/70">
        {sidebarOpen ? (
          <button
            type="button"
            aria-label="Close chats"
            className="absolute inset-0 z-20 bg-lab-ink/35 backdrop-blur-[1px] md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        {/* Phone: slide-over drawer; md+: static rail */}
        <aside
          className={`absolute inset-y-0 left-0 z-30 flex w-[min(18.5rem,86vw)] flex-col border-r border-lab-line bg-lab-wash shadow-[8px_0_24px_-16px_rgba(12,12,12,0.35)] transition-transform duration-300 ease-out md:static md:z-0 md:w-[15.5rem] md:translate-x-0 md:shadow-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-lab-line px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] md:pt-2.5">
            <p className="font-display text-sm tracking-wide text-lab-ink">
              Chats
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={createChat}
                className="min-h-11 rounded-md bg-lab-ink px-3 text-xs font-semibold text-lab-foam hover:bg-black md:min-h-9 md:px-2.5 md:text-[11px]"
              >
                New
              </button>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="min-h-11 rounded-md border border-lab-line px-3 text-xs font-semibold text-lab-ink md:hidden"
              >
                Done
              </button>
            </div>
          </div>
          <ul className="scroll-thin flex-1 space-y-1 overflow-y-auto p-2">
            {chats.map((c) => {
              const selected = c.id === activeId;
              const preview =
                c.messages.find((m) => m.role === "user")?.content ||
                (c.messages.length ? `${c.messages.length} messages` : "Empty");
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
                        className="min-h-11 w-full rounded-md border border-lab-line bg-lab-panel px-2 py-2 text-sm text-lab-ink md:min-h-0 md:py-1.5 md:text-xs"
                      />
                    </form>
                  ) : (
                    <div
                      className={`flex items-stretch gap-0.5 rounded-lg ${
                        selected ? "bg-lab-ink" : "hover:bg-white/70"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => void selectChat(c.id)}
                        className={`flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-0.5 px-2.5 py-2 text-left transition-colors md:min-h-0 ${
                          selected ? "text-lab-foam" : "text-lab-ink"
                        }`}
                      >
                        <span className="flex w-full items-baseline justify-between gap-2">
                          <span className="line-clamp-1 flex-1 text-sm font-medium leading-snug md:text-xs">
                            {c.title}
                          </span>
                          <span
                            className={`shrink-0 font-mono text-[10px] md:text-[9px] ${
                              selected ? "text-lab-foam/55" : "text-lab-muted"
                            }`}
                          >
                            {formatChatTime(c.updatedAt)}
                          </span>
                        </span>
                        <span
                          className={`line-clamp-1 text-[11px] leading-snug md:text-[10px] ${
                            selected ? "text-lab-foam/60" : "text-lab-muted"
                          }`}
                        >
                          {preview}
                        </span>
                      </button>
                      <div className="flex shrink-0 flex-col justify-center gap-0.5 pr-1 md:hidden">
                        <button
                          type="button"
                          title="Rename"
                          aria-label="Rename chat"
                          onClick={() => startRename(c)}
                          className={`min-h-9 min-w-9 rounded text-xs ${
                            selected
                              ? "bg-white/15 text-lab-foam"
                              : "bg-lab-panel text-lab-muted"
                          }`}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          aria-label="Delete chat"
                          onClick={() => void removeChat(c.id)}
                          className={`min-h-9 min-w-9 rounded text-xs ${
                            selected
                              ? "bg-white/15 text-lab-foam"
                              : "bg-lab-panel text-lab-muted"
                          }`}
                        >
                          ×
                        </button>
                      </div>
                      <div className="hidden shrink-0 flex-col justify-center gap-0.5 pr-1 opacity-0 transition-opacity group-hover:opacity-100 md:flex">
                        <button
                          type="button"
                          title="Rename"
                          onClick={() => startRename(c)}
                          className={`rounded px-1.5 py-0.5 text-[10px] ${
                            selected
                              ? "bg-white/15 text-lab-foam"
                              : "bg-lab-panel text-lab-muted"
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
                              : "bg-lab-panel text-lab-muted"
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

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-lab-line px-3 py-2 md:px-4 md:py-2.5">
            <button
              type="button"
              className="min-h-11 rounded-md border border-lab-line px-3 text-sm font-medium text-lab-ink md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              Chats
            </button>
            <h2 className="min-w-0 flex-1 truncate font-display text-base text-lab-ink md:text-lg">
              {active?.title || "Master Perfumer"}
            </h2>
            <span className="hidden font-mono text-[10px] text-lab-muted md:inline">
              {getPerfumerBaseUrl().replace(/^https?:\/\//, "")}
            </span>
          </div>

          <div className="scroll-thin flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3 md:space-y-4 md:px-5 md:py-4">
            {loadingChatId === active?.id ? (
              <p className="py-8 text-center text-sm text-lab-muted">
                Loading conversation…
              </p>
            ) : empty ? (
              <EmptyState
                onSuggestion={(s) => {
                  void sendText(s);
                }}
              />
            ) : (
              messages.map((m) => <MessageBubble key={m.id} message={m} />)
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-lab-line bg-lab-wash/60 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:px-4 md:py-3 md:pb-3">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSend();
                  }
                }}
                rows={2}
                placeholder="Brief me — goal, type, vibe…"
                className="min-h-[48px] flex-1 resize-none rounded-xl border border-lab-line bg-lab-panel px-3 py-3 text-base text-lab-ink placeholder:text-lab-muted/70 focus:outline-none focus:ring-1 focus:ring-lab-ink/30 md:min-h-[44px] md:rounded-lg md:py-2.5 md:text-sm"
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => void onSend()}
                disabled={busy || !input.trim()}
                className="h-12 w-16 shrink-0 self-end rounded-xl bg-lab-ink text-sm font-semibold text-lab-foam transition-opacity hover:bg-black disabled:opacity-50 md:h-11 md:w-auto md:rounded-lg md:px-4"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (s: string) => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-2 py-10 text-center md:py-16">
      <AlyraMark size="md" href={null} className="justify-center" />
      <p className="mt-6 font-display text-2xl leading-snug tracking-tight text-lab-ink">
        Hey, welcome to Alyra Labs
      </p>
      <p className="mt-3 text-sm leading-relaxed text-lab-muted">
        I&apos;m your Master Perfumer. Brief me like a client: solid, oil, or
        EDP, and we&apos;ll compose with materials, IFRA caution, and cost in
        view.
      </p>
      <ul className="mt-8 w-full space-y-1.5 text-left">
        {SUGGESTIONS.map((s) => (
          <li key={s.label}>
            <button
              type="button"
              onClick={() => onSuggestion(s.prompt)}
              className="min-h-12 w-full rounded-lg px-3 py-3 text-left text-sm text-lab-ink transition-colors hover:bg-lab-wash/80"
            >
              <span className="font-medium">{s.label}</span>
              <span className="mt-0.5 block line-clamp-1 text-[12px] text-lab-muted">
                {s.prompt}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
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
            />
          </>
        )}
      </div>
    </div>
  );
}
