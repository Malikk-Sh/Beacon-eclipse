import { audioSystem } from '../game/AudioSystem';

export class VerticalSliceEnding {
  private readonly overlay: HTMLDivElement;

  constructor(root: HTMLElement) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'vertical-slice-ending';
    this.overlay.setAttribute('aria-hidden', 'true');
    root.appendChild(this.overlay);
  }

  show(): void {
    audioSystem.fadeOut(1.4);
    this.overlay.setAttribute('aria-hidden', 'false');
    this.overlay.classList.add('visible');
  }
}
