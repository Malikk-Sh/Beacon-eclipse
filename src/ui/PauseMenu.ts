import { audioSystem } from '../game/AudioSystem';
import { SettingsStore, type GraphicsQuality } from '../game/SettingsStore';
import '../settings.css';

export class PauseMenu {
  readonly continueButton: HTMLButtonElement;
  readonly backButton: HTMLButtonElement;
  readonly recoverButton: HTMLButtonElement;
  readonly fullscreenButton: HTMLButtonElement;
  readonly qualitySelect: HTMLSelectElement;
  readonly sfxRange: HTMLInputElement;
  readonly cameraSelect: HTMLSelectElement;
  readonly motionToggle: HTMLInputElement;

  private readonly overlay: HTMLElement;
  private readonly fullscreenState: HTMLElement;
  private readonly sfxValue: HTMLElement;
  private readonly settingsStore = new SettingsStore();

  constructor(root: HTMLElement) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'settings-overlay hidden';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-label', 'Пауза и настройки');
    this.overlay.innerHTML = `
      <section class="settings-card">
        <header class="settings-header">
          <small>ГЛАВА I · СЕВЕРНЫЙ ПОРТ</small>
          <h2>ШТОРМ ПОДОЖДЁТ</h2>
          <p>Твоя история остаётся здесь. Диалоги и выборы приостановлены.</p>
        </header>
        <div class="settings-list">
          <label class="settings-row settings-quality" for="cameraSelect"><span>ПЕРСПЕКТИВА</span>
            <select id="cameraSelect"><option value="third">ОТ ТРЕТЬЕГО ЛИЦА</option><option value="first">ОТ ПЕРВОГО ЛИЦА</option></select>
          </label>
          <label class="settings-row" for="headMotion"><span>ДВИЖЕНИЕ КАМЕРЫ ПРИ ХОДЬБЕ</span><input id="headMotion" type="checkbox"></label>
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
          <label class="settings-row settings-volume" for="sfxVolume">
            <span>ГРОМКОСТЬ ЭФФЕКТОВ</span>
            <span class="settings-volume-control">
              <input id="sfxVolume" type="range" min="0" max="100" step="5" aria-label="Громкость эффектов">
              <b id="sfxVolumeValue">90%</b>
            </span>
          </label>
          <label class="settings-row settings-volume" for="voiceVolume"><span>ГОЛОСОВЫЕ ЗВУКИ</span>
            <span class="settings-volume-control"><input id="voiceVolume" type="range" min="0" max="100" step="5" aria-label="Голосовые звуки"><b id="voiceVolumeValue">65%</b></span>
          </label>
        </div>
        <details class="field-journal"><summary>ЗАПИСИ ПОРТА <span id="journalCount"></span></summary><div id="journalEntries"></div></details>
        <p class="settings-help">WASD — движение · Пробел — прыжок · E — действие · V — сменить вид<br>От первого лица: клик по сцене — свободный осмотр, Esc — пауза.<br>Голосовые звуки имитируют речь; текст диалогов остаётся доступен.</p>
        <button type="button" class="settings-row" id="recoverPosition">ВЕРНУТЬСЯ НА БЕЗОПАСНОЕ МЕСТО</button>
        <footer class="settings-actions">
          <button type="button" class="settings-primary" id="continueGame">ПРОДОЛЖИТЬ</button>
          <button type="button" class="settings-secondary" id="backToGame">ЗАКРЫТЬ / НАЗАД</button>
        </footer>
      </section>
    `;
    root.appendChild(this.overlay);

    this.continueButton = this.require<HTMLButtonElement>('#continueGame');
    this.backButton = this.require<HTMLButtonElement>('#backToGame');
    this.recoverButton = this.require<HTMLButtonElement>('#recoverPosition');
    this.fullscreenButton = this.require<HTMLButtonElement>('#fullscreenToggle');
    this.fullscreenState = this.require('#fullscreenState');
    this.qualitySelect = this.require<HTMLSelectElement>('#qualitySelect');
    this.sfxRange = this.require<HTMLInputElement>('#sfxVolume');
    this.sfxValue = this.require('#sfxVolumeValue');
    this.cameraSelect = this.require<HTMLSelectElement>('#cameraSelect');
    this.motionToggle = this.require<HTMLInputElement>('#headMotion');
    const settings = this.settingsStore.load();
    this.cameraSelect.value = settings.cameraMode;
    this.motionToggle.checked = settings.headMotion;
    this.motionToggle.addEventListener('change', () => {
      settings.headMotion = this.motionToggle.checked;
      this.settingsStore.save(settings);
    });
    const voiceRange = this.require<HTMLInputElement>('#voiceVolume');
    const voiceValue = this.require('#voiceVolumeValue');
    voiceRange.value = String(Math.round(settings.voiceVolume * 100));
    voiceValue.textContent = `${voiceRange.value}%`;
    audioSystem.setVoiceVolume(settings.voiceVolume);
    voiceRange.addEventListener('input', () => {
      settings.voiceVolume = Number(voiceRange.value) / 100;
      voiceValue.textContent = `${voiceRange.value}%`;
      audioSystem.setVoiceVolume(settings.voiceVolume);
      this.settingsStore.save(settings);
    });

    this.setSfxVolume(this.settingsStore.load().sfxVolume);
    this.sfxRange.addEventListener('input', () => {
      const volume = Number(this.sfxRange.value) / 100;
      const settings = this.settingsStore.load();
      settings.sfxVolume = volume;
      this.settingsStore.save(settings);
      audioSystem.setVolume(volume);
      this.setSfxVolume(volume);
    });
  }

  setJournal(entries: { title: string; text: string }[], total: number): void {
    this.require('#journalCount').textContent = `${entries.length} / ${total}`;
    const container = this.require('#journalEntries');
    container.replaceChildren();
    if (!entries.length) container.textContent = 'Осматривай вещи и приёмники. Найденные записи останутся здесь.';
    for (const entry of entries) {
      const article = document.createElement('article');
      const title = document.createElement('h3');
      const text = document.createElement('p');
      title.textContent = entry.title;
      text.textContent = entry.text;
      article.append(title, text);
      container.appendChild(article);
    }
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

  private setSfxVolume(volume: number): void {
    const percent = Math.round(volume * 100);
    this.sfxRange.value = String(percent);
    this.sfxValue.textContent = `${percent}%`;
  }

  private require<T extends Element = HTMLElement>(selector: string): T {
    const element = this.overlay.querySelector<T>(selector);
    if (!element) throw new Error(`Missing pause menu element: ${selector}`);
    return element;
  }
}
