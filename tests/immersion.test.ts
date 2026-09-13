import assert from 'node:assert/strict';
import { before, test, type TestContext } from 'node:test';
import { Window } from 'happy-dom';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { DroneNavigation } from '../src/game/DroneNavigation';
import { FirstPersonCamera } from '../src/game/FirstPersonCamera';
import { cameraBox } from '../src/game/ThirdPersonCamera';
import { LevVisual } from '../src/game/LevVisual';
import { SoykaVisual } from '../src/game/SoykaVisual';
import { WorldDetailPass } from '../src/world/WorldDetailPass';
import { DialogueSystem } from '../src/game/DialogueSystem';
import { speechBeats, type DialogueVoice } from '../src/game/VoiceImitation';
import { InputController } from '../src/game/InputController';
import type { Hud } from '../src/ui/Hud';

before(async () => { await RAPIER.init(); });
const rotation = { x: 0, y: 0, z: 0, w: 1 };

function fixture(t: TestContext) {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  t.after(() => world.free());
  const player = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.48).setTranslation(0, 1, 0));
  const box = (x: number, y: number, z: number, hx: number, hy: number, hz: number) => {
    const collider = world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z));
    world.step(); return collider;
  };
  box(0, -0.15, 0, 25, 0.15, 25);
  return { world, player, box };
}

function fly(nav: DroneNavigation, goal: THREE.Vector3, seconds = 7, rate = 60): void {
  for (let i = 0; i < seconds * rate; i++) {
    const previous = nav.position.clone();
    nav.update(goal, 1 / rate);
    assert.ok(nav.isClear(nav.position), `drone overlaps at ${nav.position.toArray()}`);
    assert.ok(nav.canTravel(previous, nav.position), 'swept body crossed an obstacle');
    assert.ok(nav.position.distanceTo(previous) <= 6.31 / rate, 'drone teleported');
  }
}

test('Soyka routes around a wall at companion height with every movement swept', t => {
  const s = fixture(t);
  s.box(0, 3, 0, 2.5, 3, 0.12);
  const nav = new DroneNavigation(s.world, s.player);
  nav.reset(new THREE.Vector3(0, 0, 4));
  const goal = new THREE.Vector3(0, 1.65, -4);
  fly(nav, goal, 12);
  assert.ok(nav.position.distanceTo(goal) < 0.12, `failed to turn corner: ${nav.position.toArray()}`);
});

test('Soyka fits through the actual lighthouse doorway and respects a closed door', t => {
  const s = fixture(t);
  s.box(-3, 2, 0, 1.975, 2, 0.15);
  s.box(3, 2, 0, 1.975, 2, 0.15);
  s.box(0, 3.6, 0, 1.025, 0.55, 0.15);
  // Side walls and a roof prevent an artificial escape around the whole room.
  s.box(-5, 2, 0, 0.15, 2, 12); s.box(5, 2, 0, 0.15, 2, 12);
  s.box(0, 4.1, 0, 5, 0.1, 12);
  const door = s.box(0, 1.52, 0, 1.02, 1.52, 0.14);
  const nav = new DroneNavigation(s.world, s.player);
  nav.reset(new THREE.Vector3(0, 0, 3));
  const goal = new THREE.Vector3(-1.2, 1.67, -3);
  fly(nav, goal, 3);
  assert.ok(nav.position.z > 0.6, 'closed door was bypassed');
  s.world.removeCollider(door, true); s.world.step();
  fly(nav, goal, 10);
  assert.ok(nav.position.distanceTo(goal) < 0.12, `doorway blocked at ${nav.position.toArray()}`);
});

test('Soyka respects visual overhead envelopes and follows at comparable 30/60 Hz timing', t => {
  const results: THREE.Vector3[] = [];
  for (const rate of [30, 60]) {
    const s = fixture(t);
    const roof = cameraBox(new THREE.Vector3(0, 3, 0), 30, 0.2, 30);
    const nav = new DroneNavigation(s.world, s.player, [roof]);
    nav.reset(new THREE.Vector3(0, 0, 2));
    assert.equal(nav.canTravel(nav.position, new THREE.Vector3(0, 5, 2)), false);
    fly(nav, new THREE.Vector3(4, 1.65, 2), 1, rate);
    results.push(nav.position.clone());
    fly(nav, new THREE.Vector3(0, 5, 2), 3, rate);
    assert.ok(nav.position.y < 2.43, 'drone passed through the visual ceiling');
  }
  assert.ok(results[0].distanceTo(results[1]) < 0.12);
});

test('first-person eye follows stairs/recovery immediately and yaw/pitch keep the expected directions', t => {
  const s = fixture(t);
  const camera = new THREE.PerspectiveCamera(68, 19.5 / 9, 0.06, 500);
  const fp = new FirstPersonCamera(camera, s.world, s.player);
  const p = new THREE.Vector3(2, 0.45, -70);
  fp.update(p, Math.PI / 2, 0, 1 / 60);
  assert.ok(camera.position.distanceTo(new THREE.Vector3(2, 2.13, -70)) < 1e-6);
  assert.ok(camera.getWorldDirection(new THREE.Vector3()).distanceTo(new THREE.Vector3(-1, 0, 0)) < 1e-6);
  fp.update(p, 0, -1.2, 1 / 60);
  assert.ok(camera.getWorldDirection(new THREE.Vector3()).y < -0.9);
  p.set(-12, 1.3, 4); fp.reset(); fp.update(p, 0, 0, 1 / 60, true, true, false);
  assert.ok(camera.position.distanceTo(new THREE.Vector3(-12, 2.98, 4)) < 1e-6);
});

test('head motion is small, clears nearby walls and settles when disabled', t => {
  const s = fixture(t);
  s.box(0.51, 2, 0, 0.1, 2, 8);
  const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.06, 500);
  const fp = new FirstPersonCamera(camera, s.world, s.player);
  const p = new THREE.Vector3(0.24, 0, 0), eye = p.clone().add(new THREE.Vector3(0, 1.68, 0));
  for (let i = 0; i < 180; i++) {
    fp.update(p, 0, 0, 1 / 60, true, true);
    assert.ok(camera.position.distanceTo(eye) < 0.016);
    assert.equal(s.world.intersectionWithShape(camera.position, rotation, new RAPIER.Ball(0.16),
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, s.player), null);
  }
  for (let i = 0; i < 120; i++) fp.update(p, 0, 0, 1 / 60, true, true, false);
  assert.ok(camera.position.distanceTo(eye) < 1e-6);
});

function geometryBudget(root: THREE.Object3D) {
  let draws = 0, triangles = 0;
  root.updateMatrixWorld(true);
  root.traverse(o => {
    for (const n of o.matrixWorld.elements) assert.ok(Number.isFinite(n));
    if (!(o instanceof THREE.Mesh)) return;
    draws++;
    const positions = o.geometry.getAttribute('position');
    for (const n of positions.array) assert.ok(Number.isFinite(n));
    triangles += (o.geometry.index?.count ?? positions.count) / 3 * (o instanceof THREE.InstancedMesh ? o.count : 1);
  });
  return { draws, triangles };
}

test('detailed animated models retain human scale, finite joints and a bounded draw budget', () => {
  const lev = new LevVisual(), soyka = new SoykaVisual();
  for (let i = 0; i < 180; i++) {
    lev.update(1 / 60, i < 100, i < 130, 3, i > 145 ? 0.5 : 0);
    soyka.update(1 / 60, i / 60, 5, 0.6);
  }
  for (const model of [lev.root, soyka.root]) {
    const budget = geometryBudget(model);
    assert.ok(budget.draws <= 90, JSON.stringify(budget));
    assert.ok(budget.triangles < 100000, JSON.stringify(budget));
  }
  lev.update(1 / 60, false, true, 0, 0);
  const bounds = new THREE.Box3().setFromObject(lev.root);
  assert.ok(bounds.max.y > 1.75 && bounds.max.y < 1.94);
  lev.setFirstPerson(true);
  assert.equal(lev.root.getObjectByName('lev-head')!.visible, false);
  assert.equal(lev.root.getObjectByName('lev-backpack')!.visible, false);
  assert.equal(lev.root.visible, true);
  lev.setFirstPerson(false);
  assert.equal(lev.root.getObjectByName('lev-head')!.visible, true);
  // The entire rotating drone must fit its collision sphere, including tools and aerial.
  soyka.root.updateMatrixWorld(true);
  soyka.root.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    const p = o.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) assert.ok(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).length() < 0.48);
  });
});

test('new architecture stays batched and the survey office has a clear entrance and physical walls/roof', t => {
  const s = fixture(t);
  const scene = new THREE.Scene();
  const details = new WorldDetailPass(scene, s.world);
  const budget = geometryBudget(details.root);
  assert.ok(budget.draws < 100, JSON.stringify(budget));
  assert.ok(budget.triangles < 80000, JSON.stringify(budget));
  s.world.step();
  const eye = new THREE.Vector3(-19, 1.65, 26), target = new THREE.Vector3(-19, 1.65, 32);
  const nav = new DroneNavigation(s.world, s.player);
  assert.ok(nav.canTravel(eye, target), 'post entrance is blocked');
  assert.equal(nav.canTravel(target, new THREE.Vector3(-24, 1.65, 32)), false);
  assert.equal(nav.canTravel(target, new THREE.Vector3(-19, 5, 32)), false);
});

test('speech rhythms distinguish voices, preserve punctuation rests and bound long/invalid lines', () => {
  const text = 'Лев, ты меня слышишь? Я всё ещё здесь.';
  const lev = speechBeats('ЛЕВ', text, 4), nika = speechBeats('НИКА', text, 4);
  assert.ok(nika[0].pitch > lev[0].pitch * 1.8);
  const beats = speechBeats('МАРА', 'Да... Да. Да?', 4);
  assert.ok(beats[1].time - beats[0].time > 0.7);
  for (const duration of [0, -1, NaN, Infinity, 0.01]) assert.deepEqual(speechBeats('ЛЕВ', text, duration), []);
  for (const duration of [0.18, 1, 3, 7]) {
    const result = speechBeats('ЛЕВ', text.repeat(70), duration);
    assert.ok(result.length <= Math.max(1, Math.floor(duration * 6)));
    assert.ok(result.every((beat, i) => beat.time < duration && beat.time >= 0 && Number.isFinite(beat.pitch)
      && (i === 0 || beat.time > result[i - 1].time)));
  }
});

test('dialogue stops imitation for choices, replacement and ending; only game updates advance speech', () => {
  const window = new Window(); Object.assign(globalThis, { window });
  const events: string[] = [];
  const voice: DialogueVoice = { startLine: s => { events.push(`start:${s}`); },
    stopLine: () => { events.push('stop'); }, updateLine: () => { events.push('tick'); } };
  const hud = { clearDialogueChoices() {}, hideDialogue() {}, setChoiceProgress() {}, showDialogue() {}, showDialogueChoices() {} } as unknown as Hud;
  const d = new DialogueSystem(hud, voice);
  d.play([{ kind: 'line', speaker: 'МАРА', text: 'Алло', duration: 1 }, { kind: 'choice', options: [], timeout: 1 }]);
  assert.deepEqual(events, ['stop', 'start:МАРА']);
  d.update(1); assert.deepEqual(events.slice(-2), ['tick', 'stop']);
  const ticks = events.filter(x => x === 'tick').length;
  d.update(0.3); assert.equal(events.filter(x => x === 'tick').length, ticks);
  d.play([{ kind: 'line', speaker: 'ЛЕВ', text: 'Да', duration: 1 }]);
  assert.deepEqual(events.slice(-2), ['stop', 'start:ЛЕВ']);
  d.stop(); assert.equal(events.at(-1), 'stop');
  const length = events.length; d.update(2); assert.equal(events.length, length);
});

test('V toggles once; drag look remains available without pointer lock; blur clears queued changes', () => {
  const window = new Window();
  Object.assign(globalThis, { window, addEventListener: window.addEventListener.bind(window) });
  const document = window.document;
  const joystick = document.createElement('div'), stick = document.createElement('div'), canvas = document.createElement('canvas');
  Object.assign(canvas, { setPointerCapture() {}, hasPointerCapture: () => false });
  const input = new InputController(joystick as unknown as HTMLElement, stick as unknown as HTMLElement, canvas as unknown as HTMLElement);
  input.setFirstPerson(true);
  window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'KeyV' }));
  assert.equal(input.consumeCameraToggle(), true); assert.equal(input.consumeCameraToggle(), false);
  window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'KeyV', repeat: true }));
  assert.equal(input.consumeCameraToggle(), false);
  canvas.dispatchEvent(new window.PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', button: 0, clientX: 10, clientY: 10 }));
  canvas.dispatchEvent(new window.PointerEvent('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 40, clientY: 20 }));
  assert.deepEqual(input.consumeLookDelta().toArray(), [30, 10]);
  window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'KeyV' }));
  window.dispatchEvent(new window.Event('blur'));
  assert.equal(input.consumeCameraToggle(), false);
  input.setEnabled(false); window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'KeyV' }));
  assert.equal(input.consumeCameraToggle(), false);
});
