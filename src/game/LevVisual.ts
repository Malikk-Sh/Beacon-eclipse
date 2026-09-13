import * as THREE from 'three';
import { surfaceMaterial } from '../world/SurfaceTextures';
import { cable, consolidate, labelMaterial, part, roundedBox } from '../world/DetailGeometry';

type Leg = { hip: THREE.Group; knee: THREE.Group; foot: THREE.Group };
type Arm = { shoulder: THREE.Group; elbow: THREE.Group };

/** Authored in metres: articulated human proportions, layered clothing and equipment. */
export class LevVisual {
  readonly root = new THREE.Group();
  private readonly torso = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly equipment = new THREE.Group();
  private readonly eyes = new THREE.Group();
  private readonly legs: Leg[] = [];
  private readonly arms: Arm[] = [];
  private elapsed = 0;
  private gait = 0;
  private blend = 0;

  constructor() {
    this.root.name = 'lev-detailed-rig';
    const nylon = surfaceMaterial('fabric', 0x3d4c50);
    const panels = surfaceMaterial('fabric', 0x526061);
    const trousers = surfaceMaterial('fabric', 0x323c3e);
    const seams = surfaceMaterial('fabric', 0x718080);
    const leather = surfaceMaterial('fabric', 0x715039);
    const straps = surfaceMaterial('fabric', 0x4c3e31);
    const metal = surfaceMaterial('steel', 0x819196, 0.72);
    const black = new THREE.MeshStandardMaterial({ color: 0x172020, roughness: 0.73, metalness: 0.15 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xad8170, roughness: 0.82 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x282321, roughness: 0.94 });
    const sclera = new THREE.MeshStandardMaterial({ color: 0x959a90, roughness: 0.65 });
    const iris = new THREE.MeshStandardMaterial({ color: 0x243a36, roughness: 0.3 });
    const optic = new THREE.MeshStandardMaterial({ color: 0x8bbfc8, emissive: 0x3d8298, emissiveIntensity: 0.6, roughness: 0.35 });

    this.root.add(this.torso);
    this.torso.add(this.head, this.equipment);
    this.head.name = 'lev-head';
    this.equipment.name = 'lev-backpack';
    part(this.torso, this.cloth(0.245, 0.205, 0.52, 24), nylon, 0, 1.255, 0, 1, 1, 0.68);
    part(this.torso, roundedBox(0.56, 0.17, 0.29, 0.065), panels, 0, 1.46, 0);
    part(this.torso, this.cloth(0.23, 0.255, 0.18, 24), nylon, 0, 0.96, 0, 1, 1, 0.69);
    part(this.torso, roundedBox(0.405, 0.15, 0.29), trousers, 0, 0.895, 0);
    const collar = part(this.torso, new THREE.TorusGeometry(0.135, 0.053, 12, 36, Math.PI * 1.6), panels, 0, 1.55, 0.015);
    collar.rotation.set(Math.PI / 2, 0, -Math.PI * 0.3);
    part(this.torso, new THREE.SphereGeometry(0.175, 24, 16, 0, Math.PI * 2, 0.6, 1.8), nylon, 0, 1.485, 0.09, 1, 0.65, 0.7);
    for (const side of [-1, 1]) {
      part(this.torso, roundedBox(0.132, 0.145, 0.029, 0.012), panels, side * 0.128, 1.3, -0.165);
      part(this.torso, roundedBox(0.14, 0.025, 0.03, 0.008), nylon, side * 0.128, 1.37, -0.175);
      cable(this.torso, seams, [[side * 0.21, 1.05, -0.08], [side * 0.215, 1.22, -0.14], [side * 0.25, 1.47, -0.10]], 0.0018);
      const strap = part(this.torso, roundedBox(0.04, 0.52, 0.023, 0.008), leather, side * 0.18, 1.275, -0.177);
      strap.rotation.z = side * -0.085;
      part(this.torso, roundedBox(0.057, 0.061, 0.025, 0.005), metal, side * 0.17, 1.18, -0.194);
      part(this.torso, roundedBox(0.035, 0.043, 0.028, 0.003), straps, side * 0.17, 1.18, -0.201);
    }
    // Zipper teeth, storm flap, pull tab and a stitched service patch.
    part(this.torso, roundedBox(0.027, 0.49, 0.027, 0.004), black, 0, 1.27, -0.178);
    for (let i = 0; i < 27; i++) part(this.torso, new THREE.BoxGeometry(0.024, 0.003, 0.004), metal, 0, 1.04 + i * 0.017, -0.194);
    part(this.torso, roundedBox(0.012, 0.035, 0.009), metal, 0.01, 1.46, -0.202);
    part(this.torso, new THREE.PlaneGeometry(0.11, 0.036), labelMaterial('ARDEN', 'FIELD SERVICE'), -0.135, 1.31, -0.183).rotation.y = Math.PI;
    part(this.torso, roundedBox(0.445, 0.044, 0.30), straps, 0, 0.955, 0);
    part(this.torso, roundedBox(0.062, 0.043, 0.034, 0.005), metal, 0, 0.958, -0.163);
    for (const side of [-1, 1]) {
      part(this.torso, roundedBox(0.10, 0.15, 0.075, 0.013), leather, side * 0.21, 0.887, -0.08);
      part(this.torso, roundedBox(0.10, 0.035, 0.08, 0.011), straps, side * 0.21, 0.948, -0.084);
    }

    // Facial planes, ears, eyelids and a short irregular hair silhouette.
    part(this.head, new THREE.CylinderGeometry(0.065, 0.079, 0.13, 20), skin, 0, 1.58, 0);
    part(this.head, new THREE.SphereGeometry(1, 36, 24), skin, 0, 1.709, -0.012, 0.112, 0.151, 0.112);
    part(this.head, new THREE.SphereGeometry(1, 24, 16), skin, 0, 1.65, -0.026, 0.085, 0.078, 0.085);
    part(this.head, new THREE.SphereGeometry(1, 18, 12), skin, 0, 1.711, -0.121, 0.020, 0.043, 0.026);
    part(this.head, new THREE.SphereGeometry(1, 16, 10), skin, 0, 1.689, -0.142, 0.023, 0.017, 0.015);
    const lips = new THREE.MeshStandardMaterial({ color: 0x785e54, roughness: 0.9 });
    part(this.head, new THREE.SphereGeometry(1, 18, 10), lips, 0, 1.665, -0.117, 0.036, 0.006, 0.006);
    this.head.add(this.eyes);
    for (const side of [-1, 1]) {
      part(this.head, new THREE.SphereGeometry(1, 18, 12), skin, side * 0.111, 1.71, 0.001, 0.022, 0.036, 0.014);
      part(this.head, new THREE.SphereGeometry(1, 20, 12), skin, side * 0.049, 1.756, -0.096, 0.044, 0.019, 0.025);
      part(this.eyes, new THREE.SphereGeometry(1, 20, 12), sclera, side * 0.044, 1.744, -0.108, 0.023, 0.009, 0.012);
      part(this.eyes, new THREE.SphereGeometry(0.0078, 16, 10), iris, side * 0.044, 1.744, -0.12);
      part(this.eyes, new THREE.SphereGeometry(0.0035, 12, 8), black, side * 0.044, 1.744, -0.126);
      cable(this.head, hair, [[side * 0.022, 1.767, -0.11], [side * 0.049, 1.773, -0.102], [side * 0.077, 1.76, -0.09]], 0.004, 8);
    }
    part(this.head, new THREE.SphereGeometry(1, 36, 24, 0, Math.PI * 2, 0, 1.66), hair, 0, 1.745, 0.002, 0.117, 0.121, 0.114);
    for (let i = 0; i < 52; i++) {
      const angle = i * 2.39996;
      const theta = 0.15 + (i % 13) / 12 * 1.3;
      const x = Math.cos(angle) * Math.sin(theta) * 0.117;
      const z = Math.sin(angle) * Math.sin(theta) * 0.113;
      const y = 1.745 + Math.cos(theta) * 0.117;
      cable(this.head, hair, [[x * 0.92, y, z], [x, y + 0.014, z + 0.012], [x * 1.05, y + 0.004, z + 0.026]], 0.0045, 4);
    }
    for (let i = 0; i < 26; i++) {
      const angle = -1.2 + i / 25 * 2.4;
      part(this.head, new THREE.SphereGeometry(0.0028, 5, 4), hair,
        Math.sin(angle) * 0.073, 1.633 + (i % 3) * 0.007, -0.043 - Math.cos(angle) * 0.067);
    }

    for (const side of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(side * 0.12, 0.87, 0);
      const knee = new THREE.Group(); knee.position.y = -0.38;
      const foot = new THREE.Group(); foot.position.y = -0.39;
      hip.add(knee); knee.add(foot); this.root.add(hip);
      this.legs.push({ hip, knee, foot });
      part(hip, this.cloth(0.105, 0.079, 0.38, 24), trousers, 0, -0.19, 0, 1, 1, 0.95);
      part(hip, roundedBox(0.073, 0.13, 0.04, 0.014), nylon, side * 0.094, -0.16, 0);
      part(knee, this.cloth(0.079, 0.057, 0.36, 24), trousers, 0, -0.165, 0);
      part(knee, roundedBox(0.114, 0.103, 0.025, 0.03), panels, 0, -0.014, -0.066);
      cable(knee, seams, [[side * 0.06, 0, 0], [side * 0.065, -0.14, 0.012], [side * 0.053, -0.31, 0]], 0.0019);
      part(foot, roundedBox(0.143, 0.136, 0.245, 0.038), black, 0, -0.018, -0.048);
      part(foot, roundedBox(0.148, 0.028, 0.255, 0.009), black, 0, -0.087, -0.051);
      part(foot, roundedBox(0.13, 0.058, 0.105, 0.018), leather, 0, 0.037, 0.008);
      for (let i = 0; i < 4; i++) {
        cable(foot, seams, [[-0.043, 0.045, -0.014 - i * 0.024], [0, 0.052, -0.026 - i * 0.024], [0.043, 0.045, -0.014 - i * 0.024]], 0.0023, 4);
        part(foot, new THREE.BoxGeometry(0.15, 0.012, 0.008), metal, 0, -0.084, -0.14 + i * 0.052);
      }
      const shoulder = new THREE.Group(); shoulder.position.set(side * 0.277, 1.455, 0);
      const elbow = new THREE.Group(); elbow.position.set(side * 0.028, -0.285, 0);
      shoulder.add(elbow); this.torso.add(shoulder); this.arms.push({ shoulder, elbow });
      part(shoulder, this.cloth(0.082, 0.069, 0.285, 24), nylon, side * 0.01, -0.145, 0);
      part(shoulder, new THREE.SphereGeometry(0.081, 24, 16), panels, side * 0.003, -0.025, 0, 1, 0.9, 1.1);
      part(elbow, this.cloth(0.068, 0.043, 0.25, 24), side === 1 ? metal : nylon, side * 0.008, -0.119, 0);
      if (side === 1) {
        for (let i = 0; i < 7; i++) part(elbow, new THREE.TorusGeometry(0.054 - i * 0.0017, 0.005, 6, 20), black, 0.008, -0.04 - i * 0.028, 0).rotation.x = Math.PI / 2;
        part(elbow, roundedBox(0.054, 0.08, 0.018), black, 0.007, -0.14, -0.052);
        part(elbow, roundedBox(0.028, 0.008, 0.005), optic, 0.007, -0.136, -0.064);
      }
      part(elbow, roundedBox(0.104, 0.036, 0.105, 0.012), straps, 0.01, -0.236, 0);
      part(elbow, roundedBox(0.075, 0.09, 0.048, 0.018), black, 0.012, -0.299, -0.002);
      for (let i = 0; i < 4; i++) part(elbow, new THREE.CapsuleGeometry(0.0085, 0.036 - Math.abs(i - 1.5) * 0.007, 5, 10), black,
        -0.014 + i * 0.017, -0.353, -0.006);
      part(elbow, new THREE.CapsuleGeometry(0.011, 0.025, 5, 10), black, side * -0.027, -0.302, -0.026).rotation.z = side * 0.5;
      cable(shoulder, seams, [[side * 0.07, 0, 0], [side * 0.082, -0.13, 0.02], [side * 0.057, -0.27, 0]], 0.002);
    }

    part(this.equipment, roundedBox(0.36, 0.45, 0.18, 0.055), leather, 0, 1.255, 0.239);
    part(this.equipment, roundedBox(0.31, 0.1, 0.185, 0.033), nylon, 0, 1.464, 0.244);
    part(this.equipment, roundedBox(0.30, 0.18, 0.055, 0.026), straps, 0, 1.12, 0.344);
    for (const x of [-0.133, 0.133]) {
      part(this.equipment, roundedBox(0.029, 0.4, 0.018, 0.005), straps, x, 1.245, 0.339);
      part(this.equipment, roundedBox(0.04, 0.036, 0.024, 0.005), metal, x, 1.17, 0.358);
    }
    part(this.equipment, new THREE.PlaneGeometry(0.235, 0.078), labelMaterial('ARDEN', 'ENGINEERING · 07'), 0, 1.355, 0.335);
    cable(this.equipment, seams, [[0, 1.47, 0.339], [-0.045, 1.397, 0.341], [0.045, 1.397, 0.341], [0, 1.47, 0.339]], 0.003, 8);
    part(this.equipment, roundedBox(0.10, 0.18, 0.06, 0.015), black, 0.235, 1.38, 0.235);
    cable(this.equipment, black, [[0.257, 1.45, 0.23], [0.259, 1.6, 0.233], [0.23, 1.68, 0.245]], 0.003);
    cable(this.torso, black, [[0.25, 1.48, 0.18], [0.22, 1.51, -0.03], [0.12, 1.40, -0.187]], 0.007);
    consolidate(this.root);
  }

  setFirstPerson(first: boolean): void { this.head.visible = !first; this.equipment.visible = !first; }

  update(dt: number, moving: boolean, grounded = true, verticalSpeed = 0, landing = 0): void {
    this.elapsed += dt;
    this.blend = THREE.MathUtils.damp(this.blend, moving && grounded ? 1 : 0, 9, dt);
    this.gait += dt * 9.2 * this.blend;
    const stride = Math.sin(this.gait);
    this.torso.rotation.set(-0.045 * this.blend - landing * 0.08, stride * 0.035 * this.blend,
      stride * 0.013 * this.blend + Math.sin(this.elapsed * 1.3) * 0.004);
    this.torso.position.y = Math.sin(this.elapsed * 1.4) * 0.003;
    this.root.position.y = -landing * 0.065;
    this.head.rotation.y = Math.sin(this.elapsed * 0.45) * 0.035 * (1 - this.blend);
    this.arms.forEach((arm, i) => {
      arm.shoulder.rotation.x = Math.sin(this.gait + (i ? 0 : Math.PI)) * 0.30 * this.blend - 0.04;
      arm.shoulder.rotation.z = (i ? 1 : -1) * 0.05;
      arm.elbow.rotation.x = -0.12 - this.blend * 0.2;
      if (!grounded) { arm.shoulder.rotation.x = -0.35; arm.elbow.rotation.x = -0.45; }
    });
    this.legs.forEach((leg, i) => {
      const phase = this.gait + i * Math.PI;
      const lift = Math.max(0, Math.cos(phase)) * 0.08 * this.blend + landing * 0.065;
      const z = Math.sin(phase) * 0.165 * this.blend;
      const down = 0.754 - lift;
      const d = Math.min(0.769, Math.hypot(down, z));
      const bend = Math.PI - Math.acos(THREE.MathUtils.clamp((0.38 ** 2 + 0.39 ** 2 - d * d) / (2 * 0.38 * 0.39), -1, 1));
      leg.hip.rotation.x = Math.atan2(-z, down) + bend * 0.51;
      leg.knee.rotation.x = -bend;
      leg.foot.rotation.x = -(leg.hip.rotation.x + leg.knee.rotation.x);
      if (!grounded) {
        leg.hip.rotation.x = (i ? 0.15 : -0.15) - Math.max(0, verticalSpeed) * 0.055;
        leg.knee.rotation.x = -0.35;
        leg.foot.rotation.x = 0.1;
      }
    });
  }

  private cloth(top: number, bottom: number, height: number, segments: number): THREE.BufferGeometry {
    const geometry = new THREE.CylinderGeometry(top, bottom, height, segments, 16);
    const points = geometry.getAttribute('position');
    for (let i = 0; i < points.count; i++) {
      const t = (points.getY(i) + height / 2) / height;
      const angle = Math.atan2(points.getZ(i), points.getX(i));
      const envelope = Math.sin(t * Math.PI);
      const fold = 1 + envelope * (Math.sin(t * 30 + angle * 3) * 0.036 + Math.sin(angle * 9 + t * 11) * 0.022);
      points.setX(i, points.getX(i) * fold);
      points.setZ(i, points.getZ(i) * fold);
    }
    geometry.computeVertexNormals();
    return geometry;
  }
}
