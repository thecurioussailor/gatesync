import { useEffect, useRef } from 'react';
import type { GameState } from '../game/types';
import { drawFrame, updateParticles, spawnCollectParticles } from './draw';
import type { Particle } from './draw';
import { project, laneToNormX, makeConfig, curveZ } from './perspective';

interface Props {
  state: GameState;
}

export function GameCanvas({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Track previous orb ids so we can detect new collections
  const prevOrbIdsRef = useRef<Set<number>>(new Set());
  const prevHeldRef = useRef<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // ── Detect orb collection — spawn particles ──────────────────────────────
    const currentOrbIds = new Set(state.orbs.map(o => o.id));

    // If heldColor just changed, a pickup just happened
    if (state.player.heldColor && state.player.heldColor !== prevHeldRef.current) {
      const cfg = makeConfig(width, height);
      const normX = laneToNormX(state.player.lane, cfg.lanes);
      const pt = project(normX, curveZ(0.92), cfg);
      const newParticles = spawnCollectParticles(pt.x, pt.y, state.player.heldColor);
      particlesRef.current = [...particlesRef.current, ...newParticles];
    }

    prevHeldRef.current = state.player.heldColor;
    prevOrbIdsRef.current = currentOrbIds;

    // ── Update particles ─────────────────────────────────────────────────────
    particlesRef.current = updateParticles(particlesRef.current);

    // ── Draw ─────────────────────────────────────────────────────────────────
    drawFrame(ctx, state, width, height, particlesRef.current);
  }, [state]);

  // ── Resize handler ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        position: 'absolute',
        inset: 0,
      }}
    />
  );
}