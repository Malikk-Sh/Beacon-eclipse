import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import './style.css';
import './dialogue.css';
import './ending.css';
import './warehouse-cutoff.css';
import './opening.css';
import { OpeningScreen } from './ui/OpeningScreen';
import { HarborDistrict, HARBOR_DISCOVERIES } from './world/HarborDistrict';
import { BridgeArchiveTerminal } from './game/BridgeArchiveTerminal';
import { DialogueSystem } from './game/DialogueSystem';
import { EnergySystem } from './game/EnergySystem';
import { FullscreenController } from './game/FullscreenController';
import { InputController } from './game/InputController';
import { InteractionSystem } from './game/InteractionSystem';
import { MemoryReconstructionSystem } from './game/MemoryReconstructionSystem';
import { PlayerController } from './game/PlayerController';
import { SaveSystem } from './game/SaveSystem';
import { TraversalSafety, canEnterSchool } from './game/TraversalSafety';
import { audioSystem } from './game/AudioSystem';
import { SchoolReconstruction } from './game/SchoolReconstruction';
import { GraphicsQuality, SettingsStore } from './game/SettingsStore';
import { SoykaController } from './game/SoykaController';
import { ThirdPersonCamera } from './game/ThirdPersonCamera';
import { FirstPersonCamera } from './game/FirstPersonCamera';
import type { CameraMode } from './game/SettingsStore';
import { createDefaultStoryState } from './game/StoryState';
import { GameWorld } from './game/World';
import { WarehouseFarewell } from './game/WarehouseFarewell';
import { Hud } from './ui/Hud';
import { PauseMenu } from './ui/PauseMenu';
import { VerticalSliceEnding } from './ui/VerticalSliceEnding';
import { WarehouseCutoff } from './ui/WarehouseCutoff';
import { VisualFoundation } from './world/VisualFoundation';
import { WorldDetailPass } from './world/WorldDetailPass';
import './premium.css';
import './mystery.css';
import { openingStory, warehouseStory, endingStory, commitEnding, chapterObjective, chapterRecap, SCHOOL_CLUES, line } from './game/MysteryStory';
import { MysteryAtmosphere } from './world/MysteryAtmosphere';

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
const sliceEnding = new VerticalSliceEnding(app);
const dialogue = new DialogueSystem(hud, audioSystem);
const world = new GameWorld(physics);
const harbor = new HarborDistrict(world.scene, physics);
const visualFoundation = new VisualFoundation(world.scene);
const archiveTerminal = new BridgeArchiveTerminal(world.scene);
const memory = new MemoryReconstructionSystem(world.scene, new THREE.Vector3(-3, 0, -10.8));
const school = new SchoolReconstruction(world.scene, physics, dialogue, {
  onEchoHeard: (id) => {
    if (!storyState.schoolEchoesHeard.includes(id)) storyState.schoolEchoesHeard.push(id);
    syncJournal();
    syncObjective();
    hud.notify('Отметка смотрителя сохранена в журнале.');
    audioSystem.playMysteryCue('clue');
    persist(false);
  },
  onComplete: () => {
    storyState.progress.schoolReconstructionCompleted = true;
    archiveTerminal.setAvailable(true);
    syncObjective();
    persist(true);
  },
}, world.cameraObstacles);
new WorldDetailPass(world.scene, physics);
const mysteryAtmosphere = new MysteryAtmosphere(world.scene, physics, storyState);
const spawn = new THREE.Vector3(
  storyState.player.position.x,
  storyState.player.position.y,
  storyState.player.position.z,
);
const player = new PlayerController(physics, world.scene, spawn);
const soyka = new SoykaController(world.scene, physics, player.collider, world.cameraObstacles);

if (storyState.progress.lighthousePowered) world.unlockLighthouseDoor(true);
for (const system of energy.activeSystems) world.setPowerState(system, true);
if (storyState.progress.bridgeStarted) world.startBridge(true);
memory.setAnchorAvailable(energy.isActive('pumps') && !storyState.progress.memoryPrototypeSeen);
school.restore(
  storyState.progress.schoolReconstructionStarted,
  storyState.schoolEchoesHeard,
  storyState.progress.schoolReconstructionCompleted,
);
archiveTerminal.setAvailable(storyState.progress.schoolReconstructionCompleted);
if (storyState.choices.tideEnding === 'seal' || storyState.choices.tideEnding === 'transmit') archiveTerminal.showOutcome(storyState.choices.tideEnding);
hud.refreshEnergy();
physics.step();
const traversal = new TraversalSafety(physics, player, storyState.progress, () => world.isBridgeReady);
const recoveredOnLoad = traversal.restore(storyState.player.position) || saves.repairedPosition;
soyka.reset(player.position);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
let renderRequested = true;
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
visualFoundation.initializeRenderer(renderer);
hud.gameContainer.appendChild(renderer.domElement);
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute('aria-label', 'Игровой вид');

const qualityPresets: Record<GraphicsQuality, { pixelRatio: number; shadows: boolean }> = {
  low: { pixelRatio: 1, shadows: false },
  medium: { pixelRatio: 1.25, shadows: true },
  high: { pixelRatio: 1.6, shadows: true },
};

function applyGraphicsQuality(quality: GraphicsQuality) {
  renderRequested = true;
  const preset = qualityPresets[quality];
  renderer.setPixelRatio(Math.min(devicePixelRatio, preset.pixelRatio));
  renderer.shadowMap.enabled = preset.shadows;
  renderer.setSize(innerWidth, innerHeight);
  visualFoundation.setQuality(quality);
}

pauseMenu.setQuality(settings.quality);
applyGraphicsQuality(settings.quality);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
const cameraController = new ThirdPersonCamera(camera, physics, player.collider, world.cameraObstacles);
const firstPersonCamera = new FirstPersonCamera(camera, physics, player.collider);
const input = new InputController(hud.joystick, hud.stick, renderer.domElement, hud.jumpButton);
const interactions = new InteractionSystem(hud.interactButton);
const pauseButtonCandidate = app.querySelector<HTMLButtonElement>('.pause');
if (!pauseButtonCandidate) throw new Error('Missing pause button');
const pauseButton: HTMLButtonElement = pauseButtonCandidate;

let warehouseConversationActive = false;
let paused = false;
let journeyStarted = false;
let sliceEnded = false;
let yaw = storyState.player.yaw;
let pitch = -0.12;
let autosaveElapsed = 0;
let gameElapsed = 0;
let cameraMode: CameraMode = 'third';

function setCameraMode(mode: CameraMode, save = true): void {
  renderRequested = true;
  cameraMode = mode;
  hud.setCameraMode(mode);
  input.setFirstPerson(mode === 'first');
  player.setFirstPerson(mode === 'first');
  camera.fov = mode === 'first' ? settings.fieldOfView : settings.thirdPersonFieldOfView;
  pauseMenu.fovRange.value = String(camera.fov);
  pauseMenu.fovValue.textContent = `${camera.fov}°`;
  camera.near = mode === 'first' ? 0.06 : 0.1;
  camera.updateProjectionMatrix();
  cameraController.reset();
  firstPersonCamera.reset();
  pitch = mode === 'first' ? 0 : -0.12;
  if (mode === 'first') firstPersonCamera.update(player.position, yaw, pitch, 0);
  else cameraController.update(player.position, yaw, pitch, 1 / 60);
  pauseMenu.cameraSelect.value = mode;
  if (save) { settings.cameraMode = mode; settingsStore.save(settings); }
}

hud.cameraButton.addEventListener('click', () => {
  if (journeyStarted && !paused && !hud.isEnergyOpen && !cutoff.isOpen) setCameraMode(cameraMode === 'first' ? 'third' : 'first');
});
pauseMenu.cameraSelect.addEventListener('change', () => setCameraMode(pauseMenu.cameraSelect.value === 'first' ? 'first' : 'third'));
input.onPointerUnlock = () => setPaused(true);
pauseMenu.fovRange.addEventListener('input', () => {
  const value = THREE.MathUtils.clamp(Number(pauseMenu.fovRange.value), 50, 90);
  if (cameraMode === 'first') settings.fieldOfView = value;
  else settings.thirdPersonFieldOfView = value;
  camera.fov = value;
  camera.updateProjectionMatrix();
  pauseMenu.fovValue.textContent = `${value}°`;
  renderRequested = true;
  settingsStore.save(settings);
});

const cutoff = new WarehouseCutoff(app, () => {
  if (paused || sliceEnded) return;
  if (!farewell.confirm()) farewell.cancel();
}, () => farewell.cancel());
const farewell = new WarehouseFarewell(storyState, energy, dialogue, {
  onResponse: () => persist(true),
  onReady: () => {
    hud.closeEnergy();
    cutoff.show();
    input.setEnabled(false);
    hud.setObjective('ОТКЛЮЧИТЬ СКЛАД 04');
  },
  onCancel: () => {
    cutoff.hide();
    syncObjective();
    persist(false);
    renderer.domElement.focus({ preventScroll: true });
  },
  onCutoff: () => {
    cutoff.hide();
    soyka.lookBackAt(world.landmarks.warehouse04);
    dialogue.say('СВЯЗЬ · ГОЛОС ЛЬВА', 'Я всё ещё слышу тебя.', 3.8);
    mysteryAtmosphere.pulse('cutoff');
    audioSystem.playMysteryCue('cutoff');
    syncObjective();
    persist(true);
    renderer.domElement.focus({ preventScroll: true });
  },
});

function rememberResponse(kind: keyof typeof storyState.responseProfile) {
  storyState.responseProfile[kind] += 1;
}

function rememberChoice(key: string, choice: string) {
  storyState.choices[key] = choice;
}

function captureStoryState() {
  storyState.player.position = {
    x: traversal.checkpoint.x,
    y: traversal.checkpoint.y,
    z: traversal.checkpoint.z,
  };
  storyState.player.yaw = yaw;
  storyState.energy = energy.activeSystems;
  return storyState;
}

function persist(showIndicator = false) {
  if (!journeyStarted) return;
  const saved = saves.save(captureStoryState());
  if (saved && showIndicator) hud.flashAutosave();
}

function setPaused(next: boolean) {
  if (!journeyStarted || sliceEnded || paused === next) return;
  paused = next;
  dialogue.setPaused(paused);
  renderRequested = true;
  input.setEnabled(!paused && !hud.isEnergyOpen && !cutoff.isOpen);
  hud.setPaused(paused);
  cutoff.setPaused(paused);
  if (paused) {
    input.consumeLookDelta();
    persist(false);
    pauseMenu.open();
  } else {
    pauseMenu.close();
    renderer.domElement.focus({ preventScroll: true });
  }
}

function syncFullscreenState() {
  pauseMenu.setFullscreenState(fullscreen.isFullscreen(), fullscreen.isSupported());
}

pauseButton.addEventListener('click', () => setPaused(true));
pauseMenu.continueButton.addEventListener('click', () => setPaused(false));
pauseMenu.backButton.addEventListener('click', () => setPaused(false));
pauseMenu.recoverButton.addEventListener('click', () => {
  farewell.cancel();
  hud.closeEnergy();
  traversal.recover();
  cameraController.reset();
  firstPersonCamera.reset();
  soyka.reset(player.position);
  setPaused(false);
  hud.notify('Лев вернулся на устойчивую поверхность. Сюжетный прогресс сохранён.');
  persist(true);
});
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
  if ((paused || sliceEnded) && (dialogueChoiceKeys.has(event.code) || event.code === 'Enter')) {
    if ((event.target as HTMLElement | null)?.closest?.('button, input, select')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

function syncObjective() {
  hud.setObjective(chapterObjective(storyState, id => energy.isActive(id)));
}

syncObjective();
hud.onEnergyClose = syncObjective;
if (loadedState) hud.hideDialogue();

function syncJournal() {
  const entries = HARBOR_DISCOVERIES.filter(item => storyState.choices[`harbor:${item.id}`] === 'read')
    .map(item => ({ title: item.title as string, text: item.text as string }));
  entries.push(...SCHOOL_CLUES.filter(item => storyState.schoolEchoesHeard.includes(item.id))
    .map(item => ({ title: item.title, text: item.text })));
  pauseMenu.setJournal(entries, HARBOR_DISCOVERIES.length + SCHOOL_CLUES.length);
}

syncJournal();
// After the chapter, missed evidence remains readable without replaying the apparition.
for (const clue of SCHOOL_CLUES) interactions.add({
  id: `remaining-${clue.id}`, label: `◎ ${clue.title}`, position: new THREE.Vector3(clue.x, 0.45, clue.z), radius: 2.5,
  enabled: () => storyState.progress.schoolReconstructionCompleted && !storyState.schoolEchoesHeard.includes(clue.id) && !dialogue.isBusy,
  action: () => dialogue.play([line(clue.speaker, clue.text)], () => { school.recordClue(clue.id); persist(true); }),
});
for (const item of HARBOR_DISCOVERIES) {
  interactions.add({
    id: item.id, label: `◎ ${item.title}`, position: new THREE.Vector3(item.x, 0, item.z), radius: 2.1,
    enabled: () => !dialogue.isBusy && !farewell.active && !storyState.choices[`harbor:${item.id}`],
    action: () => {
      rememberChoice(`harbor:${item.id}`, 'read');
      audioSystem.playMysteryCue('clue');
      dialogue.say(item.speaker, item.text, 9);
      hud.notify('Найдена запись. Её можно перечитать в меню паузы.', 4500);
      syncJournal();
      persist(true);
    },
  });
}

interactions.add({
  id: 'lighthouse-panel',
  label: '⚡ АВАРИЙНЫЙ ЩИТ — ЗАПУСТИТЬ',
  position: world.landmarks.lighthousePanel,
  radius: 2.5,
  enabled: () => !storyState.progress.lighthousePowered && !dialogue.isBusy,
  action: () => {
    storyState.progress.lighthousePowered = true;
    world.unlockLighthouseDoor();
    audioSystem.playMovementCue('relay');
    syncObjective();
    persist(true);
    dialogue.play([
      line('МАРА', 'Маяк запущен. Видишь — часы всё равно стоят.'),
      line('МАРА', 'Дверь открыта. Распределитель за спуском, склад справа от него. Не торопись: наши таймеры ещё идут.'),
    ]);
  },
});

interactions.add({
  id: 'energy-station',
  label: '⚡ РАСПРЕДЕЛИТЕЛЬ',
  position: world.landmarks.energyStation,
  radius: 4.3,
  enabled: () => !dialogue.isBusy && !farewell.active,
  action: () => {
    hud.setObjective('РАСПРЕДЕЛИТЬ ЭНЕРГИЮ');
    hud.openEnergy();
    input.setEnabled(false);
  },
});

interactions.add({
  id: 'memory-bracelet',
  label: '◎ КРАСНАЯ ПЕТЛЯ — ОСМОТРЕТЬ',
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
      line('ЛЕВ', 'Красный шнур. Он мокрый, но вода с него поднимается вверх.'),
      line('СВЯЗЬ', 'Восемь. Только восемь.'),
      line('СОЙКА', 'Материал обычный. Направление капель — нет.'),
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
    && !warehouseConversationActive
    && !dialogue.isBusy,
  action: () => {
    warehouseConversationActive = true;
    dialogue.play(warehouseStory(choice => {
      rememberChoice('signalApproach', choice);
      rememberResponse(choice === 'silent' ? 'silent' : 'direct');
      persist(false);
    }), () => {
      warehouseConversationActive = false;
      storyState.progress.warehouseContacted = true;
      syncObjective();
      persist(true);
    });
  },
});

interactions.add({
  id: 'bridge-drive',
  label: '⚡ ЗАПУСТИТЬ ПРИВОД МОСТА',
  position: world.landmarks.bridgeStart,
  radius: 3.6,
  enabled: () => energy.isActive('bridge') && !storyState.progress.bridgeStarted
    && storyState.progress.warehouseContacted && !dialogue.isBusy && !farewell.active,
  action: () => {
    storyState.progress.bridgeStarted = true;
    world.startBridge();
    syncObjective();
    persist(true);
    dialogue.play([
      line('МАРА', 'Мост опускается. Дождись, пока настил встанет на место.'),
      line('СОЙКА', 'На другом берегу слышен колокол. Источник не подключён к электричеству.'),
      line('ЛЕВ', 'Тогда узнаем, что заставляет его звучать.'),
    ]);
  },
});

interactions.add({
  id: 'school-reconstruction-node',
  label: 'СОЙКА — НАСТРОИТЬСЯ НА ЧАСТОТУ',
  position: school.reconstructionNode,
  radius: 3.1,
  enabled: () => storyState.progress.bridgeStarted
    && storyState.progress.schoolEntered
    && !storyState.progress.schoolReconstructionStarted
    && !dialogue.isBusy,
  action: () => {
    if (!school.start()) return;
    storyState.progress.schoolReconstructionStarted = true;
    syncObjective();
    persist(true);
  },
});

interactions.add({
  id: 'bridge-archive-terminal',
  label: '▣ МОСТОВОЙ РЕТРАНСЛЯТОР',
  position: archiveTerminal.interactionPosition,
  radius: 2.7,
  enabled: () => storyState.progress.schoolReconstructionCompleted
    && !storyState.progress.bridgeArchiveTerminalSeen
    && !dialogue.isBusy,
  action: () => {
    archiveTerminal.showSignalMatch();
    dialogue.play(endingStory(storyState, choice => {
      if (!commitEnding(storyState, choice)) return;
      mysteryAtmosphere.setEnding(choice);
      archiveTerminal.showOutcome(choice);
      hud.setClock(choice === 'seal' ? '22:48' : '22:47');
      audioSystem.playMysteryCue(choice === 'seal' ? 'seal' : 'answer');
      persist(true);
    }), () => {
      syncObjective();
      sliceEnded = true;
      input.setEnabled(false);
      hud.setPaused(true);
      dialogue.setPaused(true);
      sliceEnding.show(storyState.choices.tideEnding === 'transmit' ? 'transmit' : 'seal',
        storyState.schoolEchoesHeard.length, () => {
          sliceEnded = false;
          dialogue.setPaused(false);
          hud.setPaused(false);
          input.setEnabled(true);
          renderer.domElement.focus({ preventScroll: true });
          audioSystem.resumeFromEnding();
          renderRequested = true;
          hud.notify('Можно продолжить исследование порта. Записи и выбор сохранены.', 6000);
        });
    });
  },
});

hud.onEnergyToggle = (system) => {
  if (paused || sliceEnded || farewell.active || dialogue.isBusy) return;
  if (system === 'bridge' && !energy.isActive('bridge')
    && !storyState.progress.warehouseContacted && !storyState.progress.bridgeStarted) {
    hud.closeEnergy();
    dialogue.say('МАРА', 'Сначала проследи сигнал на Складе 04. Тогда поймём, какую линию нужно отсечь.');
    syncObjective();
    return;
  }
  if (system === 'warehouse' && energy.isActive('warehouse')
    && storyState.progress.warehouseContacted && !storyState.progress.warehouseFarewellPlayed) {
    // Keep power, radio ambience and lights on throughout Nika's question/reply.
    hud.closeEnergy();
    farewell.begin();
    return;
  }
  energy.toggle(system);
};

energy.onInsufficientPower = () => {
  hud.closeEnergy();
  dialogue.say('МАРА', 'Энергии недостаточно. Что-то придётся отключить.');
};
energy.onChange = (system, enabled) => {
  world.setPowerState(system, enabled);
  storyState.energy = energy.activeSystems;
  if (system === 'pumps') {
    memory.setAnchorAvailable(enabled && !storyState.progress.memoryPrototypeSeen);
  }
  if (system === 'warehouse' && enabled && !storyState.progress.warehouseContacted) {
    hud.closeEnergy();
    dialogue.say('МАРА', 'Канал склада открыт. Приёмник справа от распределителя уже отвечает.');
  } else if (system === 'bridge' && enabled) {
    hud.closeEnergy();
    dialogue.say('МАРА', 'Мост получает питание. Доберись до привода.');
  }
  syncObjective();
  hud.refreshEnergy();
  persist(false);
};

hud.soykaButton.addEventListener('click', () => {
  if (paused || sliceEnded || farewell.active) return;
  const progress = storyState.progress;
  if (progress.bridgeArchiveTerminalSeen) {
    const remaining = HARBOR_DISCOVERIES.find(item => !storyState.choices[`harbor:${item.id}`])
      ?? SCHOOL_CLUES.find(item => !storyState.schoolEchoesHeard.includes(item.id));
    if (remaining) {
      soyka.signal(new THREE.Vector3(remaining.x, 0, remaining.z));
      hud.notify(`${remaining.title} · ${Math.round(Math.hypot(remaining.x - player.position.x, remaining.z - player.position.z))} м`, 6000);
    } else hud.notify('Все записи найдены. Их можно перечитать в журнале расследования.', 6000);
    return;
  }
  if (progress.schoolReconstructionStarted && !progress.schoolReconstructionCompleted) {
    soyka.signal(school.nextCluePosition);
    const target = school.nextCluePosition;
    hud.notify(`Отметка смотрителя · ${Math.round(target.distanceTo(player.position))} м`, 5000);
    dialogue.say('СОЙКА', school.heardEchoCount >= 3 ? 'К концу коридора. Там проступил дверной проём.' : 'Отметка на стене. Подойди ближе и дослушай запись. Кнопкой «Далее» можно подтвердить прочтение.', 6);
    return;
  }
  const [label, target] = !progress.lighthousePowered ? ['Аварийный щит', world.landmarks.lighthousePanel] as const
    : progress.schoolReconstructionCompleted ? ['Мостовой ретранслятор', archiveTerminal.interactionPosition] as const
      : progress.schoolEntered ? ['Приёмный узел школы', school.reconstructionNode] as const
        : progress.bridgeStarted ? ['Школа', school.entrance] as const
          : progress.warehouseContacted && energy.isActive('bridge') ? ['Привод моста', world.landmarks.bridgeStart] as const
            : energy.isActive('warehouse') && !progress.warehouseContacted ? ['Склад 04', world.landmarks.warehouse04] as const
              : ['Распределитель', world.landmarks.energyStation] as const;
  const dx = target.x - player.position.x, dz = target.z - player.position.z;
  const bearing = Math.atan2(dx, -dz) + yaw;
  const relative = Math.atan2(Math.sin(bearing), Math.cos(bearing));
  const direction = Math.abs(relative) > 2.3 ? 'позади' : Math.abs(relative) < 0.6 ? 'впереди' : relative > 0 ? 'справа' : 'слева';
  soyka.signal(target);
  hud.notify(`${label} · ${Math.round(Math.hypot(dx, dz))} м · ${direction}`, 6000);
  dialogue.say('СОЙКА', 'Держу сигнал. Ориентир отмечен.', 2.5);
});

if (!loadedState) {
  dialogue.play(openingStory(choice => {
    rememberChoice('tideOpening', choice);
    rememberResponse(choice === 'listen' ? 'vulnerable' : 'direct');
    persist(true);
  }));
}

input.setEnabled(false);
hud.setPaused(true);
dialogue.setPaused(true);
new OpeningScreen(app, Boolean(loadedState), () => {
  journeyStarted = true;
  dialogue.setPaused(false);
  if (saves.updatedStory && loadedState) dialogue.say('МАРА', chapterRecap(storyState), 11);
  hud.setClock(storyState.choices.tideEnding === 'seal' ? '22:48' : '22:47');
  setCameraMode(settings.cameraMode, false);
  hud.setPaused(false);
  input.setEnabled(true);
  void audioSystem.unlock().catch((error) => console.warn('Audio unavailable', error));
  if (recoveredOnLoad && loadedState) {
    hud.notify('Сохранение восстановлено: Лев снова на безопасном месте. Сюжетные выборы сохранены.', 7500);
  } else if (!loadedState) {
    hud.notify('СЕВЕРНЫЙ МАЯК · Служебная комната', 5000);
  }
  persist(false);
}, () => {
  saves.clear();
  location.reload();
});
cameraController.update(player.position, yaw, pitch, 1 / 60);
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);

  if (journeyStarted && !paused && !sliceEnded) {
    gameElapsed += dt;
    // Release pointer lock for clickable replies without pausing their story timer.
    input.setPointerLockAllowed(!dialogue.isChoosing);
    const controlsBlocked = hud.isEnergyOpen || cutoff.isOpen;
    input.setEnabled(!controlsBlocked);
    hud.interactButton.disabled = controlsBlocked || farewell.active;
    hud.soykaButton.disabled = controlsBlocked || farewell.active;
    hud.jumpButton.disabled = controlsBlocked || farewell.active;
    hud.cameraButton.disabled = controlsBlocked || farewell.active;
    input.update();
    if (input.consumeCameraToggle() && !farewell.active) setCameraMode(cameraMode === 'first' ? 'third' : 'first');
    const look = input.consumeLookDelta();
    yaw -= look.x * 0.004 * settings.cameraSensitivity;
    pitch = THREE.MathUtils.clamp(pitch - look.y * 0.003 * settings.cameraSensitivity,
      cameraMode === 'first' ? -1.32 : -0.55, cameraMode === 'first' ? 1.32 : 0.25);
    hud.setHeading(yaw);

    player.update(input, yaw, dt);
    physics.timestep = dt;
    physics.step();
    player.syncVisual();
    if (traversal.update(dt)) {
      input.setEnabled(false);
      farewell.cancel();
      cameraController.reset();
      firstPersonCamera.reset();
      soyka.reset(player.position);
      audioSystem.playMovementCue('water');
      hud.notify('Сильное течение. Лев выбрался на последнее безопасное место.');
      persist(true);
    }
    if (gameElapsed > 40) hud.hideControlHint();
    if (storyState.progress.lighthousePowered && player.grounded && player.position.z < 6
      && player.position.z > -3 && !storyState.choices.harborArrival && !dialogue.isBusy) {
      rememberChoice('harborArrival', 'seen');
      hud.notify('СЕВЕРНЫЙ ПОРТ · Приливная набережная', 6000);
      dialogue.say('МАРА', 'Слышишь колокол? Его сняли с башни до закрытия порта. Осмотри записи смотрителя на причалах — он оставлял нам отметки.', 8);
      audioSystem.playMysteryCue('bell');
      mysteryAtmosphere.pulse('arrival');
      persist(false);
    }

    if (
      storyState.progress.bridgeStarted
      && !storyState.progress.schoolEntered
      && canEnterSchool(player.position, player.grounded, world.isBridgeReady)
    ) {
      storyState.progress.schoolEntered = true;
      syncObjective();
      persist(true);
      if (!dialogue.isBusy) {
        dialogue.play([
          line('СОЙКА', 'Восемь ударов. Колокол на фасаде не двигается.'),
          line('МАРА', 'Приёмный узел в коридоре. Настрой Сойку на эту частоту.'),
          line('ЛЕВ', 'На полу сухие следы. Всё вокруг мокрое.'),
        ]);
      }
    }

    if (farewell.active && player.position.distanceTo(world.landmarks.energyStation) > 4.3) {
      farewell.cancel();
    }
    dialogue.update(dt);
    cutoff.update(dt);
    interactions.update(player.position, player.grounded && !controlsBlocked && !farewell.active);
    if (input.consumeInteract()) interactions.trigger();
    soyka.update(player.position, gameElapsed, dt, yaw);
    memory.update(dt);
    school.update(dt, player);
    world.update(dt);
    visualFoundation.update(dt, player.position);
    harbor.update(dt);
    mysteryAtmosphere.update(dt, player.position);
    audioSystem.setListenerYaw(yaw);

    autosaveElapsed += dt;
    if (autosaveElapsed >= 5) {
      autosaveElapsed = 0;
      persist(false);
    }

    if (cameraMode === 'first') firstPersonCamera.update(player.position, yaw, pitch, dt, player.isMoving, player.grounded, settings.headMotion, player.movementPace);
    else cameraController.update(player.position, yaw, pitch, dt);
  }

  if (!journeyStarted) {
    visualFoundation.update(dt, player.position);
    harbor.update(dt);
  }
  // Paused geometry is static. Redraw only for a resize or an explicit settings change.
  if ((!paused && !sliceEnded) || renderRequested) {
    renderer.render(world.scene, camera);
    renderRequested = false;
  }
}

animate();

addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    setPaused(true);
    persist(false);
  }
});
addEventListener('pagehide', () => persist(false));
addEventListener('resize', () => {
  renderRequested = true;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
