import type { GameState, Move, Player } from '@cornered/engine';
import { legalPawnMoves, legalWallMoves, applyMove, shortestPath, goalRow } from '@cornered/engine';
import { evaluate } from './evaluate.js';

/**
 * Generate candidate moves for the AI at search nodes.
 *
 * At higher depths we skip wall moves to keep the tree manageable.
 * We always include a curated set of wall moves at the root (depth === maxDepth).
 */
function candidateMoves(state: GameState, remainingDepth: number): Move[] {
  const pawnMoves: Move[] = legalPawnMoves(state).map(to => ({ type: 'move' as const, to }));

  if (remainingDepth <= 0) return pawnMoves;

  const pi = state.turn === 'p1' ? 0 : 1;
  if (state.wallsLeft[pi] === 0) return pawnMoves;

  // Include wall moves at the top levels but not deeper to limit branching.
  const wallMoves: Move[] = remainingDepth >= 2
    ? blockerWalls(state).slice(0, 6)
    : [];

  return [...pawnMoves, ...wallMoves];
}

/**
 * Returns wall moves that cross the opponent's current shortest-path corridors,
 * sorted by how much they lengthen the opponent's path.
 */
function blockerWalls(state: GameState): Move[] {
  const oi = state.turn === 'p1' ? 1 : 0;
  const opp: Player = state.turn === 'p1' ? 'p2' : 'p1';
  const og = goalRow(opp, state.size);
  const baseDist = shortestPath(state.size, state.walls, state.pawns[oi], og) ?? 0;

  const candidates = legalWallMoves(state);
  const scored = candidates.map(w => {
    const newWalls = [...state.walls, { r: w.r, c: w.c, o: w.o }];
    const newDist = shortestPath(state.size, newWalls, state.pawns[oi], og) ?? 0;
    return { move: w as Move, delta: newDist - baseDist };
  });

  scored.sort((a, b) => b.delta - a.delta);
  return scored.map(s => s.move);
}

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximising: boolean,
  rootPlayer: Player,
  aggression: number,
): number {
  if (depth === 0 || state.winner !== null) {
    return evaluate(state, rootPlayer, aggression);
  }

  const moves = candidateMoves(state, depth);
  if (moves.length === 0) return evaluate(state, rootPlayer, aggression);

  if (maximising) {
    let value = -Infinity;
    for (const m of moves) {
      const child = applyMove(state, m);
      value = Math.max(value, minimax(child, depth - 1, alpha, beta, false, rootPlayer, aggression));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break; // β cutoff
    }
    return value;
  } else {
    let value = Infinity;
    for (const m of moves) {
      const child = applyMove(state, m);
      value = Math.min(value, minimax(child, depth - 1, alpha, beta, true, rootPlayer, aggression));
      beta = Math.min(beta, value);
      if (beta <= alpha) break; // α cutoff
    }
    return value;
  }
}

/**
 * Returns the best move for the current player, using minimax + alpha-beta.
 *
 * @param aggression 0–1, how much the AI prioritises blocking vs racing.
 * @param depth      search depth (2–3 is playable; higher may be slow on large boards).
 */
export function bestMove(state: GameState, aggression: number, depth = 2): Move {
  const player = state.turn;
  const moves = candidateMoves(state, depth);

  if (moves.length === 0) throw new Error('bestMove: no legal moves');

  let best = moves[0];
  let bestScore = -Infinity;

  for (const m of moves) {
    const child = applyMove(state, m);
    const score = minimax(child, depth - 1, -Infinity, Infinity, false, player, aggression);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }

  return best;
}
