"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlyraMark } from "@/components/brand/AlyraMark";
import { useAuthStore } from "@/store/authStore";
import {
  checkPerfumerHealth,
  createServerChat,
  deleteServerChat,
  fetchGroqKeyStatus,
  fetchPerfumerProfile,
  fetchServerChat,
  listServerChats,
  renameServerChat,
  savePerfumerProfile,
  streamChat,
} from "./api";
import { ErrorBanner, WarningBanner } from "./ErrorBanner";
import { PersonalizeBanner } from "./PersonalizeBanner";
import {
  GroqKeyOnboarding,
  GroqKeySettingsCard,
} from "./onboarding/GroqKeyOnboarding";
import type { GroqOnboardingMode } from "./onboarding/groqSteps";
import { FormulaCard } from "./FormulaCard";
import { inferFormatFromText } from "./formatFork";
import { mergeSignalTexts } from "./profileSignals";
import { markSolidSession } from "./solidDetect";
import { useDeskStore } from "@/store/deskStore";
import {
  ChatModeToggle,
  PlanModeNudge,
  wordCount,
} from "./ChatModeToggle";
import {
  bootstrapLocalStore,
  loadLocalStore,
  newLocalChat,
  saveLocalStore,
  uid,
} from "./storage";

const GROQ_ONBOARD_DISMISS_KEY = "alyra.groqOnboard.dismissed";
const CONSENT_PROMPT_KEY = "alyra.profile.consentPrompt";

function readConsentPromptDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(CONSENT_PROMPT_KEY) === "dismissed";
  } catch {
    return false;
  }
}

function writeConsentPromptDismissed() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONSENT_PROMPT_KEY, "dismissed");
  } catch {
    /* private mode */
  }
}

function readGroqOnboardDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(GROQ_ONBOARD_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeGroqOnboardDismissed(value: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (value) sessionStorage.setItem(GROQ_ONBOARD_DISMISS_KEY, "1");
    else sessionStorage.removeItem(GROQ_ONBOARD_DISMISS_KEY);
  } catch {
    /* private mode */
  }
}
import {
  buildLabBridgeFromStructured,
  consumeChatBridge,
  consumeGuidePrompt,
} from "./labBridge";
import { Prose } from "./Prose";
import { AgentTimeline } from "./AgentTimeline";
import { celebrateChatAchievement } from "./chatAchievements";
import {
  applyStatus,
  applyTool,
  createThoughtTimeline,
  finalizeThoughtTimeline,
  streamConnectionState,
  type StreamConnectionState,
} from "./thoughtTimeline";
import { useBuilderStore } from "@/store/builderStore";
import { useWearStore } from "@/wear/wearStore";
import { useChatSessionsStore } from "@/perfumer/chatSessionsStore";
import { ChatDockHandle } from "@/desk/ChatDockDrag";
import { track } from "@/lib/analytics/track";
import {
  bindInterviewProfile,
  buildCannedReveal,
  buildLiveBrief,
  InterviewChips,
  RevealCard,
  useInterviewStore,
} from "@/perfumer/interview";
import { copyLooksLikeCraft } from "@/wear/cannedCopy";
import { SeeTheCraft } from "@/wear/WearReplyCard";
import type {
  ChatMessage,
  ChatSession,
  GroqKeyStatus,
  LabBridgeFormula,
  PerfumerApiError,
  PerfumerProfile,
  PerfumeFormatChoice,
  ToolTraceItem,
} from "./types";

function applyFormatChoiceToDesk(format: PerfumeFormatChoice) {
  if (format === "Solid") markSolidSession();
  const desk = useDeskStore.getState();
  if (desk.vessels.length > 0) return;
  desk.placeEquipment(format === "Solid" ? "tin" : "beaker");
}

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
  const wearAudience = useWearStore((s) => s.audience === "owner");
  const ivAct = useInterviewStore((s) => s.act);
  const ivMessages = useInterviewStore((s) => s.messages);
  const ivTurn = useInterviewStore((s) => s.currentTurn);
  const ivReveal = useInterviewStore((s) => s.reveal);
  const buildStepIndex = useBuilderStore((s) => s.buildStepIndex);
  const buildSteps = useBuilderStore((s) => s.buildSteps);
  const publishSessions = useChatSessionsStore((s) => s.publish);
  const registerSessionActions = useChatSessionsStore((s) => s.registerActions);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<PerfumerApiError | null>(null);
  const [connectionState, setConnectionState] =
    useState<StreamConnectionState>("working");
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  /** Nudge dismissed for current long draft (resets when composer clears). */
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [nudgeShownForDraft, setNudgeShownForDraft] = useState(false);
  const [groqKeyStatus, setGroqKeyStatus] = useState<GroqKeyStatus | null>(
    null,
  );
  const [groqKeyChecked, setGroqKeyChecked] = useState(false);
  const [perfumerProfile, setPerfumerProfile] =
    useState<PerfumerProfile | null>(null);
  const [consentPromptDismissed, setConsentPromptDismissed] = useState(
    readConsentPromptDismissed,
  );
  const [keyGuideOpen, setKeyGuideOpen] = useState(false);
  const [keyGuideMode, setKeyGuideMode] =
    useState<GroqOnboardingMode>("onboard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const keyOnboardDismissed = useRef(readGroqOnboardDismissed());
  const storageUidRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatsRef = useRef<ChatSession[]>([]);
  const streamStartedAtRef = useRef<number | null>(null);
  const lastActivityAtRef = useRef<number | null>(null);
  const networkIssueRef = useRef(false);
  const offlineRef = useRef(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const activeIdRef = useRef<string | null>(null);
  const building = builderMode === "building";
  const inputWords = wordCount(input);

  const refreshConnectionState = useCallback(() => {
    const startedAt = streamStartedAtRef.current;
    if (startedAt == null) {
      setConnectionState("working");
      return;
    }
    setConnectionState(
      streamConnectionState({
        startedAt,
        lastActivityAt: lastActivityAtRef.current,
        offline: offlineRef.current,
        networkIssue: networkIssueRef.current,
      }),
    );
  }, []);

  const markStreamActivity = useCallback(() => {
    lastActivityAtRef.current = Date.now();
    networkIssueRef.current = false;
    setConnectionState("working");
  }, []);

  useEffect(() => {
    const syncOffline = () => {
      offlineRef.current =
        typeof navigator !== "undefined" ? !navigator.onLine : false;
      if (streamStartedAtRef.current != null) refreshConnectionState();
    };
    window.addEventListener("online", syncOffline);
    window.addEventListener("offline", syncOffline);
    return () => {
      window.removeEventListener("online", syncOffline);
      window.removeEventListener("offline", syncOffline);
    };
  }, [refreshConnectionState]);

  useEffect(() => {
    if (!busy) return;
    refreshConnectionState();
    const id = window.setInterval(refreshConnectionState, 500);
    return () => window.clearInterval(id);
  }, [busy, refreshConnectionState]);

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
      // Never Zustand-set synchronously from a setChats updater: React re-runs
      // those during render, which would update MobileBuilderChrome mid-render.
      queueMicrotask(() => {
        setPlanFromStructured(structured, bridge);
      });
    },
    [shell, setPlanFromStructured],
  );

  const onUseInPlan = useCallback(
    (bridge: LabBridgeFormula) => {
      setPlan(bridge);
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
        saveLocalStore(
          { version: 1, activeId: nextActive, chats: nextChats },
          storageUidRef.current,
        );
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

  /** Load only this Firebase UID's chats (guest scope when signed out). */
  const hydrateForUid = useCallback(
    (scopeUid: string | null, opts?: { ingestBridge?: boolean }) => {
      storageUidRef.current = scopeUid;
      const local = loadLocalStore(scopeUid);
      let nextChats = local.chats;
      let nextActive = local.activeId;
      if (!nextChats.length) {
        const boot = bootstrapLocalStore();
        nextChats = boot.chats;
        nextActive = boot.activeId;
      }
      if (!nextActive || !nextChats.some((c) => c.id === nextActive)) {
        nextActive = nextChats[0]?.id ?? null;
      }

      if (opts?.ingestBridge && typeof window !== "undefined") {
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
      setBanner(null);
      setHydrated(true);
      publishSessions({
        chats: nextChats,
        activeId: nextActive,
        loadingChatId: null,
      });
      saveLocalStore(
        { version: 1, activeId: nextActive, chats: nextChats },
        scopeUid,
      );
    },
    [shell, setPlanFromStructured, publishSessions],
  );

  // Health + guide prompt once
  useEffect(() => {
    const guidePrompt = consumeGuidePrompt();
    if (guidePrompt) setInput(guidePrompt);
    void checkPerfumerHealth().then((h) => {
      if (!h.ok && h.error) setBanner(h.error);
      else setHealth(h.data || null);
    });
  }, []);

  // Auth identity → load that UID's chats only (guest scope when signed out).
  useEffect(() => {
    if (!authReady) return;
    const nextUid = user?.uid ?? null;
    if (storageUidRef.current === nextUid && hydrated) return;
    const prevUid = storageUidRef.current;
    keyOnboardDismissed.current = readGroqOnboardDismissed();
    setGroqKeyStatus(null);
    setGroqKeyChecked(false);
    setKeyGuideOpen(false);
    setLoadingChatId(null);
    // Ingest desk→chat bridge on first hydrate or when switching into a signed-in scope.
    hydrateForUid(nextUid, {
      ingestBridge: !hydrated || (prevUid !== nextUid && nextUid !== null),
    });
  }, [authReady, user?.uid, hydrateForUid, hydrated]);

  const refreshGroqKeyStatus = useCallback(async () => {
    if (!user) {
      setGroqKeyStatus(null);
      setGroqKeyChecked(false);
      return;
    }
    const res = await fetchGroqKeyStatus();
    setGroqKeyChecked(true);
    if (!res.ok) {
      if (res.error.code === "auth_required" || res.error.code === "auth_invalid") {
        setBanner(res.error);
      }
      return;
    }
    setGroqKeyStatus({
      configured: res.configured,
      hint: res.hint,
      updatedAt: res.updatedAt,
      requireUserGroq: res.requireUserGroq,
    });
    if (
      !res.configured &&
      res.requireUserGroq &&
      !keyOnboardDismissed.current &&
      useWearStore.getState().audience !== "owner"
    ) {
      setKeyGuideMode("onboard");
      setKeyGuideOpen(true);
    }
  }, [user]);

  useEffect(() => {
    if (!authReady || !user || !hydrated) return;
    void refreshGroqKeyStatus();
  }, [authReady, user, hydrated, refreshGroqKeyStatus]);

  useEffect(() => {
    if (!authReady || !user) {
      setPerfumerProfile(null);
      return;
    }
    let cancelled = false;
    void fetchPerfumerProfile().then((res) => {
      if (cancelled || !res.ok) return;
      setPerfumerProfile(res.profile);
    });
    return () => {
      cancelled = true;
    };
  }, [authReady, user]);

  useEffect(() => {
    bindInterviewProfile(perfumerProfile, user?.uid ?? null);
  }, [perfumerProfile, user?.uid]);

  useEffect(() => {
    if (wearAudience) return;
    useInterviewStore.getState().ensureStarted({
      surface: "compose",
      uid: user?.uid ?? null,
      profile: perfumerProfile,
    });
  }, [wearAudience, user?.uid, perfumerProfile]);

  useEffect(() => {
    bindInterviewProfile(perfumerProfile, user?.uid ?? null);
  }, [perfumerProfile, user?.uid]);

  useEffect(() => {
    if (wearAudience) return;
    useInterviewStore.getState().ensureStarted({
      surface: "compose",
      uid: user?.uid ?? null,
      profile: perfumerProfile,
    });
  }, [wearAudience, user?.uid, perfumerProfile]);

  // Server chat list only when signed in (API is auth-gated).
  useEffect(() => {
    if (!authReady || !user || !hydrated) return;
    const uidAtStart = user.uid;
    const nextActive = activeIdRef.current;
    void listServerChats().then(async (res) => {
      if (storageUidRef.current !== uidAtStart) return;
      if (!res.ok) {
        if (res.error.code === "auth_required" || res.error.code === "auth_invalid") {
          setBanner(res.error);
        }
        return;
      }
      setChats((prev) => {
        if (storageUidRef.current !== uidAtStart) return prev;
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
        saveLocalStore(
          {
            version: 1,
            activeId: nextActive,
            chats: merged,
          },
          uidAtStart,
        );
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

  function chooseFormat(choice: PerfumeFormatChoice) {
    const id = activeIdRef.current;
    if (!id) return;
    applyFormatChoiceToDesk(choice);
    updateChats((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, formatChoice: choice, updatedAt: new Date().toISOString() }
          : c,
      ),
    );
    track("format_choice", { format: choice, source: "fork" });
    if (
      perfumerProfile?.consentPersonalization &&
      perfumerProfile?.consentChatLearning
    ) {
      void savePerfumerProfile({
        formatPreference:
          choice === "Solid" ? "solid" : choice === "Oil" ? "oil" : "liquid",
      }).then((res) => {
        if (res.ok) setPerfumerProfile(res.profile);
      });
    }
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

    const needsByok =
      groqKeyStatus?.requireUserGroq ||
      (health && !health.groqConfigured);
    if (needsByok && groqKeyChecked && !groqKeyStatus?.configured) {
      setKeyGuideMode("onboard");
      setKeyGuideOpen(true);
      setBanner({
        code: "missing_api_key",
        title: "Add your Groq key",
        message:
          "Add your free Groq API key before chatting. We don't ship a shared key.",
        actionable: "Follow the illustrated steps, then send again.",
        rotateKey: true,
      });
      return;
    }

    const inferred =
      inferFormatFromText(text) ?? current.formatChoice ?? null;

    track("perfumer_chat_sent", {
      hasConsent: Boolean(perfumerProfile?.consentPersonalization),
    });
    if (inferred && inferred !== current.formatChoice) {
      track("format_choice", { format: inferred, source: "inferred" });
    }

    setBanner(null);
    setBusy(true);
    setInput("");
    streamStartedAtRef.current = Date.now();
    lastActivityAtRef.current = null;
    networkIssueRef.current = false;
    setConnectionState("working");

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
          formatChoice: inferred ?? c.formatChoice,
          messages: [
            ...c.messages,
            userMsg,
            {
              id: assistantId,
              role: "assistant",
              content: "",
              status: "streaming",
              thinkingLabel: "Listening to the brief...",
              thoughtTimeline: createThoughtTimeline(),
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

    if (inferred && current.formatChoice !== inferred) {
      applyFormatChoiceToDesk(inferred);
    }

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
        surface: wearAudience ? "wear" : "compose",
        messages: serverId
          ? undefined
          : [...historyForApi, { role: "user", content: text }],
        brief: inferred
          ? {
              goal: text.slice(0, 200),
              type: inferred,
              inspiration: "",
              targetVibe: "",
              notes: "",
              issues: "",
              constraints: "",
            }
          : undefined,
      },
      {
        onMeta: ({ chatId, toolTrace }) => {
          markStreamActivity();
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
        onStatus: (label, stage, tool) => {
          markStreamActivity();
          patchAssistant((m) => {
            const base = m.thoughtTimeline || createThoughtTimeline();
            return {
              ...m,
              thinkingLabel: label,
              thoughtTimeline: applyStatus(base, label, { stage, tool }),
            };
          });
        },
        onTool: (tool, ok) => {
          markStreamActivity();
          if (tool === "refine_formula" && ok !== false) {
            celebrateChatAchievement("refine_done");
          }
          patchAssistant((m) => {
            const next: ToolTraceItem[] = [
              ...(m.toolTrace || []),
              { tool, ok },
            ];
            const deduped = next.filter(
              (t, i, arr) => i === 0 || t.tool !== arr[i - 1].tool,
            );
            const base = m.thoughtTimeline || createThoughtTimeline();
            return {
              ...m,
              toolTrace: deduped,
              thoughtTimeline: applyTool(base, tool, ok !== false),
            };
          });
        },
        onToken: (chunk) => {
          markStreamActivity();
          patchAssistant((m) => ({
            ...m,
            content: (m.content || "") + chunk,
            thinkingLabel: undefined,
          }));
        },
        onStructured: (structured, sections) => {
          markStreamActivity();
          const lines = structured?.formula?.formula?.length ?? 0;
          if (lines > 0) {
            celebrateChatAchievement("first_formula");
          }
          patchAssistant({
            structured,
            sections: sections || undefined,
          });
          publishPlan(structured);
        },
        onLabBridge: (payload) => {
          markStreamActivity();
          let nextStructured: ChatMessage["structured"] | undefined;
          patchAssistant((m) => {
            nextStructured = {
              ...(m.structured || {}),
              lab_bridge: payload,
            };
            return {
              ...m,
              structured: nextStructured,
            };
          });
          // Publish after the chat patch — not inside the mapper (see publishPlan).
          publishPlan(nextStructured);
        },
        onDone: (reply, sections, structured, chatId) => {
          streamStartedAtRef.current = null;
          lastActivityAtRef.current = null;
          networkIssueRef.current = false;
          setConnectionState("working");
          publishPlan(structured);
          const lines = structured?.formula?.formula?.length ?? 0;
          if (lines > 0) {
            celebrateChatAchievement("first_formula");
          }
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
                        thoughtTimeline: m.thoughtTimeline
                          ? finalizeThoughtTimeline(m.thoughtTimeline)
                          : m.thoughtTimeline,
                      }
                    : m,
                ),
              };
            }),
          );
          setBusy(false);
        },
        onError: (error, chatId) => {
          streamStartedAtRef.current = null;
          lastActivityAtRef.current = null;
          networkIssueRef.current = false;
          setConnectionState("working");
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
                        thoughtTimeline: m.thoughtTimeline
                          ? finalizeThoughtTimeline(m.thoughtTimeline)
                          : m.thoughtTimeline,
                      }
                    : m,
                ),
              };
            }),
          );
          setBusy(false);
        },
        onNetworkHint: () => {
          networkIssueRef.current = true;
          setConnectionState("reconnecting");
        },
      },
    );
  }

  async function finishComposeInterview() {
    const iv = useInterviewStore.getState();
    const canned = buildCannedReveal({
      answers: iv.answers,
      skuId: null,
      seed: iv.seed,
    });
    const live = Boolean(user && groqKeyStatus?.configured);
    if (!live) {
      iv.setReveal(canned);
      return;
    }
    setBusy(true);
    await streamChat(
      {
        message: buildLiveBrief({
          answers: iv.answers,
          surface: "compose",
        }),
        mode: chatAgentMode,
        surface: "compose",
      },
      {
        onStructured: (structured) => {
          publishPlan(structured);
        },
        onDone: (reply, sections, structured) => {
          const vibe =
            reply &&
            !copyLooksLikeCraft(reply) &&
            !/₹|galaxolide|hhcb|ifra/i.test(reply)
              ? reply.slice(0, 480)
              : canned.vibe;
          const reveal = { ...canned, vibe };
          iv.setReveal(reveal);
          const current = chatsRef.current.find((c) => c.id === activeIdRef.current);
          if (current) {
            const now = new Date().toISOString();
            updateChats((prev) =>
              prev.map((c) =>
                c.id === current.id
                  ? {
                      ...c,
                      updatedAt: now,
                      messages: [
                        ...c.messages,
                        {
                          id: `iv-${now}`,
                          role: "assistant" as const,
                          content: "",
                          reveal,
                          structured,
                          sections,
                          status: "ok" as const,
                          createdAt: now,
                        },
                      ],
                    }
                  : c,
              ),
            );
          }
          publishPlan(structured);
          setBusy(false);
        },
        onError: () => {
          iv.setReveal(canned);
          setBusy(false);
        },
      },
    );
  }

  async function onSend() {
    const iv = useInterviewStore.getState();
    if (
      !wearAudience &&
      (iv.act === "interview" || iv.act === "welcome" || iv.act === "idle")
    ) {
      const text = input.trim();
      if (!text || busy) return;
      setInput("");
      const next = iv.answerText(text);
      if (next === "compose") {
        void finishComposeInterview();
      }
      return;
    }
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
  const userTexts = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content);
  const showInterviewThread =
    empty && !wearAudience && ivMessages.length > 0 && ivAct !== "idle";

  const showPersonalize =
    Boolean(user) &&
    !wearAudience &&
    groqKeyChecked &&
    Boolean(groqKeyStatus?.configured) &&
    perfumerProfile != null &&
    !perfumerProfile.consentPersonalization &&
    !consentPromptDismissed &&
    (userTexts.length >= 1 || ivMessages.some((m) => m.role === "user"));

  async function acceptPersonalize() {
    const signals = mergeSignalTexts(userTexts, active?.formatChoice);
    const iv = useInterviewStore.getState().answers;
    const res = await savePerfumerProfile({
      consentPersonalization: true,
      consentChatLearning: true,
      ...signals,
      indiaCity: iv.indiaCity ?? undefined,
      climateHint: iv.climateHint,
      occasionDefaults: iv.occasion
        ? [iv.occasion === "skin" ? "daily" : iv.occasion]
        : undefined,
      scentFamiliesLiked: iv.scentFamiliesLiked,
      scentFamiliesDisliked: iv.scentFamiliesDisliked,
      notesMentioned: iv.notesMentioned,
      formatPreference: iv.formatPreference,
      intensityPreference: iv.intensityPreference,
      timeOfDayDefaults: iv.timeOfDayDefaults,
      skinSensitivity: iv.skinSensitivity,
    });
    if (!res.ok) return;
    setPerfumerProfile(res.profile);
    track("consent_personalization_changed", { on: true });
    track("consent_chat_learning_changed", { on: true });
    track("profile_prefs_saved", {
      completeness: res.profile.profileCompleteness ?? 0,
      hasCity: Boolean(res.profile.indiaCity),
      likeCount: (res.profile.scentFamiliesLiked || []).length,
    });
  }

  function dismissPersonalize() {
    writeConsentPromptDismissed();
    setConsentPromptDismissed(true);
  }

  return (
    <div
      className={`flex h-full min-h-0 flex-1 flex-col ${
        shell ? "gap-0" : "gap-2 md:gap-3"
      }`}
    >
      {banner ? (
        <div className={shell ? "px-2 pt-2" : "px-3 md:px-0"}>
          <ErrorBanner
            error={banner}
            onDismiss={() => setBanner(null)}
            onAddKey={() => {
              setKeyGuideMode("onboard");
              setKeyGuideOpen(true);
            }}
            onRotateKey={() => {
              setKeyGuideMode("rotate");
              setKeyGuideOpen(true);
            }}
          />
        </div>
      ) : null}

      {user &&
      !wearAudience &&
      groqKeyChecked &&
      groqKeyStatus &&
      !groqKeyStatus.configured &&
      groqKeyStatus.requireUserGroq &&
      !keyGuideOpen ? (
        <div className={shell ? "px-2 pt-2" : "px-3 md:px-0"}>
          <ErrorBanner
            error={{
              code: "missing_api_key",
              title: "Add your Groq key",
              message:
                "Master Perfumer is open source — add your free Groq API key to chat. We don't ship a shared key.",
              actionable: "Follow the illustrated steps to create and paste a key.",
              rotateKey: true,
            }}
            onAddKey={() => {
              setKeyGuideMode("onboard");
              setKeyGuideOpen(true);
            }}
          />
        </div>
      ) : null}

      {health &&
      !wearAudience &&
      !health.groqConfigured &&
      !health.requireUserGroq &&
      groqKeyStatus &&
      !groqKeyStatus.configured ? (
        <div className={shell ? "px-2 pt-2" : "px-3 md:px-0"}>
          <ErrorBanner
            error={{
              code: "missing_api_key",
              title: "Add your Groq key",
              message:
                "No server Groq key is configured. Add your own free key to use chat.",
              actionable: "Open onboarding and paste a key from console.groq.com.",
            }}
            onAddKey={() => {
              setKeyGuideMode("onboard");
              setKeyGuideOpen(true);
            }}
          />
        </div>
      ) : null}

      {showPersonalize ? (
        <div className={shell ? "px-2 pt-2" : "px-3 md:px-0"}>
          <PersonalizeBanner
            onAccept={() => void acceptPersonalize()}
            onDismiss={dismissPersonalize}
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
                className="flex h-8 items-center rounded-lg bg-lab-ink px-2.5 text-[11px] font-semibold leading-none text-lab-foam hover:bg-black"
              >
                New
              </button>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className={`flex h-8 items-center rounded-lg px-2 text-[11px] font-medium leading-none text-lab-muted hover:text-lab-ink ${
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
                <div className="flex min-w-0 flex-1 items-center gap-0 self-stretch pl-1">
                  <span className="relative flex h-full items-center border-b-2 border-lab-ink px-2 text-[11px] font-semibold leading-none text-lab-ink">
                    Perfumer
                  </span>
                  {building ? (
                    <span className="ml-1 rounded-md px-1 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-label text-lab-amber">
                      {buildSteps.length
                        ? `${Math.min(buildStepIndex + 1, buildSteps.length)}/${buildSteps.length}`
                        : "Build"}
                    </span>
                  ) : null}
                </div>
              ) : (
                <>
                  <p className="truncate text-[11px] font-semibold leading-none tracking-wide text-lab-ink">
                    {active?.title || "Perfumer"}
                  </p>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-medium leading-none ${
                      building
                        ? "bg-lab-amber/15 text-lab-amber"
                        : "text-lab-muted"
                    }`}
                    title={
                      building
                        ? "Build queue running on the desk"
                        : chatAgentMode === "plan"
                          ? "Plan mode: propose only, no desk pours"
                          : "Agent mode: tools on, lock then Build"
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
                  {user ? (
                    <button
                      type="button"
                      title="Groq API key"
                      onClick={() => setSettingsOpen((o) => !o)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-lab-muted hover:bg-lab-wash hover:text-lab-ink"
                    >
                      <span className="text-[11px] font-semibold leading-none">
                        Key
                      </span>
                    </button>
                  ) : null}
                </>
              )}

              {bottomDock ? (
                <div className="mr-0.5 flex shrink-0 items-center gap-0.5">
                  <div className="hidden md:flex">
                    <ChatModeToggle
                      mode={chatAgentMode}
                      onChange={changeChatMode}
                      disabled={building}
                      size="sm"
                    />
                  </div>
                  {user ? (
                    <button
                      type="button"
                      title="Groq API key"
                      onClick={() => setSettingsOpen((o) => !o)}
                      className="flex h-6 items-center rounded-lg px-1.5 text-[10px] font-semibold text-lab-muted hover:bg-lab-wash hover:text-lab-ink"
                    >
                      Key
                    </button>
                  ) : null}
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
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg hover:bg-lab-wash hover:text-lab-ink ${
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
                <span aria-hidden className="font-mono text-[11px] leading-none">
                  ◷
                </span>
              </button>
              <button
                type="button"
                onClick={createChat}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-lab-muted hover:bg-lab-wash hover:text-lab-ink"
                title="New chat"
                aria-label="New chat"
              >
                <span aria-hidden className="text-[14px] leading-none">
                  +
                </span>
              </button>
              {showDockControls ? (
                <button
                  type="button"
                  onClick={() => setRightOpen(false)}
                  className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-lg text-lab-muted hover:bg-lab-wash hover:text-lab-ink md:flex"
                  title="Hide chat (⌘T)"
                  aria-label="Hide chat"
                >
                  <span aria-hidden className="text-[13px] leading-none">
                    ×
                  </span>
                </button>
              ) : null}
              {onCloseSheet ? (
                <button
                  type="button"
                  onClick={onCloseSheet}
                  className="flex h-7 items-center rounded-lg bg-lab-ink px-2.5 text-[11px] font-semibold leading-none text-lab-foam md:hidden"
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
              <h2 className="min-w-0 flex-1 truncate font-display text-base tracking-display text-lab-ink md:text-lg">
                {active?.title || "Master Perfumer"}
              </h2>
              {user ? (
                <button
                  type="button"
                  title="Groq API key"
                  onClick={() => setSettingsOpen((o) => !o)}
                  className="min-h-9 rounded-md border border-lab-line px-2.5 text-xs font-semibold text-lab-ink hover:bg-lab-wash"
                >
                  API key
                </button>
              ) : null}
            </div>
          )}

          {settingsOpen && user ? (
            <div className={shell ? "px-2 pt-2" : "px-3 pt-2 md:px-5"}>
              <GroqKeySettingsCard
                status={groqKeyStatus}
                onRefresh={() => void refreshGroqKeyStatus()}
                onOpenOnboarding={() => {
                  setKeyGuideMode("onboard");
                  setKeyGuideOpen(true);
                }}
                onOpenRotate={() => {
                  setKeyGuideMode("rotate");
                  setKeyGuideOpen(true);
                }}
              />
            </div>
          ) : null}
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
            ) : showInterviewThread ? (
              <InterviewThread
                messages={ivMessages}
                currentSlot={ivTurn?.slot}
                onChip={(chip) => {
                  const next = useInterviewStore.getState().answerChip(chip);
                  if (next === "compose") void finishComposeInterview();
                }}
              />
            ) : empty && !narration.length ? (
              <EmptyState compact={shell} dense={bottomDock} />
            ) : (
              <>
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    onBuild={shell ? onUseInPlan : undefined}
                    hideLabCta={shell}
                    presentation={wearAudience ? "wear" : "composer"}
                    connectionState={
                      m.status === "streaming" ? connectionState : "working"
                    }
                    onAddKey={() => {
                      setKeyGuideMode("onboard");
                      setKeyGuideOpen(true);
                    }}
                    onRotateKey={() => {
                      setKeyGuideMode("rotate");
                      setKeyGuideOpen(true);
                    }}
                  />
                ))}
                {narration.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-baseline gap-2 px-0.5 py-0.5 font-mono text-[11px] text-lab-muted"
                  >
                    <span className="rounded bg-lab-amber/12 px-1.5 py-px text-[9px] font-semibold uppercase tracking-label text-lab-amber">
                      build
                    </span>
                    <span className="min-w-0 text-[12px] leading-snug text-lab-ink/85">
                      {n.text}
                    </span>
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
                className="mb-1.5 flex items-center gap-2 rounded-lg border border-lab-amber/30 bg-lab-amber/10 px-2 py-1"
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
                    ? "Propose only · lock, then Build"
                    : "Tools on · lock, then Build"}
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
                  ? "rounded-lg border border-lab-line/80 bg-white px-1.5 py-1"
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
                  ivReveal
                    ? "Too close? Too sweet? Another hour?"
                    : "Office, monsoon, close to skin…"
                }
                className={
                  shell
                    ? `[field-sizing:content] min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 focus:outline-none ${
                        bottomDock
                          ? "max-h-28 min-h-7 py-1 text-[13px] leading-snug text-lab-ink placeholder:text-lab-muted/65"
                          : "max-h-32 min-h-8 py-1.5 text-[13px] leading-snug text-lab-ink placeholder:text-lab-muted/70"
                      }`
                    : "[field-sizing:content] max-h-40 min-h-12 min-w-0 flex-1 resize-none overflow-y-auto rounded-xl border border-lab-line bg-lab-panel px-3 py-3 text-[13px] leading-snug text-lab-ink placeholder:text-lab-muted/70 focus:outline-none focus:ring-1 focus:ring-lab-ink/30 md:min-h-11 md:rounded-lg md:py-2.5"
                }
                disabled={busy || building}
              />
              <button
                type="button"
                onClick={() => {
                  const interviewing =
                    ivAct === "interview" ||
                    ivAct === "welcome" ||
                    ivAct === "idle";
                  if (!user && !interviewing) {
                    openAuthGate();
                    return;
                  }
                  void onSend();
                }}
                disabled={busy || building || !input.trim()}
                className={
                  shell
                    ? `shrink-0 self-end rounded-lg bg-lab-ink font-semibold leading-none text-lab-foam transition hover:bg-black disabled:opacity-40 ${
                        bottomDock
                          ? "h-7 px-2.5 text-[10px]"
                          : "h-8 px-3 text-[11px]"
                      }`
                    : "h-12 w-16 shrink-0 self-end rounded-xl bg-lab-ink text-sm font-semibold text-lab-foam transition-opacity hover:bg-black disabled:opacity-50 md:h-11 md:w-auto md:rounded-lg md:px-4"
                }
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      <GroqKeyOnboarding
        open={keyGuideOpen && !wearAudience}
        mode={keyGuideMode}
        onClose={() => {
          keyOnboardDismissed.current = true;
          writeGroqOnboardDismissed(true);
          setKeyGuideOpen(false);
        }}
        onConfigured={(status) => {
          // Keep dismissed=true after successful save so a slow GET cannot
          // reopen the wizard if status briefly races.
          keyOnboardDismissed.current = true;
          writeGroqOnboardDismissed(true);
          setGroqKeyStatus({
            configured: status.configured,
            hint: status.hint,
            updatedAt: status.updatedAt,
            requireUserGroq: groqKeyStatus?.requireUserGroq,
          });
          setBanner(null);
          setSettingsOpen(false);
          void refreshGroqKeyStatus();
        }}
      />
    </div>
  );
}

function InterviewThread({
  messages,
  currentSlot,
  onChip,
}: {
  messages: import("@/perfumer/interview").InterviewMessage[];
  currentSlot?: import("@/perfumer/interview").InterviewSlot;
  onChip: (chip: import("@/perfumer/interview").InterviewChip) => void;
}) {
  return (
    <div className="space-y-4">
      {messages.map((m) =>
        m.role === "user" ? (
          <div key={m.id} className="flex justify-end">
            <p className="max-w-[min(42rem,100%)] rounded-2xl bg-lab-ink px-3 py-2 text-[13px] leading-relaxed text-lab-foam">
              {m.content}
            </p>
          </div>
        ) : m.reveal ? (
          <div key={m.id} className="space-y-3">
            <RevealCard card={m.reveal} />
            <p className="text-[12px] leading-relaxed text-lab-muted">
              Build on the desk when the Plan looks right. Nothing silent-pours.
            </p>
          </div>
        ) : (
          <div key={m.id} className="w-full">
            <p className="text-sm leading-relaxed text-lab-ink">{m.content}</p>
            {m.act === "interview" && m.chips && currentSlot === m.slot ? (
              <InterviewChips chips={m.chips} onPick={onChip} />
            ) : null}
          </div>
        ),
      )}
    </div>
  );
}

function EmptyState({
  compact,
  dense,
}: {
  compact?: boolean;
  dense?: boolean;
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
          I’m the house perfumer. Occasion, climate, skin, then I compose. Not a
          formula sheet first.
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-2 py-10 text-center md:py-16">
      <AlyraMark size="md" href={null} className="justify-center" />
      <p className="mt-6 font-display text-2xl leading-snug tracking-display text-lab-ink">
        The house perfumer
      </p>
      <p className="mt-3 text-sm leading-relaxed text-lab-muted">
        Occasion, climate, skin, then I compose. Not a formula sheet first.
      </p>
    </div>
  );
}

function MessageBubble({
  message,
  onBuild,
  hideLabCta,
  presentation = "composer",
  connectionState = "working",
  onAddKey,
  onRotateKey,
}: {
  message: ChatMessage;
  onBuild?: (bridge: LabBridgeFormula) => void;
  hideLabCta?: boolean;
  presentation?: "composer" | "wear";
  connectionState?: StreamConnectionState;
  onAddKey?: () => void;
  onRotateKey?: () => void;
}) {
  if (message.role === "error") {
    return message.error ? (
      <ErrorBanner
        error={message.error}
        onAddKey={onAddKey}
        onRotateKey={onRotateKey}
      />
    ) : null;
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
            ? "rounded-2xl bg-lab-ink px-3 py-2 text-lab-foam"
            : "w-full space-y-3"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
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

            {message.thoughtTimeline ? (
              <AgentTimeline
                timeline={message.thoughtTimeline}
                live={message.status === "streaming"}
                showChips={message.status === "ok"}
                connectionState={connectionState}
              />
            ) : streamingEmpty ? (
              <AgentTimeline
                timeline={{
                  startedAt: Date.now(),
                  entries: [
                    {
                      id: "fallback",
                      kind: "thought",
                      summary: "Warming the heart",
                      notes: [
                        message.thinkingLabel || "Making this for you",
                      ],
                      startedAt: Date.now(),
                    },
                  ],
                }}
                live
                connectionState={connectionState}
              />
            ) : null}

            {message.reveal ? <RevealCard card={message.reveal} /> : null}

            {message.content && !message.reveal ? (
              <div>
                <Prose text={message.content} />
                {message.status === "streaming" ? (
                  <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-lab-ink/50" />
                ) : null}
              </div>
            ) : null}

            {presentation !== "wear" &&
            (message.structured?.formula?.formula?.length ||
              message.sections?.formula) ? (
              <SeeTheCraft>
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
                <FormulaCard
                  structured={message.structured}
                  sections={message.sections}
                  onBuild={onBuild}
                  hideLabCta={hideLabCta}
                  presentation="craft"
                />
              </SeeTheCraft>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
