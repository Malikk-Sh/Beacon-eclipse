import assert from 'node:assert/strict';
import { before, test, type TestContext } from 'node:test';
import { Window } from 'happy-dom';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GameWorld } from '../src/game/World';
import { SchoolArea } from '../src/world/areas/SchoolArea';
import { HarborDistrict } from '../src/world/HarborDistrict';
import { MysteryAtmosphere } from '../src/world/MysteryAtmosphere';
import { WorldDetailPass } from '../src/world/WorldDetailPass';
import { InputController } from '../src/game/InputController';
import { SaveSystem } from '../src/game/SaveSystem';
import { createDefaultStoryState } from '../src/game/StoryState';
import { TraversalSafety, canEnterSchool } from '../src/game/TraversalSafety';

let Player: typeof import('../src/game/PlayerController').PlayerController;
before(async () => {
  const window = new Window();
  Object.assign(globalThis, { window, localStorage: window.localStorage });
  await RAPIER.init();
  Player = (await import('../src/game/PlayerController')).PlayerController;
});

function fixture(t: TestContext, bridge = true) {
  const physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  t.after(() => physics.free());
  const world = new GameWorld(physics);
  new HarborDistrict(world.scene, physics);
  world.unlockLighthouseDoor(true);
  if (bridge) world.startBridge(true);
  new SchoolArea(new THREE.Group(), physics, new THREE.Vector3(0, 0, -60));
  new WorldDetailPass(world.scene, physics);
  const state = createDefaultStoryState();
  new MysteryAtmosphere(world.scene, physics, state);
  state.progress.lighthousePowered = true;
  state.progress.bridgeStarted = bridge;
  const player = new Player(physics, world.scene, new THREE.Vector3(0, 0.02, 3));
  const input = { movement: new THREE.Vector2(), jump: false, consumeJump() { const j = this.jump; this.jump = false; return j; } };
  const safety = new TraversalSafety(physics, player, state.progress, () => world.isBridgeReady);
  let rescues = 0;
  function tick(frames = 1, withSafety = true) {
    for (let i = 0; i < frames; i++) {
      player.update(input as unknown as InputController, 0, 1 / 60);
      physics.timestep = 1 / 60;
      physics.step();
      player.syncVisual();
      if (withSafety && safety.update(1 / 60)) rescues++;
    }
  }
  physics.step();
  safety.restore(player.position);
  tick(30);
  function walk(x: number, z: number) {
    const maxFrames = Math.ceil(Math.hypot(x - player.position.x, z - player.position.z) / 2.8 * 60) + 180;
    for (let i = 0; i < maxFrames; i++) {
      input.movement.set(x - player.position.x, player.position.z - z);
      if (input.movement.length() < 0.1) break;
      tick();
    }
    input.movement.set(0, 0);
    tick(20);
    assert.ok(Math.hypot(x - player.position.x, z - player.position.z) < 0.16,
      `route blocked: goal ${x},${z}; actual ${player.position.toArray()}`);
  }
  return { world, physics, state, player, input, safety, tick, walk, rescues: () => rescues };
}

test('walk from lighthouse, past distributor, up ramp and across deployed bridge into school without jumping', (t) => {
  const s = fixture(t);
  s.player.setPosition(new THREE.Vector3(0, 0.02, 24));
  s.walk(0, 3);
  s.walk(-2.6, 0);
  s.walk(-2.6, -10);
  s.walk(0, -14);
  s.walk(0, -22);
  assert.ok(s.player.position.y > 0.4);
  s.walk(0, -44);
  s.walk(0, -59);
  assert.equal(canEnterSchool(s.player.position, s.player.grounded, s.world.isBridgeReady), true);
  assert.equal(s.rescues(), 0);
  s.walk(1.3, -73);
  s.walk(1.3, -70);
  s.walk(0, -12);
  assert.equal(s.rescues(), 0, 'the return route must also be continuous');
});

test('jump lifts Lev, cannot be repeated in air, and lands on the real ground', (t) => {
  const s = fixture(t);
  const start = s.player.position.y;
  s.input.jump = true;
  s.tick();
  assert.equal(s.player.grounded, false);
  let maxY = s.player.position.y;
  for (let i = 0; i < 85; i++) {
    if (i === 16) s.input.jump = true;
    s.tick();
    maxY = Math.max(maxY, s.player.position.y);
  }
  assert.ok(maxY > start + 1 && maxY < start + 1.3, `jump height ${maxY - start}`);
  assert.equal(s.player.grounded, true);
  assert.ok(Math.abs(s.player.position.y - start) < 0.03);
});

test('the raised bridge gate still blocks the ramp, including a jump', (t) => {
  const s = fixture(t, false);
  s.player.setPosition(new THREE.Vector3(0, 0.02, -14));
  s.tick(20);
  s.input.movement.set(0, 1);
  s.tick(45);
  s.input.jump = true;
  s.tick(100);
  assert.ok(s.player.position.z > -17.6);
  assert.equal(s.rescues(), 0);
});

test('falling into the channel returns to last supported position and cannot mark school entered', (t) => {
  const s = fixture(t);
  s.walk(-2.6, -10);
  const safe = s.safety.checkpoint.clone();
  s.player.setPosition(new THREE.Vector3(10, -0.3, -57));
  assert.equal(canEnterSchool(s.player.position, false, true), false);
  s.tick(90);
  assert.equal(s.rescues(), 1);
  assert.ok(s.player.position.distanceTo(safe) < 0.1);
  assert.equal(s.player.grounded, true);
});

test('checkpoint remains on the ground throughout a jump, pause/save and browser reload', (t) => {
  const s = fixture(t);
  const safe = s.safety.checkpoint.clone();
  s.input.jump = true;
  s.tick(15);
  assert.ok(s.player.position.y > 0.8);
  assert.ok(s.safety.checkpoint.distanceTo(safe) < 0.01);
  s.state.player.position = { ...s.safety.checkpoint };
  const saves = new SaveSystem();
  saves.save(s.state);
  const loaded = saves.load()!;
  assert.equal(s.safety.restore(loaded.player.position), false);
  s.input.movement.set(0, 0);
  s.tick(30);
  assert.equal(s.player.grounded, true);
});

test('legacy void save is repaired while preserving school, energy, dialogue choices and response profile', (t) => {
  const s = fixture(t);
  s.state.progress.schoolEntered = true;
  s.state.player.position = { x: 0, y: -7000, z: -62 };
  s.state.energy = ['bridge', 'lights'];
  s.state.choices.introMemory = 'mara';
  s.state.responseProfile.vulnerable = 3;
  const saves = new SaveSystem();
  saves.save(s.state);
  const loaded = saves.load()!;
  assert.equal(saves.repairedPosition, true);
  assert.deepEqual(loaded.player.position, { x: 0, y: 0.47, z: -59 });
  assert.equal(loaded.choices.introMemory, 'mara');
  assert.equal(loaded.responseProfile.vulnerable, 3);
  assert.deepEqual(loaded.energy, ['bridge', 'lights']);
  assert.equal(s.safety.restore(loaded.player.position), false);
  s.tick(30);
  assert.equal(s.player.grounded, true);
});

test('finite legacy positions inside machinery or over water are rejected by physical support and clearance checks', (t) => {
  const s = fixture(t);
  assert.equal(s.safety.restore({ x: 2, y: 0, z: -5 }), true);
  assert.equal(s.safety.restore({ x: 20, y: 0, z: -30 }), true);
  assert.equal(s.safety.restore({ x: NaN, y: 0, z: 0 }), true);
  assert.ok(s.safety.checkpoint.distanceTo(new THREE.Vector3(0, 0.02, 3)) < 0.05);
});

test('school arrival requires a deployed bridge, grounded stance and school floor height', () => {
  for (const y of [-4, -0.5, 1.4, 3]) assert.equal(canEnterSchool({ x: 0, y, z: -59 }, true, true), false);
  assert.equal(canEnterSchool({ x: 0, y: 0.45, z: -59 }, false, true), false);
  assert.equal(canEnterSchool({ x: 0, y: 0.45, z: -59 }, true, false), false);
  assert.equal(canEnterSchool({ x: 0, y: 0.45, z: -59 }, true, true), true);
});

test('Space and touch request one jump; repeat, blur and disabled input do not retain queued actions', async (t) => {
  const window = new Window();
  t.after(() => window.happyDOM.abort());
  Object.assign(globalThis, { window, localStorage: window.localStorage, addEventListener: window.addEventListener.bind(window) });
  const element = () => window.document.createElement('div') as unknown as HTMLElement;
  const jump = window.document.createElement('button') as unknown as HTMLButtonElement;
  const input = new InputController(element(), element(), element(), jump);
  window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'Space' }));
  assert.equal(input.consumeJump(), true);
  assert.equal(input.consumeJump(), false);
  window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'Space', repeat: true }));
  assert.equal(input.consumeJump(), false);
  jump.click();
  assert.equal(input.consumeJump(), true);
  jump.click();
  input.setEnabled(false);
  input.setEnabled(true);
  assert.equal(input.consumeJump(), false);
  jump.click();
  window.dispatchEvent(new window.Event('blur'));
  assert.equal(input.consumeJump(), false);
});


test('both optional piers and the ferry shelter are reachable and allow returning to the main route', (t) => {
  const s = fixture(t);
  s.walk(-30, 0);
  s.walk(-32, 5);
  s.walk(-50, 5);
  s.walk(-50, -5);
  s.walk(-50, 5);
  s.walk(-32, 5);
  s.walk(-30, 0);
  s.walk(10, 0);
  s.walk(31, 0);
  s.walk(32, 2);
  s.walk(47, 2);
  s.walk(47, -3);
  s.walk(45, -3);
  s.walk(45, -14);
  s.walk(45, -3);
  s.walk(47, -3);
  s.walk(47, 2);
  s.walk(32, 2);
  s.walk(10, 0);
  s.walk(5.7, -1.5);
  s.walk(5.7, -7.3);
  s.walk(8, -7.3);
  assert.equal(s.rescues(), 0);
});

test('the optional pallet needs a jump, supports a landing and can be walked off safely', (t) => {
  const s = fixture(t);
  s.player.setPosition(new THREE.Vector3(12, 0.02, 9));
  s.tick(20);
  s.input.movement.set(0, 1);
  s.tick(30);
  assert.ok(s.player.position.z > 8.1);
  s.input.jump = true;
  s.tick(27);
  s.input.movement.set(0, 0);
  s.tick(65);
  assert.ok(s.player.position.y > 0.5);
  assert.equal(s.player.grounded, true);
  s.walk(12, 4.2);
  assert.ok(s.player.position.y < 0.1);
  assert.equal(s.rescues(), 0);
});
