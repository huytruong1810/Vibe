import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AudioDirector,
  VILLAGER_VOICES,
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

describe('AGT-M1 / AGT-M4 Villager Voice Blips & Dialogue Ducking', () => {
  beforeEach(() => {
    (globalThis as any).AudioContext = MockAudioContext;
  });

  it('defines authored voice blip profiles for all 10 Aqualia villagers per Proposal 002-r2', () => {
    const requiredVillagers = [
      'caelum',
      'marina',
      'neris',
      'reed',
      'willa',
      'oren',
      'mira',
      'lark',
      'dara',
      'finn',
    ];

    for (const id of requiredVillagers) {
      const voice = VILLAGER_VOICES[id];
      expect(voice, `Missing voice for villager: ${id}`).toBeDefined();
      expect(voice!.baseFrequency).toBeGreaterThanOrEqual(100);
      expect(voice!.baseFrequency).toBeLessThanOrEqual(300);
      expect(['triangle', 'sine', 'sawtooth', 'square']).toContain(voice!.waveform);
      expect(voice!.cadenceMs).toBeGreaterThanOrEqual(80);
      expect(voice!.cadenceMs).toBeLessThanOrEqual(160);
      expect(voice!.attackMs).toBeGreaterThan(0);
      expect(voice!.decayMs).toBeGreaterThan(0);
    }

    // Specific Proposal 002-r2 targets
    expect(VILLAGER_VOICES['caelum']!.baseFrequency).toBe(125);
    expect(VILLAGER_VOICES['caelum']!.waveform).toBe('triangle');
    expect(VILLAGER_VOICES['caelum']!.cadenceMs).toBe(135);

    expect(VILLAGER_VOICES['marina']!.baseFrequency).toBe(260);
    expect(VILLAGER_VOICES['marina']!.waveform).toBe('sine');
    expect(VILLAGER_VOICES['marina']!.cadenceMs).toBe(95);

    expect(VILLAGER_VOICES['oren']!.baseFrequency).toBe(110);
    expect(VILLAGER_VOICES['oren']!.waveform).toBe('triangle');

    expect(VILLAGER_VOICES['mira']!.baseFrequency).toBe(240);
    expect(VILLAGER_VOICES['mira']!.waveform).toBe('triangle');
  });

  it('provides fallback profile for unknown or default characters', () => {
    const director = new AudioDirector();
    const fallback = director.getVillagerVoice('unknown_traveler');
    expect(fallback).toBeDefined();
    expect(fallback.baseFrequency).toBeGreaterThan(0);
    expect(fallback.cadenceMs).toBeGreaterThan(0);
  });

  it('plays dialogue blip matching authored villager parameters and throttles by cadence', async () => {
    const director = new AudioDirector();
    await director.toggle(); // unmute

    // Mock performance.now
    const perfSpy = vi.spyOn(performance, 'now');
    perfSpy.mockReturnValue(1000);

    const blip1 = director.dialogueBlip('caelum');
    expect(blip1).toBe(true);

    // Immediate second blip within cadence (135ms for caelum) should be throttled
    perfSpy.mockReturnValue(1050); // only +50ms
    const blip2 = director.dialogueBlip('caelum');
    expect(blip2).toBe(false);

    // Blip after cadence elapsed (1000 + 140ms > 135ms) should succeed
    perfSpy.mockReturnValue(1150);
    const blip3 = director.dialogueBlip('caelum');
    expect(blip3).toBe(true);
  });

  it('ducks background audio during active conversation dialogue and restores upon exit', async () => {
    const director = new AudioDirector();
    await director.toggle(); // unmute

    director.ambience(1); // summer ambience
    expect(director.isDucked()).toBe(false);

    director.setDialogueDucking(true);
    expect(director.isDucked()).toBe(true);

    director.setDialogueDucking(false);
    expect(director.isDucked()).toBe(false);
  });
});
