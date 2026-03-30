import type { GameState, Lane, OrbColor, Orb, Gate } from './types';
import {
    ORB_COLORS,
    ORB_COLLECT_Z,
    ORB_MISS_Z,
    GATE_TRIGGER_Z,
    GATE_REMOVE_Z,
    ORB_SPAWN_INTERVAL_MS,
    GATE_SPAWN_DELAY_MS,
    GATE_FIRST_SPAWN_MS,
    BASE_SPEED,
    SPEED_INCREMENT,
    MAX_SPEED,
    POINTS_PER_GATE,
    COMBO_MULTIPLIER_CAP,
    BEST_SCORE_KEY,
} from './constants';

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createInitialState(): GameState {
    return {
        phase: 'menu',
        player: { lane: 1, heldColor: null},
        orbs: [],
        gate: null,
        score: {
            current: 0,
            best: loadBestScore(),
            combo: 0,
        },
        speed: BASE_SPEED,
        elapsed: 0,
        nextOrbId: 0,
    }
}

function loadBestScore(): number {
    try {
        return parseInt(localStorage.getItem(BEST_SCORE_KEY) ?? '0', 10) || 0;
    } catch {
        return 0;
    }
}