import assert from 'node:assert/strict';
import { before, test, type TestContext } from 'node:test';
import { Window } from 'happy-dom';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GameWorld } from '../src/game/World';
import { HarborDistrict } from '../src/world/HarborDistrict';
import { WorldDetailPass } from '../src/world/WorldDetailPass';
import { MysteryAtmosphere } from '../src/world/MysteryAtmosphere';
import { SchoolReconstruction } from '../src/game/SchoolReconstruction';
import { BridgeArchiveTerminal } from '../src/game/BridgeArchiveTerminal';
import { createDefaultStoryState } from '../src/game/StoryState';
import { SaveSystem } from '../src/game/SaveSystem';
import { DialogueSystem } from '../src/game/DialogueSystem';
import { WarehouseFarewell } from '../src/game/WarehouseFarewell';
import { WarehouseCutoff } from '../src/ui/WarehouseCutoff';
import { Hud } from '../src/ui/Hud';
import type { InputController } from '../src/game/InputController';
import { TraversalSafety, canEnterSchool } from '../src/game/TraversalSafety';
import { openingStory, warehouseStory, endingStory, commitEnding, chapterObjective, type EndingChoice } from '../src/game/MysteryStory';
import { fieldOfView } from '../src/game/SettingsStore';
import { FirstPersonCamera } from '../src/game/FirstPersonCamera';
import { speechBeats } from '../src/game/VoiceImitation';

let Player: typeof import('../src/game/PlayerController').PlayerController;
let Energy: typeof import('../src/game/EnergySystem').EnergySystem;
before(async () => {
  const window = new Window(); Object.assign(globalThis, { window, localStorage: window.localStorage });
  await RAPIER.init();
  Player = (await import('../src/game/PlayerController')).PlayerController;
  Energy = (await import('../src/game/EnergySystem')).EnergySystem;
});

function dom(t: TestContext) {
  const window = new Window({ url: 'http://localhost/' });
  Object.assign(globalThis, { window, document: window.document, localStorage: window.localStorage });
  t.after(() => window.happyDOM.abort());
  return window;
}

for (const ending of ['seal', 'transmit'] as EndingChoice[]) test(`complete mystery chapter: real route, cutoff, school clues, return and ${ending}`, t => {
  const window = dom(t), physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  t.after(() => physics.free());
  const story = createDefaultStoryState(), energy = new Energy(), saves = new SaveSystem();
  const hud = new Hud(window.document.body as unknown as HTMLElement, energy);
  const dialogue = new DialogueSystem(hud);
  const world = new GameWorld(physics);
  new HarborDistrict(world.scene, physics);
  const school = new SchoolReconstruction(world.scene, physics, dialogue, {
    onEchoHeard: id => { story.schoolEchoesHeard.push(id); },
    onComplete: () => { story.progress.schoolReconstructionCompleted = true; },
  }, world.cameraObstacles);
  new WorldDetailPass(world.scene, physics);
  const atmosphere = new MysteryAtmosphere(world.scene, physics, story);
  const terminal = new BridgeArchiveTerminal(world.scene);
  const player = new Player(physics, world.scene);
  const input = { movement: new THREE.Vector2(), consumeJump: () => false };
  const safety = new TraversalSafety(physics, player, story.progress, () => world.isBridgeReady);
  let rescues = 0;
  energy.onChange = (id, enabled) => { story.energy = energy.activeSystems; world.setPowerState(id, enabled); };
  physics.step(); safety.restore(story.player.position);
  function tick(frames = 1) {
    for (let i = 0; i < frames; i++) {
      player.update(input as unknown as InputController, 0, 1 / 60);
      physics.timestep = 1 / 60; physics.step(); player.syncVisual();
      if (safety.update(1 / 60)) rescues++;
      dialogue.update(1 / 60); school.update(1 / 60, player); world.update(1 / 60);
      atmosphere.update(1 / 60, player.position);
    }
  }
  function drain(choice = 0) {
    for (let n = 0; n < 80; n++) {
      if (!dialogue.isBusy) return;
      tick(20);
      if (dialogue.isChoosing) {
        const buttons = window.document.querySelectorAll<HTMLButtonElement>('.dialogue-choices button');
        assert.ok(buttons[choice], 'missing choice'); buttons[choice].click();
      } else dialogue.nextLine();
    }
    assert.fail('dialogue deadlock');
  }
  function walk(x: number, z: number) {
    const limit = Math.ceil(Math.hypot(x - player.position.x, z - player.position.z) / 2.8 * 60) + 180;
    for (let i = 0; i < limit; i++) {
      input.movement.set(x - player.position.x, player.position.z - z);
      if (input.movement.length() < 0.1) break;
      tick();
    }
    input.movement.set(0, 0); tick(20);
    assert.ok(Math.hypot(x - player.position.x, z - player.position.z) < 0.17, `blocked at ${player.position.toArray()}, goal ${x},${z}`);
  }
  tick(20);
  dialogue.play(openingStory(id => { story.choices.tideOpening = id; })); drain();
  assert.equal(story.choices.tideOpening, 'trace');
  story.progress.lighthousePowered = true; world.unlockLighthouseDoor(); tick(90);
  walk(0, 3); walk(5.7, -1.5);
  assert.equal(energy.toggle('warehouse'), true);
  assert.equal(energy.toggle('lights'), true);
  assert.equal(energy.toggle('bridge'), false, 'power budget must be real');
  walk(5.7, -7.3); walk(8, -7.3);
  dialogue.play(warehouseStory(id => { story.choices.signalApproach = id; }), () => { story.progress.warehouseContacted = true; }); drain();
  walk(5.7, -7.3); walk(5.7, -1.5);
  const cutoff = new WarehouseCutoff(window.document.body as unknown as HTMLElement, () => { assert.ok(farewell.confirm()); }, () => farewell.cancel());
  const farewell = new WarehouseFarewell(story, energy, dialogue, {
    onResponse() {}, onReady: () => cutoff.show(), onCancel: () => cutoff.hide(), onCutoff: () => cutoff.hide(),
  });
  assert.equal(farewell.begin(), true); drain(1);
  assert.equal(energy.isActive('warehouse'), true);
  const hold = window.document.querySelector<HTMLButtonElement>('.cutoff-hold')!;
  hold.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'Enter' })); cutoff.update(1.61);
  assert.equal(story.progress.warehouseFarewellPlayed, true);
  assert.equal(energy.toggle('bridge'), true);
  walk(-2.6, 0); walk(-2.6, -10); walk(0, -14);
  story.progress.bridgeStarted = true; world.startBridge(); tick(200);
  assert.ok(world.isBridgeReady);
  walk(0, -44); walk(0, -59);
  assert.ok(canEnterSchool(player.position, player.grounded, world.isBridgeReady));
  story.progress.schoolEntered = true;
  walk(0, -71);
  assert.ok(school.start()); story.progress.schoolReconstructionStarted = true; drain();
  for (const [x, z, id] of [[-2.8, -67, 'teacher'], [2.6, -72, 'student'], [-0.8, -80, 'young-lev']] as const) {
    walk(x, z); drain(); tick(); drain();
    assert.ok(story.schoolEchoesHeard.includes(id), `missing clue ${id}`);
  }
  assert.match(chapterObjective(story, id => energy.isActive(id)), /КОНЦЕ КОРИДОРА/);
  // Reload a partly completed investigation; no echo is counted twice.
  story.player.position = { ...safety.checkpoint }; saves.save(story);
  const loaded = saves.load()!;
  school.restore(true, loaded.schoolEchoesHeard, false); tick(); drain();
  walk(0, -90.5); drain(); tick(); drain();
  assert.equal(story.progress.schoolReconstructionCompleted, true);
  walk(1.3, -80); walk(1.3, -70); walk(0, -59); walk(1.5, -44);
  assert.ok(player.position.distanceTo(terminal.interactionPosition) < 2.7);
  dialogue.play(endingStory(story, choice => { assert.ok(commitEnding(story, choice)); atmosphere.setEnding(choice); }), () => saves.save(story));
  drain(ending === 'seal' ? 0 : 1);
  assert.equal(saves.load()!.choices.tideEnding, ending);
  assert.equal(commitEnding(story, ending === 'seal' ? 'transmit' : 'seal'), false);
  assert.equal(rescues, 0, 'essential story route must not need a recovery');
  assert.match(chapterObjective(story, id => energy.isActive(id)), /ИССЛЕДОВАТЬ ПОРТ/);
  assert.equal(school.recordClue('announcement'), true, 'missed clue remains available after the ending');
  assert.equal(school.recordClue('announcement'), false, 'optional reading cannot duplicate journal entries');
  assert.equal(story.schoolEchoesHeard.length, 4);
});

test('new choices wait for the player and cannot advance while paused, including Enter', t => {
  const window = dom(t), energy = new Energy();
  const hud = new Hud(window.document.body as unknown as HTMLElement, energy), d = new DialogueSystem(hud);
  let chosen = '';
  d.play([{ kind: 'line', speaker: 'ЛЕВ', text: 'Проверка', duration: 2 }, { kind: 'choice', timeout: 0,
    options: [{ id: 'listen', text: 'Слушать' }], onSelect: id => { chosen = id; } }]);
  d.update(0.5); d.setPaused(true); d.update(100);
  window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'Enter' }));
  assert.equal(d.isChoosing, false);
  d.setPaused(false); d.nextLine(); d.update(300);
  assert.equal(d.isChoosing, true); assert.equal(chosen, '');
  assert.ok(window.document.querySelector('#choiceTimer')!.classList.contains('hidden'));
  d.setPaused(true); window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '1' }));
  window.document.querySelector<HTMLButtonElement>('.dialogue-choices button')!.click();
  assert.equal(chosen, '');
  d.setPaused(false); window.document.querySelector<HTMLButtonElement>('.dialogue-choices button')!.click();
  assert.equal(chosen, 'listen');
});

test('legacy narrative migration keeps choices, routes and discoveries and reopens only the new ending', t => {
  dom(t); const story = createDefaultStoryState();
  story.progress.bridgeStarted = true; story.progress.schoolReconstructionCompleted = true; story.progress.bridgeArchiveTerminalSeen = true;
  story.choices.nikaPromise = 'honest'; story.schoolEchoesHeard = ['teacher', 'student', 'young-lev']; story.energy = ['bridge', 'lights'];
  const { narrativeRevision: _, ...legacy } = story;
  localStorage.setItem('beacon-eclipse.save.v1', JSON.stringify(legacy));
  const saves = new SaveSystem(), loaded = saves.load()!;
  assert.equal(saves.updatedStory, true); assert.equal(loaded.narrativeRevision, 2);
  assert.equal(loaded.progress.schoolReconstructionCompleted, true); assert.equal(loaded.progress.bridgeArchiveTerminalSeen, false);
  assert.equal(loaded.choices.nikaPromise, 'honest'); assert.deepEqual(loaded.schoolEchoesHeard, story.schoolEchoesHeard);
  saves.save(loaded); assert.ok(saves.load()); assert.equal(saves.updatedStory, false);
});

test('slower walking respects analog input, stops promptly, and is consistent at 30/60 Hz', t => {
  dom(t); const distances: number[] = [];
  for (const rate of [30, 60]) for (const amount of [1, 0.5]) {
    const physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    t.after(() => physics.free());
    physics.createCollider(RAPIER.ColliderDesc.cuboid(40, 0.2, 40).setTranslation(0, -0.2, 0));
    const player = new Player(physics, new THREE.Scene(), new THREE.Vector3());
    const input = { movement: new THREE.Vector2(0, amount), consumeJump: () => false };
    const tick = () => { player.update(input as unknown as InputController, 0, 1 / rate); physics.timestep = 1 / rate; physics.step(); player.syncVisual(); };
    for (let i = 0; i < rate * 2; i++) tick();
    const distance = -player.position.z; distances.push(distance);
    assert.ok(distance > amount * 5.1 && distance < amount * 5.7, `pace ${distance}`);
    input.movement.set(0, 0); for (let i = 0; i < rate; i++) tick();
    assert.ok(-player.position.z - distance < 0.19); assert.equal(player.isMoving, false);
  }
  assert.ok(Math.abs(distances[0] - distances[2]) < 0.06);
  assert.ok(Math.abs(distances[1] - distances[3]) < 0.06);
});

test('FOV bounds sanitize old/invalid settings and keep a wide near plane inside the player clearance', t => {
  for (const bad of [undefined, null, '82', NaN, Infinity]) assert.equal(fieldOfView(bad), 68);
  assert.equal(fieldOfView(-10), 50); assert.equal(fieldOfView(120), 90); assert.equal(fieldOfView(82), 82);
  const physics = new RAPIER.World({ x: 0, y: 0, z: 0 }); t.after(() => physics.free());
  const player = physics.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.48).setTranslation(0, 1.05, 0));
  physics.createCollider(RAPIER.ColliderDesc.cuboid(0.1, 2, 4).setTranslation(0.6, 2, 0)); physics.step();
  for (const fov of [50, 68, 90]) for (const aspect of [9 / 19.5, 19.5 / 9, 3]) {
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.06), fp = new FirstPersonCamera(camera, physics, player);
    for (let i = 0; i < 60; i++) fp.update(new THREE.Vector3(), -Math.PI / 2, 0, 1 / 60, true, true);
    const cornerRadius = Math.hypot(0.06, 0.06 * Math.tan(fov * Math.PI / 360), 0.06 * Math.tan(fov * Math.PI / 360) * aspect);
    assert.equal(physics.intersectionWithShape(camera.position, { x: 0, y: 0, z: 0, w: 1 }, new RAPIER.Ball(cornerRadius),
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, player), null);
  }
  assert.deepEqual(speechBeats('ЛЕВ', 'Почему часы стоят?', 3), speechBeats('СВЯЗЬ · ГОЛОС ЛЬВА', 'Почему часы стоят?', 3));
});
