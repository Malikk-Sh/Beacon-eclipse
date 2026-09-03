import * as THREE from 'three';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app root');

app.innerHTML = `
  <div id="game"></div>
  <div class="hud">
    <button class="pause" aria-label="Пауза">Ⅱ</button>
    <div class="weather">☔ <span>22:47</span><small>9°C</small></div>
    <div class="objective"><span>◆</span> ВОССТАНОВИТЬ ПИТАНИЕ МОСТА</div>
    <div class="joystick" aria-hidden="true"><div class="stick"></div></div>
    <button class="soyka-button" id="soykaButton"><span class="soyka-dot"></span><b>СОЙКА</b></button>
    <button class="interact" id="interactButton">⚡ РАСПРЕДЕЛИТЕЛЬ</button>
    <div class="dialogue" id="dialogue">МАРА: Северный энергетический узел не отвечает.</div>
  </div>
  <div class="energy-panel hidden" id="energyPanel">
    <div class="panel-card">
      <header><span>РАСПРЕДЕЛЕНИЕ ЭНЕРГИИ</span><b id="energyAvailable">8 / 8</b></header>
      <p>Выберите системы, которые останутся под напряжением.</p>
      <button data-system="bridge" data-cost="6"><span>ГЛАВНЫЙ МОСТ</span><b>6</b></button>
      <button data-system="warehouse" data-cost="4"><span>СКЛАД 04</span><b>4</b></button>
      <button data-system="lights" data-cost="2"><span>ОСВЕЩЕНИЕ ПОРТА</span><b>2</b></button>
      <button data-system="pumps" data-cost="5"><span>НАСОСЫ</span><b>5</b></button>
      <footer><button id="closeEnergy">ЗАКРЫТЬ</button></footer>
    </div>
  </div>
`;

const container = document.querySelector<HTMLDivElement>('#game')!;
const dialogue = document.querySelector<HTMLDivElement>('#dialogue')!;
const energyPanel = document.querySelector<HTMLDivElement>('#energyPanel')!;
const energyAvailable = document.querySelector<HTMLElement>('#energyAvailable')!;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07111b);
scene.fog = new THREE.FogExp2(0x07111b, 0.018);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
camera.position.set(8, 6.5, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x7aa2c7, 0x101820, 1.4));
const keyLight = new THREE.DirectionalLight(0x9fc7ff, 2.2);
keyLight.position.set(-8, 18, 6);
keyLight.castShadow = true;
scene.add(keyLight);

const warmLight = new THREE.PointLight(0xff9a4c, 18, 18, 2);
warmLight.position.set(4, 4, -8);
scene.add(warmLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(70, 80),
  new THREE.MeshStandardMaterial({ color: 0x101923, roughness: 0.42, metalness: 0.35 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

function box(x: number, y: number, z: number, sx: number, sy: number, sz: number, color: number) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.28 })
  );
  mesh.position.set(x, y + sy / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// Port blockout: containers, warehouse, energy station, bridge approach.
box(-9, 0, -7, 5, 2.6, 12, 0x24313a);
box(-3, 0, -14, 8, 3.2, 4, 0x2b3438);
box(8, 0, -13, 13, 5.5, 9, 0x1e252a);
box(2, 0, -5, 5, 3, 4, 0x303b3f);
for (let i = 0; i < 7; i++) box(-11 + (i % 3) * 4, 0, 4 + Math.floor(i / 3) * 5, 3.4, 2.4, 4.2, 0x27343d);

const bridgeDeck = box(0, 0.1, -31, 7, 0.45, 28, 0x202a31);
bridgeDeck.receiveShadow = true;
for (const side of [-3.2, 3.2]) {
  for (let z = -19; z > -46; z -= 4) box(side, 0.4, z, 0.12, 1.2, 0.12, 0x5d2522);
}

const player = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.55, 1.15, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0x18222b, roughness: 0.75 })
);
body.position.y = 1.25;
body.castShadow = true;
player.add(body);
const backpack = new THREE.Mesh(
  new THREE.BoxGeometry(0.75, 0.9, 0.28),
  new THREE.MeshStandardMaterial({ color: 0x543a2b, roughness: 0.8 })
);
backpack.position.set(0, 1.35, 0.48);
player.add(backpack);
player.position.set(0, 0, 8);
scene.add(player);

const soyka = new THREE.Group();
const soykaBody = new THREE.Mesh(
  new THREE.SphereGeometry(0.48, 16, 12),
  new THREE.MeshStandardMaterial({ color: 0x2f363b, roughness: 0.45, metalness: 0.8 })
);
soykaBody.castShadow = true;
soyka.add(soykaBody);
const eye = new THREE.Mesh(
  new THREE.SphereGeometry(0.13, 12, 8),
  new THREE.MeshBasicMaterial({ color: 0x4fc3ff })
);
eye.position.z = -0.46;
soyka.add(eye);
scene.add(soyka);

const rainCount = 1800;
const rainPositions = new Float32Array(rainCount * 3);
for (let i = 0; i < rainCount; i++) {
  rainPositions[i * 3] = (Math.random() - 0.5) * 70;
  rainPositions[i * 3 + 1] = Math.random() * 28;
  rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
}
const rainGeometry = new THREE.BufferGeometry();
rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
const rain = new THREE.Points(
  rainGeometry,
  new THREE.PointsMaterial({ color: 0x9fc8e8, size: 0.035, transparent: true, opacity: 0.7 })
);
scene.add(rain);

const keys = new Set<string>();
addEventListener('keydown', (event) => keys.add(event.code));
addEventListener('keyup', (event) => keys.delete(event.code));

let yaw = 0;
let pitch = -0.12;
let dragging = false;
let previousX = 0;
let previousY = 0;

renderer.domElement.addEventListener('pointerdown', (event) => {
  dragging = true;
  previousX = event.clientX;
  previousY = event.clientY;
  renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  yaw -= (event.clientX - previousX) * 0.004;
  pitch = THREE.MathUtils.clamp(pitch - (event.clientY - previousY) * 0.003, -0.55, 0.25);
  previousX = event.clientX;
  previousY = event.clientY;
});
renderer.domElement.addEventListener('pointerup', () => dragging = false);

const systems = new Map<string, number>();
let warehouseContacted = false;

function updateEnergyUI() {
  const used = [...systems.values()].reduce((a, b) => a + b, 0);
  energyAvailable.textContent = `${8 - used} / 8`;
  document.querySelectorAll<HTMLButtonElement>('[data-system]').forEach((button) => {
    button.classList.toggle('active', systems.has(button.dataset.system!));
  });
}

document.querySelector('#interactButton')?.addEventListener('click', () => energyPanel.classList.remove('hidden'));
document.querySelector('#closeEnergy')?.addEventListener('click', () => energyPanel.classList.add('hidden'));
document.querySelector('#soykaButton')?.addEventListener('click', () => {
  dialogue.textContent = 'СОЙКА: Работаем.';
  soyka.userData.pulse = 1;
});

document.querySelectorAll<HTMLButtonElement>('[data-system]').forEach((button) => {
  button.addEventListener('click', () => {
    const name = button.dataset.system!;
    const cost = Number(button.dataset.cost);
    if (systems.has(name)) {
      systems.delete(name);
    } else {
      const used = [...systems.values()].reduce((a, b) => a + b, 0);
      if (used + cost > 8) {
        dialogue.textContent = 'МАРА: Энергии недостаточно. Что-то придётся отключить.';
        return;
      }
      systems.set(name, cost);
    }

    if (systems.has('warehouse') && !warehouseContacted) {
      warehouseContacted = true;
      dialogue.textContent = 'НЕИЗВЕСТНЫЙ ГОЛОС: ...эй? Здесь кто-нибудь есть?';
    }
    if (warehouseContacted && !systems.has('warehouse') && systems.has('bridge')) {
      dialogue.textContent = 'НИКА: Лев, подожди... Ты ведь вернёшься?';
    }
    updateEnergyUI();
  });
});
updateEnergyUI();

const clock = new THREE.Clock();
const velocity = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);

  const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
  const strafe = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
  const move = new THREE.Vector3(strafe, 0, -forward);
  if (move.lengthSq() > 0) {
    move.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    velocity.lerp(move.multiplyScalar(5.1), 0.16);
    player.rotation.y = Math.atan2(velocity.x, velocity.z) + Math.PI;
  } else {
    velocity.lerp(new THREE.Vector3(), 0.12);
  }
  player.position.addScaledVector(velocity, dt);
  player.position.x = THREE.MathUtils.clamp(player.position.x, -14, 14);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -43, 13);

  const t = clock.elapsedTime;
  soyka.position.set(
    player.position.x - 1.25 + Math.sin(t * 1.2) * 0.08,
    2.2 + Math.sin(t * 2.1) * 0.12,
    player.position.z + 0.15
  );
  soyka.rotation.y = t * 0.35;
  if (soyka.userData.pulse) {
    eye.scale.setScalar(1 + soyka.userData.pulse * 0.7);
    soyka.userData.pulse = Math.max(0, soyka.userData.pulse - dt * 2.5);
  } else eye.scale.setScalar(1);

  const positions = rainGeometry.attributes.position.array as Float32Array;
  for (let i = 0; i < rainCount; i++) {
    positions[i * 3 + 1] -= 16 * dt;
    if (positions[i * 3 + 1] < 0) positions[i * 3 + 1] = 28;
  }
  rainGeometry.attributes.position.needsUpdate = true;

  cameraTarget.set(player.position.x, 1.45, player.position.z);
  const offset = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch) * 7.5,
    3.1 + Math.sin(-pitch) * 4,
    Math.cos(yaw) * Math.cos(pitch) * 7.5
  );
  const desired = cameraTarget.clone().add(offset);
  camera.position.lerp(desired, 0.08);
  camera.lookAt(cameraTarget);

  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
