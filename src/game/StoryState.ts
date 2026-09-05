import type { EnergySystemName } from './EnergySystem';

export interface SavedVector3 {
  x: number;
  y: number;
  z: number;
}

export interface ResponseProfile {
  direct: number;
  vulnerable: number;
  silent: number;
}

export interface StoryProgress {
  lighthousePowered: boolean;
  warehouseContacted: boolean;
  warehouseFarewellPlayed: boolean;
  bridgeStarted: boolean;
  memoryPrototypeSeen: boolean;
  schoolEntered: boolean;
  schoolReconstructionStarted: boolean;
  schoolReconstructionCompleted: boolean;
  schoolPromiseSceneSeen: boolean;
}

export interface StoryState {
  version: 1;
  savedAt: number;
  player: {
    position: SavedVector3;
    yaw: number;
  };
  progress: StoryProgress;
  energy: EnergySystemName[];
  responseProfile: ResponseProfile;
  choices: Record<string, string>;
  schoolEchoesHeard: string[];
}

export function createDefaultStoryState(): StoryState {
  return {
    version: 1,
    savedAt: Date.now(),
    player: {
      position: { x: 0, y: 0, z: 24 },
      yaw: 0,
    },
    progress: {
      lighthousePowered: false,
      warehouseContacted: false,
      warehouseFarewellPlayed: false,
      bridgeStarted: false,
      memoryPrototypeSeen: false,
      schoolEntered: false,
      schoolReconstructionStarted: false,
      schoolReconstructionCompleted: false,
      schoolPromiseSceneSeen: false,
    },
    energy: [],
    responseProfile: {
      direct: 0,
      vulnerable: 0,
      silent: 0,
    },
    choices: {},
    schoolEchoesHeard: [],
  };
}
