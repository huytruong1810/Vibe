import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AudioDirector,
  resolveSurfaceMaterial,
  type SurfaceMaterial,
} from '../src/presentation/audio';

class MockAudioParam {
  value = 0;
  setValueAtTime = vi.fn((val: number, _time: number) => {
    this.value = val;
  });
  setTargetAtTime = vi.fn((val: number, _time: number, _constant: number) => {
    this.value = val;
  });
  exponentialRampToValueAtTime = vi.fn((val: number, _time: number) => {
    this.value = val;
  });
  linearRampToValueAtTime = vi.fn((val: number, _time: number) => {
    this.value = val;
  });
}

class MockGainNode {
  gain = new MockAudioParam();
  connect = vi.fn();
}

class MockOscillatorNode {
  type: OscillatorType = 'sine';
  frequency = new MockAudioParam();
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioBufferSourceNode {
  buffer: any = null;
  loop = false;
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockBiquadFilterNode {
  type: BiquadFilterType = 'lowpass';
  frequency = new MockAudioParam();
  Q = new MockAudioParam();
  connect = vi.fn();
}

class MockAudioContext {
  currentTime = 10.0;
  sampleRate = 44100;
  destination = {};
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);

  createGain() {
    return new MockGainNode();
  }
  createOscillator() {
    return new MockOscillatorNode();
  }
  createBuffer(_channels: number, length: number, _sampleRate: number) {
    return {
      getChannelData: () => new Float32Array(length),
    };
  }
  createBufferSource() {
    return new MockAudioBufferSourceNode();
  }
  createBiquadFilter() {
    return new MockBiquadFilterNode();
  }
}

describe('AMB-M5 Surface-Material Footsteps & Biome Ambience Beds', () => {
  beforeEach(() => {
    (globalThis as any).AudioContext = MockAudioContext;
  });

  it('resolves surface material accurately from fluid, surface, and biome flags', () => {
    // Water
    expect(resolveSurfaceMaterial({ fluid: 1 })).toBe('water');
    expect(resolveSurfaceMaterial({ fluid: 2 })).toBe('water');

    // Boardwalk / Wood
    expect(resolveSurfaceMaterial({ surface: 'boardwalk' })).toBe('boardwalk');
    expect(resolveSurfaceMaterial({ surface: 'wood' })).toBe('boardwalk');

    // Stone
    expect(resolveSurfaceMaterial({ surface: 'stone' })).toBe('stone');

    // Mud
    expect(resolveSurfaceMaterial({ fluid: 3 })).toBe('mud');

    // Sand
    expect(resolveSurfaceMaterial({ biome: 0 })).toBe('sand');
    expect(resolveSurfaceMaterial({ surface: 'sand' })).toBe('sand');

    // Dirt
    expect(resolveSurfaceMaterial({ surface: 'dirt' })).toBe('dirt');
    expect(resolveSurfaceMaterial({ surface: 'path' })).toBe('dirt');

    // Fallback grass
    expect(resolveSurfaceMaterial({})).toBe('grass');
  });

  it('synthesizes procedural footsteps and throttles by step cadence', async () => {
    const audio = new AudioDirector();
    expect(audio.footstep('grass')).toBe(false); // Muted by default

    await audio.toggle(); // Unmute
    expect(audio.muted).toBe(false);

    // First footstep succeeds
    const stepped = audio.footstep('grass', 'player');
    expect(stepped).toBe(true);

    // Immediate second footstep is throttled
    const immediateRepeat = audio.footstep('grass', 'player');
    expect(immediateRepeat).toBe(false);

    // Independent actors do not throttle each other
    const companionStepped = audio.footstep('stone', 'companion');
    expect(companionStepped).toBe(true);
  });

  it('supports distinct procedural footstep synthesis for all surface materials', async () => {
    const audio = new AudioDirector();
    await audio.toggle();

    const materials: SurfaceMaterial[] = [
      'boardwalk',
      'grass',
      'stone',
      'water',
      'mud',
      'sand',
      'dirt',
    ];

    for (let i = 0; i < materials.length; i++) {
      const mat = materials[i]!;
      const played = audio.footstep(mat, `actor-${i}`);
      expect(played, `Footstep failed for material: ${mat}`).toBe(true);
    }
  });

  it('updates continuous biome ambience bed with diurnal phase and weather shifts', async () => {
    const audio = new AudioDirector();
    await audio.toggle();

    audio.ambience(0, 'aqualia', 'day', 'clear');
    expect(audio.getAmbienceState()).toMatchObject({
      season: 0,
      biome: 'aqualia',
      phase: 'day',
      weather: 'clear',
    });

    // Night phase shifts filter cutoff downward (nocturnal hush)
    audio.ambience(0, 'aqualia', 'night', 'clear');
    expect(audio.getAmbienceState().phase).toBe('night');

    // Weather change to rain adapts bed
    audio.ambience(0, 'aqualia', 'night', 'rain');
    expect(audio.getAmbienceState().weather).toBe('rain');
  });
});
