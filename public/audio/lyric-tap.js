/* Captures only the already-selected app input. Output remains silent. */
class LyricTap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(96000); // Six-second rolling context, 16 kHz mono.
    this.used = 0;
    this.phase = 0;
    this.sum = 0;
    this.samples = 0;
    this.revision = 0;
    this.quiet = 0;
    this.fresh = 0;
    this.first = true;
    this.progress = 0;
    this.meterSum = 0;
    this.port.onmessage = (event) => {
      this.used = 0;
      this.phase = 0;
      this.sum = 0;
      this.samples = 0;
      this.quiet = 0;
      this.fresh = 0;
      this.first = true;
      this.progress = 0;
      this.meterSum = 0;
      this.revision = event.data;
    };
  }
  emit() {
    const audio = this.buffer.slice(0, this.used);
    this.port.postMessage({ type: 'audio', audio, revision: this.revision }, [audio.buffer]);
    const keep = Math.min(this.first ? 32000 : 48000, this.used);
    this.buffer.copyWithin(0, this.used - keep, this.used);
    this.used = keep;
    this.fresh = 0;
    this.first = false;
  }
  process(inputs) {
    const channels = inputs[0];
    if (!channels?.length) return true;
    for (let i = 0; i < channels[0].length; i++) {
      let mono = 0;
      for (let c = 0; c < channels.length; c++) mono += channels[c][i];
      this.sum += mono / channels.length;
      this.samples++;
      this.phase += 16000;
      if (this.phase >= sampleRate) {
        this.phase -= sampleRate;
        const value = this.sum / this.samples;
        this.buffer[this.used++] = value;
        this.fresh++;
        this.progress++;
        this.meterSum += value * value;
        if (this.progress >= 16000) {
          this.progress = 0;
          this.port.postMessage({
            type: 'buffer',
            seconds: this.used / 16000,
            revision: this.revision,
            rms: Math.sqrt(this.meterSum / 16000),
          });
          this.meterSum = 0;
        }
        this.quiet = Math.abs(value) < 0.004 ? this.quiet + 1 : 0;
        this.sum = 0;
        this.samples = 0;
        if (this.used === this.buffer.length || (this.first && this.used >= 64000)) {
          this.emit(); // First window at four seconds, then six-second windows with three-second overlap.
        } else if (this.quiet > 16000 && this.fresh > 32000) this.emit();
      }
    }
    return true;
  }
}
registerProcessor('lyric-tap', LyricTap);
