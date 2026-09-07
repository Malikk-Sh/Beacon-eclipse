import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { Window } from 'happy-dom';
import { DialogueSystem } from '../src/game/DialogueSystem';
import type { EnergySystem, EnergySystemName } from '../src/game/EnergySystem';
import { InputController } from '../src/game/InputController';
import { SaveSystem } from '../src/game/SaveSystem';
import { createDefaultStoryState } from '../src/game/StoryState';
import { WarehouseFarewell } from '../src/game/WarehouseFarewell';
import { Hud } from '../src/ui/Hud';
import { WarehouseCutoff } from '../src/ui/WarehouseCutoff';

function setup(t: TestContext) {
  const window = new Window({ url: 'http://localhost/' });
  Object.assign(globalThis, {
    window, document: window.document, localStorage: window.localStorage,
    addEventListener: window.addEventListener.bind(window),
  });
  t.after(() => window.happyDOM.abort());
  return window;
}

function scene(t: TestContext) {
  const window = setup(t);
  const story = createDefaultStoryState();
  story.progress.warehouseContacted = true;
  story.energy = ['warehouse'];
  const switches: EnergySystemName[] = [];
  const saves = new SaveSystem();
  let ready = 0;
  const energy = {
    capacity: 8, available: 4,
    definitions: [{ id: 'warehouse', label: 'СКЛАД 04', cost: 4 }],
    isActive: (id: EnergySystemName) => story.energy.includes(id),
    toggle: (id: EnergySystemName) => {
      switches.push(id);
      story.energy = story.energy.filter((system) => system !== id);
      saves.save(story); // Same synchronous persistence boundary as main.onChange.
      return true;
    },
  };
  const hud = new Hud(window.document.body as unknown as HTMLElement, energy as EnergySystem);
  const dialogue = new DialogueSystem(hud);
  const callbacks = {
    onResponse: () => { saves.save(story); },
    onReady: () => { ready += 1; },
    onCancel: () => {}, onCutoff: () => { saves.save(story); },
  };
  const farewell = new WarehouseFarewell(story, energy, dialogue, callbacks);
  function tick(seconds: number) {
    for (let elapsed = 0; elapsed < seconds; elapsed += 0.02) dialogue.update(0.02);
  }
  function reply(key?: string) {
    tick(8.1);
    assert.equal(window.document.querySelectorAll('.dialogue-choices button').length, 2);
    if (key) window.dispatchEvent(new window.KeyboardEvent('keydown', { key }));
    else tick(5.6);
    tick(4.1);
  }
  return { window, story, energy, switches, saves, callbacks, hud, dialogue, farewell, tick, reply, ready: () => ready };
}

for (const [key, choice, profile] of [
  ['1', 'promise', 'direct'], ['2', 'honest', 'vulnerable'], [undefined, 'silence', 'silent'],
] as const) {
  test(`${choice}: answer/timeout keeps the radio powered; explicit cutoff commits once`, (t) => {
    const s = scene(t);
    assert.equal(s.farewell.begin(), true);
    assert.equal(s.farewell.begin(), false);
    assert.equal(s.farewell.confirm(), false);
    s.reply(key);
    assert.equal(s.ready(), 1);
    assert.deepEqual(s.story.energy, ['warehouse']);
    assert.deepEqual(s.switches, []);
    assert.equal(s.story.choices.nikaPromise, choice);
    assert.equal(s.story.responseProfile[profile], 1);
    assert.equal(s.story.progress.warehouseFarewellPlayed, false);
    assert.equal(s.saves.load()!.progress.warehouseFarewellPlayed, false);
    assert.equal(s.farewell.confirm(), true);
    assert.equal(s.farewell.confirm(), false);
    assert.deepEqual(s.switches, ['warehouse']);
    assert.equal(s.saves.load()!.progress.warehouseFarewellPlayed, true);
    assert.deepEqual(s.saves.load()!.energy, []);
    assert.equal(s.story.progress.bridgeStarted, false);
  });
}

test('cancel before a reply leaves the conversation retryable and does not select silence', (t) => {
  const s = scene(t);
  s.farewell.begin();
  s.tick(2);
  s.farewell.cancel();
  s.tick(30);
  assert.equal(s.dialogue.isBusy, false);
  assert.deepEqual(s.story.choices, {});
  assert.equal(s.ready(), 0);
  assert.deepEqual(s.switches, []);
  assert.equal(s.farewell.begin(), true);
});

test('cancel/reload after a reply preserves it without replay or double counting', (t) => {
  const s = scene(t);
  s.farewell.begin();
  s.reply('2');
  s.farewell.cancel();
  assert.equal(s.farewell.begin(), true);
  assert.equal(s.dialogue.isBusy, false);
  assert.equal(s.story.responseProfile.vulnerable, 1);
  s.farewell.cancel();
  const restored = s.saves.load()!;
  const resumed = new WarehouseFarewell(restored, s.energy, s.dialogue, s.callbacks);
  assert.equal(resumed.begin(), true);
  assert.equal(s.dialogue.isBusy, false);
  assert.equal(restored.responseProfile.vulnerable, 1);
  assert.equal(restored.progress.warehouseFarewellPlayed, false);
  assert.deepEqual(s.switches, []);
});

test('busy dialogue, missing contact and an unpowered warehouse cannot start a farewell', (t) => {
  const s = scene(t);
  s.dialogue.say('МАРА', 'Проверка связи.');
  assert.equal(s.farewell.begin(), false);
  s.dialogue.stop();
  s.story.progress.warehouseContacted = false;
  assert.equal(s.farewell.begin(), false);
  s.story.progress.warehouseContacted = true;
  s.story.energy = [];
  assert.equal(s.farewell.begin(), false);
});

test('old completed saves are respected; rejected power changes cannot commit the story', (t) => {
  const s = scene(t);
  s.story.progress.warehouseFarewellPlayed = true;
  assert.equal(s.farewell.begin(), true);
  assert.equal(s.dialogue.isBusy, false);
  s.farewell.cancel();
  s.story.progress.warehouseFarewellPlayed = false;
  s.story.choices.nikaPromise = 'promise';
  const rejected = new WarehouseFarewell(s.story, { ...s.energy, toggle: () => false }, s.dialogue, s.callbacks);
  rejected.begin();
  assert.equal(rejected.confirm(), false);
  assert.equal(s.story.progress.warehouseFarewellPlayed, false);
  assert.deepEqual(s.story.energy, ['warehouse']);
});

test('energy buttons request a story decision instead of changing power themselves', (t) => {
  const s = scene(t);
  let requested: EnergySystemName | undefined;
  s.hud.onEnergyToggle = (id) => { requested = id; };
  s.window.document.querySelector<HTMLButtonElement>('[data-system="warehouse"]')!.click();
  assert.equal(requested, 'warehouse');
  assert.deepEqual(s.switches, []);
});

test('dialogue → switch UI → persisted power-off works as one scene', (t) => {
  const s = scene(t);
  const panel = new WarehouseCutoff(s.window.document.body as unknown as HTMLElement,
    () => { s.farewell.confirm(); }, () => { s.farewell.cancel(); });
  s.callbacks.onReady = () => panel.show();
  s.callbacks.onCancel = () => panel.hide();
  s.hud.onEnergyToggle = () => { s.farewell.begin(); };
  s.window.document.querySelector<HTMLButtonElement>('[data-system="warehouse"]')!.click();
  s.reply('1');
  assert.equal(panel.isOpen, true);
  assert.deepEqual(s.saves.load()!.energy, ['warehouse']);
  const button = s.window.document.querySelector<HTMLButtonElement>('.cutoff-hold')!;
  button.dispatchEvent(new s.window.KeyboardEvent('keydown', { code: 'Enter', bubbles: true }));
  panel.update(1.61);
  assert.equal(panel.isOpen, false);
  assert.deepEqual(s.saves.load()!.energy, []);
  assert.equal(s.saves.load()!.progress.warehouseFarewellPlayed, true);
});

function holdPanel(t: TestContext) {
  const window = setup(t);
  let confirmed = 0;
  const panel = new WarehouseCutoff(window.document.body as unknown as HTMLElement, () => { confirmed++; }, () => panel.hide());
  const button = window.document.querySelector<HTMLButtonElement>('.cutoff-hold')!;
  let captured: number | undefined;
  Object.assign(button, {
    setPointerCapture: (id: number) => { captured = id; },
    hasPointerCapture: (id: number) => captured === id,
    releasePointerCapture: () => { captured = undefined; },
    getBoundingClientRect: () => ({ left: 0, right: 200, top: 0, bottom: 50 }),
  });
  const key = (type: string, code = 'Space', repeat = false) => {
    button.dispatchEvent(new window.KeyboardEvent(type, { code, repeat, bubbles: true }));
  };
  const pointer = (type: string, options = {}) => {
    button.dispatchEvent(new window.PointerEvent(type, { pointerId: 1, isPrimary: true, button: 0, ...options }));
  };
  panel.show();
  return { window, panel, button, key, pointer, confirmed: () => confirmed };
}

test('short tap/click cannot cut power; a fresh keyboard hold confirms exactly once', (t) => {
  const s = holdPanel(t);
  s.button.click();
  s.panel.update(2);
  assert.equal(s.confirmed(), 0);
  s.key('keydown');
  s.panel.update(1);
  s.key('keyup');
  s.key('keydown');
  s.panel.update(1);
  assert.equal(s.confirmed(), 0);
  s.panel.update(0.61);
  s.panel.update(5);
  assert.equal(s.confirmed(), 1);
  assert.equal(s.panel.isOpen, false);
});

for (const event of ['pointerup', 'pointercancel', 'lostpointercapture', 'pointermove']) {
  test(`${event} resets touch progress before a fresh hold can confirm`, (t) => {
    const s = holdPanel(t);
    s.pointer('pointerdown');
    s.panel.update(1);
    s.pointer(event, { clientX: 250 });
    s.panel.update(2);
    assert.equal(s.confirmed(), 0);
    s.pointer('pointerdown');
    s.panel.update(1.61);
    assert.equal(s.confirmed(), 1);
  });
}

test('pause, blur and cancel reset a hold; key repeat after resume cannot trigger it', (t) => {
  const s = holdPanel(t);
  s.key('keydown');
  s.panel.update(1.5);
  s.panel.setPaused(true);
  s.key('keydown', 'Enter');
  s.panel.update(10);
  s.panel.setPaused(false);
  s.key('keydown', 'Space', true);
  s.panel.update(10);
  assert.equal(s.confirmed(), 0);
  s.key('keydown', 'Enter');
  s.panel.update(1.5);
  s.window.dispatchEvent(new s.window.Event('blur'));
  s.panel.update(2);
  assert.equal(s.confirmed(), 0);
  s.key('keydown');
  s.panel.update(1.5);
  s.window.document.querySelector<HTMLButtonElement>('.cutoff-cancel')!.click();
  s.panel.update(5);
  assert.equal(s.confirmed(), 0);
});

test('hiding the tab cancels pointer hold even if no pointerup arrives', (t) => {
  const s = holdPanel(t);
  s.pointer('pointerdown');
  s.panel.update(1.5);
  Object.defineProperty(s.window.document, 'hidden', { value: true, configurable: true });
  s.window.document.dispatchEvent(new s.window.Event('visibilitychange'));
  s.panel.update(10);
  assert.equal(s.confirmed(), 0);
});

test('pausing during a drag releases captures and clears held movement and camera input', (t) => {
  const window = setup(t);
  const joystick = window.document.createElement('div');
  const stick = window.document.createElement('div');
  const canvas = window.document.createElement('canvas');
  for (const element of [joystick, canvas]) {
    let captured: number | undefined;
    Object.assign(element, {
      setPointerCapture: (id: number) => { captured = id; },
      hasPointerCapture: (id: number) => captured === id,
      releasePointerCapture: () => { captured = undefined; },
    });
  }
  const input = new InputController(joystick as unknown as HTMLElement, stick as unknown as HTMLElement, canvas as unknown as HTMLElement);
  window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'KeyW' }));
  canvas.dispatchEvent(new window.PointerEvent('pointerdown', { pointerId: 1, button: 0, clientX: 10 }));
  canvas.dispatchEvent(new window.PointerEvent('pointermove', { pointerId: 1, clientX: 50 }));
  input.update();
  assert.equal(input.movement.y, 1);
  input.setEnabled(false);
  window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'KeyD' }));
  input.setEnabled(true);
  input.update();
  assert.equal(input.movement.length(), 0);
  assert.equal(input.consumeLookDelta().length(), 0);
  assert.equal(canvas.hasPointerCapture(1), false);
});
