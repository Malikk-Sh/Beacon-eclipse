import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { MaterialLibrary } from './MaterialLibrary';
import { HARBOR_FLOORS } from './HarborLayout';

export const HARBOR_DISCOVERIES = [
  { id: 'watch-log', title: 'ЖУРНАЛ СМОТРИТЕЛЯ', x: -2.55, z: 28,
    speaker: 'ЛЕВ', text: '«22:16. Паром ушёл пустым. Свет в школе всё ещё горит». Последняя запись. Чернила не успели высохнуть.' },
  { id: 'harbor-receiver', title: 'ПРИЧАЛ 02 — ПРОВЕРИТЬ ПРИЁМНИК', x: -50, z: 5.1,
    speaker: 'МАРА', text: 'Этот приёмник направлен на школу. Смотритель слушал её даже после эвакуации. Лев, значит, мы не первые, кто услышал Нику.' },
  { id: 'ferry-board', title: 'ПАРОМНЫЙ ТЕРМИНАЛ — ОСМОТРЕТЬ', x: 47, z: 3,
    speaker: 'ЛЕВ', text: 'Детский билет. Обратная сторона исписана: «Если меня не будет, жди у окна в конце коридора». Я знаю этот почерк.' },
] as const;

type Part = { p: THREE.Vector3; s: THREE.Vector3; q: THREE.Quaternion };

/** A walkable harbor district. Batched detail and physics share the same placement helpers. */
export class HarborDistrict {
  private readonly m = new MaterialLibrary();
  private readonly batches = new Map<THREE.Material, Part[]>();
  private readonly pennants: THREE.Mesh[] = [];
  private readonly beaconTarget = new THREE.Object3D();
  private readonly beacon = new THREE.SpotLight(0xe3eff1, 65, 160, 0.055, 0.65, 1.2);
  private elapsed = 0;

  constructor(private readonly scene: THREE.Scene, private readonly physics: RAPIER.World) {
    this.lighthouseInterior();
    this.westPier();
    this.ferryPier();
    this.quayLife();
    this.flush();
    this.beacon.position.set(0, 14.15, 28.5);
    this.beacon.target = this.beaconTarget;
    scene.add(this.beacon, this.beaconTarget);
  }

  update(dt: number): void {
    this.elapsed += dt;
    const angle = this.elapsed * 0.13;
    this.beaconTarget.position.set(Math.sin(angle) * 115, 2, 28.5 - Math.cos(angle) * 115);
    this.pennants.forEach((flag, i) => {
      flag.rotation.z = -0.24 + Math.sin(this.elapsed * 3.4 + i) * 0.09;
      flag.rotation.y = Math.sin(this.elapsed * 2.6 + i * 2) * 0.16;
    });
  }

  private lighthouseInterior(): void {
    const m = this.m;
    // Warm task lighting, a used workbench, service lockers and an overhead cable rack.
    this.box(m.wetConcrete, 0, 4.42, 25.8, 8.3, 0.18, 16.3, true);
    for (const z of [19, 23, 27, 31.6]) this.box(m.darkSteel, 0, 4.16, z, 8, 0.22, 0.16, true);
    this.box(m.oldSteel, -3.17, 0.91, 28, 1.35, 0.14, 3.3, true);
    for (const z of [26.65, 29.35]) this.box(m.darkSteel, -3.17, 0.46, z, 1.15, 0.92, 0.1, true);
    this.box(m.fadedPaint, -2.92, 1.02, 28, 0.56, 0.025, 0.43);
    for (let i = 0; i < 8; i++) this.box(m.darkSteel, -2.92, 1.036, 27.85 + i * 0.037, 0.37, 0.002, 0.005);
    this.box(m.darkSteel, -3.38, 1.16, 29, 0.36, 0.39, 0.3);
    this.box(m.glass, -3.38, 1.22, 29.16, 0.27, 0.18, 0.015);
    for (const z of [26.8, 29.1]) this.box(m.rust, -3.56, 1.8, z, 0.12, 1.7, 0.12);
    this.box(m.oldSteel, -3.3, 2.1, 28, 0.95, 0.075, 3.2);
    for (let i = 0; i < 8; i++) this.box(m.paintedMetal, -3.18, 2.3, 26.7 + i * 0.35, 0.42, 0.34, 0.23);
    const warmLamp = new THREE.PointLight(0xffcb86, 8, 8, 2);
    warmLamp.position.set(-2.75, 2.25, 27.8);
    this.scene.add(warmLamp);
    this.box(m.amberSignal, -2.85, 2.3, 28, 0.62, 0.045, 0.14);
    for (const z of [26, 27.1, 28.2, 29.3]) {
      this.box(m.paintedMetal, 3.35, 1.22, z, 1.1, 2.44, 0.95, true);
      this.box(m.darkSteel, 2.785, 1.26, z, 0.03, 2.25, 0.78);
      this.box(m.fadedPaint, 2.758, 1.26, z - 0.25, 0.04, 0.18, 0.055);
      for (let i = 0; i < 5; i++) this.box(m.oldSteel, 2.746, 1.85 + i * 0.07, z, 0.035, 0.024, 0.46);
    }
    for (const x of [-3.5, 3.5]) {
      this.box(m.rust, x, 3.66, 25.8, 0.07, 0.07, 15.8);
      for (const z of [20, 22, 24, 26, 28, 30, 32]) this.box(m.oldSteel, x, 3.66, z, 0.25, 0.18, 0.055);
    }
    this.sign('СЕВЕРНЫЙ МАЯК', 'СЛУЖЕБНЫЙ ВЫХОД  ↓', 0, 3.65, 17.9, 1.8, 0.52);
    this.sign('АВАРИЙНОЕ ПИТАНИЕ', 'ЗАПУСК / РЕЗЕРВ', -3.57, 2.77, 24, 1.25, 0.42, Math.PI / 2);
    this.sign('ЖУРНАЛ СМЕНЫ', '22:16   /   ПОСЛЕДНЯЯ ЗАПИСЬ', -3.05, 2.57, 28, 1.2, 0.42, Math.PI / 2);
    // Exit apron and a readable split toward the two optional harbor routes.
    this.sign('ПОРТ', '← ПРИЧАЛ 02    ·    ПАРОМЫ →', 0, 2.65, 6.1, 3.1, 0.7);
    this.box(m.oldSteel, -1.75, 1.45, 6.1, 0.1, 2.9, 0.1, true);
    this.box(m.oldSteel, 1.75, 1.45, 6.1, 0.1, 2.9, 0.1, true);
  }

  private westPier(): void {
    const m = this.m;
    // Access stays clear in the middle, with a separate space to explore beyond the cargo rows.
    this.rail(-40.5, 1.5, 11, false);
    this.rail(-40.5, 8.5, 11, false);
    this.rail(-54, -3, 23, true);
    this.rail(-46, -6.5, 16, true);
    this.rail(-50, -14.5, 8, false);
    this.rail(-50, 8.5, 8, false);
    this.box(m.oldSteel, -50, 0.65, 6.25, 2.1, 1.3, 0.7, true);
    this.box(m.darkSteel, -50, 1.4, 6.25, 1.6, 0.35, 0.5);
    this.box(m.glass, -50, 1.45, 5.975, 0.9, 0.17, 0.025);
    this.box(m.amberSignal, -50.65, 1.45, 5.956, 0.055, 0.065, 0.03);
    this.beam(m.oldSteel, [-50.7, 1.5, 6.25], [-50.7, 4.6, 6.25], 0.035);
    this.sign('ПРИЧАЛ 02', 'СЛУЖЕБНАЯ ЧАСТОТА  104.7', -50, 2.24, 6.1, 2, 0.6, Math.PI);
    // A gantry crane gives the west end a recognisable silhouette and human scale.
    this.box(m.wetConcrete, -50, 0.38, -10, 3.3, 0.76, 3.3, true);
    for (const x of [-51.15, -48.85]) for (const z of [-11.15, -8.85]) {
      this.box(m.rust, x, 5.3, z, 0.23, 9.9, 0.23, true);
    }
    for (const y of [3.3, 6.4, 9.4]) {
      for (const z of [-11.15, -8.85]) {
        this.box(m.oldSteel, -50, y, z, 2.6, 0.15, 0.17);
        this.beam(m.oldSteel, [-51.15, y - 2.7, z], [-48.85, y, z], 0.105);
      }
    }
    this.box(m.paintedMetal, -48.7, 10.2, -10, 2.1, 1.9, 2.7);
    this.box(m.glass, -47.63, 10.5, -10, 0.03, 0.88, 2.1);
    this.beam(m.warningPaint, [-50, 10.3, -10], [-55, 13.7, -21], 0.27);
    this.beam(m.darkSteel, [-50, 11.7, -10], [-55, 13.7, -21], 0.08);
    this.beam(m.darkSteel, [-55, 13.7, -21], [-55, 1.6, -21], 0.025);
    this.box(m.oldSteel, -55, 1.35, -21, 0.35, 0.5, 0.25);
    this.lamp(-51.6, 1.8, 4.5);
    this.flag(-48.7, 11.6, -9);
  }

  private ferryPier(): void {
    const m = this.m;
    this.rail(39, -2, 8, false);
    this.rail(39, 6, 8, false);
    this.rail(47, 6, 8, false);
    this.rail(51, -6, 24, true);
    this.rail(43, -10, 16, true);
    this.rail(47, -18, 8, false);
    // Shelter, open on the approach side. Its roof and posts have collision.
    for (const x of [44.2, 49.8]) for (const z of [-5.8, -0.2]) this.box(m.oldSteel, x, 1.65, z, 0.13, 3.3, 0.13, true);
    this.box(m.paintedMetal, 47, 3.35, -3, 6.3, 0.16, 6.5, true);
    this.box(m.glass, 49.9, 1.65, -3, 0.08, 2.75, 5.6, true);
    this.box(m.oldSteel, 47.8, 0.48, -5.2, 3.6, 0.12, 0.65, true);
    this.box(m.paintedMetal, 47.8, 0.86, -5.47, 3.6, 0.65, 0.1, true);
    for (const x of [46.4, 49.2]) this.box(m.darkSteel, x, 0.25, -5.2, 0.12, 0.5, 0.6, true);
    this.box(m.oldSteel, 48, 1.25, 1.4, 0.13, 2.5, 0.13, true);
    this.sign('ПОСЛЕДНИЙ ПАРОМ', '22:10  /  РЕЙС ОТМЕНЁН', 48, 2.1, 1.43, 2.1, 0.9);
    this.box(m.fadedPaint, 47.6, 0.03, 2.5, 0.18, 0.012, 0.26);
    this.lamp(47, 3.12, -2.5);
    this.flag(49.8, 3.7, -0.2);
    // Fender tyres, cleats and a moored empty service skiff below the pier edge.
    for (const z of [-9, -13, -16]) {
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.13, 8, 16), m.darkSteel);
      tyre.position.set(51.1, -0.22, z);
      tyre.rotation.y = Math.PI / 2;
      this.scene.add(tyre);
    }
    this.box(m.paintedMetal, 55, 0.16, -12, 2.6, 0.5, 6.5);
    this.box(m.darkSteel, 55, 0.43, -12, 2.15, 0.045, 5.6);
    for (const x of [53.8, 56.2]) this.box(m.fadedPaint, x, 0.58, -12, 0.12, 0.42, 6.1);
    this.box(m.fadedPaint, 55, 0.57, -14.8, 2.6, 0.4, 0.15);
    for (const z of [-10.4, -12.8]) this.box(m.oldSteel, 55, 0.71, z, 2.35, 0.09, 0.55);
    this.beam(m.rust, [51, 0.4, -10], [53.8, 0.6, -10.5], 0.035);
    this.beam(m.rust, [51, 0.4, -14.5], [53.8, 0.6, -14], 0.035);
  }

  private quayLife(): void {
    const m = this.m;
    // Front edge of the working quay, leaving the bridge entrance open.
    for (const [x, width] of [[-19.7, 29.4], [19.7, 29.4]]) this.rail(x, -17.42, width, false);
    // Back and outer boundaries are physical; pier entrances have deliberately open gaps.
    this.rail(0, 47.9, 70, false);
    this.rail(-34.9, 28.2, 39.3, true);
    this.rail(-34.9, -8, 19, true);
    this.rail(34.9, 27, 42, true);
    this.rail(34.9, -9.7, 15.4, true);
    for (const [x, z] of [[-29, -11], [-30, 12], [-25, 28], [20, 23], [27, -11], [30, 10]]) {
      this.box(m.darkSteel, x, 2.4, z, 0.095, 4.8, 0.095, true);
      this.box(m.oldSteel, x + 0.35, 4.8, z, 0.8, 0.07, 0.15);
      this.box(m.amberSignal, x + 0.65, 4.76, z, 0.35, 0.035, 0.18);
    }
    // A service shed and cargo stacks create two paths through the eastern yard.
    this.box(m.paintedMetal, 23, 1.8, 19, 9, 3.6, 6, true);
    this.box(m.oldSteel, 23, 3.68, 19, 9.4, 0.18, 6.4, true);
    for (let i = 0; i < 24; i++) this.box(m.oldSteel, 18.6 + i * 0.38, 1.8, 15.97, 0.04, 3.4, 0.09);
    this.box(m.darkSteel, 23, 1.4, 15.87, 3, 2.8, 0.12);
    this.sign('МАСТЕРСКАЯ', 'ПОРТОВАЯ СЛУЖБА  /  03', 23, 3.05, 15.77, 2.8, 0.58);
    for (const [x, z, height] of [[-29, 22, 1.1], [-27, 23, 0.7], [17, 5, 1.1], [20, 5, 0.55], [28, -7, 1.3]]) {
      this.box(m.rust, x, height / 2, z, 1.6, height, 1.4, true);
      for (const dx of [-0.66, 0.66]) this.box(m.oldSteel, x + dx, height / 2, z, 0.09, height + 0.04, 1.44);
    }
    // Shallow pallet: an optional first place to try the jump, away from all essential routes.
    this.box(m.oldSteel, 12, 0.28, 7, 2.3, 0.56, 1.7, true);
    for (let i = 0; i < 7; i++) this.box(m.fadedPaint, 11.04 + i * 0.32, 0.59, 7, 0.24, 0.06, 1.7);
    this.sign('НАБЕРЕЖНАЯ', 'ПРИЧАЛ 02  ←', -29, 2.3, 4.5, 2.1, 0.58);
    this.sign('ПАРОМНЫЙ ПРИЧАЛ', '→', 29, 2.3, 2.3, 2.1, 0.58);
    for (const x of [-29, 29]) this.box(m.oldSteel, x, 1.1, x < 0 ? 4.5 : 2.3, 0.09, 2.2, 0.09, true);
    for (const f of HARBOR_FLOORS.slice(1)) {
      for (let z = f.z - f.depth / 2 + 1; z < f.z + f.depth / 2; z += 2) {
        this.box(m.oldSteel, f.x, 0.012, z, f.width - 0.3, 0.018, 0.03);
      }
    }
    // Painted routes and expansion joints sit flush with the ground.
    for (let i = 0; i < 20; i++) {
      this.box(m.lanePaint, -32 + i * 1.65, 0.013, 2.5, 0.7, 0.016, 0.09);
      this.box(m.lanePaint, 5 + i * 1.6, 0.013, 1.1, 0.7, 0.016, 0.09);
    }
    for (const x of [-30, -6, 16, 31]) for (let z = -15; z < 44; z += 5) {
      this.box(m.darkSteel, x, 0.009, z, 0.026, 0.012, 4.92);
    }
  }

  private rail(x: number, z: number, length: number, alongZ: boolean): void {
    const m = this.m;
    const sx = alongZ ? 0.075 : length;
    const sz = alongZ ? length : 0.075;
    this.box(m.darkSteel, x, 0.12, z, alongZ ? 0.2 : length, 0.24, alongZ ? length : 0.2);
    for (const y of [0.6, 1.1]) this.box(m.oldSteel, x, y, z, sx, 0.06, sz);
    this.physics.createCollider(RAPIER.ColliderDesc.cuboid(sx / 2, 0.58, sz / 2).setTranslation(x, 0.58, z));
    const count = Math.ceil(length / 2.2);
    for (let i = 0; i <= count; i++) {
      const d = -length / 2 + i * length / count;
      this.box(m.oldSteel, x + (alongZ ? 0 : d), 0.58, z + (alongZ ? d : 0), 0.08, 1.16, 0.08);
    }
  }

  private lamp(x: number, y: number, z: number): void {
    this.box(this.m.oldSteel, x, y + 0.05, z, 0.52, 0.1, 0.34);
    this.box(this.m.amberSignal, x, y - 0.01, z, 0.42, 0.025, 0.27);
    const light = new THREE.PointLight(0xffc38b, 7, 9, 2);
    light.position.set(x, y - 0.1, z);
    this.scene.add(light);
  }

  private flag(x: number, y: number, z: number): void {
    this.box(this.m.oldSteel, x, y, z, 0.045, 2, 0.045);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(1.3, -0.2); shape.lineTo(0, -0.55); shape.closePath();
    const material = this.m.warningPaint.clone();
    material.side = THREE.DoubleSide;
    const flag = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
    flag.position.set(x, y + 0.85, z);
    this.scene.add(flag);
    this.pennants.push(flag);
  }

  private sign(title: string, caption: string, x: number, y: number, z: number, w: number, h: number, yaw = 0): void {
    const sideFacing = Math.abs(Math.sin(yaw)) > 0.5;
    this.box(this.m.darkSteel, x, y, z, sideFacing ? 0.08 : w + 0.12, h + 0.1, sideFacing ? w + 0.12 : 0.08);
    // Canvas text is rasterized once; there is no per-frame DOM or texture upload.
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#18282d'; context.fillRect(0, 0, 768, 256);
    context.fillStyle = '#c7b68a'; context.fillRect(24, 25, 5, 206);
    context.textAlign = 'center'; context.fillStyle = '#dfddd1';
    context.font = '600 40px sans-serif'; context.fillText(title, 394, 106, 700);
    context.fillStyle = '#9aafb2'; context.font = '24px sans-serif'; context.fillText(caption, 394, 177, 680);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({
      map: texture, roughness: 0.76, metalness: 0.2, emissive: 0x71847e, emissiveMap: texture, emissiveIntensity: 0.22,
    }));
    sign.position.set(x + Math.sin(yaw) * 0.05, y, z + Math.cos(yaw) * 0.05);
    sign.rotation.y = yaw;
    this.scene.add(sign);
  }

  private beam(material: THREE.Material, a: number[], b: number[], width: number): void {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const delta = end.clone().sub(start);
    this.part(material, start.add(end).multiplyScalar(0.5), new THREE.Vector3(width, delta.length(), width),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()));
  }

  private box(material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, solid = false): void {
    this.part(material, new THREE.Vector3(x, y, z), new THREE.Vector3(sx, sy, sz), new THREE.Quaternion());
    if (solid) this.physics.createCollider(RAPIER.ColliderDesc.cuboid(sx / 2, sy / 2, sz / 2).setTranslation(x, y, z));
  }

  private part(material: THREE.Material, p: THREE.Vector3, s: THREE.Vector3, q: THREE.Quaternion): void {
    const parts = this.batches.get(material) ?? [];
    parts.push({ p, s, q });
    this.batches.set(material, parts);
  }

  private flush(): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1), matrix = new THREE.Matrix4();
    for (const [material, parts] of this.batches) {
      const batch = new THREE.InstancedMesh(geometry, material, parts.length);
      batch.name = 'harbor-district-detail';
      parts.forEach((part, i) => { matrix.compose(part.p, part.q, part.s); batch.setMatrixAt(i, matrix); });
      batch.castShadow = batch.receiveShadow = true;
      this.scene.add(batch);
    }
  }
}
