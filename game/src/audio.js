// Sound effects synthesized with WebAudio: no audio files, so the game stays
// a handful of static files. Every effect is a short oscillator phrase. The
// context is created lazily on the first start, because browsers only allow
// sound after a gesture.

export class SoundFX {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
  }

  /** Create the context if needed and wake it; call from a user gesture. */
  unlock() {
    if (this.context === null) {
      const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
      if (AudioCtor === undefined) return;
      this.context = new AudioCtor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  /** One tone: frequency glides from f0 to f1 over dur seconds. */
  tone(f0, f1, dur, type, volume, delay = 0) {
    if (this.context === null || this.master === null || this.muted) return;
    const t0 = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, f0), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** A rock breaks on the shield; the pitch climbs with the combo. */
  block(combo) {
    const base = 200 + Math.min(combo, 24) * 12;
    this.tone(base, base * 1.6, 0.09, 'square', 0.5);
    this.tone(base * 2, base * 2.4, 0.06, 'sine', 0.3);
  }

  /** An energy orb is caught. */
  catchOrb() {
    this.tone(880, 1320, 0.12, 'sine', 0.5);
    this.tone(1320, 1760, 0.14, 'sine', 0.3, 0.05);
  }

  /** A repair core is caught. */
  repair() {
    this.tone(520, 780, 0.12, 'triangle', 0.5);
    this.tone(780, 1040, 0.16, 'triangle', 0.4, 0.08);
  }

  /** Debris reaches the planet. */
  hit() {
    this.tone(110, 38, 0.28, 'sawtooth', 0.7);
    this.tone(64, 30, 0.32, 'triangle', 0.6);
  }

  /** The pulse shockwave fires. */
  pulse() {
    this.tone(160, 1400, 0.4, 'sine', 0.55);
    this.tone(80, 700, 0.45, 'triangle', 0.35);
  }

  /** A new wave begins. */
  wave() {
    this.tone(392, 392, 0.09, 'square', 0.3);
    this.tone(587, 587, 0.12, 'square', 0.3, 0.09);
  }

  /** The planet falls. */
  gameOver() {
    this.tone(440, 440, 0.18, 'triangle', 0.5);
    this.tone(349, 349, 0.18, 'triangle', 0.5, 0.18);
    this.tone(262, 196, 0.4, 'triangle', 0.55, 0.36);
  }
}
