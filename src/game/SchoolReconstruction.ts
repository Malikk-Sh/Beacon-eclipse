import * as THREE from 'three';
import type { DialogueSystem } from './DialogueSystem';
import type { PlayerController } from './PlayerController';

interface SchoolEchoDefinition {
  id: string;
  localPosition: THREE.Vector3;
  speaker: string;
  text: string;
  radius: number;
}

interface SchoolEchoRuntime extends SchoolEchoDefinition {
  group: THREE.Group;
  material: THREE.MeshBasicMaterial;
  heard: boolean;
  armed: boolean;
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

  constructor(private readonly scene: THREE.Scene, private readonly dialogue: DialogueSystem) {
    this.root.position.copy(this.entrance);
    this.memoryRoot.position.copy(this.entrance);
    this.scene.add(this.root, this.memoryRoot);
    this.memoryRoot.visible = false;

    this.buildPresentSchool();
    this.buildMemorySchool();

    this.memoryLight.position.copy(this.entrance).add(new THREE.Vector3(0, 3.4, -13));
    this.scene.add(this.memoryLight);
  }

  start() {
    if (this.active) return false;
    this.active = true;
    this.targetStrength = 1;
    this.memoryRoot.visible = true;
    this.dialogue.play([
      { kind: 'line', speaker: 'СОЙКА', text: 'Архивный слой найден.', duration: 2.1 },
      { kind: 'line', speaker: 'МАРА', text: 'Это не запись. Ты можешь двигаться внутри реконструкции.', duration: 3.2 },
      { kind: 'line', speaker: 'НИКА', text: 'Здесь... кажется, я уже была.', duration: 2.8 },
    ]);
    return true;
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
        const accepted = this.dialogue.say(echo.speaker, echo.text, 3.1);
        if (accepted) {
          window.setTimeout(() => {
            if (player.position.distanceTo(startedAt) < echo.radius * 1.45) echo.heard = true;
            echo.armed = false;
          }, 2500);
        } else {
          echo.armed = false;
        }
      } else if (distance >= echo.radius * 1.25) {
        echo.armed = false;
      }
    }

    if (!this.completionFired && heardCount >= 3) {
      this.completionFired = true;
      this.dialogue.play([
        { kind: 'line', speaker: 'ЛЕВ', text: 'Я знаю это место.', duration: 2.1 },
        { kind: 'line', speaker: 'МАРА', text: 'Лев...', duration: 2.1 },
        { kind: 'line', speaker: 'НИКА', text: 'Тогда почему ты звучишь так, будто боишься вспомнить?', duration: 3.2 },
      ]);
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

    const floor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.18, 34), floorMaterial);
    floor.position.set(0, 0.09, -17);
    this.root.add(floor);

    for (const side of [-5.35, 5.35]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.4, 34), wallMaterial);
      wall.position.set(side, 2.2, -17);
      this.root.add(wall);
    }

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(11, 4.4, 0.3), wallMaterial);
    backWall.position.set(0, 2.2, -33.8);
    this.root.add(backWall);

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
  }

  private buildMemorySchool() {
    const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xffc88d, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    glowMaterial.userData.baseOpacity = 0.22;

    for (let z = -3; z >= -31; z -= 4) {
      const stripMaterial = glowMaterial.clone();
      stripMaterial.userData.baseOpacity = 0.12;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(9.3, 0.035, 0.06), stripMaterial);
      strip.position.set(0, 0.055, z);
      this.memoryRoot.add(strip);
    }

    const definitions: SchoolEchoDefinition[] = [
      { id: 'teacher', localPosition: new THREE.Vector3(-2.8, 0, -7), speaker: 'УЧИТЕЛЬНИЦА', text: 'Ника, твой отец опять заберёт тебя позже?', radius: 2.4 },
      { id: 'student', localPosition: new THREE.Vector3(2.6, 0, -12), speaker: 'ДЕВОЧКА', text: 'Твой папа правда работает на дамбе?', radius: 2.25 },
      { id: 'young-lev', localPosition: new THREE.Vector3(-0.8, 0, -20), speaker: 'МОЛОДОЙ ЛЕВ', text: 'Пять минут. Потом я весь твой, обещаю.', radius: 2.5 },
      { id: 'announcement', localPosition: new THREE.Vector3(3.0, 0, -27), speaker: 'ГРОМКОГОВОРИТЕЛЬ', text: 'Учебная эвакуация перенесена на пятницу, семнадцать ноль-ноль.', radius: 2.6 },
    ];

    for (const definition of definitions) {
      const material = new THREE.MeshBasicMaterial({ color: 0xffd4a3, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      material.userData.baseOpacity = 0.38;
      const group = new THREE.Group();
      group.position.copy(definition.localPosition);

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 0.95, 4, 8), material);
      body.position.y = 1.05;
      group.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), material);
      head.position.y = 1.82;
      group.add(head);

      this.memoryRoot.add(group);
      this.echoes.push({ ...definition, group, material, heard: false, armed: false });
    }
  }
}
