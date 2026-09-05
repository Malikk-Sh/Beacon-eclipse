import * as THREE from 'three';
import { MaterialLibrary } from '../MaterialLibrary';

export class LighthouseArea {
  constructor(scene: THREE.Scene, materials: MaterialLibrary) {
    this.addTowerSkin(scene, materials);
    this.addLanternRoom(scene, materials);
    this.addCatwalk(scene, materials);
    this.addServiceDetails(scene, materials);
  }

  private addTowerSkin(scene: THREE.Scene, materials: MaterialLibrary): void {
    const ribGeometry = new THREE.BoxGeometry(0.14, 8.7, 0.22);
    const ribs = new THREE.InstancedMesh(ribGeometry, materials.oldSteel, 12);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      position.set(Math.cos(angle) * 2.92, 9.15, 28.5 + Math.sin(angle) * 2.92);
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
      matrix.compose(position, quaternion, scale);
      ribs.setMatrixAt(i, matrix);
    }
    ribs.castShadow = true;
    ribs.receiveShadow = true;
    scene.add(ribs);

    for (const y of [5.6, 8.7, 11.7]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(2.98, 0.08, 6, 32), materials.rust);
      band.rotation.x = Math.PI / 2;
      band.position.set(0, y, 28.5);
      band.castShadow = true;
      scene.add(band);
    }

    const serviceBand = new THREE.Mesh(
      new THREE.CylinderGeometry(3.04, 3.04, 0.44, 16, 1, true),
      materials.fadedPaint,
    );
    serviceBand.position.set(0, 9.3, 28.5);
    serviceBand.castShadow = true;
    scene.add(serviceBand);
  }

  private addLanternRoom(scene: THREE.Scene, materials: MaterialLibrary): void {
    const balcony = new THREE.Mesh(new THREE.TorusGeometry(3.28, 0.12, 6, 36), materials.darkSteel);
    balcony.rotation.x = Math.PI / 2;
    balcony.position.set(0, 13.05, 28.5);
    balcony.castShadow = true;
    scene.add(balcony);

    const postGeometry = new THREE.CylinderGeometry(0.045, 0.045, 1.25, 6);
    const posts = new THREE.InstancedMesh(postGeometry, materials.oldSteel, 16);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      matrix.makeTranslation(Math.cos(angle) * 3.2, 13.62, 28.5 + Math.sin(angle) * 3.2);
      posts.setMatrixAt(i, matrix);
    }
    posts.castShadow = true;
    scene.add(posts);

    for (const y of [13.38, 13.86]) {
      const rail = new THREE.Mesh(new THREE.TorusGeometry(3.22, 0.045, 5, 36), materials.oldSteel);
      rail.rotation.x = Math.PI / 2;
      rail.position.set(0, y, 28.5);
      scene.add(rail);
    }

    const glassGeometry = new THREE.BoxGeometry(0.62, 0.92, 0.045);
    const windows = new THREE.InstancedMesh(glassGeometry, materials.glass, 8);
    const windowMatrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      position.set(Math.cos(angle) * 0.94, 14.1, 28.5 + Math.sin(angle) * 0.94);
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle + Math.PI / 2);
      windowMatrix.compose(position, quaternion, new THREE.Vector3(1, 1, 1));
      windows.setMatrixAt(i, windowMatrix);
    }
    scene.add(windows);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 0.92, 0.42, 12), materials.darkSteel);
    cap.position.set(0, 14.82, 28.5);
    cap.castShadow = true;
    scene.add(cap);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 1.35, 8), materials.oldSteel);
    mast.position.set(0, 15.68, 28.5);
    scene.add(mast);

    const beaconCore = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.48, 12), materials.beaconHousing);
    beaconCore.position.set(0, 14.14, 28.5);
    scene.add(beaconCore);
  }

  private addCatwalk(scene: THREE.Scene, materials: MaterialLibrary): void {
    const railGeometry = new THREE.CylinderGeometry(0.035, 0.035, 9.1, 6);
    const rails = new THREE.InstancedMesh(railGeometry, materials.oldSteel, 4);
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    const scale = new THREE.Vector3(1, 1, 1);
    const placements = [
      [-2.12, 0.72, 11.55], [2.12, 0.72, 11.55],
      [-2.12, 1.16, 11.55], [2.12, 1.16, 11.55],
    ] as const;
    placements.forEach(([x, y, z], index) => {
      matrix.compose(new THREE.Vector3(x, y, z), rotation, scale);
      rails.setMatrixAt(index, matrix);
    });
    scene.add(rails);

    const postGeometry = new THREE.BoxGeometry(0.07, 1.2, 0.07);
    const posts = new THREE.InstancedMesh(postGeometry, materials.darkSteel, 16);
    let index = 0;
    for (const x of [-2.12, 2.12]) {
      for (let z = 7.2; z <= 16.1; z += 1.28) {
        matrix.makeTranslation(x, 0.62, z);
        posts.setMatrixAt(index++, matrix);
      }
    }
    posts.count = index;
    posts.castShadow = true;
    scene.add(posts);

    const grateGeometry = new THREE.BoxGeometry(4.1, 0.035, 0.07);
    const grates = new THREE.InstancedMesh(grateGeometry, materials.darkSteel, 18);
    for (let i = 0; i < 18; i++) {
      matrix.makeTranslation(0, 0.22, 7.1 + i * 0.52);
      grates.setMatrixAt(i, matrix);
    }
    grates.receiveShadow = true;
    scene.add(grates);
  }

  private addServiceDetails(scene: THREE.Scene, materials: MaterialLibrary): void {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5.8, 8), materials.rust);
    pipe.position.set(-3.08, 8.15, 28.1);
    pipe.rotation.z = -0.045;
    pipe.castShadow = true;
    scene.add(pipe);

    const junction = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.72, 0.32), materials.warningPaint);
    junction.position.set(-3.02, 5.45, 27.98);
    junction.castShadow = true;
    scene.add(junction);

    const signal = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.08), materials.redSignal);
    signal.position.set(-3.19, 5.62, 27.78);
    scene.add(signal);
  }
}
