export class VerticalSliceEnding {
  private readonly overlay: HTMLDivElement;

  constructor(root: HTMLElement) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'vertical-slice-ending';
    this.overlay.setAttribute('aria-hidden', 'true');
    root.appendChild(this.overlay);
  }

  show(): void {
    this.overlay.setAttribute('aria-hidden', 'false');
    this.overlay.classList.add('visible');
  }
}
