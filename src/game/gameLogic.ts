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

export function createPlayingState(prev: GameState): GameState {
    return {
        ...createInitialState(),
        phase: 'playing',
        score: {
            current: 0,
            best: prev.score.best,
            combo: 0,
        }
    };
}

// ─── Main update — call every frame with delta time in seconds ────────────────

export function update(state: GameState, dtMs: number): GameState {

    if(state.phase !== 'playing') return state;

    const dt = dtMs / 1000;
    const elapsed = state.elapsed + dtMs;

    //Ramp up speed over time
    const speed = Math.min(state.speed + SPEED_INCREMENT * dt, MAX_SPEED);

    // ── Move all orbs farward ──────────────────────────────────────────────────
    let orbs = state.orbs.map(orb => ({
        ...orb,
        z: orb.z + speed * dt
    }));

    // ── Collect orbs that reach the player's lane ──────────────────────────────
    let player = { ...state.player };
    const collectionEvents: OrbColor[] = [];

    orbs = orbs.map(orb => {
        if(
            !orb.collected && orb.z >= ORB_COLLECT_Z && orb.lane === player.lane
        ) {
            //Pick up only if not already holding something
            if(player.heldColor === null) {
                player = { ...player, heldColor: orb.color};
                collectionEvents.push(orb.color);
                return { ...orb, collected: true};
            }
        }
        return orb;
    });

    //Remove orbs that have flown past (missed or already collected)
    orbs = orbs.filter(orb => orb.z < ORB_MISS_Z && !orb.collected);

    // ── Spawn new orbs on interval ─────────────────────────────────────────────
    const lastSpawnElapsed = state.elapsed;
    const orbSpawnThreshold = Math.floor(elapsed / ORB_SPAWN_INTERVAL_MS);
    const prevOrbSpawnThreshold = Math.floor(lastSpawnElapsed / ORB_SPAWN_INTERVAL_MS);

    let nextOrbId = state.nextOrbId;

    if(orbSpawnThreshold > prevOrbSpawnThreshold) {
        const newOrb = spawnOrb(nextOrbId, state.gate);
        orbs = [...orbs, newOrb];
        nextOrbId += 1;
    }

    // ── Move gate forward ──────────────────────────────────────────────────────
    let gate = state.gate ? { ...state.gate, z: state.gate.z + speed * dt} : null;

    let score = { ...state.score};
    let phase: GameState['phase'] = state.phase;

    // ── Gate trigger check ─────────────────────────────────────────────────────
    if(gate && gate.state === 'closed' && gate.z >= GATE_TRIGGER_Z) {
        if(player.heldColor === gate.requiredColor) {
            //Correct color - open gate, award points
            gate = { ...gate, state: 'opening'};
            player = { ...player, heldColor: null};

            const newCombo = Math.min(score.combo + 1, COMBO_MULTIPLIER_CAP);
            const points = POINTS_PER_GATE * newCombo;
            const newScore = score.current + points;
            const newBest = Math.max(newScore, score.best);

            score = { current: newScore, best: newBest, combo: newCombo };

            if(newBest > score.best) saveBestScore(newBest);
        } else {
            //Wrong color or nothing held — game over
            phase = 'gameover';
            saveBestScore(score.best);
        }
    }

    //Remove full-passed gate and schedule next
    if(gate && gate.z >= GATE_REMOVE_Z) {
        gate = null
    }

    if ( gate === null && elapsed >= GATE_FIRST_SPAWN_MS ) {
        const lastGateClearedAt = state.gate === null ? 0 : state.elapsed;
        // Simple approach: spawn a gate if none exists and we're past the first gate time
        // We check elapsed modulo to control spacing
        const gateCycle = GATE_SPAWN_DELAY_MS;
        const shouldSpawn = Math.floor(elapsed / gateCycle) > Math.floor(state.elapsed / gateCycle);

        if (shouldSpawn || (state.gate === null && elapsed >= GATE_FIRST_SPAWN_MS && state.elapsed < GATE_FIRST_SPAWN_MS)) {
            gate = spawnGate();
        }
    }

    return {
        ...state,
        phase,
        player,
        orbs,
        gate,
        score,
        speed,
        elapsed,
        nextOrbId,
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function spawnOrb(id: number, activeGate: Gate | null): Orb {
    const lane = randomLane();
    //Bias color toward the required gate color so the game is solvable
    const color = activeGate ? biasedColor(activeGate.requiredColor, 0.5) : randomColor();

    return { id, lane, color, z: 0, collected: false};
}

function spawnGate(): Gate {
    return {
        requiredColor: randomColor(),
        state: 'closed',
        z: 0
    }
}


function randomLane(): Lane {
    return (Math.floor(Math.random() * 3) as Lane);
}

function randomColor(): OrbColor {
    return ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)];
}

/**
 * Returns the target color with `bias` probability, random otherwise.
 * Ensures there's always at least one orb of the required color before the gate.
 */
function biasedColor(target: OrbColor, bias: number): OrbColor {
    return Math.random() < bias ? target : randomColor();
}
// ─── Persistence ──────────────────────────────────────────────────────────────
 
function loadBestScore(): number {
    try {
        return parseInt(localStorage.getItem(BEST_SCORE_KEY) ?? '0', 10) || 0;
    } catch {
        return 0;
    }
}

function saveBestScore(score: number): void {
    try {
        localStorage.setItem(BEST_SCORE_KEY, String(score))
    } catch {
        // storage unavailable - silently ignore
    }
}