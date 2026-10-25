/**
 * HandJam deck: runs on the audio thread.
 *
 * song buffer --varispeed read--> two-head grain pitch shifter --> output
 *
 * Speed is a varispeed read (the read head moves `speed` samples per output sample), which
 * also shifts pitch, so the grain shifter compensates with ratio = 2^(semitones/12) / speed.
 * Pitch and speed stay independent, and latency is only ~half a grain (~35 ms).
 */
const GRAIN = 3072;
const SIZE = 32768;

class DeckProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.left = new Float32Array(1);
    this.right = new Float32Array(1);
    this.n = 1;
    this.pos = 0;
    this.playing = false;
    this.speed = 1;
    this.semitones = 0;
    this.bufL = new Float32Array(SIZE);
    this.bufR = new Float32Array(SIZE);
    this.write = 0;
    this.phase = 0;
    this.blocks = 0;
    this.wrapped = false;
    this.port.onmessage = (e) => {
      const m = e.data;
      if (m.type === "load") {
        this.left = m.left;
        this.right = m.right;
        this.n = m.left.length;
        this.pos = 0;
      } else if (m.type === "params") {
        if (m.speed !== undefined) this.speed = m.speed;
        if (m.semitones !== undefined) this.semitones = m.semitones;
        if (m.playing !== undefined) this.playing = m.playing;
      } else if (m.type === "seek") {
        this.pos = m.pos;
      }
    };
  }

  process(_inputs, outputs) {
    const out = outputs[0];
    const L = out[0];
    const R = out[1] || out[0];
    const frames = L.length;
    if (!this.playing) {
      L.fill(0);
      if (R !== L) R.fill(0);
      return true;
    }
    const speed = this.speed;
    const ratio = Math.pow(2, this.semitones / 12) / speed;
    const step = (1 - ratio) / GRAIN;
    const n = this.n;
    const bl = this.bufL;
    const br = this.bufR;
    for (let i = 0; i < frames; i++) {
      // varispeed read with linear interpolation; the song loops
      const i0 = Math.floor(this.pos);
      const f = this.pos - i0;
      const j0 = i0 % n;
      const j1 = (i0 + 1) % n;
      bl[this.write] = this.left[j0] + (this.left[j1] - this.left[j0]) * f;
      br[this.write] = this.right[j0] + (this.right[j1] - this.right[j0]) * f;
      this.pos += speed;
      if (this.pos >= n) {
        this.pos -= n;
        this.wrapped = true;
      }

      // two read heads half a grain apart, Hann-windowed so they always sum to 1
      this.phase += step;
      this.phase -= Math.floor(this.phase);
      let l = 0;
      let r = 0;
      for (let h = 0; h < 2; h++) {
        let ph = this.phase + h * 0.5;
        ph -= Math.floor(ph);
        let rp = this.write - (ph * GRAIN + 1);
        if (rp < 0) rp += SIZE;
        const k0 = Math.floor(rp);
        const fr = rp - k0;
        const k1 = (k0 + 1) % SIZE;
        const s = Math.sin(Math.PI * ph);
        const w = s * s;
        l += (bl[k0] + (bl[k1] - bl[k0]) * fr) * w;
        r += (br[k0] + (br[k1] - br[k0]) * fr) * w;
      }
      L[i] = l;
      if (R !== L) R[i] = r;
      this.write = (this.write + 1) % SIZE;
    }
    if (this.wrapped) {
      this.wrapped = false;
      this.port.postMessage({ ended: true });
    }
    if ((this.blocks++ & 7) === 0) this.port.postMessage({ pos: this.pos });
    return true;
  }
}

registerProcessor("deck", DeckProcessor);
