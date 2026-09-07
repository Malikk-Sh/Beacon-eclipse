import * as THREE from 'three';
import { MaterialLibrary } from './MaterialLibrary';
import { PortBridgeAtmosphere } from './PortBridgeAtmosphere';
import { ScaleCueDressing } from './ScaleCueDressing';
import { BridgeArea } from './areas/BridgeArea';
import { LighthouseArea } from './areas/LighthouseArea';
import { PortArea } from './areas/PortArea';

export class WorldDressing {
  private readonly portBridgeAtmosphere: PortBridgeAtmosphere;

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
    new ScaleCueDressing(scene, materials);
    this.portBridgeAtmosphere = new PortBridgeAtmosphere(scene, materials, bridgeRoot);
    this.addDistantCity(scene, materials);
  }

  update(dt: number): void {
    this.portBridgeAtmosphere.update(dt);
  }

  private addDistantCity(scene: THREE.Scene, materials: MaterialLibrary): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const city = new THREE.InstancedMesh(geometry, materials.structural(0x111d25), 14);
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const cyanWindows: THREE.Vector3[] = [];
    const amberWindows: THREE.Vector3[] = [];

    for (let i = 0; i < 14; i++) {
      const x = -25 + i * 4 + (i % 2) * 1.3;
      const width = 2.5 + (i % 3);
      const height = 5 + (i % 5) * 2.4;
      const depth = 3 + (i % 2);
      const z = -78 - (i % 3) * 5;
      matrix.compose(
        new THREE.Vector3(x, height / 2 - 0.4, z),
        rotation,
        new THREE.Vector3(width, height, depth),
      );
      city.setMatrixAt(i, matrix);

      const floors = Math.min(3, Math.max(1, Math.floor((height - 1.5) / 2.1)));
      for (let floor = 0; floor < floors; floor++) {
        const y = 1.25 + floor * 1.9;
        for (let column = 0; column < 2; column++) {
          const windowX = x + (column === 0 ? -width * 0.22 : width * 0.22);
          const windowZ = z + depth / 2 + 0.03;
          const destination = (i + floor * 2 + column) % 7 === 0 ? amberWindows : cyanWindows;
          destination.push(new THREE.Vector3(windowX, y, windowZ));
        }
      }
    }
    city.receiveShadow = true;
    scene.add(city);

    this.addCityWindows(scene, cyanWindows, 0x6bb9d8, 0x2d86ae, 2.25);
    this.addCityWindows(scene, amberWindows, 0xd19858, 0xb65e27, 1.9);
  }

  private addCityWindows(
    scene: THREE.Scene,
    positions: THREE.Vector3[],
    color: number,
    emissive: number,
    emissiveIntensity: number,
  ): void {
    if (positions.length === 0) return;

    const geometry = new THREE.BoxGeometry(0.34, 0.19, 0.045);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity,
      roughness: 0.36,
      metalness: 0.12,
    });
    const windows = new THREE.InstancedMesh(geometry, material, positions.length);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < positions.length; i++) {
      matrix.makeTranslation(positions[i].x, positions[i].y, positions[i].z);
      windows.setMatrixAt(i, matrix);
    }
    windows.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    scene.add(windows);
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
