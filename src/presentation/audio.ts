export interface VillagerVoiceConfig {
  readonly baseFrequency: number;
  readonly waveform: OscillatorType;
  readonly cadenceMs: number;
  readonly attackMs: number;
  readonly decayMs: number;
}

export type SurfaceMaterial =
  | 'boardwalk'
  | 'grass'
  | 'stone'
  | 'water'
  | 'mud'
  | 'sand'
  | 'dirt';

export interface SurfaceQuery {
  readonly fluid?: number;
  readonly surface?: string;
  readonly biome?: number;
  readonly flags?: number;
}

/**
 * Resolves physical surface material under an actor according to doctrine AMB-5.
 * Boardwalk/wood, grass, stone, and shallow water are primary audible surfaces.
 */
export function resolveSurfaceMaterial(query: SurfaceQuery): SurfaceMaterial {
  // Fluid check: 1 = Freshwater, 2 = Saltwater (shallow wading)
  if (query.fluid === 1 || query.fluid === 2) {
    return 'water';
  }
  // Surface names from authored levels or props
  if (query.surface === 'boardwalk' || query.surface === 'wood') {
    return 'boardwalk';
  }
  if (query.surface === 'stone') {
    return 'stone';
  }
  if (query.fluid === 3) {
    // 3 = Mud
    return 'mud';
  }
  // Biome: 0 = Beach (or explicit surface sand)
  if (query.biome === 0 || query.surface === 'sand') {
    return 'sand';
  }
  if (query.surface === 'dirt' || query.surface === 'path') {
    return 'dirt';
  }
  return 'grass';
}

export function resolveSnapshotSurface(
  snapshot: {
    surface?: Uint8Array;
    surfaceNames?: readonly string[];
    terrain?: { fluid?: Uint8Array; biome?: Uint8Array; size?: number };
    width?: number;
  },
  tileX: number,
  tileY: number,
): SurfaceMaterial {
  const width = snapshot.terrain?.size ?? snapshot.width ?? 128;
  const index = Math.max(0, Math.floor(tileY) * width + Math.floor(tileX));
  const fluid = snapshot.terrain?.fluid?.[index];
  const biome = snapshot.terrain?.biome?.[index];
  const surfaceIdx = snapshot.surface?.[index];
  const surface = surfaceIdx !== undefined ? snapshot.surfaceNames?.[surfaceIdx] : undefined;
  return resolveSurfaceMaterial({ fluid, surface, biome });
}

export interface AmbienceAudioState {
  readonly season: number;
  readonly biome: string;
  readonly phase: string;
  readonly weather: string;
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
  private ambienceFilter: BiquadFilterNode | null = null;
  private dialogueDucked = false;
  private currentSeason = 0;
  private readonly lastBlipAt = new Map<string, number>();
  private readonly lastStepAt = new Map<string, number>();
  private ambienceState: AmbienceAudioState = {
    season: 0,
    biome: 'aqualia',
    phase: 'day',
    weather: 'clear',
  };
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
      this.ambienceFilter = lowpass;
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

  /**
   * Synthesizes procedural footsteps matched to the underlying surface material (AMB-5, AUD-6).
   * Cadence throttling enforces a realistic minimum step interval per actor.
   */
  footstep(material: SurfaceMaterial, actorId = 'player'): boolean {
    if (!this.context || !this.master || this.muted) return false;
    const nowMs = performance.now();
    const last = this.lastStepAt.get(actorId) ?? 0;
    if (nowMs - last < 160) return false; // Minimum 160ms between steps per actor
    this.lastStepAt.set(actorId, nowMs);

    const now = this.context.currentTime;
    const envelope = this.context.createGain();

    switch (material) {
      case 'boardwalk': {
        // Resonant wood thud: low triangle frequency drop + fast decay
        const osc = this.context.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.07);
        envelope.gain.setValueAtTime(0.001, now);
        envelope.gain.linearRampToValueAtTime(0.16, now + 0.005);
        envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(envelope);
        envelope.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.075);
        break;
      }
      case 'grass': {
        // Soft rustle: high filtered noise brush
        const osc = this.context.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.045);
        envelope.gain.setValueAtTime(0.001, now);
        envelope.gain.linearRampToValueAtTime(0.09, now + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        osc.connect(envelope);
        envelope.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }
      case 'stone': {
        // Crisp high click/tap
        const osc = this.context.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.035);
        envelope.gain.setValueAtTime(0.001, now);
        envelope.gain.linearRampToValueAtTime(0.16, now + 0.002);
        envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.connect(envelope);
        envelope.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }
      case 'water': {
        // Wet splash / slosh
        const osc = this.context.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(360, now + 0.03);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
        envelope.gain.setValueAtTime(0.001, now);
        envelope.gain.linearRampToValueAtTime(0.14, now + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(envelope);
        envelope.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.085);
        break;
      }
      case 'mud': {
        // Suction pop
        const osc = this.context.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.055);
        envelope.gain.setValueAtTime(0.001, now);
        envelope.gain.linearRampToValueAtTime(0.13, now + 0.006);
        envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
        osc.connect(envelope);
        envelope.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }
      case 'sand': {
        // Grainy scuff
        const osc = this.context.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);
        envelope.gain.setValueAtTime(0.001, now);
        envelope.gain.linearRampToValueAtTime(0.08, now + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(envelope);
        envelope.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.055);
        break;
      }
      case 'dirt':
      default: {
        // Damped dirt thud
        const osc = this.context.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(135, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.045);
        envelope.gain.setValueAtTime(0.001, now);
        envelope.gain.linearRampToValueAtTime(0.12, now + 0.005);
        envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        osc.connect(envelope);
        envelope.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }
    }
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

  /**
   * Updates continuous diurnal and biome ambience bed per doctrine AMB-5.
   */
  ambience(
    season: number,
    biome = 'aqualia',
    phase = 'day',
    weather = 'clear',
  ): void {
    this.currentSeason = season;
    this.ambienceState = { season, biome, phase, weather };

    if (this.ambienceFilter && this.context) {
      let targetFreq = 1050; // Day neutral
      if (phase === 'night') {
        targetFreq = 520; // Nocturnal hush
      } else if (phase === 'dusk' || phase === 'dawn') {
        targetFreq = 750; // Translucent twilight
      }

      if (weather === 'rain') {
        targetFreq += 400; // Rain hiss
      } else if (weather === 'storm') {
        targetFreq += 600; // Storm turbulence
      }

      this.ambienceFilter.frequency.setTargetAtTime(targetFreq, this.context.currentTime, 0.4);
    }

    this.updateMasterVolume();
  }

  getAmbienceState(): AmbienceAudioState {
    return { ...this.ambienceState };
  }

  private updateMasterVolume(): void {
    if (!this.master || !this.context) return;
    let base = this.currentSeason === 3 ? 0.07 : 0.1;
    if (this.ambienceState.weather === 'rain') {
      base *= 1.3;
    } else if (this.ambienceState.weather === 'storm') {
      base *= 1.6;
    }
    const target = this.muted ? 0 : this.dialogueDucked ? base * 0.4 : base;
    this.master.gain.setTargetAtTime(target, this.context.currentTime, 0.25);
  }

  dispose(): void {
    this.noise?.stop();
    void this.context?.close();
  }
}

