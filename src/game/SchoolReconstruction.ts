import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { DialogueSystem } from './DialogueSystem';
import type { PlayerController } from './PlayerController';

interface SchoolEchoDefinition {
  id: string;
  localPosition: THREE.Vector3;
  speaker: string;
  text: string;
  radius: number;
  youngLev?: boolean;
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

    this.buildPresentSchool();
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
    const blend = 1 - Math.exp(-dt * 2.6);
    this.strength = THREE.MathUtils.lerp(this.strength, this.targetStrength, blend);
    this.memoryLight.intensity = this.strength * 10;

    for (const child of this.memoryRoot.children) {
      child.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const material = object.material;
        if (material instanceof THREE.MeshBasicMaterial && material.transparent) {
          const baseOpacity = material.userData.baseOpacity ?? 0.24;
          material.opacity = Math.min(baseOpacity, this.strength * baseOpacity);
        }
      });
    }

    if (!this.active || this.strength < 0.55) return;

    const localPlayer = player.position.clone().sub(this.entrance);
    let heardCount = 0;

    for (const echo of this.echoes) {
      if (echo.heard) {
        heardCount += 1;
        echo.material.opacity = 0.08;
        continue;
      }

      const distance = localPlayer.distanceTo(echo.localPosition);
      const proximity = THREE.MathUtils.clamp(1 - distance / Math.max(0.01, echo.radius * 1.8), 0, 1);
      echo.material.opacity = (0.18 + proximity * 0.38) * this.strength;

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

  private buildPresentSchool() {
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x1b2329, roughness: 0.88, metalness: 0.08 });
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x252c31, roughness: 0.92 });

    // Physical approach from the end of the drawbridge to the school entrance.
    this.addStaticBox(0, 7.4, 7.2, 0.45, 15.2, 0x202b31, 0);
    for (const side of [-3.55, 3.55]) {
      this.addStaticBox(side, 7.4, 0.14, 1.1, 15.2, 0x26343b, 0.45);
    }

    const floor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.45, 34), floorMaterial);
    floor.position.set(0, 0.225, -17);
    floor.receiveShadow = true;
    this.root.add(floor);
    this.addCollider(0, -17, 11, 0.45, 34, 0);

    for (const side of [-5.35, 5.35]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.4, 34), wallMaterial);
      wall.position.set(side, 2.2, -17);
      wall.castShadow = true;
      this.root.add(wall);
      this.addCollider(side, -17, 0.3, 4.4, 34, 0);
    }

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(11, 4.4, 0.3), wallMaterial);
    backWall.position.set(0, 2.2, -33.8);
    this.root.add(backWall);
    this.addCollider(0, -33.8, 11, 4.4, 0.3, 0);

    for (let z = -5; z >= -29; z -= 6) {
      const lockerLeft = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 2.3, 2.8),
        new THREE.MeshStandardMaterial({ color: 0x32404a, roughness: 0.74, metalness: 0.28 }),
      );
      lockerLeft.position.set(-4.45, 1.15, z);
      this.root.add(lockerLeft);

      const lockerRight = lockerLeft.clone();
      lockerRight.position.x = 4.45;
      this.root.add(lockerRight);
    }

    const node = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 1.35, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x4a3d31, emissive: 0x23140a, roughness: 0.55, metalness: 0.25 }),
    );
    node.position.set(0, 0.7, -13);
    this.root.add(node);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(5.4, 0.8, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x2a343a, roughness: 0.82 }),
    );
    sign.position.set(0, 3.45, -0.35);
    this.root.add(sign);
  }

  private buildMemorySchool() {
    const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xffc88d, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    glowMaterial.userData.baseOpacity = 0.22;

    for (let z = -3; z >= -31; z -= 4) {
      const stripMaterial = glowMaterial.clone();
      stripMaterial.userData.baseOpacity = 0.12;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(9.3, 0.035, 0.06), stripMaterial);
      strip.position.set(0, 0.49, z);
      this.memoryRoot.add(strip);
    }

    const definitions: SchoolEchoDefinition[] = [
      { id: 'teacher', localPosition: new THREE.Vector3(-2.8, 0.45, -7), speaker: 'УЧИТЕЛЬНИЦА', text: 'Ника, твой отец опять заберёт тебя позже?', radius: 2.4 },
      { id: 'student', localPosition: new THREE.Vector3(2.6, 0.45, -12), speaker: 'ДЕВОЧКА', text: 'Твой папа правда работает на дамбе?', radius: 2.25 },
      { id: 'young-lev', localPosition: new THREE.Vector3(-0.8, 0.45, -20), speaker: 'МОЛОДОЙ ЛЕВ', text: 'Пять минут. Потом я весь твой, обещаю.', radius: 2.5, youngLev: true },
      { id: 'announcement', localPosition: new THREE.Vector3(3.0, 0.45, -27), speaker: 'ГРОМКОГОВОРИТЕЛЬ', text: 'Учебная эвакуация перенесена на пятницу, семнадцать ноль-ноль.', radius: 2.6 },
    ];

    for (const definition of definitions) {
      const material = new THREE.MeshBasicMaterial({
        color: definition.youngLev ? 0xffe0b8 : 0xffd4a3,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      material.userData.baseOpacity = definition.youngLev ? 0.52 : 0.38;
      const group = new THREE.Group();
      group.position.copy(definition.localPosition);

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(definition.youngLev ? 0.34 : 0.31, 0.95, 4, 8), material);
      body.position.y = 0.62;
      group.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(definition.youngLev ? 0.25 : 0.23, 10, 8), material);
      head.position.y = 1.39;
      group.add(head);

      if (definition.youngLev) {
        const shoulderBag = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.18), material);
        shoulderBag.position.set(0.28, 0.74, 0.22);
        group.add(shoulderBag);
      }

      this.memoryRoot.add(group);
      this.echoes.push({ ...definition, material, heard: false, armed: false });
    }
  }

  private addStaticBox(localX: number, localZ: number, sx: number, sy: number, sz: number, color: number, y: number) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz),
      new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.2 }),
    );
    mesh.position.set(localX, y + sy / 2, localZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.root.add(mesh);
    this.addCollider(localX, localZ, sx, sy, sz, y);
  }

  private addCollider(localX: number, localZ: number, sx: number, sy: number, sz: number, y: number) {
    const globalX = this.entrance.x + localX;
    const globalZ = this.entrance.z + localZ;
    const body = this.physics.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(globalX, y + sy / 2, globalZ),
    );
    this.physics.createCollider(RAPIER.ColliderDesc.cuboid(sx / 2, sy / 2, sz / 2), body);
  }
}
