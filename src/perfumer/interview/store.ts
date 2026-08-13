"use client";

import { create } from "zustand";
import { track } from "@/lib/analytics/track";
import { uid } from "@/perfumer/storage";
import type { PerfumerProfile } from "@/perfumer/types";
import { savePerfumerProfile } from "@/perfumer/api";
import {
  answersFromProfile,
  applyChipToAnswers,
  applyMinimumFallbacks,
  buildSlotOrder,
  chipEcho,
  climateFallback,
  extractAnswersFromText,
  filledSlotsFromProfile,
  looksLikeRichBrief,
  looksLikeSkip,
  mergeAnswers,
  nextTurn,
  openingFor,
  seedFor,
  sessionFilledSet,
  shouldCompose,
  skipFormat,
} from "./flow";
import { answersToProfilePatch, canPutInterviewPrefs } from "./persist";
import { buildCannedReveal, composeCopy } from "./reveal";
import type {
  InterviewAct,
  InterviewAnswers,
  InterviewChip,
  InterviewMessage,
  InterviewSlot,
  InterviewSurface,
  InterviewTurn,
  RevealCardPayload,
  StartInterviewOpts,
} from "./types";

const SESSION_KEY = "alyra.interview.v1";
const LAST_OPENING_KEY = "alyra.interview.lastOpening";

export interface InterviewState {
  sessionId: string;
  act: InterviewAct;
  surface: InterviewSurface;
  skuId: string | null;
  answers: InterviewAnswers;
  queue: InterviewSlot[];
  currentTurn: InterviewTurn | null;
  messages: InterviewMessage[];
  questionCount: number;
  openingId: string;
  reveal: RevealCardPayload | null;
  composeLine: string | null;
  seed: number;

  ensureStarted: (opts: StartInterviewOpts) => void;
  reset: () => void;
  answerChip: (chip: InterviewChip, slot?: InterviewSlot) => "interview" | "compose";
  answerText: (text: string) => "interview" | "compose";
  skipToCompose: () => void;
  setReveal: (reveal: RevealCardPayload) => void;
  setSurface: (surface: InterviewSurface, skuId?: string | null) => void;
}

function newSessionId(): string {
  return uid("iv");
}

function readLastOpening(uid: string | null | undefined): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(`${LAST_OPENING_KEY}.${uid || "guest"}`);
  } catch {
    return null;
  }
}

function writeLastOpening(uid: string | null | undefined, id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${LAST_OPENING_KEY}.${uid || "guest"}`, id);
  } catch {
    /* private */
  }
}

function persistSession(s: InterviewState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        sessionId: s.sessionId,
        act: s.act,
        surface: s.surface,
        skuId: s.skuId,
        answers: s.answers,
        queue: s.queue,
        currentTurn: s.currentTurn,
        messages: s.messages,
        questionCount: s.questionCount,
        openingId: s.openingId,
        reveal: s.reveal,
        composeLine: s.composeLine,
        seed: s.seed,
      }),
    );
  } catch {
    /* private */
  }
}

function loadSession(): Partial<InterviewState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<InterviewState>;
  } catch {
    return null;
  }
}

function empty(): Pick<
  InterviewState,
  | "sessionId"
  | "act"
  | "surface"
  | "skuId"
  | "answers"
  | "queue"
  | "currentTurn"
  | "messages"
  | "questionCount"
  | "openingId"
  | "reveal"
  | "composeLine"
  | "seed"
> {
  return {
    sessionId: newSessionId(),
    act: "idle",
    surface: "compose",
    skuId: null,
    answers: {},
    queue: [],
    currentTurn: null,
    messages: [],
    questionCount: 0,
    openingId: "",
    reveal: null,
    composeLine: null,
    seed: 1,
  };
}

let profileRef: PerfumerProfile | null = null;
let uidRef: string | null = null;

export function bindInterviewProfile(
  profile: PerfumerProfile | null,
  uid: string | null,
) {
  profileRef = profile;
  uidRef = uid;
}

function maybePut(answers: InterviewAnswers) {
  if (!canPutInterviewPrefs(profileRef)) return;
  const patch = answersToProfilePatch(answers);
  if (!Object.keys(patch).length) return;
  void savePerfumerProfile(patch).then((res) => {
    if (res.ok) profileRef = res.profile;
  });
}

function sessionAnsweredCount(messages: InterviewMessage[]): number {
  const slots = new Set<InterviewSlot>();
  for (const m of messages) {
    if (m.role === "user" && m.slot) slots.add(m.slot);
  }
  return slots.size;
}

function composeReady(
  s: Pick<InterviewState, "answers" | "questionCount" | "messages" | "queue">,
  skipRequested: boolean,
): boolean {
  const remaining = s.queue.filter((slot) => !sessionFilledSet(s.answers).has(slot)).length;
  return shouldCompose({
    answers: s.answers,
    questionCount: s.questionCount,
    skipRequested,
    sessionAnswered: sessionAnsweredCount(s.messages),
    remaining,
  });
}

function advanceToQuestion(get: () => InterviewState, set: (p: Partial<InterviewState>) => void, echo?: string) {
  const s = get();
  const queue = s.queue.filter((slot) => !sessionFilledSet(s.answers).has(slot));
  if (composeReady({ ...s, queue }, false) || queue.length === 0) {
    enterCompose(get, set);
    return;
  }
  const slot = queue[0]!;
  const turn = nextTurn({
    seed: s.seed,
    slot,
    lastEcho: echo,
    questionIndex: s.questionCount,
  });
  const msg: InterviewMessage = {
    id: uid("im"),
    role: "assistant",
    content: turn.prompt,
    act: "interview",
    slot,
    chips: turn.chips,
  };
  set({
    act: "interview",
    queue: queue.slice(1),
    currentTurn: turn,
    questionCount: s.questionCount + 1,
    messages: [...s.messages, msg],
  });
}

function enterCompose(get: () => InterviewState, set: (p: Partial<InterviewState>) => void) {
  const s = get();
  const answers = applyMinimumFallbacks(s.answers, {
    wearSku: skipFormat(s.surface, s.skuId),
    climateFallback: climateFallback(),
  });
  const line = composeCopy(answers);
  set({
    act: "compose",
    answers,
    currentTurn: null,
    composeLine: line,
    messages: [
      ...s.messages,
      {
        id: uid("im"),
        role: "assistant",
        content: line,
        act: "compose",
      },
    ],
  });
}

export const useInterviewStore = create<InterviewState>((set, get) => ({
  ...empty(),

  ensureStarted: (opts) => {
    const s = get();
    if (s.act !== "idle" && s.act !== "welcome") {
      if (opts.surface !== s.surface) {
        set({ surface: opts.surface, skuId: opts.skuId ?? s.skuId });
      }
      return;
    }
    const cached = s.act === "idle" ? loadSession() : null;
    if (cached?.act && cached.act !== "idle" && cached.messages?.length) {
      set({
        sessionId: cached.sessionId || s.sessionId,
        act: cached.act,
        surface: cached.surface || opts.surface,
        skuId: cached.skuId ?? opts.skuId ?? null,
        answers: cached.answers || {},
        queue: cached.queue || [],
        currentTurn: cached.currentTurn || null,
        messages: cached.messages || [],
        questionCount: cached.questionCount || 0,
        openingId: cached.openingId || "",
        reveal: cached.reveal || null,
        composeLine: cached.composeLine || null,
        seed: cached.seed || 1,
      });
      return;
    }

    const sessionId = newSessionId();
    const seed = seedFor({ ...opts, uid: opts.uid ?? uidRef }, sessionId);
    const profile = opts.profile ?? profileRef;
    const fromProfile = answersFromProfile(profile);
    const skuId = opts.skuId ?? null;
    if (skipFormat(opts.surface, skuId)) {
      fromProfile.formatPreference = fromProfile.formatPreference || "press_tin";
    }
    const opening = openingFor({
      ...opts,
      seed,
      lastOpeningId: readLastOpening(opts.uid ?? uidRef),
    });
    writeLastOpening(opts.uid ?? uidRef, opening.id);
    const queue = buildSlotOrder({
      seed,
      surface: opts.surface,
      skuId,
      profileFilled: filledSlotsFromProfile(profile),
      sessionFilled: sessionFilledSet(fromProfile),
      now: opts.now,
    });
    const welcome: InterviewMessage = {
      id: uid("im"),
      role: "assistant",
      content: opening.text,
      act: "welcome",
    };
    set({
      sessionId,
      act: "welcome",
      surface: opts.surface,
      skuId,
      answers: fromProfile,
      queue,
      currentTurn: null,
      messages: [welcome],
      questionCount: 0,
      openingId: opening.id,
      reveal: null,
      composeLine: null,
      seed,
    });
    advanceToQuestion(get, set);
  },

  reset: () => {
    set(empty());
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(SESSION_KEY);
      } catch {
        /* */
      }
    }
  },

  answerChip: (chip, slot) => {
    const s = get();
    const useSlot = slot ?? s.currentTurn?.slot;
    if (!useSlot || s.act === "reveal" || s.act === "follow-up") {
      if (useSlot === "occasion" || slot === "occasion") {
        const next = applyChipToAnswers({ ...s.answers }, "occasion", chip.id);
        set({ answers: mergeAnswers(s.answers, next) });
      }
      return s.act === "compose" ? "compose" : "interview";
    }
    const extracted = applyChipToAnswers({}, useSlot, chip.id);
    const answers = mergeAnswers(s.answers, extracted);
    const userMsg: InterviewMessage = {
      id: uid("im"),
      role: "user",
      content: chip.label,
      source: "chip",
      slot: useSlot,
    };
    track("interview_slot_answered", { slot: useSlot });
    maybePut(answers);
    const echo = chipEcho(useSlot, undefined, chip.label);
    const messages = [...s.messages, userMsg];
    set({ answers, messages });
    if (
      composeReady(
        { answers, questionCount: s.questionCount, messages, queue: s.queue },
        false,
      )
    ) {
      enterCompose(get, set);
      persistSession(get());
      return "compose";
    }
    advanceToQuestion(get, set, echo);
    persistSession(get());
    return get().act === "compose" ? "compose" : "interview";
  },

  answerText: (text) => {
    const raw = text.trim();
    if (!raw) return "interview";
    const s = get();
    const skip = looksLikeSkip(raw);
    const extracted = extractAnswersFromText(raw, s.currentTurn?.slot);
    const answers = mergeAnswers(s.answers, extracted);
    const userMsg: InterviewMessage = {
      id: uid("im"),
      role: "user",
      content: raw,
      source: "typed",
      slot: s.currentTurn?.slot,
    };
    if (s.currentTurn?.slot) {
      track("interview_slot_answered", { slot: s.currentTurn.slot });
    }
    maybePut(answers);
    const echo = chipEcho(s.currentTurn?.slot || "occasion", raw, undefined);
    const messages = [...s.messages, userMsg];
    set({ answers, messages });
    if (
      skip ||
      looksLikeRichBrief(raw) ||
      composeReady(
        { answers, questionCount: s.questionCount, messages, queue: s.queue },
        skip,
      )
    ) {
      enterCompose(get, set);
      persistSession(get());
      return "compose";
    }
    advanceToQuestion(get, set, echo);
    persistSession(get());
    return get().act === "compose" ? "compose" : "interview";
  },

  skipToCompose: () => {
    enterCompose(get, set);
    persistSession(get());
  },

  setReveal: (reveal) => {
    const s = get();
    set({
      act: "reveal",
      reveal,
      currentTurn: null,
      messages: [
        ...s.messages.filter((m) => m.act !== "reveal"),
        {
          id: uid("im"),
          role: "assistant",
          content: reveal.vibe,
          act: "reveal",
          reveal,
        },
      ],
    });
    persistSession(get());
  },

  setSurface: (surface, skuId) => {
    set({ surface, skuId: skuId ?? get().skuId });
  },
}));

useInterviewStore.subscribe((s) => {
  if (s.act !== "idle") persistSession(s);
});
