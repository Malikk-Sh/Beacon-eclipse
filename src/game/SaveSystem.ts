import { createDefaultStoryState, StoryState } from './StoryState';
import { finitePosition, inPlayableArea, stageCheckpoint } from './TraversalSafety';

const SAVE_KEY = 'beacon-eclipse.save.v1';

export class SaveSystem {
  repairedPosition = false;

  load(): StoryState | null {
    this.repairedPosition = false;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<StoryState>;
      if (parsed.version !== 1 || !parsed.player || !parsed.progress || !Array.isArray(parsed.energy)) {
        return null;
      }

      const defaults = createDefaultStoryState();
      const state = {
        ...defaults,
        ...parsed,
        player: { ...defaults.player, ...parsed.player },
        progress: { ...defaults.progress, ...parsed.progress },
        responseProfile: { ...defaults.responseProfile, ...parsed.responseProfile },
        choices: { ...defaults.choices, ...parsed.choices },
        energy: parsed.energy,
      } as StoryState;
      if (!finitePosition(state.player.position) || !inPlayableArea(state.player.position, state.progress.bridgeStarted)) {
        state.player.position = stageCheckpoint(state.progress);
        this.repairedPosition = true;
      }
      if (!Number.isFinite(state.player.yaw)) state.player.yaw = 0;
      state.schoolEchoesHeard = Array.isArray(parsed.schoolEchoesHeard)
        ? parsed.schoolEchoesHeard.filter((id): id is string => typeof id === 'string') : [];
      return state;
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
