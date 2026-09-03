import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import './style.css';
import './dialogue.css';
import { DialogueSystem } from './game/DialogueSystem';
import { EnergySystem } from './game/EnergySystem';
import { FullscreenController } from './game/FullscreenController';
import { InputController } from './game/InputController';
import { InteractionSystem } from './game/InteractionSystem';
import { MemoryReconstructionSystem } from './game/MemoryReconstructionSystem';
import { PlayerController } from './game/PlayerController';
import { SaveSystem } from './game/SaveSystem';
import { SchoolReconstruction } from './game/SchoolReconstruction';
import { GraphicsQuality, SettingsStore } from './game/SettingsStore';
import { SoykaController } from './game/SoykaController';
import { createDefaultStoryState } from './game/StoryState';
import { GameWorld } from './game/World';
import { Hud } from './ui/Hud';
import { PauseMenu } from './ui/PauseMenu';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app root');

const saves = new SaveSystem();
const loadedState = saves.load();
const storyState = loadedState ?? createDefaultStoryState();
const settingsStore = new SettingsStore();
const settings = settingsStore.load();
const fullscreen = new FullscreenController();

await RAPIER.init();
const physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
const energy = new EnergySystem();
energy.restore(storyState.energy);
const hud = new Hud(app, energy);
const pauseMenu = new PauseMenu(app);
const dialogue = new DialogueSystem(hud);
const world = new GameWorld(physics);
const memory = new MemoryReconstructionSystem(world.scene, new THREE.Vector3(-3, 0, -10.8));
const school = new SchoolReconstruction(world.scene, physics, dialogue, {
  onEchoHeard: (id) => {
    if (!storyState.schoolEchoesHeard.includes(id)) storyState.schoolEchoesHeard.push(id);
    persist(false);
  },
  onComplete: () => {
    storyState.progress.schoolReconstructionCompleted = true;
    hud.setObjective('ПРОДОЛЖИТЬ ЧЕРЕЗ ШКОЛУ');
    persist(true);
  },
});
const spawn = new THREE.Vector3(
  storyState.player.position.x,
  storyState.player.position.y,
  storyState.player.position.z,
);
const player = new PlayerController(physics, world.scene, spawn);
const soyka = new SoykaController(world.scene);

if (storyState.progress.lighthousePowered) world.unlockLighthouseDoor(true);
for (const system of energy.activeSystems) world.setPowerState(system, true);
if (storyState.progress.bridgeStarted) world.startBridge(true);
memory.setAnchorAvailable(energy.isActive('pumps') && !storyState.progress.memoryPrototypeSeen);
school.restore(
  storyState.progress.schoolReconstructionStarted,
  storyState.schoolEchoesHeard,
  storyState.progress.schoolReconstructionCompleted,
);
hud.refreshEnergy();

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
hud.gameContainer.appendChild(renderer.domElement);

const qualityPresets: Record<GraphicsQuality, { pixelRatio: number; shadows: boolean }> = {
  low: { pixelRatio: 1, shadows: false },
  medium: { pixelRatio: 1.25, shadows: true },
  high: { pixelRatio: 1.6, shadows: true },
};

function applyGraphicsQuality(quality: GraphicsQuality) {
  const preset = qualityPresets[quality];
  renderer.setPixelRatio(Math.min(devicePixelRatio, preset.pixelRatio));
  renderer.shadowMap.enabled = preset.shadows;
  renderer.setSize(innerWidth, innerHeight);
}

pauseMenu.setQuality(settings.quality);
applyGraphicsQuality(settings.quality);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
const input = new InputController(hud.joystick, hud.stick, renderer.domElement);
const interactions = new InteractionSystem(hud.interactButton);
const pauseButton = app.querySelector<HTMLButtonElement>('.pause');
if (!pauseButton) throw new Error('Missing pause button');

let warehouseConversationActive = false;
let warehouseFarewellActive = false;
let paused = false;
let yaw = storyState.player.yaw;
let pitch = -0.12;
let autosaveElapsed = 0;
let gameElapsed = 0;

function rememberResponse(kind: keyof typeof storyState.responseProfile) {
  storyState.responseProfile[kind] += 1;
}

function rememberChoice(key: string, choice: string) {
  storyState.choices[key] = choice;
}

function captureStoryState() {
  storyState.player.position = {
    x: player.position.x,
    y: player.position.y,
    z: player.position.z,
  };
  storyState.player.yaw = yaw;
  storyState.energy = energy.activeSystems;
  return storyState;
}

function persist(showIndicator = false) {
  const saved = saves.save(captureStoryState());
  if (saved && showIndicator) hud.flashAutosave();
}

function setPaused(next: boolean) {
  if (paused === next) return;
  paused = next;
  if (paused) {
    input.consumeLookDelta();
    persist(false);
    pauseMenu.open();
  } else {
    pauseMenu.close();
    pauseButton.focus({ preventScroll: true });
  }
}

function syncFullscreenState() {
  pauseMenu.setFullscreenState(fullscreen.isFullscreen(), fullscreen.isSupported());
}

pauseButton.addEventListener('click', () => setPaused(true));
pauseMenu.continueButton.addEventListener('click', () => setPaused(false));
pauseMenu.backButton.addEventListener('click', () => setPaused(false));
pauseMenu.fullscreenButton.addEventListener('click', async () => {
  try {
    await fullscreen.toggle();
  } catch (error) {
    console.warn('Fullscreen request failed', error);
  }
  syncFullscreenState();
});
pauseMenu.qualitySelect.addEventListener('change', () => {
  const quality = pauseMenu.qualitySelect.value as GraphicsQuality;
  settings.quality = quality;
  settingsStore.save(settings);
  applyGraphicsQuality(quality);
});
fullscreen.subscribe(syncFullscreenState);
syncFullscreenState();

const dialogueChoiceKeys = new Set(['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3']);
addEventListener('keydown', (event) => {
  if (event.code === 'Escape') {
    event.preventDefault();
    setPaused(!paused);
    return;
  }
  if (paused && dialogueChoiceKeys.has(event.code)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

function syncObjective() {
  const progress = storyState.progress;
  if (!progress.lighthousePowered) {
    hud.setObjective('НАЙТИ АВАРИЙНЫЙ РАСПРЕДЕЛИТЕЛЬ');
  } else if (progress.schoolReconstructionCompleted) {
    hud.setObjective('ПРОДОЛЖИТЬ ЧЕРЕЗ ШКОЛУ');
  } else if (progress.schoolReconstructionStarted) {
    hud.setObjective('ИССЛЕДОВАТЬ РЕКОНСТРУКЦИЮ');
  } else if (progress.schoolEntered) {
    hud.setObjective('ВОССТАНОВИТЬ РЕКОНСТРУКЦИЮ');
  } else if (progress.bridgeStarted) {
    hud.setObjective('ДОЙТИ ДО ШКОЛЫ');
  } else if (progress.warehouseContacted && energy.isActive('bridge')) {
    hud.setObjective('ЗАПУСТИТЬ ПРИВОД МОСТА');
  } else if (progress.warehouseContacted) {
    hud.setObjective('ВОССТАНОВИТЬ ПИТАНИЕ МОСТА');
  } else if (energy.isActive('warehouse')) {
    hud.setObjective('ПРОВЕРИТЬ СКЛАД 04');
  } else {
    hud.setObjective('ДОБРАТЬСЯ ДО ЭНЕРГОСТАНЦИИ');
  }
}

syncObjective();
if (loadedState) hud.hideDialogue();

interactions.add({
  id: 'lighthouse-panel',
  label: '⚡ АВАРИЙНЫЙ ЩИТ — ЗАПУСТИТЬ',
  position: world.landmarks.lighthousePanel,
  radius: 2.5,
  enabled: () => !storyState.progress.lighthousePowered,
  action: () => {
    storyState.progress.lighthousePowered = true;
    world.unlockLighthouseDoor();
    hud.setObjective('ДОБРАТЬСЯ ДО ЭНЕРГОСТАНЦИИ');
    persist(true);
    dialogue.play([
      { kind: 'line', speaker: 'МАРА', text: 'Есть питание.', duration: 1.8 },
      { kind: 'line', speaker: 'МАРА', text: 'Дверь разблокирована. Спускайся к порту.', duration: 3.1 },
    ]);
  },
});

interactions.add({
  id: 'energy-station',
  label: '⚡ РАСПРЕДЕЛИТЕЛЬ',
  position: world.landmarks.energyStation,
  radius: 4.3,
  action: () => {
    hud.setObjective('РАСПРЕДЕЛИТЬ ЭНЕРГИЮ');
    hud.openEnergy();
  },
});

interactions.add({
  id: 'memory-bracelet',
  label: '◎ КРАСНЫЙ БРАСЛЕТ — КОСНУТЬСЯ',
  position: memory.anchorPosition,
  radius: 2.2,
  enabled: () => energy.isActive('pumps')
    && !storyState.progress.memoryPrototypeSeen
    && !memory.active
    && !dialogue.isBusy,
  action: () => {
    const started = memory.start(9.5, () => {
      storyState.progress.memoryPrototypeSeen = true;
      memory.setAnchorAvailable(false);
      persist(true);
    });
    if (!started) return;

    dialogue.play([
      { kind: 'line', speaker: 'ЛЕВ', text: '...', duration: 1.2 },
      { kind: 'line', speaker: 'ДЕТСКИЙ ГОЛОС', text: 'Папа, ну хватит!', duration: 2.2 },
      { kind: 'line', speaker: 'ЛЕВ', text: 'Кто?..', duration: 1.7 },
      { kind: 'line', speaker: 'МАРА', text: 'Лев? Что случилось?', duration: 2.4 },
      { kind: 'line', speaker: 'ЛЕВ', text: 'Не знаю.', duration: 1.7 },
    ]);
  },
});

interactions.add({
  id: 'warehouse-radio',
  label: '◉ РАДИО — ОТВЕТИТЬ',
  position: world.landmarks.warehouse04,
  radius: 3.3,
  enabled: () => energy.isActive('warehouse')
    && !storyState.progress.warehouseContacted
    && !warehouseConversationActive,
  action: () => {
    warehouseConversationActive = true;
    dialogue.play([
      { kind: 'line', speaker: 'НЕИЗВЕСТНЫЙ ГОЛОС', text: '...эй?', duration: 1.7 },
      { kind: 'line', speaker: 'НЕИЗВЕСТНЫЙ ГОЛОС', text: 'Здесь кто-нибудь есть?', duration: 2.4 },
      { kind: 'line', speaker: 'ЛЕВ', text: 'Я здесь.', duration: 1.7 },
      { kind: 'line', speaker: 'НЕИЗВЕСТНЫЙ ГОЛОС', text: 'Правда?', duration: 1.8 },
      { kind: 'line', speaker: 'ЛЕВ', text: 'Кто ты?', duration: 1.8 },
      { kind: 'line', speaker: 'НИКА', text: 'Не знаю.', duration: 1.5 },
      { kind: 'line', speaker: 'НИКА', text: 'То есть знаю. Ника.', duration: 2.4 },
      { kind: 'line', speaker: 'НИКА', text: 'Ты спасатель?', duration: 2.3 },
      {
        kind: 'choice',
        timeout: 6,
        options: [
          {
            id: 'probably',
            text: 'Наверное.',
            followUp: [
              { kind: 'line', speaker: 'ЛЕВ', text: 'Наверное.', duration: 1.6 },
              { kind: 'line', speaker: 'НИКА', text: 'Очень уверенно прозвучало.', duration: 2.4 },
            ],
          },
          {
            id: 'engineer',
            text: 'Я инженер.',
            followUp: [
              { kind: 'line', speaker: 'ЛЕВ', text: 'Я инженер.', duration: 1.6 },
              { kind: 'line', speaker: 'НИКА', text: 'Значит, двери открывать умеешь. Уже неплохо.', duration: 2.8 },
            ],
          },
          {
            id: 'lost',
            text: 'Я сам не знаю, кто я.',
            followUp: [
              { kind: 'line', speaker: 'ЛЕВ', text: 'Я сам не знаю, кто я.', duration: 2.1 },
              { kind: 'line', speaker: 'НИКА', text: 'Отлично. Тогда нас уже двое.', duration: 2.8 },
            ],
          },
        ],
        silence: {
          id: 'silence',
          text: '',
          followUp: [
            { kind: 'line', speaker: 'НИКА', text: 'Ладно. Можешь не отвечать.', duration: 2.5 },
          ],
        },
        onSelect: (choice) => {
          rememberChoice('nikaRole', choice);
          if (choice === 'lost') rememberResponse('vulnerable');
          else if (choice === 'silence') rememberResponse('silent');
          else rememberResponse('direct');
        },
      },
      { kind: 'line', speaker: 'НИКА', text: 'Только не отключайся, ладно?', duration: 2.7 },
    ], () => {
      warehouseConversationActive = false;
      storyState.progress.warehouseContacted = true;
      hud.setObjective('ВОССТАНОВИТЬ ПИТАНИЕ МОСТА');
      persist(true);
    });
  },
});

interactions.add({
  id: 'bridge-drive',
  label: '⚡ ЗАПУСТИТЬ ПРИВОД МОСТА',
  position: world.landmarks.bridgeStart,
  radius: 3.6,
  enabled: () => energy.isActive('bridge') && !storyState.progress.bridgeStarted,
  action: () => {
    storyState.progress.bridgeStarted = true;
    world.startBridge();
    hud.setObjective('ДОЙТИ ДО ШКОЛЫ');
    persist(true);
    dialogue.play([
      { kind: 'line', speaker: 'МАРА', text: 'Путь открыт.', duration: 2 },
      { kind: 'line', speaker: 'ЛЕВ', text: 'Я возвращаюсь за ней.', duration: 2.2 },
      { kind: 'line', speaker: 'МАРА', text: 'За кем?', duration: 1.8 },
      { kind: 'line', speaker: 'ЛЕВ', text: 'Никой.', duration: 1.8 },
      { kind: 'line', speaker: 'МАРА', text: 'Лев...', duration: 2.5 },
    ]);
  },
});

interactions.add({
  id: 'school-reconstruction-node',
  label: 'СОЙКА — ВОССТАНОВИТЬ РЕКОНСТРУКЦИЮ',
  position: school.reconstructionNode,
  radius: 3.1,
  enabled: () => storyState.progress.bridgeStarted
    && storyState.progress.schoolEntered
    && !storyState.progress.schoolReconstructionStarted
    && !dialogue.isBusy,
  action: () => {
    if (!school.start()) return;
    storyState.progress.schoolReconstructionStarted = true;
    hud.setObjective('ИССЛЕДОВАТЬ РЕКОНСТРУКЦИЮ');
    persist(true);
  },
});

energy.onInsufficientPower = () => {
  dialogue.say('МАРА', 'Энергии недостаточно. Что-то придётся отключить.');
};
energy.onChange = (system, enabled) => {
  world.setPowerState(system, enabled);
  storyState.energy = energy.activeSystems;

  if (system === 'pumps') {
    memory.setAnchorAvailable(enabled && !storyState.progress.memoryPrototypeSeen);
  }

  if (
    storyState.progress.warehouseContacted
    && !storyState.progress.warehouseFarewellPlayed
    && !warehouseFarewellActive
    && !energy.isActive('warehouse')
    && energy.isActive('bridge')
  ) {
    warehouseFarewellActive = true;
    dialogue.play([
      { kind: 'line', speaker: 'НИКА', text: 'Лев?', duration: 1.6 },
      { kind: 'line', speaker: 'НИКА', text: 'Подожди... Ты ведь вернёшься?', duration: 3 },
      {
        kind: 'choice',
        timeout: 5.5,
        options: [
          {
            id: 'promise',
            text: 'Обещаю.',
            followUp: [{ kind: 'line', speaker: 'ЛЕВ', text: 'Обещаю.', duration: 2 }],
          },
          {
            id: 'honest',
            text: 'Я не знаю.',
            followUp: [
              { kind: 'line', speaker: 'ЛЕВ', text: 'Я не знаю.', duration: 1.8 },
              { kind: 'line', speaker: 'НИКА', text: 'Хотя бы честно.', duration: 2 },
            ],
          },
        ],
        silence: {
          id: 'silence',
          text: '',
          followUp: [{ kind: 'line', speaker: 'НИКА', text: 'Понятно.', duration: 2 }],
        },
        onSelect: (choice) => {
          rememberChoice('nikaPromise', choice);
          if (choice === 'silence') rememberResponse('silent');
          else if (choice === 'honest') rememberResponse('vulnerable');
          else rememberResponse('direct');
          storyState.progress.warehouseFarewellPlayed = true;
          warehouseFarewellActive = false;
          persist(true);
        },
      },
    ]);
    hud.setObjective('ЗАПУСТИТЬ ПРИВОД МОСТА');
  } else if (energy.isActive('warehouse') && !storyState.progress.warehouseContacted) {
    dialogue.say('МАРА', 'На Складе 04 появился слабый радиосигнал.');
    hud.setObjective('ПРОВЕРИТЬ СКЛАД 04');
  } else if (energy.isActive('bridge')) {
    dialogue.say('МАРА', 'Мост получает питание. Доберись до привода.');
    hud.setObjective('ЗАПУСТИТЬ ПРИВОД МОСТА');
  }
  hud.refreshEnergy();
  persist(false);
};

hud.soykaButton.addEventListener('click', () => {
  soyka.signal();
  dialogue.say('СОЙКА', 'Работаем.', 1.8);
});

if (!loadedState) {
  dialogue.play([
    { kind: 'line', speaker: 'МАРА', text: 'Лев?', duration: 1.8 },
    { kind: 'line', speaker: 'МАРА', text: 'Лев, если ты меня слышишь, скажи что-нибудь.', duration: 3.2 },
    {
      kind: 'choice',
      timeout: 5,
      options: [
        {
          id: 'heard',
          text: 'Я слышу.',
          followUp: [
            { kind: 'line', speaker: 'ЛЕВ', text: 'Я слышу.', duration: 1.5 },
            { kind: 'line', speaker: 'МАРА', text: 'Хорошо. Значит, хотя бы связь работает.', duration: 2.8 },
          ],
        },
      ],
      silence: {
        id: 'silence',
        text: '',
        followUp: [
          { kind: 'line', speaker: 'МАРА', text: 'Ладно. Тогда просто слушай.', duration: 2.4 },
        ],
      },
      onSelect: (choice) => {
        rememberChoice('introConnection', choice);
        rememberResponse(choice === 'silence' ? 'silent' : 'direct');
        persist(false);
      },
    },
    { kind: 'line', speaker: 'МАРА', text: 'Ты внутри северного маяка. Что ты помнишь?', duration: 3.3 },
    {
      kind: 'choice',
      timeout: 6,
      options: [
        {
          id: 'lighthouse',
          text: 'Маяк.',
          followUp: [{ kind: 'line', speaker: 'ЛЕВ', text: 'Маяк.', duration: 1.5 }],
        },
        {
          id: 'mara',
          text: 'Тебя.',
          followUp: [
            { kind: 'line', speaker: 'ЛЕВ', text: 'Тебя.', duration: 1.5 },
            { kind: 'line', speaker: 'МАРА', text: 'Хорошо.', duration: 2.2 },
          ],
        },
        {
          id: 'nothing',
          text: 'Почти ничего.',
          followUp: [{ kind: 'line', speaker: 'ЛЕВ', text: 'Почти ничего.', duration: 1.8 }],
        },
      ],
      silence: {
        id: 'silence',
        text: '',
        followUp: [{ kind: 'line', speaker: 'МАРА', text: 'Не дави на себя. Сначала выберемся отсюда.', duration: 2.8 }],
      },
      onSelect: (choice) => {
        rememberChoice('introMemory', choice);
        if (choice === 'nothing') rememberResponse('vulnerable');
        else if (choice === 'silence') rememberResponse('silent');
        else rememberResponse('direct');
        persist(true);
      },
    },
    { kind: 'line', speaker: 'МАРА', text: 'Основное питание отключено. Найди аварийный щит.', duration: 3 },
  ]);
}

const clock = new THREE.Clock();
const cameraTarget = new THREE.Vector3();
const cameraOffset = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);

  if (!paused) {
    gameElapsed += dt;
    input.update();
    const look = input.consumeLookDelta();
    yaw -= look.x * 0.004;
    pitch = THREE.MathUtils.clamp(pitch - look.y * 0.003, -0.55, 0.25);

    player.update(input, yaw, dt);
    physics.timestep = dt;
    physics.step();
    player.syncVisual();

    if (
      storyState.progress.bridgeStarted
      && !storyState.progress.schoolEntered
      && player.position.distanceTo(school.entrance) < 4.8
    ) {
      storyState.progress.schoolEntered = true;
      hud.setObjective('ВОССТАНОВИТЬ РЕКОНСТРУКЦИЮ');
      persist(true);
      if (!dialogue.isBusy) {
        dialogue.play([
          { kind: 'line', speaker: 'НИКА', text: 'Школа?..', duration: 1.8 },
          { kind: 'line', speaker: 'МАРА', text: 'Старая городская школа. Здесь ещё жив архивный узел.', duration: 3.1 },
          { kind: 'line', speaker: 'СОЙКА', text: 'Могу попробовать восстановить.', duration: 2.4 },
        ]);
      }
    }

    dialogue.update(dt);
    interactions.update(player.position);
    soyka.update(player.position, gameElapsed, dt);
    memory.update(dt);
    school.update(dt, player);
    world.update(dt);

    autosaveElapsed += dt;
    if (autosaveElapsed >= 5) {
      autosaveElapsed = 0;
      persist(false);
    }

    cameraTarget.set(player.position.x, player.position.y + 1.45, player.position.z);
    cameraOffset.set(
      Math.sin(yaw) * Math.cos(pitch) * 7.5,
      3.1 + Math.sin(-pitch) * 4,
      Math.cos(yaw) * Math.cos(pitch) * 7.5,
    );
    camera.position.lerp(cameraTarget.clone().add(cameraOffset), 0.08);
    camera.lookAt(cameraTarget);
  }

  renderer.render(world.scene, camera);
}

animate();

addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persist(false);
});
addEventListener('pagehide', () => persist(false));
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
