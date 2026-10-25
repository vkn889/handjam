"use client";

import { decodeTrack, generatedTracks, recordPlay, saveUpload, type Track } from "./library";

export interface DeckValues {
  speed: number;
  semitones: number;
  volume: number;
  filter: number;
  reverb: number;
  echo: number;
  bass: number;
}

/**
 * The remix deck, all in the browser:
 *
 *   worklet (varispeed + pitch) → bass shelf → low-pass → dry / reverb / echo → volume → analyser → speakers
 *
 * Also a tiny player: a queue, previous / next, shuffle and repeat.
 */
export class Deck {
  ctx: AudioContext;
  private node: AudioWorkletNode | null = null;
  private shelf: BiquadFilterNode;
  private lowpass: BiquadFilterNode;
  private dry: GainNode;
  private wet: GainNode;
  private echoSend: GainNode;
  private echo: DelayNode;
  private master: GainNode;
  private analyser: AnalyserNode;
  private ready: Promise<void>;
  private scratch = new Float32Array(1024);
  private loadToken = 0;
  queue: Track[] = generatedTracks();
  current: Track | null = null;
  title = "";
  duration = 0;
  position = 0;
  playing = false;
  loading = false;
  shuffle = false;
  repeat = true;
  error = "";
  levels = new Array<number>(64).fill(0);
  onTrackChange?: (t: Track) => void;

  constructor() {
    const ctx = (this.ctx = new AudioContext({ latencyHint: "interactive" }));
    this.shelf = new BiquadFilterNode(ctx, { type: "lowshelf", frequency: 140, gain: 0 });
    this.lowpass = new BiquadFilterNode(ctx, { type: "lowpass", frequency: 20000, Q: 4 });
    this.dry = new GainNode(ctx, { gain: 1 });
    this.wet = new GainNode(ctx, { gain: 0 });
    this.echoSend = new GainNode(ctx, { gain: 0 });
    this.echo = new DelayNode(ctx, { delayTime: 0.36, maxDelayTime: 2 });
    const feedback = new GainNode(ctx, { gain: 0.45 });
    this.master = new GainNode(ctx, { gain: 0.4 });
    this.analyser = new AnalyserNode(ctx, { fftSize: 1024 });
    const verb = new ConvolverNode(ctx, { buffer: impulse(ctx, 2.8) });
    this.shelf.connect(this.lowpass);
    this.lowpass.connect(this.dry).connect(this.master);
    this.lowpass.connect(verb).connect(this.wet).connect(this.master);
    this.lowpass.connect(this.echoSend).connect(this.echo);
    this.echo.connect(feedback).connect(this.echo);
    this.echo.connect(this.master);
    this.master.connect(this.analyser).connect(ctx.destination);
    this.ready = ctx.audioWorklet.addModule("/deck-worklet.js").then(() => {
      this.node = new AudioWorkletNode(ctx, "deck", { numberOfInputs: 0, outputChannelCount: [2] });
      this.node.port.onmessage = (e) => {
        if (e.data.pos !== undefined) this.position = e.data.pos / ctx.sampleRate;
        if (e.data.ended && !this.repeat) void this.next();
      };
      this.node.connect(this.shelf);
    });
    void this.play(this.queue[0], false);
  }

  /** Browsers only start audio after a click or key press. */
  async resume() {
    if (this.ctx.state !== "running") await this.ctx.resume();
  }

  /** Load a track (and optionally start it). Later calls win if several overlap. */
  async play(track: Track, autostart = true) {
    const token = ++this.loadToken;
    this.loading = true;
    this.error = "";
    try {
      const [buf] = await Promise.all([decodeTrack(this.ctx, track), this.ready]);
      if (token !== this.loadToken) return;
      this.loadBuffer(buf);
      this.current = track;
      this.title = track.title;
      if (!this.queue.some((t) => t.id === track.id)) this.queue = [track, ...this.queue];
      if (autostart) {
        this.setPlaying(true);
        recordPlay(track);
      }
      this.onTrackChange?.(track);
    } catch (e) {
      if (token === this.loadToken) this.error = e instanceof Error ? e.message : "Couldn't load that song.";
    } finally {
      if (token === this.loadToken) this.loading = false;
    }
  }

  async playFile(file: File) {
    const buf = await this.ctx.decodeAudioData(await file.arrayBuffer());
    const track = await saveUpload(file);
    await this.ready;
    this.loadBuffer(buf);
    this.current = track;
    this.title = track.title;
    this.queue = [track, ...this.queue.filter((t) => t.id !== track.id)];
    this.setPlaying(true);
    recordPlay(track);
    this.onTrackChange?.(track);
    return track;
  }

  private loadBuffer(buffer: AudioBuffer) {
    const left = buffer.getChannelData(0).slice();
    const right = (buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0)).slice();
    let peak = 0;
    for (let i = 0; i < left.length; i += 7) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    if (peak > 1) for (let i = 0; i < left.length; i++) (left[i] /= peak), (right[i] /= peak);
    this.node!.port.postMessage({ type: "load", left, right }, [left.buffer, right.buffer]);
    this.duration = buffer.duration;
    this.position = 0;
  }

  private step(by: 1 | -1) {
    if (!this.queue.length) return;
    const i = Math.max(0, this.queue.findIndex((t) => t.id === this.current?.id));
    const j = this.shuffle && this.queue.length > 1
      ? (i + 1 + Math.floor(Math.random() * (this.queue.length - 1))) % this.queue.length
      : (i + by + this.queue.length) % this.queue.length;
    return this.play(this.queue[j]);
  }
  next() {
    return this.step(1);
  }
  prev() {
    // Like any player: past 3 s, "back" restarts the song.
    if (this.position > 3) return this.seek(0);
    return this.step(-1);
  }

  setPlaying(on: boolean) {
    this.playing = on;
    this.node?.port.postMessage({ type: "params", playing: on });
  }

  seek(seconds: number) {
    this.node?.port.postMessage({ type: "seek", pos: Math.max(0, seconds) * this.ctx.sampleRate });
    this.position = seconds;
  }

  /** Called every video frame with the smoothed gesture values. */
  set(v: DeckValues) {
    this.node?.port.postMessage({ type: "params", speed: v.speed, semitones: v.semitones });
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(Math.pow(v.volume, 1.6), t, 0.03);
    this.lowpass.frequency.setTargetAtTime(180 * Math.pow(20000 / 180, v.filter), t, 0.03);
    this.wet.gain.setTargetAtTime(v.reverb * 0.9, t, 0.05);
    this.dry.gain.setTargetAtTime(1 - v.reverb * 0.35, t, 0.05);
    this.echoSend.gain.setTargetAtTime(v.echo * 0.8, t, 0.05);
    this.shelf.gain.setTargetAtTime(v.bass * 15, t, 0.05);
  }

  /** Push the current output loudness into the rolling level history (for the waveform). */
  sampleLevel() {
    this.analyser.getFloatTimeDomainData(this.scratch);
    let sum = 0;
    for (const s of this.scratch) sum += s * s;
    this.levels.shift();
    this.levels.push(this.playing ? Math.min(1, Math.sqrt(sum / this.scratch.length) * 4) : 0);
  }

  close() {
    this.setPlaying(false);
    void this.ctx.close();
  }
}

function impulse(ctx: BaseAudioContext, seconds: number) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}
