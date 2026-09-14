import { EnergySystem, EnergySystemName } from '../game/EnergySystem';
import type { CameraMode } from '../game/SettingsStore';
import { icon } from './Icons';

interface DialogueChoiceView {
  id: string;
  text: string;
}

export class Hud {
  onEnergyToggle?: (system: EnergySystemName) => void;
  onDialogueAdvance?: () => void;
  onEnergyClose?: () => void;
  readonly joystick: HTMLElement;
  readonly stick: HTMLElement;
  readonly interactButton: HTMLButtonElement;
  readonly soykaButton: HTMLButtonElement;
  readonly jumpButton: HTMLButtonElement;
  readonly cameraButton: HTMLButtonElement;
  private heading = -1;
  private noticeTimer = 0;
  readonly energyPanel: HTMLElement;
  readonly dialogue: HTMLElement;
  private readonly dialogueShell: HTMLElement;
  private readonly dialogueSpeaker: HTMLElement;
  private readonly dialogueText: HTMLElement;
  private readonly dialogueChoices: HTMLElement;
  private readonly choiceTimer: HTMLElement;
  private readonly choiceTimerFill: HTMLElement;
  private readonly energyAvailable: HTMLElement;
  private readonly objective: HTMLElement;
  private readonly saveIndicator: HTMLElement;
  private saveIndicatorTimer = 0;

  constructor(private readonly root: HTMLElement, private readonly energy: EnergySystem) {
    root.innerHTML = `
      <div id="game"></div>
      <div class="hud">
        <button class="pause" aria-label="Пауза">${icon('pause')}</button>
        <div class="weather">${icon('rain')}<span><span id="worldClock">22:47</span><small>ШТОРМ · 9°C</small></span></div>
        <div class="objective" id="objective"><span class="objective-mark">${icon('power')}</span><div><small>ГЛАВА I / НУЛЕВОЙ ПРИЛИВ</small><b>НАЙТИ АВАРИЙНЫЙ РАСПРЕДЕЛИТЕЛЬ</b></div></div>
        <div class="heading-strip" aria-hidden="true"><span>N</span><i></i><span id="headingValue">000°</span><i></i><span>СЕВЕРНЫЙ ПОРТ</span></div>
        <button class="camera-button" id="cameraButton" aria-label="Сменить вид (V)" aria-pressed="false">${icon('camera')}<span id="cameraModeLabel">III</span><kbd>V</kbd></button>
        <div class="aim-reticle hidden" id="aimReticle" aria-hidden="true"></div>
        <div class="save-indicator hidden" id="saveIndicator">${icon('save')} СОХРАНЕНО</div>
        <div class="joystick" id="joystick"><div class="stick" id="stick"></div></div>
        <button class="soyka-button" id="soykaButton"><span class="soyka-dot">${icon('signal')}</span><span><b>СОЙКА</b><small>ПОДАТЬ СИГНАЛ</small></span></button>
        <button class="jump-button" id="jumpButton" aria-label="Прыгнуть (пробел)">${icon('jump')}<small>ПРЫЖОК</small></button>
        <div class="world-notice hidden" id="worldNotice" role="status" aria-live="polite"></div>
        <div class="control-hint" id="controlHint"><span class="desktop-hint"><kbd>WASD</kbd> ДВИЖЕНИЕ <kbd>МЫШЬ</kbd> ОСМОТР <kbd>ПРОБЕЛ</kbd> ПРЫЖОК <kbd>V</kbd> ВИД</span><span class="touch-hint">Джойстик — движение · Проведи по экрану — осмотр · Камера — сменить вид</span></div>
        <button class="interact hidden" id="interactButton">ВЗАИМОДЕЙСТВОВАТЬ</button>
        <div class="dialogue-shell" id="dialogueShell">
          <div class="dialogue-choices hidden" id="dialogueChoices"></div>
          <div class="choice-timer hidden" id="choiceTimer"><span id="choiceTimerFill"></span></div>
          <div class="dialogue" id="dialogue">
            <span class="voice-meter" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
            <b class="dialogue-speaker" id="dialogueSpeaker">МАРА</b>
            <span class="dialogue-text" id="dialogueText">Лев? Если слышишь меня — найди аварийный щит.</span>
            <button type="button" class="dialogue-next" id="dialogueNext" aria-label="Следующая реплика">ДАЛЕЕ <span aria-hidden="true">↵</span></button>
          </div>
        </div>
      </div>
      <div class="energy-panel hidden" id="energyPanel">
        <div class="panel-card">
          <header><span>РАСПРЕДЕЛЕНИЕ ЭНЕРГИИ</span><b id="energyAvailable">8 / 8</b></header>
          <p>Выберите системы, которые останутся под напряжением.</p>
          <div id="energySystems"></div>
          <footer><button id="closeEnergy">ЗАКРЫТЬ</button></footer>
        </div>
      </div>
    `;

    this.joystick = this.require('#joystick');
    this.stick = this.require('#stick');
    this.interactButton = this.require<HTMLButtonElement>('#interactButton');
    this.soykaButton = this.require<HTMLButtonElement>('#soykaButton');
    this.jumpButton = this.require<HTMLButtonElement>('#jumpButton');
    this.cameraButton = this.require<HTMLButtonElement>('#cameraButton');
    this.energyPanel = this.require('#energyPanel');
    this.dialogue = this.require('#dialogue');
    this.dialogueShell = this.require('#dialogueShell');
    this.dialogueSpeaker = this.require('#dialogueSpeaker');
    this.dialogueText = this.require('#dialogueText');
    this.dialogueChoices = this.require('#dialogueChoices');
    this.choiceTimer = this.require('#choiceTimer');
    this.choiceTimerFill = this.require('#choiceTimerFill');
    this.energyAvailable = this.require('#energyAvailable');
    this.objective = this.require('#objective b');
    this.saveIndicator = this.require('#saveIndicator');
    this.require('#dialogueNext').addEventListener('click', () => {
      if (!this.root.classList.contains('is-paused')) this.onDialogueAdvance?.();
    });

    const systems = this.require('#energySystems');
    for (const definition of energy.definitions) {
      const button = document.createElement('button');
      button.dataset.system = definition.id;
      button.innerHTML = `<span>${definition.label}</span><b>${definition.cost}</b>`;
      button.addEventListener('click', () => {
        this.onEnergyToggle?.(definition.id);
        this.refreshEnergy();
      });
      systems.appendChild(button);
    }

    this.require<HTMLButtonElement>('#closeEnergy').addEventListener('click', () => this.closeEnergy());
    this.refreshEnergy();
  }

  get gameContainer() {
    return this.require<HTMLDivElement>('#game');
  }

  get isEnergyOpen() {
    return !this.energyPanel.classList.contains('hidden');
  }

  setPaused(paused: boolean) {
    this.root.classList.toggle('is-paused', paused);
    this.require<HTMLElement>('.hud').inert = paused;
    this.energyPanel.inert = paused;
  }

  setDialogue(text: string) {
    const separator = text.indexOf(':');
    if (separator > 0) {
      this.showDialogue(text.slice(0, separator), text.slice(separator + 1).trim());
    } else {
      this.showDialogue('', text);
    }
  }

  showDialogue(speaker: string, text: string) {
    this.require('#dialogueNext').classList.remove('hidden');
    this.dialogueShell.classList.remove('hidden');
    this.dialogueSpeaker.textContent = speaker;
    this.dialogueSpeaker.classList.toggle('hidden', speaker.length === 0);
    this.dialogueText.textContent = text;
  }

  hideDialogue() {
    this.dialogueShell.classList.add('hidden');
  }

  showDialogueChoices(choices: DialogueChoiceView[], onSelect: (id: string) => void) {
    this.require('#dialogueNext').classList.add('hidden');
    this.dialogueShell.classList.remove('hidden');
    this.dialogueChoices.replaceChildren();
    choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.innerHTML = `<small>${index + 1}</small><span>${choice.text}</span>`;
      button.addEventListener('click', () => onSelect(choice.id));
      this.dialogueChoices.appendChild(button);
    });
    this.dialogueChoices.classList.remove('hidden');
    this.choiceTimer.classList.remove('hidden');
  }

  clearDialogueChoices() {
    this.dialogueChoices.replaceChildren();
    this.dialogueChoices.classList.add('hidden');
    this.choiceTimer.classList.add('hidden');
  }

  setChoiceProgress(progress: number) {
    this.choiceTimer.classList.toggle('hidden', progress < 0);
    this.choiceTimerFill.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
  }

  setObjective(text: string) {
    this.objective.textContent = text;
  }

  setClock(time: string): void { this.require('#worldClock').textContent = time; }

  setCameraMode(mode: CameraMode): void {
    this.root.dataset.camera = mode;
    this.cameraButton.setAttribute('aria-pressed', String(mode === 'first'));
    this.require('#cameraModeLabel').textContent = mode === 'first' ? 'I' : 'III';
    this.require('#aimReticle').classList.toggle('hidden', mode !== 'first');
  }

  setHeading(yaw: number): void {
    const heading = (Math.round(-yaw * 180 / Math.PI) % 360 + 360) % 360;
    if (heading === this.heading) return;
    this.heading = heading;
    this.require('#headingValue').textContent = `${String(heading).padStart(3, '0')}°`;
  }

  notify(text: string, duration = 5000) {
    const notice = this.require<HTMLElement>('#worldNotice');
    window.clearTimeout(this.noticeTimer);
    notice.textContent = text;
    notice.classList.remove('hidden');
    this.noticeTimer = window.setTimeout(() => notice.classList.add('hidden'), duration);
  }

  hideControlHint() { this.require('#controlHint').classList.add('hidden'); }

  flashAutosave() {
    this.saveIndicator.classList.remove('hidden');
    this.saveIndicator.classList.remove('fade');
    void this.saveIndicator.offsetWidth;
    this.saveIndicator.classList.add('fade');
    this.saveIndicatorTimer = window.setTimeout(() => {
      this.saveIndicator.classList.add('hidden');
    }, 1500);
  }

  openEnergy() {
    this.energyPanel.classList.remove('hidden');
    this.refreshEnergy();
  }

  closeEnergy() {
    this.energyPanel.classList.add('hidden');
    this.onEnergyClose?.();
  }

  refreshEnergy() {
    this.energyAvailable.textContent = `${this.energy.available} / ${this.energy.capacity}`;
    this.root.querySelectorAll<HTMLButtonElement>('[data-system]').forEach((button) => {
      this.setEnergyButtonState(button, button.dataset.system as EnergySystemName);
    });
  }

  private setEnergyButtonState(button: HTMLButtonElement, system: EnergySystemName) {
    button.classList.toggle('active', this.energy.isActive(system));
  }

  private require<T extends Element = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing HUD element: ${selector}`);
    return element;
  }
}
