import type { GameState } from '../game/types';
import './GameUI.css';

interface Props {
  state: GameState;
}

export function GameUI({ state }: Props) {
  const { phase, score, player } = state;

  return (
    <div className="ui-root">

      {/* ── HUD (always visible during play) ─────────────────────────────── */}
      {phase === 'playing' && (
        <div className="hud">
          <div className="hud-block">
            <span className="hud-label">SCORE</span>
            <span className="hud-value">{score.current}</span>
          </div>
          <div className="hud-block">
            <span className="hud-label">COMBO</span>
            <span className="hud-value combo">x{score.combo}</span>
          </div>
        </div>
      )}

      {/* ── Held color label ──────────────────────────────────────────────── */}
      {phase === 'playing' && player.heldColor && (
        <div className="held-label" data-color={player.heldColor}>
          HOLDING
        </div>
      )}

      {/* ── Menu screen ───────────────────────────────────────────────────── */}
      {phase === 'menu' && (
        <div className="overlay">
          <div className="overlay-card">
            <h1 className="game-title">GATE<span>SYNC</span></h1>
            <p className="subtitle">Switch lanes. Grab the orb. Open the gate.</p>
            <div className="controls-hint">
              <div><kbd>←</kbd><kbd>→</kbd> Switch lane</div>
            </div>
            <p className="press-start">Press <kbd>Enter</kbd> to play</p>
          </div>
        </div>
      )}

      {/* ── Paused screen ─────────────────────────────────────────────────── */}
      {phase === 'paused' && (
        <div className="overlay">
          <div className="overlay-card">
            <h2 className="pause-title">PAUSED</h2>
            <p className="press-start">Press <kbd>P</kbd> to resume</p>
          </div>
        </div>
      )}

      {/* ── Game over screen ──────────────────────────────────────────────── */}
      {phase === 'gameover' && (
        <div className="overlay">
          <div className="overlay-card gameover">
            <h2 className="gameover-title">GAME OVER</h2>
            <div className="score-row">
              <span className="score-label">Score</span>
              <span className="score-val">{score.current}</span>
            </div>
            <div className="score-row">
              <span className="score-label">Best</span>
              <span className="score-val best">{score.best}</span>
            </div>
            <p className="press-start">Press <kbd>Enter</kbd> to play again</p>
          </div>
        </div>
      )}

    </div>
  );
}