import * as THREE from 'three';
import { MaterialLibrary } from './MaterialLibrary';

export class ScaleCueDressing {
  constructor(scene: THREE.Scene, materials: MaterialLibrary) {
    this.addServiceBollards(scene, materials);
    this.addFloorReferenceMarks(scene, materials);
  }

  private addServiceBollards(scene: THREE.Scene, materials: MaterialLibrary): void {
    const placements: ReadonlyArray<readonly [x: number, z: number]> = [
      [-0.65, 2.4], [4.5, 1.15],
      [5.55, -5.95], [10.55, -5.95],
      [-4.1, -10.25], [1.15, -13.9],
      [-3.45, -15.1], [3.45, -15.1],
      [-3.45, -18.15], [3.45, -18.15],
    ];

    const bodyGeometry = new THREE.CylinderGeometry(0.085, 0.105, 0.92, 8);
    const bodies = new THREE.InstancedMesh(bodyGeometry, materials.oldSteel, placements.length);
    const bandGeometry = new THREE.CylinderGeometry(0.092, 0.092, 0.085, 8);
    const bands = new THREE.InstancedMesh(bandGeometry, materials.lanePaint, placements.length);
    const matrix = new THREE.Matrix4();

    placements.forEach(([x, z], index) => {
      matrix.makeTranslation(x, 0.46, z);
      bodies.setMatrixAt(index, matrix);
      matrix.makeTranslation(x, 0.69, z);
      bands.setMatrixAt(index, matrix);
    });

    bodies.castShadow = true;
    bodies.receiveShadow = true;
    bands.castShadow = false;
    bodies.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    bands.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    scene.add(bodies, bands);
  }

  private addFloorReferenceMarks(scene: THREE.Scene, materials: MaterialLibrary): void {
    const placements: ReadonlyArray<readonly [x: number, z: number, rotation: number]> = [
      [2, -0.4, 0], [2, -4.05, 0],
      [6.35, -6.45, Math.PI / 2], [9.65, -6.45, Math.PI / 2],
      [-2.55, -11.1, 0], [0, -14.75, 0],
      [-2.55, -17.25, 0], [2.55, -17.25, 0],
    ];

    const geometry = new THREE.BoxGeometry(0.62, 0.025, 0.1);
    const marks = new THREE.InstancedMesh(geometry, materials.lanePaint, placements.length);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);

    placements.forEach(([x, z, rotation], index) => {
      position.set(x, 0.045, z);
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
      matrix.compose(position, quaternion, scale);
      marks.setMatrixAt(index, matrix);
    });

    marks.receiveShadow = true;
    marks.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    scene.add(marks);
  }
}
