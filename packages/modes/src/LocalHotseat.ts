import type { GameState } from '@cornered/engine';
import { tryApplyMove } from '@cornered/engine';

export function activePlayerLabel(state: GameState): string {
  return state.turn === 'p1' ? 'Player 1' : 'Player 2';
}

/** Applies `move` if well-formed and legal; otherwise returns `state` unchanged. */
export function applyHotseatMove(state: GameState, move: unknown): GameState {
  return tryApplyMove(state, move) ?? state;
}
