/** Browser audio is opt-in and can only start after a user gesture. */
export class AudioDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBufferSourceNode | null = null;
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
    this.master!.gain.setTargetAtTime(this.muted ? 0 : 0.1, this.context.currentTime, 0.2);
    return this.muted;
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
    if (this.master && this.context && !this.muted)
      this.master.gain.setTargetAtTime(season === 3 ? 0.07 : 0.1, this.context.currentTime, 1);
  }
  dispose(): void {
    this.noise?.stop();
    void this.context?.close();
  }
}
