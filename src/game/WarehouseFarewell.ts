import type { DialogueSystem } from './DialogueSystem';
import type { EnergySystem } from './EnergySystem';
import type { StoryState } from './StoryState';

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

    if (this.story.choices.nikaPromise !== undefined || this.story.progress.warehouseFarewellPlayed) {
      this.ready();
      return true;
    }

    this.phase = 'dialogue';
    this.dialogue.play([
      { kind: 'line', speaker: 'ЛЕВ', text: 'Ника. Чтобы открыть мост, мне придётся отключить склад.', duration: 3.4 },
      { kind: 'line', speaker: 'НИКА', text: 'Лев?', duration: 1.6 },
      { kind: 'line', speaker: 'НИКА', text: 'Подожди... Ты ведь вернёшься?', duration: 3 },
      {
        kind: 'choice',
        timeout: 5.5,
        options: [
          {
            id: 'promise', text: 'Обещаю.',
            followUp: [{ kind: 'line', speaker: 'ЛЕВ', text: 'Обещаю.', duration: 2 }],
          },
          {
            id: 'honest', text: 'Я не знаю.',
            followUp: [
              { kind: 'line', speaker: 'ЛЕВ', text: 'Я не знаю.', duration: 1.8 },
              { kind: 'line', speaker: 'НИКА', text: 'Хотя бы честно.', duration: 2 },
            ],
          },
        ],
        silence: {
          id: 'silence', text: '',
          followUp: [{ kind: 'line', speaker: 'НИКА', text: 'Понятно.', duration: 2 }],
        },
        onSelect: (choice) => {
          if (this.story.choices.nikaPromise !== undefined) return;
          this.story.choices.nikaPromise = choice;
          const response = choice === 'silence' ? 'silent' : choice === 'honest' ? 'vulnerable' : 'direct';
          this.story.responseProfile[response] += 1;
          this.callbacks.onResponse();
        },
      },
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
