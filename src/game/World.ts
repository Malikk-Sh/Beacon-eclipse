import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export interface WorldLandmarks {
  energyStation: THREE.Vector3;
  warehouse04: THREE.Vector3;
  bridgeStart: THREE.Vector3;
}

export class GameWorld {
  readonly scene = new THREE.Scene();
  readonly landmarks: WorldLandmarks = {
    energyStation: new THREE.Vector3(2, 0, -5),
    warehouse04: new THREE.Vector3(8, 0, -13),
    bridgeStart: new THREE.Vector3(0, 0, -18),
  };

  private readonly rainGeometry: THREE.BufferGeometry;
  private readonly rainCount = 1200;

  constructor(private readonly physics: RAPIER.World) {
    this.scene.background = new THREE.Color(0x07111b);
    this.scene.fog = new THREE.FogExp2(0x07111b, 0.018);

    this.scene.add(new THREE.HemisphereLight(0x7aa2c7, 0x101820, 1.35));
    const keyLight = new THREE.DirectionalLight(0x9fc7ff, 2.1);
    keyLight.position.set(-8, 18, 6);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const warmLight = new THREE.PointLight(0xff9a4c, 18, 18, 2);
    warmLight.position.set(4, 4, -8);
    this.scene.add(warmLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 80),
      new THREE.MeshStandardMaterial({ color: 0x101923, roughness: 0.42, metalness: 0.35 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.physics.createCollider(RAPIER.ColliderDesc.cuboid(35, 0.1, 40).setTranslation(0, -0.1, -12));

    this.addBox(-9, -7, 5, 2.6, 12, 0x24313a);
    this.addBox(-3, -14, 8, 3.2, 4, 0x2b3438);
    this.addBox(8, -13, 13, 5.5, 9, 0x1e252a);
    this.addBox(2, -5, 5, 3, 4, 0x303b3f);
    for (let i = 0; i < 7; i++) {
      this.addBox(-11 + (i % 3) * 4, 4 + Math.floor(i / 3) * 5, 3.4, 2.4, 4.2, 0x27343d);
    }

    this.addBox(0, -31, 7, 0.45, 28, 0x202a31, 0.1);
    for (const side of [-3.2, 3.2]) {
      for (let z = -19; z > -46; z -= 4) this.addBox(side, z, 0.12, 1.2, 0.12, 0x5d2522, 0.4);
    }

    const rainPositions = new Float32Array(this.rainCount * 3);
    for (let i = 0; i < this.rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 70;
      rainPositions[i * 3 + 1] = Math.random() * 28;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    this.rainGeometry = new THREE.BufferGeometry();
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.scene.add(new THREE.Points(
      this.rainGeometry,
      new THREE.PointsMaterial({ color: 0x9fc8e8, size: 0.035, transparent: true, opacity: 0.7 }),
    ));
  }

  update(dt: number) {
    const positions = this.rainGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3 + 1] -= 16 * dt;
      if (positions[i * 3 + 1] < 0) positions[i * 3 + 1] = 28;
    }
    this.rainGeometry.attributes.position.needsUpdate = true;
  }

  private addBox(x: number, z: number, sx: number, sy: number, sz: number, color: number, y = 0) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz),
      new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.28 }),
    );
    mesh.position.set(x, y + sy / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const body = this.physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y + sy / 2, z));
    this.physics.createCollider(RAPIER.ColliderDesc.cuboid(sx / 2, sy / 2, sz / 2), body);
    return mesh;
  }
}
