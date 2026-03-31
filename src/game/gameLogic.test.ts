/**
 * GateSync — Phase 1 logic tests
 * Run with: npx tsx src/game/gameLogic.test.ts
 */

import { createInitialState, createPlayingState, update } from './gameLogic';
import { applyLaneMove } from '../input/InputHandler';
import { ORB_COLLECT_Z, GATE_TRIGGER_Z, GATE_FIRST_SPAWN_MS } from './constants';
import type { GameState } from './types';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.error(`  ❌  ${label}`);
    failed++;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Advance state by N milliseconds in one step */
function advance(state: GameState, ms: number): GameState {
  return update(state, ms);
}

/** Advance state by N milliseconds in small steps (simulates real loop) */
function advanceBy(state: GameState, totalMs: number, stepMs = 16): GameState {
  let s = state;
  let remaining = totalMs;
  while (remaining > 0) {
    const dt = Math.min(stepMs, remaining);
    s = update(s, dt);
    remaining -= dt;
  }
  return s;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log('\n── Initial state ───────────────────────────────────────');

{
  const s = createInitialState();
  assert('phase is menu', s.phase === 'menu');
  assert('player starts on lane 1', s.player.lane === 1);
  assert('player holds nothing', s.player.heldColor === null);
  assert('no orbs', s.orbs.length === 0);
  assert('no gate', s.gate === null);
  assert('score is 0', s.score.current === 0);
}

console.log('\n── Lane switching ───────────────────────────────────────');

{
  const lane1 = 1 as const;
  assert('move left: 1 → 0', applyLaneMove(lane1, { type: 'MOVE_LEFT' }) === 0);
  assert('move right: 1 → 2', applyLaneMove(lane1, { type: 'MOVE_RIGHT' }) === 2);
  assert('clamp left at 0', applyLaneMove(0, { type: 'MOVE_LEFT' }) === 0);
  assert('clamp right at 2', applyLaneMove(2, { type: 'MOVE_RIGHT' }) === 2);
}

console.log('\n── Orb spawning ─────────────────────────────────────────');

{
  let s = createPlayingState(createInitialState());
  s = advanceBy(s, 1000); // advance 1 second — should spawn at least 1 orb
  assert('orbs spawn after 1s', s.orbs.length > 0);
  assert('orbs have valid lanes', s.orbs.every(o => [0, 1, 2].includes(o.lane)));
  assert('orbs have valid colors', s.orbs.every(o => ['blue', 'yellow', 'red'].includes(o.color)));
}

console.log('\n── Orb collection ───────────────────────────────────────');

{
  // Manually plant an orb just before the collect threshold on lane 1
  let s = createPlayingState(createInitialState());
  s = {
    ...s,
    player: { lane: 1, heldColor: null },
    orbs: [{ id: 99, lane: 1, color: 'blue', z: ORB_COLLECT_Z - 0.01, collected: false }],
  };

  // Advance just enough for the orb to cross the collect line
  s = advance(s, 50);
  assert('orb collected when on same lane', s.player.heldColor === 'blue');
  assert('collected orbs removed from array', s.orbs.every(o => !o.collected));
}

{
  // Orb on different lane should NOT be collected
  let s = createPlayingState(createInitialState());
  s = {
    ...s,
    player: { lane: 0, heldColor: null },
    orbs: [{ id: 100, lane: 2, color: 'red', z: ORB_COLLECT_Z - 0.01, collected: false }],
  };
  s = advance(s, 50);
  assert('orb on different lane not collected', s.player.heldColor === null);
}

{
  // Should overwrite held color when touching a new orb
  let s = createPlayingState(createInitialState());
  s = {
    ...s,
    player: { lane: 1, heldColor: 'yellow' },
    orbs: [{ id: 101, lane: 1, color: 'red', z: ORB_COLLECT_Z - 0.01, collected: false }],
  };
  s = advance(s, 50);
  assert('overwrites held color on new orb touch', s.player.heldColor === 'red');
}

console.log('\n── Gate mechanics ───────────────────────────────────────');

{
  // Correct color → gate opens, score awarded
  let s = createPlayingState(createInitialState());
  s = {
    ...s,
    player: { lane: 1, heldColor: 'red' },
    gate: { requiredColor: 'red', state: 'closed', z: GATE_TRIGGER_Z - 0.01 },
  };
  s = advance(s, 50);
  assert('gate opens on correct color', s.gate?.state === 'opening');
  assert('score increases', s.score.current > 0);
  assert('held color cleared after gate', s.player.heldColor === null);
  assert('combo increments', s.score.combo === 1);
}

{
  // Wrong color → game over
  let s = createPlayingState(createInitialState());
  s = {
    ...s,
    player: { lane: 1, heldColor: 'blue' },
    gate: { requiredColor: 'red', state: 'closed', z: GATE_TRIGGER_Z - 0.01 },
  };
  s = advance(s, 50);
  assert('game over on wrong color', s.phase === 'gameover');
}

{
  // No color held → game over
  let s = createPlayingState(createInitialState());
  s = {
    ...s,
    player: { lane: 1, heldColor: null },
    gate: { requiredColor: 'yellow', state: 'closed', z: GATE_TRIGGER_Z - 0.01 },
  };
  s = advance(s, 50);
  assert('game over when holding nothing', s.phase === 'gameover');
}

console.log('\n── Combo + scoring ──────────────────────────────────────');

{
  function passGate(s: GameState, color: 'blue' | 'yellow' | 'red'): GameState {
    s = {
      ...s,
      phase: 'playing',
      player: { ...s.player, heldColor: color },
      gate: { requiredColor: color, state: 'closed', z: GATE_TRIGGER_Z - 0.01 },
    };
    return advance(s, 50);
  }

  let s = createPlayingState(createInitialState());
  s = passGate(s, 'blue');
  assert('first gate: combo = 1', s.score.combo === 1);
  assert('first gate: score = 10', s.score.current === 10);

  s = passGate(s, 'red');
  assert('second gate: combo = 2', s.score.combo === 2);
  assert('second gate: score = 30 (10 + 20)', s.score.current === 30);

  s = passGate(s, 'yellow');
  assert('third gate: score = 60 (10+20+30)', s.score.current === 60);
}

console.log('\n── Pause / Resume ───────────────────────────────────────');

{
  let s = createPlayingState(createInitialState());
  s = { ...s, phase: 'paused' };
  const scoreSnapshot = s.score.current;
  s = advance(s, 1000); // should NOT update while paused
  assert('state does not change while paused', s.score.current === scoreSnapshot);
  assert('phase stays paused', s.phase === 'paused');
}
