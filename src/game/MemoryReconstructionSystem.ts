import * as THREE from 'three';

export class MemoryReconstructionSystem {
  readonly anchorPosition: THREE.Vector3;
  private readonly group = new THREE.Group();
  private readonly ghostMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly warmLight = new THREE.PointLight(0xffb267, 0, 18, 2);
  private readonly bracelet: THREE.Mesh;
  private readonly coldBackground: THREE.Color;
  private readonly coldFog: THREE.Color | null;
  private readonly warmBackground = new THREE.Color(0x2a1c16);
  private readonly warmFog = new THREE.Color(0x5a3a26);
  private elapsed = 0;
  private duration = 0;
  private completion?: () => void;
  private _active = false;

  constructor(private readonly scene: THREE.Scene, center: THREE.Vector3) {
    this.anchorPosition = center.clone();
    this.group.position.copy(center);
    this.group.visible = false;
    this.scene.add(this.group);

    this.bracelet = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.055, 8, 20),
      new THREE.MeshStandardMaterial({
        color: 0x8f241f,
        roughness: 0.48,
        metalness: 0.08,
        emissive: 0x2a0806,
      }),
    );
    this.bracelet.position.copy(center).add(new THREE.Vector3(0, 0.08, 0));
    this.bracelet.rotation.x = Math.PI / 2;
    this.bracelet.rotation.z = 0.45;
    this.bracelet.visible = false;
    this.scene.add(this.bracelet);

    this.warmLight.position.copy(center).add(new THREE.Vector3(0, 2.8, 0));
    this.scene.add(this.warmLight);

    this.coldBackground = scene.background instanceof THREE.Color
      ? scene.background.clone()
      : new THREE.Color(0x07111b);
    this.coldFog = scene.fog instanceof THREE.FogExp2 || scene.fog instanceof THREE.Fog
      ? scene.fog.color.clone()
      : null;

    this.addGhost(-2.4, -1.2, 1.65, 0.98);
    this.addGhost(1.8, -0.6, 1.8, 1.04);
    this.addGhost(0.3, 2.2, 1.2, 0.8);
    this.addGhost(3.0, 1.6, 1.55, 0.9);

    const memoryFloor = new THREE.Mesh(
      new THREE.CircleGeometry(5.5, 40),
      new THREE.MeshBasicMaterial({
        color: 0xffb06a,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    memoryFloor.rotation.x = -Math.PI / 2;
    memoryFloor.position.y = 0.025;
    this.group.add(memoryFloor);
    this.ghostMaterials.push(memoryFloor.material as THREE.MeshBasicMaterial);
  }

  get active() {
    return this._active;
  }

  setAnchorAvailable(available: boolean) {
    this.bracelet.visible = available && !this._active;
  }

  start(duration = 8, onComplete?: () => void) {
    if (this._active) return false;
    this._active = true;
    this.elapsed = 0;
    this.duration = Math.max(2, duration);
    this.completion = onComplete;
    this.group.visible = true;
    this.bracelet.visible = false;
    return true;
  }

  update(dt: number) {
    if (!this._active) return;

    this.elapsed += dt;
    const normalized = THREE.MathUtils.clamp(this.elapsed / this.duration, 0, 1);
    const fadeIn = THREE.MathUtils.smoothstep(normalized, 0, 0.2);
    const fadeOut = 1 - THREE.MathUtils.smoothstep(normalized, 0.72, 1);
    const strength = Math.min(fadeIn, fadeOut);
    const pulse = 0.86 + Math.sin(this.elapsed * 11.5) * 0.06;
    const visualStrength = THREE.MathUtils.clamp(strength * pulse, 0, 1);

    for (const material of this.ghostMaterials) {
      material.opacity = visualStrength * 0.38;
    }

    this.group.children.forEach((child, index) => {
      if (index < 4) child.position.y += Math.sin(this.elapsed * 2.2 + index) * 0.0008;
    });

    this.warmLight.intensity = visualStrength * 9;

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.coldBackground).lerp(this.warmBackground, visualStrength * 0.38);
    }
    if (this.coldFog && (this.scene.fog instanceof THREE.FogExp2 || this.scene.fog instanceof THREE.Fog)) {
      this.scene.fog.color.copy(this.coldFog).lerp(this.warmFog, visualStrength * 0.42);
    }

    if (normalized >= 1) this.finish();
  }

  private finish() {
    this._active = false;
    this.group.visible = false;
    this.warmLight.intensity = 0;
    if (this.scene.background instanceof THREE.Color) this.scene.background.copy(this.coldBackground);
    if (this.coldFog && (this.scene.fog instanceof THREE.FogExp2 || this.scene.fog instanceof THREE.Fog)) {
      this.scene.fog.color.copy(this.coldFog);
    }
    const completion = this.completion;
    this.completion = undefined;
    completion?.();
  }

  private addGhost(x: number, z: number, height: number, scale: number) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xffd09b,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ghost = new THREE.Group();
    ghost.position.set(x, 0, z);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28 * scale, height * 0.55, 4, 8), material);
    body.position.y = height * 0.58;
    ghost.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22 * scale, 10, 8), material);
    head.position.y = height * 1.02;
    ghost.add(head);

    this.group.add(ghost);
    this.ghostMaterials.push(material);
  }
}
