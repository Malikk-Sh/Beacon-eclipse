import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { MaterialLibrary } from './MaterialLibrary';
import { cable, consolidate, labelMaterial, part, roundedBox } from './DetailGeometry';
import { HARBOR_FLOORS } from './HarborLayout';
import { projectSurfaceUVs, surfaceMaterial } from './SurfaceTextures';

/** Close-range environmental storytelling, grouped by district for batching and frustum culling. */
export class WorldDetailPass {
  readonly root = new THREE.Group();
  private readonly m = new MaterialLibrary();
  private readonly brick = surfaceMaterial('masonry', 0x79645a);
  private readonly paleBrick = surfaceMaterial('masonry', 0x8b9187);
  private readonly wood = surfaceMaterial('wood', 0x827059);
  private readonly plaster = surfaceMaterial('concrete', 0x9b9d8c);
  private readonly rubber = surfaceMaterial('steel', 0x20292d, 0.03);

  constructor(scene: THREE.Scene, private readonly physics: RAPIER.World) {
    this.root.name = 'authored-world-details';
    scene.add(this.root);
    this.lighthouse();
    this.serviceArchitecture();
    this.surveyOffice();
    this.school();
    this.coast();
    for (const zone of this.root.children) consolidate(zone);
  }

  private zone(name: string): THREE.Group {
    const group = new THREE.Group(); group.name = name; this.root.add(group); return group;
  }

  private box(g: THREE.Group, m: THREE.Material, x: number, y: number, z: number,
    w: number, h: number, d: number, solid = false, bevel = false): THREE.Mesh {
    const geometry = bevel ? roundedBox(w, h, d) : new THREE.BoxGeometry(w, h, d);
    projectSurfaceUVs(geometry, m.userData.surfaceKind === 'masonry' ? 1.6 : 2);
    const mesh = part(g, geometry, m, x, y, z);
    if (solid) this.physics.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setTranslation(x, y, z));
    return mesh;
  }

  private sign(g: THREE.Group, title: string, subtitle: string, x: number, y: number, z: number,
    w: number, h: number, yaw = 0): void {
    const mesh = part(g, new THREE.PlaneGeometry(w, h), labelMaterial(title, subtitle), x, y, z);
    mesh.rotation.y = yaw;
    mesh.castShadow = false;
  }

  private pipe(g: THREE.Group, points: number[][], radius = 0.025, material: THREE.Material = this.m.rust): void {
    cable(g, material, points, radius, 14);
  }

  private lighthouse(): void {
    const g = this.zone('lighthouse-lived-in-interior'), m = this.m;
    // Two-tone plaster, tile grout and skirting: the service room has a human scale up close.
    for (const x of [-3.965, 3.965]) {
      this.box(g, this.plaster, x, 2.85, 25.8, 0.035, 2.15, 15.6);
      this.box(g, m.paintedMetal, x, 0.92, 25.8, 0.045, 1.65, 15.6);
      this.box(g, m.oldSteel, x * 0.992, 1.78, 25.8, 0.035, 0.055, 15.6);
      this.box(g, this.rubber, x * 0.99, 0.08, 25.8, 0.04, 0.15, 15.6);
    }
    for (let x = -3.6; x <= 3.6; x += 0.6) this.box(g, m.darkSteel, x, 0.008, 25.6, 0.008, 0.005, 15.6);
    for (let z = 18; z < 34; z += 0.6) this.box(g, m.darkSteel, 0, 0.008, z, 7.85, 0.005, 0.008);
    // A real desk surface, drawer fronts, screw heads and objects around the existing watch log.
    this.box(g, this.wood, -3.17, 0.998, 28, 1.32, 0.025, 3.27);
    for (let z = 27; z < 29.3; z += 0.42) {
      this.box(g, m.paintedMetal, -2.48, 0.76, z, 0.06, 0.27, 0.38, false, true);
      this.box(g, m.oldSteel, -2.43, 0.78, z, 0.035, 0.035, 0.15);
    }
    part(g, new THREE.CylinderGeometry(0.075, 0.067, 0.16, 20, 1, true), m.fadedPaint, -2.84, 1.1, 28.58);
    const tea = part(g, new THREE.CircleGeometry(0.066, 20), this.rubber, -2.84, 1.16, 28.58);
    tea.rotation.x = -Math.PI / 2;
    part(g, new THREE.TorusGeometry(0.047, 0.012, 6, 14), m.fadedPaint, -2.75, 1.1, 28.58);
    for (let i = 0; i < 5; i++) this.box(g, i % 2 ? this.wood : m.fadedPaint,
      -3.37, 1.025 + i * 0.025, 27.3, 0.35, 0.022, 0.48);
    this.pipe(g, [[-3.4, 1.05, 29.12], [-3.76, 0.86, 29.35], [-3.88, 0.3, 29.3], [-3.89, 1.1, 30.4]], 0.012, this.rubber);
    // Recessed bulletin board, pinned papers and the last tide chart.
    this.box(g, this.wood, 3.89, 2.22, 21, 0.1, 1.65, 2.25);
    this.box(g, this.rubber, 3.82, 2.22, 21, 0.025, 1.48, 2.07);
    this.sign(g, 'ПРИЛИВ  /  23:40', 'ВЫХОД НА ВНЕШНИЙ МОЛ ЗАКРЫТ', 3.79, 2.34, 21, 1.72, 0.55, -Math.PI / 2);
    this.sign(g, 'ОСТАВЬ СВЕТ', 'СМЕНА 07  /  ЖДУ ДО ПОЛУНОЧИ', 3.79, 1.82, 21.45, 0.58, 0.28, -Math.PI / 2);
    // Pressure gauges, supply pipe, protective mesh and cable bends beside the power panel.
    for (const z of [22.55, 22.88]) {
      const gauge = part(g, new THREE.CylinderGeometry(0.13, 0.13, 0.07, 24), m.oldSteel, -3.79, 2.45, z);
      gauge.rotation.z = Math.PI / 2;
      const face = part(g, new THREE.CircleGeometry(0.108, 24), m.fadedPaint, -3.748, 2.45, z);
      face.rotation.y = Math.PI / 2;
      this.box(g, this.rubber, -3.737, 2.47, z + 0.02, 0.009, 0.075, 0.012).rotation.x = -0.45;
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 6;
        this.box(g, this.rubber, -3.734, 2.45 + Math.cos(a) * 0.083, z + Math.sin(a) * 0.083, 0.006, 0.012, 0.012);
      }
      this.pipe(g, [[-3.84, 2.34, z], [-3.87, 1.7, z], [-3.87, 0.5, z + 0.4]], 0.027);
    }
    for (let i = 0; i < 12; i++) this.box(g, m.oldSteel, -3.86, 3.68, 19.5 + i * 1.05, 0.2, 0.035, 0.08);
    for (const z of [19.4, 31.6]) {
      this.box(g, m.darkSteel, 0, 4.25, z, 1.35, 0.12, 0.34);
      this.box(g, m.fadedPaint, 0, 4.17, z, 1.2, 0.025, 0.23);
      for (const x of [-0.53, 0.53]) this.pipe(g, [[x, 4.27, z - 0.13], [x, 4.1, z], [x, 4.27, z + 0.13]], 0.018, m.oldSteel);
    }
    // Exterior stone plinth, rain gutters and a framed entrance; centre doorway remains clear.
    for (const x of [-4.26, 4.26]) {
      this.box(g, this.paleBrick, x, 0.6, 25.8, 0.18, 1.2, 16.3);
      this.box(g, m.darkSteel, x, 4.36, 25.8, 0.17, 0.18, 16.5);
      this.pipe(g, [[x, 4.36, 18.2], [x + Math.sign(x) * 0.1, 3.8, 18.2], [x + Math.sign(x) * 0.1, 0.16, 18.2]], 0.055);
    }
  }

  private serviceArchitecture(): void {
    const g = this.zone('port-masonry-and-machine-details'), m = this.m;
    // Low masonry foundation and clerestory frames break up the flat warehouse shell.
    for (const x of [1.4, 14.6]) {
      this.box(g, this.brick, x, 0.68, -13, 0.2, 1.3, 9);
      this.box(g, m.darkSteel, x, 5.57, -13, 0.16, 0.2, 9.4);
      this.pipe(g, [[x, 5.58, -8.7], [x + 0.12, 5.2, -8.7], [x + 0.12, 0.18, -8.7]], 0.065);
    }
    for (const x of [2.6, 5.25, 10.85, 13.1]) {
      this.box(g, m.darkSteel, x, 4.78, -8.16, 1.65, 0.92, 0.12);
      this.box(g, m.glass, x, 4.78, -8.08, 1.49, 0.76, 0.035);
      this.box(g, m.oldSteel, x, 4.78, -8.048, 0.055, 0.79, 0.03);
      this.box(g, m.oldSteel, x, 4.78, -8.045, 1.54, 0.045, 0.04);
      this.box(g, m.fadedPaint, x, 4.29, -8.13, 1.82, 0.08, 0.3);
    }
    this.sign(g, 'ARDEN / СЕВЕРНЫЙ ПОРТ', 'ГРУЗОВАЯ ЛИНИЯ 04   ·   СМЕНА ЗАВЕРШЕНА', 8, 5.3, -8.08, 4.1, 0.32);
    this.sign(g, 'РЕЗЕРВНЫЙ УЗЕЛ', '03 / РАСПРЕДЕЛЕНИЕ МОЩНОСТИ', 2, 3.03, -2.7, 2.8, 0.28);
    // Panel seals, hinge pins, bolts and a concrete base, all against the existing collider.
    this.box(g, this.paleBrick, 2, 0.12, -5, 5.08, 0.24, 4.08);
    for (const x of [-0.18, 4.17]) for (const y of [0.62, 2.76]) {
      const bolt = part(g, new THREE.CylinderGeometry(0.035, 0.035, 0.025, 6), m.oldSteel, x, y, -2.67);
      bolt.rotation.x = Math.PI / 2;
    }
    for (const x of [-0.05, 3.99]) for (const y of [0.87, 2.4]) {
      part(g, new THREE.CylinderGeometry(0.045, 0.045, 0.19, 10), m.fadedPaint, x, y, -2.69);
    }
    this.pipe(g, [[4.37, 2.7, -2.95], [4.67, 2.66, -2.95], [4.67, 0.3, -2.95], [5.2, 0.09, -3.4]], 0.035, this.rubber);
    for (const z of [-11, -13.4, -15.5]) {
      this.box(g, m.darkSteel, -14.06, 1.8, z, 0.045, 0.9, 1.35);
      for (let i = 0; i < 9; i++) this.box(g, m.oldSteel, -14.1, 1.42 + i * 0.09, z, 0.08, 0.035, 1.26);
    }
    // The maintenance shed receives side glazing, door seals and wooden cargo battens.
    for (const x of [19.8, 26.2]) {
      this.box(g, m.darkSteel, x, 2.2, 15.88, 1.45, 1.25, 0.08);
      this.box(g, m.glass, x, 2.2, 15.82, 1.29, 1.08, 0.03);
      this.box(g, m.oldSteel, x, 2.2, 15.79, 0.045, 1.15, 0.04);
    }
    for (const z of [17, 20.5]) this.pipe(g, [[27.65, 3.7, z], [27.72, 3.35, z], [27.72, 0.15, z]], 0.045);
    this.sign(g, 'ЭЛЕКТРОЦЕХ', 'ЗАЯВКИ ПРИНИМАЕТ СМОТРИТЕЛЬ', 20, 1.19, 15.78, 1.4, 0.4);
  }

  private surveyOffice(): void {
    const g = this.zone('coastal-survey-office'), m = this.m;
    // A new enterable place on the existing quay: a wide doorway and an unobstructed central aisle.
    this.box(g, this.brick, -19, 1.8, 34, 6.4, 3.6, 0.25, true);
    for (const x of [-22.1, -15.9]) {
      this.box(g, this.brick, x, 0.85, 31, 0.22, 1.7, 6, true);
      this.box(g, this.paleBrick, x, 3.27, 31, 0.22, 0.66, 6, true);
      for (const z of [28.2, 30, 32, 33.8]) this.box(g, this.paleBrick, x, 2.32, z, 0.24, 1.26, 0.18, true);
      this.box(g, m.glass, x, 2.32, 31, 0.04, 1.22, 5.7, true);
    }
    for (const x of [-21.1, -16.9]) this.box(g, this.brick, x, 1.8, 28, 2.05, 3.6, 0.25, true);
    this.box(g, this.paleBrick, -19, 3.29, 28, 2.2, 0.62, 0.25, true);
    this.box(g, m.paintedMetal, -19, 3.67, 31, 6.8, 0.15, 6.7, true);
    this.box(g, m.darkSteel, -19, 3.73, 31, 0.12, 0.14, 6.7);
    this.box(g, this.wood, -19, 0.97, 33.22, 4.7, 0.13, 0.88, true, true);
    for (const x of [-20.9, -17.1]) this.box(g, m.oldSteel, x, 0.45, 33.22, 0.08, 0.9, 0.74, true);
    this.box(g, m.darkSteel, -21.47, 1.02, 31.8, 0.7, 2.04, 1.2, true, true);
    for (let y = 0.3; y < 1.9; y += 0.4) {
      this.box(g, m.paintedMetal, -21.08, y, 31.8, 0.07, 0.36, 1.09);
      this.box(g, m.oldSteel, -21.03, y, 31.8, 0.035, 0.045, 0.21);
    }
    this.box(g, m.darkSteel, -17.1, 1.23, 33.2, 0.48, 0.42, 0.3, false, true);
    this.sign(g, 'ОСТАВЬТЕ КАНАЛ ОТКРЫТЫМ', 'ПОСТ БЕРЕГОВОГО НАБЛЮДЕНИЯ', -19, 2.82, 33.85, 3.4, 0.55, Math.PI);
    this.sign(g, 'БЕРЕГОВОЙ ПОСТ', '07 / НАБЛЮДЕНИЕ ЗА ПРИЛИВОМ', -19, 3.31, 27.85, 2.8, 0.38, Math.PI);
    const chart = part(g, new THREE.PlaneGeometry(1.2, 0.55), labelMaterial('22:16  →  ШКОЛА', 'ПЕЛЕНГ 000°  /  СИГНАЛ ПОВТОРЯЕТСЯ'), -19, 1.043, 33.1);
    chart.rotation.x = -Math.PI / 2;
    this.box(g, m.amberSignal, -19, 3.43, 31, 1.1, 0.04, 0.13);
    const light = new THREE.PointLight(0xe6c79e, 7, 7, 2);
    light.position.set(-19, 3.24, 31); g.add(light);
    this.pipe(g, [[-17.1, 1.3, 33.3], [-16.5, 1.23, 33.75], [-16.5, 3.8, 33.85]], 0.018, this.rubber);
    this.pipe(g, [[-16.5, 3.8, 33.85], [-16.5, 5.7, 33.85]], 0.022, m.oldSteel);
  }

  private school(): void {
    const g = this.zone('school-exterior-and-corridor'), m = this.m;
    // A roof with clerestory glazing closes the formerly open corridor silhouette.
    for (const x of [-3.6, 3.6]) this.box(g, m.paintedMetal, x, 4.51, -77, 4, 0.18, 34, true);
    this.box(g, m.glass, 0, 4.53, -77, 3.2, 0.06, 34, true);
    for (let z = -61; z > -94; z -= 3.9) this.box(g, m.oldSteel, 0, 4.6, z, 11.5, 0.13, 0.1);
    for (const x of [-5.55, 5.55]) {
      this.box(g, this.paleBrick, x, 2.12, -77, 0.15, 4.24, 34);
      this.box(g, this.brick, x * 1.013, 0.68, -77, 0.08, 1.36, 34);
      for (let z = -63; z > -93; z -= 5.5) {
        this.box(g, m.darkSteel, x * 1.014, 2.85, z, 0.06, 1.28, 2.25);
        this.box(g, m.glass, x * 1.022, 2.85, z, 0.025, 1.1, 2.07);
        this.box(g, m.oldSteel, x * 1.026, 2.85, z, 0.025, 1.17, 0.055);
      }
    }
    this.sign(g, 'ШКОЛА № 17', 'ГОРОД ПОМНИТ НАШИ ГОЛОСА', 0, 3.44, -60.348, 5.2, 0.65);
    // Notice boards, class numbers and radiators sit in the gaps between existing lockers.
    for (const x of [-5.11, 5.11]) {
      const facing = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      for (const [index, z] of [-69, -78, -87].entries()) {
        this.sign(g, `${index + 1} / КЛАСС`, 'ПОСЛЕ УРОКОВ — ДОМОЙ', x, 2.73, z, 0.56, 0.21, facing);
      }
      for (const z of [-62.2, -91.8]) {
        this.box(g, this.wood, x, 2.04, z, 0.12, 1.35, 1.8);
        this.sign(g, z > -80 ? 'НАШ ГОРОД' : 'ОБЪЯВЛЕНИЕ', z > -80 ? 'ВЫСТАВКА ДЕТСКИХ РИСУНКОВ' : 'ЭВАКУАЦИЯ  /  22:00', x * 0.985, 2.04, z, 1.58, 1.1, facing);
      }
      for (let i = 0; i < 12; i++) {
        this.box(g, m.fadedPaint, x * 0.95, 0.95, -62 + i * 0.11, 0.22, 0.74, 0.075, false, true);
      }
    }
    // Terrazzo joints and chipped wall paint are flush; no new central obstacles.
    for (let z = -60; z > -94; z -= 1.2) this.box(g, m.oldSteel, 0, 0.459, z, 10.35, 0.005, 0.012);
    for (const x of [-2.8, 2.8]) this.box(g, m.fadedPaint, x, 0.462, -77, 0.055, 0.006, 33.6);
  }

  private coast(): void {
    const g = this.zone('quay-foundations-and-breakwater'), m = this.m;
    for (const f of HARBOR_FLOORS) {
      this.box(g, this.paleBrick, f.x, -1.1, f.z, f.width - 0.05, 1.85, f.depth - 0.05);
    }
    // Offshore rock shelves frame the harbor; they stay beyond the physical quay boundaries.
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const rocks = new THREE.InstancedMesh(geometry, surfaceMaterial('concrete', 0x586061), 112);
    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i < 112; i++) {
      const side = i < 56 ? -1 : 1, n = i % 56;
      p.set(side * (65 + Math.sin(n * 0.63) * 4 + (n % 3) * 3), -0.75 + (n % 7) * 0.24, 57 - n * 2.7);
      s.set(3 + n % 4, 1.2 + n % 3 * 0.55, 2.4 + n % 5 * 0.5);
      q.setFromEuler(new THREE.Euler(n * 0.07, n * 2.13, 0.15));
      matrix.compose(p, q, s); rocks.setMatrixAt(i, matrix);
    }
    rocks.name = 'offshore-rock-breakwaters'; rocks.receiveShadow = true; g.add(rocks);
    // Expansion plates, dark drainage channels and mooring rings on the exposed quay.
    for (const x of [-32.8, 32.8]) {
      for (let z = 12; z < 44; z += 5) {
        this.box(g, this.rubber, x, 0.016, z, 0.38, 0.018, 0.7);
        for (let i = 0; i < 8; i++) this.box(g, m.oldSteel, x, 0.03, z - 0.3 + i * 0.085, 0.34, 0.015, 0.035);
        const ring = part(g, new THREE.TorusGeometry(0.18, 0.035, 6, 16), m.rust, x, 0.16, z + 1);
        ring.rotation.y = Math.PI / 2;
      }
    }
  }
}
