// === VISUAL RENDERER ===
// Canvas-based reactive visualizations that respond to audio

class VisualRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.mode = 'nebula';
    this.colors = null;
    this.animId = null;
    this.time = 0;
    this.audioData = null;
    this.waveformData = null;
    this.raindrops = [];
    this.gridLines = [];
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
  }

  setMode(mode, colors) {
    this.mode = mode;
    this.colors = colors;
    this.particles = [];
    this.raindrops = [];
    this.gridLines = [];
    this.initParticles();
  }

  initParticles() {
    const count = this.mode === 'rain' ? 200 : this.mode === 'grid' ? 60 : 80;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle());
    }
    if (this.mode === 'grid') {
      this.gridLines = [];
      for (let i = 0; i < 20; i++) {
        this.gridLines.push({
          y: Math.random() * this.h,
          speed: 0.2 + Math.random() * 0.5,
          opacity: 0.05 + Math.random() * 0.1,
        });
      }
    }
  }

  createParticle() {
    const c = this.colors?.particles || ['#ffffff'];
    const color = c[Math.floor(Math.random() * c.length)];
    if (this.mode === 'rain') {
      return {
        x: Math.random() * (this.w || 800),
        y: Math.random() * (this.h || 600),
        vy: 2 + Math.random() * 4,
        vx: -0.5 - Math.random() * 0.5,
        length: 10 + Math.random() * 20,
        opacity: 0.1 + Math.random() * 0.3,
        color,
      };
    }
    return {
      x: Math.random() * (this.w || 800),
      y: Math.random() * (this.h || 600),
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: 1 + Math.random() * 3,
      baseSize: 1 + Math.random() * 3,
      opacity: 0.1 + Math.random() * 0.5,
      color,
      phase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.01 + Math.random() * 0.02,
    };
  }

  updateAudio(frequencyData, waveformData) {
    this.audioData = frequencyData;
    this.waveformData = waveformData;
  }

  getAudioEnergy() {
    if (!this.audioData) return 0;
    let sum = 0;
    for (let i = 0; i < this.audioData.length; i++) sum += this.audioData[i];
    return sum / (this.audioData.length * 255);
  }

  getBassEnergy() {
    if (!this.audioData) return 0;
    let sum = 0;
    const end = Math.min(10, this.audioData.length);
    for (let i = 0; i < end; i++) sum += this.audioData[i];
    return sum / (end * 255);
  }

  getHighEnergy() {
    if (!this.audioData) return 0;
    let sum = 0;
    const start = Math.floor(this.audioData.length * 0.6);
    for (let i = start; i < this.audioData.length; i++) sum += this.audioData[i];
    return sum / ((this.audioData.length - start) * 255);
  }

  start() {
    this.resize();
    this.initParticles();
    const loop = () => {
      this.render();
      this.animId = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = null;
  }

  render() {
    this.time += 0.016;
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const energy = this.getAudioEnergy();
    const bass = this.getBassEnergy();
    const high = this.getHighEnergy();

    // Background
    ctx.fillStyle = this.colors?.bg || '#050510';
    ctx.fillRect(0, 0, w, h);

    switch (this.mode) {
      case 'nebula': this.renderNebula(ctx, w, h, energy, bass, high); break;
      case 'rain': this.renderRain(ctx, w, h, energy, bass, high); break;
      case 'forest': this.renderForest(ctx, w, h, energy, bass, high); break;
      case 'grid': this.renderGrid(ctx, w, h, energy, bass, high); break;
      case 'ocean': this.renderOcean(ctx, w, h, energy, bass, high); break;
      case 'particles': this.renderParticlesMode(ctx, w, h, energy, bass, high); break;
      default: this.renderNebula(ctx, w, h, energy, bass, high);
    }

    // Waveform overlay (subtle)
    if (this.waveformData) {
      ctx.beginPath();
      ctx.strokeStyle = (this.colors?.primary || '#ffffff') + '20';
      ctx.lineWidth = 1;
      const sliceWidth = w / this.waveformData.length;
      let x = 0;
      for (let i = 0; i < this.waveformData.length; i++) {
        const v = this.waveformData[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
    }
  }

  renderNebula(ctx, w, h, energy, bass, high) {
    // Nebula clouds
    const c1 = this.colors?.primary || '#4a6cf7';
    const c2 = this.colors?.secondary || '#8b5cf6';

    for (let i = 0; i < 3; i++) {
      const cx = w * (0.3 + i * 0.2) + Math.sin(this.time * 0.1 + i) * 50;
      const cy = h * (0.4 + Math.sin(this.time * 0.05 + i * 2) * 0.1);
      const r = 100 + energy * 200 + bass * 100;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, (i % 2 === 0 ? c1 : c2) + '15');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // Stars / particles
    this.particles.forEach(p => {
      p.x += p.vx + Math.sin(this.time + p.phase) * 0.1;
      p.y += p.vy + Math.cos(this.time + p.phase) * 0.1;
      p.size = p.baseSize + energy * 3 + Math.sin(this.time * p.pulseSpeed * 60 + p.phase) * 1;
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, '0');
      ctx.fill();
    });
  }

  renderRain(ctx, w, h, energy, bass, high) {
    // City glow at bottom
    const grad = ctx.createLinearGradient(0, h * 0.7, 0, h);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, (this.colors?.primary || '#3b82f6') + '08');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Raindrops
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy + bass * 3;
      if (p.y > h) {
        p.y = -p.length;
        p.x = Math.random() * w;
      }
      if (p.x < 0) p.x = w;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 2, p.y + p.length);
      ctx.strokeStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, '0');
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    // Ripples at bottom (where drops hit)
    if (Math.random() < 0.3 + energy) {
      const rx = Math.random() * w;
      const ry = h - 10 - Math.random() * 30;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 3 + high * 10, 1.5 + high * 5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = (this.colors?.accent || '#93c5fd') + '30';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  renderForest(ctx, w, h, energy, bass, high) {
    // Ground gradient
    const grad = ctx.createLinearGradient(0, h * 0.8, 0, h);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, (this.colors?.primary || '#22c55e') + '10');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Floating particles (fireflies)
    this.particles.forEach(p => {
      p.x += p.vx + Math.sin(this.time * 0.5 + p.phase) * 0.5;
      p.y += p.vy + Math.cos(this.time * 0.3 + p.phase) * 0.3;
      const pulse = (Math.sin(this.time * p.pulseSpeed * 60 + p.phase) + 1) * 0.5;
      p.size = p.baseSize * (0.5 + pulse * 0.5 + energy);
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;

      // Glow
      const glowR = p.size * 4;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
      glow.addColorStop(0, p.color + Math.floor(pulse * 80).toString(16).padStart(2, '0'));
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - glowR, p.y - glowR, glowR * 2, glowR * 2);

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor((0.3 + pulse * 0.7) * 255).toString(16).padStart(2, '0');
      ctx.fill();
    });
  }

  renderGrid(ctx, w, h, energy, bass, high) {
    // Perspective grid
    const vanishY = h * 0.35;
    const gridColor = this.colors?.primary || '#f43f5e';

    // Horizontal scan lines
    this.gridLines.forEach(line => {
      line.y += line.speed + bass * 2;
      if (line.y > h) line.y = vanishY;
      const progress = (line.y - vanishY) / (h - vanishY);
      ctx.beginPath();
      ctx.moveTo(0, line.y);
      ctx.lineTo(w, line.y);
      ctx.strokeStyle = gridColor + Math.floor(line.opacity * progress * 255).toString(16).padStart(2, '0');
      ctx.lineWidth = 0.5 + progress;
      ctx.stroke();
    });

    // Vertical converging lines
    const numVertical = 15;
    for (let i = 0; i <= numVertical; i++) {
      const x = (w / numVertical) * i;
      const centerX = w / 2;
      ctx.beginPath();
      ctx.moveTo(centerX + (x - centerX) * 0.1, vanishY);
      ctx.lineTo(x, h);
      ctx.strokeStyle = gridColor + '15';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Neon glow on horizon
    const glowGrad = ctx.createLinearGradient(0, vanishY - 50, 0, vanishY + 50);
    glowGrad.addColorStop(0, 'transparent');
    glowGrad.addColorStop(0.5, gridColor + Math.floor(20 + energy * 40).toString(16).padStart(2, '0'));
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, vanishY - 50, w, 100);

    // Floating particles above horizon (city lights)
    this.particles.forEach(p => {
      p.y = Math.min(p.y, vanishY - 5);
      p.x += p.vx;
      const pulse = Math.sin(this.time * 2 + p.phase);
      p.size = p.baseSize * (0.5 + pulse * 0.3 + energy * 0.5);
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, '0');
      ctx.fill();
    });
  }

  renderOcean(ctx, w, h, energy, bass, high) {
    // Depth gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#020a14');
    grad.addColorStop(1, '#000510');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Light rays from above
    for (let i = 0; i < 5; i++) {
      const x = w * (0.15 + i * 0.18) + Math.sin(this.time * 0.1 + i) * 30;
      const rayW = 30 + energy * 50;
      const rayGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      rayGrad.addColorStop(0, (this.colors?.accent || '#67e8f9') + '08');
      rayGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.moveTo(x - rayW / 2, 0);
      ctx.lineTo(x - rayW * 1.5, h * 0.6);
      ctx.lineTo(x + rayW * 1.5, h * 0.6);
      ctx.lineTo(x + rayW / 2, 0);
      ctx.closePath();
      ctx.fillStyle = rayGrad;
      ctx.fill();
    }

    // Bioluminescent particles
    this.particles.forEach(p => {
      p.x += p.vx + Math.sin(this.time * 0.3 + p.phase) * 0.3;
      p.y += p.vy + Math.sin(this.time * 0.2 + p.phase * 2) * 0.2;
      const pulse = (Math.sin(this.time * p.pulseSpeed * 40 + p.phase) + 1) * 0.5;
      p.size = p.baseSize * (0.3 + pulse * 0.7 + high * 2);
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;

      const glowR = p.size * 6;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
      glow.addColorStop(0, p.color + Math.floor(pulse * 50).toString(16).padStart(2, '0'));
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - glowR, p.y - glowR, glowR * 2, glowR * 2);

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor((0.2 + pulse * 0.8) * 255).toString(16).padStart(2, '0');
      ctx.fill();
    });
  }

  renderParticlesMode(ctx, w, h, energy, bass, high) {
    // Warm glow at center
    const cx = w / 2 + Math.sin(this.time * 0.1) * 50;
    const cy = h / 2 + Math.cos(this.time * 0.08) * 30;
    const r = 150 + energy * 100;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    glow.addColorStop(0, (this.colors?.primary || '#d97706') + '10');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Floating dust particles
    this.particles.forEach(p => {
      p.x += p.vx + Math.sin(this.time * 0.2 + p.phase) * 0.2;
      p.y += p.vy - 0.1; // slight upward drift (warmth)
      const pulse = (Math.sin(this.time * p.pulseSpeed * 30 + p.phase) + 1) * 0.5;
      p.size = p.baseSize * (0.5 + pulse * 0.3 + energy * 0.3);
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor((0.2 + pulse * 0.5) * 255).toString(16).padStart(2, '0');
      ctx.fill();
    });

    // Connection lines between close particles (warm web)
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
          ctx.beginPath();
          ctx.moveTo(this.particles[i].x, this.particles[i].y);
          ctx.lineTo(this.particles[j].x, this.particles[j].y);
          const alpha = Math.floor((1 - dist / 80) * 30).toString(16).padStart(2, '0');
          ctx.strokeStyle = (this.colors?.secondary || '#f59e0b') + alpha;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }
}
