import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { MaterialLibrary } from '../src/world/MaterialLibrary';
import { PortSurfaceDetails } from '../src/world/PortSurfaceDetails';
import { StormEnvironment } from '../src/world/StormEnvironment';
import { getSurfaceTextures, projectSurfaceUVs, tileNoise, type SurfaceKind } from '../src/world/SurfaceTextures';

test('PBR maps share a bounded allocation, tile, and keep color separate from linear surface data', () => {
  let bytes = 0;
  for (const kind of ['ground', 'concrete', 'steel', 'fabric', 'water'] as SurfaceKind[]) {
    const maps = getSurfaceTextures(kind);
    assert.equal(maps, getSurfaceTextures(kind));
    assert.equal(maps.color.colorSpace, THREE.SRGBColorSpace);
    assert.equal(maps.roughness.colorSpace, THREE.NoColorSpace);
    assert.equal(maps.normal.colorSpace, THREE.NoColorSpace);
    for (const map of Object.values(maps)) bytes += map.image.data.byteLength;
    const normals = maps.normal.image.data;
    const roughness = maps.roughness.image.data;
    for (let i = 0; i < normals.length; i += 4) {
      const length = Math.hypot(Number(normals[i]) / 127.5 - 1, Number(normals[i + 1]) / 127.5 - 1, Number(normals[i + 2]) / 127.5 - 1);
      assert.ok(Math.abs(length - 1) < 0.02);
      assert.ok(Number(roughness[i + 1]) >= 40 && Number(roughness[i + 1]) <= 250);
    }
  }
  assert.ok(bytes <= 4 * 1024 * 1024, `${bytes} source texture bytes`);
  for (const [u, v] of [[0, 0.3], [-0.1, 0.92], [1.37, -0.8]]) {
    assert.ok(Math.abs(tileNoise(u, v, 16) - tileNoise(u + 1, v - 1, 16)) < 1e-12);
  }
  const plane = new THREE.PlaneGeometry(30, 12);
  projectSurfaceUVs(plane);
  const uv = plane.getAttribute('uv');
  assert.equal(Math.abs(uv.getX(1) - uv.getX(0)), 10);
  assert.equal(Math.abs(uv.getY(2) - uv.getY(0)), 4);
});

test('port detail stays batched with finite geometry and transforms', () => {
  const scene = new THREE.Scene();
  new PortSurfaceDetails(scene, new MaterialLibrary());
  let draws = 0;
  let triangles = 0;
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    draws++;
    const instances = object instanceof THREE.InstancedMesh ? object.count : 1;
    triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3 * instances;
    for (const value of object.geometry.getAttribute('position').array) assert.ok(Number.isFinite(value));
    if (object instanceof THREE.InstancedMesh) {
      for (const value of object.instanceMatrix.array) assert.ok(Number.isFinite(value));
    }
  });
  assert.ok(draws <= 16, `${draws} detail draw submissions`);
  assert.ok(triangles < 18000, `${triangles} detail triangles`);
});

test('the storm sky is a finite linear environment with no flat-color fallback', () => {
  const scene = new THREE.Scene();
  new StormEnvironment(scene);
  assert.ok(scene.background instanceof THREE.DataTexture);
  assert.equal(scene.background.mapping, THREE.EquirectangularReflectionMapping);
  assert.equal(scene.background.colorSpace, THREE.LinearSRGBColorSpace);
  assert.ok(scene.background.image.data.byteLength <= 1024 * 1024);
  let darkest = Infinity;
  let brightest = 0;
  for (let i = 0; i < scene.background.image.data.length; i += 4) {
    const value = THREE.DataUtils.fromHalfFloat(Number(scene.background.image.data[i]));
    assert.ok(Number.isFinite(value) && value > 0 && value < 2);
    darkest = Math.min(darkest, value);
    brightest = Math.max(brightest, value);
  }
  assert.ok(brightest > darkest * 5);
});
