import type { GameState, Move, Player } from '@cornered/engine';
import { initialState, tryApplyMove, applyTimeout } from '@cornered/engine';
import type { SessionConfig } from '@cornered/modes';

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
      if (!state) return false;
      const next = tryApplyMove(state, move);
      if (!next) return false;
      state = next;
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
