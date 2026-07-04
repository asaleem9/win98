// The raycasting core: a grid DDA that returns, for a single ray, the nearest
// wall it strikes together with the texture column and depth needed to draw a
// vertical strip. Doors are handled as a thin plane recessed to the centre of
// their tile so they can slide open and the ray sees whatever is behind them.
//
// Everything here is pure and DOM-free. Distances come back already
// perpendicular to the camera plane (the classic Lodev metric), so the renderer
// gets fisheye-free wall heights straight from `dist`.

import { WALL, isDoorId } from './texture';

export interface RayScene {
  width: number;
  height: number;
  /** Wall id per tile, row-major. 0 is empty floor. */
  cells: Uint8Array;
  /** Slide fraction per tile: 0 shut, 1 fully retracted. Only doors use it. */
  doorOpen: Float32Array;
  /** Door plane per tile: 0 none, 1 plane at constant x, 2 plane at constant y. */
  doorAxis: Uint8Array;
}

export const AXIS_X = 1;
export const AXIS_Y = 2;

// Below this slide fraction a door still stops movement, sight and bullets.
export const DOOR_PASSABLE = 0.8;

export interface Camera {
  posX: number;
  posY: number;
  dirX: number;
  dirY: number;
  planeX: number;
  planeY: number;
}

export interface RayHit {
  /** Perpendicular distance to the camera plane. */
  dist: number;
  /** Wall id that was struck. */
  wall: number;
  /** 0 = the ray crossed an x-grid line, 1 = a y-grid line (used for shading). */
  side: number;
  /** Horizontal position along the wall face, 0..1 — the texture column. */
  tex: number;
  /** True when the strip is a (partly open) door face. */
  door: boolean;
}

function cellAt(scene: RayScene, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= scene.width || y >= scene.height) return WALL.BRICK;
  return scene.cells[y * scene.width + x];
}

/** A tile that stops movement, sight and shots: a solid wall or a shut door. */
export function isBlocking(scene: RayScene, x: number, y: number): boolean {
  const c = cellAt(scene, x, y);
  if (c === WALL.EMPTY) return false;
  if (isDoorId(c)) {
    const open = scene.doorOpen[y * scene.width + x] ?? 0;
    return open < DOOR_PASSABLE;
  }
  return true;
}

/** True when a world point sits inside a blocking tile — the collision probe. */
export function isSolidPoint(scene: RayScene, x: number, y: number): boolean {
  return isBlocking(scene, Math.floor(x), Math.floor(y));
}

/**
 * March one ray from the camera until it meets a wall or an unopened stretch of
 * a door. Returns null only if nothing is hit within the iteration cap (maps are
 * bordered, so that should not happen in practice).
 */
export function castRay(scene: RayScene, posX: number, posY: number, rayDirX: number, rayDirY: number): RayHit | null {
  let mapX = Math.floor(posX);
  let mapY = Math.floor(posY);

  const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
  const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

  let stepX: number;
  let stepY: number;
  let sideDistX: number;
  let sideDistY: number;

  if (rayDirX < 0) {
    stepX = -1;
    sideDistX = (posX - mapX) * deltaDistX;
  } else {
    stepX = 1;
    sideDistX = (mapX + 1 - posX) * deltaDistX;
  }
  if (rayDirY < 0) {
    stepY = -1;
    sideDistY = (posY - mapY) * deltaDistY;
  } else {
    stepY = 1;
    sideDistY = (mapY + 1 - posY) * deltaDistY;
  }

  let side = 0;
  for (let iter = 0; iter < 256; iter++) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }

    const cell = cellAt(scene, mapX, mapY);
    if (cell === WALL.EMPTY) continue;

    if (isDoorId(cell)) {
      const idx = mapY * scene.width + mapX;
      const openFrac = scene.doorOpen[idx] ?? 0;
      const axis = scene.doorAxis[idx] || AXIS_X;
      // Distance at which the ray entered this tile.
      const tFace = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;

      if (axis === AXIS_X) {
        // Door plane at x = mapX + 0.5.
        const t = (mapX + 0.5 - posX) / rayDirX;
        if (t >= tFace) {
          const yHit = posY + t * rayDirY;
          const along = yHit - mapY;
          if (along >= 0 && along < 1) {
            const texAlong = along + openFrac;
            if (texAlong < 1) return { dist: t, wall: cell, side: 1, tex: texAlong, door: true };
          }
        }
        continue; // ray slipped through the open portion
      } else {
        // Door plane at y = mapY + 0.5.
        const t = (mapY + 0.5 - posY) / rayDirY;
        if (t >= tFace) {
          const xHit = posX + t * rayDirX;
          const along = xHit - mapX;
          if (along >= 0 && along < 1) {
            const texAlong = along + openFrac;
            if (texAlong < 1) return { dist: t, wall: cell, side: 0, tex: texAlong, door: true };
          }
        }
        continue;
      }
    }

    // Solid wall.
    const perpDist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
    let wallX = side === 0 ? posY + perpDist * rayDirY : posX + perpDist * rayDirX;
    wallX -= Math.floor(wallX);
    return { dist: perpDist, wall: cell, side, tex: wallX, door: false };
  }
  return null;
}

/**
 * Is the segment between two world points clear of walls and shut doors? Used
 * for enemy sight and hitscan. The tiles containing the endpoints never count as
 * blockers, so an enemy standing in a doorway can still see out.
 */
export function hasLineOfSight(scene: RayScene, x0: number, y0: number, x1: number, y1: number): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return true;
  const dirX = dx / dist;
  const dirY = dy / dist;

  let mapX = Math.floor(x0);
  let mapY = Math.floor(y0);
  const tgtX = Math.floor(x1);
  const tgtY = Math.floor(y1);

  const stepX = dirX < 0 ? -1 : 1;
  const stepY = dirY < 0 ? -1 : 1;
  const deltaX = dirX === 0 ? Infinity : Math.abs(1 / dirX);
  const deltaY = dirY === 0 ? Infinity : Math.abs(1 / dirY);
  let sideX = dirX < 0 ? (x0 - mapX) * deltaX : (mapX + 1 - x0) * deltaX;
  let sideY = dirY < 0 ? (y0 - mapY) * deltaY : (mapY + 1 - y0) * deltaY;

  for (let i = 0; i < 512; i++) {
    if (mapX === tgtX && mapY === tgtY) return true;
    if (sideX < sideY) {
      sideX += deltaX;
      mapX += stepX;
    } else {
      sideY += deltaY;
      mapY += stepY;
    }
    if (mapX === tgtX && mapY === tgtY) return true;
    if (isBlocking(scene, mapX, mapY)) return false;
  }
  return false;
}

/**
 * Transform a world position into the camera's view space. `ty` is depth (the
 * value the sprite's z-buffer test uses); it is > 0 only when the point sits in
 * front of the player. `tx` is the horizontal offset used to place it on screen.
 */
export function spriteTransform(cam: Camera, sx: number, sy: number): { tx: number; ty: number } {
  const relX = sx - cam.posX;
  const relY = sy - cam.posY;
  const invDet = 1 / (cam.planeX * cam.dirY - cam.dirX * cam.planeY);
  const tx = invDet * (cam.dirY * relX - cam.dirX * relY);
  const ty = invDet * (-cam.planeY * relX + cam.planeX * relY);
  return { tx, ty };
}
