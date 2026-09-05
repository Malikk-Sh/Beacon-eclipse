import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { MaterialLibrary } from '../MaterialLibrary';

export class SchoolArea {
  private readonly materials = new MaterialLibrary();

  constructor(
    private readonly root: THREE.Group,
    private readonly physics: RAPIER.World,
    private readonly origin: THREE.Vector3,
  ) {
    this.buildApproach();
    this.buildCorridor();
    this.addLockerLanguage();
    this.addClassroomDoors();
    this.addCeilingInfrastructure();
    this.addFloorWear();
    this.addDebris();
  }

  private buildApproach(): void {
    this.staticBox(0, 7.4, 7.2, 0.45, 15.2, this.materials.wetConcrete, 0);
    for (const side of [-3.55, 3.55]) {
      this.staticBox(side, 7.4, 0.14, 1.1, 15.2, this.materials.darkSteel, 0.45);
    }

    const railGeometry = new THREE.CylinderGeometry(0.035, 0.035, 14.6, 6);
    const rails = new THREE.InstancedMesh(railGeometry, this.materials.oldSteel, 4);
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    const scale = new THREE.Vector3(1, 1, 1);
    const placements = [
      [-3.48, 0.95, 7.4], [3.48, 0.95, 7.4],
      [-3.48, 1.32, 7.4], [3.48, 1.32, 7.4],
    ] as const;
    placements.forEach(([x, y, z], index) => {
      matrix.compose(new THREE.Vector3(x, y, z), rotation, scale);
      rails.setMatrixAt(index, matrix);
    });
    rails.castShadow = true;
    this.root.add(rails);

    const postGeometry = new THREE.BoxGeometry(0.08, 1.32, 0.08);
    const posts = new THREE.InstancedMesh(postGeometry, this.materials.darkSteel, 24);
    let index = 0;
    for (const x of [-3.48, 3.48]) {
      for (let z = 0.5; z <= 14.2; z += 1.3) {
        matrix.makeTranslation(x, 0.68, z);
        posts.setMatrixAt(index++, matrix);
      }
    }
    posts.count = index;
    posts.castShadow = true;
    this.root.add(posts);
  }

  private buildCorridor(): void {
    const floor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.45, 34), this.materials.wetConcrete);
    floor.position.set(0, 0.225, -17);
    floor.receiveShadow = true;
    this.root.add(floor);
    this.addCollider(0, -17, 11, 0.45, 34, 0);

    for (const side of [-5.35, 5.35]) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 4.4, 34),
        this.materials.structural(0x252c31),
      );
      wall.position.set(side, 2.2, -17);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.root.add(wall);
      this.addCollider(side, -17, 0.3, 4.4, 34, 0);
    }

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(11, 4.4, 0.3),
      this.materials.structural(0x222a2f),
    );
    backWall.position.set(0, 2.2, -33.8);
    backWall.castShadow = true;
    this.root.add(backWall);
    this.addCollider(0, -33.8, 11, 4.4, 0.3, 0);

    const ceilingBeamGeometry = new THREE.BoxGeometry(10.7, 0.16, 0.28);
    const beams = new THREE.InstancedMesh(ceilingBeamGeometry, this.materials.darkSteel, 8);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 8; i++) {
      matrix.makeTranslation(0, 4.18, -2.3 - i * 4.35);
      beams.setMatrixAt(i, matrix);
    }
    beams.castShadow = true;
    this.root.add(beams);

    const entranceHeader = new THREE.Mesh(new THREE.BoxGeometry(10.7, 0.5, 0.28), this.materials.rust);
    entranceHeader.position.set(0, 3.82, -0.28);
    entranceHeader.castShadow = true;
    this.root.add(entranceHeader);

    const schoolSign = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.82, 0.14), this.materials.fadedPaint);
    schoolSign.position.set(0, 3.42, -0.43);
    schoolSign.castShadow = true;
    this.root.add(schoolSign);

    const node = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.42, 0.42), this.materials.warningPaint);
    node.position.set(0, 0.72, -13);
    node.castShadow = true;
    this.root.add(node);
    const nodeLens = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.05), this.materials.amberSignal);
    nodeLens.position.set(0, 0.94, -12.76);
    this.root.add(nodeLens);
  }

  private addLockerLanguage(): void {
    const lockerBodyGeometry = new THREE.BoxGeometry(1.15, 2.3, 2.8);
    const lockerBodies = new THREE.InstancedMesh(lockerBodyGeometry, this.materials.paintedMetal, 10);
    const doorGeometry = new THREE.BoxGeometry(0.055, 2.02, 1.14);
    const doors = new THREE.InstancedMesh(doorGeometry, this.materials.fadedPaint, 20);
    const ventGeometry = new THREE.BoxGeometry(0.035, 0.06, 0.42);
    const vents = new THREE.InstancedMesh(ventGeometry, this.materials.darkSteel, 40);
    const handleGeometry = new THREE.BoxGeometry(0.05, 0.16, 0.07);
    const handles = new THREE.InstancedMesh(handleGeometry, this.materials.rust, 20);
    const matrix = new THREE.Matrix4();
    let bodyIndex = 0;
    let doorIndex = 0;
    let ventIndex = 0;
    let handleIndex = 0;

    for (const x of [-4.45, 4.45]) {
      const innerX = x < 0 ? -3.845 : 3.845;
      for (let z = -5; z >= -29; z -= 6) {
        matrix.makeTranslation(x, 1.15, z);
        lockerBodies.setMatrixAt(bodyIndex++, matrix);

        for (const offsetZ of [-0.64, 0.64]) {
          matrix.makeTranslation(innerX, 1.15, z + offsetZ);
          doors.setMatrixAt(doorIndex++, matrix);
          matrix.makeTranslation(innerX + (x < 0 ? 0.04 : -0.04), 1.55, z + offsetZ);
          vents.setMatrixAt(ventIndex++, matrix);
          matrix.makeTranslation(innerX + (x < 0 ? 0.04 : -0.04), 1.42, z + offsetZ);
          vents.setMatrixAt(ventIndex++, matrix);
          matrix.makeTranslation(innerX + (x < 0 ? 0.055 : -0.055), 1.12, z + offsetZ + 0.34);
          handles.setMatrixAt(handleIndex++, matrix);
        }
      }
    }

    lockerBodies.castShadow = true;
    doors.castShadow = true;
    lockerBodies.receiveShadow = true;
    this.root.add(lockerBodies, doors, vents, handles);
  }

  private addClassroomDoors(): void {
    const doorGeometry = new THREE.BoxGeometry(0.08, 2.55, 1.85);
    const doors = new THREE.InstancedMesh(doorGeometry, this.materials.structural(0x30383b), 6);
    const frameGeometry = new THREE.BoxGeometry(0.11, 2.8, 0.13);
    const frames = new THREE.InstancedMesh(frameGeometry, this.materials.rust, 12);
    const plateGeometry = new THREE.BoxGeometry(0.06, 0.34, 0.62);
    const plates = new THREE.InstancedMesh(plateGeometry, this.materials.fadedPaint, 6);
    const matrix = new THREE.Matrix4();
    let doorIndex = 0;
    let frameIndex = 0;
    let plateIndex = 0;

    for (const x of [-5.16, 5.16]) {
      for (const z of [-9, -18, -27]) {
        matrix.makeTranslation(x, 1.3, z);
        doors.setMatrixAt(doorIndex++, matrix);
        for (const dz of [-1.02, 1.02]) {
          matrix.makeTranslation(x, 1.4, z + dz);
          frames.setMatrixAt(frameIndex++, matrix);
        }
        matrix.makeTranslation(x + (x < 0 ? 0.05 : -0.05), 2.72, z);
        plates.setMatrixAt(plateIndex++, matrix);
      }
    }
    doors.castShadow = true;
    frames.castShadow = true;
    this.root.add(doors, frames, plates);
  }

  private addCeilingInfrastructure(): void {
    const conduitGeometry = new THREE.CylinderGeometry(0.035, 0.035, 31.5, 6);
    const conduits = new THREE.InstancedMesh(conduitGeometry, this.materials.oldSteel, 3);
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    const scale = new THREE.Vector3(1, 1, 1);
    [-2.8, 0, 2.8].forEach((x, index) => {
      matrix.compose(new THREE.Vector3(x, 4.02, -17), rotation, scale);
      conduits.setMatrixAt(index, matrix);
    });
    this.root.add(conduits);

    const fixtureGeometry = new THREE.BoxGeometry(1.15, 0.12, 0.34);
    const fixtures = new THREE.InstancedMesh(fixtureGeometry, this.materials.darkSteel, 7);
    const glowGeometry = new THREE.BoxGeometry(0.78, 0.025, 0.16);
    const glows = new THREE.InstancedMesh(glowGeometry, this.materials.cyanSignal, 7);
    for (let i = 0; i < 7; i++) {
      const z = -3.2 - i * 4.65;
      matrix.makeTranslation((i % 2 ? 0.7 : -0.7), 3.92, z);
      fixtures.setMatrixAt(i, matrix);
      matrix.makeTranslation((i % 2 ? 0.7 : -0.7), 3.84, z);
      glows.setMatrixAt(i, matrix);
    }
    fixtures.castShadow = true;
    this.root.add(fixtures, glows);
  }

  private addFloorWear(): void {
    const puddleMaterial = this.materials.wetPatch;
    const puddles = [
      [-2.4, -6.5, 2.2, 4.2],
      [1.8, -14.5, 2.8, 3.6],
      [-1.2, -23.5, 3.1, 4.6],
      [2.7, -30.2, 1.8, 2.4],
    ] as const;
    for (const [x, z, sx, sz] of puddles) {
      const puddle = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), puddleMaterial);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(x, 0.456, z);
      puddle.receiveShadow = true;
      this.root.add(puddle);
    }
  }

  private addDebris(): void {
    const debrisGeometry = new THREE.BoxGeometry(0.34, 0.06, 0.22);
    const debris = new THREE.InstancedMesh(debrisGeometry, this.materials.rust, 24);
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    for (let i = 0; i < 24; i++) {
      const x = -3.5 + ((i * 17) % 70) / 10;
      const z = -2.5 - ((i * 31) % 300) / 10;
      rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ((i * 37) % 100) / 100 * Math.PI);
      scale.set(0.55 + (i % 4) * 0.24, 1, 0.7 + (i % 3) * 0.18);
      matrix.compose(new THREE.Vector3(x, 0.5, z), rotation, scale);
      debris.setMatrixAt(i, matrix);
    }
    debris.castShadow = true;
    this.root.add(debris);
  }

  private staticBox(
    x: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    material: THREE.Material,
    y: number,
  ): void {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y + sy / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.root.add(mesh);
    this.addCollider(x, z, sx, sy, sz, y);
  }

  private addCollider(x: number, z: number, sx: number, sy: number, sz: number, y: number): void {
    const body = this.physics.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(this.origin.x + x, y + sy / 2, this.origin.z + z),
    );
    this.physics.createCollider(RAPIER.ColliderDesc.cuboid(sx / 2, sy / 2, sz / 2), body);
  }
}
