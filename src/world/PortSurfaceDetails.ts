import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { MaterialLibrary } from './MaterialLibrary';

type Part = { position: THREE.Vector3; scale: THREE.Vector3; rotation: THREE.Quaternion };

/** Architectural detail is batched by material, keeping hundreds of parts to a few draws. */
export class PortSurfaceDetails {
  private readonly parts = new Map<THREE.Material, Part[]>();

  constructor(scene: THREE.Scene, materials: MaterialLibrary) {
    this.warehouse(scene, materials);
    this.containers(materials);
    this.machinery(materials);
    this.quay(materials);
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const matrix = new THREE.Matrix4();
    for (const [material, parts] of this.parts) {
      const batch = new THREE.InstancedMesh(geometry, material, parts.length);
      batch.name = 'port-surface-details';
      parts.forEach((part, index) => {
        matrix.compose(part.position, part.rotation, part.scale);
        batch.setMatrixAt(index, matrix);
      });
      batch.castShadow = material !== materials.glass;
      batch.receiveShadow = true;
      scene.add(batch);
    }
  }

  private part(material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, roll = 0): void {
    const entries = this.parts.get(material) ?? [];
    entries.push({
      position: new THREE.Vector3(x, y, z), scale: new THREE.Vector3(sx, sy, sz),
      rotation: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll),
    });
    this.parts.set(material, entries);
  }

  private warehouse(scene: THREE.Scene, m: MaterialLibrary): void {
    const slope = Math.atan2(1.05, 6.85);
    const roofWidth = Math.hypot(6.85, 1.05);
    for (const side of [-1, 1]) {
      const roof = new THREE.Mesh(new RoundedBoxGeometry(roofWidth, 0.13, 9.65, 1, 0.025), m.paintedMetal);
      roof.name = 'warehouse-pitched-roof';
      roof.position.set(8 + side * 3.425, 6.075, -13);
      roof.rotation.z = -side * slope;
      roof.castShadow = roof.receiveShadow = true;
      scene.add(roof);
      for (let i = 0; i < 18; i++) {
        this.part(m.oldSteel, 8 + side * 3.425, 6.16, -17.65 + i * 0.55, roofWidth, 0.055, 0.045, -side * slope);
      }
      this.part(m.rust, 8 + side * 6.8, 5.52, -13, 0.16, 0.22, 9.8);
      this.part(m.concrete, 8 + side * 6.53, 0.24, -13, 0.25, 0.48, 9.15);
      // Side siding, cross-members, vents and the foundation interrupt the blank shell.
      for (let i = 0; i < 26; i++) {
        this.part(m.oldSteel, 8 + side * 6.54, 2.9, -17.4 + i * 0.35, 0.1, 5.15, 0.045);
      }
      for (const y of [1.1, 3.65, 5.25]) this.part(m.darkSteel, 8 + side * 6.58, y, -13, 0.12, 0.12, 9);
    }
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-6.85, 0);
    gableShape.lineTo(6.85, 0);
    gableShape.lineTo(0, 1.05);
    gableShape.closePath();
    const gableGeometry = new THREE.ShapeGeometry(gableShape);
    for (const z of [-8.28, -17.72]) {
      const gable = new THREE.Mesh(gableGeometry, m.paintedMetal);
      gable.position.set(8, 5.55, z);
      if (z < -13) gable.rotation.y = Math.PI;
      gable.castShadow = true;
      scene.add(gable);
    }
    this.part(m.oldSteel, 8, 6.65, -13, 0.19, 0.13, 9.9);
    // Recessed industrial glazing above the loading area. No extra dynamic lights.
    for (const x of [3.1, 11.6]) {
      this.part(m.darkSteel, x, 3.5, -8.22, 1.8, 1.35, 0.16);
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          this.part(m.glass, x - 0.58 + col * 0.58, 3.2 + row * 0.6, -8.12, 0.48, 0.5, 0.045);
        }
      }
    }
    // The radio now has a rain hood and a real bracket, rather than floating on a wall.
    this.part(m.oldSteel, 9.85, 0.96, -7.91, 1.36, 0.09, 0.65);
    this.part(m.darkSteel, 9.35, 0.77, -8.04, 0.065, 0.42, 0.3);
    this.part(m.darkSteel, 10.35, 0.77, -8.04, 0.065, 0.42, 0.3);
    this.part(m.oldSteel, 9.85, 1.92, -7.9, 1.42, 0.065, 0.76);
    for (const x of [9.18, 10.52]) this.part(m.oldSteel, x, 1.64, -8.07, 0.045, 0.58, 0.42);
  }

  private containers(m: MaterialLibrary): void {
    const specs = [[-9, -7, 5, 2.6, 12], ...Array.from({ length: 7 }, (_, i) => [
      -11 + i % 3 * 4, 4 + Math.floor(i / 3) * 5, 3.4, 2.4, 4.2,
    ])];
    for (const [x, z, sx, sy, sz] of specs) {
      const count = Math.ceil(sz / 0.28);
      for (const side of [-1, 1]) {
        for (let i = 0; i < count; i++) {
          this.part(m.paintedMetal, x + side * (sx / 2 + 0.018), sy / 2, z - sz / 2 + 0.14 + i * (sz - 0.28) / count,
            0.09, sy - 0.18, 0.095);
        }
        for (const y of [0.12, sy - 0.08]) this.part(m.rust, x + side * sx / 2, y, z, 0.13, 0.13, sz + 0.08);
        // Door locking rods and hinges give containers human-scale engineering detail.
        this.part(m.oldSteel, x + side * sx * 0.23, sy / 2, z + sz / 2 + 0.13, 0.045, sy - 0.25, 0.05);
        this.part(m.fadedPaint, x + side * sx * 0.23, 1, z + sz / 2 + 0.17, 0.28, 0.055, 0.065);
        for (const y of [0.4, sy - 0.4]) this.part(m.rust, x + side * sx * 0.45, y, z + sz / 2 + 0.12, 0.28, 0.13, 0.07);
      }
      for (let i = 0; i < 9; i++) this.part(m.oldSteel, x - sx * 0.44 + i * sx * 0.11, sy + 0.025, z, 0.045, 0.04, sz - 0.12);
      this.part(m.fadedPaint, x + sx * 0.25, sy - 0.5, z + sz / 2 + 0.075, 0.38, 0.14, 0.025);
    }
  }

  private machinery(m: MaterialLibrary): void {
    // Station plinth, edge flashing and access panels retain its physical footprint.
    this.part(m.concrete, 2, 0.13, -5, 5.12, 0.26, 4.08);
    this.part(m.oldSteel, 2, 3.06, -5, 5.18, 0.14, 4.16);
    for (const side of [-1, 1]) {
      const x = 2 + side * 2.52;
      this.part(m.darkSteel, x, 1.55, -5, 0.035, 2.5, 3.1);
      for (let row = 0; row < 14; row++) {
        this.part(m.paintedMetal, x + side * 0.025, 0.7 + row * 0.11, -5.15, 0.075, 0.05, 2.55);
      }
      for (const z of [-6.8, -3.25]) this.part(m.oldSteel, x, 1.55, z, 0.09, 2.8, 0.095);
    }
    // Pump room access covers and louvers break up the large eight-metre wall.
    this.part(m.concrete, -3, 0.15, -14, 8.08, 0.3, 4.1);
    this.part(m.oldSteel, -3, 3.25, -14, 8.1, 0.13, 4.1);
    for (const x of [-6, -3.8, -1.6, 0.6]) {
      this.part(m.darkSteel, x, 1.75, -11.96, 1.65, 2.55, 0.035);
      for (const y of [0.58, 2.92]) this.part(m.oldSteel, x, y, -11.91, 1.64, 0.075, 0.07);
      for (let row = 0; row < 8; row++) this.part(m.paintedMetal, x, 0.9 + row * 0.12, -11.89, 1.4, 0.05, 0.075);
    }
  }

  private quay(m: MaterialLibrary): void {
    for (const side of [-1, 1]) {
      this.part(m.wetConcrete, side * 35, -0.25, -2, 0.4, 0.7, 100);
      for (let i = 0; i < 25; i++) {
        this.part(m.concrete, side * 34.86, 0.04, 46 - i * 4, 0.55, 0.08, 3.92);
        this.part(m.rust, side * 35.2, -0.2, 46 - i * 4, 0.09, 0.48, 0.32);
      }
    }
    // Drains sit flush and never create new gameplay obstacles.
    for (const [x, z] of [[0, 3], [5, -5.5], [-5.8, -10], [11, -6.5]]) {
      this.part(m.darkSteel, x, 0.014, z, 0.65, 0.012, 1.6);
      for (let i = 0; i < 11; i++) this.part(m.oldSteel, x, 0.027, z - 0.7 + i * 0.14, 0.61, 0.018, 0.035);
    }
  }
}
