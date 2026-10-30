import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine } from '../audio/AudioEngine';

class FakeTrack extends EventTarget {
  enabled = true;
  stop = vi.fn();
  constructor(public kind: string) {
    super();
  }
}
class FakeStream {
  constructor(private tracks: FakeTrack[]) {}
  getTracks() {
    return this.tracks;
  }
  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === 'audio');
  }
  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === 'video');
  }
}
afterEach(() => vi.unstubAllGlobals());
describe('live capture lifecycle', () => {
  it('rejects video-only sharing and releases every acquired track', async () => {
    const track = new FakeTrack('video'),
      engine = new AudioEngine();
    await expect(
      engine.connectLive(new FakeStream([track]) as unknown as MediaStream, () => {}),
    ).rejects.toThrow('No audio was shared');
    expect(track.stop).toHaveBeenCalledOnce();
    expect(engine.isLive).toBe(false);
  });
  it('routes live audio only to analysis and stops the whole stream when sharing ends', async () => {
    const liveConnect = vi.fn(),
      liveDisconnect = vi.fn(),
      fileConnect = vi.fn();
    const analyser = {
      fftSize: 2048,
      smoothingTimeConstant: 0,
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    class Context {
      state = 'running';
      sampleRate = 48000;
      destination = { speaker: true };
      createMediaElementSource = () => ({ connect: fileConnect, disconnect: vi.fn() });
      createAnalyser = () => analyser;
      createMediaStreamSource = () => ({ connect: liveConnect, disconnect: liveDisconnect });
      close = vi.fn();
    }
    vi.stubGlobal('AudioContext', Context);
    vi.stubGlobal('MediaStream', FakeStream);
    const audio = new FakeTrack('audio'),
      video = new FakeTrack('video'),
      ended = vi.fn(),
      engine = new AudioEngine();
    await engine.connectLive(new FakeStream([audio, video]) as unknown as MediaStream, ended);
    expect(engine.isLive).toBe(true);
    expect(liveConnect).toHaveBeenCalledExactlyOnceWith(analyser);
    expect(video.enabled).toBe(false);
    expect(analyser.connect).not.toHaveBeenCalled();
    video.dispatchEvent(new Event('ended'));
    expect(audio.stop).toHaveBeenCalledOnce();
    expect(video.stop).toHaveBeenCalledOnce();
    expect(liveDisconnect).toHaveBeenCalledOnce();
    expect(ended).toHaveBeenCalledOnce();
    expect(engine.isLive).toBe(false);
    engine.dispose();
  });
});
