import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { SchoolArea } from '../world/areas/SchoolArea';
import type { DialogueSystem } from './DialogueSystem';
import type { PlayerController } from './PlayerController';

type MemoryCorruption = 'head-gap' | 'offset-arm' | 'fragmented';

interface SchoolEchoDefinition {
  id: string;
  localPosition: THREE.Vector3;
  speaker: string;
  text: string;
  radius: number;
  youngLev?: boolean;
  corruption?: MemoryCorruption;
}

interface SchoolEchoRuntime extends SchoolEchoDefinition {
  material: THREE.MeshBasicMaterial;
  heard: boolean;
  armed: boolean;
}

interface SchoolReconstructionCallbacks {
  onEchoHeard?: (id: string) => void;
  onComplete?: () => void;
}

export class SchoolReconstruction {
  readonly entrance = new THREE.Vector3(0, 0, -60);
  readonly reconstructionNode = new THREE.Vector3(0, 0, -73);

  private readonly root = new THREE.Group();
  private readonly memoryRoot = new THREE.Group();
  private readonly echoes: SchoolEchoRuntime[] = [];
  private readonly memoryLight = new THREE.PointLight(0xffbd75, 0, 28, 2);
  private active = false;
  private strength = 0;
  private targetStrength = 0;
  private completionFired = false;
  private memoryElapsed = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly physics: RAPIER.World,
    private readonly dialogue: DialogueSystem,
    private readonly callbacks: SchoolReconstructionCallbacks = {},
  ) {
    this.root.position.copy(this.entrance);
    this.memoryRoot.position.copy(this.entrance);
    this.scene.add(this.root, this.memoryRoot);
    this.memoryRoot.visible = false;

    new SchoolArea(this.root, this.physics, this.entrance);
    this.buildMemorySchool();

    this.memoryLight.position.copy(this.entrance).add(new THREE.Vector3(0, 3.4, -13));
    this.scene.add(this.memoryLight);
  }

  start(silent = false) {
    if (this.active) return false;
    this.active = true;
    this.targetStrength = 1;
    this.memoryRoot.visible = true;

    if (!silent) {
      this.dialogue.play([
        { kind: 'line', speaker: 'СОЙКА', text: 'Архивный слой найден.', duration: 2.1 },
        { kind: 'line', speaker: 'МАРА', text: 'Это не запись. Ты можешь двигаться внутри реконструкции.', duration: 3.2 },
        { kind: 'line', speaker: 'НИКА', text: 'Здесь... кажется, я уже была.', duration: 2.8 },
      ]);
    }
    return true;
  }

  restore(active: boolean, heardIds: string[], completed: boolean) {
    for (const echo of this.echoes) echo.heard = heardIds.includes(echo.id);
    this.completionFired = completed;
    if (active) {
      this.active = true;
      this.strength = 1;
      this.targetStrength = 1;
      this.memoryRoot.visible = true;
      this.memoryLight.intensity = 10;
    }
  }

  update(dt: number, player: PlayerController) {
    this.memoryElapsed += dt;
    const blend = 1 - Math.exp(-dt * 2.6);
    this.strength = THREE.MathUtils.lerp(this.strength, this.targetStrength, blend);
    this.memoryLight.intensity = this.strength * 10;

    this.memoryRoot.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const material = object.material;
      if (!(material instanceof THREE.MeshBasicMaterial) || !material.transparent) return;
      if (material.userData.echoMaterial) return;

      const baseOpacity = material.userData.baseOpacity ?? 0.2;
      const phase = material.userData.flickerPhase ?? 0;
      const flicker = material.userData.flicker
        ? 0.86 + Math.sin(this.memoryElapsed * 4.1 + phase) * 0.14
        : 1;
      material.opacity = Math.min(baseOpacity, this.strength * baseOpacity * flicker);
    });

    if (!this.active || this.strength < 0.55) return;

    const localPlayer = player.position.clone().sub(this.entrance);
    let heardCount = 0;

    for (const echo of this.echoes) {
      const echoFlicker = 0.91 + Math.sin(this.memoryElapsed * 5.3 + echo.id.length * 0.7) * 0.09;
      if (echo.heard) {
        heardCount += 1;
        echo.material.opacity = 0.065 * echoFlicker;
        continue;
      }

      const distance = localPlayer.distanceTo(echo.localPosition);
      const proximity = THREE.MathUtils.clamp(1 - distance / Math.max(0.01, echo.radius * 1.8), 0, 1);
      echo.material.opacity = (0.16 + proximity * 0.34) * this.strength * echoFlicker;

      if (distance < echo.radius && !echo.armed && !this.dialogue.isBusy) {
        echo.armed = true;
        const startedAt = player.position.clone();
        const accepted = this.dialogue.say(echo.speaker, echo.text, echo.youngLev ? 3.8 : 3.1);
        if (accepted) {
          window.setTimeout(() => {
            if (player.position.distanceTo(startedAt) < echo.radius * 1.45 && !echo.heard) {
              echo.heard = true;
              this.callbacks.onEchoHeard?.(echo.id);
            }
            echo.armed = false;
          }, 2500);
        } else {
          echo.armed = false;
        }
      } else if (distance >= echo.radius * 1.25) {
        echo.armed = false;
      }
    }

    if (!this.completionFired && heardCount >= 3 && !this.dialogue.isBusy) {
      this.completionFired = true;
      this.dialogue.play([
        { kind: 'line', speaker: 'ЛЕВ', text: 'Я знаю это место.', duration: 2.1 },
        { kind: 'line', speaker: 'МАРА', text: 'Лев...', duration: 2.1 },
        { kind: 'line', speaker: 'НИКА', text: 'Тогда почему ты звучишь так, будто боишься вспомнить?', duration: 3.2 },
      ], () => this.callbacks.onComplete?.());
    }
  }

  get isActive() {
    return this.active;
  }

  get heardEchoCount() {
    return this.echoes.filter((echo) => echo.heard).length;
  }

  private buildMemorySchool() {
    this.addMemoryArchitecture();

    const definitions: SchoolEchoDefinition[] = [
      {
        id: 'teacher',
        localPosition: new THREE.Vector3(-2.8, 0.45, -7),
        speaker: 'УЧИТЕЛЬНИЦА',
        text: 'Ника, твой отец опять заберёт тебя позже?',
        radius: 2.4,
        corruption: 'fragmented',
      },
      {
        id: 'student',
        localPosition: new THREE.Vector3(2.6, 0.45, -12),
        speaker: 'ДЕВОЧКА',
        text: 'Твой папа правда работает на дамбе?',
        radius: 2.25,
        corruption: 'head-gap',
      },
      {
        id: 'young-lev',
        localPosition: new THREE.Vector3(-0.8, 0.45, -20),
        speaker: 'МОЛОДОЙ ЛЕВ',
        text: 'Пять минут. Потом я весь твой, обещаю.',
        radius: 2.5,
        youngLev: true,
      },
      {
        id: 'announcement',
        localPosition: new THREE.Vector3(3.0, 0.45, -27),
        speaker: 'ГРОМКОГОВОРИТЕЛЬ',
        text: 'Учебная эвакуация перенесена на пятницу, семнадцать ноль-ноль.',
        radius: 2.6,
        corruption: 'offset-arm',
      },
    ];

    for (const definition of definitions) {
      const material = new THREE.MeshBasicMaterial({
        color: definition.youngLev ? 0xffdfb7 : 0xf6bf86,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      material.userData.baseOpacity = definition.youngLev ? 0.48 : 0.34;
      material.userData.echoMaterial = true;

      const group = new THREE.Group();
      group.position.copy(definition.localPosition);
      this.buildHumanEcho(group, material, definition);
      this.memoryRoot.add(group);
      this.echoes.push({ ...definition, material, heard: false, armed: false });
    }
  }

  private addMemoryArchitecture(): void {
    const floorMaterial = this.memoryMaterial(0xe09a5d, 0.07, false, 0);
    const memoryFloor = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.025, 31.8), floorMaterial);
    memoryFloor.position.set(0, 0.475, -17);
    this.memoryRoot.add(memoryFloor);

    const stripMaterial = this.memoryMaterial(0xffc88d, 0.13, true, 0.4);
    const stripGeometry = new THREE.BoxGeometry(9.2, 0.03, 0.055);
    const strips = new THREE.InstancedMesh(stripGeometry, stripMaterial, 8);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 8; i++) {
      matrix.makeTranslation(0, 0.5, -3 - i * 4.05);
      strips.setMatrixAt(i, matrix);
    }
    this.memoryRoot.add(strips);

    const frameMaterial = this.memoryMaterial(0xffd4a3, 0.2, true, 1.3);
    const verticalGeometry = new THREE.BoxGeometry(0.045, 2.65, 0.12);
    const verticals = new THREE.InstancedMesh(verticalGeometry, frameMaterial, 12);
    let index = 0;
    for (const x of [-5.0, 5.0]) {
      for (const z of [-9, -18, -27]) {
        matrix.makeTranslation(x, 1.55, z - 0.96);
        verticals.setMatrixAt(index++, matrix);
        matrix.makeTranslation(x, 1.55, z + 0.96);
        verticals.setMatrixAt(index++, matrix);
      }
    }
    this.memoryRoot.add(verticals);

    const headerGeometry = new THREE.BoxGeometry(0.05, 0.08, 1.95);
    const headers = new THREE.InstancedMesh(headerGeometry, frameMaterial, 6);
    index = 0;
    for (const x of [-5.0, 5.0]) {
      for (const z of [-9, -18, -27]) {
        matrix.makeTranslation(x, 2.86, z);
        headers.setMatrixAt(index++, matrix);
      }
    }
    this.memoryRoot.add(headers);

    const lightMaterial = this.memoryMaterial(0xffe1b6, 0.3, true, 2.7);
    const lightGeometry = new THREE.BoxGeometry(0.92, 0.035, 0.18);
    const lights = new THREE.InstancedMesh(lightGeometry, lightMaterial, 7);
    for (let i = 0; i < 7; i++) {
      matrix.makeTranslation(i % 2 ? 0.65 : -0.65, 3.74, -3.2 - i * 4.65);
      lights.setMatrixAt(i, matrix);
    }
    this.memoryRoot.add(lights);

    const signMaterial = this.memoryMaterial(0xffcf96, 0.24, true, 4.2);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.62, 0.035), signMaterial);
    sign.position.set(0, 3.36, -0.58);
    this.memoryRoot.add(sign);

    const fragmentMaterial = this.memoryMaterial(0xe89663, 0.15, true, 5.1);
    const fragmentGeometry = new THREE.BoxGeometry(0.18, 0.05, 0.12);
    const fragments = new THREE.InstancedMesh(fragmentGeometry, fragmentMaterial, 18);
    for (let i = 0; i < 18; i++) {
      const x = -3.8 + ((i * 19) % 76) / 10;
      const z = -4 - ((i * 29) % 280) / 10;
      matrix.makeTranslation(x, 0.57 + (i % 3) * 0.06, z);
      fragments.setMatrixAt(i, matrix);
    }
    this.memoryRoot.add(fragments);
  }

  private buildHumanEcho(
    group: THREE.Group,
    material: THREE.MeshBasicMaterial,
    definition: SchoolEchoDefinition,
  ): void {
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(definition.youngLev ? 0.33 : 0.29, definition.youngLev ? 0.4 : 0.35, 0.92, 8),
      material,
    );
    torso.position.y = 0.98;
    group.add(torso);

    const limbGeometry = new THREE.CylinderGeometry(0.075, 0.085, 0.72, 6);
    for (const x of [-0.15, 0.15]) {
      const leg = new THREE.Mesh(limbGeometry, material);
      leg.position.set(x, 0.33, 0);
      group.add(leg);
    }

    const leftArm = new THREE.Mesh(limbGeometry, material);
    leftArm.position.set(-0.36, 0.92, 0);
    leftArm.rotation.z = -0.18;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(limbGeometry, material);
    rightArm.position.set(definition.corruption === 'offset-arm' ? 0.56 : 0.36, 0.92, definition.corruption === 'offset-arm' ? 0.16 : 0);
    rightArm.rotation.z = 0.18;
    group.add(rightArm);

    if (definition.corruption !== 'head-gap') {
      const head = new THREE.Mesh(new THREE.SphereGeometry(definition.youngLev ? 0.24 : 0.22, 10, 8), material);
      head.position.y = 1.66;
      group.add(head);
    } else {
      this.addCorruptionFragments(group, material, 1.66);
    }

    if (definition.youngLev) {
      const shoulderBag = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.16), material);
      shoulderBag.position.set(0.3, 0.84, 0.2);
      shoulderBag.rotation.z = -0.08;
      group.add(shoulderBag);
    }

    if (definition.corruption === 'fragmented') {
      this.addCorruptionFragments(group, material, 0.54);
      const missingSlice = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.055, 0.42), material);
      missingSlice.position.set(0.14, 1.18, 0.15);
      missingSlice.rotation.y = 0.35;
      group.add(missingSlice);
    }
  }

  private addCorruptionFragments(group: THREE.Group, material: THREE.MeshBasicMaterial, y: number): void {
    const fragmentGeometry = new THREE.BoxGeometry(0.11, 0.08, 0.09);
    const offsets = [
      [-0.16, 0.02, 0.02],
      [0.1, 0.12, -0.05],
      [0.2, -0.08, 0.08],
      [-0.04, -0.13, -0.08],
    ] as const;
    for (const [x, dy, z] of offsets) {
      const fragment = new THREE.Mesh(fragmentGeometry, material);
      fragment.position.set(x, y + dy, z);
      group.add(fragment);
    }
  }

  private memoryMaterial(color: number, baseOpacity: number, flicker: boolean, phase: number): THREE.MeshBasicMaterial {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    material.userData.baseOpacity = baseOpacity;
    material.userData.flicker = flicker;
    material.userData.flickerPhase = phase;
    return material;
  }
}
