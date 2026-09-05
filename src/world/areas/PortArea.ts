import * as THREE from 'three';
import { MaterialLibrary } from '../MaterialLibrary';

type BoxSpec = readonly [x: number, z: number, sx: number, sy: number, sz: number];

export class PortArea {
  constructor(scene: THREE.Scene, materials: MaterialLibrary) {
    this.addWarehouse(scene, materials);
    this.addEnergyStation(scene, materials);
    this.addContainers(scene, materials);
    this.addPortFurniture(scene, materials);
  }

  private addWarehouse(scene: THREE.Scene, materials: MaterialLibrary): void {
    const facade = this.box(scene, materials.paintedMetal, 8, 2.85, -8.43, 13.1, 5.45, 0.18);
    facade.receiveShadow = true;

    const roofLip = this.box(scene, materials.darkSteel, 8, 5.64, -13, 13.7, 0.22, 9.5);
    roofLip.castShadow = true;

    const ribGeometry = new THREE.BoxGeometry(0.08, 5.15, 0.18);
    const ribs = new THREE.InstancedMesh(ribGeometry, materials.oldSteel, 19);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 19; i++) {
      matrix.makeTranslation(1.8 + i * 0.69, 2.78, -8.3);
      ribs.setMatrixAt(i, matrix);
    }
    ribs.castShadow = true;
    scene.add(ribs);

    const loadingDoor = this.box(scene, materials.darkSteel, 8, 1.85, -8.18, 4.6, 3.5, 0.14);
    loadingDoor.castShadow = true;
    const doorRibGeometry = new THREE.BoxGeometry(4.25, 0.055, 0.09);
    const doorRibs = new THREE.InstancedMesh(doorRibGeometry, materials.rust, 8);
    for (let i = 0; i < 8; i++) {
      matrix.makeTranslation(8, 0.43 + i * 0.43, -8.07);
      doorRibs.setMatrixAt(i, matrix);
    }
    scene.add(doorRibs);

    const awning = this.box(scene, materials.warningPaint, 8, 4.3, -7.96, 5.6, 0.12, 0.9);
    awning.rotation.x = -0.12;
    awning.castShadow = true;

    const signBack = this.box(scene, materials.darkSteel, 4.4, 4.52, -8.08, 2.4, 0.95, 0.1);
    signBack.castShadow = true;
    this.addWarehouseNumber(scene, materials, 4.4, 4.53, -8.01);

    const ventGeometry = new THREE.BoxGeometry(0.9, 0.42, 0.9);
    const vents = new THREE.InstancedMesh(ventGeometry, materials.oldSteel, 3);
    [4.2, 8, 11.7].forEach((x, index) => {
      matrix.makeTranslation(x, 5.92, -13.6 + (index % 2) * 1.1);
      vents.setMatrixAt(index, matrix);
    });
    vents.castShadow = true;
    scene.add(vents);

    const pipeGeometry = new THREE.CylinderGeometry(0.085, 0.1, 4.2, 8);
    const pipes = new THREE.InstancedMesh(pipeGeometry, materials.rust, 3);
    [12.45, 12.82, 13.19].forEach((x, index) => {
      matrix.makeTranslation(x, 2.15, -8.17);
      pipes.setMatrixAt(index, matrix);
    });
    pipes.castShadow = true;
    scene.add(pipes);

    const radioHousing = this.box(scene, materials.oldSteel, 9.85, 1.35, -7.87, 1.1, 0.72, 0.46);
    radioHousing.castShadow = true;
    const radioGlow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.04), materials.amberSignal);
    radioGlow.position.set(10.13, 1.42, -7.62);
    scene.add(radioGlow);
  }

  private addWarehouseNumber(
    scene: THREE.Scene,
    materials: MaterialLibrary,
    x: number,
    y: number,
    z: number,
  ): void {
    const bars: Array<readonly [number, number, number, number]> = [
      [-0.65, 0, 0.09, 0.66], [-0.25, 0, 0.09, 0.66], [-0.45, 0.3, 0.48, 0.08], [-0.45, -0.3, 0.48, 0.08],
      [0.25, 0.08, 0.09, 0.44], [0.65, 0, 0.09, 0.66], [0.45, 0.08, 0.48, 0.08],
    ];
    for (const [dx, dy, sx, sy] of bars) {
      this.box(scene, materials.fadedPaint, x + dx, y + dy, z, sx, sy, 0.045);
    }
  }

  private addEnergyStation(scene: THREE.Scene, materials: MaterialLibrary): void {
    const frame = this.box(scene, materials.darkSteel, 2, 1.62, -2.94, 5.2, 3.18, 0.16);
    frame.castShadow = true;
    const panel = this.box(scene, materials.paintedMetal, 2, 1.72, -2.82, 3.95, 2.35, 0.12);
    panel.castShadow = true;

    const screen = this.box(scene, materials.glass, 1.55, 1.92, -2.71, 2.05, 0.78, 0.05);
    screen.castShadow = false;

    const slotGeometry = new THREE.BoxGeometry(0.38, 0.09, 0.045);
    const slots = new THREE.InstancedMesh(slotGeometry, materials.amberSignal, 6);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 6; i++) {
      matrix.makeTranslation(0.75 + (i % 3) * 0.48, 1.18 - Math.floor(i / 3) * 0.23, -2.64);
      slots.setMatrixAt(i, matrix);
    }
    scene.add(slots);

    const pipeGeometry = new THREE.CylinderGeometry(0.1, 0.12, 2.8, 8);
    const pipes = new THREE.InstancedMesh(pipeGeometry, materials.oldSteel, 3);
    [4.38, 4.62, 4.86].forEach((x, index) => {
      matrix.makeTranslation(x, 1.4, -4.55 + index * 0.26);
      pipes.setMatrixAt(index, matrix);
    });
    pipes.castShadow = true;
    scene.add(pipes);

    const warningStripeGeometry = new THREE.BoxGeometry(0.5, 0.035, 0.035);
    const stripes = new THREE.InstancedMesh(warningStripeGeometry, materials.lanePaint, 8);
    for (let i = 0; i < 8; i++) {
      matrix.makeTranslation(0.25 + i * 0.5, 0.18, -2.62);
      stripes.setMatrixAt(i, matrix);
    }
    scene.add(stripes);
  }

  private addContainers(scene: THREE.Scene, materials: MaterialLibrary): void {
    const specs: BoxSpec[] = [
      [-9, -7, 5, 2.6, 12],
      ...Array.from({ length: 7 }, (_, i) => [
        -11 + (i % 3) * 4,
        4 + Math.floor(i / 3) * 5,
        3.4,
        2.4,
        4.2,
      ] as const),
    ];

    const ribGeometry = new THREE.BoxGeometry(0.065, 1, 0.11);
    const ribs = new THREE.InstancedMesh(ribGeometry, materials.darkSteel, specs.length * 14);
    const cornerGeometry = new THREE.BoxGeometry(0.12, 1, 0.12);
    const corners = new THREE.InstancedMesh(cornerGeometry, materials.rust, specs.length * 4);
    const matrix = new THREE.Matrix4();
    const identity = new THREE.Quaternion();
    let ribIndex = 0;
    let cornerIndex = 0;

    for (const [x, z, sx, sy, sz] of specs) {
      for (let i = 0; i < 7; i++) {
        const dx = x - sx * 0.42 + (i / 6) * sx * 0.84;
        for (const faceZ of [z - sz / 2 - 0.04, z + sz / 2 + 0.04]) {
          matrix.compose(
            new THREE.Vector3(dx, sy / 2, faceZ),
            identity,
            new THREE.Vector3(1, sy * 0.9, 1),
          );
          ribs.setMatrixAt(ribIndex++, matrix);
        }
      }
      for (const dx of [-sx / 2, sx / 2]) {
        for (const dz of [-sz / 2, sz / 2]) {
          matrix.compose(
            new THREE.Vector3(x + dx, sy / 2, z + dz),
            identity,
            new THREE.Vector3(1, sy, 1),
          );
          corners.setMatrixAt(cornerIndex++, matrix);
        }
      }
    }
    ribs.count = ribIndex;
    corners.count = cornerIndex;
    ribs.castShadow = true;
    corners.castShadow = true;
    scene.add(ribs, corners);
  }

  private addPortFurniture(scene: THREE.Scene, materials: MaterialLibrary): void {
    const bollardGeometry = new THREE.CylinderGeometry(0.18, 0.25, 0.74, 8);
    const bollards = new THREE.InstancedMesh(bollardGeometry, materials.oldSteel, 10);
    const matrix = new THREE.Matrix4();
    const placements = [
      [-7, -2], [-7, -10], [7, -2], [7, -10], [-5, -17],
      [5, -17], [-4.5, -31], [4.5, -31], [-10.5, -19], [10.5, -19],
    ] as const;
    placements.forEach(([x, z], index) => {
      matrix.makeTranslation(x, 0.37, z);
      bollards.setMatrixAt(index, matrix);
    });
    bollards.castShadow = true;
    scene.add(bollards);

    const lampPostGeometry = new THREE.CylinderGeometry(0.045, 0.065, 3.4, 7);
    const lampPosts = new THREE.InstancedMesh(lampPostGeometry, materials.darkSteel, 5);
    const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 0.16, 0.2), materials.amberSignal, 5);
    const lampLocations = [[-6, -4], [6, -5], [-6, -14], [6, -16], [-4, -24]] as const;
    lampLocations.forEach(([x, z], index) => {
      matrix.makeTranslation(x, 1.7, z);
      lampPosts.setMatrixAt(index, matrix);
      matrix.makeTranslation(x, 3.34, z);
      lamps.setMatrixAt(index, matrix);
    });
    lampPosts.castShadow = true;
    scene.add(lampPosts, lamps);
  }

  private box(
    scene: THREE.Scene,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
}
