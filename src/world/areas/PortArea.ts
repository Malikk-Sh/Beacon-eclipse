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

    this.addNikaRadio(scene, materials);
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

  private addNikaRadio(scene: THREE.Scene, materials: MaterialLibrary): void {
    const housing = this.box(scene, materials.oldSteel, 9.85, 1.35, -7.87, 1.1, 0.72, 0.46);
    housing.castShadow = true;
    const front = this.box(scene, materials.darkSteel, 9.85, 1.35, -7.62, 1.0, 0.62, 0.05);
    front.castShadow = true;

    const speaker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.225, 0.225, 0.035, 18),
      materials.structural(0x0b1115),
    );
    speaker.position.set(9.61, 1.37, -7.58);
    speaker.rotation.x = Math.PI / 2;
    speaker.castShadow = true;
    scene.add(speaker);

    const grilleGeometry = new THREE.BoxGeometry(0.36, 0.018, 0.018);
    const grille = new THREE.InstancedMesh(grilleGeometry, materials.fadedPaint, 9);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 9; i++) {
      matrix.makeTranslation(9.61, 1.21 + i * 0.04, -7.552);
      grille.setMatrixAt(i, matrix);
    }
    scene.add(grille);

    const tuningWindow = this.box(scene, materials.glass, 10.11, 1.5, -7.57, 0.33, 0.13, 0.022);
    tuningWindow.castShadow = false;
    const scaleGeometry = new THREE.BoxGeometry(0.025, 0.055, 0.012);
    const scaleMarks = new THREE.InstancedMesh(scaleGeometry, materials.amberSignal, 7);
    for (let i = 0; i < 7; i++) {
      matrix.makeTranslation(9.99 + i * 0.04, 1.5, -7.55);
      scaleMarks.setMatrixAt(i, matrix);
    }
    scene.add(scaleMarks);

    const knobGeometry = new THREE.CylinderGeometry(0.07, 0.07, 0.055, 12);
    const knobs = new THREE.InstancedMesh(knobGeometry, materials.fadedPaint, 2);
    [10.04, 10.22].forEach((x, index) => {
      matrix.makeRotationX(Math.PI / 2);
      matrix.setPosition(x, 1.29, -7.54);
      knobs.setMatrixAt(index, matrix);
    });
    knobs.castShadow = true;
    scene.add(knobs);

    const buttons = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.08, 0.055, 0.035),
      materials.warningPaint,
      3,
    );
    for (let i = 0; i < 3; i++) {
      matrix.makeTranslation(9.98 + i * 0.12, 1.17, -7.54);
      buttons.setMatrixAt(i, matrix);
    }
    scene.add(buttons);

    const radioGlow = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 7), materials.amberSignal);
    radioGlow.position.set(10.26, 1.39, -7.53);
    scene.add(radioGlow);

    const antennaBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.065, 0.08, 10),
      materials.darkSteel,
    );
    antennaBase.position.set(10.22, 1.75, -7.91);
    scene.add(antennaBase);

    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.022, 0.7, 7),
      materials.oldSteel,
    );
    antenna.position.set(10.28, 2.08, -7.9);
    antenna.rotation.z = -0.18;
    antenna.castShadow = true;
    scene.add(antenna);

    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(9.38, 1.23, -7.86),
      new THREE.Vector3(9.22, 0.92, -7.7),
      new THREE.Vector3(9.33, 0.56, -7.58),
      new THREE.Vector3(9.15, 0.2, -7.46),
    ]);
    const cable = new THREE.Mesh(
      new THREE.TubeGeometry(cableCurve, 14, 0.022, 6, false),
      materials.structural(0x090f12),
    );
    cable.castShadow = true;
    scene.add(cable);
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

    this.addEnergyDistributorDetails(scene, materials);

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

  private addEnergyDistributorDetails(scene: THREE.Scene, materials: MaterialLibrary): void {
    const matrix = new THREE.Matrix4();

    const doorRailGeometry = new THREE.BoxGeometry(0.075, 2.16, 0.05);
    const doorRails = new THREE.InstancedMesh(doorRailGeometry, materials.oldSteel, 3);
    [0.05, 2.48, 3.94].forEach((x, index) => {
      matrix.makeTranslation(x, 1.72, -2.735);
      doorRails.setMatrixAt(index, matrix);
    });
    doorRails.castShadow = true;
    scene.add(doorRails);

    const upperRailGeometry = new THREE.BoxGeometry(3.85, 0.07, 0.05);
    const upperRails = new THREE.InstancedMesh(upperRailGeometry, materials.oldSteel, 2);
    [0.6, 2.82].forEach((y, index) => {
      matrix.makeTranslation(2, y, -2.735);
      upperRails.setMatrixAt(index, matrix);
    });
    scene.add(upperRails);

    const breakerBaseGeometry = new THREE.BoxGeometry(0.34, 0.32, 0.07);
    const breakerBases = new THREE.InstancedMesh(breakerBaseGeometry, materials.darkSteel, 4);
    const breakerHandleGeometry = new THREE.BoxGeometry(0.09, 0.22, 0.085);
    const breakerHandles = new THREE.InstancedMesh(breakerHandleGeometry, materials.fadedPaint, 4);
    const breakerXs = [2.76, 3.08, 3.4, 3.72];
    breakerXs.forEach((x, index) => {
      matrix.makeTranslation(x, 1.84, -2.68);
      breakerBases.setMatrixAt(index, matrix);
      matrix.makeTranslation(x, 1.82, -2.615);
      breakerHandles.setMatrixAt(index, matrix);
    });
    breakerBases.castShadow = true;
    breakerHandles.castShadow = true;
    scene.add(breakerBases, breakerHandles);

    const indicatorGeometry = new THREE.SphereGeometry(0.045, 8, 6);
    const indicators = new THREE.InstancedMesh(indicatorGeometry, materials.amberSignal, 4);
    breakerXs.forEach((x, index) => {
      matrix.makeTranslation(x, 2.12, -2.61);
      indicators.setMatrixAt(index, matrix);
    });
    scene.add(indicators);

    const busBarGeometry = new THREE.BoxGeometry(0.11, 1.55, 0.055);
    const busBars = new THREE.InstancedMesh(busBarGeometry, materials.rust, 3);
    [2.83, 3.15, 3.47].forEach((x, index) => {
      matrix.makeTranslation(x, 1.24, -2.655);
      busBars.setMatrixAt(index, matrix);
    });
    busBars.castShadow = true;
    scene.add(busBars);

    const fuseGeometry = new THREE.CylinderGeometry(0.055, 0.055, 0.28, 8);
    const fuses = new THREE.InstancedMesh(fuseGeometry, materials.fadedPaint, 6);
    for (let i = 0; i < 6; i++) {
      matrix.makeRotationZ(Math.PI / 2);
      matrix.setPosition(2.72 + (i % 3) * 0.34, 0.78 + Math.floor(i / 3) * 0.27, -2.61);
      fuses.setMatrixAt(i, matrix);
    }
    scene.add(fuses);

    const warningPlate = this.box(scene, materials.warningPaint, 3.49, 2.52, -2.66, 0.78, 0.22, 0.045);
    warningPlate.castShadow = false;
    const plateMark = this.box(scene, materials.lanePaint, 3.49, 2.52, -2.63, 0.48, 0.045, 0.018);
    plateMark.castShadow = false;

    const cableMaterial = materials.structural(0x0a1115);
    const cableStarts = [2.85, 3.46];
    cableStarts.forEach((x, index) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, 0.58, -2.7),
        new THREE.Vector3(x + (index === 0 ? -0.15 : 0.18), 0.42, -2.45),
        new THREE.Vector3(x + (index === 0 ? -0.35 : 0.42), 0.2, -2.28),
        new THREE.Vector3(x + (index === 0 ? -0.55 : 0.65), 0.08, -2.18),
      ]);
      const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.035, 6, false), cableMaterial);
      cable.castShadow = true;
      scene.add(cable);
    });
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
