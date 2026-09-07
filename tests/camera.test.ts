import assert from 'node:assert/strict';
import { before, test, type TestContext } from 'node:test';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { ThirdPersonCamera } from '../src/game/ThirdPersonCamera';
import { GameWorld } from '../src/game/World';
import { SchoolArea } from '../src/world/areas/SchoolArea';

before(async () => { await RAPIER.init(); });

function fixture(t: TestContext, aspect = 16 / 9) {
  const physics = new RAPIER.World({ x: 0, y: 0, z: 0 });
  t.after(() => physics.free());
  const player = physics.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 1.05, 0));
  const collider = physics.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.48), player);
  const camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 500);
  const controller = new ThirdPersonCamera(camera, physics, collider);
  const position = new THREE.Vector3();
  physics.step();
  function box(x: number, y: number, z: number, hx: number, hy: number, hz: number) {
    const obstacle = physics.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z));
    physics.step();
    return obstacle;
  }
  function update(dt = 1 / 60, yaw = 0, pitch = -0.12) {
    controller.update(position, yaw, pitch, dt);
  }
  return { physics, collider, camera, controller, position, box, update };
}

test('open landscape/portrait retain their authored framing and initialize without flying from world origin', (t) => {
  for (const [aspect, distance] of [[16 / 9, 7.5], [0.5, 9.1]]) {
    const s = fixture(t, aspect);
    s.position.set(0, 0.4, -73);
    s.update();
    assert.ok(Math.abs(s.camera.position.z - (-73 + Math.cos(-0.12) * distance)) < 1e-6);
    assert.ok(Math.abs(s.camera.position.y - (0.4 + 1.45 + 3.1 + Math.sin(0.12) * 4)) < 1e-6);
  }
});

test('the player capsule and sensor volumes do not collapse the camera', (t) => {
  const s = fixture(t);
  s.physics.createCollider(RAPIER.ColliderDesc.cuboid(5, 5, 1).setTranslation(0, 2, 3).setSensor(true));
  s.physics.step();
  s.update();
  assert.ok(s.camera.position.z > 7);
});

test('a thin wall blocks the entire camera volume before its near plane reaches the surface', (t) => {
  const s = fixture(t);
  s.box(0, 3, 3, 5, 3, 0.02);
  s.update();
  assert.ok(s.camera.position.z < 2.76);
  assert.ok(s.camera.position.z > 2.5);
  const overlap = s.physics.intersectionWithShape(s.camera.position, { x: 0, y: 0, z: 0, w: 1 }, new RAPIER.Ball(0.22),
    RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, s.collider);
  assert.equal(overlap, null);
});

test('a suddenly blocked path clamps immediately, while removing the door recovers smoothly', (t) => {
  const s = fixture(t);
  s.update();
  const unobstructed = s.camera.position.z;
  const door = s.box(0, 3, 3, 5, 3, 0.12);
  s.update();
  const blocked = s.camera.position.z;
  assert.ok(blocked < 2.66);
  s.physics.removeCollider(door, true);
  s.physics.step();
  s.update();
  assert.ok(s.camera.position.z > blocked);
  assert.ok(s.camera.position.z < unobstructed - 1);
  for (let frame = 0; frame < 240; frame++) s.update();
  assert.ok(Math.abs(s.camera.position.z - unobstructed) < 0.001);
});

test('camera follow has equivalent timing at 30, 60 and 120 Hz', (t) => {
  const results: THREE.Vector3[] = [];
  for (const rate of [30, 60, 120]) {
    const s = fixture(t);
    s.update();
    for (let i = 0; i < rate; i++) s.update(1 / rate, 0.7);
    results.push(s.camera.position.clone());
  }
  assert.ok(results[0].distanceTo(results[1]) < 1e-6);
  assert.ok(results[1].distanceTo(results[2]) < 1e-6);
});

test('orbital movement around a corridor corner never leaves camera volume inside a wall', (t) => {
  const s = fixture(t);
  s.box(4, 3, 0, 0.15, 3, 20);
  s.box(0, 3, 4, 4, 3, 0.15);
  const rotation = { x: 0, y: 0, z: 0, w: 1 };
  for (let i = 0; i < 180; i++) {
    s.position.x = Math.sin(i / 50) * 2.5;
    s.update(1 / 60, i / 90 * Math.PI);
    const overlap = s.physics.intersectionWithShape(s.camera.position, rotation, new RAPIER.Ball(0.22),
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, s.collider);
    assert.equal(overlap, null, `camera intersects a wall at frame ${i}`);
  }
});

test('ceiling collision and ultrawide near-plane clearance are respected', (t) => {
  const s = fixture(t, 5);
  s.box(0, 3, 0, 20, 0.1, 20);
  s.update();
  const halfHeight = s.camera.near * Math.tan(THREE.MathUtils.degToRad(55 / 2));
  const radius = Math.hypot(s.camera.near, halfHeight, halfHeight * s.camera.aspect);
  assert.ok(s.camera.position.y + radius < 2.9);
});

test('a saved-position teleport resets lag but still respects the destination wall', (t) => {
  const s = fixture(t);
  s.update();
  s.box(20, 3, -67, 6, 3, 0.15);
  s.position.set(20, 0, -70);
  s.update();
  assert.equal(s.camera.position.x, 20);
  assert.ok(s.camera.position.z < -67.37);
  assert.ok(s.camera.position.z > -70);
});

test('actual lighthouse and school camera envelopes protect walls, tower and beams without gameplay bodies', (t) => {
  const s = fixture(t);
  const world = new GameWorld(s.physics);
  const schoolOrigin = new THREE.Vector3(0, 0, -60);
  const schoolRoot = new THREE.Group();
  schoolRoot.position.copy(schoolOrigin);
  new SchoolArea(schoolRoot, s.physics, schoolOrigin, world.cameraObstacles);
  s.physics.step();
  const controller = new ThirdPersonCamera(s.camera, s.physics, s.collider, world.cameraObstacles);
  const cameraShape = new RAPIER.Ball(0.22);
  const rotation = { x: 0, y: 0, z: 0, w: 1 };
  const bodyCount = s.physics.bodies.len();
  const colliderCount = s.physics.colliders.len();
  for (const [x, y, z] of [[0, 0, 24], [3, 0, 25], [0, 0.4, -73], [3.5, 0.4, -84]]) {
    s.position.set(x, y, z);
    for (let i = 0; i < 120; i++) {
      controller.update(s.position, i * Math.PI / 60, -0.12, 1 / 60);
      assert.equal(s.physics.intersectionWithShape(s.camera.position, rotation, cameraShape,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, s.collider), null);
      for (const obstacle of world.cameraObstacles) {
        assert.equal(cameraShape.intersectsShape(s.camera.position, rotation, obstacle.shape, obstacle.position, rotation), false);
      }
    }
  }
  assert.equal(s.physics.bodies.len(), bodyCount);
  assert.equal(s.physics.colliders.len(), colliderCount);
  assert.equal(world.cameraObstacles.length, 10);
});
