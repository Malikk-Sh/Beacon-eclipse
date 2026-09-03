import * as THREE from 'three';

export class SoykaController {
  readonly object = new THREE.Group();
  private readonly eye: THREE.Mesh;
  private pulse = 0;

  constructor(scene: THREE.Scene) {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x2f363b, roughness: 0.45, metalness: 0.8 }),
    );
    body.castShadow = true;
    this.object.add(body);

    this.eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0x4fc3ff }),
    );
    this.eye.position.z = -0.46;
    this.object.add(this.eye);
    scene.add(this.object);
  }

  signal() {
    this.pulse = 1;
  }

  update(target: THREE.Vector3, elapsed: number, dt: number) {
    const desired = new THREE.Vector3(
      target.x - 1.25 + Math.sin(elapsed * 1.2) * 0.08,
      target.y + 2.2 + Math.sin(elapsed * 2.1) * 0.12,
      target.z + 0.15,
    );
    this.object.position.lerp(desired, 0.12);
    this.object.rotation.y = elapsed * 0.35;

    if (this.pulse > 0) {
      this.eye.scale.setScalar(1 + this.pulse * 0.7);
      this.pulse = Math.max(0, this.pulse - dt * 2.5);
    } else {
      this.eye.scale.setScalar(1);
    }
  }
}
