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

  readonly paintedMetal = new THREE.MeshStandardMaterial({
    color: 0x27343b,
    roughness: 0.47,
    metalness: 0.52,
  });

  readonly oldSteel = new THREE.MeshStandardMaterial({
    color: 0x263036,
    roughness: 0.58,
    metalness: 0.68,
  });

  readonly warningPaint = new THREE.MeshStandardMaterial({
    color: 0x51302a,
    roughness: 0.56,
    metalness: 0.46,
  });

  readonly beaconHousing = new THREE.MeshStandardMaterial({
    color: 0xa7c4cf,
    emissive: 0x6f9dad,
    emissiveIntensity: 1.5,
    roughness: 0.32,
    metalness: 0.28,
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
