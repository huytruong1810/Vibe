import { describe, expect, it } from 'vitest';
import { SimulationHost } from '../src/domain/simulation';
import { hasAuthoredOverworldProps } from '../src/presentation/renderer';

describe('overworld prop rendering mode detection (AUD-01)', () => {
  it('correctly detects authored overworld props on the hand-composed map', () => {
    const dummyProps = [
      { id: 'visual:enter:cave:1' },
      { id: 'visual:enter:cave:2' },
    ];
    expect(hasAuthoredOverworldProps(dummyProps)).toBe(false);

    const authoredHost = new SimulationHost(42, 1, 8, 'test:auth');
    const authoredProps = authoredHost.frame().scene.props;
    expect(authoredProps.length).toBeGreaterThan(3);
    expect(hasAuthoredOverworldProps(authoredProps)).toBe(true);
    authoredHost.dispose();
  });
});
