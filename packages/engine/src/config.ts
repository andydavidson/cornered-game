import type { GameConfig, GameState } from './types.js';

/** Wall count scales linearly with board size; default 9×9 → 10 walls. */
export function wallsForSize(size: number): number {
  return Math.round(size * 10 / 9);
}

export function initialState(config: GameConfig): GameState {
  const { size } = config;
  const mid = Math.floor(size / 2);
  return {
    size,
    pawns: [
      { r: size - 1, c: mid }, // p1: bottom-centre, races to row 0
      { r: 0, c: mid },         // p2: top-centre, races to row size-1
    ],
    walls: [],
    wallsLeft: [config.wallsPerPlayer, config.wallsPerPlayer],
    turn: 'p1',
    winner: null,
    timerEnabled: config.timerEnabled,
    timeoutBehaviour: config.timeoutBehaviour,
  };
}

export function defaultConfig(size = 9): GameConfig {
  return {
    size,
    wallsPerPlayer: wallsForSize(size),
    timerEnabled: false,
    timerSeconds: 30,
    timeoutBehaviour: 'miss',
  };
}
