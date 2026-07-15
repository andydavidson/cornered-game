import type { GameState, WallId, Move } from './types.js';
import { shortestPath, goalRow } from './graph.js';
import { legalPawnMoves } from './moves.js';

/**
 * Returns true if two walls conflict (overlap or cross).
 *
 * H(r,c) covers edges: (r,c)↔(r+1,c) and (r,c+1)↔(r+1,c+1)
 * V(r,c) covers edges: (r,c)↔(r,c+1) and (r+1,c)↔(r+1,c+1)
 *
 * Conflicts:
 *   - Exact duplicate
 *   - H(r,c) vs H(r,c±1): share one edge
 *   - V(r,c) vs V(r±1,c): share one edge
 *   - H(r,c) vs V(r,c): cross at centre intersection
 */
export function wallsConflict(a: WallId, b: WallId): boolean {
  if (a.o === 'h' && b.o === 'h') {
    return a.r === b.r && Math.abs(a.c - b.c) <= 1;
  }
  if (a.o === 'v' && b.o === 'v') {
    return a.c === b.c && Math.abs(a.r - b.r) <= 1;
  }
  // One H, one V: only conflict if they cross at the same (r,c).
  return a.r === b.r && a.c === b.c;
}

/**
 * Checks that wall candidate `w` is legal in `state`:
 *   1. Position in bounds.
 *   2. Does not conflict with any existing wall.
 *   3. After placement, both players still have a path to their goal.
 */
export function isWallLegal(state: GameState, w: WallId): boolean {
  const { size, walls, pawns } = state;

  // 1. Bounds: r,c ∈ [0, size-2]
  if (w.r < 0 || w.r >= size - 1 || w.c < 0 || w.c >= size - 1) return false;

  // 2. No conflict with existing walls.
  for (const existing of walls) {
    if (wallsConflict(existing, w)) return false;
  }

  // 3. Path check for both players after hypothetical placement.
  const newWalls = [...walls, w];
  for (let pi = 0; pi < 2; pi++) {
    const player = pi === 0 ? 'p1' : 'p2';
    const gr = goalRow(player, size);
    if (shortestPath(size, newWalls, pawns[pi], gr) === null) return false;
  }

  return true;
}

/**
 * All legal wall placements for the current player (given they have walls left).
 * This is O((N-1)^2 * 2 * BFS) — used by the engine but callers may filter further.
 */
export function legalWallMoves(state: GameState): Array<{ type: 'wall' } & WallId> {
  const { size, turn, wallsLeft } = state;
  const pi = turn === 'p1' ? 0 : 1;
  if (wallsLeft[pi] === 0) return [];

  const results: Array<{ type: 'wall' } & WallId> = [];
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      for (const o of ['h', 'v'] as const) {
        const w: WallId = { r, c, o };
        if (isWallLegal(state, w)) {
          results.push({ type: 'wall', ...w });
        }
      }
    }
  }
  return results;
}

/** All legal moves (pawn + wall) for the current player. */
export function legalMoves(state: GameState): Move[] {
  if (state.winner) return [];
  const pawnMoves: Move[] = legalPawnMoves(state).map(to => ({ type: 'move', to }));
  const wallMovesArr: Move[] = legalWallMoves(state);
  return [...pawnMoves, ...wallMovesArr];
}
