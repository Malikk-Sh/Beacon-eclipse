import * as THREE from 'three';
import { MaterialLibrary } from './MaterialLibrary';

type BridgeSignalState = 'raised' | 'moving' | 'ready';
type PowerVisualState = 'warehouse' | 'lights' | 'pumps';

export class PortBridgeAtmosphere {
  private readonly scene: THREE.Scene;
  private readonly sceneRestPosition = new THREE.Vector3();
  private readonly bridgeRoot: THREE.Group;
  private readonly warehouseLight: THREE.PointLight | null;
  private readonly portLight: THREE.PointLight | null;
  private readonly pumpLight: THREE.PointLight | null;

  private readonly warehouseGlowMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b4128,
    emissive: 0xff8a31,
    emissiveIntensity: 0.05,
    roughness: 0.32,
    metalness: 0.24,
  });
  private readonly portLampMaterial = new THREE.MeshStandardMaterial({
    color: 0x594432,
    emissive: 0xff9a4c,
    emissiveIntensity: 0.02,
    roughness: 0.34,
    metalness: 0.22,
  });
  private readonly routeMaterial = new THREE.MeshStandardMaterial({
    color: 0x24536a,
    emissive: 0x2c9ec8,
    emissiveIntensity: 0.04,
    roughness: 0.28,
    metalness: 0.3,
  });
  private readonly bridgeEdgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x4d2725,
    emissive: 0xd72f29,
    emissiveIntensity: 0.5,
    roughness: 0.35,
    metalness: 0.3,
  });
  private readonly radioPulseMaterial = new THREE.MeshStandardMaterial({
    color: 0x8d6034,
    emissive: 0xff8a31,
    emissiveIntensity: 1.55,
    roughness: 0.32,
    metalness: 0.18,
  });
  private readonly energyChannelMaterials = [
    new THREE.MeshStandardMaterial({
      color: 0x765037,
      emissive: 0xff8a31,
      emissiveIntensity: 0.04,
      roughness: 0.34,
      metalness: 0.22,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x285f79,
      emissive: 0x2c9ec8,
      emissiveIntensity: 0.04,
      roughness: 0.3,
      metalness: 0.22,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x6f4b34,
      emissive: 0xf58b42,
      emissiveIntensity: 0.04,
      roughness: 0.34,
      metalness: 0.22,
    }),
  ];

  private readonly driveFlywheel = new THREE.Group();
  private readonly pumpRotors: THREE.Group[] = [];
  private readonly powerWaveRings: Array<THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>> = [];
  private pumpRotorSpeed = 0;
  private powerWaveElapsed = 2;
  private warehouseActivation = 0;
  private portActivation = 0;
  private pumpActivation = 0;
  private previousWarehousePower = 0;
  private previousPortPower = 0;
  private previousPumpPower = 0;
  private bridgeDriveKick = 0;
  private bridgeShake = 0;
  private wasBridgeMoving = false;
  private startupElapsed = 0;
  private elapsed = 0;
  private lastBridgeAngle: number;
  private bridgeSignalState: BridgeSignalState = 'raised';

  constructor(scene: THREE.Scene, materials: MaterialLibrary, bridgeRoot: THREE.Group) {
    this.scene = scene;
    this.sceneRestPosition.copy(scene.position);
    this.bridgeRoot = bridgeRoot;
    this.lastBridgeAngle = bridgeRoot.rotation.x;

    this.warehouseLight = this.findPointLight(scene, 8, 3.2, -8.3);
    this.portLight = this.findPointLight(scene, -2, 4.5, -4);
    this.pumpLight = this.findPointLight(scene, -3, 2.7, -12.2);

    this.addPortPuddles(scene, materials);
    this.addPowerWave(scene);
    this.addWarehouseCanopyGlow(scene);
    this.addEnergyChannels(scene);
    this.addPumpMachinery(scene, materials);
    this.addRouteStuds(scene);
    this.addRadioPulse(scene);
    this.addDriveFlywheel(scene, materials);
    this.addBridgeEdgeGuides(bridgeRoot);
    this.bindExistingSignalMeshes(scene, materials);
    this.applyBridgeSignalState(bridgeRoot.rotation.x <= 0.01 ? 'ready' : 'raised');
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.startupElapsed += dt;

    const warehousePower = this.normalizedPower(this.warehouseLight, 13);
    const portPower = this.normalizedPower(this.portLight, 17);
    const pumpPower = this.normalizedPower(this.pumpLight, 12);
    this.detectPowerActivation(warehousePower, portPower, pumpPower);

    const activationDecay = Math.exp(-dt * 3.2);
    this.warehouseActivation *= activationDecay;
    this.portActivation *= activationDecay;
    this.pumpActivation *= activationDecay;

    const routePower = Math.max(portPower, pumpPower, warehousePower * 0.5);
    const routeActivation = Math.max(this.portActivation, this.pumpActivation, this.warehouseActivation * 0.4);

    const warmFlicker = 0.95 + Math.sin(this.elapsed * 16.7) * 0.035 + Math.sin(this.elapsed * 7.1) * 0.015;
    this.warehouseGlowMaterial.emissiveIntensity = 0.05
      + warehousePower * 3.1 * warmFlicker
      + this.warehouseActivation * 1.35;

    const lampFlicker = 0.96 + Math.sin(this.elapsed * 13.1) * 0.025 + Math.sin(this.elapsed * 5.7) * 0.015;
    this.portLampMaterial.emissiveIntensity = 0.02
      + portPower * 2.45 * lampFlicker
      + this.portActivation * 1.05;

    const powerLevels = [warehousePower, pumpPower, portPower];
    const activationLevels = [this.warehouseActivation, this.pumpActivation, this.portActivation];
    for (let i = 0; i < this.energyChannelMaterials.length; i++) {
      const pulse = 0.94 + Math.sin(this.elapsed * (4.6 + i * 0.8) + i * 1.3) * 0.06;
      this.energyChannelMaterials[i].emissiveIntensity = 0.04
        + powerLevels[i] * 2.75 * pulse
        + activationLevels[i] * 1.35;
    }

    const pumpTargetSpeed = pumpPower * 7.2 + this.pumpActivation * 2.8;
    const pumpBlend = 1 - Math.exp(-dt * 3.8);
    this.pumpRotorSpeed = THREE.MathUtils.lerp(this.pumpRotorSpeed, pumpTargetSpeed, pumpBlend);
    for (let i = 0; i < this.pumpRotors.length; i++) {
      this.pumpRotors[i].rotation.z += this.pumpRotorSpeed * dt * (i === 0 ? 1 : -0.84);
    }

    this.routeMaterial.emissiveIntensity = 0.04
      + routePower * (1.45 + Math.sin(this.elapsed * 3.4) * 0.12)
      + routeActivation * 0.92;
    this.radioPulseMaterial.emissiveIntensity = 1.5
      + Math.sin(this.elapsed * 2.7) * 0.32
      + Math.sin(this.elapsed * 5.4) * 0.08;

    this.updatePowerWave(dt);

    const bridgeAngle = this.bridgeRoot.rotation.x;
    const angleDelta = this.lastBridgeAngle - bridgeAngle;
    const bridgeMoving = Math.abs(angleDelta) > 0.00001;
    if (bridgeMoving && !this.wasBridgeMoving) {
      this.bridgeDriveKick = 1;
      this.bridgeShake = 1;
    }
    if (bridgeMoving) this.driveFlywheel.rotation.z += angleDelta * 18;

    const nextBridgeState: BridgeSignalState = bridgeMoving
      ? 'moving'
      : bridgeAngle <= 0.01
        ? 'ready'
        : 'raised';
    if (nextBridgeState !== this.bridgeSignalState) {
      if (this.bridgeSignalState === 'moving' && nextBridgeState === 'ready') {
        this.bridgeShake = Math.max(this.bridgeShake, 0.46);
      }
      this.applyBridgeSignalState(nextBridgeState);
    }
    this.lastBridgeAngle = bridgeAngle;
    this.wasBridgeMoving = bridgeMoving;

    this.updateBridgeFeedback(dt);

    const bridgeKickGlow = this.bridgeDriveKick * 1.1;
    if (nextBridgeState === 'moving') {
      this.bridgeEdgeMaterial.emissiveIntensity = 1.75 + Math.sin(this.elapsed * 10.5) * 0.55 + bridgeKickGlow;
    } else if (nextBridgeState === 'ready') {
      this.bridgeEdgeMaterial.emissiveIntensity = 1.35 + Math.sin(this.elapsed * 2.5) * 0.12 + bridgeKickGlow * 0.25;
    } else {
      this.bridgeEdgeMaterial.emissiveIntensity = 0.42 + Math.sin(this.elapsed * 2.1) * 0.06;
    }
  }

  private addPortPuddles(scene: THREE.Scene, materials: MaterialLibrary): void {
    const puddles: ReadonlyArray<readonly [x: number, z: number, sx: number, sz: number, rotation: number]> = [
      [6.5, -7.25, 3.8, 1.25, 0.08],
      [10.7, -9.3, 3.2, 1.05, -0.18],
      [3.4, -4.15, 2.7, 0.9, 0.12],
      [-0.4, -5.7, 3.6, 1.0, -0.1],
      [-2.2, -13.9, 2.8, 0.82, 0.14],
      [1.7, -15.6, 3.1, 0.9, -0.06],
    ];

    for (const [x, z, sx, sz, rotation] of puddles) {
      const puddle = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), materials.wetPatch);
      puddle.rotation.set(-Math.PI / 2, 0, rotation);
      puddle.position.set(x, 0.026, z);
      puddle.receiveShadow = true;
      scene.add(puddle);
    }
  }

  private addPowerWave(scene: THREE.Scene): void {
    const geometry = new THREE.TorusGeometry(0.72, 0.024, 6, 28);
    for (let i = 0; i < 3; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0x2c9ec8,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(2, 0.055 + i * 0.002, -1.7);
      ring.visible = false;
      this.powerWaveRings.push(ring);
      scene.add(ring);
    }
  }

  private addWarehouseCanopyGlow(scene: THREE.Scene): void {
    const geometry = new THREE.BoxGeometry(0.96, 0.035, 0.075);
    const strips = new THREE.InstancedMesh(geometry, this.warehouseGlowMaterial, 3);
    const matrix = new THREE.Matrix4();
    [6.7, 8, 9.3].forEach((x, index) => {
      matrix.makeTranslation(x, 4.17, -7.68);
      strips.setMatrixAt(index, matrix);
    });
    scene.add(strips);
  }

  private addEnergyChannels(scene: THREE.Scene): void {
    const geometry = new THREE.BoxGeometry(0.22, 0.055, 0.035);
    const positions = [
      new THREE.Vector3(2.95, 2.54, -2.605),
      new THREE.Vector3(3.3, 2.54, -2.605),
      new THREE.Vector3(3.65, 2.54, -2.605),
    ];

    for (let i = 0; i < positions.length; i++) {
      const channel = new THREE.Mesh(geometry, this.energyChannelMaterials[i]);
      channel.position.copy(positions[i]);
      scene.add(channel);
    }
  }

  private addPumpMachinery(scene: THREE.Scene, materials: MaterialLibrary): void {
    const rimGeometry = new THREE.TorusGeometry(0.31, 0.045, 7, 18);
    const spokeGeometry = new THREE.BoxGeometry(0.48, 0.035, 0.04);
    const hubGeometry = new THREE.CylinderGeometry(0.075, 0.075, 0.07, 10);

    for (const x of [-3.45, -2.55]) {
      const rotor = new THREE.Group();
      rotor.position.set(x, 1.42, -11.82);

      const rim = new THREE.Mesh(rimGeometry, materials.oldSteel);
      rim.castShadow = true;
      rotor.add(rim);

      for (let spokeIndex = 0; spokeIndex < 3; spokeIndex++) {
        const spoke = new THREE.Mesh(spokeGeometry, materials.rust);
        spoke.rotation.z = (spokeIndex / 3) * Math.PI;
        spoke.castShadow = true;
        rotor.add(spoke);
      }

      const hub = new THREE.Mesh(hubGeometry, materials.fadedPaint);
      hub.rotation.x = Math.PI / 2;
      hub.castShadow = true;
      rotor.add(hub);

      this.pumpRotors.push(rotor);
      scene.add(rotor);
    }
  }

  private addRouteStuds(scene: THREE.Scene): void {
    const geometry = new THREE.BoxGeometry(0.13, 0.045, 0.24);
    const studs = new THREE.InstancedMesh(geometry, this.routeMaterial, 12);
    const matrix = new THREE.Matrix4();
    let index = 0;
    for (const x of [-2.65, 2.65]) {
      for (const z of [-5.2, -7.2, -9.2, -11.2, -13.2, -15.2]) {
        matrix.makeTranslation(x, 0.055, z);
        studs.setMatrixAt(index++, matrix);
      }
    }
    scene.add(studs);
  }

  private addRadioPulse(scene: THREE.Scene): void {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 6, 18), this.radioPulseMaterial);
    ring.position.set(10.26, 1.39, -7.49);
    scene.add(ring);
  }

  private addDriveFlywheel(scene: THREE.Scene, materials: MaterialLibrary): void {
    this.driveFlywheel.position.set(-3.43, 1.02, -15.89);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.055, 8, 20), materials.oldSteel);
    rim.castShadow = true;
    this.driveFlywheel.add(rim);

    const spokeGeometry = new THREE.BoxGeometry(0.5, 0.035, 0.045);
    for (let i = 0; i < 3; i++) {
      const spoke = new THREE.Mesh(spokeGeometry, materials.rust);
      spoke.rotation.z = (i / 3) * Math.PI;
      spoke.castShadow = true;
      this.driveFlywheel.add(spoke);
    }

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 10), materials.fadedPaint);
    hub.rotation.x = Math.PI / 2;
    hub.castShadow = true;
    this.driveFlywheel.add(hub);

    scene.add(this.driveFlywheel);
  }

  private addBridgeEdgeGuides(bridgeRoot: THREE.Group): void {
    for (const x of [-2.92, 2.92]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.025, 26.2), this.bridgeEdgeMaterial);
      strip.position.set(x, 0.475, -14);
      bridgeRoot.add(strip);
    }
  }

  private bindExistingSignalMeshes(scene: THREE.Scene, materials: MaterialLibrary): void {
    scene.traverse((object) => {
      if (!(object instanceof THREE.InstancedMesh)) return;

      if (object.material === materials.amberSignal && object.count === 5) {
        object.material = this.portLampMaterial;
        return;
      }

      if (object.material === materials.redSignal && object.count === 12) {
        object.material = this.bridgeEdgeMaterial;
      }
    });
  }

  private detectPowerActivation(warehousePower: number, portPower: number, pumpPower: number): void {
    if (this.startupElapsed > 0.75) {
      if (this.previousWarehousePower <= 0.025 && warehousePower > 0.025) this.triggerPowerActivation('warehouse');
      if (this.previousPortPower <= 0.025 && portPower > 0.025) this.triggerPowerActivation('lights');
      if (this.previousPumpPower <= 0.025 && pumpPower > 0.025) this.triggerPowerActivation('pumps');
    }

    this.previousWarehousePower = warehousePower;
    this.previousPortPower = portPower;
    this.previousPumpPower = pumpPower;
  }

  private triggerPowerActivation(system: PowerVisualState): void {
    let color = 0x67c9ff;
    if (system === 'warehouse') {
      this.warehouseActivation = 1;
      color = 0xff8a31;
    } else if (system === 'lights') {
      this.portActivation = 1;
      color = 0xffb45f;
    } else {
      this.pumpActivation = 1;
    }

    for (const ring of this.powerWaveRings) ring.material.color.setHex(color);
    this.powerWaveElapsed = 0;
  }

  private updatePowerWave(dt: number): void {
    this.powerWaveElapsed += dt;
    const duration = 1.05;
    let anyVisible = false;

    for (let i = 0; i < this.powerWaveRings.length; i++) {
      const ring = this.powerWaveRings[i];
      const local = (this.powerWaveElapsed - i * 0.11) / duration;
      if (local <= 0 || local >= 1) {
        ring.visible = false;
        ring.material.opacity = 0;
        continue;
      }

      anyVisible = true;
      ring.visible = true;
      const eased = 1 - Math.pow(1 - local, 2);
      const scale = 1 + eased * (4.1 + i * 0.42);
      ring.scale.setScalar(scale);
      ring.material.opacity = Math.sin(local * Math.PI) * (0.25 - i * 0.035);
    }

    if (!anyVisible && this.powerWaveElapsed > duration + 0.24) {
      for (const ring of this.powerWaveRings) ring.visible = false;
    }
  }

  private updateBridgeFeedback(dt: number): void {
    if (this.bridgeDriveKick > 0.001) {
      const kick = this.bridgeDriveKick * this.bridgeDriveKick;
      this.driveFlywheel.rotation.z += dt * (1.8 + kick * 5.2);
      this.driveFlywheel.position.y = 1.02 + Math.sin(this.elapsed * 42) * 0.012 * kick;
      this.bridgeDriveKick *= Math.exp(-dt * 2.35);
    } else {
      this.bridgeDriveKick = 0;
      this.driveFlywheel.position.y = 1.02;
    }

    if (this.bridgeShake > 0.001) {
      const shake = this.bridgeShake * this.bridgeShake;
      this.scene.position.set(
        this.sceneRestPosition.x + Math.sin(this.elapsed * 34) * 0.038 * shake,
        this.sceneRestPosition.y + Math.sin(this.elapsed * 47 + 0.8) * 0.024 * shake,
        this.sceneRestPosition.z + Math.sin(this.elapsed * 29 + 1.7) * 0.018 * shake,
      );
      this.bridgeShake *= Math.exp(-dt * 2.55);
    } else {
      this.bridgeShake = 0;
      this.scene.position.copy(this.sceneRestPosition);
    }
  }

  private normalizedPower(light: THREE.PointLight | null, maximum: number): number {
    if (!light) return 0;
    return THREE.MathUtils.clamp(light.intensity / maximum, 0, 1);
  }

  private applyBridgeSignalState(state: BridgeSignalState): void {
    this.bridgeSignalState = state;
    if (state === 'ready') {
      this.bridgeEdgeMaterial.color.setHex(0x2b6177);
      this.bridgeEdgeMaterial.emissive.setHex(0x2c9ec8);
      return;
    }

    this.bridgeEdgeMaterial.color.setHex(0x4d2725);
    this.bridgeEdgeMaterial.emissive.setHex(0xd72f29);
  }

  private findPointLight(scene: THREE.Scene, x: number, y: number, z: number): THREE.PointLight | null {
    let result: THREE.PointLight | null = null;
    scene.traverse((object) => {
      if (result || !(object instanceof THREE.PointLight)) return;
      const dx = object.position.x - x;
      const dy = object.position.y - y;
      const dz = object.position.z - z;
      if (dx * dx + dy * dy + dz * dz < 0.01) result = object;
    });
    return result;
  }
}
