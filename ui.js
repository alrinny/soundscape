// === UI CONTROLLER ===
// Manages the interface, biome switching, controls

class SoundscapeApp {
  constructor() {
    this.engine = new AudioEngine();
    this.visual = null;
    this.currentBiome = null;
    this.isPlaying = false;
    this.elapsedSeconds = 0;
    this.timerInterval = null;
  }

  async init() {
    // Canvas
    const canvas = document.getElementById('visualCanvas');
    this.visual = new VisualRenderer(canvas);

    // Biome buttons
    Object.entries(BIOMES).forEach(([key, biome]) => {
      const btn = document.getElementById(`biome-${key}`);
      if (btn) {
        btn.addEventListener('click', () => this.selectBiome(key));
      }
    });

    // Play button
    document.getElementById('playBtn').addEventListener('click', () => this.togglePlay());

    // Volume slider
    const volSlider = document.getElementById('volumeSlider');
    volSlider.addEventListener('input', (e) => {
      const val = e.target.value / 100;
      this.engine.setVolume(val);
      document.getElementById('volumeValue').textContent = e.target.value + '%';
    });

    // Intensity slider
    const intSlider = document.getElementById('intensitySlider');
    intSlider.addEventListener('input', (e) => {
      const val = e.target.value / 100;
      this.engine.setIntensity(val);
      document.getElementById('intensityValue').textContent = e.target.value + '%';
    });

    // Resize handler
    window.addEventListener('resize', () => {
      if (this.visual) this.visual.resize();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); this.togglePlay(); }
      if (e.key === 'm') { this.toggleMute(); }
      const biomeKeys = Object.keys(BIOMES);
      const num = parseInt(e.key);
      if (num >= 1 && num <= biomeKeys.length) {
        this.selectBiome(biomeKeys[num - 1]);
      }
    });

    // Select first biome by default
    this.selectBiome('deepSpace');
  }

  async selectBiome(key) {
    const biome = BIOMES[key];
    if (!biome) return;

    const wasPlaying = this.isPlaying;

    // Stop current
    if (this.isPlaying) {
      await this.stopPlayback();
    }

    this.currentBiome = key;

    // Update UI — active state
    document.querySelectorAll('.biome-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`biome-${key}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Update description
    document.getElementById('biomeTitle').textContent = biome.icon + ' ' + biome.name;
    document.getElementById('biomeDesc').textContent = biome.description;

    // Update colors
    document.documentElement.style.setProperty('--color-primary', biome.colors.primary);
    document.documentElement.style.setProperty('--color-secondary', biome.colors.secondary);
    document.documentElement.style.setProperty('--color-accent', biome.colors.accent);
    document.documentElement.style.setProperty('--color-bg', biome.colors.bg);

    // Set visual mode
    this.visual.setMode(biome.visualMode, biome.colors);

    // Auto-play if was playing, or start fresh
    if (wasPlaying) {
      await this.startPlayback();
    } else {
      // Start visual anyway (without audio)
      this.visual.start();
    }
  }

  async startPlayback() {
    if (!this.currentBiome) return;

    // Init audio engine if needed
    if (!this.engine.ctx) {
      await this.engine.init();
      this.engine.setupAnalyser();
    }

    if (this.engine.ctx.state === 'suspended') {
      await this.engine.ctx.resume();
    }

    this.engine.isPlaying = true;
    this.engine._timeouts = [];
    this.isPlaying = true;

    // Fade in master
    this.engine.master.gain.setValueAtTime(0, this.engine.ctx.currentTime);
    const targetVol = document.getElementById('volumeSlider').value / 100;
    this.engine.master.gain.linearRampToValueAtTime(targetVol, this.engine.ctx.currentTime + 2);

    // Set intensity
    this.engine.setIntensity(document.getElementById('intensitySlider').value / 100);

    // Start biome
    BIOMES[this.currentBiome].setup(this.engine);

    // Start visuals
    this.visual.start();

    // Audio → visual bridge
    this.visualLoop();

    // Timer
    this.startTimer();

    // Update UI
    document.getElementById('playBtn').innerHTML = '<span class="play-icon">⏸</span>';
    document.getElementById('playBtn').classList.add('playing');
    document.getElementById('status').textContent = 'Playing';
  }

  async stopPlayback() {
    this.engine.stop();
    this.isPlaying = false;

    // Stop timer
    this.stopTimer();

    // Update UI
    document.getElementById('playBtn').innerHTML = '<span class="play-icon">▶</span>';
    document.getElementById('playBtn').classList.remove('playing');
    document.getElementById('status').textContent = 'Paused';
  }

  async togglePlay() {
    if (this.isPlaying) {
      await this.stopPlayback();
    } else {
      await this.startPlayback();
    }
  }

  toggleMute() {
    const slider = document.getElementById('volumeSlider');
    if (parseInt(slider.value) > 0) {
      this._savedVolume = slider.value;
      slider.value = 0;
      this.engine.setVolume(0);
      document.getElementById('volumeValue').textContent = '0%';
    } else {
      slider.value = this._savedVolume || 70;
      this.engine.setVolume(slider.value / 100);
      document.getElementById('volumeValue').textContent = slider.value + '%';
    }
  }

  visualLoop() {
    if (!this.isPlaying) return;
    const freqData = this.engine.getAnalyserData();
    const waveData = this.engine.getWaveformData();
    if (freqData) this.visual.updateAudio(freqData, waveData);
    requestAnimationFrame(() => this.visualLoop());
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds++;
      const m = Math.floor(this.elapsedSeconds / 60);
      const s = this.elapsedSeconds % 60;
      document.getElementById('timer').textContent =
        String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  const app = new SoundscapeApp();
  app.init();
});
