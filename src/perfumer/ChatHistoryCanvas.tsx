"use client";

import { useEffect, useState } from "react";
import { useBuilderStore } from "@/store/builderStore";
import { useChatSessionsStore } from "@/perfumer/chatSessionsStore";
import { track } from "@/lib/analytics/track";
import { usePresence } from "@/animation/usePresence";

function formatChatTime(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function HistoryListBody({
  onSelect,
  onNew,
  onBack,
}: {
  onSelect: (id: string) => void;
  onNew: () => void;
  onBack: () => void;
}) {
  const items = useChatSessionsStore((s) => s.items);
  const activeId = useChatSessionsStore((s) => s.activeId);
  const loadingChatId = useChatSessionsStore((s) => s.loadingChatId);
  const actions = useChatSessionsStore((s) => s.actions);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function commitRename() {
    if (!renamingId || !actions?.renameChat) {
      setRenamingId(null);
      return;
    }
    const title = renameValue.trim().slice(0, 120) || "New chat";
    actions.renameChat(renamingId, title);
    setRenamingId(null);
  }

  return (
    <>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-lab-line/60 px-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lab-muted">
          Chats
        </p>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onNew}
          className="flex h-7 items-center rounded-lg bg-lab-ink px-2.5 text-[11px] font-semibold leading-none text-lab-foam hover:bg-black"
        >
          New
        </button>
        <button
          type="button"
          onClick={onBack}
          className="flex h-7 items-center rounded-lg px-2.5 text-[11px] font-medium leading-none text-lab-muted hover:bg-lab-wash hover:text-lab-ink"
        >
          Back to desk
        </button>
      </div>

      <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <li className="px-3 py-10 text-center text-xs text-lab-muted">
            No chats yet. Start one from the Perfumer panel.
          </li>
        ) : (
          items.map((c) => {
            const selected = c.id === activeId;
            const loading = c.id === loadingChatId;
            return (
              <li key={c.id} className="group mb-0.5">
                {renamingId === c.id ? (
                  <form
                    className="px-1 py-1"
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
                      className="min-h-10 w-full rounded-md border border-lab-line bg-white px-3 py-2 text-sm text-lab-ink"
                    />
                  </form>
                ) : (
                  <div
                    className={`flex items-stretch rounded-lg ${
                      selected
                        ? "bg-lab-ink text-lab-foam"
                        : "hover:bg-lab-wash"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      className="min-w-0 flex-1 px-3 py-2.5 text-left"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-xs font-medium">
                          {c.title}
                        </span>
                        <span
                          className={`shrink-0 font-mono text-[9px] ${
                            selected ? "text-lab-foam/55" : "text-lab-muted"
                          }`}
                        >
                          {loading ? "…" : formatChatTime(c.updatedAt)}
                        </span>
                      </div>
                      {(c.preview || c.hasPlan) && (
                        <p
                          className={`mt-0.5 line-clamp-1 text-[11px] ${
                            selected ? "text-lab-foam/65" : "text-lab-muted"
                          }`}
                        >
                          {c.preview}
                          {c.hasPlan ? `${c.preview ? " · " : ""}Plan` : ""}
                        </p>
                      )}
                    </button>
                    <div
                      className={`hidden shrink-0 items-center gap-0.5 pr-1.5 opacity-0 transition-opacity group-hover:opacity-100 md:flex ${
                        selected ? "opacity-100" : ""
                      }`}
                    >
                      <button
                        type="button"
                        title="Rename"
                        onClick={() => {
                          setRenamingId(c.id);
                          setRenameValue(c.title);
                        }}
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
                        onClick={() => void actions?.removeChat(c.id)}
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
          })
        )}
      </ul>

      <p className="shrink-0 border-t border-lab-line/50 px-3 py-2 text-[10px] text-lab-muted">
        Esc or Back to desk · Selecting a chat loads it in Perfumer
      </p>
    </>
  );
}

/**
 * Cursor-like: History replaces the center desk canvas (not a cramped rail drawer).
 * Desktop: in-column paper list. Phone: full sheet over desk.
 */
export function ChatHistoryCanvas() {
  const centerView = useBuilderStore((s) => s.centerView);
  const closeChatHistory = useBuilderStore((s) => s.closeChatHistory);
  const actions = useChatSessionsStore((s) => s.actions);
  const open = centerView === "history";
  const { mounted, visible } = usePresence(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeChatHistory();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeChatHistory]);

  if (!mounted) return null;

  async function onSelect(id: string) {
    if (!actions?.selectChat) return;
    track("builder_history_select", { id });
    await actions.selectChat(id);
    closeChatHistory();
  }

  function onNew() {
    actions?.createChat();
    track("builder_history_new", {});
  }

  function onBack() {
    closeChatHistory();
    track("builder_history_close", { via: "back" });
  }

  const fade = visible ? "lab-crossfade-in" : "lab-crossfade-out";

  return (
    <>
      <div
        className={`absolute inset-0 z-20 hidden flex-col overflow-hidden rounded-none border border-lab-line/70 bg-lab-panel lab-crossfade md:flex md:rounded-[1.25rem] ${fade}`}
        data-lab-history-canvas
        role="region"
        aria-label="Chat history"
      >
        <HistoryListBody onSelect={onSelect} onNew={onNew} onBack={onBack} />
      </div>

      <div
        className={`fixed inset-0 z-[280] flex flex-col justify-end lab-crossfade md:hidden ${fade}`}
        role="dialog"
        aria-modal="true"
        aria-label="Chat history"
      >
        <button
          type="button"
          className="absolute inset-0 bg-lab-ink/45"
          aria-label="Close history"
          onClick={onBack}
        />
        <div className="relative flex max-h-[92dvh] min-h-[75dvh] flex-col overflow-hidden rounded-t-2xl border border-lab-line bg-lab-panel pb-[env(safe-area-inset-bottom,0px)] shadow-2xl">
          <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-lab-line" />
          <div className="flex min-h-0 flex-1 flex-col">
            <HistoryListBody
              onSelect={onSelect}
              onNew={onNew}
              onBack={onBack}
            />
          </div>
        </div>
      </div>
    </>
  );
}
