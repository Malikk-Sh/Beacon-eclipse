export interface DialogueVoice {
  startLine(speaker: string, text: string, duration: number): void;
  updateLine(dt: number): void;
  stopLine(): void;
}

export type SpeechBeat = { time: number; vowel: number; pitch: number; breath: boolean };
const VOWELS = 'аоуыэяёюиеaeiou';
const FORMANTS = [[760, 1200], [450, 850], [330, 650], [400, 1450], [550, 1800],
  [720, 1600], [450, 1000], [300, 1700], [300, 2250], [450, 1950]];

/** Speech-shaped rhythms, not spoken words. Punctuation leaves audible breathing spaces. */
export function speechBeats(speaker: string, text: string, duration: number): SpeechBeat[] {
  const pitch = speaker.includes('СОЙКА') ? 310 : speaker.includes('НИКА') ? 238
    : speaker.includes('МАРА') ? 182 : speaker.includes('ЛЕВ') ? 114 : 155;
  const tokens: { weight: number; vowel: number; seed: number }[] = [];
  let units = 0;
  for (const character of text.toLowerCase()) {
    const vowel = VOWELS.indexOf(character);
    if (vowel >= 0) { tokens.push({ weight: units, vowel: vowel % 10, seed: character.charCodeAt(0) }); units += 1; }
    else if (/[,.!?…:;]/.test(character)) units += 1.7;
    else if (character === ' ') units += 0.35;
  }
  if (!tokens.length || !Number.isFinite(duration) || duration < 0.18) return [];
  const limit = Math.max(1, Math.floor(duration * 6));
  const count = Math.min(tokens.length, limit);
  const beats: SpeechBeat[] = [];
  for (let i = 0; i < count; i++) {
    const token = tokens[Math.floor(i * tokens.length / count)];
    beats.push({ time: 0.04 + token.weight / Math.max(1, units) * Math.max(0.01, duration - 0.22),
      vowel: token.vowel, pitch: pitch * (0.96 + Math.sin(i * 1.8 + token.seed) * 0.055), breath: i % 3 < 1 });
  }
  return beats;
}

/** A short, filtered vocal carrier with separate formants and consonant breath. No speech service. */
export class VoiceImitation implements DialogueVoice {
  private beats: SpeechBeat[] = [];
  private elapsed = 0;
  private index = 0;
  private carrier: OscillatorNode | null = null;
  private noise: AudioBufferSourceNode | null = null;
  private envelope: GainNode | null = null;
  private breath: GainNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private nodes: AudioNode[] = [];

  constructor(private readonly context: AudioContext, private readonly destination: AudioNode,
    private readonly noiseBuffer: AudioBuffer) {}

  startLine(speaker: string, text: string, duration: number): void {
    this.stopLine();
    this.beats = speechBeats(speaker, text, duration);
    this.elapsed = 0;
    this.index = 0;
    if (!this.beats.length) return;
    const context = this.context;
    this.carrier = context.createOscillator();
    this.carrier.type = speaker.includes('СОЙКА') ? 'triangle' : 'sawtooth';
    this.envelope = context.createGain();
    this.envelope.gain.value = 0;
    this.envelope.connect(this.destination);
    this.filters = [0, 1, 2].map((index) => {
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = index === 2 ? 2 : 4;
      filter.frequency.value = index === 2 ? 2700 : FORMANTS[0][index];
      const gain = context.createGain();
      gain.gain.value = [0.9, 0.55, 0.13][index];
      this.carrier!.connect(filter).connect(gain).connect(this.envelope!);
      this.nodes.push(filter, gain);
      return filter;
    });
    this.noise = context.createBufferSource();
    this.noise.buffer = this.noiseBuffer;
    this.noise.loop = true;
    const consonants = context.createBiquadFilter();
    consonants.type = 'bandpass';
    consonants.frequency.value = 2350;
    consonants.Q.value = 0.8;
    this.breath = context.createGain();
    this.breath.gain.value = 0;
    this.noise.connect(consonants).connect(this.breath).connect(this.destination);
    this.nodes.push(consonants, this.breath, this.envelope);
    this.carrier.start();
    this.noise.start();
  }

  updateLine(dt: number): void {
    if (!this.carrier || !this.envelope || !this.breath) return;
    this.elapsed += dt;
    if (this.index >= this.beats.length || this.beats[this.index].time > this.elapsed) return;
    const beat = this.beats[this.index++];
    const now = this.context.currentTime;
    this.carrier.frequency.setTargetAtTime(beat.pitch, now, 0.018);
    this.filters[0].frequency.setTargetAtTime(FORMANTS[beat.vowel][0], now, 0.012);
    this.filters[1].frequency.setTargetAtTime(FORMANTS[beat.vowel][1], now, 0.012);
    const gain = this.envelope.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(0, now);
    gain.linearRampToValueAtTime(0.21, now + 0.023);
    gain.linearRampToValueAtTime(0.12, now + 0.067);
    gain.linearRampToValueAtTime(0, now + 0.13);
    const breath = this.breath.gain;
    breath.cancelScheduledValues(now);
    breath.setValueAtTime(beat.breath ? 0.09 : 0.018, now);
    breath.linearRampToValueAtTime(0, now + 0.055);
  }

  stopLine(): void {
    const now = this.context.currentTime;
    const nodes = this.nodes;
    const carrier = this.carrier;
    const noise = this.noise;
    for (const gain of [this.envelope?.gain, this.breath?.gain]) {
      gain?.cancelScheduledValues(now);
      gain?.setTargetAtTime(0, now, 0.006);
    }
    if (carrier) {
      carrier.onended = () => { carrier.disconnect(); noise?.disconnect(); nodes.forEach(node => node.disconnect()); };
      carrier.stop(now + 0.04);
      noise?.stop(now + 0.04);
    }
    this.carrier = null;
    this.noise = null;
    this.envelope = null;
    this.breath = null;
    this.nodes = [];
    this.filters = [];
    this.beats = [];
  }
}
