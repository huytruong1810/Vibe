import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CompiledWorldSchema } from '../src/domain/authored-world';
import { SimulationHost } from '../src/domain/simulation';
import { hasAuthoredOverworldProps } from '../src/presentation/renderer';

describe('overworld prop rendering mode detection (AUD-01)', () => {
  it('treats procedural overworld cave-entrance visual props as non-authored so procedural buildings and landmarks render', () => {
    const proceduralHost = new SimulationHost(42, 1, 8, 'test:proc');
    const proceduralProps = proceduralHost.frame().scene.props;
    expect(proceduralProps.length).toBe(3);
    expect(proceduralProps.every((p) => p.id.startsWith('visual:enter:cave:'))).toBe(true);
    expect(hasAuthoredOverworldProps(proceduralProps)).toBe(false);
    proceduralHost.dispose();

    const compiledWorld = CompiledWorldSchema.parse(
      JSON.parse(readFileSync('public/assets/generated/aqualia-region.json', 'utf8')),
    );
    const authoredHost = new SimulationHost(42, 1, 8, 'test:auth', {
      worldSource: 'authored',
      compiledWorld,
    });
    const authoredProps = authoredHost.frame().scene.props;
    expect(authoredProps.length).toBeGreaterThan(3);
    expect(hasAuthoredOverworldProps(authoredProps)).toBe(true);
    authoredHost.dispose();
  });
});
