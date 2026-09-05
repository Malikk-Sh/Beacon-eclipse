import * as THREE from 'three';

export class BridgeArchiveTerminal {
  readonly interactionPosition = new THREE.Vector3(2.45, 0, -43.2);

  private readonly screenMaterial: THREE.MeshBasicMaterial;
  private readonly statusMaterial: THREE.MeshStandardMaterial;
  private available = false;

  constructor(scene: THREE.Scene) {
    const root = new THREE.Group();
    root.position.copy(this.interactionPosition);
    root.position.x = 2.72;
    scene.add(root);

    const casing = new THREE.MeshStandardMaterial({ color: 0x202a30, roughness: 0.62, metalness: 0.58 });
    const edge = new THREE.MeshStandardMaterial({ color: 0x3c464b, roughness: 0.48, metalness: 0.72 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x11181c, roughness: 0.92, metalness: 0.05 });
    this.statusMaterial = new THREE.MeshStandardMaterial({
      color: 0x171d20,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.45,
      metalness: 0.35,
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.16, 0.72), rubber);
    base.position.y = 0.08;
    base.castShadow = true;
    base.receiveShadow = true;
    root.add(base);

    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.18, 0.48), casing);
    pedestal.position.y = 0.72;
    pedestal.rotation.x = -0.04;
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    root.add(pedestal);

    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.22, 0.62), edge);
    shoulder.position.set(0, 1.26, -0.02);
    shoulder.castShadow = true;
    root.add(shoulder);

    const screenHousing = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.72, 0.18), casing);
    screenHousing.position.set(0, 1.62, -0.18);
    screenHousing.rotation.x = -0.1;
    screenHousing.castShadow = true;
    root.add(screenHousing);

    this.screenMaterial = new THREE.MeshBasicMaterial({
      map: this.createScreenTexture('ARCHIVE RELAY', ['LINK OFFLINE'], '#6b7b83'),
      toneMapped: false,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.52), this.screenMaterial);
    screen.position.set(0, 1.63, -0.278);
    screen.rotation.set(-0.1, Math.PI, 0);
    root.add(screen);

    const status = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.045, 10), this.statusMaterial);
    status.position.set(0.42, 1.19, -0.34);
    status.rotation.x = Math.PI / 2;
    root.add(status);

    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.25, 7), rubber);
    cable.position.set(-0.35, 0.62, 0.27);
    cable.rotation.z = -0.15;
    root.add(cable);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.08, 0.08), edge);
    guard.position.set(0, 1.93, -0.09);
    root.add(guard);
  }

  setAvailable(available: boolean): void {
    if (this.available === available) return;
    this.available = available;
    if (!available) {
      this.setScreen('ARCHIVE RELAY', ['LINK OFFLINE'], '#6b7b83');
      this.statusMaterial.emissive.setHex(0x000000);
      this.statusMaterial.emissiveIntensity = 0;
      return;
    }

    this.setScreen('ARCHIVE RELAY', ['RECORD FOUND', 'ACCESS READY'], '#d8a866');
    this.statusMaterial.emissive.setHex(0xd78134);
    this.statusMaterial.emissiveIntensity = 2.2;
  }

  showIdentityMatch(): void {
    this.available = true;
    this.setScreen('IDENTITY MATCH', ['LEV ARDEN', 'ARCHIVE: 17 YEARS AGO'], '#efd8a3');
    this.statusMaterial.emissive.setHex(0x73c9e8);
    this.statusMaterial.emissiveIntensity = 3.1;
  }

  private setScreen(title: string, lines: string[], accent: string): void {
    const previous = this.screenMaterial.map;
    this.screenMaterial.map = this.createScreenTexture(title, lines, accent);
    this.screenMaterial.needsUpdate = true;
    previous?.dispose();
  }

  private createScreenTexture(title: string, lines: string[], accent: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create archive terminal canvas');

    context.fillStyle = '#071014';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = '#263a42';
    context.lineWidth = 4;
    context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    context.fillStyle = '#31434a';
    for (let y = 30; y < 232; y += 14) context.fillRect(28, y, 456, 1);

    context.fillStyle = accent;
    context.font = '700 31px monospace';
    context.fillText(title, 36, 66);

    context.font = '600 24px monospace';
    lines.forEach((line, index) => {
      context.fillText(line, 36, 118 + index * 42);
    });

    context.fillStyle = '#52646b';
    context.font = '500 15px monospace';
    context.fillText('MUNICIPAL ARCHIVE // BRIDGE RELAY 07', 36, 224);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }
}
