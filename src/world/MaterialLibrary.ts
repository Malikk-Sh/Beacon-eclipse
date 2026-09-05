import * as THREE from 'three';

export class MaterialLibrary {
  readonly wetGround = new THREE.MeshStandardMaterial({
    color: 0x0a131a,
    roughness: 0.24,
    metalness: 0.18,
  });

  readonly wetPatch = new THREE.MeshStandardMaterial({
    color: 0x0c1820,
    roughness: 0.08,
    metalness: 0.22,
  });

  readonly concrete = new THREE.MeshStandardMaterial({
    color: 0x202a30,
    roughness: 0.78,
    metalness: 0.06,
  });

  readonly wetConcrete = new THREE.MeshStandardMaterial({
    color: 0x182329,
    roughness: 0.38,
    metalness: 0.08,
  });

  readonly paintedMetal = new THREE.MeshStandardMaterial({
    color: 0x27343b,
    roughness: 0.47,
    metalness: 0.52,
  });

  readonly fadedPaint = new THREE.MeshStandardMaterial({
    color: 0x707b7a,
    roughness: 0.66,
    metalness: 0.3,
  });

  readonly oldSteel = new THREE.MeshStandardMaterial({
    color: 0x263036,
    roughness: 0.58,
    metalness: 0.68,
  });

  readonly darkSteel = new THREE.MeshStandardMaterial({
    color: 0x111a20,
    roughness: 0.5,
    metalness: 0.76,
  });

  readonly rust = new THREE.MeshStandardMaterial({
    color: 0x633b2d,
    roughness: 0.78,
    metalness: 0.24,
  });

  readonly warningPaint = new THREE.MeshStandardMaterial({
    color: 0x70402b,
    roughness: 0.56,
    metalness: 0.42,
  });

  readonly lanePaint = new THREE.MeshStandardMaterial({
    color: 0x9c8756,
    roughness: 0.7,
    metalness: 0.04,
  });

  readonly beaconHousing = new THREE.MeshStandardMaterial({
    color: 0xa7c4cf,
    emissive: 0x6f9dad,
    emissiveIntensity: 1.5,
    roughness: 0.32,
    metalness: 0.28,
  });

  readonly cyanSignal = new THREE.MeshStandardMaterial({
    color: 0x5db9d8,
    emissive: 0x2c9ec8,
    emissiveIntensity: 2.4,
    roughness: 0.3,
    metalness: 0.24,
  });

  readonly amberSignal = new THREE.MeshStandardMaterial({
    color: 0xd1944c,
    emissive: 0xff8a31,
    emissiveIntensity: 1.7,
    roughness: 0.38,
    metalness: 0.2,
  });

  readonly redSignal = new THREE.MeshStandardMaterial({
    color: 0x7c2926,
    emissive: 0xd72f29,
    emissiveIntensity: 1.55,
    roughness: 0.42,
    metalness: 0.24,
  });

  readonly glass = new THREE.MeshPhysicalMaterial({
    color: 0x88aab8,
    roughness: 0.12,
    metalness: 0,
    transmission: 0.18,
    transparent: true,
    opacity: 0.72,
  });

  readonly water = new THREE.MeshStandardMaterial({
    color: 0x07131b,
    roughness: 0.12,
    metalness: 0.32,
  });

  private readonly structuralCache = new Map<number, THREE.MeshStandardMaterial>();

  structural(color: number): THREE.MeshStandardMaterial {
    const cached = this.structuralCache.get(color);
    if (cached) return cached;
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.62,
      metalness: 0.34,
    });
    this.structuralCache.set(color, material);
    return material;
  }
}
