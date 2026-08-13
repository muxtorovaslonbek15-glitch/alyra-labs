"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  equationFromRaw,
  type EditableEquation,
  type FormulaToken,
} from "@/domains/chemistry/knowledge/tokenize";
import { lookupKnowledge, type KnowledgeCard } from "@/domains/chemistry/knowledge/lookup";
import { FormulaTokenBoard } from "./FormulaTokenBoard";
import { KnowledgeCardPanel } from "./KnowledgeCardPanel";
import { getAuthHeaders } from "@/lib/client/authHeaders";
import { useAuthStore } from "@/store/authStore";
import { labCopy } from "@/lab/labCopy";
import { track } from "@/lib/analytics/track";

interface OcrEquation {
  id: string;
  raw: string;
  confidence: number | null;
  notes: string | null;
  tokens: FormulaToken[];
}

interface OcrResponse {
  equations: OcrEquation[];
  formulas: string[];
  handwrittenNotes: string | null;
  source: "groq-vision" | "fallback";
  error?: string;
}

interface Props {
  onAddChemical?: (chemicalId: string) => void;
  onRunOnDesk?: (chemicalIds: string[]) => void;
  onClose?: () => void;
}

export function ScanWorkbench({ onAddChemical, onClose, onRunOnDesk }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [equations, setEquations] = useState<EditableEquation[]>([]);
  const [activeEq, setActiveEq] = useState(0);
  const [editRaw, setEditRaw] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [card, setCard] = useState<KnowledgeCard | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const loadEquations = useCallback((list: OcrEquation[], note: string | null) => {
    const eqs = list.map((e) => ({
      id: e.id,
      raw: e.raw,
      tokens: e.tokens?.length ? e.tokens : equationFromRaw(e.raw, e.id).tokens,
    }));
    setEquations(eqs);
    setActiveEq(0);
    setEditRaw(eqs[0]?.raw ?? "");
    setSource(note);
    setSelectedId(null);
    setHoveredId(null);
    setCard(null);
  }, []);

  async function runOcr(file: File) {
    setBusy(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError(labCopy.scanSignIn);
        return;
      }
      const dataUrl = await readAsDataUrl(file);
      setPreview(dataUrl);
      const base64 = dataUrl.split(",")[1] ?? "";
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers,
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: file.type || "image/jpeg",
        }),
      });
      const data = (await res.json()) as OcrResponse;
      if (res.status === 401) throw new Error(labCopy.scanSignIn);
      if (res.status === 429) throw new Error(labCopy.scanRateLimited);
      if (!res.ok) throw new Error(data.error ?? "OCR failed");
      track("scan_upload", {
        equationCount: data.equations.length,
        source: data.source,
      });
      loadEquations(
        data.equations,
        data.source === "fallback"
          ? data.handwrittenNotes
          : `Vision OCR · ${data.equations.length} equation(s)`,
      );
      if (data.equations[0]) {
        const firstSpecies = data.equations[0].tokens.find(
          (t) => t.species && t.kind === "element",
        );
        if (firstSpecies?.species) {
          setCard(lookupKnowledge(firstSpecies.species));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR failed");
    } finally {
      setBusy(false);
    }
  }

  async function loadDemo() {
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError(labCopy.scanSignIn);
        return;
      }
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers,
        body: JSON.stringify({ demo: true }),
      });
      const data = (await res.json()) as OcrResponse;
      if (res.status === 401) throw new Error(labCopy.scanSignIn);
      if (res.status === 429) throw new Error(labCopy.scanRateLimited);
      if (!res.ok) throw new Error(data.error ?? "Demo failed");
      loadEquations(data.equations, data.handwrittenNotes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo failed");
    } finally {
      setBusy(false);
    }
  }

  function applyEdit() {
    const next = equationFromRaw(editRaw, equations[activeEq]?.id);
    setEquations((prev) =>
      prev.map((eq, i) => (i === activeEq ? next : eq)),
    );
  }

  function selectEq(i: number) {
    setActiveEq(i);
    setEditRaw(equations[i]?.raw ?? "");
    setSelectedId(null);
    setHoveredId(null);
  }

  function onHover(id: string | null, lookupKey: string | null) {
    setHoveredId(id);
    if (lookupKey && !selectedId) {
      setCard(lookupKnowledge(lookupKey));
    }
  }

  function onSelect(id: string, lookupKey: string) {
    setSelectedId(id);
    setCard(lookupKnowledge(lookupKey));
  }

  function onSelectRelated(key: string) {
    setCard(lookupKnowledge(key));
  }

  const current = equations[activeEq];

  function deskIdsFromCurrent(): string[] {
    if (!current) return [];
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const t of current.tokens) {
      if (!t.species) continue;
      const k = lookupKnowledge(t.species);
      const id = k.deskChemicalId;
      if (id && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
    return ids.slice(0, 3);
  }

  function onDropFile(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) void runOcr(f);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-label text-lab-muted">
            Formula scan
          </p>
          <h2 className="font-display text-2xl text-lab-ink">
            Upload → OCR → learn
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-xl bg-lab-teal px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Reading…" : "Upload photo"}
          </button>
          <button
            type="button"
            onClick={loadDemo}
            disabled={busy}
            className="rounded-xl border border-lab-line/70 bg-white px-3 py-2 text-sm text-lab-ink"
          >
            Try sample equations
          </button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-lab-line/70 px-3 py-2 text-sm text-lab-muted"
            >
              Back to desk
            </button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void runOcr(f);
            e.target.value = "";
          }}
        />
      </div>

      {!user ? (
        <p className="rounded-lg bg-lab-wash px-3 py-2 text-sm text-lab-muted">
          {labCopy.scanSignIn}{" "}
          <Link href="/login" className="font-semibold text-lab-teal underline">
            Log in
          </Link>
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-lab-hazard">
          {error}
        </p>
      ) : null}
      {source ? (
        <p className="text-xs text-lab-muted">{source}</p>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.9fr)]">
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto scroll-thin">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Uploaded chemistry notes"
              className="max-h-40 w-full rounded-2xl border border-lab-line/50 object-contain bg-white"
            />
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDropFile}
              className={`flex max-h-40 min-h-28 w-full flex-col items-center justify-center rounded-2xl border border-dashed px-4 text-center transition ${
                dragOver
                  ? "border-lab-teal bg-lab-foam"
                  : "border-lab-line/80 bg-lab-foam/50 hover:border-lab-teal hover:bg-lab-foam"
              }`}
            >
              <span className="font-display text-lg text-lab-ink">
                Drop a photo of equations
              </span>
              <span className="mt-1 text-xs text-lab-muted">
                Or click to upload — handwritten or textbook
              </span>
            </button>
          )}

          {equations.length > 1 ? (
            <div className="flex flex-wrap gap-1.5">
              {equations.map((eq, i) => (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => selectEq(i)}
                  className={`rounded-lg px-2.5 py-1.5 font-mono text-[11px] transition ${
                    i === activeEq
                      ? "bg-lab-ink text-lab-foam"
                      : "bg-white text-lab-muted ring-1 ring-lab-line/60 hover:text-lab-ink"
                  }`}
                >
                  Eq {i + 1}
                </button>
              ))}
            </div>
          ) : null}

          {current ? (
            <>
              <FormulaTokenBoard
                tokens={current.tokens}
                selectedId={selectedId}
                hoveredId={hoveredId}
                onHover={onHover}
                onSelect={onSelect}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={editRaw}
                  onChange={(e) => setEditRaw(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyEdit();
                  }}
                  className="min-w-0 flex-1 rounded-xl border border-lab-line/60 bg-white px-3 py-2 font-mono text-sm text-lab-ink outline-none ring-lab-teal/30 focus:ring-2"
                  placeholder="Edit equation…"
                  aria-label="Edit equation text"
                />
                <button
                  type="button"
                  onClick={applyEdit}
                  className="rounded-xl border border-lab-teal/40 bg-lab-teal/10 px-3 py-2 text-sm font-semibold text-lab-teal"
                >
                  Re-tokenize
                </button>
              </div>
              <p className="text-[11px] text-lab-muted">
                Tip: click H, Cl, NaOH, or any piece — the knowledge card updates.
              </p>
              {onRunOnDesk && deskIdsFromCurrent().length > 0 ? (
                <button
                  type="button"
                  onClick={() => onRunOnDesk(deskIdsFromCurrent())}
                  className="rounded-xl bg-lab-teal px-3 py-2 text-sm font-semibold text-white hover:bg-lab-teal/90"
                >
                  Run on desk ({deskIdsFromCurrent().join(" + ")})
                </button>
              ) : null}
            </>
          ) : (
            <div className="rounded-2xl border border-lab-line/50 bg-white/70 px-4 py-10 text-center text-sm text-lab-muted">
              Upload a picture or load sample equations to start.
            </div>
          )}
        </div>

        <div className="min-h-0 overflow-y-auto scroll-thin">
          <KnowledgeCardPanel
            card={card}
            onSelectRelated={onSelectRelated}
            onAddToDesk={onAddChemical}
          />
        </div>
      </div>
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
