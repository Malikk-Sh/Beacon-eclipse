import * as THREE from 'three';
import { dispatchMemoryEcho } from './MemoryEchoEvent';
import { PLAYER_SCENE_NAME } from './PlayerController';

export interface MemoryEchoDefinition {
  id: string;
  speaker: string;
  text: string;
  position: THREE.Vector3;
  radius?: number;
  duration?: number;
  height?: number;
  scale?: number;
}

interface MemoryEchoVisual {
  definition: MemoryEchoDefinition;
  group: THREE.Group;
  material: THREE.MeshBasicMaterial;
  ringMaterial: THREE.MeshBasicMaterial;
  basePosition: THREE.Vector3;
}

const DEFAULT_PORT_ECHOES: MemoryEchoDefinition[] = [
  {
    id: 'woman-phone',
    speaker: 'ЖЕНСКИЙ ГОЛОС',
    text: 'Лев, оставь телефон хотя бы на пять минут.',
    position: new THREE.Vector3(-2.4, 0, -1.2),
    radius: 1.9,
    duration: 2.8,
    height: 1.65,
    scale: 0.98,
  },
  {
    id: 'worker-pump',
    speaker: 'РАБОЧИЙ',
    text: 'Арден, западный насос опять клинит.',
    position: new THREE.Vector3(1.8, 0, -0.6),
    radius: 1.85,
    duration: 2.7,
    height: 1.8,
    scale: 1.04,
  },
  {
    id: 'girl-promise',
    speaker: 'ДЕВОЧКА',
    text: 'Ты обещал, что сегодня без работы.',
    position: new THREE.Vector3(0.3, 0, 2.2),
    radius: 1.75,
    duration: 2.6,
    height: 1.2,
    scale: 0.8,
  },
  {
    id: 'port-announcement',
    speaker: 'ГРОМКОГОВОРИТЕЛЬ',
    text: 'Учебная эвакуация северного порта переносится на пятницу.',
    position: new THREE.Vector3(3.0, 0, 1.6),
    radius: 2.05,
    duration: 3.2,
    height: 1.55,
    scale: 0.9,
  },
];

export class MemoryReconstructionSystem {
  readonly anchorPosition: THREE.Vector3;
  private readonly group = new THREE.Group();
  private readonly echoVisuals: MemoryEchoVisual[] = [];
  private readonly floorMaterial: THREE.MeshBasicMaterial;
  private readonly warmLight = new THREE.PointLight(0xffb267, 0, 18, 2);
  private readonly bracelet: THREE.Mesh;
  private readonly coldBackground: THREE.Color;
  private readonly coldFog: THREE.Color | null;
  private readonly warmBackground = new THREE.Color(0x2a1c16);
  private readonly warmFog = new THREE.Color(0x5a3a26);
  private readonly heardEchoes = new Set<string>();
  private readonly tempWorldPosition = new THREE.Vector3();
  private playerObject: THREE.Object3D | null = null;
  private elapsed = 0;
  private duration = 0;
  private completion?: () => void;
  private _active = false;
  private readonly echoActivationDelay = 9.5;

  constructor(
    private readonly scene: THREE.Scene,
    center: THREE.Vector3,
    echoes: MemoryEchoDefinition[] = DEFAULT_PORT_ECHOES,
  ) {
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

    for (const echo of echoes) this.addEcho(echo);

    this.floorMaterial = new THREE.MeshBasicMaterial({
      color: 0xffb06a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const memoryFloor = new THREE.Mesh(new THREE.CircleGeometry(5.5, 40), this.floorMaterial);
    memoryFloor.rotation.x = -Math.PI / 2;
    memoryFloor.position.y = 0.025;
    this.group.add(memoryFloor);
  }

  get active() {
    return this._active;
  }

  get heardEchoCount() {
    return this.heardEchoes.size;
  }

  get echoCount() {
    return this.echoVisuals.length;
  }

  setAnchorAvailable(available: boolean) {
    this.bracelet.visible = available && !this._active;
  }

  start(duration = 8, onComplete?: () => void) {
    if (this._active) return false;
    this._active = true;
    this.elapsed = 0;
    this.duration = Math.max(28, duration);
    this.completion = onComplete;
    this.heardEchoes.clear();
    this.group.visible = true;
    this.bracelet.visible = false;
    return true;
  }

  update(dt: number) {
    if (!this._active) return;

    this.elapsed += dt;
    const normalized = THREE.MathUtils.clamp(this.elapsed / this.duration, 0, 1);
    const fadeIn = THREE.MathUtils.smoothstep(normalized, 0, 0.12);
    const fadeOut = 1 - THREE.MathUtils.smoothstep(normalized, 0.88, 1);
    const strength = Math.min(fadeIn, fadeOut);
    const pulse = 0.88 + Math.sin(this.elapsed * 9.5) * 0.045;
    const visualStrength = THREE.MathUtils.clamp(strength * pulse, 0, 1);

    this.playerObject ??= this.scene.getObjectByName(PLAYER_SCENE_NAME) ?? null;
    this.updateEchoes(visualStrength);

    this.floorMaterial.opacity = visualStrength * 0.16;
    this.warmLight.intensity = visualStrength * 9;

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.coldBackground).lerp(this.warmBackground, visualStrength * 0.38);
    }
    if (this.coldFog && (this.scene.fog instanceof THREE.FogExp2 || this.scene.fog instanceof THREE.Fog)) {
      this.scene.fog.color.copy(this.coldFog).lerp(this.warmFog, visualStrength * 0.42);
    }

    if (normalized >= 1) this.finish();
  }

  private updateEchoes(visualStrength: number) {
    for (let index = 0; index < this.echoVisuals.length; index += 1) {
      const visual = this.echoVisuals[index];
      const heard = this.heardEchoes.has(visual.definition.id);
      const bob = Math.sin(this.elapsed * 2.1 + index * 0.9) * 0.018;
      visual.group.position.set(
        visual.basePosition.x,
        visual.basePosition.y + bob,
        visual.basePosition.z,
      );

      let distance = Number.POSITIVE_INFINITY;
      if (this.playerObject) {
        this.tempWorldPosition.copy(this.anchorPosition).add(visual.basePosition);
        distance = this.playerObject.position.distanceTo(this.tempWorldPosition);
      }

      const radius = visual.definition.radius ?? 1.9;
      const proximity = THREE.MathUtils.clamp(1 - (distance - radius) / 3.2, 0, 1);
      const heardMultiplier = heard ? 0.45 : 1;
      visual.material.opacity = visualStrength * (0.25 + proximity * 0.24) * heardMultiplier;
      visual.ringMaterial.opacity = visualStrength * (heard ? 0.035 : 0.06 + proximity * 0.28);

      if (
        !heard
        && this.elapsed >= this.echoActivationDelay
        && distance <= radius
      ) {
        const accepted = dispatchMemoryEcho({
          id: visual.definition.id,
          speaker: visual.definition.speaker,
          text: visual.definition.text,
          duration: visual.definition.duration ?? 2.8,
        });
        if (accepted) this.heardEchoes.add(visual.definition.id);
      }
    }
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

  private addEcho(definition: MemoryEchoDefinition) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xffd09b,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ghost = new THREE.Group();
    const basePosition = definition.position.clone();
    ghost.position.copy(basePosition);

    const height = definition.height ?? 1.65;
    const scale = definition.scale ?? 1;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28 * scale, height * 0.55, 4, 8), material);
    body.position.y = height * 0.58;
    ghost.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22 * scale, 10, 8), material);
    head.position.y = height * 1.02;
    ghost.add(head);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffc37d,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.62, 28), ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.035;
    ghost.add(ring);

    this.group.add(ghost);
    this.echoVisuals.push({ definition, group: ghost, material, ringMaterial, basePosition });
  }
}
