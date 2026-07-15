import type { GameState, Move, Player } from '@cornered/engine';
import { legalMoves, applyMove } from '@cornered/engine';

export function activePlayerLabel(state: GameState): string {
  return state.turn === 'p1' ? 'Player 1' : 'Player 2';
}

export function applyHotseatMove(state: GameState, move: Move): GameState {
  if (state.winner !== null) return state;
  const legal = legalMoves(state);
  const isLegal = legal.some(m => movesEqual(m, move));
  if (!isLegal) return state;
  return applyMove(state, move);
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
