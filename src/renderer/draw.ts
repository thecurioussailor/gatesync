/**
 * draw.ts
 *
 * Pure drawing functions. Each takes a CanvasRenderingContext2D and data.
 * No state, no side effects — just canvas calls.
 */

import type { GameState, Orb, Gate, OrbColor } from '../game/types';
import {
  project,
  curveZ,
  laneToNormX,
  laneDividerNormX,
  corridorEdgeNormX,
  makeConfig,
} from './perspective';
import type { CorridorConfig } from './perspective';

// ─── Color palette ────────────────────────────────────────────────────────────

const COLORS: Record<OrbColor, string> = {
  blue: '#4fc3f7',
  yellow: '#ffd54f',
  red: '#ef5350',
};

const COLORS_GLOW: Record<OrbColor, string> = {
  blue: 'rgba(79,195,247,0.35)',
  yellow: 'rgba(255,213,79,0.35)',
  red: 'rgba(239,83,80,0.35)',
};

const CORRIDOR_COLOR = '#1565c0';      // blue corridor lines (matches screenshot)
const CORRIDOR_GLOW = 'rgba(21,101,192,0.18)';
const BG_COLOR = '#050a14';
const GATE_BORDER = '#1976d2';
const GATE_OPEN_COLOR = 'rgba(100,220,100,0.25)';
const CHARACTER_COLOR = '#90caf9';

// ─── Master draw ──────────────────────────────────────────────────────────────

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
  particles: Particle[]
): void {
  const cfg = makeConfig(width, height);

  drawBackground(ctx, width, height);
  drawCorridor(ctx, cfg);
  if (state.gate) drawGate(ctx, cfg, state.gate);
  drawCharacter(ctx, cfg, state.player.lane, state.player.heldColor);
  drawOrbs(ctx, cfg, state.orbs);
  drawParticles(ctx, particles);
  drawHeldIndicator(ctx, state.player.heldColor, width, height);
}

// ─── Background ───────────────────────────────────────────────────────────────

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);

  // Subtle radial atmosphere at horizon
  const grad = ctx.createRadialGradient(
    width / 2, height * 0.42, 0,
    width / 2, height * 0.42, width * 0.6
  );
  grad.addColorStop(0, 'rgba(21,101,192,0.12)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

// ─── Corridor ────────────────────────────────────────────────────────────────

function drawCorridor(ctx: CanvasRenderingContext2D, cfg: CorridorConfig): void {
  const vanishX = cfg.width / 2;
  const vanishY = cfg.height * cfg.horizonY;

  const zNear = 1;
  const { left, right } = corridorEdgeNormX();

  const nearLeft = project(left, zNear, cfg);
  const nearRight = project(right, zNear, cfg);
  const dividers = laneDividerNormX(cfg.lanes);

  // ── Floor fill ──────────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.moveTo(vanishX, vanishY);
  ctx.lineTo(nearLeft.x, nearLeft.y);
  ctx.lineTo(nearRight.x, nearRight.y);
  ctx.closePath();
  const floorGrad = ctx.createLinearGradient(0, vanishY, 0, cfg.height);
  floorGrad.addColorStop(0, 'rgba(10,20,50,0)');
  floorGrad.addColorStop(1, 'rgba(10,20,50,0.55)');
  ctx.fillStyle = floorGrad;
  ctx.fill();

  // ── Outer edges ─────────────────────────────────────────────────────────────
  drawCorridorLine(ctx, vanishX, vanishY, nearLeft.x, nearLeft.y, 2.5);
  drawCorridorLine(ctx, vanishX, vanishY, nearRight.x, nearRight.y, 2.5);

  // ── Lane dividers ───────────────────────────────────────────────────────────
  dividers.forEach(normX => {
    const near = project(normX, zNear, cfg);
    drawCorridorLine(ctx, vanishX, vanishY, near.x, near.y, 1);
  });

  // ── Horizontal depth lines (grid) ────────────────────────────────────────────
  const depthLines = [0.2, 0.35, 0.5, 0.65, 0.8, 0.92];
  depthLines.forEach(z => {
    const lLeft = project(left, z, cfg);
    const lRight = project(right, z, cfg);
    ctx.beginPath();
    ctx.moveTo(lLeft.x, lLeft.y);
    ctx.lineTo(lRight.x, lRight.y);
    ctx.strokeStyle = `rgba(21,101,192,${0.08 + z * 0.12})`;
    ctx.lineWidth = 0.5 + z * 0.5;
    ctx.stroke();
  });
}

function drawCorridorLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  width: number
): void {
  // Glow pass
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = CORRIDOR_GLOW;
  ctx.lineWidth = width * 4;
  ctx.stroke();

  // Sharp line
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = CORRIDOR_COLOR;
  ctx.lineWidth = width;
  ctx.stroke();
}

// ─── Orbs ────────────────────────────────────────────────────────────────────

function drawOrbs(
  ctx: CanvasRenderingContext2D,
  cfg: CorridorConfig,
  orbs: Orb[]
): void {
  // Draw far-to-near so closer orbs render on top
  const sorted = [...orbs].sort((a, b) => a.z - b.z);

  sorted.forEach(orb => {
    const normX = laneToNormX(orb.lane, cfg.lanes);
    const z = curveZ(orb.z);
    const pt = project(normX, z, cfg);
    const radius = Math.max(4, 18 * pt.scale);

    const color = COLORS[orb.color];
    const glow = COLORS_GLOW[orb.color];

    // Outer glow
    const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius * 2.5);
    g.addColorStop(0, glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Core orb
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Specular highlight
    ctx.beginPath();
    ctx.arc(pt.x - radius * 0.3, pt.y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
  });
}

// ─── Gate ────────────────────────────────────────────────────────────────────

function drawGate(
  ctx: CanvasRenderingContext2D,
  cfg: CorridorConfig,
  gate: Gate
): void {
  const z = curveZ(gate.z);
  const { left, right } = corridorEdgeNormX();

  const topLeft = project(left, z, cfg);
  const topRight = project(right, z, cfg);

  // Gate height proportional to scale
  const gateHeight = 60 * topLeft.scale;

  const isOpen = gate.state === 'opening' || gate.state === 'open';
  const color = COLORS[gate.requiredColor];
  const borderColor = isOpen ? '#66bb6a' : GATE_BORDER;

  // ── Top bar (colored — shows required color) ───────────────────────────────
  const barH = Math.max(4, 14 * topLeft.scale);
  ctx.fillStyle = color;
  ctx.fillRect(topLeft.x, topLeft.y - gateHeight - barH, topRight.x - topLeft.x, barH);

  // ── Gate frame ─────────────────────────────────────────────────────────────
  const dividers = laneDividerNormX(cfg.lanes);
  const allX = [
    project(left, z, cfg).x,
    ...dividers.map(nx => project(nx, z, cfg).x),
    project(right, z, cfg).x,
  ];

  // Background fill
  ctx.fillStyle = isOpen ? GATE_OPEN_COLOR : 'rgba(10,30,80,0.55)';
  ctx.fillRect(
    topLeft.x,
    topLeft.y - gateHeight,
    topRight.x - topLeft.x,
    gateHeight
  );

  // Cell borders
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = Math.max(1, 2 * topLeft.scale);

  // Outer border
  ctx.strokeRect(
    topLeft.x,
    topLeft.y - gateHeight,
    topRight.x - topLeft.x,
    gateHeight
  );

  // Vertical dividers inside gate
  dividers.forEach(normX => {
    const pt = project(normX, z, cfg);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y - gateHeight);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  });

  // ── Color dots inside each cell ────────────────────────────────────────────
  for (let lane = 0; lane < cfg.lanes; lane++) {
    const cellCenterX = (allX[lane] + allX[lane + 1]) / 2;
    const cellCenterY = topLeft.y - gateHeight / 2;
    const dotR = Math.max(3, 8 * topLeft.scale);

    ctx.beginPath();
    ctx.arc(cellCenterX, cellCenterY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = isOpen ? 0.4 : 0.9;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── Glow on the top bar ────────────────────────────────────────────────────
  const glowGrad = ctx.createLinearGradient(topLeft.x, topLeft.y - gateHeight - barH, topLeft.x, topLeft.y);
  glowGrad.addColorStop(0, COLORS_GLOW[gate.requiredColor]);
  glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(topLeft.x, topLeft.y - gateHeight - barH * 3, topRight.x - topLeft.x, gateHeight + barH * 3);
}

// ─── Character ───────────────────────────────────────────────────────────────

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  cfg: CorridorConfig,
  lane: number,
  heldColor: OrbColor | null
): void {
  const normX = laneToNormX(lane, cfg.lanes);
  const pt = project(normX, 0.78, cfg);

  const h = 52;
  const w = 26;
  const x = pt.x - w / 2;
  const y = pt.y - h;

  ctx.fillStyle = heldColor ? COLORS[heldColor] : CHARACTER_COLOR;

  // Body
  ctx.beginPath();
  ctx.roundRect(x + 4, y + 18, w - 8, h * 0.5, 4);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(pt.x, y + 12, 10, 0, Math.PI * 2);
  ctx.fill();

  // Legs (simple animated feel — two rects)
  ctx.fillRect(x + 4, y + h * 0.62, 8, h * 0.35);
  ctx.fillRect(x + w - 12, y + h * 0.62, 8, h * 0.35);
}

// ─── HUD: held color ─────────────────────────────────────────────────────────

function drawHeldIndicator(
  ctx: CanvasRenderingContext2D,
  heldColor: OrbColor | null,
  width: number,
  height: number
): void {
  const x = width / 2;
  const y = height - 32;
  const r = 12;

  // Track circles for all 3 colors
  const allColors: OrbColor[] = ['blue', 'yellow', 'red'];
  allColors.forEach((c, i) => {
    const cx = x + (i - 1) * 36;
    ctx.beginPath();
    ctx.arc(cx, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS[c];
    ctx.lineWidth = 2;
    ctx.globalAlpha = c === heldColor ? 1 : 0.25;
    ctx.stroke();

    if (c === heldColor) {
      ctx.beginPath();
      ctx.arc(cx, y, r - 4, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[c];
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

// ─── Particles ───────────────────────────────────────────────────────────────

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;      // 0–1, decreases each frame
  color: string;
  radius: number;
}

export function spawnCollectParticles(
  x: number,
  y: number,
  color: OrbColor
): Particle[] {
  const c = COLORS[color];
  return Array.from({ length: 12 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3;
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color: c,
      radius: 2 + Math.random() * 3,
    };
  });
}

export function updateParticles(particles: Particle[]): Particle[] {
  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.1, // gravity
      life: p.life - 0.035,
    }))
    .filter(p => p.life > 0);
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[]
): void {
  particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}