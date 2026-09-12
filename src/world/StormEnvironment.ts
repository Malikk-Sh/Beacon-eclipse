import * as THREE from 'three';
import { tileNoise } from './SurfaceTextures';

/** A baked storm sky supplies both the visible horizon and filtered metal reflections. */
export class StormEnvironment {
  private readonly sky: THREE.DataTexture;
  private environment: THREE.WebGLRenderTarget | null = null;

  constructor(private readonly scene: THREE.Scene) {
    const width = 512;
    const height = 256;
    const pixels = new Uint16Array(width * height * 4);
    const zenith = new THREE.Color(0x142634);
    const horizon = new THREE.Color(0x627c8d);
    const cloudColor = new THREE.Color(0x243743);
    const color = new THREE.Color();
    for (let y = 0; y < height; y++) {
      const v = y / (height - 1);
      const elevation = Math.sin((v - 0.5) * Math.PI);
      const haze = Math.exp(-Math.abs(elevation) * 5);
      for (let x = 0; x < width; x++) {
        const u = x / width;
        // Tile across longitude; fade variation at the poles to avoid pinching.
        const envelope = Math.cos((v - 0.5) * Math.PI);
        let cloud = 0;
        let weight = 0.52;
        for (let octave = 0; octave < 5; octave++) {
          cloud += tileNoise(u, v * 1.3, 4 * 2 ** octave, 81 + octave * 13) * weight;
          weight *= 0.5;
        }
        cloud = THREE.MathUtils.smoothstep(cloud, 0.3, 0.68) * envelope;
        color.copy(zenith).lerp(horizon, haze * 0.78);
        color.lerp(cloudColor, cloud * 0.8);
        const gap = Math.max(0, 1 - cloud * 1.3);
        const longitudeDistance = Math.min(Math.abs(u - 0.68), 1 - Math.abs(u - 0.68));
        const moonHaze = Math.exp(-(longitudeDistance ** 2 * 70 + (v - 0.64) ** 2 * 160));
        color.r += 0.22 * moonHaze * gap;
        color.g += 0.29 * moonHaze * gap;
        color.b += 0.37 * moonHaze * gap;
        if (elevation < 0) color.multiplyScalar(0.38 + haze * 0.35);
        const i = (y * width + x) * 4;
        pixels[i] = THREE.DataUtils.toHalfFloat(color.r);
        pixels[i + 1] = THREE.DataUtils.toHalfFloat(color.g);
        pixels[i + 2] = THREE.DataUtils.toHalfFloat(color.b);
        pixels[i + 3] = THREE.DataUtils.toHalfFloat(1);
      }
    }
    this.sky = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat, THREE.HalfFloatType);
    this.sky.mapping = THREE.EquirectangularReflectionMapping;
    this.sky.colorSpace = THREE.LinearSRGBColorSpace;
    this.sky.minFilter = this.sky.magFilter = THREE.LinearFilter;
    this.sky.needsUpdate = true;
    scene.background = this.sky;
    scene.backgroundIntensity = 0.85;
  }

  initialize(renderer: THREE.WebGLRenderer): void {
    if (this.environment) return;
    const generator = new THREE.PMREMGenerator(renderer);
    this.environment = generator.fromEquirectangular(this.sky);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.8;
    generator.dispose();
  }
}
