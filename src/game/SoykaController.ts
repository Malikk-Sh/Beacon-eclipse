import * as THREE from 'three';
import { AssetManager, type ModelInstance } from '../world/AssetManager';
import { audioSystem } from './AudioSystem';

const SOYKA_MODEL_URL = '/assets/DRN_Soyka.gltf';

export class SoykaController {
  readonly object = new THREE.Group();
  private readonly assets = new AssetManager();
  private eye: THREE.Object3D | null = null;
  private readonly eyeBaseScale = new THREE.Vector3(1, 1, 1);
  private readonly desiredPosition = new THREE.Vector3();
  private readonly followDelta = new THREE.Vector3();
  private model: ModelInstance | null = null;
  private pulse = 0;

  constructor(scene: THREE.Scene) {
    this.createProceduralFallback();
    scene.add(this.object);
    void this.loadHeroModel();
  }

  signal() {
    this.pulse = 1;
  }

  update(target: THREE.Vector3, elapsed: number, dt: number) {
    this.desiredPosition.set(
      target.x - 1.25 + Math.sin(elapsed * 1.2) * 0.08,
      target.y + 2.2 + Math.sin(elapsed * 2.1) * 0.12 + Math.sin(elapsed * 0.57 + 0.8) * 0.035,
      target.z + 0.15,
    );

    this.followDelta.copy(this.desiredPosition).sub(this.object.position);
    const followBlend = 1 - Math.exp(-dt * 7.5);
    this.object.position.lerp(this.desiredPosition, followBlend);

    const orientationBlend = 1 - Math.exp(-dt * 6.2);
    const bank = THREE.MathUtils.clamp(-this.followDelta.x * 0.08, -0.13, 0.13);
    const pitch = THREE.MathUtils.clamp(this.followDelta.z * 0.025, -0.06, 0.06);
    const yaw = Math.sin(elapsed * 0.45) * 0.16
      + THREE.MathUtils.clamp(this.followDelta.x * 0.045, -0.08, 0.08);
    const rollDrift = Math.sin(elapsed * 0.72) * 0.022;

    this.object.rotation.x = THREE.MathUtils.lerp(this.object.rotation.x, pitch, orientationBlend);
    this.object.rotation.y = THREE.MathUtils.lerp(this.object.rotation.y, yaw, orientationBlend);
    this.object.rotation.z = THREE.MathUtils.lerp(this.object.rotation.z, bank + rollDrift, orientationBlend);
    audioSystem.setSoykaPosition(this.object.position);

    if (!this.eye) return;
    const pulseWave = this.pulse > 0 ? Math.sin((1 - this.pulse) * Math.PI) : 0;
    const pulseScale = 1 + this.pulse * 0.36 + pulseWave * 0.12;
    this.eye.scale.copy(this.eyeBaseScale).multiplyScalar(pulseScale);
    this.pulse = Math.max(0, this.pulse - dt * 2.5);
  }

  private createProceduralFallback() {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x2f363b, roughness: 0.45, metalness: 0.8 }),
    );
    body.castShadow = true;
    this.object.add(body);

    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0x4fc3ff }),
    );
    eye.position.z = -0.46;
    this.object.add(eye);
    this.eye = eye;
    this.eyeBaseScale.copy(eye.scale);
  }

  private async loadHeroModel() {
    const model = await this.assets.instantiate(SOYKA_MODEL_URL, {}, 'СОЙКА');
    if (model.fallback) {
      this.assets.disposeInstance(model);
      return;
    }

    this.disposeProceduralFallback();
    this.model = model;
    this.object.add(model.root);

    const eye = model.root.getObjectByName('eye');
    this.eye = eye ?? null;
    if (this.eye) this.eyeBaseScale.copy(this.eye.scale);
  }

  private disposeProceduralFallback() {
    for (const child of [...this.object.children]) {
      child.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      this.object.remove(child);
    }
    this.eye = null;
  }
}
