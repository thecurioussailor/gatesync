// ─── Primitives ───────────────────────────────────────────────────────────────

export type Lane = 0 | 1 | 2;

export type OrbColor = 'blue' | 'yellow' | 'red';

export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameover';

// ─── Player ───────────────────────────────────────────────────────────────────

export interface Player {
  lane: Lane;
  heldColor: OrbColor | null; // color currently carried toward the gate
}

// ─── Orb ──────────────────────────────────────────────────────────────────────

export interface Orb {
  id: number;
  lane: Lane;
  color: OrbColor;
  z: number;        // 0 = far (spawn), 1 = close (collection line)
  collected: boolean;
}

// ─── Gate ─────────────────────────────────────────────────────────────────────

export type GateState = 'closed' | 'opening' | 'open';

export interface Gate {
  requiredColor: OrbColor;
  state: GateState;
  z: number;        // same z-axis as orbs — approaches from far to near
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export interface ScoreState {
  current: number;
  best: number;
  combo: number;
}

// ─── Full game state ──────────────────────────────────────────────────────────

export interface GameState {
  phase: GamePhase;
  player: Player;
  orbs: Orb[];
  gate: Gate | null;    // only one gate active at a time
  score: ScoreState;
  speed: number;        // world speed — increases over time
  elapsed: number;      // total ms since game start, used for spawning
  nextOrbId: number;
}