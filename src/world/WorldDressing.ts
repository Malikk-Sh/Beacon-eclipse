import * as THREE from 'three';
import { PortSurfaceDetails } from './PortSurfaceDetails';
import { MaterialLibrary } from './MaterialLibrary';
import { PortBridgeAtmosphere } from './PortBridgeAtmosphere';
import { ScaleCueDressing } from './ScaleCueDressing';
import { BridgeArea } from './areas/BridgeArea';
import { LighthouseArea } from './areas/LighthouseArea';
import { PortArea } from './areas/PortArea';

export class WorldDressing {
  private readonly waterNormal: THREE.Texture;
  private readonly portBridgeAtmosphere: PortBridgeAtmosphere;

  constructor(scene: THREE.Scene, materials: MaterialLibrary, bridgeRoot: THREE.Group) {
    // A private transform shares the bitmap; it never moves concrete or school puddle normals.
    this.waterNormal = materials.water.normalMap!.clone();
    materials.water.normalMap = this.waterNormal;
    materials.water.normalScale.set(0.85, 0.85);
    this.addWaterStrip(scene, materials, 0, -60, 340, 320);

    new LighthouseArea(scene, materials);
    new PortArea(scene, materials);
    new PortSurfaceDetails(scene, materials);
    new BridgeArea(scene, materials, bridgeRoot);
    new ScaleCueDressing(scene, materials);
    this.portBridgeAtmosphere = new PortBridgeAtmosphere(scene, materials, bridgeRoot);
    this.addDistantCity(scene, materials);
  }

  update(dt: number): void {
    this.portBridgeAtmosphere.update(dt);
    this.waterNormal.offset.x = (this.waterNormal.offset.x + dt * 0.012) % 1;
    this.waterNormal.offset.y = (this.waterNormal.offset.y + dt * 0.006) % 1;
  }

  private addDistantCity(scene: THREE.Scene, materials: MaterialLibrary): void {
    const city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.structural(0x3e5360), 108);
    city.name = 'layered-harbor-skyline';
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const cyanWindows: THREE.Vector3[] = [];
    const amberWindows: THREE.Vector3[] = [];
    let index = 0;
    for (let i = 0; i < 54; i++) {
      const layer = Math.floor(i / 18);
      const x = -113 + (i % 18) * 13.3 + layer * 3.7;
      const width = 4.5 + (i * 7 % 5) * 1.2;
      const height = 8 + (i * 13 % 23) + layer * 4;
      const depth = 5 + i % 3;
      const z = -116 - layer * 23 - (i % 3) * 4;
      matrix.compose(new THREE.Vector3(x, height / 2 - 0.3, z), rotation, new THREE.Vector3(width, height, depth));
      city.setMatrixAt(index++, matrix);
      const crownHeight = 1.5 + i % 5;
      matrix.compose(new THREE.Vector3(x + width * 0.1, height + crownHeight / 2 - 0.3, z), rotation,
        new THREE.Vector3(width * 0.55, crownHeight, depth * 0.6));
      city.setMatrixAt(index++, matrix);
      for (let floor = 0; floor < Math.floor(height / 1.6); floor++) {
        for (let column = 0; column < 4; column++) {
          const pattern = (i * 31 + floor * 17 + column * 7) % 19;
          if (pattern > 6) continue;
          const destination = pattern < 2 ? amberWindows : cyanWindows;
          destination.push(new THREE.Vector3(x + (column - 1.5) * width * 0.2, 1.1 + floor * 1.6, z + depth / 2 + 0.03));
        }
      }
    }
    city.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    scene.add(city);
    this.addCityWindows(scene, cyanWindows, 0xadc4ce, 0x63879c, 0.9);
    this.addCityWindows(scene, amberWindows, 0xd3b383, 0xaa7443, 1.0);
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
    water.position.set(x, -0.16, z);
    water.name = 'harbor-water';
    water.receiveShadow = true;
    scene.add(water);
  }
}
