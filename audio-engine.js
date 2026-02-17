// === AUDIO ENGINE ===
// Generative ambient soundscape synthesizer
// Pure Web Audio API, zero dependencies

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.compressor = null;
    this.reverb = null;
    this.layers = {};
    this.isPlaying = false;
    this.currentBiome = null;
    this.schedulers = [];
    this.intensity = 0.5;
    this.noiseBuffers = {};
  }

  async init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Master chain: layers → compressor → master gain → destination
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.reverb = await this.createReverb(4.0, 0.3);

    this.compressor.connect(this.master);
    this.master.connect(this.ctx.destination);

    // Pre-generate noise buffers
    this.noiseBuffers.white = this.createNoiseBuffer('white');
    this.noiseBuffers.pink = this.createNoiseBuffer('pink');
    this.noiseBuffers.brown = this.createNoiseBuffer('brown');
  }

  createNoiseBuffer(type, duration = 4) {
    const length = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;

        if (type === 'white') {
          data[i] = white * 0.5;
        } else if (type === 'pink') {
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
          b6 = white * 0.115926;
        } else if (type === 'brown') {
          b0 = (b0 + (0.02 * white)) / 1.02;
          data[i] = b0 * 3.5;
        }
      }
    }
    return buffer;
  }

  async createReverb(duration, decay) {
    const length = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay * 10);
      }
    }

    const convolver = this.ctx.createConvolver();
    convolver.buffer = buffer;
    return convolver;
  }

  createReverbSend(dryNode, wetAmount = 0.3) {
    const dry = this.ctx.createGain();
    const wet = this.ctx.createGain();
    dry.gain.value = 1;
    wet.gain.value = wetAmount;

    dryNode.connect(dry);
    dryNode.connect(wet);
    dry.connect(this.compressor);
    wet.connect(this.reverb);
    this.reverb.connect(this.compressor);

    return { dry, wet };
  }

  // Musical scales
  static SCALES = {
    pentatonic: [0, 2, 4, 7, 9],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    wholeTone: [0, 2, 4, 6, 8, 10],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    japanese: [0, 1, 5, 7, 8], // In Sen
    lydian: [0, 2, 4, 6, 7, 9, 11],
  };

  noteToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  getScaleNote(scale, root, degree) {
    const s = AudioEngine.SCALES[scale];
    const octave = Math.floor(degree / s.length);
    const idx = ((degree % s.length) + s.length) % s.length;
    return root + octave * 12 + s[idx];
  }

  // Markov-style melody generator
  createMelodyGenerator(scale, root, range = 14) {
    let current = Math.floor(range / 2);
    const weights = [0.05, 0.1, 0.2, 0.3, 0.2, 0.1, 0.05]; // step probabilities

    return () => {
      // Weighted random walk with gravity toward center
      const gravity = (range / 2 - current) * 0.1;
      let step = 0;
      const r = Math.random();
      let cumulative = 0;
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (r < cumulative) {
          step = i - 3;
          break;
        }
      }
      step += Math.sign(gravity) * (Math.random() < Math.abs(gravity) ? 1 : 0);
      current = Math.max(0, Math.min(range - 1, current + step));
      return this.getScaleNote(scale, root, current);
    };
  }

  // Create a single drone oscillator with slow modulation
  createDrone(freq, type = 'sine', detune = 0, volume = 0.15) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;

    lfo.type = 'sine';
    lfo.frequency.value = 0.05 + Math.random() * 0.1;
    lfoGain.gain.value = volume * 0.3;

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    gain.gain.value = volume;
    osc.connect(gain);

    osc.start();
    lfo.start();

    return { osc, gain, lfo, lfoGain };
  }

  // Noise layer with filtering
  createNoiseLayer(type, filterType, filterFreq, volume = 0.1) {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffers[type] || this.noiseBuffers.white;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    filter.Q.value = 1;

    const gain = this.ctx.createGain();
    gain.gain.value = volume;

    // Slow filter modulation
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.03 + Math.random() * 0.05;
    lfoGain.gain.value = filterFreq * 0.3;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(gain);

    source.start();
    lfo.start();

    return { source, filter, gain, lfo, lfoGain };
  }

  // Pad synth - sustained chord with slow attack/release
  createPad(notes, waveform = 'sine', volume = 0.08, attackTime = 3, releaseTime = 4) {
    const gain = this.ctx.createGain();
    gain.gain.value = 0;

    const oscs = notes.map(note => {
      const osc = this.ctx.createOscillator();
      osc.type = waveform;
      osc.frequency.value = this.noteToFreq(note);
      osc.detune.value = (Math.random() - 0.5) * 10; // slight detuning
      osc.connect(gain);
      osc.start();
      return osc;
    });

    // Envelope
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attackTime);

    return {
      gain,
      oscs,
      release: () => {
        const t = this.ctx.currentTime;
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0, t + releaseTime);
        setTimeout(() => oscs.forEach(o => { try { o.stop(); } catch(e){} }), releaseTime * 1000 + 100);
      }
    };
  }

  // Pluck / bell synth for melodic elements
  playNote(freq, volume = 0.1, decay = 2, type = 'triangle') {
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.value = freq;
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2.01; // slight harmonic

    filter.type = 'lowpass';
    filter.frequency.value = freq * 4;

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
    filter.frequency.setValueAtTime(freq * 4, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.5, now + decay * 0.8);

    osc.connect(filter);
    osc2.connect(filter);
    const osc2gain = this.ctx.createGain();
    osc2gain.gain.value = volume * 0.3;
    osc2.disconnect();
    osc2.connect(osc2gain);
    osc2gain.connect(filter);

    filter.connect(gain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + decay);
    osc2.stop(now + decay);

    return gain;
  }

  // Schedule repeating events with slight randomization
  scheduleLoop(callback, baseInterval, variance = 0.2) {
    let active = true;
    const loop = () => {
      if (!active || !this.isPlaying) return;
      callback();
      const next = baseInterval * (1 + (Math.random() - 0.5) * variance * 2);
      const id = setTimeout(loop, next * 1000);
      this._timeouts.push(id);
    };
    loop();
    return { stop: () => { active = false; } };
  }

  stop() {
    this.isPlaying = false;
    this.schedulers.forEach(s => s.stop());
    this.schedulers = [];
    if (this._timeouts) this._timeouts.forEach(id => clearTimeout(id));
    this._timeouts = [];

    // Fade out master
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(0, now + 2);
    }

    // Clean up active pads
    if (this._activePads) {
      this._activePads.forEach(p => p.release());
      this._activePads = [];
    }
    if (this._activeDrones) {
      this._activeDrones.forEach(d => {
        try {
          d.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);
          setTimeout(() => { try { d.osc.stop(); d.lfo.stop(); } catch(e){} }, 2500);
        } catch(e) {}
      });
      this._activeDrones = [];
    }
    if (this._activeNoise) {
      this._activeNoise.forEach(n => {
        try {
          n.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);
          setTimeout(() => { try { n.source.stop(); n.lfo.stop(); } catch(e){} }, 2500);
        } catch(e) {}
      });
      this._activeNoise = [];
    }
  }

  setIntensity(val) {
    this.intensity = Math.max(0, Math.min(1, val));
  }

  setVolume(val) {
    if (this.master) {
      this.master.gain.setTargetAtTime(val, this.ctx.currentTime, 0.5);
    }
  }

  getAnalyserData() {
    if (!this._analyser) return null;
    const data = new Uint8Array(this._analyser.frequencyBinCount);
    this._analyser.getByteFrequencyData(data);
    return data;
  }

  getWaveformData() {
    if (!this._analyser) return null;
    const data = new Uint8Array(this._analyser.frequencyBinCount);
    this._analyser.getByteTimeDomainData(data);
    return data;
  }

  setupAnalyser() {
    this._analyser = this.ctx.createAnalyser();
    this._analyser.fftSize = 512;
    this._analyser.smoothingTimeConstant = 0.8;
    this.master.connect(this._analyser);
  }
}
