import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { StoryState } from '../game/StoryState';
import type { EndingChoice } from '../game/MysteryStory';
import { cable, consolidate, labelMaterial, part, roundedBox } from './DetailGeometry';

/** Small, readable narrative props. Static pieces are batched per room; no post-process pass. */
export class MysteryAtmosphere {
  readonly root = new THREE.Group();
  private readonly clockHands: THREE.Group[] = [];
  private readonly seaSignal = new THREE.Group();
  private readonly pendulum = new THREE.Group();
  private readonly suspendedDrops: THREE.InstancedMesh;
  private readonly signalMaterial = new THREE.MeshBasicMaterial({ color: 0xb9dad0, transparent: true, opacity: 0.16, depthWrite: false });
  private readonly glow = new THREE.PointLight(0xa9d3c2, 0, 7, 2);
  private ending: EndingChoice | null = null;
  private elapsed = 0;
  private endingElapsed = 0;
  private readonly dropAnchor = new THREE.Vector3(-3, 0, -10.8);
  private eventEnvelope = 0;
  private readonly matrix = new THREE.Matrix4();
  private water: THREE.Object3D | null = null;

  constructor(scene: THREE.Scene, physics: RAPIER.World, private readonly story: StoryState) {
    this.root.name = 'mystery-world-details';
    scene.add(this.root);
    this.water = scene.getObjectByName('harbor-water') ?? null;
    const steel = new THREE.MeshStandardMaterial({ color: 0x485858, roughness: 0.7, metalness: 0.62 });
    const bronze = new THREE.MeshStandardMaterial({ color: 0x887450, roughness: 0.76, metalness: 0.65 });
    const chalk = new THREE.MeshStandardMaterial({ color: 0xc0c3aa, roughness: 0.96 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x182322, roughness: 0.92 });
    const room = (name: string) => { const group = new THREE.Group(); group.name = name; this.root.add(group); return group; };
    const lighthouse = room('watchkeepers-instruments');
    this.clock(lighthouse, new THREE.Vector3(3.82, 2.75, 24.8), -Math.PI / 2, steel, chalk, dark);
    const tideChart = part(lighthouse, new THREE.PlaneGeometry(1.4, 0.46), labelMaterial('НУЛЕВОЙ ПРИЛИВ', 'НЕ ОТВЕЧАТЬ ПОСЛЕ ВОСЬМОГО'), 3.83, 1.93, 24.8);
    tideChart.rotation.y = -Math.PI / 2;
    // An old needle instrument and a suspended weight give the starting room motion.
    this.pendulum.position.set(3.75, 3.32, 26);
    part(this.pendulum, new THREE.CylinderGeometry(0.009, 0.009, 0.66, 6), bronze, 0, -0.33, 0);
    part(this.pendulum, new THREE.SphereGeometry(0.055, 12, 8), bronze, 0, -0.69, 0);
    lighthouse.add(this.pendulum);
    cable(lighthouse, dark, [[3.72, 1.8, 24.7], [3.7, 1.2, 25.1], [3.7, 0.5, 25.1]], 0.014);

    const school = room('watchkeepers-school-evidence');
    this.clock(school, new THREE.Vector3(2.25, 3.32, -60.62), 0, steel, chalk, dark);
    const cluePanels = [
      { x: -3.78, z: -67, angle: Math.PI / 2, number: '01 / ВОСЕМЬ', caption: 'ВОДА СЛУШАЕТ. НЕ НАЗЫВАЙ СЕБЯ.' },
      { x: 3.78, z: -72, angle: -Math.PI / 2, number: '02 / ПУСТОЙ КОЛОКОЛ', caption: 'ЯЗЫК СНЯТ. ЗВУК ОСТАЛСЯ.' },
      { x: -3.78, z: -80, angle: Math.PI / 2, number: '03 / ЗАМКНУТЬ КОНТУР', caption: 'МАЯК → СКЛАД → ШКОЛА → МОСТ' },
      { x: 3.78, z: -87, angle: -Math.PI / 2, number: '04 / ОТКРЫТОЕ МОРЕ', caption: 'ЕСЛИ ПЕРЕДАШЬ — ТЕБЯ УСЛЫШАТ.' },
    ];
    for (const panel of cluePanels) {
      const frame = new THREE.Group(); frame.position.set(panel.x, 1.94, panel.z); frame.rotation.y = panel.angle;
      school.add(frame);
      part(frame, roundedBox(1.1, 0.64, 0.055), bronze);
      part(frame, new THREE.BoxGeometry(0.045, 1.7, 0.045), steel, 0, -1.05, -0.03);
      part(frame, new THREE.BoxGeometry(0.5, 0.035, 0.22), steel, 0, -1.465, -0.03);
      part(frame, new THREE.PlaneGeometry(1.03, 0.57), labelMaterial(panel.number, panel.caption, '#d0cab0', '#26322d'), 0, 0, 0.031);
      for (const x of [-0.5, 0.5]) for (const y of [-0.27, 0.27]) part(frame, new THREE.SphereGeometry(0.015, 6, 4), steel, x, y, 0.04);
      for (let i = 0; i < 8; i++) part(frame, new THREE.BoxGeometry(0.015, 0.09, 0.006), chalk, -0.31 + i * 0.09, -0.48, 0.028);
    }
    // Real empty bell on the facade. Its mouth is visibly hollow; there is no clapper.
    const profile = [[0.05, 0.32], [0.18, 0.26], [0.22, 0.1], [0.26, -0.15], [0.42, -0.31], [0.44, -0.37], [0.36, -0.36], [0.21, -0.1], [0.12, 0.24]];
    const bell = part(school, new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 32), bronze, -2.25, 2.74, -60.35);
    bell.name = 'bell-without-clapper';
    part(school, roundedBox(0.1, 0.74, 0.12), steel, -2.25, 3.42, -60.35);
    physics.createCollider(RAPIER.ColliderDesc.cuboid(0.45, 0.39, 0.45).setTranslation(-2.25, 2.74, -60.35));
    // Dry footprints stop in front of the wall, with no obstacle across the corridor.
    const tracks = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.105, 0.27), chalk, 32);
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    for (let i = 0; i < tracks.count; i++) {
      this.matrix.compose(new THREE.Vector3((i % 2 ? 0.19 : -0.19) + Math.sin(i * 0.2) * 0.22, 0.455, -61.7 - i * 0.84), rotation, new THREE.Vector3(1, 1, 1));
      tracks.setMatrixAt(i, this.matrix);
    }
    tracks.name = 'dry-footprints'; school.add(tracks);

    const coast = room('tidal-gauges');
    for (const x of [-6.8, 6.8]) {
      part(coast, new THREE.BoxGeometry(0.22, 2.3, 0.08), chalk, x, -0.15, -17.8);
      for (let i = 0; i < 15; i++) part(coast, new THREE.BoxGeometry(i % 5 ? 0.07 : 0.18, 0.014, 0.09), dark, x, -1.12 + i * 0.14, -17.75);
    }
    part(coast, new THREE.PlaneGeometry(1.3, 0.4), labelMaterial('НИКА / НИЖНИЙ КАНАЛ', 'НЕ ОСТАВЛЯТЬ ПЕРЕДАЧУ ОТКРЫТОЙ'), 8, 1.95, -8.43);
    // The distant answer is visual only, beyond all navigable surfaces.
    this.seaSignal.position.set(39, 0.04, -59);
    this.seaSignal.visible = false;
    for (let i = 0; i < 3; i++) {
      const ring = part(this.seaSignal, new THREE.TorusGeometry(1.5 + i * 0.8, 0.024, 6, 64), this.signalMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = i * 0.03;
    }
    const beam = part(this.seaSignal, new THREE.CylinderGeometry(0.07, 0.3, 13, 12, 1, true), this.signalMaterial, 0, 6.5, 0);
    beam.castShadow = false;
    this.root.add(this.seaSignal);

    this.suspendedDrops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 5, 4), this.signalMaterial, 24);
    this.suspendedDrops.name = 'upward-drops';
    this.root.add(this.suspendedDrops);
    this.glow.position.set(8, 1.7, -7.6); this.root.add(this.glow);
    [lighthouse, school, coast].forEach(group => consolidate(group));
    this.root.traverse(object => {
      if (object instanceof THREE.Mesh) object.castShadow = false;
    });
    const ending = story.choices.tideEnding;
    if (ending === 'seal' || ending === 'transmit') this.setEnding(ending);
    this.update(0, new THREE.Vector3(0, 0, 24));
  }

  pulse(_event: 'arrival' | 'cutoff'): void { this.eventEnvelope = 1; }
  setEnding(ending: EndingChoice): void {
    this.ending = ending; this.endingElapsed = 0;
    this.seaSignal.visible = ending === 'transmit';
  }

  update(dt: number, position: THREE.Vector3): void {
    this.elapsed += dt;
    if (this.ending) this.endingElapsed += dt;
    this.eventEnvelope = Math.max(0, this.eventEnvelope - dt / 4);
    this.glow.intensity = Math.sin(this.eventEnvelope * Math.PI) * 2.5;
    const running = this.ending === 'seal';
    if (this.water) this.water.position.y = THREE.MathUtils.damp(this.water.position.y, running ? -0.44 : -0.16, 0.2, dt);
    for (const hand of this.clockHands) hand.rotation.z = -Math.PI * 2 * (47 / 60 + (running ? this.endingElapsed / 3600 + 1 / 60 : 0));
    this.pendulum.rotation.x = Math.sin(this.elapsed * 1.7) * (running ? 0.025 : 0.1);
    this.seaSignal.rotation.y = this.elapsed * 0.035;
    this.signalMaterial.opacity = 0.15 + Math.sin(this.elapsed * 0.7) * 0.035;
    this.suspendedDrops.visible = !running && this.story.energy.includes('pumps') && position.distanceToSquared(this.dropAnchor) < 144;
    if (this.suspendedDrops.visible) for (let i = 0; i < this.suspendedDrops.count; i++) {
      this.matrix.makeTranslation(-3 + Math.sin(i * 7.1) * 0.8, 0.08 + ((i * 0.087 + this.elapsed * 0.13) % 1.8), -10.8 + Math.cos(i * 4.7) * 0.7);
      this.suspendedDrops.setMatrixAt(i, this.matrix);
    }
    this.suspendedDrops.instanceMatrix.needsUpdate = this.suspendedDrops.visible;
  }

  private clock(parent: THREE.Group, position: THREE.Vector3, yaw: number, rim: THREE.Material, face: THREE.Material, ink: THREE.Material): void {
    const root = new THREE.Group(); root.position.copy(position); root.rotation.y = yaw; parent.add(root);
    const bezel = part(root, new THREE.TorusGeometry(0.31, 0.034, 8, 40), rim);
    bezel.name = 'stopped-clock';
    part(root, new THREE.CircleGeometry(0.306, 40), face, 0, 0, -0.009);
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      const tick = part(root, new THREE.BoxGeometry(0.012, i % 3 ? 0.03 : 0.05, 0.006), ink, Math.sin(angle) * 0.26, Math.cos(angle) * 0.26, 0.006);
      tick.rotation.z = -angle;
    }
    const hour = new THREE.Group(); hour.rotation.z = -Math.PI * 2 * (10.8 / 12); root.add(hour);
    part(hour, new THREE.BoxGeometry(0.021, 0.16, 0.008), ink, 0, 0.055, 0.02);
    const minute = new THREE.Group(); root.add(minute); this.clockHands.push(minute);
    part(minute, new THREE.BoxGeometry(0.011, 0.24, 0.008), ink, 0, 0.09, 0.023);
    part(root, new THREE.SphereGeometry(0.021, 8, 6), rim, 0, 0, 0.026);
  }
}
