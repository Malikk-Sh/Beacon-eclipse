import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { HARBOR_FLOORS } from '../world/HarborLayout';
import type { SavedVector3, StoryProgress } from './StoryState';
import type { PlayerController } from './PlayerController';

export function finitePosition(position: unknown): position is SavedVector3 {
  if (!position || typeof position !== 'object') return false;
  const p = position as SavedVector3;
  return [p.x, p.y, p.z].every((v) => typeof v === 'number' && Number.isFinite(v));
}

export function stageCheckpoint(progress: StoryProgress): SavedVector3 {
  if (progress.bridgeStarted && progress.schoolEntered) return { x: 0, y: 0.47, z: -59 };
  if (progress.lighthousePowered) return { x: 0, y: 0.02, z: 3 };
  return { x: 0, y: 0.02, z: 24 };
}

export function inPlayableArea(p: SavedVector3, bridgeReady: boolean): boolean {
  if (!finitePosition(p) || p.y < -0.18 || p.y > 2) return false;
  if (HARBOR_FLOORS.some((f) => Math.abs(p.x - f.x) <= f.width / 2 - 0.5
    && Math.abs(p.z - f.z) <= f.depth / 2 - 0.5)) return true;
  if (!bridgeReady) return false;
  return (Math.abs(p.x) <= 2.9 && p.z <= -16.5 && p.z >= -60)
    || (Math.abs(p.x) <= 4.7 && p.z <= -59 && p.z >= -93);
}

export function canEnterSchool(p: SavedVector3, grounded: boolean, bridgeReady: boolean): boolean {
  return grounded && bridgeReady && finitePosition(p)
    && Math.abs(p.x) < 2.9 && p.z <= -57.2 && p.z >= -62
    && Math.abs(p.y - 0.45) < 0.24;
}

/** Only supported, unobstructed positions can become a checkpoint, including on legacy load. */
export class TraversalSafety {
  readonly checkpoint = new THREE.Vector3();
  private stableTime = 0;
  private sampleTime = 0;
  private readonly ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
  private readonly clearance = new RAPIER.Capsule(0.49, 0.45);

  constructor(
    private readonly physics: RAPIER.World,
    private readonly player: PlayerController,
    private readonly progress: StoryProgress,
    private readonly bridgeReady: () => boolean,
  ) {
    this.checkpoint.copy(stageCheckpoint(progress));
  }

  restore(position: SavedVector3): boolean {
    const supported = this.supportedPosition(position);
    this.checkpoint.copy(supported ?? stageCheckpoint(this.progress));
    this.player.setPosition(this.checkpoint);
    return supported === null;
  }

  update(dt: number): boolean {
    const p = this.player.position;
    if (!finitePosition(p) || p.y < -0.85 || p.y > 30 || Math.abs(p.x) > 90 || Math.abs(p.z) > 150) {
      this.recover();
      return true;
    }
    this.stableTime = this.player.grounded ? this.stableTime + dt : 0;
    this.sampleTime += dt;
    if (this.stableTime >= 0.25 && this.sampleTime >= 0.2) {
      this.sampleTime = 0;
      const supported = this.supportedPosition(p);
      if (supported) this.checkpoint.copy(supported);
    }
    return false;
  }

  recover(): void {
    const supported = this.supportedPosition(this.checkpoint);
    this.checkpoint.copy(supported ?? stageCheckpoint(this.progress));
    this.player.setPosition(this.checkpoint);
    this.stableTime = 0;
  }

  private supportedPosition(p: SavedVector3): THREE.Vector3 | null {
    if (!inPlayableArea(p, this.bridgeReady())) return null;
    let surfaceY = -Infinity;
    let minimumY = Infinity;
    // Check the entire stance, so balancing over an edge cannot overwrite the checkpoint.
    for (const [dx, dz] of [[0, 0], [-0.32, -0.32], [-0.32, 0.32], [0.32, -0.32], [0.32, 0.32]]) {
      this.ray.origin = { x: p.x + dx, y: p.y + 0.3, z: p.z + dz };
      const hit = this.physics.castRayAndGetNormal(this.ray, 0.65, true, undefined, undefined, this.player.collider);
      if (!hit || hit.normal.y < 0.7) return null;
      const y = this.ray.origin.y - hit.timeOfImpact;
      surfaceY = Math.max(surfaceY, y);
      minimumY = Math.min(minimumY, y);
    }
    if (surfaceY - minimumY > 0.22) return null;
    const clear = this.physics.intersectionWithShape(
      { x: p.x, y: surfaceY + 1.06, z: p.z }, { x: 0, y: 0, z: 0, w: 1 }, this.clearance,
      undefined, undefined, this.player.collider,
    );
    if (clear) return null;
    return new THREE.Vector3(p.x, surfaceY + 0.02, p.z);
  }
}
