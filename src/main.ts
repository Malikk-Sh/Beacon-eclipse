import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import './style.css';
import './dialogue.css';
import { DialogueSystem } from './game/DialogueSystem';
import { EnergySystem } from './game/EnergySystem';
import { InputController } from './game/InputController';
import { InteractionSystem } from './game/InteractionSystem';
import { PlayerController } from './game/PlayerController';
import { SoykaController } from './game/SoykaController';
import { GameWorld } from './game/World';
import { Hud } from './ui/Hud';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app root');

await RAPIER.init();
const physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
const energy = new EnergySystem();
const hud = new Hud(app, energy);
const dialogue = new DialogueSystem(hud);
const world = new GameWorld(physics);
const player = new PlayerController(physics, world.scene);
const soyka = new SoykaController(world.scene);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
hud.gameContainer.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
const input = new InputController(hud.joystick, hud.stick, renderer.domElement);
const interactions = new InteractionSystem(hud.interactButton);

let warehouseContacted = false;
let lighthousePowered = false;
let bridgeStarted = false;
let yaw = 0;
let pitch = -0.12;

const responseProfile = {
  direct: 0,
  vulnerable: 0,
  silent: 0,
};

function rememberResponse(kind: keyof typeof responseProfile) {
  responseProfile[kind] += 1;
}

interactions.add({
  id: 'lighthouse-panel',
  label: '⚡ АВАРИЙНЫЙ ЩИТ — ЗАПУСТИТЬ',
  position: world.landmarks.lighthousePanel,
  radius: 2.5,
  enabled: () => !lighthousePowered,
  action: () => {
    lighthousePowered = true;
    world.unlockLighthouseDoor();
    hud.setObjective('ДОБРАТЬСЯ ДО ЭНЕРГОСТАНЦИИ');
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
  id: 'warehouse-radio',
  label: '◉ РАДИО — ОТВЕТИТЬ',
  position: world.landmarks.warehouse04,
  radius: 3.3,
  enabled: () => energy.isActive('warehouse') && !warehouseContacted,
  action: () => {
    warehouseContacted = true;
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
          if (choice === 'lost') rememberResponse('vulnerable');
          else if (choice === 'silence') rememberResponse('silent');
          else rememberResponse('direct');
        },
      },
      { kind: 'line', speaker: 'НИКА', text: 'Только не отключайся, ладно?', duration: 2.7 },
    ], () => {
      hud.setObjective('ВОССТАНОВИТЬ ПИТАНИЕ МОСТА');
    });
  },
});

interactions.add({
  id: 'bridge-drive',
  label: '⚡ ЗАПУСТИТЬ ПРИВОД МОСТА',
  position: world.landmarks.bridgeStart,
  radius: 3.6,
  enabled: () => energy.isActive('bridge') && !bridgeStarted,
  action: () => {
    bridgeStarted = true;
    hud.setObjective('ПЕРЕЙТИ МОСТ');
    dialogue.play([
      { kind: 'line', speaker: 'МАРА', text: 'Путь открыт.', duration: 2 },
      { kind: 'line', speaker: 'ЛЕВ', text: 'Я возвращаюсь за ней.', duration: 2.2 },
      { kind: 'line', speaker: 'МАРА', text: 'За кем?', duration: 1.8 },
      { kind: 'line', speaker: 'ЛЕВ', text: 'Никой.', duration: 1.8 },
      { kind: 'line', speaker: 'МАРА', text: 'Лев...', duration: 2.5 },
    ]);
  },
});

energy.onInsufficientPower = () => {
  dialogue.say('МАРА', 'Энергии недостаточно. Что-то придётся отключить.');
};
energy.onChange = () => {
  if (warehouseContacted && !energy.isActive('warehouse') && energy.isActive('bridge')) {
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
          if (choice === 'silence') rememberResponse('silent');
          else if (choice === 'honest') rememberResponse('vulnerable');
          else rememberResponse('direct');
        },
      },
    ]);
    hud.setObjective('ЗАПУСТИТЬ ПРИВОД МОСТА');
  } else if (energy.isActive('warehouse') && !warehouseContacted) {
    dialogue.say('МАРА', 'На Складе 04 появился слабый радиосигнал.');
    hud.setObjective('ПРОВЕРИТЬ СКЛАД 04');
  } else if (energy.isActive('bridge')) {
    dialogue.say('МАРА', 'Мост получает питание. Доберись до привода.');
    hud.setObjective('ЗАПУСТИТЬ ПРИВОД МОСТА');
  }
  hud.refreshEnergy();
};

hud.soykaButton.addEventListener('click', () => {
  soyka.signal();
  dialogue.say('СОЙКА', 'Работаем.', 1.8);
});

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
    onSelect: (choice) => rememberResponse(choice === 'silence' ? 'silent' : 'direct'),
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
      if (choice === 'nothing') rememberResponse('vulnerable');
      else if (choice === 'silence') rememberResponse('silent');
      else rememberResponse('direct');
    },
  },
  { kind: 'line', speaker: 'МАРА', text: 'Основное питание отключено. Найди аварийный щит.', duration: 3 },
]);

const clock = new THREE.Clock();
const cameraTarget = new THREE.Vector3();
const cameraOffset = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;

  input.update();
  const look = input.consumeLookDelta();
  yaw -= look.x * 0.004;
  pitch = THREE.MathUtils.clamp(pitch - look.y * 0.003, -0.55, 0.25);

  player.update(input, yaw, dt);
  physics.timestep = dt;
  physics.step();
  player.syncVisual();

  dialogue.update(dt);
  interactions.update(player.position);
  soyka.update(player.position, elapsed, dt);
  world.update(dt);

  cameraTarget.set(player.position.x, player.position.y + 1.45, player.position.z);
  cameraOffset.set(
    Math.sin(yaw) * Math.cos(pitch) * 7.5,
    3.1 + Math.sin(-pitch) * 4,
    Math.cos(yaw) * Math.cos(pitch) * 7.5,
  );
  camera.position.lerp(cameraTarget.clone().add(cameraOffset), 0.08);
  camera.lookAt(cameraTarget);

  renderer.render(world.scene, camera);
}

animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
