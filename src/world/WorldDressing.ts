import * as THREE from 'three';
import { MaterialLibrary } from './MaterialLibrary';
import { BridgeArea } from './areas/BridgeArea';
import { LighthouseArea } from './areas/LighthouseArea';
import { PortArea } from './areas/PortArea';

export class WorldDressing {
  constructor(scene: THREE.Scene, materials: MaterialLibrary, bridgeRoot: THREE.Group) {
    this.addWetPatch(scene, materials, -4, 13, 5, 9);
    this.addWetPatch(scene, materials, 5, 1, 8, 7);
    this.addWetPatch(scene, materials, -6, -9, 9, 10);
    this.addWetPatch(scene, materials, 8, -13, 8, 5);
    this.addWetPatch(scene, materials, 0, -25, 5.5, 19);

    this.addWaterStrip(scene, materials, -28, -8, 12, 78);
    this.addWaterStrip(scene, materials, 28, -8, 12, 78);

    new LighthouseArea(scene, materials);
    new PortArea(scene, materials);
    new BridgeArea(scene, materials, bridgeRoot);
    this.addDistantCity(scene, materials);
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
}
