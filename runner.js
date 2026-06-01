class CyberRunner {
  constructor(canvasId, onGameOver, onScoreUpdate, triggerAchievement) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.onGameOver = onGameOver;
    this.onScoreUpdate = onScoreUpdate;
    this.triggerAchievement = triggerAchievement;
    
    // Internal base resolution for math — CSS handles display scaling
    this.baseWidth = 960;
    this.baseHeight = 540;
    this.canvas.width = this.baseWidth;
    this.canvas.height = this.baseHeight;
    
    this.active = false;
    this.gameState = 'START'; // START, PLAYING, GAMEOVER
    
    this.reset();
    this.initInput();
  }

  reset() {
    this.score = 0;
    this.distance = 0;
    this.gameSpeed = 6;
    this.maxGameSpeed = 16;
    this.speedIncrement = 0.001;
    
    // Player
    this.player = {
      x: 120,
      y: 400,
      width: 40,
      height: 60,
      originalHeight: 60,
      slideHeight: 30,
      vy: 0,
      gravity: 0.8,
      jumpForce: -16,
      isGrounded: true,
      isSliding: false,
      slideDuration: 0,
      slideMaxDuration: 45, // frames
      color: '#ff007f',
      trail: []
    };
    
    this.groundY = 430;
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    
    // Timing for spawns
    this.spawnTimer = 0;
    this.minSpawnDelay = 60; // frames
    this.maxSpawnDelay = 120;
    this.nextSpawn = 80;
    
    // Parallax background offsets
    this.gridOffset = 0;
    this.bgStars = [];
    for (let i = 0; i < 40; i++) {
      this.bgStars.push({
        x: Math.random() * this.baseWidth,
        y: Math.random() * (this.groundY - 100),
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1
      });
    }
    
    // Visual FX
    this.screenShake = 0;
    this.flashDuration = 0;
  }

  initInput() {
    // Prevent default scrolling on arrow keys and space inside canvas/game
    const preventDefaults = (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', ' '].indexOf(e.key) > -1) {
        e.preventDefault();
      }
    };
    
    // --- Keyboard Controls (unchanged) ---
    window.addEventListener('keydown', (e) => {
      if (!this.active || this.gameState !== 'PLAYING') return;
      preventDefaults(e);
      
      if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Spacebar') {
        this.jump();
      }
      if (e.key === 'ArrowDown') {
        this.slide(true);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.active || this.gameState !== 'PLAYING') return;
      preventDefaults(e);
      if (e.key === 'ArrowDown') {
        this.slide(false);
      }
    });
    
    // --- Mobile Toolbar Button Controls ---
    const mobJump = document.getElementById('mob-jump');
    const mobSlide = document.getElementById('mob-slide');
    
    if (mobJump) {
      mobJump.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (this.active && this.gameState === 'PLAYING') this.jump();
      });
    }
    
    if (mobSlide) {
      let slideTimeout;
      mobSlide.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (this.active && this.gameState === 'PLAYING') {
          this.slide(true);
          clearTimeout(slideTimeout);
          slideTimeout = setTimeout(() => this.slide(false), 500);
        }
      });
      
      mobSlide.addEventListener('pointerup', (e) => {
        e.preventDefault();
        if (this.active && this.gameState === 'PLAYING') this.slide(false);
      });
      
      mobSlide.addEventListener('pointercancel', (e) => {
        if (this.active && this.gameState === 'PLAYING') this.slide(false);
      });
    }
    
    // --- Canvas Swipe Gesture Support ---
    let touchStartY = null;
    let touchStartX = null;
    
    this.canvas.addEventListener('touchstart', (e) => {
      if (!this.active || this.gameState !== 'PLAYING') return;
      const touch = e.touches[0];
      touchStartY = touch.clientY;
      touchStartX = touch.clientX;
    }, { passive: true });
    
    this.canvas.addEventListener('touchend', (e) => {
      if (!this.active || this.gameState !== 'PLAYING') return;
      if (touchStartY === null) return;
      
      const touch = e.changedTouches[0];
      const deltaY = touchStartY - touch.clientY;
      const deltaX = Math.abs(touchStartX - touch.clientX);
      const absDeltaY = Math.abs(deltaY);
      
      // Minimum swipe distance threshold (30px) and must be more vertical than horizontal
      if (absDeltaY > 30 && absDeltaY > deltaX) {
        if (deltaY > 0) {
          // Swiped UP → Jump
          this.jump();
        } else {
          // Swiped DOWN → Slide (auto-release after 500ms)
          this.slide(true);
          setTimeout(() => this.slide(false), 500);
        }
      } else if (absDeltaY < 15 && deltaX < 15) {
        // Tap (not a swipe) → Jump
        this.jump();
      }
      
      touchStartY = null;
      touchStartX = null;
    }, { passive: true });
  }

  jump() {
    if (this.player.isGrounded && !this.player.isSliding) {
      this.player.vy = this.player.jumpForce;
      this.player.isGrounded = false;
      if (window.sound) window.sound.playJump();
      if (window.Responsive) Responsive.vibrate(10);
      
      // Spawn dust particles
      for (let i = 0; i < 8; i++) {
        this.particles.push(this.createParticle(this.player.x, this.groundY, '#ff007f'));
      }
    }
  }

  slide(active) {
    if (active) {
      if (!this.player.isSliding && this.player.isGrounded) {
        this.player.isSliding = true;
        this.player.height = this.player.slideHeight;
        this.player.y = this.groundY - this.player.slideHeight;
        this.player.slideDuration = 0;
        
        // Spawn slide sparks
        for (let i = 0; i < 5; i++) {
          this.particles.push(this.createParticle(this.player.x, this.groundY, '#ff007f'));
        }
      }
    } else {
      if (this.player.isSliding) {
        this.player.isSliding = false;
        this.player.height = this.player.originalHeight;
        this.player.y = this.groundY - this.player.originalHeight;
      }
    }
  }

  createParticle(x, y, color) {
    return {
      x: x,
      y: y,
      vx: (Math.random() - 0.7) * 4 - 2,
      vy: (Math.random() - 0.5) * 4 - 2,
      size: Math.random() * 4 + 2,
      color: color || '#00f0ff',
      alpha: 1,
      decay: Math.random() * 0.03 + 0.01
    };
  }

  spawn() {
    this.spawnTimer++;
    if (this.spawnTimer >= this.nextSpawn) {
      this.spawnTimer = 0;
      this.nextSpawn = Math.random() * (this.maxSpawnDelay - this.minSpawnDelay) + this.minSpawnDelay;
      
      // Decide spawn type: 0 = Obstacle Ground, 1 = Obstacle Air (Laser net), 2 = Battery Row
      const type = Math.floor(Math.random() * 3);
      
      if (type === 0) {
        // Ground Spikes/Block
        this.obstacles.push({
          x: this.baseWidth,
          y: this.groundY - 50,
          width: 30 + Math.random() * 20,
          height: 50,
          type: 'ground',
          color: '#ff007f'
        });
      } else if (type === 1) {
        // High floating Laser network (must slide under)
        this.obstacles.push({
          x: this.baseWidth,
          y: this.groundY - 100,
          width: 40,
          height: 35,
          type: 'laser',
          color: '#00f0ff'
        });
      } else {
        // Spawn glowing Energy Cells
        const cellY = Math.random() > 0.5 ? this.groundY - 40 : this.groundY - 110;
        const count = 3;
        for (let i = 0; i < count; i++) {
          this.collectibles.push({
            x: this.baseWidth + i * 40,
            y: cellY,
            size: 8,
            active: true,
            color: '#00f0ff',
            pulse: 0
          });
        }
      }
    }
  }

  update() {
    if (this.gameState !== 'PLAYING') return;

    // Increase game speed gradually
    if (this.gameSpeed < this.maxGameSpeed) {
      this.gameSpeed += this.speedIncrement;
    }

    this.distance += this.gameSpeed / 60;
    this.score = Math.floor(this.distance * 10);
    this.onScoreUpdate(this.score);

    // Parallax background grid offset
    this.gridOffset = (this.gridOffset + this.gameSpeed) % 40;

    // Update background stars
    this.bgStars.forEach(star => {
      star.x -= star.speed * (this.gameSpeed * 0.1);
      if (star.x < 0) star.x = this.baseWidth;
    });

    // Screen shake/flash decay
    if (this.screenShake > 0) this.screenShake -= 0.5;
    if (this.flashDuration > 0) this.flashDuration -= 0.02;

    // --- Player Physics ---
    if (!this.player.isGrounded) {
      this.player.vy += this.player.gravity;
      this.player.y += this.player.vy;
      
      // Hit ground
      if (this.player.y + this.player.height >= this.groundY) {
        this.player.y = this.groundY - this.player.height;
        this.player.vy = 0;
        this.player.isGrounded = true;
      }
    }

    // Auto-timeout slide safety
    if (this.player.isSliding) {
      this.player.slideDuration++;
      if (this.player.slideDuration >= this.player.slideMaxDuration) {
        this.slide(false);
      }
    }

    // Spawn player particles trail
    if (Math.random() > 0.4) {
      const trailY = this.player.y + (this.player.isSliding ? 15 : 30);
      this.player.trail.push({
        x: this.player.x,
        y: trailY + (Math.random() - 0.5) * 10,
        size: Math.random() * 6 + 2,
        alpha: 0.6
      });
    }

    // Decay player trails
    this.player.trail.forEach(t => t.alpha -= 0.02);
    this.player.trail = this.player.trail.filter(t => t.alpha > 0);

    // --- Spawn logic ---
    this.spawn();

    // --- Update Obstacles ---
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.gameSpeed;

      // Dynamic collision check
      if (this.checkCollision(this.player, obs)) {
        this.handleHit();
        return;
      }

      if (obs.x + obs.width < 0) {
        this.obstacles.splice(i, 1);
      }
    }

    // --- Update Collectibles ---
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.x -= this.gameSpeed;
      col.pulse += 0.1;

      // Circle-to-rectangle check
      if (col.active && this.checkCircleRectCollision(col, this.player)) {
        col.active = false;
        this.score += 25;
        this.distance += 2.5; // push distance up
        if (window.sound) window.sound.playPing();
        
        // Spawn capture burst particles
        for (let p = 0; p < 10; p++) {
          this.particles.push(this.createParticle(col.x, col.y, '#00f0ff'));
        }
      }

      if (col.x + 20 < 0) {
        this.collectibles.splice(i, 1);
      }
    }

    // --- Update particles ---
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  checkCircleRectCollision(circle, rect) {
    const distX = Math.abs(circle.x - rect.x - rect.width/2);
    const distY = Math.abs(circle.y - rect.y - rect.height/2);

    if (distX > (rect.width/2 + circle.size)) return false;
    if (distY > (rect.height/2 + circle.size)) return false;

    if (distX <= (rect.width/2)) return true; 
    if (distY <= (rect.height/2)) return true;

    const dx = distX - rect.width/2;
    const dy = distY - rect.height/2;
    return (dx*dx + dy*dy <= circle.size*circle.size);
  }

  handleHit() {
    this.screenShake = 12;
    this.flashDuration = 0.5;
    this.gameState = 'GAMEOVER';
    if (window.sound) window.sound.playDamage();
    if (window.Responsive) Responsive.vibrate(15);
    
    // Epic damage explosion
    for (let i = 0; i < 30; i++) {
      this.particles.push(this.createParticle(this.player.x + 20, this.player.y + 30, '#ff007f'));
    }
    
    setTimeout(() => {
      this.onGameOver(this.score);
    }, 1000);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.baseWidth, this.baseHeight);

    // Dynamic screen shake transformation
    this.ctx.save();
    if (this.screenShake > 0) {
      const dx = (Math.random() - 0.5) * this.screenShake;
      const dy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(dx, dy);
    }

    // --- Draw Parallax Space Stars ---
    this.ctx.fillStyle = '#ffffff';
    this.bgStars.forEach(star => {
      this.ctx.globalAlpha = star.speed * 1.5;
      this.ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    this.ctx.globalAlpha = 1.0;

    // --- Draw Retro Neon Sun ---
    this.drawSun();

    // --- Draw Distant Grid Skyscrapers ---
    this.drawCity();

    // --- Draw Parallax Pseudo-3D Grid Floor ---
    this.drawFloorGrid();

    // --- Draw Collectibles ---
    this.collectibles.forEach(col => {
      if (!col.active) return;
      
      const glowSize = col.size + Math.sin(col.pulse) * 3;
      
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = col.color;
      this.ctx.fillStyle = col.color;
      
      this.ctx.beginPath();
      this.ctx.arc(col.x, col.y, col.size, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Draw concentric rings
      this.ctx.strokeStyle = col.color;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(col.x, col.y, glowSize + 5, 0, Math.PI * 2);
      this.ctx.stroke();
    });
    this.ctx.shadowBlur = 0; // reset glow

    // --- Draw Obstacles ---
    this.obstacles.forEach(obs => {
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = obs.color;
      this.ctx.fillStyle = obs.color;

      if (obs.type === 'ground') {
        // Draw sharp spikes / digital obelisks
        this.ctx.beginPath();
        this.ctx.moveTo(obs.x, obs.y + obs.height);
        this.ctx.lineTo(obs.x + obs.width / 2, obs.y);
        this.ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Spike outline glow
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(obs.x, obs.y + obs.height);
        this.ctx.lineTo(obs.x + obs.width / 2, obs.y);
        this.ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        this.ctx.stroke();
      } else {
        // Draw cybernetic laser gates
        this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(obs.x + 5, obs.y + 5, obs.width - 10, obs.height - 10);
      }
    });
    this.ctx.shadowBlur = 0; // reset glow

    // --- Draw Particles ---
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    // --- Draw Player Character ---
    if (this.gameState === 'PLAYING' || this.gameState === 'START') {
      // Draw Trails
      this.player.trail.forEach(t => {
        this.ctx.globalAlpha = t.alpha;
        this.ctx.fillStyle = '#ff007f';
        this.ctx.fillRect(t.x, t.y, this.player.width, this.player.isSliding ? this.player.slideHeight : this.player.originalHeight);
      });
      this.ctx.globalAlpha = 1.0;

      // Draw active player block
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = this.player.color;
      
      const grad = this.ctx.createLinearGradient(
        this.player.x, this.player.y, 
        this.player.x, this.player.y + this.player.height
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, '#ff007f');
      grad.addColorStop(1, '#660033');
      
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
      
      // Cybernetic glass visor on player block
      this.ctx.fillStyle = '#00f0ff';
      this.ctx.shadowColor = '#00f0ff';
      const visorHeight = 8;
      const visorY = this.player.y + (this.player.isSliding ? 6 : 12);
      this.ctx.fillRect(this.player.x + 10, visorY, this.player.width - 10, visorHeight);
      
      this.ctx.shadowBlur = 0; // reset glow
    }

    // --- Screen Hit Flash ---
    if (this.flashDuration > 0) {
      this.ctx.fillStyle = `rgba(255, 0, 127, ${this.flashDuration})`;
      this.ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);
    }

    this.ctx.restore();
  }

  drawSun() {
    const sunX = this.baseWidth / 2;
    const sunY = this.groundY - 140;
    const sunR = 80;

    this.ctx.save();
    
    // Sun glow
    this.ctx.shadowBlur = 30;
    this.ctx.shadowColor = '#ff5500';
    
    const grad = this.ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
    grad.addColorStop(0, '#ffaa00');
    grad.addColorStop(0.5, '#ff0055');
    grad.addColorStop(1, '#240038');
    
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // Draw horizontal split lines in sun (retro synthwave aesthetic)
    this.ctx.fillStyle = '#240038';
    this.ctx.globalAlpha = 0.95;
    for (let y = sunY - sunR; y < sunY + sunR; y += 12) {
      const distFromCenter = Math.abs(y - sunY);
      const ratio = distFromCenter / sunR;
      const lineHeight = Math.max(1, Math.floor(ratio * 5));
      this.ctx.fillRect(sunX - sunR - 10, y, sunR * 2 + 20, lineHeight);
    }
    this.ctx.restore();
  }

  drawCity() {
    this.ctx.fillStyle = 'rgba(26, 11, 46, 0.6)';
    this.ctx.strokeStyle = 'rgba(162, 0, 255, 0.15)';
    this.ctx.lineWidth = 1;
    
    // Dotted neon line silhouettes for dynamic cyberpunk cityscape
    const skyline = [
      { w: 50, h: 120, x: 50 },
      { w: 80, h: 180, x: 90 },
      { w: 60, h: 150, x: 160 },
      { w: 100, h: 90, x: 210 },
      { w: 40, h: 220, x: 300 },
      { w: 90, h: 130, x: 580 },
      { w: 60, h: 160, x: 660 },
      { w: 70, h: 200, x: 740 },
      { w: 90, h: 110, x: 800 }
    ];

    skyline.forEach(b => {
      // Draw building block
      const finalX = b.x;
      this.ctx.fillRect(finalX, this.groundY - b.h, b.w, b.h);
      this.ctx.strokeRect(finalX, this.groundY - b.h, b.w, b.h);
      
      // Draw building antennas
      if (b.h > 150) {
        this.ctx.strokeStyle = '#00f0ff';
        this.ctx.beginPath();
        this.ctx.moveTo(finalX + b.w/2, this.groundY - b.h);
        this.ctx.lineTo(finalX + b.w/2, this.groundY - b.h - 20);
        this.ctx.stroke();
      }
    });
  }

  drawFloorGrid() {
    // Solid retro floor color
    this.ctx.fillStyle = '#0a0214';
    this.ctx.fillRect(0, this.groundY, this.baseWidth, this.baseHeight - this.groundY);

    // Neon floor dividing horizon line
    this.ctx.strokeStyle = '#00f0ff';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.baseWidth, this.groundY);
    this.ctx.stroke();
    this.ctx.shadowBlur = 0; // reset glow

    // Drawing vertical gridlines converging at the horizon center
    this.ctx.strokeStyle = 'rgba(162, 0, 255, 0.4)';
    this.ctx.lineWidth = 2;
    const horizonCenter = this.baseWidth / 2;
    const lineCount = 20;
    
    for (let i = 0; i <= lineCount; i++) {
      const screenX = (this.baseWidth / lineCount) * i;
      
      // Converging math lines
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, this.baseHeight);
      this.ctx.lineTo(horizonCenter + (screenX - horizonCenter) * 0.15, this.groundY);
      this.ctx.stroke();
    }

    // Drawing horizontal gridlines scrolling downward (exponentially spaced for depth)
    this.ctx.strokeStyle = 'rgba(162, 0, 255, 0.35)';
    const maxHorizontalLines = 10;
    for (let i = 0; i < maxHorizontalLines; i++) {
      // Calculate scrolling spacing
      const scrollPos = (i * 35 + this.gridOffset) % 150;
      
      // Project spacing exponentially for deep parallax grid
      const normalizedPos = scrollPos / 150;
      const py = this.groundY + Math.pow(normalizedPos, 2.0) * (this.baseHeight - this.groundY);
      
      if (py > this.groundY) {
        this.ctx.lineWidth = 1 + normalizedPos * 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, py);
        this.ctx.lineTo(this.baseWidth, py);
        this.ctx.stroke();
      }
    }
  }

  start() {
    this.reset();
    this.gameState = 'PLAYING';
    this.triggerAchievement('play_runner');
  }

  stop() {
    this.gameState = 'START';
  }
}

window.CyberRunner = CyberRunner;
