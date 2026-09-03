import { EnergySystem, EnergySystemName } from '../game/EnergySystem';

export class Hud {
  readonly joystick: HTMLElement;
  readonly stick: HTMLElement;
  readonly interactButton: HTMLButtonElement;
  readonly soykaButton: HTMLButtonElement;
  readonly energyPanel: HTMLElement;
  readonly dialogue: HTMLElement;
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
        <div class="dialogue" id="dialogue">МАРА: Лев? Если слышишь меня — найди аварийный щит.</div>
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
    this.dialogue.textContent = text;
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
