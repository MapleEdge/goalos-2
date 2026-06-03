---
name: adding-intents
description: How user-facing intents are classified and dispatched in the goalos-2 web app (apps/web), and the exact steps to add a new intent. Use when adding or changing an intent in the GoalPrompt / intent-detection pipeline.
---

# Adding intents (apps/web)

The prompt bar (`GoalPrompt`) classifies free text into an intent and dispatches a UI action. Classification is **hybrid**, tried in this order:

1. **Offline semantic model** (`src/lib/semantic/intent.ts`) — embeds the input and the per-intent exemplars, picks the best cosine match. Trusted only when score ≥ `INTENT_CONFIDENCE` (0.6). Preferred once the model has finished loading.
2. **Gemini** (`src/app/api/intent/route.ts`) — used while the offline model is still loading / when entitled. Returns one of `VALID_INTENTS`.
3. **Regex fallback** (`detectIntentRegex` in `src/components/ui/GoalPrompt.tsx`) — last resort.

Anything unmatched falls through to `create_goal` (free-form goal text).

## Add a new intent — checklist

A new intent MUST be declared in every layer or it silently falls back to `create_goal`:

1. `src/lib/semantic/intent.ts`
   - Add the name to the `SemanticIntent` union.
   - Add ~5 natural exemplar phrases to `INTENT_EXEMPLARS` (the `Record<SemanticIntent, string[]>` is exhaustive, so TS will flag a missing key).
2. `src/app/api/intent/route.ts`
   - Add the name to `VALID_INTENTS`.
   - Add a one-line description bullet to `SYSTEM_PROMPT` so Gemini can emit it.
3. `src/components/ui/GoalPrompt.tsx`
   - Add the name to the `IntentType` union.
   - Add a branch in `detectIntentRegex()`. **Order matters** — put more specific patterns before broader ones (e.g. `schedule_event` before `schedule_query`).
   - If the intent carries data, extend `IntentResult` and populate it in `buildIntent()`.
   - Add a `case` to the `handleSubmit()` switch that performs the action.
   - Optionally add an entry to `HELP_ITEMS` for discoverability in the help modal.

## Dispatch patterns

- **Navigate:** `window.location.href = '/path'` (guard with `if (window.location.pathname !== target)`).
- **Open a modal on the current page:** `setShow*(true)` state.
- **Open a modal on *another* page, pre-filled:** navigation is a full page load, so pass data via `sessionStorage` and also dispatch a `CustomEvent` for the already-on-that-page case. Reference: `src/lib/scheduleEvent.ts` (`NEW_EVENT_KEY`, `NEW_EVENT_EVENT`, `PrefilledEvent`, `parseEventInput`) consumed by `src/app/schedule/page.tsx`; `EventModal` accepts optional `initialTitle/initialDescription/initialLocation` for create-mode prefill.
- **Avoid `useSearchParams`** for this (Next.js 16 prerender/Suspense requirement); match the existing `window.location` pattern.

> This is a customized Next.js 16 — per the repo AGENTS.md, check `node_modules/next/dist/docs/` before using framework APIs.

## Standalone complexity router (optional, for tuning/tests)

`apps/web/tests/intent-complexity.ts` is a self-contained re-implementation of routing heuristics (NOT wired into production) used to tune thresholds and test classification in isolation. To mirror an intent here: add it to the `SemanticIntent` union, give it a base cost in `INTENT_COMPLEXITY`, add a `detectQuickPatterns` branch, and add labeled rows to `SAMPLE_DATASET`.

Interactive playground (run from `apps/web`):

```bash
yarn intent:try "schedule a meeting with John tomorrow at 3pm"   # one-shot breakdown
yarn intent:try                                                 # REPL
yarn intent:try --dataset                                       # dump labeled corpus + route counts
yarn intent:try --json "open the graph"                         # machine-readable
```

## Verify

```bash
yarn workspace @goalos/web exec vitest run tests/intent-complexity.test.ts
yarn workspace @goalos/web exec biome check
yarn workspace @goalos/web type-check
```

If `type-check` reports errors originating in Prisma / generated client, run `yarn db:generate` first, then re-run.
