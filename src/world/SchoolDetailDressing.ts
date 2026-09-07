import * as THREE from 'three';
import { MaterialLibrary } from './MaterialLibrary';

const SCHOOL_ORIGIN_Z = -60;

export class SchoolDetailDressing {
  constructor(scene: THREE.Scene, materials: MaterialLibrary) {
    this.addCorridorDatum(scene, materials);
    this.addDoorHardware(scene, materials);
    this.addWallSeams(scene, materials);
  }

  private addCorridorDatum(scene: THREE.Scene, materials: MaterialLibrary): void {
    const railGeometry = new THREE.BoxGeometry(0.055, 0.1, 31.4);
    const lowerRails = new THREE.InstancedMesh(railGeometry, materials.oldSteel, 2);
    const upperRails = new THREE.InstancedMesh(railGeometry, materials.fadedPaint, 2);
    const matrix = new THREE.Matrix4();

    [-5.16, 5.16].forEach((x, index) => {
      matrix.makeTranslation(x, 0.66, SCHOOL_ORIGIN_Z - 17);
      lowerRails.setMatrixAt(index, matrix);
      matrix.makeTranslation(x, 1.14, SCHOOL_ORIGIN_Z - 17);
      upperRails.setMatrixAt(index, matrix);
    });

    lowerRails.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    upperRails.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    lowerRails.castShadow = false;
    upperRails.castShadow = false;
    scene.add(lowerRails, upperRails);
  }

  private addDoorHardware(scene: THREE.Scene, materials: MaterialLibrary): void {
    const doorDepth = 0.07;
    const handles = new THREE.InstancedMesh(
      new THREE.BoxGeometry(doorDepth, 0.14, 0.12),
      materials.rust,
      6,
    );
    const kickPlates = new THREE.InstancedMesh(
      new THREE.BoxGeometry(doorDepth, 0.28, 1.08),
      materials.fadedPaint,
      6,
    );
    const matrix = new THREE.Matrix4();
    let index = 0;

    for (const x of [-5.08, 5.08]) {
      const corridorOffset = x < 0 ? 0.035 : -0.035;
      for (const localZ of [-9, -18, -27]) {
        const z = SCHOOL_ORIGIN_Z + localZ;
        matrix.makeTranslation(x + corridorOffset, 1.15, z + 0.55);
        handles.setMatrixAt(index, matrix);
        matrix.makeTranslation(x + corridorOffset, 0.69, z);
        kickPlates.setMatrixAt(index, matrix);
        index += 1;
      }
    }

    handles.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    kickPlates.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    handles.castShadow = false;
    kickPlates.castShadow = false;
    scene.add(handles, kickPlates);
  }

  private addWallSeams(scene: THREE.Scene, materials: MaterialLibrary): void {
    const seamGeometry = new THREE.BoxGeometry(0.035, 2.05, 0.045);
    const seams = new THREE.InstancedMesh(seamGeometry, materials.darkSteel, 16);
    const matrix = new THREE.Matrix4();
    let index = 0;

    for (const x of [-5.17, 5.17]) {
      for (let localZ = -4; localZ >= -31.5; localZ -= 3.9) {
        matrix.makeTranslation(x, 1.55, SCHOOL_ORIGIN_Z + localZ);
        seams.setMatrixAt(index++, matrix);
      }
    }

    seams.count = index;
    seams.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    seams.castShadow = false;
    scene.add(seams);
  }
}
