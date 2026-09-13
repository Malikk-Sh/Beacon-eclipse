import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function roundedBox(x: number, y: number, z: number, radius = 0.035): THREE.BufferGeometry {
  return new RoundedBoxGeometry(x, y, z, 2, Math.min(radius, x * 0.22, y * 0.22, z * 0.22));
}

export function part(root: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material,
  x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

export function cable(root: THREE.Object3D, material: THREE.Material, points: number[][],
  radius = 0.015, segments = 12): THREE.Mesh {
  return part(root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2]))),
    segments, radius, 6, false), material);
}

/** Preserve joints/groups but batch the static pieces attached to each joint by material. */
export function consolidate(root: THREE.Object3D): void {
  for (const child of [...root.children]) if (child instanceof THREE.Group) consolidate(child);
  const groups = new Map<THREE.Material, THREE.Mesh[]>();
  for (const child of root.children) {
    if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh || Array.isArray(child.material)) continue;
    const list = groups.get(child.material) ?? [];
    list.push(child);
    groups.set(child.material, list);
  }
  for (const [material, meshes] of groups) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map(mesh => {
      mesh.updateMatrix();
      const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      source.applyMatrix4(mesh.matrix);
      for (const attribute of Object.keys(source.attributes)) if (!['position', 'normal', 'uv'].includes(attribute)) source.deleteAttribute(attribute);
      return source;
    });
    const merged = mergeGeometries(geometries, false);
    geometries.forEach(geometry => geometry.dispose());
    if (!merged) continue;
    const batch = new THREE.Mesh(merged, material);
    batch.castShadow = meshes.some(mesh => mesh.castShadow);
    batch.receiveShadow = true;
    root.add(batch);
    meshes.forEach(mesh => root.remove(mesh));
  }
}

export function labelMaterial(title: string, subtitle = '', color = '#c6c4ad', background = '#202b2c'): THREE.Material {
  if (typeof document === 'undefined') return new THREE.MeshStandardMaterial({ color: 0x777d75 });
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.MeshStandardMaterial({ color: 0x777d75 });
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#8b998866';
  ctx.lineWidth = 2;
  ctx.strokeRect(9, 9, 494, 142);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.font = '500 36px sans-serif';
  ctx.fillText(title, 256, 73, 470);
  ctx.fillStyle = '#abb5b0';
  ctx.font = '19px monospace';
  ctx.fillText(subtitle, 256, 121, 470);
  // Faded paint and specks, shared with the label rather than extra geometry.
  ctx.fillStyle = background + '55';
  for (let i = 0; i < 80; i++) ctx.fillRect(i * 73 % 512, i * 29 % 160, 1 + i % 3, 2);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.85, metalness: 0.05 });
}
