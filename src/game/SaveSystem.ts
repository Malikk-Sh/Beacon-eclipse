import { createDefaultStoryState, StoryState } from './StoryState';

const SAVE_KEY = 'beacon-eclipse.save.v1';

export class SaveSystem {
  load(): StoryState | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<StoryState>;
      if (parsed.version !== 1 || !parsed.player || !parsed.progress || !Array.isArray(parsed.energy)) {
        return null;
      }

      const defaults = createDefaultStoryState();
      return {
        ...defaults,
        ...parsed,
        player: { ...defaults.player, ...parsed.player },
        progress: { ...defaults.progress, ...parsed.progress },
        responseProfile: { ...defaults.responseProfile, ...parsed.responseProfile },
        choices: { ...defaults.choices, ...parsed.choices },
        energy: parsed.energy,
      } as StoryState;
    } catch (error) {
      console.warn('Could not load save data', error);
      return null;
    }
  }

  save(state: StoryState) {
    try {
      state.savedAt = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.warn('Could not save game', error);
      return false;
    }
  }

  clear() {
    localStorage.removeItem(SAVE_KEY);
  }
}
