import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { Player, Playlist } from '../components/Player/Player';
import { usePlayer } from '../stores/player';
import { audioEngine } from '../audio/AudioEngine';
vi.mock('../audio/SongDNA', () => ({
  analyzeSong: vi.fn(async () => ({
    hash: 'abc123',
    seed: 42,
    version: 1,
    energy: 0,
    variation: 0,
    brightness: 0,
    tempo: null,
    analyzed: false,
    name: 'Test galaxy',
  })),
}));
beforeEach(() => {
  usePlayer.setState({
    tracks: [],
    index: -1,
    playing: false,
    current: 0,
    duration: 0,
    error: null,
    shuffle: false,
    repeat: 'off',
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe('player integration', () => {
  it('loads a local playlist, seeks, selects another track and revokes removed URLs', async () => {
    await usePlayer
      .getState()
      .addFiles([
        new File(['one'], 'first.wav', { type: 'audio/wav' }),
        new File(['two'], 'second.mp3', { type: 'audio/mpeg' }),
      ]);
    expect(usePlayer.getState().tracks).toHaveLength(2);
    render(<Player onUpload={() => {}} onPlaylist={() => {}} playlistOpen={false} />);
    expect(screen.getByText('first')).toBeInTheDocument();
    act(() => usePlayer.setState({ duration: 100 }));
    const seek = vi.spyOn(audioEngine, 'seek');
    fireEvent.change(screen.getByLabelText('Seek'), { target: { value: '20' } });
    expect(seek).toHaveBeenCalledWith(20);
    await usePlayer.getState().select(1, false);
    expect(usePlayer.getState().index).toBe(1);
    const id = usePlayer.getState().tracks[0].id;
    usePlayer.getState().remove(id);
    expect(URL.revokeObjectURL).toHaveBeenCalled();
    expect(usePlayer.getState().index).toBe(0);
  });
  it('reports invalid files without adding them', async () => {
    await usePlayer
      .getState()
      .addFiles([new File(['not audio'], 'bad.txt', { type: 'text/plain' })]);
    expect(usePlayer.getState().tracks).toHaveLength(0);
    expect(usePlayer.getState().error).toContain('not recognized audio');
  });
  it('toggles shuffle, repeat, mute and opens the upload callback', () => {
    const upload = vi.fn();
    render(<Player onUpload={upload} onPlaylist={() => {}} playlistOpen={false} />);
    fireEvent.click(screen.getByLabelText('Shuffle'));
    expect(usePlayer.getState().shuffle).toBe(true);
    fireEvent.click(screen.getByLabelText('Repeat: off'));
    expect(usePlayer.getState().repeat).toBe('all');
    fireEvent.click(screen.getByLabelText('Add audio files'));
    expect(upload).toHaveBeenCalledOnce();
  });
  it('renders removable playlist entries', async () => {
    await usePlayer.getState().addFiles([new File(['one'], 'first.wav', { type: 'audio/wav' })]);
    render(<Playlist onClose={() => {}} onUpload={() => {}} />);
    fireEvent.click(screen.getByLabelText('Remove first'));
    expect(usePlayer.getState().tracks).toHaveLength(0);
    expect(screen.getByText('Add a few songs and let your universe unfold.')).toBeInTheDocument();
  });
});
