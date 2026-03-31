import type { Lane } from '../game/types';

// ─── Action types ─────────────────────────────────────────────────────────────

export type InputAction = 
    | { type: 'MOVE_LEFT' }
    | { type: 'MOVE_RIGHT' }
    | { type: 'PAUSE' }
    | { type: 'START' }
    | { type: 'RESTART' };

// ─── Input handler ────────────────────────────────────────────────────────────

type ActionCallback = (action: InputAction) => void;

export class InputHandler {
    private callback:  ActionCallback;
    private boundKeyDown: (e: KeyboardEvent) => void;

    constructor(callback: ActionCallback) {
        this.callback = callback;
        this.boundKeyDown = this.handleKeyDown.bind(this)
    }

    attach():void {
        window.addEventListener('keydown', this.boundKeyDown);
    }

    detach(): void {
        window.removeEventListener('keydown', this.boundKeyDown);
    }

    private handleKeyDown(e: KeyboardEvent): void {
        // Prevent page scrolling for arrow keys during play
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
            e.preventDefault();
        }

        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.callback({ type: 'MOVE_LEFT' });
                break;
        
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.callback({ type: 'MOVE_RIGHT' });
                break;
        
            case 'Escape':
            case 'p':
            case 'P':
                this.callback({ type: 'PAUSE' });
                break;
        
            case 'Enter':
            case ' ':
                this.callback({ type: 'START' });
                this.callback({ type: 'RESTART' });
                break;
        }
    }
}

// ─── Apply input action to player lane ────────────────────────────────────────
 
export function applyLaneMove(lane: Lane, action: InputAction): Lane {
    if (action.type === 'MOVE_LEFT') {
      return Math.max(0, lane - 1) as Lane;
    }
    if (action.type === 'MOVE_RIGHT') {
      return Math.min(2, lane + 1) as Lane;
    }
    return lane;
}