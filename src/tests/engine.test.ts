import { describe, it, expect, vi } from 'vitest';
import { AudioEngine } from '../audio/AudioEngine';
describe('managed audio graph', () => {
  it('creates a single source for repeated play/resume and disposes resources', async () => {
    const connect = vi.fn(),
      disconnect = vi.fn(),
      source = vi.fn(() => ({ connect, disconnect })),
      resume = vi.fn(async () => {}),
      close = vi.fn(async () => {});
    class FakeContext {
      state = 'suspended';
      sampleRate = 48000;
      destination = {};
      createMediaElementSource = source;
      createAnalyser = () => ({
        connect,
        disconnect,
        fftSize: 2048,
        smoothingTimeConstant: 0,
        getFloatFrequencyData: vi.fn(),
        getFloatTimeDomainData: vi.fn(),
      });
      resume = resume;
      close = close;
    }
    vi.stubGlobal('AudioContext', FakeContext);
    const engine = new AudioEngine();
    await engine.play();
    engine.pause();
    await engine.play();
    await engine.activate();
    expect(source).toHaveBeenCalledTimes(1);
    expect(resume).toHaveBeenCalledTimes(3);
    expect(connect).toHaveBeenCalledTimes(2);
    engine.dispose();
    expect(disconnect).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
