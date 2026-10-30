export type Quality = 'low' | 'medium' | 'high';
export const TEXTURE_BUDGETS: Readonly<Record<Quality, number>> = {
  high: 512 * 1024 ** 2,
  medium: 256 * 1024 ** 2,
  low: 128 * 1024 ** 2,
};
/** Sustained measurements reduce optional effects before framebuffer resolution.
 * Coverage and CSS/UI dimensions remain fixed at every setting. */
export class QualitySettings {
  tier: Quality = 'medium';
  effects = 1;
  framebufferScale: 1 | 0.75 | number = 1;
  private slow = 0;
  private fast = 0;
  get textureBudget(): number {
    return TEXTURE_BUDGETS[this.tier];
  }
  configure(tier: Quality): void {
    this.tier = tier;
    this.effects = tier === 'low' ? 0 : 1;
    this.framebufferScale = 1;
    this.slow = this.fast = 0;
  }
  sample(frameMs: number): boolean {
    if (!Number.isFinite(frameMs) || frameMs <= 0 || frameMs > 250) return false;
    this.slow = frameMs > 24 ? this.slow + 1 : Math.max(0, this.slow - 1);
    this.fast = frameMs < 18 ? this.fast + 1 : 0;
    if (this.slow >= 180) {
      this.slow = 0;
      if (this.effects > 0) this.effects = Math.max(0, this.effects - 0.5);
      else if (this.framebufferScale === 1) this.framebufferScale = 0.75;
      else if (this.framebufferScale === 0.75) this.framebufferScale = 2 / 3;
      else return false;
      return true;
    }
    if (this.fast >= 900) {
      this.fast = 0;
      if (this.framebufferScale < 0.75) this.framebufferScale = 0.75;
      else if (this.framebufferScale < 1) this.framebufferScale = 1;
      else if (this.tier !== 'low' && this.effects < 1) this.effects += 0.5;
      else return false;
      return true;
    }
    return false;
  }
}
