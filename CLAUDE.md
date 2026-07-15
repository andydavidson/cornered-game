# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project
Browser-playable "Cornered" — a two-player abstract strategy game on a configurable grid, played with pawn moves and blocking walls (see SPEC.md for the full rules and architecture). Svelte UI, TypeScript engine, no React anywhere in this repo.

## Structure
- `packages/engine` — pure game logic, no UI/DOM deps. Treat this as a standalone library with its own tests.
- `packages/ai` — AI opponent, depends only on `engine`.
- `packages/modes` — orchestration between engine/ai and the UI layer.
- `apps/web` — SvelteKit app. All rendering and input handling lives here.

## Hard rules
- Never introduce React or React-derived libraries (no Next.js, no JSX-based state libs).
- `packages/engine` must never import from `apps/web` or any Svelte/DOM API. If you find yourself wanting to import Svelte stores into the engine, stop — the dependency should go the other way.
- Game state must stay JSON-serialisable (plain objects/arrays, no classes with methods) so it can later be sent over a WebSocket without a serialisation layer.
- Wall-placement legality must always be checked via the path-exists check (BFS/A*) before a wall move is accepted — never skip this for convenience.
- Diagonal pawn movement is only ever valid for the jump-around case described in SPEC.md — don't generalise it.
- The turn timer, when enabled, is a UI-driven clock; the engine only receives a timeout declaration, it doesn't run the clock itself. The configured timeout behaviour ("miss a turn" vs "forfeit the game") is set at game setup and determines what the engine does with that declaration.

## Workflow
- Use Vitest for `engine`/`ai` unit tests. Run tests after any change to those packages before touching the UI.
- Prefer small, composable pure functions in `engine`/`ai` over stateful classes.
- In Svelte components, keep board rendering (SVG) and game-state logic separate — components read from a store and dispatch move intents, they don't compute legality themselves.
- Use `<script lang="ts">` in all Svelte files.

## Commands (adjust once scaffolded)
- `npm run dev` — start SvelteKit dev server
- `npm run test` — run Vitest across packages
- `npm run build` — static build via SvelteKit static adapter

## Definition of done for v1
- Setup screen has board-size slider (5–13, odd), AI aggression slider, mode select, and a turn-timer on/off toggle (with duration selector and "miss a turn"/"forfeit the game" choice when on) before game start.
- Board-size slider sets board size and derived wall count live.
- AI aggression slider affects AI behaviour observably (test at 0 and 1 extremes).
- Local-vs-AI and local hotseat both playable end-to-end in the browser.
- Turn timer, when enabled, correctly applies the configured timeout behaviour (skips the turn, or ends the game).
- Engine and AI packages have passing unit tests covering wall-legality, jump/diagonal edge cases, and win detection.
- Builds as a static PWA.
