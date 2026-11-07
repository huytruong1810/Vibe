export interface VillagerVoiceConfig {
  readonly baseFrequency: number;
  readonly waveform: OscillatorType;
  readonly cadenceMs: number;
  readonly attackMs: number;
  readonly decayMs: number;
}

/**
 * Authored procedural syllable blip parameters for the 10 Aqualia villagers
 * conforming strictly to Proposal 002-r2 and doctrine AGT-4.2.
 */
export const VILLAGER_VOICES: Readonly<Record<string, VillagerVoiceConfig>> = {
  caelum: { baseFrequency: 125, waveform: 'triangle', cadenceMs: 135, attackMs: 15, decayMs: 95 },
  marina: { baseFrequency: 260, waveform: 'sine', cadenceMs: 95, attackMs: 5, decayMs: 60 },
  neris: { baseFrequency: 145, waveform: 'sawtooth', cadenceMs: 140, attackMs: 10, decayMs: 100 },
  reed: { baseFrequency: 180, waveform: 'square', cadenceMs: 110, attackMs: 8, decayMs: 75 },
  willa: { baseFrequency: 220, waveform: 'sine', cadenceMs: 125, attackMs: 20, decayMs: 80 },
  oren: { baseFrequency: 110, waveform: 'triangle', cadenceMs: 145, attackMs: 12, decayMs: 110 },
  mira: { baseFrequency: 240, waveform: 'triangle', cadenceMs: 100, attackMs: 6, decayMs: 65 },
  lark: { baseFrequency: 165, waveform: 'sine', cadenceMs: 130, attackMs: 25, decayMs: 100 },
  dara: { baseFrequency: 200, waveform: 'square', cadenceMs: 105, attackMs: 8, decayMs: 70 },
  finn: { baseFrequency: 175, waveform: 'triangle', cadenceMs: 115, attackMs: 10, decayMs: 80 },
};

export const DEFAULT_VILLAGER_VOICE: VillagerVoiceConfig = {
  baseFrequency: 180,
  waveform: 'triangle',
  cadenceMs: 120,
  attackMs: 10,
  decayMs: 80,
};

/** Browser audio is opt-in and can only start after a user gesture. */
export class AudioDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBufferSourceNode | null = null;
  private dialogueDucked = false;
  private currentSeason = 0;
  private readonly lastBlipAt = new Map<string, number>();
  muted = true;

  async toggle(): Promise<boolean> {
    this.muted = !this.muted;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.context.destination);
      const buffer = this.context.createBuffer(
          1,
          this.context.sampleRate * 2,
          this.context.sampleRate,
        ),
        data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = last * 0.97 + (Math.random() * 2 - 1) * 0.03;
        data[i] = last;
      }
      this.noise = this.context.createBufferSource();
      this.noise.buffer = buffer;
      this.noise.loop = true;
      const lowpass = this.context.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 900;
      this.noise.connect(lowpass);
      lowpass.connect(this.master);
      this.noise.start();
    }
    await this.context.resume();
    this.updateMasterVolume();
    return this.muted;
  }

  isDucked(): boolean {
    return this.dialogueDucked;
  }

  setDialogueDucking(active: boolean): void {
    if (this.dialogueDucked === active) return;
    this.dialogueDucked = active;
    this.updateMasterVolume();
  }

  getVillagerVoice(npcId: string): VillagerVoiceConfig {
    return VILLAGER_VOICES[npcId] ?? DEFAULT_VILLAGER_VOICE;
  }

  dialogueBlip(npcId: string): boolean {
    if (!this.context || !this.master || this.muted) return false;
    const voice = this.getVillagerVoice(npcId);
    const nowMs = performance.now();
    const last = this.lastBlipAt.get(npcId) ?? 0;
    if (nowMs - last < voice.cadenceMs) return false;
    this.lastBlipAt.set(npcId, nowMs);

    const oscillator = this.context.createOscillator(),
      envelope = this.context.createGain(),
      now = this.context.currentTime;

    oscillator.type = voice.waveform;
    const pitchVariation = 1.0 + (Math.random() - 0.5) * 0.04;
    oscillator.frequency.setValueAtTime(voice.baseFrequency * pitchVariation, now);

    const attackSec = voice.attackMs / 1000;
    const decaySec = voice.decayMs / 1000;
    const duration = attackSec + decaySec;

    envelope.gain.setValueAtTime(0.001, now);
    envelope.gain.linearRampToValueAtTime(0.12, now + attackSec);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
    return true;
  }

  cue(kind: 'gather' | 'craft' | 'care' | 'victory' | 'hit'): void {
    if (!this.context || !this.master || this.muted) return;
    const oscillator = this.context.createOscillator(),
      envelope = this.context.createGain(),
      now = this.context.currentTime;
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(
      { gather: 520, craft: 780, care: 660, victory: 880, hit: 190 }[kind],
      now,
    );
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'hit' ? 80 : 1000, now + 0.12);
    envelope.gain.setValueAtTime(0.2, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start();
    oscillator.stop(now + 0.18);
  }

  ambience(season: number): void {
    this.currentSeason = season;
    this.updateMasterVolume();
  }

  private updateMasterVolume(): void {
    if (!this.master || !this.context) return;
    const base = this.currentSeason === 3 ? 0.07 : 0.1;
    const target = this.muted ? 0 : this.dialogueDucked ? base * 0.4 : base;
    this.master.gain.setTargetAtTime(target, this.context.currentTime, 0.25);
  }

  dispose(): void {
    this.noise?.stop();
    void this.context?.close();
  }
}
