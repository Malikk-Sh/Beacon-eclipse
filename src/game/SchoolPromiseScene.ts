import * as THREE from 'three';
import type { DialogueSystem } from './DialogueSystem';

export class SchoolPromiseScene {
  readonly anchorPosition: THREE.Vector3;
  readonly root = new THREE.Group();

  private played = false;

  constructor(
    parent: THREE.Group,
    private readonly dialogue: DialogueSystem,
    origin: THREE.Vector3,
  ) {
    const localPosition = new THREE.Vector3(0, 0, -30.5);
    this.anchorPosition = origin.clone().add(localPosition);
    this.root.position.copy(localPosition);
    this.root.visible = false;
    parent.add(this.root);

    this.buildVignette();
  }

  play(onComplete: () => void): boolean {
    if (this.played || this.dialogue.isBusy) return false;
    this.played = true;
    this.root.visible = true;

    this.dialogue.play([
      { kind: 'line', speaker: 'ДЕВОЧКА', text: 'Ты опять уйдёшь, когда позвонят?', duration: 2.8 },
      { kind: 'line', speaker: 'МОЛОДОЙ ЛЕВ', text: 'Нет. Завтра после школы — только мы.', duration: 3.0 },
      { kind: 'line', speaker: 'ДЕВОЧКА', text: 'Даже если дамба?', duration: 2.4 },
      { kind: 'line', speaker: 'МОЛОДОЙ ЛЕВ', text: 'Даже если дамба. Обещаю.', duration: 2.8 },
      { kind: 'line', speaker: 'НИКА', text: '...Я знаю этот коридор.', duration: 2.5 },
      { kind: 'line', speaker: 'ЛЕВ', text: 'Ника?', duration: 1.7 },
      { kind: 'line', speaker: 'НИКА', text: 'И эту фразу. Я не понимаю почему.', duration: 3.0 },
      { kind: 'line', speaker: 'МАРА', text: 'Лев, хватит. Выходи из слоя.', duration: 2.6 },
      { kind: 'line', speaker: 'ЛЕВ', text: 'Мара, кто она?', duration: 2.2 },
      { kind: 'line', speaker: 'МАРА', text: 'Реконструкция нестабильна. Я отключаю её.', duration: 3.0 },
    ], onComplete);
    return true;
  }

  restore(seen: boolean): void {
    this.played = seen;
    this.root.visible = false;
  }

  private buildVignette(): void {
    const levMaterial = this.memoryMaterial(0xffdfb7, 0.52, false, 0.2);
    const girlMaterial = this.memoryMaterial(0xf2b77f, 0.34, true, 2.6);
    const traceMaterial = this.memoryMaterial(0xffc78f, 0.18, true, 4.4);

    const floorTrace = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.2, 0.025, 24), traceMaterial);
    floorTrace.position.y = 0.51;
    this.root.add(floorTrace);

    const lev = new THREE.Group();
    lev.position.set(-0.88, 0.46, 0);
    lev.rotation.y = -Math.PI / 2;
    this.buildHuman(lev, levMaterial, true, false);
    this.root.add(lev);

    const girl = new THREE.Group();
    girl.position.set(0.82, 0.46, 0.02);
    girl.rotation.y = Math.PI / 2;
    this.buildHuman(girl, girlMaterial, false, true);
    this.root.add(girl);

    const frameGeometry = new THREE.BoxGeometry(0.045, 2.55, 0.07);
    const frameMaterial = this.memoryMaterial(0xffd29e, 0.2, true, 1.1);
    const frame = new THREE.InstancedMesh(frameGeometry, frameMaterial, 4);
    const matrix = new THREE.Matrix4();
    const placements = [
      [-2.05, 1.7, -0.82], [2.05, 1.7, -0.82],
      [-2.05, 1.7, 0.82], [2.05, 1.7, 0.82],
    ] as const;
    placements.forEach(([x, y, z], index) => {
      matrix.makeTranslation(x, y, z);
      frame.setMatrixAt(index, matrix);
    });
    this.root.add(frame);

    const fragments = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.09, 0.07, 0.07),
      girlMaterial,
      8,
    );
    const fragmentOffsets = [
      [0.58, 1.86, 0.08], [0.72, 1.7, -0.12], [0.94, 1.91, 0.14], [1.08, 1.72, -0.04],
      [0.66, 1.58, 0.15], [0.88, 1.54, -0.15], [1.04, 1.6, 0.11], [0.78, 1.99, -0.08],
    ] as const;
    fragmentOffsets.forEach(([x, y, z], index) => {
      matrix.makeTranslation(x, y, z);
      fragments.setMatrixAt(index, matrix);
    });
    this.root.add(fragments);
  }

  private buildHuman(
    group: THREE.Group,
    material: THREE.MeshBasicMaterial,
    adult: boolean,
    corruptedHead: boolean,
  ): void {
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(adult ? 0.34 : 0.25, adult ? 0.4 : 0.3, adult ? 0.96 : 0.78, 8),
      material,
    );
    torso.position.y = adult ? 1.0 : 0.86;
    group.add(torso);

    const limbLength = adult ? 0.72 : 0.58;
    const limb = new THREE.CylinderGeometry(adult ? 0.08 : 0.065, adult ? 0.09 : 0.075, limbLength, 6);
    const legY = adult ? 0.34 : 0.3;
    for (const x of adult ? [-0.15, 0.15] : [-0.12, 0.12]) {
      const leg = new THREE.Mesh(limb, material);
      leg.position.set(x, legY, 0);
      group.add(leg);
    }

    const armY = adult ? 0.94 : 0.82;
    const armX = adult ? 0.36 : 0.29;
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(limb, material);
      arm.position.set(side * armX, armY, 0);
      arm.rotation.z = side * 0.2;
      group.add(arm);
    }

    if (!corruptedHead) {
      const head = new THREE.Mesh(new THREE.SphereGeometry(adult ? 0.23 : 0.19, 10, 8), material);
      head.position.y = adult ? 1.68 : 1.44;
      group.add(head);
    }

    if (adult) {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.6, 0.16), material);
      bag.position.set(0.29, 0.85, 0.2);
      bag.rotation.z = -0.08;
      group.add(bag);
    }
  }

  private memoryMaterial(
    color: number,
    baseOpacity: number,
    flicker: boolean,
    phase: number,
  ): THREE.MeshBasicMaterial {
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
