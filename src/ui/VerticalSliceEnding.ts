import { audioSystem } from '../game/AudioSystem';
import type { EndingChoice } from '../game/MysteryStory';

export class VerticalSliceEnding {
  private readonly overlay: HTMLDivElement;

  constructor(root: HTMLElement) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'vertical-slice-ending';
    this.overlay.setAttribute('aria-hidden', 'true');
    root.appendChild(this.overlay);
  }

  show(choice: EndingChoice, clues: number, onExplore: () => void): void {
    audioSystem.fadeOut(1.4);
    const sealed = choice === 'seal';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-label', 'Итог первой главы');
    this.overlay.innerHTML = `
      <section class="chapter-result">
        <div class="result-symbol" aria-hidden="true">${sealed ? '◉' : '◎'}</div>
        <p class="result-eyebrow">ГЛАВА I · НУЛЕВОЙ ПРИЛИВ</p>
        <h1>${sealed ? 'Минута тишины' : 'Другая сторона'}</h1>
        <p>${sealed ? 'Часы впервые показывают 22:48. Повтор замкнут внутри порта. За стеной слышен один тихий удар — его Сойка не записала.' : 'Сигнал ушёл в открытое море. Среди волн появился круг света. Теперь источник знает, что на берегу есть слушатель.'}</p>
        <dl><div><dt>ТВОЁ РЕШЕНИЕ</dt><dd>${sealed ? 'Замкнуть контур' : 'Открыть канал'}</dd></div><div><dt>ОТМЕТКИ СМОТРИТЕЛЯ</dt><dd>${clues} / 4</dd></div></dl>
        <button type="button" class="ending-explore">ВЕРНУТЬСЯ В ПОРТ <span aria-hidden="true">→</span></button>
        <small>Глава завершена. Можно исследовать оставшиеся места и перечитать журнал.</small>
      </section>`;
    const button = this.overlay.querySelector<HTMLButtonElement>('button')!;
    button.addEventListener('click', () => {
      this.overlay.classList.remove('visible');
      this.overlay.setAttribute('aria-hidden', 'true');
      this.overlay.inert = true;
      onExplore();
    }, { once: true });
    this.overlay.inert = false;
    this.overlay.setAttribute('aria-hidden', 'false');
    this.overlay.classList.add('visible');
    button.focus({ preventScroll: true });
  }
}
