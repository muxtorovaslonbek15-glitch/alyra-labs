import type {
  BriefFields,
  ChatListItem,
  ChatMessage,
  ChatSession,
  PerfumerApiError,
  StructuredPayload,
  ChatSections,
  LabBridgeFormula,
} from "./types";
import { getAuthHeaders } from "@/lib/client/authHeaders";

function baseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_PERFUMER_API_URL ||
    process.env.NEXT_PUBLIC_ZPL_API_URL ||
    "http://localhost:3001/api/perfumer";
  return raw.replace(/\/$/, "");
}

const PUBLIC_HEADERS = {
  "ngrok-skip-browser-warning": "1",
} as const;

async function authHeadersOrError(): Promise<
  | { ok: true; headers: Record<string, string> }
  | { ok: false; error: PerfumerApiError }
> {
  const headers = await getAuthHeaders();
  if (!headers) {
    return {
      ok: false,
      error: {
        code: "auth_required",
        title: "Sign in required",
        message: "Sign in to use Master Perfumer.",
        actionable: "Open Sign in from the top bar, then try again.",
      },
    };
  }
  return {
    ok: true,
    headers: {
      ...headers,
      "ngrok-skip-browser-warning": "1",
    },
  };
}

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      ok: false,
      error: {
        code: "internal",
        title: "Bad response",
        message: text.slice(0, 200),
      },
    };
  }
}

function normalizeError(data: unknown, status: number): PerfumerApiError {
  const d = data as {
    error?: PerfumerApiError & { retryAfterSec?: number };
    message?: string;
    code?: string;
    retryAfterSec?: number;
  };
  if (d?.error) {
    return {
      code: d.error.code || "internal",
      title: d.error.title || "Error",
      message: d.error.message || "Request failed",
      details: d.error.details,
      actionable: d.error.actionable,
      retryAfterSec: d.error.retryAfterSec ?? d.retryAfterSec,
    };
  }
  if (status === 401) {
    return {
      code: "auth_required",
      title: "Sign in required",
      message: d?.message || "Sign in to use Master Perfumer.",
      actionable: "Sign in, then try again.",
    };
  }
  if (status === 429) {
    return {
      code: "rate_limited",
      title: "Model is busy",
      message:
        "The perfume model is rate-limited right now. Try again in a moment.",
      actionable: "Wait about 30s, then send again.",
      retryAfterSec: 30,
    };
  }
  if (status === 0 || status >= 500) {
    return {
      code: "groq_down",
      title: "API unavailable",
      message: d?.message || "Perfumer is briefly unavailable.",
      actionable: "Try again in a moment.",
    };
  }
  return {
    code: d?.code || "bad_request",
    title: "Request failed",
    message: d?.message || `HTTP ${status}`,
  };
}

export async function checkPerfumerHealth(): Promise<{
  ok: boolean;
  error?: PerfumerApiError;
  data?: Record<string, unknown>;
}> {
  try {
    const res = await fetch(`${baseUrl()}/health`, {
      headers: { ...PUBLIC_HEADERS },
    });
    const data = await parseJson(res);
    if (!res.ok) return { ok: false, error: normalizeError(data, res.status) };
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      error: {
        code: "groq_down",
        title: "Cannot reach Perfumer",
        message: "The studio is offline right now.",
        actionable:
          "Try again in a moment. If this keeps happening, the backend may need a restart.",
      },
    };
  }
}

export async function listServerChats(): Promise<
  { ok: true; chats: ChatListItem[] } | { ok: false; error: PerfumerApiError }
> {
  const auth = await authHeadersOrError();
  if (!auth.ok) return auth;
  try {
    const res = await fetch(`${baseUrl()}/chats`, {
      headers: auth.headers,
    });
    const data = await parseJson(res);
    if (!res.ok || data.ok === false) {
      return { ok: false, error: normalizeError(data, res.status) };
    }
    return { ok: true, chats: data.chats || [] };
  } catch {
    return {
      ok: false,
      error: {
        code: "groq_down",
        title: "Network error",
        message: "Could not list chats.",
      },
    };
  }
}

export async function createServerChat(title?: string): Promise<
  { ok: true; chat: ChatSession } | { ok: false; error: PerfumerApiError }
> {
  const auth = await authHeadersOrError();
  if (!auth.ok) return auth;
  try {
    const res = await fetch(`${baseUrl()}/chats`, {
      method: "POST",
      headers: auth.headers,
      body: JSON.stringify(title ? { title } : {}),
    });
    const data = await parseJson(res);
    if (!res.ok || data.ok === false) {
      return { ok: false, error: normalizeError(data, res.status) };
    }
    const c = data.chat;
    return {
      ok: true,
      chat: {
        id: c.id,
        serverId: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messages: c.messages || [],
      },
    };
  } catch {
    return {
      ok: false,
      error: {
        code: "groq_down",
        title: "Network error",
        message: "Could not create chat.",
      },
    };
  }
}

export async function fetchServerChat(
  id: string,
): Promise<
  { ok: true; chat: ChatSession } | { ok: false; error: PerfumerApiError }
> {
  const auth = await authHeadersOrError();
  if (!auth.ok) return auth;
  try {
    const res = await fetch(`${baseUrl()}/chats/${encodeURIComponent(id)}`, {
      headers: auth.headers,
    });
    const data = await parseJson(res);
    if (!res.ok || data.ok === false) {
      return { ok: false, error: normalizeError(data, res.status) };
    }
    const c = data.chat;
    return {
      ok: true,
      chat: {
        id: c.id,
        serverId: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messages: (c.messages || []).map(mapServerMessage),
      },
    };
  } catch {
    return {
      ok: false,
      error: {
        code: "groq_down",
        title: "Network error",
        message: "Could not load chat.",
      },
    };
  }
}

export async function renameServerChat(
  id: string,
  title: string,
): Promise<{ ok: true } | { ok: false; error: PerfumerApiError }> {
  const auth = await authHeadersOrError();
  if (!auth.ok) return auth;
  try {
    const res = await fetch(`${baseUrl()}/chats/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: auth.headers,
      body: JSON.stringify({ title }),
    });
    const data = await parseJson(res);
    if (!res.ok || data.ok === false) {
      return { ok: false, error: normalizeError(data, res.status) };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: {
        code: "groq_down",
        title: "Network error",
        message: "Could not rename chat.",
      },
    };
  }
}

export async function deleteServerChat(
  id: string,
): Promise<{ ok: true } | { ok: false; error: PerfumerApiError }> {
  const auth = await authHeadersOrError();
  if (!auth.ok) return auth;
  try {
    const res = await fetch(`${baseUrl()}/chats/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: auth.headers,
    });
    const data = await parseJson(res);
    if (!res.ok || data.ok === false) {
      return { ok: false, error: normalizeError(data, res.status) };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: {
        code: "groq_down",
        title: "Network error",
        message: "Could not delete chat.",
      },
    };
  }
}

function mapServerMessage(m: Record<string, unknown>): ChatMessage {
  const role = (m.role as ChatMessage["role"]) || "assistant";
  return {
    id: String(m.id || ""),
    role: role === "error" ? "error" : role,
    content: String(m.content || ""),
    sections: m.sections as ChatSections | undefined,
    structured: m.structured as StructuredPayload | undefined,
    warnings: m.warnings as ChatMessage["warnings"],
    error: m.error as PerfumerApiError | undefined,
    status: m.status as ChatMessage["status"],
    toolTrace: m.toolTrace as ChatMessage["toolTrace"],
    clientMessageId: m.clientMessageId as string | undefined,
    createdAt: m.createdAt as string | undefined,
  };
}

export async function sendChat(body: {
  chatId?: string;
  message?: string;
  messages?: Array<{ role: string; content: string }>;
  clientMessageId?: string;
  brief?: BriefFields;
  /** Cursor-like orchestration: plan = propose; agent = normal tools */
  mode?: "plan" | "agent";
}): Promise<
  | {
      ok: true;
      chatId?: string;
      reply: string;
      sections: ChatSections;
      structured: StructuredPayload;
      warnings?: ChatMessage["warnings"];
      model?: string;
    }
  | { ok: false; error: PerfumerApiError; chatId?: string }
> {
  const auth = await authHeadersOrError();
  if (!auth.ok) return { ok: false, error: auth.error };

  const payload: Record<string, unknown> = {
    message: body.message,
    messages: body.messages,
    chatId: body.chatId,
    clientMessageId: body.clientMessageId,
  };
  if (body.mode === "plan" || body.mode === "agent") {
    payload.mode = body.mode;
  }
  if (body.brief) {
    if (body.brief.goal) payload.goal = body.brief.goal;
    if (body.brief.type) payload.type = body.brief.type;
    if (body.brief.inspiration) payload.inspiration = body.brief.inspiration;
    if (body.brief.targetVibe) payload.targetVibe = body.brief.targetVibe;
    if (body.brief.notes) payload.notes = body.brief.notes;
    if (body.brief.issues) payload.issues = body.brief.issues;
    if (body.brief.constraints) payload.constraints = body.brief.constraints;
  }

  try {
    const res = await fetch(`${baseUrl()}/chat`, {
      method: "POST",
      headers: auth.headers,
      body: JSON.stringify(payload),
    });
    const data = await parseJson(res);
    if (!res.ok || data.ok === false) {
      return {
        ok: false,
        error: normalizeError(data, res.status),
        chatId: data?.error?.details?.chatId || data?.chatId,
      };
    }
    return {
      ok: true,
      chatId: data.chatId,
      reply: data.reply || "",
      sections: data.sections || {
        accord: "",
        formula: "",
        explanation: "",
        improvements: "",
      },
      structured: data.structured || {},
      warnings: data.warnings,
      model: data.model,
    };
  } catch {
    return {
      ok: false,
      error: {
        code: "groq_down",
        title: "Network error",
        message: "Could not reach Perfumer just now.",
        actionable:
          "Check that the backend is running and CORS allows this origin.",
      },
    };
  }
}

/** SSE streaming chat — falls back to non-stream on failure */
export async function streamChat(
  body: {
    chatId?: string;
    message?: string;
    messages?: Array<{ role: string; content: string }>;
    clientMessageId?: string;
    brief?: BriefFields;
    mode?: "plan" | "agent";
  },
  handlers: {
    onMeta?: (meta: {
      chatId?: string;
      model?: string;
      toolTrace?: Array<{ tool: string; ok?: boolean }>;
    }) => void;
    onStatus?: (label: string, stage?: string, tool?: string) => void;
    onTool?: (tool: string, ok?: boolean) => void;
    onToken?: (text: string) => void;
    onStructured?: (s: StructuredPayload, sections?: ChatSections) => void;
    onLabBridge?: (payload: LabBridgeFormula) => void;
    onDone?: (
      reply: string,
      sections?: ChatSections,
      structured?: StructuredPayload,
      chatId?: string,
    ) => void;
    onError?: (error: PerfumerApiError, chatId?: string) => void;
    /** Fired when transport fails or stream dies before done — UI may show Reconnecting… */
    onNetworkHint?: () => void;
  },
): Promise<void> {
  const auth = await authHeadersOrError();
  if (!auth.ok) {
    handlers.onError?.(auth.error);
    return;
  }

  const payload: Record<string, unknown> = {
    message: body.message,
    messages: body.messages,
    chatId: body.chatId,
    clientMessageId: body.clientMessageId,
    liveStream: true,
  };
  if (body.mode === "plan" || body.mode === "agent") {
    payload.mode = body.mode;
  }
  if (body.brief) {
    Object.assign(payload, {
      goal: body.brief.goal || undefined,
      type: body.brief.type || undefined,
      inspiration: body.brief.inspiration || undefined,
      targetVibe: body.brief.targetVibe || undefined,
      notes: body.brief.notes || undefined,
      issues: body.brief.issues || undefined,
      constraints: body.brief.constraints || undefined,
    });
  }

  try {
    const res = await fetch(`${baseUrl()}/chat/stream`, {
      method: "POST",
      headers: {
        ...auth.headers,
        Accept: "text/event-stream",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok || !res.body) {
      const data = await parseJson(res);
      handlers.onError?.(
        normalizeError(data, res.status),
        data?.error?.details?.chatId || data?.chatId,
      );
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let sawDone = false;
    let sawError = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (const part of parts) {
        const line = part
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim())
          .join("");
        if (!line || line === "[DONE]") continue;
        try {
          const evt = JSON.parse(line);
          if (evt.type === "meta") {
            handlers.onMeta?.({
              chatId: evt.chatId,
              model: evt.model,
              toolTrace: evt.toolTrace,
            });
          }
          if (evt.type === "status") {
            handlers.onStatus?.(
              evt.label || "Thinking…",
              evt.stage,
              evt.tool,
            );
          }
          if (evt.type === "tool") {
            handlers.onTool?.(evt.tool || "tool", evt.ok !== false);
          }
          if (evt.type === "token") handlers.onToken?.(evt.text || "");
          if (evt.type === "structured") {
            handlers.onStructured?.(evt.structured || {}, evt.sections);
          }
          if (evt.type === "lab_bridge" && evt.payload) {
            handlers.onLabBridge?.(evt.payload as LabBridgeFormula);
          }
          if (evt.type === "done") {
            sawDone = true;
            handlers.onDone?.(
              evt.reply || "",
              evt.sections,
              evt.structured,
              evt.chatId,
            );
          }
          if (evt.type === "error") {
            sawError = true;
            const err = evt.error || {
              code: "internal",
              title: "Stream error",
              message: "Streaming failed",
            };
            handlers.onError?.(
              {
                ...err,
                retryAfterSec: err.retryAfterSec ?? evt.retryAfterSec,
              },
              evt.chatId,
            );
          }
        } catch {
          /* ignore partial JSON */
        }
      }
    }

    // Do not hammer Groq: only fall back when stream died with neither done nor error
    if (!sawDone && !sawError) {
      handlers.onNetworkHint?.();
      const result = await sendChat(body);
      if (!result.ok) {
        handlers.onError?.(result.error, result.chatId);
        return;
      }
      handlers.onMeta?.({ chatId: result.chatId, model: result.model });
      handlers.onStructured?.(result.structured, result.sections);
      handlers.onToken?.(result.reply);
      handlers.onDone?.(
        result.reply,
        result.sections,
        result.structured,
        result.chatId,
      );
    }
  } catch {
    // Network/transport failure only — one non-stream attempt, no loop
    handlers.onNetworkHint?.();
    const result = await sendChat(body);
    if (!result.ok) {
      handlers.onError?.(result.error, result.chatId);
      return;
    }
    handlers.onMeta?.({ chatId: result.chatId, model: result.model });
    handlers.onStructured?.(result.structured, result.sections);
    handlers.onToken?.(result.reply);
    handlers.onDone?.(
      result.reply,
      result.sections,
      result.structured,
      result.chatId,
    );
  }
}
