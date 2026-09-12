import * as THREE from 'three';
import { audioSystem } from '../game/AudioSystem';
import { RuntimePerformanceOverlay } from '../ui/RuntimePerformanceOverlay';
import { LightingRig } from './LightingRig';
import { MaterialLibrary } from './MaterialLibrary';
import { SchoolDetailDressing } from './SchoolDetailDressing';
import { WeatherSystem, type VisualQuality } from './WeatherSystem';
import { StormEnvironment } from './StormEnvironment';
import { projectSurfaceUVs } from './SurfaceTextures';
import { WorldDressing } from './WorldDressing';

export class VisualFoundation {
  private readonly weather: WeatherSystem;
  private readonly environment: StormEnvironment;
  private readonly dressing: WorldDressing;

  constructor(private readonly scene: THREE.Scene) {
    this.removePrototypeEnvironment(scene);

    const bridgeRoot = scene.getObjectByName('bridge-visual-root');
    if (!(bridgeRoot instanceof THREE.Group)) throw new Error('Missing bridge visual root');

    const materials = new MaterialLibrary();
    new LightingRig(scene);
    this.environment = new StormEnvironment(scene);
    this.dressing = new WorldDressing(scene, materials, bridgeRoot);
    new SchoolDetailDressing(scene, materials);
    this.weather = new WeatherSystem(scene, () => audioSystem.playThunder());
    new RuntimePerformanceOverlay();
  }

  initializeRenderer(renderer: THREE.WebGLRenderer): void {
    this.environment.initialize(renderer);
    const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial) || !material.userData.surfaceKind) continue;
        projectSurfaceUVs(object.geometry, material.userData.surfaceKind === 'fabric' ? 0.7 : 3);
        for (const map of [material.map, material.normalMap, material.roughnessMap]) {
          if (map) map.anisotropy = anisotropy;
        }
      }
    });
  }

  setQuality(quality: VisualQuality): void {
    this.weather.setQuality(quality);
  }

  update(dt: number): void {
    this.dressing.update(dt);
    this.weather.update(dt);
    audioSystem.update(dt);
  }

  private removePrototypeEnvironment(scene: THREE.Scene): void {
    const removable = scene.children.filter((child) => (
      child instanceof THREE.HemisphereLight
      || child instanceof THREE.DirectionalLight
      || child instanceof THREE.Points
    ));

    for (const child of removable) scene.remove(child);
  }
}
