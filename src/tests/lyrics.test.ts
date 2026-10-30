import { describe, it, expect } from 'vitest';
import { parseLRC, lyricIndexAt } from '../audio/Lyrics';
describe('optional local lyrics', () => {
  it('keeps Tamil and English text in original script and sorts timestamps', () => {
    const lines = parseLRC(
      '[ar:Local song]\n[00:12.50]உன் இசையில் வானம் மலர்கிறது\n[00:02.5]A star is shining',
    );
    expect(lines).toEqual([
      { time: 2.5, text: 'A star is shining' },
      { time: 12.5, text: 'உன் இசையில் வானம் மலர்கிறது' },
    ]);
  });
  it('handles repeated timestamps, millisecond fractions and file offsets', () => {
    expect(parseLRC('[offset:-500]\n[00:01.250][00:03.00]One line\n[00:03.00]ஒரு வரி')).toEqual([
      { time: 0.75, text: 'One line' },
      { time: 2.5, text: 'One line\nஒரு வரி' },
    ]);
  });
  it('follows seek positions without inventing lines before the first timestamp', () => {
    const lines = parseLRC('[00:02]First\n[00:08]Second');
    expect(lyricIndexAt(lines, 0)).toBe(-1);
    expect(lyricIndexAt(lines, 2)).toBe(0);
    expect(lyricIndexAt(lines, 9)).toBe(1);
    expect(lyricIndexAt(lines, 3)).toBe(0);
  });
  it('rejects untimed and invalid timestamps and preserves markup as plain text', () => {
    expect(parseLRC('untimed lyrics\n[00:99]invalid')).toEqual([]);
    expect(parseLRC('[00:00]<img onerror=alert(1)>')[0].text).toBe('<img onerror=alert(1)>');
  });
});
