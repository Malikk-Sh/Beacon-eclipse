import * as THREE from 'three';

export interface InteractionTarget {
  id: string;
  label: string;
  position: THREE.Vector3;
  radius: number;
  action: () => void;
  enabled?: () => boolean;
}

export class InteractionSystem {
  private targets: InteractionTarget[] = [];
  private current: InteractionTarget | null = null;

  constructor(
    private readonly button: HTMLButtonElement,
    private readonly onTargetChanged?: (target: InteractionTarget | null) => void,
  ) {
    button.addEventListener('click', () => this.trigger());
  }

  add(target: InteractionTarget) {
    this.targets.push(target);
  }

  trigger() {
    if (this.button.disabled || !this.current || (this.current.enabled && !this.current.enabled())) return;
    this.current.action();
  }

  update(playerPosition: THREE.Vector3, allowed = true) {
    let nearest: InteractionTarget | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const target of this.targets) {
      if (!allowed || (target.enabled && !target.enabled())) continue;
      if (Math.abs(playerPosition.y - target.position.y) > 0.85) continue;
      const distance = playerPosition.distanceTo(target.position);
      if (distance <= target.radius && distance < nearestDistance) {
        nearest = target;
        nearestDistance = distance;
      }
    }

    if (nearest === this.current) return;
    this.current = nearest;
    this.button.classList.toggle('hidden', !nearest);
    if (nearest) this.button.textContent = nearest.label;
    this.onTargetChanged?.(nearest);
  }
}
