// ── Background music constants ────────────────────────────────────────────────
const BPM          = 80;
const BEAT         = 60 / BPM;       // 0.75 s
const SIXTEENTH    = BEAT / 4;       // 0.1875 s
const LOOKAHEAD    = 0.3;            // schedule 300 ms ahead
const TICK_MS      = 100;            // scheduler interval

// Pentatonic A minor: A3 C4 D4 E4 G4 A4
const NOTES = [220, 261.63, 293.66, 329.63, 392, 440];

// 16-step melody (indices into NOTES) — loops as a gentle arpeggiated phrase
const MELODY = [4, 5, 4, 3,  2, 3, 4, 2,  1, 2, 3, 1,  0, 1, 2, 3];
//              G4 A4 G4 E4  D4 E4 G4 D4  C4 D4 E4 C4  A3 C4 D4 E4

// Bass root per beat (one per 4 steps): Am – F – C – G
const BASS = [110, 87.31, 130.81, 98.00];

export class PillAudio {
    private ctx!: AudioContext;
    private out!: AudioNode;

    private bgTimer: number | null = null;
    private bgNextTime = 0;
    private bgStep = 0;

    constructor(scene: Phaser.Scene) {
        try {
            const mgr = scene.sound as any;
            const ctx: AudioContext | undefined = mgr.context;
            if (!ctx || typeof ctx.createOscillator !== 'function') {
                console.warn('[PillAudio] WebAudio not available');
                return;
            }
            this.ctx = ctx;
            this.out = ctx.destination;
            this.startBgMusic();
        } catch (e) {
            console.warn('[PillAudio] init failed', e);
        }
    }

    destroy(): void {
        if (this.bgTimer !== null) {
            clearTimeout(this.bgTimer);
            this.bgTimer = null;
        }
    }

    // ── One-shot helpers ──────────────────────────────────────────────────────

    private osc(
        type: OscillatorType,
        freq: number,
        vol: number,
        dur: number,
        freqEnd?: number,
    ): void {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (freqEnd !== undefined) {
            o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
        }
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(this.out);
        o.start(t); o.stop(t + dur);
        o.onended = () => { g.disconnect(); };
    }

    private note(freq: number, startTime: number, vol: number, dur: number): void {
        if (!this.ctx) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, startTime);
        g.gain.setValueAtTime(0.001, startTime);
        g.gain.linearRampToValueAtTime(vol, startTime + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
        o.connect(g); g.connect(this.out);
        o.start(startTime); o.stop(startTime + dur + 0.02);
        o.onended = () => { g.disconnect(); };
    }

    private noise(dur: number): AudioBufferSourceNode {
        const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        return src;
    }

    // ── Sound effects ─────────────────────────────────────────────────────────

    playPopRequired(): void {
        if (!this.ctx) return;
        this.osc('sine', 880, 0.55, 0.08, 1200);
    }

    playPopOther(): void {
        if (!this.ctx) return;
        this.osc('triangle', 220, 0.28, 0.06);
    }

    playInvalidSwap(): void {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const dur = 0.22;
        const ns  = this.noise(dur);
        const bp  = this.ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 300; bp.Q.value = 0.5;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.001, t);
        ng.gain.linearRampToValueAtTime(0.35, t + 0.02);
        ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
        ns.connect(bp); bp.connect(ng); ng.connect(this.out);
        ns.start(t); ns.stop(t + dur);
        ns.onended = () => { ng.disconnect(); bp.disconnect(); };
        this.osc('sine', 400, 0.18, dur, 200);
    }

    playDialogOpen(): void {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        this.note(523.25, t,        0.28, 0.6);
        this.note(783.99, t + 0.04, 0.18, 0.6);
    }

    playOkClick(): void {
        if (!this.ctx) return;
        this.osc('sine', 1000, 0.35, 0.03);
    }

    playDayAdvance(): void {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        this.note(523.25, t,        0.35, 0.12);
        this.note(659.25, t + 0.11, 0.35, 0.18);
    }

    playShuffle(): void {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const dur = 0.35;
        const ns  = this.noise(dur);
        const bp  = this.ctx.createBiquadFilter();
        bp.type = 'highpass'; bp.frequency.value = 2000;
        const tremoloGain = this.ctx.createGain();
        tremoloGain.gain.setValueAtTime(0.5, t);
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 12;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.4;
        lfo.connect(lfoGain); lfoGain.connect(tremoloGain.gain);
        const master = this.ctx.createGain();
        master.gain.setValueAtTime(0.001, t);
        master.gain.linearRampToValueAtTime(0.5, t + 0.02);
        master.gain.exponentialRampToValueAtTime(0.001, t + dur);
        ns.connect(bp); bp.connect(tremoloGain); tremoloGain.connect(master); master.connect(this.out);
        lfo.start(t); ns.start(t); lfo.stop(t + dur); ns.stop(t + dur);
        ns.onended = () => { master.disconnect(); lfoGain.disconnect(); bp.disconnect(); };
    }

    playGameOver(): void {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(440, t);
        o.frequency.exponentialRampToValueAtTime(110, t + 1.5);
        g.gain.setValueAtTime(0.45, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
        o.connect(g); g.connect(this.out);
        o.start(t); o.stop(t + 1.8);
        o.onended = () => { g.disconnect(); };
    }

    // ── Background music — look-ahead scheduler ───────────────────────────────

    private startBgMusic(): void {
        if (!this.ctx) return;
        this.bgNextTime = this.ctx.currentTime + 0.1;
        this.bgStep = 0;
        this.bgTick();
    }

    private bgTick(): void {
        if (!this.ctx) return;
        while (this.bgNextTime < this.ctx.currentTime + LOOKAHEAD) {
            this.scheduleMelodyNote(this.bgNextTime, this.bgStep);
            this.scheduleBassNote(this.bgNextTime, this.bgStep);
            this.bgNextTime += SIXTEENTH;
            this.bgStep = (this.bgStep + 1) % 16;
        }
        this.bgTimer = window.setTimeout(() => this.bgTick(), TICK_MS);
    }

    private scheduleMelodyNote(time: number, step: number): void {
        const freq = NOTES[MELODY[step]];
        const dur  = SIXTEENTH * 0.75;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.001, time);
        g.gain.linearRampToValueAtTime(0.22, time + 0.012);
        g.gain.exponentialRampToValueAtTime(0.001, time + dur);
        o.connect(g); g.connect(this.out);
        o.start(time); o.stop(time + dur);
        o.onended = () => { g.disconnect(); };
    }

    private scheduleBassNote(time: number, step: number): void {
        if (step % 4 !== 0) return;
        const freq = BASS[Math.floor(step / 4)];
        const dur  = BEAT * 0.85;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.001, time);
        g.gain.linearRampToValueAtTime(0.18, time + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, time + dur);
        o.connect(g); g.connect(this.out);
        o.start(time); o.stop(time + dur);
        o.onended = () => { g.disconnect(); };
    }
}
