import * as THREE from 'three';
import { surfaceMaterial } from '../world/SurfaceTextures';
import { cable, consolidate, labelMaterial, part, roundedBox } from '../world/DetailGeometry';

/** Industrial inspection drone: segmented shell, protected lens, ducts and articulated tools. */
export class SoykaVisual {
  readonly root = new THREE.Group();
  private readonly optic = new THREE.Group();
  private readonly rotors: THREE.Group[] = [];
  private readonly manipulators: THREE.Group[] = [];
  private readonly light = new THREE.MeshStandardMaterial({ color: 0xb5e7ef, emissive: 0x48bfe1, emissiveIntensity: 2.1,
    roughness: 0.21, metalness: 0.3 });

  constructor() {
    this.root.name = 'soyka-detailed-model';
    const shell = surfaceMaterial('steel', 0xa6b0aa, 0.35);
    const steel = surfaceMaterial('steel', 0x7b868a, 0.8);
    const brass = surfaceMaterial('steel', 0x937653, 0.64);
    const dark = surfaceMaterial('steel', 0x263337, 0.52);
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x143445, metalness: 0.35, roughness: 0.10, clearcoat: 1, clearcoatRoughness: 0.08 });
    part(this.root, new THREE.SphereGeometry(0.275, 40, 28), dark, 0, 0, 0, 1, 0.95, 1);
    // Open seams expose the darker pressure vessel beneath six rounded armor petals.
    for (let i = 0; i < 6; i++) {
      const petal = part(this.root, new THREE.SphereGeometry(0.299, 14, 22, 0.055, Math.PI / 3 - 0.11, 0.34, 2.3), shell);
      petal.rotation.y = i * Math.PI / 3;
    }
    for (const y of [-0.15, 0.15]) {
      const ring = part(this.root, new THREE.TorusGeometry(0.263, 0.012, 8, 48), brass, 0, y, 0);
      ring.rotation.x = Math.PI / 2;
    }
    this.root.add(this.optic);
    this.optic.position.z = -0.239;
    for (const [radius, z, material] of [[0.134, -0.012, steel], [0.112, -0.063, brass], [0.091, -0.092, dark]] as const) {
      part(this.optic, new THREE.TorusGeometry(radius, 0.018, 10, 40), material, 0, 0.035, z);
    }
    const barrel = part(this.optic, new THREE.CylinderGeometry(0.115, 0.135, 0.09, 40), dark, 0, 0.035, -0.035);
    barrel.rotation.x = Math.PI / 2;
    part(this.optic, new THREE.SphereGeometry(0.088, 36, 24), glass, 0, 0.035, -0.088, 1, 1, 0.3);
    part(this.optic, new THREE.SphereGeometry(0.035, 24, 16), this.light, 0, 0.035, -0.112, 1, 1, 0.24);
    part(this.optic, new THREE.TorusGeometry(0.052, 0.0025, 6, 32), this.light, 0, 0.035, -0.115);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const screw = part(this.optic, new THREE.CylinderGeometry(0.007, 0.007, 0.009, 6), steel,
        Math.cos(a) * 0.137, 0.035 + Math.sin(a) * 0.137, -0.036);
      screw.rotation.x = Math.PI / 2;
    }
    // Ducts have physical inner walls and fast rotor motion, without transparent full-screen passes.
    for (const side of [-1, 1]) {
      const duct = new THREE.Group(); duct.position.set(side * 0.302, -0.015, 0.058); this.root.add(duct);
      const ring = part(duct, new THREE.TorusGeometry(0.104, 0.021, 10, 32), dark);
      ring.rotation.y = Math.PI / 2;
      const rotor = new THREE.Group(); rotor.rotation.y = Math.PI / 2; duct.add(rotor); this.rotors.push(rotor);
      for (let i = 0; i < 5; i++) {
        const blade = part(rotor, roundedBox(0.02, 0.087, 0.008), steel, 0, 0, 0);
        blade.rotation.z = i * Math.PI * 2 / 5;
      }
      part(duct, new THREE.SphereGeometry(0.029, 16, 10), brass);
      cable(this.root, brass, [[side * 0.15, -0.17, 0.08], [side * 0.22, -0.27, -0.06], [side * 0.19, -0.29, -0.19]], 0.015, 10);
      const arm = new THREE.Group(); arm.position.set(side * 0.18, -0.23, -0.04); this.root.add(arm); this.manipulators.push(arm);
      part(arm, new THREE.SphereGeometry(0.025, 18, 12), steel);
      part(arm, roundedBox(0.024, 0.12, 0.024, 0.006), dark, 0, -0.058, 0);
      for (const finger of [-1, 1]) cable(arm, steel, [[finger * 0.015, -0.112, 0], [finger * 0.027, -0.15, -0.024], [finger * 0.014, -0.166, -0.047]], 0.006, 6);
      part(this.root, roundedBox(0.018, 0.075, 0.02), this.light, side * 0.245, 0.16, -0.038);
    }
    for (let i = 0; i < 9; i++) {
      part(this.root, roundedBox(0.13, 0.008, 0.014, 0.003), dark, 0, -0.095 + i * 0.021, 0.284);
    }
    part(this.root, roundedBox(0.125, 0.058, 0.035), dark, 0, 0.261, 0.022);
    cable(this.root, steel, [[0.05, 0.28, 0.04], [0.061, 0.36, 0.04], [0.037, 0.427, 0.037]], 0.004, 8);
    part(this.root, new THREE.SphereGeometry(0.006, 10, 8), brass, 0.037, 0.427, 0.037);
    part(this.root, new THREE.PlaneGeometry(0.115, 0.036), labelMaterial('СОЙКА', 'DRN / 013'), 0, 0.181, 0.241);
    for (let i = 0; i < 14; i++) {
      const angle = i * 2.39996;
      part(this.root, new THREE.SphereGeometry(0.006, 6, 4), steel, Math.cos(angle) * 0.269, (i % 2 ? 1 : -1) * 0.113, Math.sin(angle) * 0.269);
    }
    consolidate(this.root);
  }

  update(dt: number, elapsed: number, speed: number, pulse: number): void {
    for (const rotor of this.rotors) rotor.rotation.z += dt * (42 + speed * 6);
    this.optic.rotation.y = Math.sin(elapsed * 0.65) * 0.08;
    this.optic.rotation.x = Math.sin(elapsed * 0.43) * 0.035;
    this.light.emissiveIntensity = 1.6 + pulse * 3 + Math.sin(elapsed * 2.2) * 0.12;
    this.manipulators.forEach((arm, i) => { arm.rotation.x = -0.12 + Math.sin(elapsed * 0.9 + i) * 0.035 - speed * 0.035; });
  }
}
