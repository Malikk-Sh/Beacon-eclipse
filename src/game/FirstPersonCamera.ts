import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

/** The eye stays inside Lev's collision capsule; only a small grounded gait offset is added. */
export class FirstPersonCamera {
  private phase = 0;
  private blend = 0;
  private readonly eye = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly shape = new RAPIER.Ball(0.16);
  private readonly rotation = { x: 0, y: 0, z: 0, w: 1 };

  constructor(private readonly camera: THREE.PerspectiveCamera,
    private readonly physics: RAPIER.World, private readonly playerCollider: RAPIER.Collider) {}

  reset(): void { this.phase = 0; this.blend = 0; }

  update(position: THREE.Vector3, yaw: number, pitch: number, dt: number,
    moving = false, grounded = true, motion = true, pace = 1): void {
    this.blend = THREE.MathUtils.damp(this.blend, moving && grounded && motion ? Math.min(1, pace) : 0, 12, dt);
    if (moving && grounded) this.phase += dt * 6.6 * Math.sqrt(Math.min(1, pace));
    this.eye.copy(position);
    this.eye.y += 1.68;
    const side = Math.sin(this.phase) * 0.009 * this.blend;
    this.desired.copy(this.eye);
    this.desired.x += Math.cos(yaw) * side;
    this.desired.z -= Math.sin(yaw) * side;
    this.desired.y += Math.sin(this.phase * 2) * 0.012 * this.blend;
    const halfHeight = this.camera.near * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5));
    this.shape.radius = Math.max(0.16, Math.hypot(this.camera.near, halfHeight, halfHeight * this.camera.aspect));
    this.direction.copy(this.desired).sub(this.eye);
    const distance = this.direction.length();
    if (distance > 0.00001) {
      this.direction.divideScalar(distance);
      const hit = this.physics.castShape(this.eye, this.rotation, this.direction, this.shape,
        0, distance, true, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, this.playerCollider);
      if (hit) this.desired.copy(this.eye).addScaledVector(this.direction, Math.max(0, hit.time_of_impact - 0.01));
    }
    this.camera.position.copy(this.desired);
    this.camera.rotation.set(THREE.MathUtils.clamp(pitch, -1.32, 1.32), yaw, 0, 'YXZ');
  }
}
