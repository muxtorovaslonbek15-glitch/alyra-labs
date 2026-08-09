# Alyra Perfumer × Lab — design brief

**Date:** 2026-08-09  
**Owner:** Alyra Perfumer CTO  
**Status:** Approved for planning (user-directed deliverable; implement via phased roadmap)  
**Plan of record:** [`../alyra-perfumer-agentic-plan.md`](../alyra-perfumer-agentic-plan.md)

## Problem

Perfumer already chats with Groq tools and shows FormulaCards, but it is still too text-heavy, burns tokens, and cannot put a formula on the Alyra Lab desk. Lab inventory ids and Perfumer ingredient ids barely overlap. India is partially present as ₹, not as wear/occasion/sourcing mindset.

## Goals

1. Agentic assistant: tools do the work; UI renders structured cards; short human prose.
2. `open_in_lab`: clickable card → desk populated with mapped chemicals.
3. Cut output/context tokens so sessions last longer.
4. India-first persona: climate, occasions, preference patterns, sourcing, Alyra solids, ₹ only.
5. Honest stack choice: harden Groq loop; **no LangChain** unless a proven gap appears.

## Non-goals (this cycle)

- Full Lab inventory expansion to 1000 aroma chemicals
- Certified IFRA engine
- Teacher CMS / formula market publish from Perfumer (P2+)
- LangChain migration

## Approaches considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| A. Harden Groq tool loop + Lab mapper | Fits current code; low risk; token knobs exist | Mapper work; inventory gap | **Recommended** |
| B. LangChain / LangGraph agent | Graphs, memory abstractions | Abstraction tax; Groq already tool-calls; team velocity hit | Reject for now |
| C. Rewrite as single Next.js RAG agent | One repo | Splits ZPL production API; large rewrite | Reject |

## Design sketch

```
User brief → intent gate → (optional tools) → generate_formula
         → summarize tool JSON → short prose + structured side-channel
         → FormulaCard [Open in Lab] → map ids → deskStore.loadFormula
```

India layer lives in system prompt + formula generator heuristics (heat-stable, occasion tags), not only in cost FX.

## Open risks

Wrong chem ids on desk; IFRA false confidence; IP on dupes; latency on multi-tool turns. Mitigations in the plan.
