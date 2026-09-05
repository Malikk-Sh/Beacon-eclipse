import * as THREE from 'three';

export class LevVisual {
  readonly root = new THREE.Group();

  private readonly leftArm = new THREE.Group();
  private readonly rightArm = new THREE.Group();
  private readonly leftLeg = new THREE.Group();
  private readonly rightLeg = new THREE.Group();
  private readonly torsoRoot = new THREE.Group();
  private gait = 0;
  private motionBlend = 0;

  constructor() {
    const jacket = new THREE.MeshStandardMaterial({ color: 0x151d24, roughness: 0.82, metalness: 0.08 });
    const jacketPanel = new THREE.MeshStandardMaterial({ color: 0x222d35, roughness: 0.76, metalness: 0.12 });
    const leather = new THREE.MeshStandardMaterial({ color: 0x52382d, roughness: 0.84, metalness: 0.05 });
    const webbing = new THREE.MeshStandardMaterial({ color: 0x2f2824, roughness: 0.9, metalness: 0.02 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x454b4d, roughness: 0.5, metalness: 0.72 });
    const glove = new THREE.MeshStandardMaterial({ color: 0x11171b, roughness: 0.9, metalness: 0.03 });
    const boot = new THREE.MeshStandardMaterial({ color: 0x15191b, roughness: 0.88, metalness: 0.08 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x171414, roughness: 0.95, metalness: 0 });
    const skin = new THREE.MeshStandardMaterial({ color: 0x7f665b, roughness: 0.88, metalness: 0 });
    const fadedMark = new THREE.LineBasicMaterial({ color: 0x7e7769, transparent: true, opacity: 0.72 });

    this.buildTorso(jacket, jacketPanel, leather, webbing, metal);
    this.buildHead(skin, hair, jacketPanel);
    this.buildArm(this.leftArm, -0.49, jacket, jacketPanel, glove, metal, -1);
    this.buildArm(this.rightArm, 0.49, jacket, jacketPanel, glove, metal, 1);
    this.buildLeg(this.leftLeg, -0.21, jacket, jacketPanel, boot);
    this.buildLeg(this.rightLeg, 0.21, jacket, jacketPanel, boot);
    this.buildBackGear(leather, webbing, metal, fadedMark);

    this.root.add(this.torsoRoot, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg);
    this.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
  }

  update(dt: number, moving: boolean): void {
    const target = moving ? 1 : 0;
    this.motionBlend = THREE.MathUtils.lerp(this.motionBlend, target, 1 - Math.exp(-dt * 8));
    this.gait += dt * THREE.MathUtils.lerp(2.4, 8.2, this.motionBlend);

    const swing = Math.sin(this.gait) * 0.42 * this.motionBlend;
    const counterSwing = Math.sin(this.gait + Math.PI) * 0.42 * this.motionBlend;
    const settle = Math.sin(this.gait * 2) * 0.018 * this.motionBlend;

    this.leftArm.rotation.x = counterSwing * 0.72;
    this.rightArm.rotation.x = swing * 0.72;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = counterSwing;
    this.torsoRoot.rotation.z = Math.sin(this.gait) * 0.018 * this.motionBlend;
    this.root.position.y = Math.abs(settle);
  }

  private buildTorso(
    jacket: THREE.Material,
    jacketPanel: THREE.Material,
    leather: THREE.Material,
    webbing: THREE.Material,
    metal: THREE.Material,
  ): void {
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.36, 0.98, 8), jacket);
    torso.position.y = 1.38;
    torso.scale.z = 0.72;
    this.torsoRoot.add(torso);

    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.18, 0.46), jacketPanel);
    shoulder.position.set(0, 1.72, 0.02);
    this.torsoRoot.add(shoulder);

    const chestPanel = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.42, 0.09), jacketPanel);
    chestPanel.position.set(0, 1.43, -0.34);
    chestPanel.rotation.x = -0.05;
    this.torsoRoot.add(chestPanel);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.105, 6, 12, Math.PI * 1.45), jacketPanel);
    collar.position.set(0, 1.82, 0.01);
    collar.rotation.x = Math.PI / 2;
    collar.rotation.z = -Math.PI * 0.72;
    this.torsoRoot.add(collar);

    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.34, 0.48), jacket);
    pelvis.position.set(0, 0.82, 0.01);
    this.torsoRoot.add(pelvis);

    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.12, 0.52), webbing);
    belt.position.set(0, 0.92, 0.01);
    this.torsoRoot.add(belt);

    const pouchGeometry = new THREE.BoxGeometry(0.17, 0.24, 0.13);
    const pouchPositions = [
      [-0.3, 0.78, 0.28], [-0.1, 0.76, 0.3], [0.13, 0.76, 0.3], [0.32, 0.79, 0.25],
    ] as const;
    for (const [x, y, z] of pouchPositions) {
      const pouch = new THREE.Mesh(pouchGeometry, leather);
      pouch.position.set(x, y, z);
      this.torsoRoot.add(pouch);
    }

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.05), metal);
    buckle.position.set(0, 0.91, -0.29);
    this.torsoRoot.add(buckle);
  }

  private buildHead(skin: THREE.Material, hair: THREE.Material, hood: THREE.Material): void {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.18, 8), skin);
    neck.position.set(0, 1.88, 0);
    this.torsoRoot.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.245, 12, 9), skin);
    head.position.set(0, 2.09, -0.015);
    head.scale.set(0.9, 1.05, 0.92);
    this.torsoRoot.add(head);

    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.255, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.58), hair);
    hairCap.position.set(0, 2.16, 0.008);
    hairCap.rotation.x = -0.08;
    this.torsoRoot.add(hairCap);

    const hoodBack = new THREE.Mesh(new THREE.SphereGeometry(0.33, 10, 7, 0, Math.PI * 2, 0.58, Math.PI * 0.58), hood);
    hoodBack.position.set(0, 1.88, 0.11);
    hoodBack.scale.set(1.05, 0.76, 0.7);
    this.torsoRoot.add(hoodBack);
  }

  private buildArm(
    pivot: THREE.Group,
    x: number,
    jacket: THREE.Material,
    jacketPanel: THREE.Material,
    glove: THREE.Material,
    metal: THREE.Material,
    side: number,
  ): void {
    pivot.position.set(x, 1.65, 0);

    const shoulderPad = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.42), jacketPanel);
    shoulderPad.position.set(side * 0.02, -0.03, 0.02);
    pivot.add(shoulderPad);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.135, 0.55, 7), jacket);
    upper.position.set(side * 0.02, -0.33, 0);
    upper.rotation.z = side * 0.05;
    pivot.add(upper);

    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 5), jacketPanel);
    elbow.position.set(side * 0.04, -0.61, 0.01);
    pivot.add(elbow);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.115, 0.5, 7), jacket);
    forearm.position.set(side * 0.07, -0.84, -0.005);
    forearm.rotation.z = side * 0.06;
    pivot.add(forearm);

    const wristModule = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.17), metal);
    wristModule.position.set(side * 0.09, -1.04, 0.01);
    pivot.add(wristModule);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.14), glove);
    hand.position.set(side * 0.1, -1.17, -0.005);
    pivot.add(hand);
  }

  private buildLeg(
    pivot: THREE.Group,
    x: number,
    trouser: THREE.Material,
    panel: THREE.Material,
    boot: THREE.Material,
  ): void {
    pivot.position.set(x, 0.82, 0);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.64, 7), trouser);
    thigh.position.y = -0.32;
    thigh.scale.z = 0.85;
    pivot.add(thigh);

    const knee = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.23), panel);
    knee.position.set(0, -0.65, -0.08);
    pivot.add(knee);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.13, 0.57, 7), trouser);
    shin.position.y = -0.95;
    shin.scale.z = 0.82;
    pivot.add(shin);

    const bootMesh = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.22, 0.42), boot);
    bootMesh.position.set(0, -1.23, -0.08);
    pivot.add(bootMesh);
  }

  private buildBackGear(
    leather: THREE.Material,
    webbing: THREE.Material,
    metal: THREE.Material,
    markMaterial: THREE.LineBasicMaterial,
  ): void {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.24), leather);
    pack.position.set(0, 1.36, 0.42);
    pack.rotation.x = -0.04;
    this.torsoRoot.add(pack);

    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.16), metal);
    radio.position.set(0.34, 1.46, 0.4);
    this.torsoRoot.add(radio);

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.48, 6), metal);
    antenna.position.set(0.39, 1.86, 0.42);
    antenna.rotation.z = -0.08;
    this.torsoRoot.add(antenna);

    for (const x of [-0.27, 0.27]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.085, 1.0, 0.05), webbing);
      strap.position.set(x, 1.38, 0.29);
      strap.rotation.z = x < 0 ? -0.12 : 0.12;
      this.torsoRoot.add(strap);
    }

    const emblemGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.18, 0), new THREE.Vector3(-0.18, -0.14, 0),
      new THREE.Vector3(-0.18, -0.14, 0), new THREE.Vector3(0.18, -0.14, 0),
      new THREE.Vector3(0.18, -0.14, 0), new THREE.Vector3(0, 0.18, 0),
      new THREE.Vector3(-0.06, -0.02, 0), new THREE.Vector3(0.06, -0.02, 0),
    ]);
    const emblem = new THREE.LineSegments(emblemGeometry, markMaterial);
    emblem.position.set(0, 1.54, 0.548);
    this.torsoRoot.add(emblem);
  }
}
