import * as THREE from 'three';

export type SurfaceKind = 'ground' | 'concrete' | 'steel' | 'fabric' | 'water';
export interface SurfaceTextures {
  color: THREE.DataTexture;
  roughness: THREE.DataTexture;
  normal: THREE.DataTexture;
}
const cache = new Map<SurfaceKind, SurfaceTextures>();
const SIZE = 256;
const clamp = THREE.MathUtils.clamp;

function hash(x: number, y: number, seed: number): number {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/** Periodic value noise: every map tiles without a border or a random reload. */
export function tileNoise(u: number, v: number, cells: number, seed = 13): number {
  const x = u * cells;
  const y = v * cells;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const x0 = ((ix % cells) + cells) % cells;
  const y0 = ((iy % cells) + cells) % cells;
  const x1 = (x0 + 1) % cells;
  const y1 = (y0 + 1) % cells;
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(hash(x0, y0, seed), hash(x1, y0, seed), sx),
    THREE.MathUtils.lerp(hash(x0, y1, seed), hash(x1, y1, seed), sx), sy,
  );
}

function texture(data: Uint8Array, color = false): THREE.DataTexture {
  const map = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  map.needsUpdate = true;
  return map;
}

/** Shared small PBR maps; no network, canvas, per-frame noise or per-object copies. */
export function getSurfaceTextures(kind: SurfaceKind): SurfaceTextures {
  const existing = cache.get(kind);
  if (existing) return existing;
  const color = new Uint8Array(SIZE * SIZE * 4);
  const roughness = new Uint8Array(color.length);
  const normal = new Uint8Array(color.length);
  const height = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      const u = x / SIZE;
      const v = y / SIZE;
      const broad = tileNoise(u, v, 4);
      const medium = tileNoise(u, v, 16, 31);
      const grain = hash(x, y, 71);
      let value = 0.76 + broad * 0.13 + (grain - 0.5) * 0.08;
      let rough = 0.8;
      let relief = medium * 0.08 + grain * 0.06;
      let rust = 0;
      if (kind === 'ground') {
        // Uneven water collects between aggregate, not on rectangular overlay planes.
        const pool = THREE.MathUtils.smoothstep(broad * 0.8 + medium * 0.2, 0.49, 0.64);
        const joint = Math.min(u, 1 - u, v, 1 - v) < 0.005 ? 0.16 : 0;
        const crack = Math.max(0, 1 - Math.abs(tileNoise(u, v, 8, 92) - 0.5) * 110) * 0.12;
        value = 0.8 + grain * 0.16 - pool * 0.24 - joint - crack;
        rough = 0.85 - pool * 0.59 + (grain - 0.5) * 0.07;
        relief = (grain * 0.13 + medium * 0.08 - joint - crack) * (1 - pool * 0.96);
      } else if (kind === 'concrete') {
        const pore = grain > 0.96 ? 0.13 : 0;
        value -= pore + (1 - medium) * 0.1;
        rough = 0.78 + grain * 0.18;
        relief -= pore;
      } else if (kind === 'steel') {
        const streak = tileNoise(u * 8, v, 4, 43);
        rust = THREE.MathUtils.smoothstep(broad * 0.6 + medium * 0.4, 0.61, 0.8);
        value = 0.85 + grain * 0.07 - streak * 0.14 - rust * 0.18;
        rough = 0.46 + streak * 0.17 + rust * 0.3;
        relief = grain * 0.025 + rust * 0.11;
      } else if (kind === 'fabric') {
        const weave = ((x % 4 < 2) === (y % 4 < 2)) ? 0.025 : -0.025;
        value = 0.83 + broad * 0.12 + weave;
        relief = weave + medium * 0.025;
        rough = 0.83 + grain * 0.12;
      } else {
        value = 0.86 + medium * 0.12;
        rough = 0.4 + medium * 0.17;
        relief = Math.sin(u * Math.PI * 16 + tileNoise(u, v, 4) * 5) * 0.3
          + Math.sin(v * Math.PI * 24 + tileNoise(u, v, 8) * 3) * 0.16;
      }
      height[i] = relief;
      color[i * 4] = clamp((value + rust * 0.08) * 255, 0, 255);
      color[i * 4 + 1] = clamp((value - rust * 0.17) * 255, 0, 255);
      color[i * 4 + 2] = clamp((value - rust * 0.27) * 255, 0, 255);
      color[i * 4 + 3] = 255;
      roughness.fill(clamp(rough * 255, 0, 255), i * 4, i * 4 + 3);
      roughness[i * 4 + 3] = 255;
    }
  }
  const at = (x: number, y: number) => height[((y + SIZE) % SIZE) * SIZE + (x + SIZE) % SIZE];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      const dx = (at(x - 1, y) - at(x + 1, y)) * 2.4;
      const dy = (at(x, y - 1) - at(x, y + 1)) * 2.4;
      const length = Math.hypot(dx, dy, 1);
      normal[i] = (dx / length * 0.5 + 0.5) * 255;
      normal[i + 1] = (dy / length * 0.5 + 0.5) * 255;
      normal[i + 2] = (1 / length * 0.5 + 0.5) * 255;
      normal[i + 3] = 255;
    }
  }
  const maps = { color: texture(color, true), roughness: texture(roughness), normal: texture(normal) };
  cache.set(kind, maps);
  return maps;
}

export function surfaceMaterial(kind: SurfaceKind, color: number, metalness = 0): THREE.MeshStandardMaterial {
  const maps = getSurfaceTextures(kind);
  const material = new THREE.MeshStandardMaterial({
    color, map: maps.color, roughness: 1, roughnessMap: maps.roughness,
    normalMap: maps.normal, normalScale: new THREE.Vector2(0.65, 0.65), metalness,
  });
  material.userData.surfaceKind = kind;
  return material;
}

/** Authored world units instead of stretching one texture across an entire building. */
export function projectSurfaceUVs(geometry: THREE.BufferGeometry, repeatMeters = 3): void {
  if (geometry.userData.surfaceUVs) return;
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  if (!position || !normal || !uv) return;
  if (geometry instanceof THREE.CylinderGeometry) {
    const { radiusTop, radiusBottom, height } = geometry.parameters;
    const circumference = Math.PI * (radiusTop + radiusBottom);
    for (let i = 0; i < uv.count; i++) {
      if (Math.abs(normal.getY(i)) > 0.95) uv.setXY(i, position.getX(i) / repeatMeters, position.getZ(i) / repeatMeters);
      else uv.setXY(i, uv.getX(i) * circumference / repeatMeters, uv.getY(i) * height / repeatMeters);
    }
    uv.needsUpdate = true;
    geometry.userData.surfaceUVs = true;
    return;
  }
  // Preserve the seam of other curved geometry; planar projection is for architectural faces.
  if (geometry.type !== 'BoxGeometry' && geometry.type !== 'RoundedBoxGeometry' && geometry.type !== 'PlaneGeometry' && geometry.type !== 'ShapeGeometry') return;
  for (let i = 0; i < position.count; i++) {
    const nx = Math.abs(normal.getX(i));
    const ny = Math.abs(normal.getY(i));
    const nz = Math.abs(normal.getZ(i));
    if (nx > ny && nx > nz) uv.setXY(i, position.getZ(i) / repeatMeters, position.getY(i) / repeatMeters);
    else if (ny > nz) uv.setXY(i, position.getX(i) / repeatMeters, position.getZ(i) / repeatMeters);
    else uv.setXY(i, position.getX(i) / repeatMeters, position.getY(i) / repeatMeters);
  }
  uv.needsUpdate = true;
  geometry.userData.surfaceUVs = true;
}

let cachedPuddleMask: THREE.DataTexture | undefined;

function getPuddleMask(): THREE.DataTexture {
  if (cachedPuddleMask) return cachedPuddleMask;
  const alpha = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE;
      const v = y / SIZE;
      const radius = Math.hypot((u - 0.5) * 2, (v - 0.5) * 2);
      const edge = 0.65 + tileNoise(u, v, 8, 24) * 0.28;
      const opacity = 1 - THREE.MathUtils.smoothstep(radius, edge - 0.16, edge);
      alpha.fill(opacity * 210, (y * SIZE + x) * 4, (y * SIZE + x) * 4 + 4);
    }
  }
  const mask = texture(alpha);
  mask.wrapS = mask.wrapT = THREE.ClampToEdgeWrapping;
  cachedPuddleMask = mask;
  return mask;
}

export function puddleMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x43535a, roughness: 0.26, metalness: 0.08,
    normalMap: getSurfaceTextures('water').normal, normalScale: new THREE.Vector2(0.17, 0.17),
    alphaMap: getPuddleMask(), transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
}
