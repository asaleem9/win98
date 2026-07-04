import { playUhOh } from '../uhoh';

describe('playUhOh', () => {
  afterEach(() => {
    // Remove any AudioContext we planted so other tests see plain jsdom.
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    vi.resetModules();
  });

  it('is a safe no-op when the Web Audio API is unavailable', () => {
    // jsdom provides no AudioContext, so the synth should simply do nothing.
    expect(() => playUhOh()).not.toThrow();
  });

  it('synthesises exactly two notes when audio is available', async () => {
    const createOscillator = vi.fn(() => ({
      type: '',
      frequency: { setValueAtTime: () => {} },
      connect: () => gainNode,
      start: () => {},
      stop: () => {},
    }));
    const gainNode = {
      gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: () => ({}),
    };
    const createGain = vi.fn(() => gainNode);

    class MockAudioContext {
      state = 'running';
      currentTime = 0;
      destination = {};
      createOscillator = createOscillator;
      createGain = createGain;
    }

    Object.defineProperty(window, 'AudioContext', {
      value: MockAudioContext,
      configurable: true,
      writable: true,
    });

    // Fresh module so the internal AudioContext cache picks up our mock.
    vi.resetModules();
    const { playUhOh: freshPlay } = await import('../uhoh');
    freshPlay();

    // Two oscillators — the "uh" and the "oh".
    expect(createOscillator).toHaveBeenCalledTimes(2);
  });
});
