import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export interface ModelTransform {
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: number | readonly [number, number, number];
}

export interface ModelInstance {
  root: THREE.Group;
  animations: readonly THREE.AnimationClip[];
  source: string;
  fallback: boolean;
}

export class AssetManager {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, Promise<GLTF>>();

  preload(urls: readonly string[]): Promise<PromiseSettledResult<GLTF>[]> {
    return Promise.allSettled(urls.map((url) => this.load(url)));
  }

  load(url: string): Promise<GLTF> {
    const cached = this.cache.get(url);
    if (cached) return cached;

    const request = this.loader.loadAsync(url).catch((error: unknown) => {
      this.cache.delete(url);
      throw error;
    });
    this.cache.set(url, request);
    return request;
  }

  async instantiate(
    url: string,
    transform: ModelTransform = {},
    fallbackName = 'Missing asset',
  ): Promise<ModelInstance> {
    try {
      const asset = await this.load(url);
      const root = SkeletonUtils.clone(asset.scene) as THREE.Group;
      root.name = asset.scene.name || url;
      this.applyTransform(root, transform);
      this.prepareInstance(root);
      return {
        root,
        animations: asset.animations,
        source: url,
        fallback: false,
      };
    } catch (error) {
      console.warn(`Failed to load GLB asset: ${url}`, error);
      const root = this.createFallback(fallbackName);
      this.applyTransform(root, transform);
      return {
        root,
        animations: [],
        source: url,
        fallback: true,
      };
    }
  }

  disposeInstance(instance: ModelInstance): void {
    instance.root.removeFromParent();
    if (instance.fallback) this.disposeObject(instance.root);
  }

  async clear(): Promise<void> {
    const requests = [...this.cache.values()];
    this.cache.clear();
    const results = await Promise.allSettled(requests);
    const disposed = new Set<THREE.Object3D>();

    for (const result of results) {
      if (result.status !== 'fulfilled' || disposed.has(result.value.scene)) continue;
      disposed.add(result.value.scene);
      this.disposeObject(result.value.scene);
    }
  }

  private applyTransform(root: THREE.Object3D, transform: ModelTransform): void {
    if (transform.position) root.position.fromArray(transform.position);
    if (transform.rotation) root.rotation.set(...transform.rotation);
    if (typeof transform.scale === 'number') {
      root.scale.setScalar(transform.scale);
    } else if (transform.scale) {
      root.scale.fromArray(transform.scale);
    }
  }

  private prepareInstance(root: THREE.Object3D): void {
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
  }

  private createFallback(name: string): THREE.Group {
    const root = new THREE.Group();
    root.name = `Fallback: ${name}`;

    const material = new THREE.MeshStandardMaterial({
      color: 0x394954,
      emissive: 0x5c321d,
      emissiveIntensity: 0.35,
      roughness: 0.58,
      metalness: 0.28,
      wireframe: true,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), material);
    body.position.y = 0.45;
    body.castShadow = true;
    body.receiveShadow = true;
    root.add(body);

    const marker = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      new THREE.MeshBasicMaterial({ color: 0xff9a55 }),
    );
    marker.position.y = 1.08;
    root.add(marker);
    return root;
  }

  private disposeObject(root: THREE.Object3D): void {
    const textures = new Set<THREE.Texture>();
    const materials = new Set<THREE.Material>();
    const geometries = new Set<THREE.BufferGeometry>();

    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of meshMaterials) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) textures.add(value);
        }
      }
    });

    textures.forEach((texture) => texture.dispose());
    materials.forEach((material) => material.dispose());
    geometries.forEach((geometry) => geometry.dispose());
  }
}
