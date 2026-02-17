// === BIOME DEFINITIONS ===
// Each biome is a complete soundscape configuration

const BIOMES = {

  deepSpace: {
    name: 'Deep Space',
    icon: '🌌',
    description: 'Vast cosmic drones, distant radio signals, the sound of nothing',
    colors: {
      bg: '#05050f', primary: '#4a6cf7', secondary: '#8b5cf6',
      accent: '#c084fc', particles: ['#4a6cf7', '#8b5cf6', '#c084fc', '#312e81', '#1e1b4b'],
    },
    visualMode: 'nebula',
    setup(engine) {
      engine._activeDrones = []; engine._activePads = []; engine._activeNoise = []; engine._timeouts = [];
      const drone1 = engine.createDrone(36, 'sine', 0, 0.12);
      drone1.gain.connect(engine.compressor); engine._activeDrones.push(drone1);
      const drone2 = engine.createDrone(54, 'sine', 5, 0.06);
      drone2.gain.connect(engine.compressor); engine._activeDrones.push(drone2);
      const drone3 = engine.createDrone(880, 'sine', -3, 0.02);
      drone3.gain.connect(engine.compressor); engine._activeDrones.push(drone3);
      const noise = engine.createNoiseLayer('brown', 'lowpass', 200, 0.04);
      engine.createReverbSend(noise.gain, 0.6); engine._activeNoise.push(noise);
      const melody = engine.createMelodyGenerator('pentatonic', 72, 10);
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (Math.random() > 0.6 * engine.intensity) return;
        const g = engine.playNote(engine.noteToFreq(melody()), 0.04 * engine.intensity, 6, 'sine');
        engine.createReverbSend(g, 0.8);
      }, 4, 0.6));
      const roots = [36, 38, 41, 43, 33]; let rootIdx = 0; let currentPad = null;
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (currentPad) currentPad.release();
        rootIdx = (rootIdx + (Math.random() < 0.3 ? 2 : 1)) % roots.length;
        const r = roots[rootIdx];
        currentPad = engine.createPad([r+24,r+31,r+36,r+43], 'sine', 0.04*engine.intensity, 6, 8);
        engine.createReverbSend(currentPad.gain, 0.7); engine._activePads.push(currentPad);
      }, 18, 0.3));
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (Math.random() > 0.4) return;
        const osc = engine.ctx.createOscillator(); const gain = engine.ctx.createGain();
        const filter = engine.ctx.createBiquadFilter();
        osc.type = 'sawtooth'; osc.frequency.value = 800+Math.random()*2000;
        filter.type = 'bandpass'; filter.frequency.value = osc.frequency.value; filter.Q.value = 20;
        const now = engine.ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.015*engine.intensity, now+0.3);
        gain.gain.linearRampToValueAtTime(0, now+0.8+Math.random()*1.5);
        osc.connect(filter); filter.connect(gain); engine.createReverbSend(gain, 0.9);
        osc.start(now); osc.stop(now+3);
      }, 8, 0.5));
    }
  },

  rainyNight: {
    name: 'Rainy Night',
    icon: '🌧️',
    description: 'Gentle rain on windows, distant city hum, warm lo-fi vibes',
    colors: {
      bg: '#0a0f1a', primary: '#3b82f6', secondary: '#60a5fa',
      accent: '#93c5fd', particles: ['#3b82f6', '#60a5fa', '#93c5fd', '#1e3a5f', '#1e40af'],
    },
    visualMode: 'rain',
    setup(engine) {
      engine._activeDrones = []; engine._activePads = []; engine._activeNoise = []; engine._timeouts = [];
      const rain = engine.createNoiseLayer('white', 'bandpass', 6000, 0.08);
      rain.filter.Q.value = 0.5; engine.createReverbSend(rain.gain, 0.3); engine._activeNoise.push(rain);
      const rain2 = engine.createNoiseLayer('pink', 'highpass', 3000, 0.04);
      rain2.gain.connect(engine.compressor); engine._activeNoise.push(rain2);
      const hum = engine.createDrone(55, 'sine', 0, 0.06);
      hum.gain.connect(engine.compressor); engine._activeDrones.push(hum);
      const melody = engine.createMelodyGenerator('pentatonic', 60, 12);
      engine.schedulers.push(engine.scheduleLoop(() => {
        const freq = engine.noteToFreq(melody());
        const g = engine.playNote(freq, 0.06*engine.intensity, 3, 'triangle');
        const lpf = engine.ctx.createBiquadFilter(); lpf.type='lowpass'; lpf.frequency.value=1500;
        g.connect(lpf); engine.createReverbSend(lpf, 0.4);
      }, 2.5, 0.4));
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (Math.random() > 0.5) return;
        const note = [36,38,41,43][Math.floor(Math.random()*4)];
        const g = engine.playNote(engine.noteToFreq(note), 0.05*engine.intensity, 4, 'sine');
        g.connect(engine.compressor);
      }, 6, 0.3));
      const chords = [[60,63,67,72],[58,62,65,70],[56,60,63,68],[55,58,62,67]];
      let ci=0, pad=null;
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (pad) pad.release(); const c = chords[ci%chords.length]; ci++;
        pad = engine.createPad(c, 'triangle', 0.03*engine.intensity, 4, 5);
        const lpf = engine.ctx.createBiquadFilter(); lpf.type='lowpass'; lpf.frequency.value=800;
        pad.gain.connect(lpf); engine.createReverbSend(lpf, 0.5); engine._activePads.push(pad);
      }, 12, 0.2));
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (Math.random() > engine.intensity) return;
        const osc = engine.ctx.createOscillator(); const gain = engine.ctx.createGain();
        osc.type='sine'; osc.frequency.value = 2000+Math.random()*4000;
        const now = engine.ctx.currentTime;
        gain.gain.setValueAtTime(0.02*engine.intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now+0.08);
        osc.connect(gain); gain.connect(engine.compressor); osc.start(now); osc.stop(now+0.1);
      }, 0.15, 0.8));
    }
  },

  digitalForest: {
    name: 'Digital Forest',
    icon: '🌲',
    description: 'Birdsong algorithms, data streams through leaves, organic circuits',
    colors: {
      bg: '#050f0a', primary: '#22c55e', secondary: '#4ade80',
      accent: '#86efac', particles: ['#22c55e', '#4ade80', '#86efac', '#166534', '#14532d'],
    },
    visualMode: 'forest',
    setup(engine) {
      engine._activeDrones = []; engine._activePads = []; engine._activeNoise = []; engine._timeouts = [];
      const wind = engine.createNoiseLayer('brown', 'bandpass', 400, 0.06);
      wind.filter.Q.value = 0.8; engine.createReverbSend(wind.gain, 0.4); engine._activeNoise.push(wind);
      const leaves = engine.createNoiseLayer('pink', 'highpass', 2000, 0.03);
      leaves.gain.connect(engine.compressor); engine._activeNoise.push(leaves);
      const earth = engine.createDrone(65, 'sine', 0, 0.06);
      earth.gain.connect(engine.compressor); engine._activeDrones.push(earth);
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (Math.random() > 0.5*engine.intensity) return;
        const bf = 1200+Math.random()*1500;
        const osc = engine.ctx.createOscillator(); const mod = engine.ctx.createOscillator();
        const mg = engine.ctx.createGain(); const gain = engine.ctx.createGain();
        osc.type='sine'; mod.type='sine'; mod.frequency.value=5+Math.random()*10;
        mg.gain.value = bf*0.3; mod.connect(mg); mg.connect(osc.frequency);
        const now = engine.ctx.currentTime; const dur = 0.1+Math.random()*0.3;
        osc.frequency.setValueAtTime(bf, now);
        osc.frequency.linearRampToValueAtTime(bf*(1.2+Math.random()*0.5), now+dur);
        gain.gain.setValueAtTime(0.03*engine.intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now+dur);
        osc.connect(gain); engine.createReverbSend(gain, 0.5);
        osc.start(now); mod.start(now); osc.stop(now+dur+0.1); mod.stop(now+dur+0.1);
      }, 3, 0.6));
      const melody = engine.createMelodyGenerator('japanese', 67, 10);
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (Math.random() > 0.7) return;
        const g = engine.playNote(engine.noteToFreq(melody()), 0.05*engine.intensity, 4, 'sine');
        engine.createReverbSend(g, 0.5);
      }, 5, 0.4));
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (Math.random() > 0.6) return;
        const osc = engine.ctx.createOscillator(); const gain = engine.ctx.createGain();
        osc.type='square'; osc.frequency.value=200+Math.random()*800;
        const now = engine.ctx.currentTime;
        gain.gain.setValueAtTime(0.01*engine.intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now+0.05);
        osc.connect(gain); gain.connect(engine.compressor); osc.start(now); osc.stop(now+0.06);
      }, 0.8, 0.7));
      const chords=[[55,62,67,73],[57,64,69,74],[53,60,67,72],[55,62,66,71]];
      let ci=0, pad=null;
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (pad) pad.release(); ci=(ci+1)%chords.length;
        pad = engine.createPad(chords[ci], 'sine', 0.03*engine.intensity, 5, 6);
        engine.createReverbSend(pad.gain, 0.6); engine._activePads.push(pad);
      }, 16, 0.2));
    }
  },

  cyberpunkCity: {
    name: 'Cyberpunk City',
    icon: '🏙️',
    description: 'Neon hum, synth drones, glitch artifacts, rain on chrome',
    colors: {
      bg: '#0a0a14', primary: '#f43f5e', secondary: '#fb923c',
      accent: '#fbbf24', particles: ['#f43f5e', '#fb923c', '#fbbf24', '#e11d48', '#9f1239'],
    },
    visualMode: 'grid',
    setup(engine) {
      engine._activeDrones = []; engine._activePads = []; engine._activeNoise = []; engine._timeouts = [];
      const bass = engine.createDrone(40, 'sawtooth', 0, 0.06);
      const bf = engine.ctx.createBiquadFilter(); bf.type='lowpass'; bf.frequency.value=120;
      bass.gain.connect(bf); bf.connect(engine.compressor); engine._activeDrones.push(bass);
      const neon = engine.createDrone(60, 'square', 3, 0.02);
      const nf = engine.ctx.createBiquadFilter(); nf.type='bandpass'; nf.frequency.value=500; nf.Q.value=5;
      neon.gain.connect(nf); nf.connect(engine.compressor); engine._activeDrones.push(neon);
      const cn = engine.createNoiseLayer('pink', 'lowpass', 800, 0.05);
      cn.gain.connect(engine.compressor); engine._activeNoise.push(cn);
      const rn = engine.createNoiseLayer('white', 'highpass', 5000, 0.03);
      engine.createReverbSend(rn.gain, 0.3); engine._activeNoise.push(rn);
      const melody = engine.createMelodyGenerator('dorian', 48, 14);
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (Math.random() > 0.7*engine.intensity) return;
        const freq = engine.noteToFreq(melody());
        const osc = engine.ctx.createOscillator(); const gain = engine.ctx.createGain();
        const filter = engine.ctx.createBiquadFilter();
        osc.type='sawtooth'; osc.frequency.value=freq;
        filter.type='lowpass'; filter.frequency.value=freq*3; filter.Q.value=2;
        const now = engine.ctx.currentTime;
        gain.gain.setValueAtTime(0.05*engine.intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now+0.8);
        filter.frequency.exponentialRampToValueAtTime(freq*0.3, now+0.6);
        osc.connect(filter); filter.connect(gain); engine.createReverbSend(gain, 0.4);
        osc.start(now); osc.stop(now+1);
      }, 1.5, 0.3));
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (Math.random() > 0.3) return;
        const src = engine.ctx.createBufferSource(); src.buffer = engine.noiseBuffers.white;
        const gain = engine.ctx.createGain(); const flt = engine.ctx.createBiquadFilter();
        flt.type='bandpass'; flt.frequency.value=500+Math.random()*3000; flt.Q.value=10+Math.random()*20;
        const now = engine.ctx.currentTime; const dur = 0.02+Math.random()*0.08;
        gain.gain.setValueAtTime(0.06*engine.intensity, now);
        gain.gain.linearRampToValueAtTime(0, now+dur);
        src.connect(flt); flt.connect(gain); gain.connect(engine.compressor);
        src.start(now); src.stop(now+dur+0.01);
      }, 2, 0.8));
      const chords=[[36,43,48,55,60],[34,41,46,53,58],[32,39,44,51,56],[31,38,43,50,55]];
      let ci=0, pad=null;
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (pad) pad.release(); ci=(ci+1)%chords.length;
        pad = engine.createPad(chords[ci], 'sawtooth', 0.02*engine.intensity, 4, 5);
        const lpf = engine.ctx.createBiquadFilter(); lpf.type='lowpass'; lpf.frequency.value=600;
        pad.gain.connect(lpf); engine.createReverbSend(lpf, 0.5); engine._activePads.push(pad);
      }, 14, 0.2));
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (Math.random() > 0.25) return;
        const osc = engine.ctx.createOscillator(); const gain = engine.ctx.createGain();
        osc.type='sine'; const now = engine.ctx.currentTime; const dur=3+Math.random()*2;
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(600, now+dur*0.5);
        osc.frequency.linearRampToValueAtTime(400, now+dur);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.01*engine.intensity, now+dur*0.3);
        gain.gain.linearRampToValueAtTime(0, now+dur);
        osc.connect(gain); engine.createReverbSend(gain, 0.7); osc.start(now); osc.stop(now+dur+0.1);
      }, 20, 0.5));
    }
  },

  oceanDepths: {
    name: 'Ocean Depths',
    icon: '🐋',
    description: 'Whale songs, deep currents, bioluminescent pulses, pressure',
    colors: {
      bg: '#020a14', primary: '#0ea5e9', secondary: '#06b6d4',
      accent: '#67e8f9', particles: ['#0ea5e9', '#06b6d4', '#67e8f9', '#0c4a6e', '#164e63'],
    },
    visualMode: 'ocean',
    setup(engine) {
      engine._activeDrones = []; engine._activePads = []; engine._activeNoise = []; engine._timeouts = [];
      const deep = engine.createDrone(30, 'sine', 0, 0.1);
      deep.gain.connect(engine.compressor); engine._activeDrones.push(deep);
      const deep2 = engine.createDrone(45, 'sine', 3, 0.05);
      deep2.gain.connect(engine.compressor); engine._activeDrones.push(deep2);
      const current = engine.createNoiseLayer('brown', 'lowpass', 300, 0.07);
      current.lfoGain.gain.value=150; current.lfo.frequency.value=0.02;
      engine.createReverbSend(current.gain, 0.5); engine._activeNoise.push(current);
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (Math.random() > 0.6*engine.intensity) return;
        const count = 1+Math.floor(Math.random()*3);
        for (let i=0;i<count;i++) {
          const id = setTimeout(() => {
            const osc = engine.ctx.createOscillator(); const gain = engine.ctx.createGain();
            osc.type='sine'; const freq=300+Math.random()*600; osc.frequency.value=freq;
            const now = engine.ctx.currentTime;
            osc.frequency.exponentialRampToValueAtTime(freq*1.5, now+0.15);
            gain.gain.setValueAtTime(0.02*engine.intensity, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now+0.15);
            osc.connect(gain); engine.createReverbSend(gain, 0.6); osc.start(now); osc.stop(now+0.2);
          }, i*(50+Math.random()*100));
          engine._timeouts.push(id);
        }
      }, 4, 0.5));
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (Math.random() > 0.4) return;
        const osc = engine.ctx.createOscillator(); const mod = engine.ctx.createOscillator();
        const mg = engine.ctx.createGain(); const gain = engine.ctx.createGain();
        const bf = 80+Math.random()*120;
        osc.type='sine'; osc.frequency.value=bf; mod.type='sine'; mod.frequency.value=0.5+Math.random()*2;
        mg.gain.value = bf*0.5; mod.connect(mg); mg.connect(osc.frequency);
        const now = engine.ctx.currentTime; const dur = 4+Math.random()*4;
        osc.frequency.setValueAtTime(bf, now);
        osc.frequency.linearRampToValueAtTime(bf*(0.7+Math.random()*0.8), now+dur*0.5);
        osc.frequency.linearRampToValueAtTime(bf*(0.5+Math.random()*0.3), now+dur);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04*engine.intensity, now+dur*0.2);
        gain.gain.linearRampToValueAtTime(0.02*engine.intensity, now+dur*0.6);
        gain.gain.linearRampToValueAtTime(0, now+dur);
        osc.connect(gain); engine.createReverbSend(gain, 0.8);
        osc.start(now); mod.start(now); osc.stop(now+dur+0.1); mod.stop(now+dur+0.1);
      }, 10, 0.4));
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (Math.random() > 0.5) return;
        const note = [72,74,76,79,81,84][Math.floor(Math.random()*6)];
        const g = engine.playNote(engine.noteToFreq(note), 0.025*engine.intensity, 3, 'sine');
        engine.createReverbSend(g, 0.7);
      }, 6, 0.5));
      const chords=[[36,48,54,60,66],[38,50,56,62,68],[34,46,52,58,64],[40,52,58,64,70]];
      let ci=0, pad=null;
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (pad) pad.release(); ci=(ci+1)%chords.length;
        pad = engine.createPad(chords[ci], 'sine', 0.03*engine.intensity, 6, 7);
        engine.createReverbSend(pad.gain, 0.6); engine._activePads.push(pad);
      }, 20, 0.2));
    }
  },

  midnightLibrary: {
    name: 'Midnight Library',
    icon: '📚',
    description: 'Crackling pages, clock ticks, dusty piano, warm lamplight hum',
    colors: {
      bg: '#0f0a05', primary: '#d97706', secondary: '#f59e0b',
      accent: '#fbbf24', particles: ['#d97706', '#f59e0b', '#fbbf24', '#92400e', '#78350f'],
    },
    visualMode: 'particles',
    setup(engine) {
      engine._activeDrones = []; engine._activePads = []; engine._activeNoise = []; engine._timeouts = [];
      // Warm room hum
      const hum = engine.createDrone(60, 'sine', 0, 0.04);
      hum.gain.connect(engine.compressor); engine._activeDrones.push(hum);
      const hum2 = engine.createDrone(120, 'sine', 2, 0.02);
      hum2.gain.connect(engine.compressor); engine._activeDrones.push(hum2);
      // Fireplace crackle — bursts of filtered noise
      engine.schedulers.push(engine.scheduleLoop(() => {
        const src = engine.ctx.createBufferSource(); src.buffer = engine.noiseBuffers.white;
        const gain = engine.ctx.createGain(); const flt = engine.ctx.createBiquadFilter();
        flt.type='bandpass'; flt.frequency.value=1000+Math.random()*2000; flt.Q.value=3;
        const now = engine.ctx.currentTime; const dur = 0.02+Math.random()*0.06;
        gain.gain.setValueAtTime(0.04*engine.intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now+dur);
        src.connect(flt); flt.connect(gain); gain.connect(engine.compressor);
        src.start(now); src.stop(now+dur+0.01);
      }, 0.3, 0.7));
      // Clock tick
      engine.schedulers.push(engine.scheduleLoop(() => {
        const osc = engine.ctx.createOscillator(); const gain = engine.ctx.createGain();
        osc.type='sine'; osc.frequency.value=800+Math.random()*200;
        const now = engine.ctx.currentTime;
        gain.gain.setValueAtTime(0.015*engine.intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now+0.03);
        osc.connect(gain); gain.connect(engine.compressor); osc.start(now); osc.stop(now+0.04);
        // Tock
        const id = setTimeout(() => {
          const o2 = engine.ctx.createOscillator(); const g2 = engine.ctx.createGain();
          o2.type='sine'; o2.frequency.value=600+Math.random()*100;
          const t = engine.ctx.currentTime;
          g2.gain.setValueAtTime(0.01*engine.intensity, t);
          g2.gain.exponentialRampToValueAtTime(0.001, t+0.03);
          o2.connect(g2); g2.connect(engine.compressor); o2.start(t); o2.stop(t+0.04);
        }, 500);
        engine._timeouts.push(id);
      }, 2, 0.05));
      // Dusty piano — pentatonic, gentle
      const melody = engine.createMelodyGenerator('pentatonic', 60, 14);
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (Math.random() > 0.8) return;
        const freq = engine.noteToFreq(melody());
        const g = engine.playNote(freq, 0.05*engine.intensity, 3.5, 'triangle');
        const lpf = engine.ctx.createBiquadFilter(); lpf.type='lowpass'; lpf.frequency.value=2000;
        g.connect(lpf); engine.createReverbSend(lpf, 0.4);
      }, 3, 0.3));
      // Warm background noise (room tone)
      const room = engine.createNoiseLayer('brown', 'lowpass', 400, 0.03);
      room.gain.connect(engine.compressor); engine._activeNoise.push(room);
      // Chords
      const chords=[[60,64,67,72],[58,62,65,69],[55,60,64,67],[57,60,64,69]];
      let ci=0, pad=null;
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (pad) pad.release(); ci=(ci+1)%chords.length;
        pad = engine.createPad(chords[ci], 'triangle', 0.025*engine.intensity, 5, 6);
        const lpf = engine.ctx.createBiquadFilter(); lpf.type='lowpass'; lpf.frequency.value=1200;
        pad.gain.connect(lpf); engine.createReverbSend(lpf, 0.5); engine._activePads.push(pad);
      }, 14, 0.2));
      // Page turn sounds — soft noise bursts
      engine.schedulers.push(engine.scheduleLoop(() => {
        if (Math.random() > 0.3) return;
        const src = engine.ctx.createBufferSource(); src.buffer = engine.noiseBuffers.pink;
        const gain = engine.ctx.createGain(); const flt = engine.ctx.createBiquadFilter();
        flt.type='highpass'; flt.frequency.value=3000;
        const now = engine.ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.02*engine.intensity, now+0.1);
        gain.gain.linearRampToValueAtTime(0, now+0.4);
        src.connect(flt); flt.connect(gain); gain.connect(engine.compressor);
        src.start(now); src.stop(now+0.5);
      }, 8, 0.5));
    }
  }
};
