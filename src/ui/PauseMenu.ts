import { audioSystem } from '../game/AudioSystem';
import type { GraphicsQuality } from '../game/SettingsStore';
import '../settings.css';

export class PauseMenu {
  readonly continueButton: HTMLButtonElement;
  readonly backButton: HTMLButtonElement;
  readonly fullscreenButton: HTMLButtonElement;
  readonly qualitySelect: HTMLSelectElement;

  private readonly overlay: HTMLElement;
  private readonly fullscreenState: HTMLElement;

  constructor(root: HTMLElement) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'settings-overlay hidden';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-label', 'Пауза и настройки');
    this.overlay.innerHTML = `
      <section class="settings-card">
        <header class="settings-header">
          <small>ПАУЗА</small>
          <h2>СИСТЕМНЫЕ НАСТРОЙКИ</h2>
          <p>Шторм подождёт. Диалоги и выборы также остановлены.</p>
        </header>
        <div class="settings-list">
          <button type="button" class="settings-row" id="fullscreenToggle">
            <span>ПОЛНОЭКРАННЫЙ РЕЖИМ</span>
            <b id="fullscreenState">ВЫКЛ</b>
          </button>
          <label class="settings-row settings-quality" for="qualitySelect">
            <span>КАЧЕСТВО ГРАФИКИ</span>
            <select id="qualitySelect">
              <option value="low">НИЗКОЕ</option>
              <option value="medium">СРЕДНЕЕ</option>
              <option value="high">ВЫСОКОЕ</option>
            </select>
          </label>
        </div>
        <footer class="settings-actions">
          <button type="button" class="settings-primary" id="continueGame">ПРОДОЛЖИТЬ</button>
          <button type="button" class="settings-secondary" id="backToGame">ЗАКРЫТЬ / НАЗАД</button>
        </footer>
      </section>
    `;
    root.appendChild(this.overlay);

    this.continueButton = this.require<HTMLButtonElement>('#continueGame');
    this.backButton = this.require<HTMLButtonElement>('#backToGame');
    this.fullscreenButton = this.require<HTMLButtonElement>('#fullscreenToggle');
    this.fullscreenState = this.require('#fullscreenState');
    this.qualitySelect = this.require<HTMLSelectElement>('#qualitySelect');
  }

  get isOpen(): boolean {
    return !this.overlay.classList.contains('hidden');
  }

  open(): void {
    audioSystem.setPaused(true);
    this.overlay.classList.remove('hidden');
    this.continueButton.focus({ preventScroll: true });
  }

  close(): void {
    audioSystem.setPaused(false);
    this.overlay.classList.add('hidden');
  }

  setFullscreenState(active: boolean, supported: boolean): void {
    this.fullscreenButton.disabled = !supported;
    this.fullscreenState.textContent = supported ? (active ? 'ВКЛ' : 'ВЫКЛ') : 'НЕДОСТУПНО';
    this.fullscreenButton.setAttribute('aria-pressed', String(active));
  }

  setQuality(quality: GraphicsQuality): void {
    this.qualitySelect.value = quality;
  }

  private require<T extends Element = HTMLElement>(selector: string): T {
    const element = this.overlay.querySelector<T>(selector);
    if (!element) throw new Error(`Missing pause menu element: ${selector}`);
    return element;
  }
}
