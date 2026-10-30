export interface LyricLine {
  time: number;
  text: string;
}
/** LRC timestamps stay separate from text; no HTML from lyric files is ever rendered. */
export function parseLRC(source: string): LyricLine[] {
  let offset = 0;
  const lines: LyricLine[] = [];
  const offsetMatch = source.match(/\[offset:\s*(-?\d+)\]/i);
  if (offsetMatch) offset = Number(offsetMatch[1]) / 1000;
  for (const row of source.split(/\r?\n/)) {
    const stamps = [...row.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (!stamps.length) continue;
    const text = row.replace(/\[[^\]]*\]/g, '').trim();
    if (!text) continue;
    for (const stamp of stamps) {
      const seconds = Number(stamp[2]);
      if (seconds >= 60) continue;
      const fraction = stamp[3] ? Number(`0.${stamp[3]}`) : 0;
      lines.push({ time: Math.max(0, Number(stamp[1]) * 60 + seconds + fraction + offset), text });
    }
  }
  lines.sort((a, b) => a.time - b.time);
  const grouped: LyricLine[] = [];
  for (const line of lines) {
    const previous = grouped[grouped.length - 1];
    if (previous?.time === line.time) previous.text += '\n' + line.text;
    else grouped.push({ ...line });
  }
  return grouped;
}
export function lyricIndexAt(lines: LyricLine[], time: number): number {
  let low = 0,
    high = lines.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (lines[mid].time <= time) low = mid + 1;
    else high = mid;
  }
  return low - 1;
}
