import type { GameState } from '../game/types';
import { createInitialState, createPlayingState, update } from '../game/gameLogic';
import { InputHandler, applyLaneMove } from '../input/InputHandler';
import type { InputAction } from '../input/InputHandler';

// ─── Engine ───────────────────────────────────────────────────────────────────

type OnStateChange = (state: GameState) => void;

export class GameEngine {
  private state: GameState;
  private input: InputHandler;
  private rafId: number | null = null;
  private lastTimestamp: number | null = null;
  private onStateChange: OnStateChange;

  constructor(onStateChange: OnStateChange) {
    this.onStateChange = onStateChange;
    this.state = createInitialState();
    this.input = new InputHandler(this.handleAction.bind(this));
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  start(): void {
    this.input.attach();
    this.loop(performance.now());
  }

  stop(): void {
    this.input.detach();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastTimestamp = null;
  }

  // ── Game loop ──────────────────────────────────────────────────────────────

  private loop(timestamp: number): void {
    if (this.lastTimestamp !== null) {
      const dtMs = Math.min(timestamp - this.lastTimestamp, 100); // cap at 100ms to handle tab blur
      this.tick(dtMs);
    }

    this.lastTimestamp = timestamp;
    this.rafId = requestAnimationFrame(this.loop.bind(this));
  }

  private tick(dtMs: number): void {
    this.state = update(this.state, dtMs);
    this.onStateChange(this.state);
  }

  // ── Input → state transitions ──────────────────────────────────────────────

  private handleAction(action: InputAction): void {
    const { phase, player } = this.state;

    switch (action.type) {
      case 'MOVE_LEFT':
      case 'MOVE_RIGHT':
        if (phase === 'playing') {
          this.state = {
            ...this.state,
            player: {
              ...player,
              lane: applyLaneMove(player.lane, action),
            },
          };
        }
        break;

      case 'START':
        if (phase === 'menu') {
          this.state = createPlayingState(this.state);
        }
        break;

      case 'RESTART':
        if (phase === 'gameover') {
          this.state = createPlayingState(this.state);
        }
        break;

      case 'PAUSE':
        if (phase === 'playing') {
          this.state = { ...this.state, phase: 'paused' };
        } else if (phase === 'paused') {
          this.state = { ...this.state, phase: 'playing' };
          // Reset timestamp so paused time doesn't count as dt
          this.lastTimestamp = null;
        }
        break;
    }

    // Always notify after any action so UI updates immediately
    this.onStateChange(this.state);
  }

  // ── Public read ────────────────────────────────────────────────────────────

  getState(): GameState {
    return this.state;
  }
}