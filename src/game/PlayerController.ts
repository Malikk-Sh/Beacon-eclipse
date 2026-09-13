import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { audioSystem } from './AudioSystem';
import type { InputController } from './InputController';
import { LevVisual } from './LevVisual';

export const PLAYER_SCENE_NAME = 'lev-player';

const PLAYER_VISUAL_SCALE = 0.64;
const PLAYER_VISUAL_GROUND_OFFSET = 0.34;

export class PlayerController {
  readonly object = new THREE.Group();
  private readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  private readonly controller: RAPIER.KinematicCharacterController;
  private readonly visual = new LevVisual();
  private readonly desiredMove = new THREE.Vector3();
  private readonly yAxis = new THREE.Vector3(0, 1, 0);
  private readonly speed = 5.1;
  private moving = false;
  private verticalSpeed = 0;
  private onGround = false;
  private landingWeight = 0;

  constructor(private readonly physics: RAPIER.World, scene: THREE.Scene, spawn = new THREE.Vector3(0, 0, 24)) {
    this.object.name = PLAYER_SCENE_NAME;
    this.visual.root.scale.setScalar(PLAYER_VISUAL_SCALE);
    this.visual.root.position.y = PLAYER_VISUAL_GROUND_OFFSET;
    this.object.add(this.visual.root);
    scene.add(this.object);

    this.body = physics.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y + 1.05, spawn.z),
    );
    this.collider = physics.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.48), this.body);
    this.controller = physics.createCharacterController(0.05);
    this.controller.enableAutostep(0.42, 0.22, true);
    this.controller.enableSnapToGround(0.28);
    this.syncVisual();
  }

  update(input: InputController, cameraYaw: number, dt: number) {
    this.desiredMove.set(input.movement.x, 0, -input.movement.y);
    this.moving = this.desiredMove.lengthSq() > 0.001;
    if (this.moving) {
      this.desiredMove.normalize().applyAxisAngle(this.yAxis, cameraYaw).multiplyScalar(this.speed * dt);
      const facing = Math.atan2(this.desiredMove.x, this.desiredMove.z) + Math.PI;
      const facingDelta = Math.atan2(
        Math.sin(facing - this.object.rotation.y),
        Math.cos(facing - this.object.rotation.y),
      );
      const turnBlend = 1 - Math.exp(-dt * 11);
      this.object.rotation.y += facingDelta * turnBlend;
    }
    if (input.consumeJump() && this.onGround) {
      this.verticalSpeed = 7.2;
      this.onGround = false;
      this.controller.disableSnapToGround();
      audioSystem.playMovementCue('jump');
    }
    this.verticalSpeed = this.onGround ? -2.2 : Math.max(-22, this.verticalSpeed - 22 * dt);
    this.desiredMove.y = this.verticalSpeed * dt;

    this.controller.computeColliderMovement(this.collider, {
      x: this.desiredMove.x,
      y: this.desiredMove.y,
      z: this.desiredMove.z,
    });
    const movement = this.controller.computedMovement();
    this.moving = Math.hypot(movement.x, movement.z) > 0.001;
    const wasGrounded = this.onGround;
    this.onGround = this.controller.computedGrounded() && this.verticalSpeed <= 0;
    if (this.onGround) {
      if (!wasGrounded && this.verticalSpeed < -3) {
        this.landingWeight = Math.min(1, -this.verticalSpeed / 10);
        audioSystem.playMovementCue('land');
      }
      this.verticalSpeed = -2.2;
      this.controller.enableSnapToGround(0.28);
    } else if (this.verticalSpeed > 0 && movement.y < this.desiredMove.y * 0.5) {
      this.verticalSpeed = 0; // A low ceiling cancels upward velocity.
    }
    this.landingWeight = Math.max(0, this.landingWeight - dt * 4);
    this.visual.update(dt, this.moving, this.onGround, this.verticalSpeed, this.landingWeight);
    this.visual.root.position.y += PLAYER_VISUAL_GROUND_OFFSET;
    const current = this.body.translation();
    this.body.setNextKinematicTranslation({
      x: current.x + movement.x,
      y: current.y + movement.y,
      z: current.z + movement.z,
    });
  }

  get grounded(): boolean { return this.onGround; }

  setPosition(position: THREE.Vector3) {
    this.verticalSpeed = 0;
    this.onGround = false;
    this.moving = false;
    this.landingWeight = 0;
    this.controller.enableSnapToGround(0.28);
    this.body.setTranslation({
      x: position.x,
      y: position.y + 1.05,
      z: position.z,
    }, true);
    this.body.setNextKinematicTranslation({
      x: position.x,
      y: position.y + 1.05,
      z: position.z,
    });
    this.syncVisual();
  }

  syncVisual() {
    const position = this.body.translation();
    this.object.position.set(position.x, position.y - 1.05, position.z);
    audioSystem.setPlayerState(this.object.position, this.moving && this.onGround);
  }

  get position() {
    return this.object.position;
  }
}
