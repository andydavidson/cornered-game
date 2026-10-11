import type { GameState, Player } from '@cornered/engine';
import { tryApplyMove } from '@cornered/engine';
import { bestMove } from '@cornered/ai';

/** The human always plays as p1; AI plays as p2. */
export const HUMAN_PLAYER: Player = 'p1';
export const AI_PLAYER: Player = 'p2';

/** Search depth bounds — deeper searches can freeze the main thread. */
export const MIN_AI_DEPTH = 1;
export const MAX_AI_DEPTH = 4;

export function clampAggression(aggression: number): number {
  if (!Number.isFinite(aggression)) return 0.5;
  return Math.min(1, Math.max(0, aggression));
}

export function clampDepth(depth: number): number {
  if (!Number.isFinite(depth)) return 2;
  return Math.min(MAX_AI_DEPTH, Math.max(MIN_AI_DEPTH, Math.round(depth)));
}

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
  const move = bestMove(state, clampAggression(aggression), clampDepth(depth));
  return tryApplyMove(state, move) ?? state;
}

/**
 * Apply a human move, but only if it's the human's turn and the move is
 * well-formed and legal. Otherwise returns `state` unchanged.
 */
export function applyHumanMove(state: GameState, move: unknown): GameState {
  if (state.turn !== HUMAN_PLAYER) return state;
  return tryApplyMove(state, move) ?? state;
}
