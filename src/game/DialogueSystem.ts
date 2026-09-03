import { Hud } from '../ui/Hud';
import { MEMORY_ECHO_EVENT, MemoryEchoCustomEvent } from './MemoryEchoEvent';

export interface DialogueLineStep {
  kind: 'line';
  speaker: string;
  text: string;
  duration?: number;
}

export interface DialogueChoiceOption {
  id: string;
  text: string;
  followUp?: DialogueStep[];
}

export interface DialogueChoiceStep {
  kind: 'choice';
  options: DialogueChoiceOption[];
  timeout?: number;
  silence?: DialogueChoiceOption;
  onSelect?: (choiceId: string) => void;
}

export type DialogueStep = DialogueLineStep | DialogueChoiceStep;

export class DialogueSystem {
  private queue: DialogueStep[] = [];
  private current: DialogueStep | null = null;
  private elapsed = 0;
  private onComplete: (() => void) | null = null;

  constructor(private readonly hud: Hud) {
    window.addEventListener('keydown', (event) => {
      if (this.current?.kind !== 'choice') return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < this.current.options.length) {
        this.selectChoice(this.current.options[index]);
      }
    });

    window.addEventListener(MEMORY_ECHO_EVENT, (event: Event) => {
      const memoryEvent = event as MemoryEchoCustomEvent;
      const { speaker, text, duration } = memoryEvent.detail;
      if (this.say(speaker, text, duration)) memoryEvent.preventDefault();
    });
  }

  get isBusy() {
    return this.current !== null || this.queue.length > 0;
  }

  play(steps: DialogueStep[], onComplete?: () => void) {
    this.queue = [...steps];
    this.current = null;
    this.elapsed = 0;
    this.onComplete = onComplete ?? null;
    this.hud.clearDialogueChoices();
    this.advance();
  }

  update(dt: number) {
    if (!this.current) return;
    this.elapsed += dt;

    if (this.current.kind === 'line') {
      if (this.elapsed >= (this.current.duration ?? 3)) this.advance();
      return;
    }

    const timeout = this.current.timeout ?? 5;
    this.hud.setChoiceProgress(Math.max(0, 1 - this.elapsed / timeout));
    if (this.elapsed >= timeout) {
      if (this.current.silence) this.selectChoice(this.current.silence);
      else this.advance();
    }
  }

  say(speaker: string, text: string, duration = 3) {
    if (this.isBusy) return false;
    this.play([{ kind: 'line', speaker, text, duration }]);
    return true;
  }

  stop() {
    this.queue = [];
    this.current = null;
    this.onComplete = null;
    this.hud.clearDialogueChoices();
    this.hud.hideDialogue();
  }

  private advance() {
    this.hud.clearDialogueChoices();
    this.current = this.queue.shift() ?? null;
    this.elapsed = 0;

    if (!this.current) {
      this.hud.setChoiceProgress(0);
      this.hud.hideDialogue();
      const done = this.onComplete;
      this.onComplete = null;
      done?.();
      return;
    }

    if (this.current.kind === 'line') {
      this.hud.showDialogue(this.current.speaker, this.current.text);
      return;
    }

    this.hud.showDialogueChoices(
      this.current.options.map((option) => ({ id: option.id, text: option.text })),
      (id) => {
        const option = this.current?.kind === 'choice'
          ? this.current.options.find((candidate) => candidate.id === id)
          : undefined;
        if (option) this.selectChoice(option);
      },
    );
    this.hud.setChoiceProgress(1);
  }

  private selectChoice(option: DialogueChoiceOption) {
    if (this.current?.kind !== 'choice') return;
    const choice = this.current;
    choice.onSelect?.(option.id);
    if (option.followUp?.length) this.queue.unshift(...option.followUp);
    this.advance();
  }
}
