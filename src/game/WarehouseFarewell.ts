import type { DialogueSystem } from './DialogueSystem';
import type { EnergySystem } from './EnergySystem';
import type { StoryState } from './StoryState';
import { line } from './MysteryStory';

interface FarewellCallbacks {
  onResponse: () => void;
  onReady: () => void;
  onCancel: () => void;
  onCutoff: () => void;
}

/** A reply is remembered immediately; only the player's switch commits the cutoff. */
export class WarehouseFarewell {
  private phase: 'idle' | 'dialogue' | 'ready' = 'idle';

  constructor(
    private readonly story: StoryState,
    private readonly energy: Pick<EnergySystem, 'isActive' | 'toggle'>,
    private readonly dialogue: Pick<DialogueSystem, 'isBusy' | 'play' | 'stop'>,
    private readonly callbacks: FarewellCallbacks,
  ) {}

  get active() { return this.phase !== 'idle'; }

  begin(): boolean {
    if (this.active || this.dialogue.isBusy || !this.story.progress.warehouseContacted
      || !this.energy.isActive('warehouse')) return false;

    if (this.story.choices.channelRule !== undefined || this.story.choices.nikaPromise !== undefined || this.story.progress.warehouseFarewellPlayed) {
      this.ready();
      return true;
    }

    this.phase = 'dialogue';
    this.dialogue.play([
      line('МАРА', 'Склад начнёт повторять твой голос после отсечения. Это остаточный сигнал. Я буду на другой частоте.'),
      line('НИКА', 'Если услышишь своё имя с той стороны двери — не отвечай.'),
      { kind: 'choice', timeout: 0, options: [
        { id: 'acknowledge', text: 'Правило принято.', followUp: [line('ЛЕВ', 'Отсекаю канал. Мара, оставайся на связи.')] },
        { id: 'listen', text: 'Сойка, сохрани запись.', followUp: [line('СОЙКА', 'Сохранено. Сравню голоса после отключения.')] },
        { id: 'silence', text: 'Молча подготовить переключатель.', followUp: [line('НИКА', 'Хорошо. Пусть говорит первым.')] },
      ], onSelect: (choice) => {
        if (this.story.choices.channelRule !== undefined) return;
        this.story.choices.channelRule = choice;
        const response = choice === 'silence' ? 'silent' : choice === 'listen' ? 'vulnerable' : 'direct';
        this.story.responseProfile[response] += 1;
        this.callbacks.onResponse();
      } },
    ], () => {
      if (this.phase === 'dialogue') this.ready();
    });
    return true;
  }

  confirm(): boolean {
    if (this.phase !== 'ready' || !this.energy.isActive('warehouse')) return false;
    const previous = this.story.progress.warehouseFarewellPlayed;
    this.story.progress.warehouseFarewellPlayed = true;
    // onChange may save synchronously, so it must see the committed story flag.
    if (!this.energy.toggle('warehouse')) {
      this.story.progress.warehouseFarewellPlayed = previous;
      return false;
    }
    this.phase = 'idle';
    this.callbacks.onCutoff();
    return true;
  }

  cancel(): void {
    if (!this.active) return;
    if (this.phase === 'dialogue') this.dialogue.stop();
    this.phase = 'idle';
    this.callbacks.onCancel();
  }

  private ready(): void {
    this.phase = 'ready';
    this.callbacks.onReady();
  }
}
