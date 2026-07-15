import type { GameState, Move, Player } from '@cornered/engine';
import { initialState, legalMoves, applyMove, applyTimeout } from '@cornered/engine';
import type { SessionConfig } from '@cornered/modes';

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

function createGameStore() {
  let state = $state<GameState | null>(null);
  let session = $state<SessionConfig | null>(null);

  return {
    get state() { return state; },
    get session() { return session; },

    init(cfg: SessionConfig) {
      session = cfg;
      state = initialState(cfg.gameConfig);
    },

    reset() {
      state = null;
      session = null;
    },

    /** Dispatch a move. Returns true if the move was legal and applied. */
    dispatch(move: Move): boolean {
      if (!state || state.winner !== null) return false;
      const legal = legalMoves(state);
      if (!legal.some(m => movesEqual(m, move))) return false;
      state = applyMove(state, move);
      return true;
    },

    declareTimeout(player: Player) {
      if (!state) return;
      state = applyTimeout(state, player);
    },

    /** Direct state setter — used by AI to update after computing move. */
    setState(next: GameState) {
      state = next;
    },
  };
}

export const game = createGameStore();
