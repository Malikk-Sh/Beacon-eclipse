export type GraphicsQuality = 'low' | 'medium' | 'high';
export type CameraMode = 'third' | 'first';

export interface SettingsState {
  quality: GraphicsQuality;
  musicVolume: number;
  sfxVolume: number;
  cameraSensitivity: number;
  cameraMode: CameraMode;
  voiceVolume: number;
  headMotion: boolean;
  fieldOfView: number;
  thirdPersonFieldOfView: number;
}

const SETTINGS_KEY = 'beacon-eclipse.settings.v1';

const DEFAULT_SETTINGS: SettingsState = {
  quality: 'medium',
  musicVolume: 0.8,
  sfxVolume: 0.9,
  cameraSensitivity: 1,
  cameraMode: 'third',
  voiceVolume: 0.65,
  headMotion: true,
  fieldOfView: 68,
  thirdPersonFieldOfView: 55,
};

let cachedSettings: SettingsState | null = null;

function isGraphicsQuality(value: unknown): value is GraphicsQuality {
  return value === 'low' || value === 'medium' || value === 'high';
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

export function fieldOfView(value: unknown, fallback = 68): number {
  return boundedNumber(value, fallback, 50, 90);
}

export class SettingsStore {
  load(): SettingsState {
    if (cachedSettings) return cachedSettings;

    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) {
        cachedSettings = { ...DEFAULT_SETTINGS };
        return cachedSettings;
      }
      const parsed = JSON.parse(raw) as Partial<SettingsState>;
      cachedSettings = {
        quality: isGraphicsQuality(parsed.quality) ? parsed.quality : DEFAULT_SETTINGS.quality,
        musicVolume: boundedNumber(parsed.musicVolume, DEFAULT_SETTINGS.musicVolume, 0, 1),
        sfxVolume: boundedNumber(parsed.sfxVolume, DEFAULT_SETTINGS.sfxVolume, 0, 1),
        cameraSensitivity: boundedNumber(parsed.cameraSensitivity, DEFAULT_SETTINGS.cameraSensitivity, 0.25, 2),
        cameraMode: parsed.cameraMode === 'first' ? 'first' : 'third',
        voiceVolume: boundedNumber(parsed.voiceVolume, DEFAULT_SETTINGS.voiceVolume, 0, 1),
        headMotion: typeof parsed.headMotion === 'boolean' ? parsed.headMotion : true,
        fieldOfView: fieldOfView(parsed.fieldOfView),
        thirdPersonFieldOfView: fieldOfView(parsed.thirdPersonFieldOfView, 55),
      };
      return cachedSettings;
    } catch {
      cachedSettings = { ...DEFAULT_SETTINGS };
      return cachedSettings;
    }
  }

  save(state: SettingsState): boolean {
    cachedSettings = state;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }
}
