import * as THREE from 'three';
import type { DialogueSystem } from './DialogueSystem';
import { line } from './MysteryStory';
import { part, consolidate } from '../world/DetailGeometry';

/** The impossible doorway is a local visual event; it never changes the walkable floor. */
export class ThresholdScene {
  readonly anchorPosition: THREE.Vector3;
  readonly root = new THREE.Group();
  private readonly bell = new THREE.Group();
  private readonly rings: THREE.Mesh[] = [];
  private unlocked = false;
  private played = false;
  private elapsed = 0;

  constructor(parent: THREE.Group, private readonly dialogue: DialogueSystem, origin: THREE.Vector3) {
    this.root.position.set(0, 0, -30.5);
    this.root.name = 'the-ninth-threshold';
    this.anchorPosition = origin.clone().add(this.root.position);
    this.root.visible = false;
    parent.add(this.root);
    const bronze = this.material(0xc8b994, 0.62);
    const trace = this.material(0xa3cabe, 0.32);
    const shadow = this.material(0x182e2e, 0.68);
    for (const x of [-1.4, 1.4]) part(this.root, new THREE.BoxGeometry(0.1, 2.9, 0.16), bronze, x, 1.92, -0.4);
    part(this.root, new THREE.BoxGeometry(2.9, 0.12, 0.16), bronze, 0, 3.36, -0.4);
    // A translucent void with a double frame, set away from the player's trigger position.
    part(this.root, new THREE.PlaneGeometry(2.68, 2.82), shadow, 0, 1.91, -0.43);
    for (let i = 0; i < 9; i++) {
      const mark = part(this.root, new THREE.BoxGeometry(0.023, 0.16, 0.012), trace, -0.72 + i * 0.18, 3.13, -0.30);
      mark.rotation.z = i === 8 ? 0.2 : 0;
    }
    this.bell.position.set(0, 2.87, -0.16);
    this.root.add(this.bell);
    const profile = [[0.05, 0.11], [0.14, 0.08], [0.18, -0.12], [0.23, -0.35], [0.37, -0.48], [0.38, -0.53], [0.31, -0.52], [0.19, -0.31], [0.1, 0.02]];
    part(this.bell, new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 32), bronze);
    for (const y of [-0.49, -0.44, -0.13]) {
      const band = part(this.bell, new THREE.TorusGeometry(y < -0.4 ? 0.35 : 0.18, 0.012, 6, 32), trace, 0, y, 0);
      band.rotation.x = Math.PI / 2;
    }
    part(this.root, new THREE.CylinderGeometry(0.011, 0.011, 0.43, 6), bronze, 0, 3.11, -0.16);
    for (let i = 0; i < 3; i++) {
      const ring = part(this.root, new THREE.RingGeometry(1.03 + i * 0.24, 1.045 + i * 0.24, 64), trace, 0, 0.494 + i * 0.002, 0);
      ring.rotation.x = -Math.PI / 2;
      this.rings.push(ring);
    }
    consolidate(this.bell);
  }

  unlock(): void { if (!this.played) { this.unlocked = true; this.root.visible = true; } }
  restore(completed: boolean): void { this.played = completed; this.unlocked = false; this.root.visible = false; }

  update(dt: number): void {
    if (!this.root.visible) return;
    this.elapsed += dt;
    this.bell.rotation.z = Math.sin(this.elapsed * 0.8) * 0.035;
    this.rings.forEach((ring, i) => ring.scale.setScalar(1 + Math.sin(this.elapsed * 0.55 + i) * 0.016));
  }

  play(onComplete: () => void): boolean {
    if (!this.unlocked || this.played || this.dialogue.isBusy) return false;
    this.played = true;
    this.unlocked = false;
    this.dialogue.play([
      line('СОЙКА', 'Восемь ударов. Я не вижу языка у колокола.'),
      line('СВЯЗЬ · ГОЛОС ЛЬВА', 'Открой канал в море.'),
      line('ЛЕВ', 'Нет. Эти слова я не собирался говорить.'),
      line('НИКА', 'Он больше не повторяет. Он пробует сделать так, чтобы ты повторил за ним.'),
      line('МАРА', 'Сойка сохранила схему. Возвращайся к ретранслятору на мосту. Выбор должен остаться твоим.'),
    ], onComplete);
    return true;
  }

  private material(color: number, opacity: number): THREE.MeshBasicMaterial {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    material.userData.baseOpacity = opacity;
    return material;
  }
}
