# Cornered — Specification

## Overview
A browser-playable two-player abstract strategy game, installable as a PWA. Each player races a pawn across a grid to the opposite side while placing walls to slow their opponent down. Playable locally against an AI with configurable aggression, with local hotseat and (future) networked human-vs-human modes.

## Rules

### Setup
- The board is an N×N grid of cells (N configurable, odd numbers, e.g. 5–13; default 9).
- Player 1 starts in the centre cell of one edge; Player 2 starts in the centre cell of the opposite edge.
- Each player's goal is to get their pawn onto any cell of the far edge (the edge opposite their own starting edge).
- Each player has a wall allowance determined by board size (see "Board size and walls" below).

### Turns
- Players alternate turns. On each turn a player must do exactly one of:
  1. **Move their pawn** one cell orthogonally (up, down, left, or right) into an empty adjacent cell, or
  2. **Place a wall** (if they have any remaining) in an empty wall-slot on the grid.
- A turn cannot be passed — a player must move or place a wall if a legal option exists (the only exception is a timed-out turn when the timer is on and set to "miss a turn"; see "Turn timer" below).

### Pawn movement
- Pawns move one cell at a time, orthogonally only.
- A pawn cannot move onto a cell already occupied by the opponent's pawn.
- **Jumping**: if the opponent's pawn is directly adjacent, a player may jump straight over it to the empty cell beyond, provided no wall blocks that path. If the cell beyond is off the board or blocked by a wall, the player may instead move diagonally to either cell adjacent to the opponent's pawn (this is the *only* situation in which diagonal movement is allowed).
- Walls do not block jumps between the two pawns themselves — they only block movement across the wall's own edge.

### Walls
- A wall occupies one slot in the grid between cells and spans the length of two cells, blocking pawn movement across both of those cell-boundaries.
- Walls can be placed horizontally or vertically.
- Walls cannot overlap, cross, or duplicate an existing wall.
- A wall may **never** be placed if it would completely close off either player's only route to their goal edge — there must always be at least one open path for both players at all times. This is checked before the placement is allowed.
- Once placed, a wall cannot be moved or removed for the rest of the game.
- Each player can place walls only up to their starting wall allowance; once used up, they may only move their pawn.

### Winning
- The first player to move their pawn onto any cell of their goal edge wins immediately.

### What is not allowed
- No diagonal pawn movement, except the specific jump-around case described above.
- No moving onto or through a cell occupied by the opponent (must jump instead).
- No moving through, over, or under a wall.
- No placing a wall that fully seals off either player's path to their goal.
- No removing, relocating, or stacking a wall on top of another.
- No skipping a turn while a legal move or wall placement exists.
- No placing more walls than your remaining allowance.

## Non-negotiables
- No React.
- UI built in Svelte (SvelteKit).
- Core game logic is a framework-agnostic TypeScript package with zero DOM/UI dependencies, fully unit-testable in isolation.
- Board size is configurable via a slider before the game starts; wall allowance scales with board size.
- AI aggression is configurable via a slider/setting.
- Turn timer is configurable (on/off) before the game starts.
- Architecture must allow adding networked human-vs-human later without rewriting the engine or UI.

## Architecture

```
/packages
  /engine      — pure TS: board model, move + wall legality, path-blocking check, win detection
  /ai          — TS: move evaluation + minimax/alpha-beta, aggression parameter
  /modes       — orchestration: local-vs-ai, local-hotseat, (future) networked
/apps
  /web         — SvelteKit app: board rendering (SVG), settings panel, PWA manifest/service worker
```

### `engine/`
- Board represented as an N×N grid of cells plus a (N-1)×(N-1) grid of wall-slots (each slot can hold a horizontal or vertical wall).
- Pure functions: `applyMove(state, move) -> state`, `legalMoves(state) -> Move[]`, `isWallLegal(state, wallMove) -> boolean` (BFS/A* from each pawn to their goal edge to confirm a path still exists), `checkWin(state) -> Player | null`.
- State is immutable/serialisable (plain JSON) — this is what gets sent over the wire for networked mode later.
- No dependency on Svelte, DOM, or any transport.
- Optional timer state (remaining seconds per player) lives alongside game state but is advanced by the UI layer's clock, not the engine itself — the engine only needs to know when a timeout has been declared, and whether the configured behaviour is "miss a turn" (engine passes the turn without a move) or "forfeit" (engine ends the game).

### `ai/`
- Evaluation heuristic: weighted blend of (a) your shortest path length to goal, (b) opponent's shortest path length, (c) walls remaining.
- Aggression parameter (0–1) sets the weight on "maximise opponent's path" vs "minimise own path". Low aggression ≈ race to goal, ignore opponent; high aggression ≈ prioritise blocking.
- Search: minimax + alpha-beta pruning, depth tunable by difficulty. MCTS as a stretch goal for a "hard" tier.

### `modes/`
- `LocalVsAI`: human moves via UI, AI moves via `ai/` on its turn.
- `LocalHotseat`: two human players, same device, alternating turns.
- `Networked` (future): same move objects (`{type: 'move'|'wall', ...}`) synced via an authoritative WebSocket relay. Not built in this version — the interface should just not preclude it.

### `apps/web` (Svelte)
- SvelteKit, `<script lang="ts">` throughout.
- Board rendered as a single SVG component; cells and wall-slots are click targets.
- **Pre-game setup screen**:
  - Board-size slider (5–13, odd sizes), with derived wall-count shown live.
  - AI aggression slider (0–1).
  - Mode select (vs AI / hotseat).
  - Turn timer: on/off toggle; when on, a duration selector and a timeout-behaviour choice ("miss a turn" or "forfeit the game") appear.
  - "Start game" button.
- Store: a small Svelte store wrapping engine state; UI subscribes and dispatches moves, never mutates board state directly.
- PWA: manifest.json + service worker for offline/installable support (`vite-plugin-pwa` is fine).

## Board size → wall count
Default: 9×9 board, 10 walls per player. Scale roughly linearly with board dimension, e.g. `walls = round(boardSize * 10 / 9)`, exposed as a pure function in `config/` so it's easy to retune. Slider shows the resulting wall count live before starting.

## Turn timer
- Toggle: on/off, shown in the setup screen alongside the board-size and aggression sliders.
- When on: each player gets a countdown (chess-clock style — their own clock only counts down on their turn). Duration is set at setup (e.g. a small set of presets, or a free-entry number of seconds).
- **Timeout behaviour**, also chosen in the setup screen when the timer is on:
  - **Miss a turn**: the player's clock resets to the configured duration and play passes to the opponent without a move being made. This is the one exception to the "a turn cannot be passed" rule.
  - **Forfeit the game**: the player loses immediately.
- When the timer is off, there is no time limit and the game proceeds at whatever pace the players choose.

## Out of scope for v1
- Networked play (interface only, not implemented).
- Accounts, matchmaking, persistence beyond local game state.
- Mobile-native builds (PWA is sufficient for v1; Capacitor wrap is a later step).
- More than two players.

## Testing
- `engine/` and `ai/` get unit tests (Vitest) covering: wall-legality edge cases (fully sealing a player in), path-length calculation, win detection, jump/diagonal edge cases, aggression behaviour at the extremes.
- No UI test framework required for v1 beyond manual/browser testing.

## Deployment
- Static build (SvelteKit static adapter), deployable to any static host (Cloudflare Pages, Netlify, self-hosted).
