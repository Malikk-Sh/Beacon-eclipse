import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

const FOLLOW_RATE = 5;
const SURFACE_MARGIN = 0.04;
const TELEPORT_DISTANCE = 10;

export interface CameraObstacle {
  shape: RAPIER.Shape;
  position: THREE.Vector3;
  boundingRadius: number;
}

export function cameraBox(position: THREE.Vector3, width: number, height: number, depth: number): CameraObstacle {
  return {
    shape: new RAPIER.Cuboid(width / 2, height / 2, depth / 2),
    position,
    boundingRadius: Math.hypot(width, height, depth) / 2,
  };
}

/** A swept camera volume keeps the smoothed view on the player's side of solid geometry. */
export class ThirdPersonCamera {
  private readonly target = new THREE.Vector3();
  private readonly previousTarget = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();
  private readonly candidate = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly closest = new THREE.Vector3();
  private readonly zeroVelocity = { x: 0, y: 0, z: 0 };
  private readonly rotation = { x: 0, y: 0, z: 0, w: 1 };
  private readonly shape = new RAPIER.Ball(0.22);
  private initialized = false;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly physics: RAPIER.World,
    private readonly playerCollider: RAPIER.Collider,
    private readonly overheadObstacles: readonly CameraObstacle[] = [],
  ) {}

  update(playerPosition: THREE.Vector3, yaw: number, pitch: number, dt: number): void {
    this.target.copy(playerPosition);
    this.target.y += 1.45;
    const portraitFraming = THREE.MathUtils.clamp((0.9 - this.camera.aspect) / 0.4, 0, 1);
    const distance = THREE.MathUtils.lerp(7.5, 9.1, portraitFraming);
    this.desired.set(
      this.target.x + Math.sin(yaw) * Math.cos(pitch) * distance,
      this.target.y + 3.1 + Math.sin(-pitch) * 4,
      this.target.z + Math.cos(yaw) * Math.cos(pitch) * distance,
    );

    const teleported = this.target.distanceToSquared(this.previousTarget) > TELEPORT_DISTANCE ** 2;
    if (!this.initialized || teleported) this.candidate.copy(this.desired);
    else this.candidate.copy(this.camera.position).lerp(this.desired, 1 - Math.exp(-FOLLOW_RATE * dt));

    // Enclose all near-plane corners, including unusually wide viewports.
    const halfHeight = this.camera.near * Math.tan(THREE.MathUtils.degToRad(this.camera.getEffectiveFOV() / 2));
    this.shape.radius = Math.max(0.22, Math.hypot(this.camera.near, halfHeight, halfHeight * this.camera.aspect));
    this.direction.copy(this.candidate).sub(this.target);
    const travel = this.direction.length();
    if (travel > 0.0001) {
      this.direction.divideScalar(travel);
      const hit = this.physics.castShape(
        this.target, this.rotation, this.direction, this.shape, 0, travel, true,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, this.playerCollider,
      );
      let limit = hit ? hit.time_of_impact : travel;
      for (const obstacle of this.overheadObstacles) {
        this.closest.copy(obstacle.position).sub(this.target);
        const along = THREE.MathUtils.clamp(this.closest.dot(this.direction), 0, limit);
        this.closest.copy(this.target).addScaledVector(this.direction, along);
        if (this.closest.distanceToSquared(obstacle.position) > (obstacle.boundingRadius + this.shape.radius) ** 2) continue;
        const overheadHit = this.shape.castShape(
          this.target, this.rotation, this.direction, obstacle.shape,
          obstacle.position, this.rotation, this.zeroVelocity, 0, limit, true,
        );
        if (overheadHit) limit = Math.min(limit, overheadHit.time_of_impact);
      }
      if (limit < travel) {
        // Clamp after smoothing: lerping toward a safe endpoint can still cross a wall.
        const safeTravel = Math.max(0, limit - SURFACE_MARGIN);
        this.candidate.copy(this.target).addScaledVector(this.direction, safeTravel);
      }
    }

    this.camera.position.copy(this.candidate);
    this.camera.lookAt(this.target);
    this.previousTarget.copy(this.target);
    this.initialized = true;
  }
}
