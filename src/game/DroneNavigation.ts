import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { CameraObstacle } from './ThirdPersonCamera';

const ROTATION = { x: 0, y: 0, z: 0, w: 1 };
const FLAGS = RAPIER.QueryFilterFlags.EXCLUDE_SENSORS;
const CELL = 0.8;
const DIRECTIONS = [
  [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
  [0, 1, 0], [0, -1, 0], [1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1],
] as const;
type SearchNode = { key: string; p: THREE.Vector3; g: number; f: number; parent?: SearchNode };

/** Bounded 3D routing and swept sphere movement. A failed search holds position, never teleports. */
export class DroneNavigation {
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  readonly radius = 0.48;
  private readonly sphere = new RAPIER.Ball(this.radius);
  private readonly travel = new THREE.Vector3();
  private readonly next = new THREE.Vector3();
  private readonly targetVelocity = new THREE.Vector3();
  private readonly lastGoal = new THREE.Vector3(Infinity, Infinity, Infinity);
  private route: THREE.Vector3[] = [];
  private replan = 0;
  private initialized = false;
  private readonly closest = new THREE.Vector3();
  private readonly zero = { x: 0, y: 0, z: 0 };

  constructor(private readonly world: RAPIER.World, private readonly playerCollider: RAPIER.Collider,
    private readonly overhead: readonly CameraObstacle[] = []) {}

  get ready(): boolean { return this.initialized; }

  isClear(position: THREE.Vector3): boolean {
    if (this.world.intersectionWithShape(position, ROTATION, this.sphere, FLAGS, undefined, this.playerCollider)) return false;
    return !this.overhead.some(obstacle => position.distanceToSquared(obstacle.position) < (obstacle.boundingRadius + this.radius) ** 2
      && this.sphere.intersectsShape(position, ROTATION, obstacle.shape, obstacle.position, ROTATION));
  }

  canTravel(from: THREE.Vector3, to: THREE.Vector3): boolean {
    this.travel.copy(to).sub(from);
    const length = this.travel.length();
    if (length < 0.00001) return this.isClear(to);
    this.travel.divideScalar(length);
    if (this.world.castShape(from, ROTATION, this.travel, this.sphere, 0, length + 0.015,
      true, FLAGS, undefined, this.playerCollider)) return false;
    for (const obstacle of this.overhead) {
      this.closest.copy(obstacle.position).sub(from);
      const along = THREE.MathUtils.clamp(this.closest.dot(this.travel), 0, length);
      this.closest.copy(from).addScaledVector(this.travel, along);
      if (this.closest.distanceToSquared(obstacle.position) > (obstacle.boundingRadius + this.radius) ** 2) continue;
      if (this.sphere.castShape(from, ROTATION, this.travel, obstacle.shape, obstacle.position, ROTATION,
        this.zero, 0, length + 0.015, true)) return false;
    }
    return true;
  }

  /** Used only for initial load or an explicit player recovery teleport. */
  reset(player: THREE.Vector3): void {
    this.initialized = false;
    const eye = player.clone().add(new THREE.Vector3(0, 1.65, 0));
    const candidates = [[-1.15, 0, 0.5], [1.15, 0, 0.5], [0, 0, 1.2], [0, 0.7, 0], [0, 0, 0]];
    for (const [x, y, z] of candidates) {
      const candidate = eye.clone().add(new THREE.Vector3(x, y, z));
      if (this.isClear(candidate) && this.canTravel(eye, candidate)) {
        this.position.copy(candidate);
        this.initialized = true;
        break;
      }
    }
    this.velocity.set(0, 0, 0);
    this.route = [];
    this.replan = 0;
  }

  update(goal: THREE.Vector3, dt: number): THREE.Vector3 {
    if (!this.initialized) return this.position;
    this.replan -= dt;
    if (this.canTravel(this.position, goal) && this.isClear(goal)) {
      this.route = [goal.clone()];
    } else if (this.replan <= 0 || this.lastGoal.distanceToSquared(goal) > 9) {
      this.route = this.findRoute(goal);
      this.lastGoal.copy(goal);
      this.replan = 0.85;
    }
    while (this.route.length > 1 && this.position.distanceToSquared(this.route[0]) < 0.13) this.route.shift();
    // Smooth shortcuts are allowed only after a full-volume visibility check.
    for (let i = this.route.length - 1; i > 0; i--) {
      if (this.canTravel(this.position, this.route[i])) { this.route.splice(0, i); break; }
    }
    const destination = this.route[0];
    this.targetVelocity.set(0, 0, 0);
    if (destination) {
      this.targetVelocity.copy(destination).sub(this.position);
      const distance = this.targetVelocity.length();
      if (distance > 0.025) this.targetVelocity.multiplyScalar(Math.min(6.3, distance * 3.5) / distance);
    }
    this.velocity.lerp(this.targetVelocity, 1 - Math.exp(-dt * 5));
    this.next.copy(this.position).addScaledVector(this.velocity, Math.min(dt, 0.05));
    if (this.canTravel(this.position, this.next) && this.isClear(this.next)) this.position.copy(this.next);
    else {
      this.velocity.multiplyScalar(0.2);
      this.route = [];
      this.replan = Math.min(this.replan, 0.15);
    }
    return this.position;
  }

  private findRoute(goal: THREE.Vector3): THREE.Vector3[] {
    const start = this.position.clone();
    const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
    const initial: SearchNode = { key: key(0, 0, 0), p: start, g: 0, f: start.distanceTo(goal) };
    const open = [initial];
    const costs = new Map<string, number>([[initial.key, 0]]);
    let closest = initial;
    for (let visits = 0; visits < 190 && open.length; visits++) {
      let best = 0;
      for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
      const current = open.splice(best, 1)[0];
      if (current.g > costs.get(current.key)!) continue;
      if (current.p.distanceToSquared(goal) < closest.p.distanceToSquared(goal)) closest = current;
      if (this.isClear(goal) && this.canTravel(current.p, goal)) {
        closest = { key: 'goal', p: goal.clone(), g: current.g, f: 0, parent: current };
        break;
      }
      const [cx, cy, cz] = current.key.split(',').map(Number);
      for (const [dx, dy, dz] of DIRECTIONS) {
        const x = cx + dx, y = cy + dy, z = cz + dz;
        // Prefer flight at companion height; look above/under local obstructions, not above the city.
        if (Math.abs(x) > 12 || Math.abs(z) > 12 || Math.abs(y) > 3) continue;
        const nextKey = key(x, y, z);
        const g = current.g + Math.hypot(dx, dy, dz) * CELL + Math.abs(dy) * 0.24;
        if (g >= (costs.get(nextKey) ?? Infinity)) continue;
        const point = new THREE.Vector3(start.x + x * CELL, start.y + y * CELL, start.z + z * CELL);
        if (!this.isClear(point) || !this.canTravel(current.p, point)) continue;
        costs.set(nextKey, g);
        open.push({ key: nextKey, p: point, g, f: g + point.distanceTo(goal) * 1.08, parent: current });
      }
    }
    const points: THREE.Vector3[] = [];
    while (closest.parent) { points.unshift(closest.p); closest = closest.parent; }
    return points;
  }
}
