export type Player = 'p1' | 'p2';
export type WallOrientation = 'h' | 'v';

export interface Pos {
  r: number;
  c: number;
}

export interface WallId {
  r: number; // 0..size-2
  c: number; // 0..size-2
  o: WallOrientation;
}

export type PawnMove = { type: 'move'; to: Pos };
export type WallMove = { type: 'wall'; r: number; c: number; o: WallOrientation };
export type Move = PawnMove | WallMove;

/** Plain-JSON serialisable game state — no class methods. */
export interface GameState {
  size: number;                   // N (board is N×N cells)
  pawns: [Pos, Pos];              // [p1, p2] positions
  walls: WallId[];                // placed walls
  wallsLeft: [number, number];    // remaining walls [p1, p2]
  turn: Player;
  winner: Player | null;
  timerEnabled: boolean;
  timeoutBehaviour: 'miss' | 'forfeit';
}

export interface GameConfig {
  size: number;
  wallsPerPlayer: number;
  timerEnabled: boolean;
  timerSeconds: number;
  timeoutBehaviour: 'miss' | 'forfeit';
}
