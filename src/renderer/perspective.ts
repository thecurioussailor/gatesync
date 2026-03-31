/**
 * perspective.ts
 *
 * All coordinate math for projecting the 3D corridor onto a 2D canvas.
 * z = 0 → far horizon (top of screen)
 * z = 1 → player position (bottom of screen)
 *
 * Everything in the game passes through `project()` before being drawn.
 */

export interface ProjectedPoint {
    x: number;
    y: number;
    scale: number; // use this to size orbs, gate cells, character
  }
  
  export interface CorridorConfig {
    /** Canvas width in px */
    width: number;
    /** Canvas height in px */
    height: number;
    /**
     * How far down the canvas the vanishing point sits (0–1).
     * 0.42 puts it slightly above center — matches the screenshot feel.
     */
    horizonY: number;
    /**
     * Half-width of the corridor at the player's feet (z=1), in px.
     * Controls how wide the corridor appears at the bottom.
     */
    corridorHalfWidth: number;
    /** Number of lanes */
    lanes: number;
  }
  
  export function makeConfig(width: number, height: number): CorridorConfig {
    return {
      width,
      height,
      horizonY: 0.42,
      corridorHalfWidth: width * 0.48,
      lanes: 3,
    };
  }
  
  // ─── Core projection ──────────────────────────────────────────────────────────
  
  /**
   * Projects a world-space point onto the canvas.
   *
   * @param laneX  Normalised lane position: -1 = left edge, 0 = centre, +1 = right edge
   * @param z      Depth: 0 = horizon, 1 = player feet
   * @param cfg    Corridor configuration
   */
  export function project(
    laneX: number,
    z: number,
    cfg: CorridorConfig
  ): ProjectedPoint {
    const vanishX = cfg.width / 2;
    const vanishY = cfg.height * cfg.horizonY;
    const footY = cfg.height * 0.98; // where z=1 lands on screen
  
    // Linear interpolation from vanishing point to foot of screen
    const t = z; // 0 = far, 1 = near
    const y = vanishY + (footY - vanishY) * t;
    const halfW = cfg.corridorHalfWidth * t;
    const x = vanishX + laneX * halfW;
  
    // Scale grows linearly with z so objects appear larger as they approach
    const scale = Math.max(0.01, t);
  
    return { x, y, scale };
  }
  
  // ─── Lane helpers ─────────────────────────────────────────────────────────────
  
  /**
   * Returns the normalised laneX for a given lane index (0, 1, 2).
   * Lane 0 = left, 1 = centre, 2 = right.
   */
  export function laneToNormX(lane: number, totalLanes: number): number {
    // Map lane index to [-1, +1]
    // e.g. 3 lanes → centres at -0.67, 0, +0.67
    const step = 2 / totalLanes;
    return -1 + step * lane + step / 2;
  }
  
  /**
   * Returns the normalised x positions of lane dividers (edges between lanes).
   */
  export function laneDividerNormX(totalLanes: number): number[] {
    const dividers: number[] = [];
    for (let i = 1; i < totalLanes; i++) {
      dividers.push(-1 + (2 / totalLanes) * i);
    }
    return dividers;
  }
  
  /**
   * Returns the normalised x of the left and right corridor edges.
   */
  export function corridorEdgeNormX(): { left: number; right: number } {
    return { left: -1, right: 1 };
  }
  
  // ─── Z-curve ─────────────────────────────────────────────────────────────────
  
  /**
   * Applies a slight ease-in curve to z so objects accelerate as they approach.
   * Pass raw z through this before projecting for a more natural feel.
   */
  export function curveZ(z: number): number {
    return z * z * (3 - 2 * z); // smoothstep
  }