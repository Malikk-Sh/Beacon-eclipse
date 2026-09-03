import { EnergySystem, EnergySystemName } from '../game/EnergySystem';

interface DialogueChoiceView {
  id: string;
  text: string;
}

export class Hud {
  readonly joystick: HTMLElement;
  readonly stick: HTMLElement;
  readonly interactButton: HTMLButtonElement;
  readonly soykaButton: HTMLButtonElement;
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

  constructor(private readonly root: HTMLElement, private readonly energy: EnergySystem) {
    root.innerHTML = `
      <div id="game"></div>
      <div class="hud">
        <button class="pause" aria-label="Пауза">Ⅱ</button>
        <div class="weather">☔ <span>22:47</span><small>9°C</small></div>
        <div class="objective" id="objective"><span>◆</span><b>НАЙТИ АВАРИЙНЫЙ РАСПРЕДЕЛИТЕЛЬ</b></div>
        <div class="joystick" id="joystick"><div class="stick" id="stick"></div></div>
        <button class="soyka-button" id="soykaButton"><span class="soyka-dot"></span><b>СОЙКА</b></button>
        <button class="interact hidden" id="interactButton">⚡ ВЗАИМОДЕЙСТВОВАТЬ</button>
        <div class="dialogue-shell" id="dialogueShell">
          <div class="dialogue-choices hidden" id="dialogueChoices"></div>
          <div class="choice-timer hidden" id="choiceTimer"><span id="choiceTimerFill"></span></div>
          <div class="dialogue" id="dialogue">
            <b class="dialogue-speaker" id="dialogueSpeaker">МАРА</b>
            <span class="dialogue-text" id="dialogueText">Лев? Если слышишь меня — найди аварийный щит.</span>
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

    const systems = this.require('#energySystems');
    for (const definition of energy.definitions) {
      const button = document.createElement('button');
      button.dataset.system = definition.id;
      button.innerHTML = `<span>${definition.label}</span><b>${definition.cost}</b>`;
      button.addEventListener('click', () => {
        energy.toggle(definition.id);
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

  setDialogue(text: string) {
    const separator = text.indexOf(':');
    if (separator > 0) {
      this.showDialogue(text.slice(0, separator), text.slice(separator + 1).trim());
    } else {
      this.showDialogue('', text);
    }
  }

  showDialogue(speaker: string, text: string) {
    this.dialogueShell.classList.remove('hidden');
    this.dialogueSpeaker.textContent = speaker;
    this.dialogueSpeaker.classList.toggle('hidden', speaker.length === 0);
    this.dialogueText.textContent = text;
  }

  hideDialogue() {
    this.dialogueShell.classList.add('hidden');
  }

  showDialogueChoices(choices: DialogueChoiceView[], onSelect: (id: string) => void) {
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
    this.choiceTimerFill.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
  }

  setObjective(text: string) {
    this.objective.textContent = text;
  }

  openEnergy() {
    this.energyPanel.classList.remove('hidden');
    this.refreshEnergy();
  }

  closeEnergy() {
    this.energyPanel.classList.add('hidden');
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
