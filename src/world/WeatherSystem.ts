import * as THREE from 'three';

export type VisualQuality = 'low' | 'medium' | 'high';

export class WeatherSystem {
  private readonly maxStreaks = 900;
  private readonly positions = new Float32Array(this.maxStreaks * 6);
  private readonly speeds = new Float32Array(this.maxStreaks);
  private readonly geometry = new THREE.BufferGeometry();
  private readonly lightning = new THREE.DirectionalLight(0xc9e8ff, 0);
  private activeStreaks = 560;
  private lightningTimer = 8 + Math.random() * 10;
  private lightningEnergy = 0;

  constructor(scene: THREE.Scene) {
    for (let i = 0; i < this.maxStreaks; i++) this.resetStreak(i, Math.random() * 28);

    const positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', positionAttribute);
    this.geometry.setDrawRange(0, this.activeStreaks * 2);

    const rain = new THREE.LineSegments(
      this.geometry,
      new THREE.LineBasicMaterial({
        color: 0xa9d0e8,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      }),
    );
    rain.frustumCulled = false;
    scene.add(rain);

    this.lightning.position.set(-6, 18, -18);
    scene.add(this.lightning);
  }

  setQuality(quality: VisualQuality): void {
    this.activeStreaks = quality === 'low' ? 320 : quality === 'medium' ? 560 : 900;
    this.geometry.setDrawRange(0, this.activeStreaks * 2);
  }

  update(dt: number): void {
    for (let i = 0; i < this.activeStreaks; i++) {
      const offset = i * 6;
      let x = this.positions[offset] - 4.2 * dt;
      let y = this.positions[offset + 1] - this.speeds[i] * dt;
      let z = this.positions[offset + 2] + 0.7 * dt;

      if (y < 0 || x < -38 || z > 50) {
        this.resetStreak(i, 25 + Math.random() * 4);
        continue;
      }

      this.writeStreak(offset, x, y, z);
    }
    this.geometry.attributes.position.needsUpdate = true;

    this.lightningTimer -= dt;
    if (this.lightningTimer <= 0) {
      this.lightningEnergy = 1;
      this.lightningTimer = 8 + Math.random() * 15;
    }
    this.lightningEnergy = Math.max(0, this.lightningEnergy - dt * 7.5);
    const pulse = this.lightningEnergy * this.lightningEnergy;
    this.lightning.intensity = pulse * 5.8;
  }

  private resetStreak(index: number, y: number): void {
    const offset = index * 6;
    const x = (Math.random() - 0.5) * 76;
    const z = (Math.random() - 0.5) * 112 - 7;
    this.speeds[index] = 18 + Math.random() * 11;
    this.writeStreak(offset, x, y, z);
  }

  private writeStreak(offset: number, x: number, y: number, z: number): void {
    this.positions[offset] = x;
    this.positions[offset + 1] = y;
    this.positions[offset + 2] = z;
    this.positions[offset + 3] = x + 0.22;
    this.positions[offset + 4] = y + 0.78;
    this.positions[offset + 5] = z - 0.04;
  }
}
