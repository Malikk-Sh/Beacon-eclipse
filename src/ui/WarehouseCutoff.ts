const HOLD_SECONDS = 1.6;

/** Uses game time, so pause/hidden tabs cannot complete a held switch. */
export class WarehouseCutoff {
  private readonly panel = document.createElement('section');
  private readonly holdButton: HTMLButtonElement;
  private readonly progress: HTMLElement;
  private elapsed = 0;
  private pointer: number | null = null;
  private key: string | null = null;

  constructor(root: HTMLElement, onConfirm: () => void, onCancel: () => void) {
    this.onConfirm = onConfirm;
    this.panel.className = 'warehouse-cutoff hidden';
    this.panel.setAttribute('aria-labelledby', 'cutoffTitle');
    this.panel.innerHTML = `
      <div class="cutoff-signal"><span></span> СВЯЗЬ С НИКОЙ УСТАНОВЛЕНА</div>
      <h2 id="cutoffTitle">СКЛАД 04</h2>
      <p id="cutoffHelp">Отключение освободит 4 единицы энергии и прервёт связь.<br>Отпустите кнопку, чтобы остановиться.</p>
      <div class="cutoff-actions">
        <button type="button" class="cutoff-hold" aria-describedby="cutoffHelp">
          <span class="cutoff-fill" aria-hidden="true"></span>
          <b>УДЕРЖИВАТЬ — ОТКЛЮЧИТЬ</b>
        </button>
        <button type="button" class="cutoff-cancel">ОСТАВИТЬ СВЯЗЬ</button>
      </div>
    `;
    root.appendChild(this.panel);
    this.holdButton = this.panel.querySelector<HTMLButtonElement>('.cutoff-hold')!;
    this.progress = this.panel.querySelector<HTMLElement>('.cutoff-fill')!;
    this.panel.querySelector('.cutoff-cancel')!.addEventListener('click', onCancel);

    this.holdButton.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !event.isPrimary || !this.isOpen || this.panel.inert || this.isHolding) return;
      event.preventDefault();
      this.holdButton.focus({ preventScroll: true });
      this.pointer = event.pointerId;
      this.holdButton.setPointerCapture(event.pointerId);
    });
    this.holdButton.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.pointer) return;
      const rect = this.holdButton.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right
        || event.clientY < rect.top || event.clientY > rect.bottom) this.resetHold();
    });
    const releasePointer = (event: PointerEvent) => {
      if (event.pointerId === this.pointer) this.resetHold();
    };
    this.holdButton.addEventListener('pointerup', releasePointer);
    this.holdButton.addEventListener('pointercancel', releasePointer);
    this.holdButton.addEventListener('lostpointercapture', releasePointer);
    this.holdButton.addEventListener('keydown', (event) => {
      if (event.code !== 'Space' && event.code !== 'Enter') return;
      event.preventDefault();
      if (!event.repeat && this.isOpen && !this.panel.inert && !this.isHolding) this.key = event.code;
    });
    this.holdButton.addEventListener('keyup', (event) => {
      if (event.code !== this.key) return;
      event.preventDefault();
      this.resetHold();
    });
    this.holdButton.addEventListener('blur', () => this.resetHold());
    window.addEventListener('blur', () => this.resetHold());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.resetHold();
    });
  }

  private readonly onConfirm: () => void;

  get isOpen() { return !this.panel.classList.contains('hidden'); }
  private get isHolding() { return this.pointer !== null || this.key !== null; }

  show(): void {
    this.resetHold();
    this.panel.classList.remove('hidden');
    this.holdButton.focus({ preventScroll: true });
  }

  hide(): void {
    this.resetHold();
    this.panel.classList.add('hidden');
  }

  setPaused(paused: boolean): void {
    this.resetHold();
    this.panel.inert = paused;
  }

  resetHold(): void {
    const pointer = this.pointer;
    this.pointer = null;
    this.key = null;
    this.elapsed = 0;
    this.progress.style.transform = 'scaleX(0)';
    if (pointer !== null && this.holdButton.hasPointerCapture(pointer)) {
      this.holdButton.releasePointerCapture(pointer);
    }
  }

  update(dt: number): void {
    if (!this.isOpen || this.panel.inert || !this.isHolding) return;
    this.elapsed += dt;
    this.progress.style.transform = `scaleX(${Math.min(1, this.elapsed / HOLD_SECONDS)})`;
    if (this.elapsed >= HOLD_SECONDS) {
      this.hide();
      this.onConfirm();
    }
  }
}
