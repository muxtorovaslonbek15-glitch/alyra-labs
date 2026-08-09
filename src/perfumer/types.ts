/** Client types for Alyra Master Perfumer API */

export type PerfumerErrorCode =
  | "missing_env"
  | "groq_down"
  | "rate_limited"
  | "timeout"
  | "tool_use_failed"
  | "invalid_formula"
  | "ifra_warning"
  | "search_failure"
  | "not_found"
  | "bad_request"
  | "network"
  | "internal";

export interface PerfumerApiError {
  code: PerfumerErrorCode | string;
  title: string;
  message: string;
  details?: unknown;
  actionable?: string | null;
  /** Suggested wait before retry (seconds) */
  retryAfterSec?: number;
}

export interface FormulaLine {
  id: string;
  name: string;
  percent: number;
  role?: string;
}

export interface CostBreakdown {
  ok: boolean;
  currency?: string;
  fxUsdInr?: number;
  batchGrams?: number;
  percentSum?: number;
  /** Primary: Indian Rupees */
  totalCostInr?: number;
  costPerGramInr?: number;
  summary?: string;
  /** Legacy field — may hold INR after API migration */
  totalCostUsd?: number;
  costPerGramUsd?: number;
  items?: Array<{
    id: string;
    name: string;
    percent: number;
    grams: number;
    unitCostPerGramInr?: number;
    unitCostPerGramUsd?: number;
    costTier: string;
    lineCostInr?: number;
    lineCostUsd?: number;
  }>;
  warnings?: string[];
  ifraFlags?: Array<{ id: string; name: string; severity: string; ifraNotes?: string }>;
}

export interface StructuredPayload {
  formula?: {
    formula?: FormulaLine[];
    accord?: { top: string[]; heart: string[]; base: string[] };
    cost?: CostBreakdown;
    solid?: unknown;
    explanation?: string;
    improvements?: string[];
    disclaimer?: string;
  } | null;
  cost?: CostBreakdown | null;
  solid?: unknown;
  dupe?: { disclaimer?: string; target?: string } | null;
  citations?: string[];
  ifraFlags?: Array<{ id: string; name: string; severity: string; ifraNotes?: string }>;
}

export interface ChatSections {
  accord: string;
  formula: string;
  explanation: string;
  improvements: string;
}

export interface ToolTraceItem {
  tool: string;
  ok?: boolean;
  label?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "error";
  content: string;
  sections?: ChatSections;
  structured?: StructuredPayload;
  warnings?: Array<{ code: string; title: string; message: string }>;
  error?: PerfumerApiError;
  status?: "ok" | "error" | "streaming";
  /** Live brainstorm stage label while streaming */
  thinkingLabel?: string;
  toolTrace?: ToolTraceItem[];
  clientMessageId?: string;
  createdAt?: string;
}

export interface ChatSession {
  id: string;
  /** Server chat id when synced; may equal id */
  serverId?: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface ChatListItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface BriefFields {
  goal: string;
  type: "EDP" | "Oil" | "Solid" | "";
  inspiration: string;
  targetVibe: string;
  notes: string;
  issues: string;
  constraints: string;
}
