import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export interface WorldLandmarks {
  lighthousePanel: THREE.Vector3;
  lighthouseExit: THREE.Vector3;
  energyStation: THREE.Vector3;
  warehouse04: THREE.Vector3;
  bridgeStart: THREE.Vector3;
}

export class GameWorld {
  readonly scene = new THREE.Scene();
  readonly landmarks: WorldLandmarks = {
    lighthousePanel: new THREE.Vector3(-2.9, 0, 24),
    lighthouseExit: new THREE.Vector3(0, 0, 16.8),
    energyStation: new THREE.Vector3(2, 0, -1.7),
    warehouse04: new THREE.Vector3(8, 0, -7.25),
    bridgeStart: new THREE.Vector3(0, 0, -18),
  };

  private readonly rainGeometry: THREE.BufferGeometry;
  private readonly rainCount = 1200;
  private readonly lighthouseDoor: THREE.Mesh;
  private lighthouseDoorCollider: RAPIER.Collider | null;
  private lighthouseDoorOpening = false;

  constructor(private readonly physics: RAPIER.World) {
    this.scene.background = new THREE.Color(0x07111b);
    this.scene.fog = new THREE.FogExp2(0x07111b, 0.018);

    this.scene.add(new THREE.HemisphereLight(0x7aa2c7, 0x101820, 1.35));
    const keyLight = new THREE.DirectionalLight(0x9fc7ff, 2.1);
    keyLight.position.set(-8, 18, 6);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const portLight = new THREE.PointLight(0xff9a4c, 18, 18, 2);
    portLight.position.set(4, 4, -8);
    this.scene.add(portLight);

    const lighthouseEmergencyLight = new THREE.PointLight(0xff3c2e, 11, 15, 2);
    lighthouseEmergencyLight.position.set(-2.8, 3.2, 24);
    this.scene.add(lighthouseEmergencyLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 100),
      new THREE.MeshStandardMaterial({ color: 0x101923, roughness: 0.42, metalness: 0.35 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.physics.createCollider(RAPIER.ColliderDesc.cuboid(35, 0.1, 50).setTranslation(0, -0.1, -2));

    // Lighthouse technical room. The camera remains inside the long room at spawn.
    this.addBox(-4.1, 25.7, 0.35, 4.2, 16.4, 0x20272c);
    this.addBox(4.1, 25.7, 0.35, 4.2, 16.4, 0x20272c);
    this.addBox(0, 33.8, 8.55, 4.2, 0.35, 0x20272c);
    this.addBox(-2.65, 17.7, 3.25, 4.2, 0.35, 0x20272c);
    this.addBox(2.65, 17.7, 3.25, 4.2, 0.35, 0x20272c);
    this.addBox(-3.78, 24, 0.24, 1.3, 1.15, 0x54302d, 1.05);
    this.addBox(0, 14.6, 5.5, 0.22, 5.8, 0x242e34, 0.02);

    this.lighthouseDoor = new THREE.Mesh(
      new THREE.BoxGeometry(2.05, 3.05, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x30383d, roughness: 0.6, metalness: 0.55 }),
    );
    this.lighthouseDoor.position.set(0, 1.525, 17.65);
    this.lighthouseDoor.castShadow = true;
    this.lighthouseDoor.receiveShadow = true;
    this.scene.add(this.lighthouseDoor);
    const doorBody = this.physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 1.525, 17.65));
    this.lighthouseDoorCollider = this.physics.createCollider(RAPIER.ColliderDesc.cuboid(1.025, 1.525, 0.12), doorBody);

    // Port blockout: containers, Warehouse 04, energy station and bridge approach.
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
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 100 - 2;
    }
    this.rainGeometry = new THREE.BufferGeometry();
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.scene.add(new THREE.Points(
      this.rainGeometry,
      new THREE.PointsMaterial({ color: 0x9fc8e8, size: 0.035, transparent: true, opacity: 0.7 }),
    ));
  }

  unlockLighthouseDoor() {
    if (this.lighthouseDoorOpening) return;
    this.lighthouseDoorOpening = true;
    if (this.lighthouseDoorCollider) {
      this.physics.removeCollider(this.lighthouseDoorCollider, true);
      this.lighthouseDoorCollider = null;
    }
  }

  update(dt: number) {
    if (this.lighthouseDoorOpening) {
      this.lighthouseDoor.position.y = Math.min(5.2, this.lighthouseDoor.position.y + dt * 3.1);
    }

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
