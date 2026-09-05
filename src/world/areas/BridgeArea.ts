import * as THREE from 'three';
import { MaterialLibrary } from '../MaterialLibrary';

export class BridgeArea {
  constructor(scene: THREE.Scene, materials: MaterialLibrary, bridgeRoot: THREE.Group) {
    this.addPylons(scene, materials);
    this.addSupportCables(scene);
    this.addMovingDeckDetails(materials, bridgeRoot);
    this.addApproach(scene, materials);
  }

  private addPylons(scene: THREE.Scene, materials: MaterialLibrary): void {
    const columnGeometry = new THREE.BoxGeometry(0.62, 9.8, 0.72);
    const columns = new THREE.InstancedMesh(columnGeometry, materials.darkSteel, 8);
    const matrix = new THREE.Matrix4();
    let index = 0;
    for (const z of [-19.5, -44.3]) {
      for (const x of [-4.35, 4.35]) {
        matrix.makeTranslation(x, 4.9, z);
        columns.setMatrixAt(index++, matrix);
      }
      for (const x of [-3.55, 3.55]) {
        matrix.makeTranslation(x, 5.9, z);
        columns.setMatrixAt(index++, matrix);
      }
    }
    columns.castShadow = true;
    scene.add(columns);

    for (const z of [-19.5, -44.3]) {
      const topBeam = this.box(scene, materials.oldSteel, 0, 9.35, z, 9.35, 0.48, 0.68);
      topBeam.castShadow = true;
      const lowerBeam = this.box(scene, materials.rust, 0, 6.7, z, 8.2, 0.22, 0.54);
      lowerBeam.castShadow = true;

      const leftCap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.42), materials.redSignal);
      leftCap.position.set(-4.35, 10.0, z);
      const rightCap = leftCap.clone();
      rightCap.position.x = 4.35;
      scene.add(leftCap, rightCap);
    }

    const diagonalGeometry = new THREE.BoxGeometry(0.16, 4.9, 0.18);
    const diagonals = new THREE.InstancedMesh(diagonalGeometry, materials.oldSteel, 8);
    const rotationA = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.69);
    const rotationB = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.69);
    const scale = new THREE.Vector3(1, 1, 1);
    index = 0;
    for (const z of [-19.5, -44.3]) {
      for (const y of [3.05, 7.1]) {
        matrix.compose(new THREE.Vector3(-2.15, y, z), rotationB, scale);
        diagonals.setMatrixAt(index++, matrix);
        matrix.compose(new THREE.Vector3(2.15, y, z), rotationA, scale);
        diagonals.setMatrixAt(index++, matrix);
      }
    }
    diagonals.castShadow = true;
    scene.add(diagonals);
  }

  private addSupportCables(scene: THREE.Scene): void {
    const points: number[] = [];
    const addCable = (x: number, topZ: number, groundZ: number) => {
      const top = new THREE.Vector3(x, 9.55, topZ);
      const middle = new THREE.Vector3(x, 5.15, (topZ + groundZ) * 0.5);
      middle.y -= 1.2;
      const ground = new THREE.Vector3(x, 1.0, groundZ);
      points.push(top.x, top.y, top.z, middle.x, middle.y, middle.z);
      points.push(middle.x, middle.y, middle.z, ground.x, ground.y, ground.z);
    };

    for (const x of [-4.35, 4.35]) {
      addCable(x, -19.5, -8.5);
      addCable(x, -19.5, -30.5);
      addCable(x, -44.3, -33.0);
      addCable(x, -44.3, -55.5);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const cables = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0x29373f, transparent: true, opacity: 0.82 }),
    );
    scene.add(cables);
  }

  private addMovingDeckDetails(materials: MaterialLibrary, bridgeRoot: THREE.Group): void {
    const railMaterial = materials.oldSteel;
    const leftRail = this.localBox(bridgeRoot, railMaterial, -3.18, 1.02, -14, 0.1, 0.1, 27.2);
    const rightRail = this.localBox(bridgeRoot, railMaterial, 3.18, 1.02, -14, 0.1, 0.1, 27.2);
    leftRail.castShadow = true;
    rightRail.castShadow = true;

    const middleLeft = this.localBox(bridgeRoot, railMaterial, -3.18, 0.58, -14, 0.08, 0.08, 27.2);
    const middleRight = this.localBox(bridgeRoot, railMaterial, 3.18, 0.58, -14, 0.08, 0.08, 27.2);
    middleLeft.castShadow = true;
    middleRight.castShadow = true;

    const postGeometry = new THREE.BoxGeometry(0.09, 1.05, 0.09);
    const posts = new THREE.InstancedMesh(postGeometry, materials.darkSteel, 24);
    const matrix = new THREE.Matrix4();
    let postIndex = 0;
    for (const x of [-3.18, 3.18]) {
      for (let z = -1.5; z >= -26.5; z -= 2.3) {
        matrix.makeTranslation(x, 0.55, z);
        posts.setMatrixAt(postIndex++, matrix);
      }
    }
    posts.count = postIndex;
    posts.castShadow = true;
    bridgeRoot.add(posts);

    const crossGeometry = new THREE.BoxGeometry(6.65, 0.12, 0.18);
    const crossBeams = new THREE.InstancedMesh(crossGeometry, materials.rust, 12);
    for (let i = 0; i < 12; i++) {
      matrix.makeTranslation(0, 0.04, -1.4 - i * 2.3);
      crossBeams.setMatrixAt(i, matrix);
    }
    crossBeams.castShadow = true;
    bridgeRoot.add(crossBeams);

    const laneGeometry = new THREE.BoxGeometry(0.09, 0.025, 1.05);
    const laneMarks = new THREE.InstancedMesh(laneGeometry, materials.lanePaint, 14);
    for (let i = 0; i < 14; i++) {
      matrix.makeTranslation(0, 0.47, -1.2 - i * 1.9);
      laneMarks.setMatrixAt(i, matrix);
    }
    bridgeRoot.add(laneMarks);

    const signalGeometry = new THREE.BoxGeometry(0.13, 0.13, 0.13);
    const signals = new THREE.InstancedMesh(signalGeometry, materials.redSignal, 12);
    let signalIndex = 0;
    for (const x of [-3.2, 3.2]) {
      for (let z = -3; z >= -25; z -= 4.4) {
        matrix.makeTranslation(x, 1.13, z);
        signals.setMatrixAt(signalIndex++, matrix);
      }
    }
    signals.count = signalIndex;
    bridgeRoot.add(signals);
  }

  private addApproach(scene: THREE.Scene, materials: MaterialLibrary): void {
    const curbLeft = this.box(scene, materials.wetConcrete, -3.65, 0.24, -17.7, 0.42, 0.48, 4.2);
    const curbRight = this.box(scene, materials.wetConcrete, 3.65, 0.24, -17.7, 0.42, 0.48, 4.2);
    curbLeft.receiveShadow = true;
    curbRight.receiveShadow = true;

    const gateFrame = this.box(scene, materials.warningPaint, 0, 2.75, -18.45, 8.05, 0.2, 0.26);
    gateFrame.castShadow = true;
    for (const x of [-3.8, 3.8]) {
      const post = this.box(scene, materials.darkSteel, x, 1.5, -18.45, 0.22, 3, 0.22);
      post.castShadow = true;
    }
  }

  private box(
    scene: THREE.Scene,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  private localBox(
    parent: THREE.Object3D,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
}
