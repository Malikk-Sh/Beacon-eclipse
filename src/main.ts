import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import './style.css';
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
let yaw = 0;
let pitch = -0.12;

interactions.add({
  id: 'energy-station',
  label: '⚡ РАСПРЕДЕЛИТЕЛЬ',
  position: new THREE.Vector3(2, 0, -1.7),
  radius: 4.3,
  action: () => hud.openEnergy(),
});

interactions.add({
  id: 'warehouse-radio',
  label: '◉ РАДИО — ОТВЕТИТЬ',
  position: new THREE.Vector3(8, 0, -7.25),
  radius: 3.3,
  enabled: () => energy.isActive('warehouse') && !warehouseContacted,
  action: () => {
    warehouseContacted = true;
    hud.setDialogue('НИКА: ...эй? Здесь кто-нибудь есть? Я Ника.');
  },
});

energy.onInsufficientPower = () => {
  hud.setDialogue('МАРА: Энергии недостаточно. Что-то придётся отключить.');
};
energy.onChange = () => {
  if (warehouseContacted && !energy.isActive('warehouse') && energy.isActive('bridge')) {
    hud.setDialogue('НИКА: Лев, подожди... Ты ведь вернёшься?');
  } else if (energy.isActive('warehouse') && !warehouseContacted) {
    hud.setDialogue('МАРА: На Складе 04 появился слабый радиосигнал.');
  } else if (energy.isActive('bridge')) {
    hud.setDialogue('МАРА: Мост получает питание. Проверь привод.');
  }
  hud.refreshEnergy();
};

hud.soykaButton.addEventListener('click', () => {
  soyka.signal();
  hud.setDialogue('СОЙКА: Работаем.');
});

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
