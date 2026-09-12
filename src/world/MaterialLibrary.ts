import * as THREE from 'three';
import { surfaceMaterial, puddleMaterial } from './SurfaceTextures';

export class MaterialLibrary {
  readonly wetPatch = puddleMaterial();
  readonly wetGround = surfaceMaterial('ground', 0x59636a);
  readonly concrete = surfaceMaterial('concrete', 0x737c7c);
  readonly wetConcrete = surfaceMaterial('concrete', 0x57676c);
  readonly paintedMetal = surfaceMaterial('steel', 0x566970, 0.28);
  readonly fadedPaint = surfaceMaterial('steel', 0xa5aaa0, 0.18);
  readonly oldSteel = surfaceMaterial('steel', 0x66757b, 0.72);
  readonly darkSteel = surfaceMaterial('steel', 0x35464f, 0.55);
  readonly rust = surfaceMaterial('steel', 0x85583c, 0.12);
  readonly warningPaint = surfaceMaterial('steel', 0xad693b, 0.16);
  readonly lanePaint = surfaceMaterial('concrete', 0xbaab7d);

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
    // Reflective glass avoids a full-scene transmission pass on phones.
    transmission: 0,
    transparent: true,
    opacity: 0.72,
  });

  readonly water = surfaceMaterial('water', 0x36515a, 0.18);

  private readonly structuralCache = new Map<number, THREE.MeshStandardMaterial>();

  structural(color: number): THREE.MeshStandardMaterial {
    const cached = this.structuralCache.get(color);
    if (cached) return cached;
    const material = surfaceMaterial('steel', color, 0.28);
    this.structuralCache.set(color, material);
    return material;
  }
}
