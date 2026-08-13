"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { fetchGroqKeyStatus, streamChat } from "@/perfumer/api";
import { PersonalizeBanner } from "@/perfumer/PersonalizeBanner";
import { savePerfumerProfile } from "@/perfumer/api";
import { fetchPerfumerProfile } from "@/perfumer/api";
import { mergeSignalTexts } from "@/perfumer/profileSignals";
import {
  bindInterviewProfile,
  buildCannedReveal,
  buildLiveBrief,
  InterviewChips,
  RevealCard,
  useInterviewStore,
} from "@/perfumer/interview";
import { copyLooksLikeCraft } from "./cannedCopy";
import { getHouseSku, OCCASION_CHIPS, type OccasionChip } from "./houseSkus";
import { lensFromChip, pickWearLens } from "./wearLens";
import { WearReplyCard } from "./WearReplyCard";
import { buildWearCard } from "./cannedCopy";
import { useWearStore } from "./wearStore";
import type { GroqKeyStatus, PerfumerProfile } from "@/perfumer/types";

export function WearCompanion({
  onAskCompose,
}: {
  onAskCompose: () => void;
}) {
  const skuId = useWearStore((s) => s.skuId) ?? "generic";
  const occasion = useWearStore((s) => s.occasion);
  const messages = useWearStore((s) => s.messages);
  const lastLenses = useWearStore((s) => s.lastLenses);
  const addMessage = useWearStore((s) => s.addMessage);
  const pushLens = useWearStore((s) => s.pushLens);
  const askedPerfumer = useWearStore((s) => s.askedPerfumer);
  const setAskedPerfumer = useWearStore((s) => s.setAskedPerfumer);
  const user = useAuthStore((s) => s.user);
  const [input, setInput] = useState("");
  const [consentDismissed, setConsentDismissed] = useState(false);
  const [prefsReady, setPrefsReady] = useState(() => !user);
  const [profile, setProfile] = useState<PerfumerProfile | null>(null);
  const [groq, setGroq] = useState<GroqKeyStatus | null>(null);
  const seq = useRef(0);
  const skuBoot = useRef<string | null>(null);

  const act = useInterviewStore((s) => s.act);
  const ivMessages = useInterviewStore((s) => s.messages);
  const currentTurn = useInterviewStore((s) => s.currentTurn);
  const reveal = useInterviewStore((s) => s.reveal);
  const composeLine = useInterviewStore((s) => s.composeLine);

  const sku = getHouseSku(skuId);
  const interviewing = act === "welcome" || act === "interview" || act === "compose";
  const revealed = act === "reveal" || act === "follow-up";

  useEffect(() => {
    bindInterviewProfile(profile, user?.uid ?? null);
  }, [profile, user?.uid]);

  useEffect(() => {
    if (!user) {
      setPrefsReady(true);
      return;
    }
    let cancelled = false;
    void Promise.all([fetchPerfumerProfile(), fetchGroqKeyStatus()]).then(
      ([p, g]) => {
        if (cancelled) return;
        if (p.ok) setProfile(p.profile);
        if (g.ok) {
          setGroq({
            configured: g.configured,
            hint: g.hint,
            updatedAt: g.updatedAt,
            requireUserGroq: g.requireUserGroq,
          });
        }
        setPrefsReady(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!prefsReady) return;
    if (skuBoot.current && skuBoot.current !== skuId) {
      useInterviewStore.getState().reset();
    }
    skuBoot.current = skuId;
    useInterviewStore.getState().ensureStarted({
      surface: "wear",
      skuId,
      uid: user?.uid ?? null,
      profile,
    });
  }, [prefsReady, skuId, user?.uid, profile]);

  useEffect(() => {
    if (act !== "compose" || reveal) return;
    const s = useInterviewStore.getState();
    const canned = buildCannedReveal({
      answers: s.answers,
      skuId,
      seed: s.seed,
    });
    const live = Boolean(user && groq?.configured);
    if (!live) {
      s.setReveal(canned);
      return;
    }
    void streamChat(
      {
        message: buildLiveBrief({
          answers: s.answers,
          surface: "wear",
          skuId,
        }),
        mode: "agent",
        surface: "wear",
      },
      {
        onDone: (reply) => {
          if (reply && !copyLooksLikeCraft(reply) && !/₹|galaxolide|hhcb|ifra/i.test(reply)) {
            useInterviewStore.getState().setReveal({
              ...canned,
              vibe: reply.slice(0, 480),
            });
          } else {
            useInterviewStore.getState().setReveal(canned);
          }
        },
        onError: () => useInterviewStore.getState().setReveal(canned),
      },
    );
  }, [act, reveal, groq?.configured, skuId, user]);

  const followUp = useCallback(
    (opts: { text?: string; chip?: OccasionChip }) => {
      const firstReply = messages.filter((m) => m.role === "assistant").length === 0;
      const lens = pickWearLens({
        text: opts.text,
        chip: opts.chip,
        lastLenses,
        firstReply,
      });
      const kind =
        lens === "notes"
          ? "notes"
          : lens === "story" || lens === "mood"
            ? "story"
            : lens === "layer"
              ? "layer"
              : "wear";
      const card = buildWearCard({
        skuId,
        kind,
        lens,
        occasion: opts.chip ?? occasion,
      });
      seq.current += 1;
      if (opts.text) {
        addMessage({
          id: `u-${seq.current}`,
          role: "user",
          content: opts.text,
          source: "typed",
        });
      }
      seq.current += 1;
      addMessage({
        id: `a-${seq.current}`,
        role: "assistant",
        content: card.body,
        card,
        lens,
        source: "typed",
      });
      pushLens(lens);
    },
    [addMessage, lastLenses, messages, occasion, pushLens, skuId],
  );

  function onSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    if (interviewing) {
      useInterviewStore.getState().answerText(text);
      return;
    }
    followUp({ text });
  }

  const showPersonalize =
    Boolean(user) &&
    profile != null &&
    !profile.consentPersonalization &&
    ivMessages.some((m) => m.role === "user");

  const emptyInterview = ivMessages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-lab-panel">
      <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-3">
        {emptyInterview ? (
          <div className="px-1 py-4">
            <p className="font-display text-xl leading-snug tracking-tight text-lab-ink">
              {sku.name}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-lab-muted">
              Where are you wearing this today? Office, evening, wedding, or
              just skin. Tap a chip on the desk, or write it here.
            </p>
          </div>
        ) : (
          ivMessages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[min(42rem,100%)] rounded-2xl bg-lab-ink px-3 py-2 text-[13px] leading-relaxed text-lab-foam">
                  {m.content}
                </p>
              </div>
            ) : m.reveal ? (
              <RevealCard key={m.id} card={m.reveal} />
            ) : (
              <div key={m.id} className="w-full">
                <p className="text-sm leading-relaxed text-lab-ink">{m.content}</p>
                {m.act === "interview" && m.chips && currentTurn?.slot === m.slot ? (
                  <InterviewChips
                    chips={m.chips}
                    onPick={(chip) => useInterviewStore.getState().answerChip(chip)}
                  />
                ) : null}
              </div>
            ),
          )
        )}

        {revealed
          ? messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[min(42rem,100%)] rounded-2xl bg-lab-ink px-3 py-2 text-[13px] leading-relaxed text-lab-foam">
                    {m.content}
                  </p>
                </div>
              ) : m.card ? (
                <WearReplyCard key={m.id} card={m.card} />
              ) : (
                <p key={m.id} className="text-sm leading-relaxed text-lab-ink">
                  {m.content}
                </p>
              ),
            )
          : null}

        {showPersonalize && !consentDismissed ? (
          <PersonalizeBanner
            onAccept={() => {
              const answers = useInterviewStore.getState().answers;
              void savePerfumerProfile({
                consentPersonalization: true,
                consentChatLearning: true,
                ...mergeSignalTexts([]),
                indiaCity: answers.indiaCity,
                climateHint: answers.climateHint,
                occasionDefaults: answers.occasion
                  ? [answers.occasion === "skin" ? "daily" : answers.occasion]
                  : undefined,
                scentFamiliesLiked: answers.scentFamiliesLiked,
                scentFamiliesDisliked: answers.scentFamiliesDisliked,
                notesMentioned: answers.notesMentioned,
                formatPreference: answers.formatPreference,
                intensityPreference: answers.intensityPreference,
                timeOfDayDefaults: answers.timeOfDayDefaults,
                skinSensitivity: answers.skinSensitivity,
              }).then((res) => {
                if (res.ok) {
                  setProfile(res.profile);
                  bindInterviewProfile(res.profile, user?.uid ?? null);
                }
              });
            }}
            onDismiss={() => setConsentDismissed(true)}
          />
        ) : null}

        {revealed && !user ? (
          <p className="text-[12px] leading-relaxed text-lab-muted">
            <a href="/signup" className="underline decoration-lab-line underline-offset-2 hover:text-lab-ink">
              Save this compact
            </a>
            <span> - optional, never a wall.</span>
          </p>
        ) : null}
      </div>

      <div className="mt-auto shrink-0 border-t border-lab-line/50 bg-lab-panel px-2.5 py-2 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        {askedPerfumer ? (
          <div className="mb-2 rounded-lg border border-lab-line/70 bg-lab-wash/50 px-2.5 py-2">
            <p className="text-[12px] leading-snug text-lab-ink">
              Asking the perfumer uses chemist chat and a Groq key. Wear itself
              does not need one.
            </p>
            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                onClick={onAskCompose}
                className="min-h-9 flex-1 rounded-lg bg-lab-ink px-2 text-[11px] font-semibold text-lab-foam"
              >
                Compose
              </button>
              <button
                type="button"
                onClick={() => setAskedPerfumer(false)}
                className="min-h-9 flex-1 rounded-lg border border-lab-line bg-white px-2 text-[11px] font-semibold text-lab-ink"
              >
                Not now
              </button>
            </div>
          </div>
        ) : revealed ? (
          <button
            type="button"
            onClick={() => setAskedPerfumer(true)}
            className="mb-2 text-[11px] font-medium text-lab-muted underline decoration-lab-line underline-offset-2 hover:text-lab-ink"
          >
            Ask the perfumer
          </button>
        ) : null}
        {composeLine && act === "compose" && !reveal ? (
          <p className="mb-2 text-[12px] text-lab-muted">{composeLine}</p>
        ) : null}
        <div className="flex items-end gap-1.5 rounded-lg border border-lab-line/80 bg-white px-1.5 py-1">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            rows={1}
            placeholder={
              revealed
                ? "Too close? Too sweet? Another hour?"
                : "Where are you wearing this today?"
            }
            className="[field-sizing:content] max-h-32 min-h-8 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-1.5 text-[13px] leading-snug text-lab-ink placeholder:text-lab-muted/70 focus:outline-none"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!input.trim()}
            className="min-h-11 shrink-0 self-end rounded-lg bg-lab-ink px-3 text-xs font-semibold leading-none text-lab-foam outline-none hover:bg-black focus-visible:ring-1 focus-visible:ring-lab-ink/30 disabled:opacity-40 md:min-h-8 md:h-8"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export function replyToWearChip(chip: OccasionChip) {
  const label = OCCASION_CHIPS.find((c) => c.id === chip)?.label ?? chip;
  const wear = useWearStore.getState();
  wear.setOccasion(chip);
  const iv = useInterviewStore.getState();
  if (iv.act === "idle") {
    iv.ensureStarted({
      surface: "wear",
      skuId: wear.skuId,
    });
  }
  if (iv.act === "interview" || iv.act === "welcome" || iv.act === "idle") {
    iv.answerChip({ id: chip, label }, "occasion");
    return;
  }
  const skuId = wear.skuId ?? "generic";
  const lens = lensFromChip(chip);
  const card = buildWearCard({
    skuId,
    kind: "wear",
    lens,
    occasion: chip,
  });
  wear.setOccasionThread(
    chip,
    [
      {
        id: `chip-${chip}`,
        role: "assistant",
        content: card.body,
        card,
        lens,
        source: "chip",
      },
    ],
    lens,
  );
}
