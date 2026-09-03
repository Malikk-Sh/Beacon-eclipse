import * as THREE from 'three';
import { LightingRig } from './LightingRig';
import { MaterialLibrary } from './MaterialLibrary';
import { WeatherSystem, type VisualQuality } from './WeatherSystem';
import { WorldDressing } from './WorldDressing';

export class VisualFoundation {
  private readonly weather: WeatherSystem;

  constructor(scene: THREE.Scene) {
    this.removePrototypeEnvironment(scene);

    const materials = new MaterialLibrary();
    new LightingRig(scene);
    new WorldDressing(scene, materials);
    this.weather = new WeatherSystem(scene);
  }

  setQuality(quality: VisualQuality): void {
    this.weather.setQuality(quality);
  }

  update(dt: number): void {
    this.weather.update(dt);
  }

  private removePrototypeEnvironment(scene: THREE.Scene): void {
    const removable = scene.children.filter((child) => (
      child instanceof THREE.HemisphereLight
      || child instanceof THREE.DirectionalLight
      || child instanceof THREE.Points
    ));

    for (const child of removable) {
      scene.remove(child);
      if (child instanceof THREE.Points) {
        child.geometry.dispose();
        const material = child.material;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material.dispose();
      }
    }
  }
}
