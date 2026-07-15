import type { GameState, Move, Player } from '@cornered/engine';
import { legalMoves, applyMove } from '@cornered/engine';
import { bestMove } from '@cornered/ai';

/** The human always plays as p1; AI plays as p2. */
export const HUMAN_PLAYER: Player = 'p1';
export const AI_PLAYER: Player = 'p2';

export function isAITurn(state: GameState): boolean {
  return state.turn === AI_PLAYER && state.winner === null;
}

/**
 * Synchronously compute and apply the AI's move.
 * For UI use, consider wrapping in a setTimeout/requestAnimationFrame to avoid blocking.
 */
export function applyAIMove(
  state: GameState,
  aggression: number,
  depth = 2,
): GameState {
  if (!isAITurn(state)) return state;
  const move = bestMove(state, aggression, depth);
  return applyMove(state, move);
}

/**
 * Apply a human move, but only if it's the human's turn and the move is legal.
 * Returns the new state (possibly with an AI response already applied).
 */
export function applyHumanMove(
  state: GameState,
  move: Move,
  aggression: number,
  depth = 2,
): GameState {
  if (state.turn !== HUMAN_PLAYER || state.winner !== null) return state;

  const legal = legalMoves(state);
  const isLegal = legal.some(m => movesEqual(m, move));
  if (!isLegal) return state;

  const afterHuman = applyMove(state, move);
  return afterHuman;
}

function movesEqual(a: Move, b: Move): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'move' && b.type === 'move') {
    return a.to.r === b.to.r && a.to.c === b.to.c;
  }
  if (a.type === 'wall' && b.type === 'wall') {
    return a.r === b.r && a.c === b.c && a.o === b.o;
  }
  return false;
}
