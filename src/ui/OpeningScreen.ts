export class OpeningScreen {
  constructor(root: HTMLElement, returning: boolean, onStart: () => void, onRestart?: () => void) {
    const overlay = document.createElement('div');
    overlay.className = 'opening-screen';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Пока город помнит');
    overlay.innerHTML = `
      <div class="opening-station"><span class="opening-signal"></span> СЕВЕРНЫЙ МАЯК <span>22:47 / 9°C</span></div>
      <section class="opening-copy">
        <p class="opening-eyebrow">ГЛАВА I · ПОСЛЕДНИЙ СИГНАЛ</p>
        <h1>ПОКА ГОРОД<br><em>ПОМНИТ</em></h1>
        <p class="opening-description">Свет маяка погас.<br>В школе на другом берегу кто-то всё ещё ждёт.</p>
        <button type="button" class="opening-start">${returning ? 'ПРОДОЛЖИТЬ ПУТЬ' : 'НАЧАТЬ ПУТЬ'} <span aria-hidden="true">→</span></button>
        ${returning ? '<button type="button" class="opening-restart">Начать заново</button><div class="opening-confirm hidden"><p>Начать новый путь? Текущее сохранение будет заменено.</p><button type="button" data-restart="yes">Да, начать сначала</button><button type="button" data-restart="no">Оставить сохранение</button></div>' : ''}
        <p class="opening-footnote">${returning ? 'Ваши решения и найденные записи сохранены.' : 'Исследуй порт. Слушай город. Решай, чему дать свет.'}</p>
      </section>
      <div class="opening-bottom"><span>ШТОРМОВОЕ ПРЕДУПРЕЖДЕНИЕ · СЕКТОР 04</span><span>Для атмосферы — наушники</span></div>
    `;
    root.classList.add('at-title');
    root.appendChild(overlay);
    const button = overlay.querySelector<HTMLButtonElement>('button')!;
    button.addEventListener('click', () => {
      if (button.disabled) return;
      button.disabled = true;
      overlay.inert = true;
      root.classList.remove('at-title');
      overlay.classList.add('opening-leaving');
      onStart();
      window.setTimeout(() => overlay.remove(), 900);
    });
    const confirmation = overlay.querySelector<HTMLElement>('.opening-confirm');
    overlay.querySelector('.opening-restart')?.addEventListener('click', () => {
      confirmation?.classList.remove('hidden');
      overlay.querySelector<HTMLButtonElement>('[data-restart="no"]')?.focus();
    });
    overlay.querySelector('[data-restart="no"]')?.addEventListener('click', () => {
      confirmation?.classList.add('hidden');
      button.focus();
    });
    overlay.querySelector('[data-restart="yes"]')?.addEventListener('click', () => onRestart?.());
    button.focus({ preventScroll: true });
  }
}
