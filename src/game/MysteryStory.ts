import type { DialogueStep } from './DialogueSystem';
import type { StoryState } from './StoryState';
import type { EnergySystemName } from './EnergySystem';

export const CHAPTER_NAME = 'НУЛЕВОЙ ПРИЛИВ';
export type EndingChoice = 'seal' | 'transmit';
export const line = (speaker: string, text: string, duration?: number): DialogueStep => ({
  kind: 'line', speaker, text, duration: duration ?? Math.max(2.6, text.length / 17 + 0.6),
});

export function openingStory(onSelect: (id: string) => void): DialogueStep[] {
  return [
    line('МАРА', 'Северный маяк, приём. Лев, не трогай радио. Сначала послушай.'),
    line('СВЯЗЬ · ГОЛОС ЛЬВА', 'Почему часы стоят?'),
    line('ЛЕВ', 'Я этого не говорил.'),
    line('МАРА', 'Я знаю. Он опережает нас на семнадцать секунд. Снаружи уже третий раз один и тот же прилив.'),
    { kind: 'choice', timeout: 0, options: [
      { id: 'trace', text: 'Найдём источник.', followUp: [line('МАРА', 'Склад 04. Сигнал идёт оттуда, но кабель уходит под школу.')] },
      { id: 'listen', text: 'Что ещё повторяется?', followUp: [line('МАРА', 'Восемь ударов колокола. Каждый цикл. Девятого пока не было.')] },
    ], onSelect },
    line('МАРА', 'Верни питание аварийным щитом. Сойка знает выход. Я останусь на этой частоте.'),
  ];
}

export function warehouseStory(onSelect: (id: string) => void): DialogueStep[] {
  return [
    line('СВЯЗЬ · ГОЛОС ЛЬВА', 'Кто передаёт?'),
    line('ЛЕВ', 'Опять мой голос. Сойка, запиши время.'),
    line('СОЙКА', '22:47. Внешние часы не меняются. Мой таймер работает.'),
    line('НИКА', 'Не сверяйся с часами. Считай удары.'),
    line('ЛЕВ', 'Ника — это твоё имя?'),
    line('НИКА', 'Позывной. Так смотрители называли канал под водой. Я слышу другую сторону.'),
    { kind: 'choice', timeout: 0, options: [
      { id: 'verify', text: 'Докажи, что слышишь нас.', followUp: [line('НИКА', 'У школьного входа колокол без языка. Скоро он ударит.'), line('СОЙКА', 'Канал запомнен. Проверим на месте.')] },
      { id: 'source', text: 'Как остановить повтор?', followUp: [line('НИКА', 'Найдите три отметки смотрителя в школе. Они объяснят, как замкнуть контур.')] },
      { id: 'silent', text: 'Только записать сигнал.', followUp: [line('СОЙКА', 'Запись идёт. Ответного импульса не отправляю.')] },
    ], onSelect },
    line('МАРА', 'Для моста нужен резерв склада. Отсеки этот канал на распределителе. Мой передатчик независимый.'),
  ];
}

export const SCHOOL_CLUES = [
  { id: 'teacher', x: -2.8, z: -67, title: '01 · ПРАВИЛО СМОТРИТЕЛЯ', speaker: 'ЗАПИСЬ СМОТРИТЕЛЯ',
    text: 'Восемь ударов — вода слушает. Девятый — отвечает. Не называй себя в открытый канал.' },
  { id: 'student', x: 2.6, z: -72, title: '02 · КОЛОКОЛ БЕЗ ЯЗЫКА', speaker: 'СОЙКА',
    text: 'На фотографии колокол уже пуст. Но рядом записаны восемь ударов. Значит, звучит не металл.' },
  { id: 'young-lev', x: -0.8, z: -80, title: '03 · СХЕМА КОНТУРА', speaker: 'ЗАПИСЬ СМОТРИТЕЛЯ',
    text: 'Маяк, склад, школа. Замкни линию через мостовой ретранслятор. Сигнал вернётся туда, откуда пришёл.' },
  { id: 'announcement', x: 3, z: -87, title: '04 · ОБРАТНАЯ ПЕРЕДАЧА', speaker: 'ГРОМКОГОВОРИТЕЛЬ',
    text: 'Если откроешь контур в море, услышишь источник. Но он тоже услышит тебя. Выбор остаётся у ретранслятора.' },
] as const;

export function endingStory(story: StoryState, onSelect: (id: EndingChoice) => void): DialogueStep[] {
  return [
    line('СОЙКА', 'Это не архив. Ретранслятор хранит ответы на ещё не отправленные вопросы.'),
    line('МАРА', 'На схеме два выхода. Замкнуть линию внутри порта — или открыть её в море.'),
    line('НИКА', story.choices.signalApproach === 'verify'
      ? 'Ты хотел доказательство. Колокол прозвучал. Теперь реши, кому позволишь слушать.'
      : 'Я не могу выбрать за тебя. Я сама остаюсь внутри сигнала.'),
    { kind: 'choice', timeout: 0, options: [
      { id: 'seal', text: 'Замкнуть контур · остановить повтор', followUp: [
        line('СОЙКА', 'Контур замкнут. Часы: 22:48.'),
        line('МАРА', 'Вода отступает. Лев, ты это сделал.'),
        line('НИКА', 'Теперь не звони в колокол. Даже если позовут моим голосом.'),
      ] },
      { id: 'transmit', text: 'Открыть канал в море · услышать источник', followUp: [
        line('СОЙКА', 'Ответ идёт из-под дна. Глубина не определяется.'),
        line('НЕИЗВЕСТНЫЙ СИГНАЛ', 'Северный маяк. Теперь ваша очередь слушать.'),
        line('МАРА', 'На воде появился свет. Его нет ни на одной карте.'),
      ] },
    ], onSelect: id => { if (id === 'seal' || id === 'transmit') onSelect(id); } },
  ];
}

export function commitEnding(story: StoryState, choice: EndingChoice): boolean {
  if (!story.progress.schoolReconstructionCompleted || story.choices.tideEnding) return false;
  story.choices.tideEnding = choice;
  story.progress.bridgeArchiveTerminalSeen = true;
  return true;
}

export function chapterObjective(story: StoryState, active: (id: EnergySystemName) => boolean): string {
  const p = story.progress;
  if (p.bridgeArchiveTerminalSeen) return story.choices.tideEnding === 'transmit' ? 'КАНАЛ ОТКРЫТ · ИССЛЕДОВАТЬ ПОРТ' : 'КОНТУР ЗАМКНУТ · ИССЛЕДОВАТЬ ПОРТ';
  if (!p.lighthousePowered) return 'НАЙТИ АВАРИЙНЫЙ РАСПРЕДЕЛИТЕЛЬ';
  if (p.schoolReconstructionCompleted) return 'ВЕРНУТЬСЯ К МОСТОВОМУ РЕТРАНСЛЯТОРУ';
  if (p.schoolReconstructionStarted) {
    const count = SCHOOL_CLUES.filter(c => story.schoolEchoesHeard.includes(c.id)).length;
    return count >= 3 ? 'НАЙТИ ИСТОЧНИК В КОНЦЕ КОРИДОРА' : `ИССЛЕДОВАТЬ ОТМЕТКИ СМОТРИТЕЛЯ · ${count} / 3`;
  }
  if (p.schoolEntered) return 'НАСТРОИТЬ СОЙКУ НА ЧАСТОТУ КОЛОКОЛА';
  if (p.bridgeStarted) return 'ДОЙТИ ДО ЗАКРЫТОЙ ШКОЛЫ';
  if (p.warehouseContacted && active('bridge')) return 'ЗАПУСТИТЬ ПРИВОД МОСТА';
  if (p.warehouseContacted) return 'ОТСЕЧЬ КАНАЛ СКЛАДА · ЗАПИТАТЬ МОСТ';
  if (active('warehouse')) return 'ПРОСЛЕДИТЬ СИГНАЛ · СКЛАД 04';
  return 'НАЙТИ РАСПРЕДЕЛИТЕЛЬ В ПОРТУ';
}

export function chapterRecap(story: StoryState): string {
  if (story.progress.schoolReconstructionCompleted) return 'Отметки смотрителя указывают на мостовой ретранслятор. Там можно замкнуть повтор или услышать источник в море.';
  if (story.progress.bridgeStarted) return 'Канал склада отсечён. В закрытой школе слышен колокол без языка. Найди три отметки смотрителя — они объяснят повтор.';
  if (story.progress.warehouseContacted) return '«Ника» — позывной канала под водой. Отсеки склад на распределителе и передай резерв мосту, чтобы добраться до школы.';
  return 'В порту повторяется один и тот же прилив. Часы стоят на 22:47, а радио отвечает раньше вопроса. Источник — у Склада 04.';
}
