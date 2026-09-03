import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { EnergySystemName } from './EnergySystem';

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

  private readonly bridgePivot = new THREE.Group();
  private readonly bridgeBarrier: THREE.Mesh;
  private bridgeBarrierCollider: RAPIER.Collider | null;
  private bridgeDeckCollider: RAPIER.Collider | null = null;
  private bridgeDeploying = false;
  private bridgeReady = false;
  private readonly bridgeRaisedAngle = Math.PI * 0.36;

  private readonly warehouseLight = new THREE.PointLight(0xffb45f, 0, 15, 2);
  private readonly portPowerLight = new THREE.PointLight(0xff9a4c, 0, 24, 2);
  private readonly pumpLight = new THREE.PointLight(0x67c9ff, 0, 15, 2);
  private readonly warehouseIndicator: THREE.MeshBasicMaterial;
  private readonly pumpIndicator: THREE.MeshBasicMaterial;
  private readonly portIndicator: THREE.MeshBasicMaterial;
  private readonly bridgeIndicators: THREE.MeshBasicMaterial[] = [];
  private warehouseLightTarget = 0;
  private portLightTarget = 0;
  private pumpLightTarget = 0;

  constructor(private readonly physics: RAPIER.World) {
    this.scene.background = new THREE.Color(0x07111b);
    this.scene.fog = new THREE.FogExp2(0x07111b, 0.018);

    this.scene.add(new THREE.HemisphereLight(0x7aa2c7, 0x101820, 1.35));
    const keyLight = new THREE.DirectionalLight(0x9fc7ff, 2.1);
    keyLight.position.set(-8, 18, 6);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

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

    // Lighthouse technical room.
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

    // Exterior approach: a narrow catwalk visually guides the player toward the port.
    this.addBox(0, 11.6, 4.6, 0.18, 9.4, 0x202b32, 0.02);
    this.addBox(-2.2, 11.6, 0.1, 0.95, 9.4, 0x29363d, 0.18);
    this.addBox(2.2, 11.6, 0.1, 0.95, 9.4, 0x29363d, 0.18);
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(2.7, 3.25, 10, 12),
      new THREE.MeshStandardMaterial({ color: 0x172128, roughness: 0.82, metalness: 0.18 }),
    );
    tower.position.set(0, 9, 28.5);
    tower.castShadow = true;
    this.scene.add(tower);
    const beacon = new THREE.PointLight(0xeaf6ff, 7, 38, 2);
    beacon.position.set(0, 14.2, 28.5);
    this.scene.add(beacon);

    // Port blockout: containers, Warehouse 04 and energy station.
    this.addBox(-9, -7, 5, 2.6, 12, 0x24313a);
    this.addBox(-3, -14, 8, 3.2, 4, 0x2b3438);
    this.addBox(8, -13, 13, 5.5, 9, 0x1e252a);
    this.addBox(2, -5, 5, 3, 4, 0x303b3f);
    for (let i = 0; i < 7; i++) {
      this.addBox(-11 + (i % 3) * 4, 4 + Math.floor(i / 3) * 5, 3.4, 2.4, 4.2, 0x27343d);
    }

    // Drawbridge. It starts raised; a physical gate blocks the approach until deployment finishes.
    this.bridgePivot.position.set(0, 0.1, -17.5);
    this.bridgePivot.rotation.x = this.bridgeRaisedAngle;
    const bridgeDeck = new THREE.Mesh(
      new THREE.BoxGeometry(7, 0.45, 28),
      new THREE.MeshStandardMaterial({ color: 0x202a31, roughness: 0.56, metalness: 0.52 }),
    );
    bridgeDeck.position.set(0, 0.225, -14);
    bridgeDeck.castShadow = true;
    bridgeDeck.receiveShadow = true;
    this.bridgePivot.add(bridgeDeck);
    this.scene.add(this.bridgePivot);

    this.bridgeBarrier = new THREE.Mesh(
      new THREE.BoxGeometry(7.1, 2.2, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x492523, roughness: 0.65, metalness: 0.5 }),
    );
    this.bridgeBarrier.position.set(0, 1.1, -18.2);
    this.bridgeBarrier.castShadow = true;
    this.scene.add(this.bridgeBarrier);
    const barrierBody = this.physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 1.1, -18.2));
    this.bridgeBarrierCollider = this.physics.createCollider(RAPIER.ColliderDesc.cuboid(3.55, 1.1, 0.17), barrierBody);

    this.warehouseLight.position.set(8, 3.2, -8.3);
    this.portPowerLight.position.set(-2, 4.5, -4);
    this.pumpLight.position.set(-3, 2.7, -12.2);
    this.scene.add(this.warehouseLight, this.portPowerLight, this.pumpLight);

    this.warehouseIndicator = this.addIndicator(8, 2.7, -8.42, 0xffad55);
    this.portIndicator = this.addIndicator(2, 2.35, -2.92, 0xffb85e);
    this.pumpIndicator = this.addIndicator(-3, 2.1, -11.92, 0x68caff);
    for (const side of [-2.85, 2.85]) {
      for (let z = -20; z >= -42; z -= 5.5) {
        this.bridgeIndicators.push(this.addIndicator(side, 1.4, z, 0xff4438));
      }
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

  unlockLighthouseDoor(immediate = false) {
    if (!this.lighthouseDoorOpening) this.lighthouseDoorOpening = true;
    if (this.lighthouseDoorCollider) {
      this.physics.removeCollider(this.lighthouseDoorCollider, true);
      this.lighthouseDoorCollider = null;
    }
    if (immediate) this.lighthouseDoor.position.y = 5.2;
  }

  startBridge(immediate = false) {
    if (this.bridgeReady) return;
    if (immediate) {
      this.bridgePivot.rotation.x = 0;
      this.finishBridgeDeployment();
      return;
    }
    this.bridgeDeploying = true;
  }

  setPowerState(system: EnergySystemName, enabled: boolean) {
    if (system === 'warehouse') {
      this.warehouseLightTarget = enabled ? 13 : 0;
      this.setIndicator(this.warehouseIndicator, 0xffad55, enabled);
    } else if (system === 'lights') {
      this.portLightTarget = enabled ? 17 : 0;
      this.setIndicator(this.portIndicator, 0xffb85e, enabled);
    } else if (system === 'pumps') {
      this.pumpLightTarget = enabled ? 12 : 0;
      this.setIndicator(this.pumpIndicator, 0x68caff, enabled);
    } else if (system === 'bridge') {
      for (const indicator of this.bridgeIndicators) this.setIndicator(indicator, 0xff4438, enabled);
    }
  }

  update(dt: number) {
    if (this.lighthouseDoorOpening) {
      this.lighthouseDoor.position.y = Math.min(5.2, this.lighthouseDoor.position.y + dt * 3.1);
    }

    if (this.bridgeDeploying) {
      this.bridgePivot.rotation.x = Math.max(0, this.bridgePivot.rotation.x - dt * 0.38);
      if (this.bridgePivot.rotation.x <= 0.005) {
        this.bridgePivot.rotation.x = 0;
        this.finishBridgeDeployment();
      }
    }

    const lightBlend = 1 - Math.exp(-dt * 5.5);
    this.warehouseLight.intensity = THREE.MathUtils.lerp(this.warehouseLight.intensity, this.warehouseLightTarget, lightBlend);
    this.portPowerLight.intensity = THREE.MathUtils.lerp(this.portPowerLight.intensity, this.portLightTarget, lightBlend);
    this.pumpLight.intensity = THREE.MathUtils.lerp(this.pumpLight.intensity, this.pumpLightTarget, lightBlend);

    const positions = this.rainGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3 + 1] -= 16 * dt;
      if (positions[i * 3 + 1] < 0) positions[i * 3 + 1] = 28;
    }
    this.rainGeometry.attributes.position.needsUpdate = true;
  }

  private finishBridgeDeployment() {
    this.bridgeDeploying = false;
    this.bridgeReady = true;
    this.bridgeBarrier.visible = false;
    if (this.bridgeBarrierCollider) {
      this.physics.removeCollider(this.bridgeBarrierCollider, true);
      this.bridgeBarrierCollider = null;
    }
    if (!this.bridgeDeckCollider) {
      const body = this.physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.325, -31.5));
      this.bridgeDeckCollider = this.physics.createCollider(RAPIER.ColliderDesc.cuboid(3.5, 0.225, 14), body);
    }
  }

  private addIndicator(x: number, y: number, z: number, onColor: number) {
    const material = new THREE.MeshBasicMaterial({ color: 0x11181d });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), material);
    mesh.position.set(x, y, z);
    mesh.userData.onColor = onColor;
    this.scene.add(mesh);
    return material;
  }

  private setIndicator(material: THREE.MeshBasicMaterial, onColor: number, enabled: boolean) {
    material.color.setHex(enabled ? onColor : 0x11181d);
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
