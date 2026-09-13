import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { audioSystem } from './AudioSystem';
import { DroneNavigation } from './DroneNavigation';
import { SoykaVisual } from './SoykaVisual';
import type { CameraObstacle } from './ThirdPersonCamera';

export class SoykaController {
  readonly object = new THREE.Group();
  private readonly visual = new SoykaVisual();
  private readonly navigation: DroneNavigation;
  private readonly desired = new THREE.Vector3();
  private readonly interest = new THREE.Vector3();
  private readonly linger = new THREE.Vector3();
  private pulse = 0;
  private lookBackRemaining = 0;
  private yaw = 0;

  constructor(scene: THREE.Scene, physics: RAPIER.World, playerCollider: RAPIER.Collider,
    overhead: readonly CameraObstacle[] = []) {
    this.navigation = new DroneNavigation(physics, playerCollider, overhead);
    this.object.name = 'soyka-companion';
    this.object.add(this.visual.root);
    scene.add(this.object);
  }

  reset(position: THREE.Vector3): void {
    this.navigation.reset(position);
    this.object.visible = this.navigation.ready;
    this.object.position.copy(this.navigation.position);
    this.lookBackRemaining = 0;
  }

  signal(target?: THREE.Vector3): void {
    this.pulse = 1;
    if (target) this.lookBackAt(target);
  }

  lookBackAt(position: THREE.Vector3): void {
    this.interest.copy(position);
    this.linger.copy(this.object.position);
    this.lookBackRemaining = 2.4;
  }

  update(target: THREE.Vector3, elapsed: number, dt: number, heading = 0): void {
    // Only retry placement when no collision-free initial spawn was possible.
    if (!this.navigation.ready) { this.reset(target); if (!this.navigation.ready) return; }
    // Stay beside the player, then fold in behind through narrow doors.
    const sideX = -Math.cos(heading) * 1.2 + Math.sin(heading) * 0.55;
    const sideZ = Math.sin(heading) * 1.2 + Math.cos(heading) * 0.55;
    this.desired.set(target.x + sideX, target.y + 1.67 + Math.sin(elapsed * 1.6) * 0.024, target.z + sideZ);
    if (!this.navigation.isClear(this.desired)) {
      this.desired.set(target.x + Math.sin(heading) * 1.15, target.y + 1.65, target.z + Math.cos(heading) * 1.15);
      if (!this.navigation.isClear(this.desired)) this.desired.copy(target).add(new THREE.Vector3(0, 1.72, 0));
    }
    if (this.lookBackRemaining > 0.8 && this.linger.distanceTo(target) < 5) this.desired.copy(this.linger);
    this.object.position.copy(this.navigation.update(this.desired, dt));
    const velocity = this.navigation.velocity;
    const speed = velocity.length();
    let aim = heading;
    if (this.lookBackRemaining > 0) {
      aim = Math.atan2(this.object.position.x - this.interest.x, this.object.position.z - this.interest.z);
      this.lookBackRemaining = Math.max(0, this.lookBackRemaining - dt);
    } else if (speed > 0.55) aim = Math.atan2(-velocity.x, -velocity.z);
    const delta = Math.atan2(Math.sin(aim - this.yaw), Math.cos(aim - this.yaw));
    this.yaw += delta * (1 - Math.exp(-dt * 3.2));
    const localSide = velocity.x * Math.cos(this.yaw) - velocity.z * Math.sin(this.yaw);
    const localForward = -velocity.x * Math.sin(this.yaw) - velocity.z * Math.cos(this.yaw);
    this.object.rotation.y = this.yaw;
    this.visual.root.rotation.x = THREE.MathUtils.damp(this.visual.root.rotation.x, Math.min(0.13, localForward * 0.026), 5, dt);
    this.visual.root.rotation.z = THREE.MathUtils.damp(this.visual.root.rotation.z, THREE.MathUtils.clamp(-localSide * 0.04, -0.15, 0.15), 5, dt);
    this.visual.update(dt, elapsed, speed, this.pulse);
    this.pulse = Math.max(0, this.pulse - dt * 1.6);
    audioSystem.setSoykaPosition(this.object.position);
  }
}
