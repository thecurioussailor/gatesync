// ─── World ────────────────────────────────────────────────────────────────────

export const LANES = 3;
export const ORB_COLORS: import('./types').OrbColor[] = ['blue', 'yellow', 'red']

// ─── Z-axis thresholds (0 = far horizon, 1 = player feet) ────────────────────

/** Orb is collected when it reaches this z value and player is on same lane */
export const ORB_COLLECT_Z = 0.92;

/** Orbs past this z without being collected are simply removed (missed) */
export const ORB_MISS_Z = 1.05;

/** Gate triggers open/gameover check when it reaches this z */
export const GATE_TRIGGER_Z = 0.88;

/** Gate is fully past and removed at this z */
export const GATE_REMOVE_Z = 1.1;

// ─── Spawning ─────────────────────────────────────────────────────────────────

/** Minimum gap (ms) between orb spawns */
export const ORB_SPAWN_INTERVAL_MS = 900;

/** How many ms after a gate opens/clears before the next gate spawns */
export const GATE_SPAWN_DELAY_MS = 2200;

/** Gates start spawning this many ms into the game */
export const GATE_FIRST_SPAWN_MS = 3000;

// ─── Speed ────────────────────────────────────────────────────────────────────

/** Starting world speed (z units per second) */
export const BASE_SPEED = 0.35;

/** Speed added per second of play — gradual difficulty ramp */
export const SPEED_INCREMENT = 0.004;

/** Hard cap so the game stays playable */
export const MAX_SPEED = 0.9;

// ─── Scoring ──────────────────────────────────────────────────────────────────

export const POINTS_PER_GATE = 10;
export const COMBO_MULTIPLIER_CAP = 8;

// ─── LocalStorage ─────────────────────────────────────────────────────────────

export const BEST_SCORE_KEY = 'gatesync_best';