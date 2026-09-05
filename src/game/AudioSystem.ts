import * as THREE from 'three';

export interface AudioFrameState {
  playerPosition: THREE.Vector3;
  soykaPosition: THREE.Vector3;
  moving: boolean;
  bridgeStarted: boolean;
  bridgePowered: boolean;
  warehousePowered: boolean;
  portLightsPowered: boolean;
  pumpsPowered: boolean;
}

export class AudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private waterGain: GainNode | null = null;
  private humGain: GainNode | null = null;
  private radioGain: GainNode | null = null;
  private motorGain: GainNode | null = null;
  private radioPanner: PannerNode | null = null;
  private motorPanner: PannerNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private paused = false;
  private fadingOut = false;
  private volume: number;
  private footstepTimer = 0;
  private creakTimer = 5 + Math.random() * 5;

  private readonly unlockFromGesture = () => {
    void this.unlock();
  };

  constructor(volume: number) {
    this.volume = THREE.MathUtils.clamp(volume, 0, 1);
    window.addEventListener('pointerdown', this.unlockFromGesture, { capture: true });
    window.addEventListener('keydown', this.unlockFromGesture, { capture: true });
  }

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.buildGraph(this.context);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    window.removeEventListener('pointerdown', this.unlockFromGesture, { capture: true });
    window.removeEventListener('keydown', this.unlockFromGesture, { capture: true });
    this.applyMasterLevel(0.08);
  }

  setVolume(volume: number): void {
    this.volume = THREE.MathUtils.clamp(volume, 0, 1);
    this.applyMasterLevel(0.08);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.applyMasterLevel(0.12);
  }

  fadeOut(seconds = 1.4): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    this.fadingOut = true;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + Math.max(0.05, seconds));
  }

  playThunder(): void {
    const context = this.context;
    const master = this.master;
    const noiseBuffer = this.noiseBuffer;
    if (!context || !master || !noiseBuffer || context.state !== 'running') return;

    const now = context.currentTime;
    const noise = context.createBufferSource();
    noise.buffer = noiseBuffer;
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(190, now);
    lowpass.frequency.exponentialRampToValueAtTime(80, now + 2.8);
    const noiseGain = context.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.24, now + 0.035);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);
    noise.connect(lowpass).connect(noiseGain).connect(master);
    noise.start(now, Math.random() * 1.2, 3.25);

    const rumble = context.createOscillator();
    rumble.type = 'sine';
    rumble.frequency.setValueAtTime(46, now);
    rumble.frequency.exponentialRampToValueAtTime(29, now + 2.2);
    const rumbleGain = context.createGain();
    rumbleGain.gain.setValueAtTime(0.001, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.13, now + 0.06);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 2.7);
    rumble.connect(rumbleGain).connect(master);
    rumble.start(now);
    rumble.stop(now + 2.75);
  }

  update(dt: number, state: AudioFrameState): void {
    const context = this.context;
    if (!context || context.state !== 'running') return;

    const now = context.currentTime;
    this.setListenerPosition(context.listener, state.playerPosition, now);
    this.setPannerPosition(this.motorPanner, state.soykaPosition, now);

    this.setGainTarget(this.rainGain, 0.17, now, 0.35);
    this.setGainTarget(this.windGain, 0.055, now, 0.7);
    this.setGainTarget(this.waterGain, 0.038, now, 1.1);

    const poweredSystems = Number(state.bridgePowered)
      + Number(state.warehousePowered)
      + Number(state.portLightsPowered)
      + Number(state.pumpsPowered);
    this.setGainTarget(this.humGain, poweredSystems * 0.008, now, 0.3);

    const warehouseDistance = this.planarDistance(state.playerPosition, 8, -7.25);
    const warehouseProximity = THREE.MathUtils.clamp(1 - warehouseDistance / 18, 0, 1);
    this.setGainTarget(
      this.radioGain,
      state.warehousePowered ? warehouseProximity * 0.075 : 0,
      now,
      0.22,
    );
    this.setGainTarget(this.motorGain, 0.045, now, 0.15);

    if (state.moving) {
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        this.playFootstep();
        this.footstepTimer = 0.42 + Math.random() * 0.08;
      }
    } else {
      this.footstepTimer = Math.min(this.footstepTimer, 0.08);
    }

    const bridgeDistance = this.planarDistance(state.playerPosition, 0, -31.5);
    if (state.bridgeStarted && bridgeDistance < 20) {
      this.creakTimer -= dt;
      if (this.creakTimer <= 0) {
        this.playMetalCreak();
        this.creakTimer = 5.5 + Math.random() * 8;
      }
    }
  }

  private buildGraph(context: AudioContext): void {
    this.master = context.createGain();
    this.master.gain.value = 0;
    this.master.connect(context.destination);
    this.noiseBuffer = this.createNoiseBuffer(context, 5);

    this.rainGain = this.createNoiseLoop(context, 'highpass', 1250, 0.8);
    this.windGain = this.createNoiseLoop(context, 'bandpass', 340, 0.65);
    this.waterGain = this.createNoiseLoop(context, 'lowpass', 520, 0.7);

    this.humGain = context.createGain();
    this.humGain.gain.value = 0;
    this.humGain.connect(this.master);
    const humFundamental = context.createOscillator();
    humFundamental.type = 'sine';
    humFundamental.frequency.value = 52;
    const humHarmonic = context.createOscillator();
    humHarmonic.type = 'sine';
    humHarmonic.frequency.value = 104;
    const harmonicGain = context.createGain();
    harmonicGain.gain.value = 0.38;
    humFundamental.connect(this.humGain);
    humHarmonic.connect(harmonicGain).connect(this.humGain);
    humFundamental.start();
    humHarmonic.start();

    this.radioPanner = this.createPanner(context, new THREE.Vector3(8, 1.4, -7.25), 3, 24, 1.5);
    this.radioGain = context.createGain();
    this.radioGain.gain.value = 0;
    this.radioGain.connect(this.master);
    const radioSource = context.createBufferSource();
    radioSource.buffer = this.noiseBuffer;
    radioSource.loop = true;
    const radioFilter = context.createBiquadFilter();
    radioFilter.type = 'bandpass';
    radioFilter.frequency.value = 1900;
    radioFilter.Q.value = 0.9;
    radioSource.connect(radioFilter).connect(this.radioPanner).connect(this.radioGain);
    radioSource.start();

    this.motorPanner = this.createPanner(context, new THREE.Vector3(), 1.1, 13, 1.8);
    this.motorGain = context.createGain();
    this.motorGain.gain.value = 0;
    this.motorGain.connect(this.master);
    const motorLow = context.createOscillator();
    motorLow.type = 'sawtooth';
    motorLow.frequency.value = 86;
    const motorHigh = context.createOscillator();
    motorHigh.type = 'triangle';
    motorHigh.frequency.value = 174;
    const motorHighGain = context.createGain();
    motorHighGain.gain.value = 0.28;
    motorLow.connect(this.motorPanner);
    motorHigh.connect(motorHighGain).connect(this.motorPanner);
    this.motorPanner.connect(this.motorGain);
    motorLow.start();
    motorHigh.start();
  }

  private createNoiseLoop(
    context: AudioContext,
    filterType: BiquadFilterType,
    frequency: number,
    q: number,
  ): GainNode {
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = context.createGain();
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(this.master!);
    source.start();
    return gain;
  }

  private playFootstep(): void {
    const context = this.context;
    const master = this.master;
    const noiseBuffer = this.noiseBuffer;
    if (!context || !master || !noiseBuffer) return;

    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 520 + Math.random() * 180;
    filter.Q.value = 0.8;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    source.connect(filter).connect(gain).connect(master);
    source.start(now, Math.random() * 3.8, 0.13);
  }

  private playMetalCreak(): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(128 + Math.random() * 22, now);
    oscillator.frequency.exponentialRampToValueAtTime(54 + Math.random() * 12, now + 1.1);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 650;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.018, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
    oscillator.connect(filter).connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + 1.3);
  }

  private createNoiseBuffer(context: AudioContext, seconds: number): AudioBuffer {
    const frameCount = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.985 + white * 0.15;
      data[i] = previous * 0.72 + white * 0.28;
    }
    return buffer;
  }

  private createPanner(
    context: AudioContext,
    position: THREE.Vector3,
    refDistance: number,
    maxDistance: number,
    rolloff: number,
  ): PannerNode {
    const panner = context.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = refDistance;
    panner.maxDistance = maxDistance;
    panner.rolloffFactor = rolloff;
    this.setPannerPosition(panner, position, context.currentTime);
    return panner;
  }

  private setPannerPosition(panner: PannerNode | null, position: THREE.Vector3, now: number): void {
    if (!panner) return;
    panner.positionX.setValueAtTime(position.x, now);
    panner.positionY.setValueAtTime(position.y, now);
    panner.positionZ.setValueAtTime(position.z, now);
  }

  private setListenerPosition(listener: AudioListener, position: THREE.Vector3, now: number): void {
    listener.positionX.setValueAtTime(position.x, now);
    listener.positionY.setValueAtTime(position.y + 1.45, now);
    listener.positionZ.setValueAtTime(position.z, now);
  }

  private setGainTarget(gain: GainNode | null, value: number, now: number, timeConstant: number): void {
    if (!gain) return;
    gain.gain.setTargetAtTime(value, now, Math.max(0.01, timeConstant));
  }

  private applyMasterLevel(timeConstant: number): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || this.fadingOut) return;
    const target = this.paused ? 0.018 : this.volume * 0.58;
    master.gain.setTargetAtTime(target, context.currentTime, timeConstant);
  }

  private planarDistance(position: THREE.Vector3, x: number, z: number): number {
    return Math.hypot(position.x - x, position.z - z);
  }
}
