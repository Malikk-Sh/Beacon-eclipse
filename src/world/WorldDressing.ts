import * as THREE from 'three';
import { MaterialLibrary } from './MaterialLibrary';

export class WorldDressing {
  constructor(scene: THREE.Scene, materials: MaterialLibrary) {
    this.addWetPatch(scene, materials, -4, 13, 5, 9);
    this.addWetPatch(scene, materials, 5, 1, 8, 7);
    this.addWetPatch(scene, materials, -6, -9, 9, 10);
    this.addWetPatch(scene, materials, 8, -13, 8, 5);
    this.addWetPatch(scene, materials, 0, -25, 5.5, 19);

    this.addWaterStrip(scene, materials, -28, -8, 12, 78);
    this.addWaterStrip(scene, materials, 28, -8, 12, 78);

    this.addLighthouseSilhouette(scene, materials);
    this.addPortDressing(scene, materials);
    this.addDistantCity(scene, materials);
  }

  private addLighthouseSilhouette(scene: THREE.Scene, materials: MaterialLibrary): void {
    const balcony = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.1, 6, 32), materials.oldSteel);
    balcony.rotation.x = Math.PI / 2;
    balcony.position.set(0, 13.1, 28.5);
    balcony.castShadow = true;
    scene.add(balcony);

    const postGeometry = new THREE.CylinderGeometry(0.045, 0.045, 0.9, 6);
    const posts = new THREE.InstancedMesh(postGeometry, materials.oldSteel, 12);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      matrix.makeTranslation(Math.cos(angle) * 3.2, 13.5, 28.5 + Math.sin(angle) * 3.2);
      posts.setMatrixAt(i, matrix);
    }
    posts.castShadow = true;
    scene.add(posts);

    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.9, 0.75, 16), materials.beaconHousing);
    housing.position.set(0, 14.25, 28.5);
    housing.castShadow = true;
    scene.add(housing);
  }

  private addPortDressing(scene: THREE.Scene, materials: MaterialLibrary): void {
    const bollardGeometry = new THREE.CylinderGeometry(0.18, 0.24, 0.72, 8);
    const bollards = new THREE.InstancedMesh(bollardGeometry, materials.oldSteel, 8);
    const matrix = new THREE.Matrix4();
    const placements = [
      [-7, 0.36, -2], [-7, 0.36, -10], [7, 0.36, -2], [7, 0.36, -10],
      [-5, 0.36, -17], [5, 0.36, -17], [-4.5, 0.36, -31], [4.5, 0.36, -31],
    ] as const;

    placements.forEach(([x, y, z], index) => {
      matrix.makeTranslation(x, y, z);
      bollards.setMatrixAt(index, matrix);
    });
    bollards.castShadow = true;
    scene.add(bollards);

    this.addVisualBox(scene, materials.oldSteel, 2, 2.9, -2.7, 5.4, 0.16, 0.32);
    this.addVisualBox(scene, materials.oldSteel, 8, 5.65, -13, 13.5, 0.24, 9.4);
    this.addVisualBox(scene, materials.oldSteel, -3, 3.35, -14, 8.4, 0.18, 4.35);
  }

  private addDistantCity(scene: THREE.Scene, materials: MaterialLibrary): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const city = new THREE.InstancedMesh(geometry, materials.structural(0x111d25), 14);
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    for (let i = 0; i < 14; i++) {
      const x = -25 + i * 4 + (i % 2) * 1.3;
      const height = 5 + (i % 5) * 2.4;
      const z = -78 - (i % 3) * 5;
      matrix.compose(
        new THREE.Vector3(x, height / 2 - 0.4, z),
        rotation,
        new THREE.Vector3(2.5 + (i % 3), height, 3 + (i % 2)),
      );
      city.setMatrixAt(i, matrix);
    }
    city.receiveShadow = true;
    scene.add(city);
  }

  private addWetPatch(
    scene: THREE.Scene,
    materials: MaterialLibrary,
    x: number,
    z: number,
    sx: number,
    sz: number,
  ): void {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), materials.wetPatch);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, 0.012, z);
    patch.receiveShadow = true;
    scene.add(patch);
  }

  private addWaterStrip(
    scene: THREE.Scene,
    materials: MaterialLibrary,
    x: number,
    z: number,
    sx: number,
    sz: number,
  ): void {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), materials.water);
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, 0.018, z);
    water.receiveShadow = true;
    scene.add(water);
  }

  private addVisualBox(
    scene: THREE.Scene,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ): void {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}
