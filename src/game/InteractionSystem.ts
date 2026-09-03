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
    button.addEventListener('click', () => this.current?.action());
  }

  add(target: InteractionTarget) {
    this.targets.push(target);
  }

  update(playerPosition: THREE.Vector3) {
    let nearest: InteractionTarget | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const target of this.targets) {
      if (target.enabled && !target.enabled()) continue;
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
