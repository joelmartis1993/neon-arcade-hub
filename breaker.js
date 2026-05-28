class NeonBreaker {
  constructor(canvasId, onGameOver, onScoreUpdate, triggerAchievement) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.onGameOver = onGameOver;
    this.onScoreUpdate = onScoreUpdate;
    this.triggerAchievement = triggerAchievement;

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
    this.level = 1;
    this.balls = [];
    this.bricks = [];
    this.powerups = [];
    this.particles = [];
    this.lasers = [];
    
    // Paddle details
    this.paddle = {
      x: this.baseWidth / 2 - 60,
      y: 490,
      width: 120,
      originalWidth: 120,
      height: 15,
      speed: 12,
      laserTimer: 0,
      laserActive: 0, // frame duration for laser powerup
      shieldActive: false, // bottom boundary bounce shield
      expandTimer: 0,
      slowMoTimer: 0,
      color: '#00f0ff'
    };

    // Keyboard inputs
    this.keys = {
      ArrowLeft: false,
      ArrowRight: false
    };

    this.spawnBall(this.baseWidth / 2, this.paddle.y - 15, 5, -5);

    // Grid Layout constants
    this.brickRows = 4;
    this.brickCols = 10;
    this.brickPadding = 8;
    this.brickOffsetTop = 60;
    this.brickOffsetLeft = 35;
    this.brickWidth = 82;
    this.brickHeight = 24;

    this.generateBricks();

    this.screenShake = 0;
    this.flashDuration = 0;
  }

  spawnBall(x, y, vx, vy) {
    this.balls.push({
      x: x,
      y: y,
      vx: vx || (Math.random() - 0.5) * 6,
      vy: vy || -6,
      radius: 8,
      speed: 6.5,
      color: '#00f0ff',
      trail: []
    });
  }

  generateBricks() {
    this.bricks = [];
    
    // Random brick arrangements depending on level
    const hpList = [1, 1, 2, 2, 3];
    for (let r = 0; r < this.brickRows + Math.floor(this.level / 2); r++) {
      for (let c = 0; c < this.brickCols; c++) {
        // Skip some bricks in later levels to create cool patterns
        if (this.level > 1 && (r + c) % 5 === 0 && Math.random() > 0.4) continue;
        
        const brickX = c * (this.brickWidth + this.brickPadding) + this.brickOffsetLeft;
        const brickY = r * (this.brickHeight + this.brickPadding) + this.brickOffsetTop;
        
        // Random HP
        const maxHp = hpList[Math.floor(Math.random() * Math.min(hpList.length, 3 + this.level))];
        
        this.bricks.push({
          x: brickX,
          y: brickY,
          width: this.brickWidth,
          height: this.brickHeight,
          hp: maxHp,
          maxHp: maxHp,
          active: true,
          color: maxHp === 3 ? '#ffaa00' : maxHp === 2 ? '#ff007f' : '#00f0ff'
        });
      }
    }
  }

  initInput() {
    // Mouse movement inside canvas
    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.active || this.gameState !== 'PLAYING') return;
      const rect = this.canvas.getBoundingClientRect();
      // Translate screen coordinates to base canvas math coordinates
      const scaleX = this.baseWidth / rect.width;
      const relativeX = (e.clientX - rect.left) * scaleX;
      
      this.paddle.x = relativeX - this.paddle.width / 2;
      this.constrainPaddle();
    });

    // Tap/Click to fire lasers
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.active || this.gameState !== 'PLAYING') return;
      if (this.paddle.laserActive > 0) {
        this.fireLasers();
      }
    });

    // Keyboard inputs fallback
    window.addEventListener('keydown', (e) => {
      if (!this.active || this.gameState !== 'PLAYING') return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        this.keys[e.key] = true;
      }
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (this.paddle.laserActive > 0) this.fireLasers();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.active || this.gameState !== 'PLAYING') return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        this.keys[e.key] = false;
      }
    });

    // Touch controls support for mobile
    this.canvas.addEventListener('touchmove', (e) => {
      if (!this.active || this.gameState !== 'PLAYING') return;
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.baseWidth / rect.width;
      const touch = e.touches[0];
      const relativeX = (touch.clientX - rect.left) * scaleX;
      
      this.paddle.x = relativeX - this.paddle.width / 2;
      this.constrainPaddle();
    }, { passive: false });

    // Touch tap to fire lasers
    this.canvas.addEventListener('touchstart', (e) => {
      if (!this.active || this.gameState !== 'PLAYING') return;
      if (this.paddle.laserActive > 0) {
        e.preventDefault();
        this.fireLasers();
      }
    }, { passive: false });
  }

  constrainPaddle() {
    if (this.paddle.x < 0) this.paddle.x = 0;
    if (this.paddle.x + this.paddle.width > this.baseWidth) {
      this.paddle.x = this.baseWidth - this.paddle.width;
    }
  }

  fireLasers() {
    if (this.paddle.laserTimer > 0) return;
    
    this.lasers.push({ x: this.paddle.x + 10, y: this.paddle.y, vy: -9, color: '#ff007f' });
    this.lasers.push({ x: this.paddle.x + this.paddle.width - 10, y: this.paddle.y, vy: -9, color: '#ff007f' });
    
    this.paddle.laserTimer = 18; // cooldown frame duration
    if (window.sound) window.sound.playLaser();
    this.screenShake = Math.max(this.screenShake, 3);
  }

  createSparks(x, y, color, count) {
    const num = count || 12;
    for (let i = 0; i < num; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        size: Math.random() * 4 + 2,
        color: color || '#00f0ff',
        alpha: 1,
        decay: Math.random() * 0.03 + 0.015
      });
    }
  }

  spawnPowerup(x, y) {
    const powerTypes = ['multi', 'laser', 'shield', 'slow', 'expand'];
    const type = powerTypes[Math.floor(Math.random() * powerTypes.length)];
    let color = '#fff';
    let text = '?';
    
    switch(type) {
      case 'multi': color = '#00f0ff'; text = 'M'; break;
      case 'laser': color = '#ff007f'; text = 'L'; break;
      case 'shield': color = '#ffaa00'; text = 'S'; break;
      case 'slow': color = '#a200ff'; text = 'T'; break;
      case 'expand': color = '#00ff66'; text = 'E'; break;
    }
    
    this.powerups.push({
      x: x,
      y: y,
      vy: 2.2,
      width: 25,
      height: 25,
      type: type,
      text: text,
      color: color,
      pulse: 0
    });
  }

  activatePowerup(type) {
    if (window.sound) window.sound.playPowerup();
    
    switch(type) {
      case 'multi':
        // Spawn 2 extra balls from the first active ball's location
        if (this.balls.length > 0) {
          const mainBall = this.balls[0];
          this.spawnBall(mainBall.x, mainBall.y, mainBall.vx - 2, -Math.abs(mainBall.vy));
          this.spawnBall(mainBall.x, mainBall.y, mainBall.vx + 2, -Math.abs(mainBall.vy));
        } else {
          this.spawnBall(this.baseWidth / 2, this.paddle.y - 15);
        }
        this.triggerAchievement('breaker_multiball');
        break;
      case 'laser':
        this.paddle.laserActive = 480; // 8 seconds at 60fps
        break;
      case 'shield':
        this.paddle.shieldActive = true;
        break;
      case 'slow':
        this.paddle.slowMoTimer = 480;
        this.balls.forEach(ball => {
          ball.vx *= 0.6;
          ball.vy *= 0.6;
        });
        break;
      case 'expand':
        this.paddle.expandTimer = 480;
        this.paddle.width = this.paddle.originalWidth * 1.5;
        this.constrainPaddle();
        break;
    }
  }

  update() {
    if (this.gameState !== 'PLAYING') return;

    // Shake & flash decay
    if (this.screenShake > 0) this.screenShake -= 0.4;
    if (this.flashDuration > 0) this.flashDuration -= 0.02;

    // Update timers
    if (this.paddle.laserTimer > 0) this.paddle.laserTimer--;
    if (this.paddle.laserActive > 0) this.paddle.laserActive--;
    
    if (this.paddle.expandTimer > 0) {
      this.paddle.expandTimer--;
      if (this.paddle.expandTimer === 0) {
        this.paddle.width = this.paddle.originalWidth;
        this.constrainPaddle();
      }
    }
    
    if (this.paddle.slowMoTimer > 0) {
      this.paddle.slowMoTimer--;
    }

    // Keyboard movement
    if (this.keys.ArrowLeft) {
      this.paddle.x -= this.paddle.speed;
      this.constrainPaddle();
    }
    if (this.keys.ArrowRight) {
      this.paddle.x += this.paddle.speed;
      this.constrainPaddle();
    }

    // --- Update Lasers ---
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      laser.y += laser.vy;
      
      // Laser hits brick check
      for (let b = 0; b < this.bricks.length; b++) {
        const brick = this.bricks[b];
        if (brick.active && 
            laser.x > brick.x && laser.x < brick.x + brick.width &&
            laser.y > brick.y && laser.y < brick.y + brick.height) {
          
          this.damageBrick(brick);
          this.lasers.splice(i, 1);
          break;
        }
      }

      if (laser.y < 0) {
        this.lasers.splice(i, 1);
      }
    }

    // --- Update Powerups ---
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.y += p.vy;
      p.pulse += 0.08;

      // Check collision with paddle
      if (p.x < this.paddle.x + this.paddle.width &&
          p.x + p.width > this.paddle.x &&
          p.y < this.paddle.y + this.paddle.height &&
          p.y + p.height > this.paddle.y) {
        
        this.activatePowerup(p.type);
        this.powerups.splice(i, 1);
        continue;
      }

      if (p.y > this.baseHeight) {
        this.powerups.splice(i, 1);
      }
    }

    // --- Update Balls ---
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      
      // Keep velocity scaled to current slow-mo or normal state speed limits
      let maxSpeed = this.paddle.slowMoTimer > 0 ? 4 : ball.speed + (this.level * 0.15);
      const currentSpeed = Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy);
      if (currentSpeed > 0.1) {
        ball.vx = (ball.vx / currentSpeed) * maxSpeed;
        ball.vy = (ball.vy / currentSpeed) * maxSpeed;
      }

      ball.x += ball.vx;
      ball.y += ball.vy;

      // Ball Trail
      if (Math.random() > 0.3) {
        ball.trail.push({ x: ball.x, y: ball.y, alpha: 0.6 });
      }
      ball.trail.forEach(t => t.alpha -= 0.04);
      ball.trail = ball.trail.filter(t => t.alpha > 0);

      // Bounce off walls
      if (ball.x - ball.radius <= 0) {
        ball.x = ball.radius;
        ball.vx = -ball.vx;
        if (window.sound) window.sound.playPing();
      }
      if (ball.x + ball.radius >= this.baseWidth) {
        ball.x = this.baseWidth - ball.radius;
        ball.vx = -ball.vx;
        if (window.sound) window.sound.playPing();
      }
      if (ball.y - ball.radius <= 0) {
        ball.y = ball.radius;
        ball.vy = -ball.vy;
        if (window.sound) window.sound.playPing();
      }

      // Shield active bottom bounce
      if (this.paddle.shieldActive && ball.y + ball.radius >= 510) {
        ball.y = 510 - ball.radius;
        ball.vy = -ball.vy;
        this.paddle.shieldActive = false;
        this.screenShake = 6;
        if (window.sound) window.sound.playPing();
      }

      // Ball drops off bottom
      if (ball.y - ball.radius > this.baseHeight) {
        this.balls.splice(i, 1);
        continue;
      }

      // Bounce off Paddle
      if (ball.x + ball.radius > this.paddle.x &&
          ball.x - ball.radius < this.paddle.x + this.paddle.width &&
          ball.y + ball.radius > this.paddle.y &&
          ball.y - ball.radius < this.paddle.y + this.paddle.height) {
        
        // Push ball up and deflect angle depending on where it hits the paddle
        ball.y = this.paddle.y - ball.radius;
        ball.vy = -Math.abs(ball.vy);
        
        // Deflect angle calculation
        const paddleCenter = this.paddle.x + this.paddle.width / 2;
        const collisionDiff = ball.x - paddleCenter;
        const normalizedDiff = collisionDiff / (this.paddle.width / 2);
        
        // Max angle deflection (70 degrees)
        ball.vx = normalizedDiff * ball.speed * 0.9;
        
        if (window.sound) window.sound.playPing();
        this.createSparks(ball.x, ball.y, '#00f0ff', 6);
      }

      // Bounce off Bricks
      for (let b = 0; b < this.bricks.length; b++) {
        const brick = this.bricks[b];
        if (!brick.active) continue;

        if (ball.x + ball.radius > brick.x &&
            ball.x - ball.radius < brick.x + brick.width &&
            ball.y + ball.radius > brick.y &&
            ball.y - ball.radius < brick.y + brick.height) {
          
          // Determine bounce face: Left/Right or Top/Bottom
          const overlapLeft = (ball.x + ball.radius) - brick.x;
          const overlapRight = (brick.x + brick.width) - (ball.x - ball.radius);
          const overlapTop = (ball.y + ball.radius) - brick.y;
          const overlapBottom = (brick.y + brick.height) - (ball.y - ball.radius);
          
          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
          
          if (minOverlap === overlapLeft) {
            ball.vx = -Math.abs(ball.vx);
            ball.x = brick.x - ball.radius;
          } else if (minOverlap === overlapRight) {
            ball.vx = Math.abs(ball.vx);
            ball.x = brick.x + brick.width + ball.radius;
          } else if (minOverlap === overlapTop) {
            ball.vy = -Math.abs(ball.vy);
            ball.y = brick.y - ball.radius;
          } else if (minOverlap === overlapBottom) {
            ball.vy = Math.abs(ball.vy);
            ball.y = brick.y + brick.height + ball.radius;
          }
          
          this.damageBrick(brick);
          break; // only hit one brick per ball calculation
        }
      }
    }

    // --- Check Game Over condition ---
    if (this.balls.length === 0) {
      this.handleGameOver();
      return;
    }

    // --- Check Level Clear condition ---
    const activeBricks = this.bricks.filter(b => b.active).length;
    if (activeBricks === 0) {
      this.levelUp();
    }

    // --- Update Particles ---
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

  damageBrick(brick) {
    brick.hp--;
    this.score += 50;
    this.onScoreUpdate(this.score);
    
    if (brick.hp <= 0) {
      brick.active = false;
      this.screenShake = Math.max(this.screenShake, 5);
      if (window.sound) window.sound.playExplosion();
      this.createSparks(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 18);
      
      // Chance of spawning powerup (18%)
      if (Math.random() < 0.18) {
        this.spawnPowerup(brick.x + brick.width / 2, brick.y + brick.height);
      }
    } else {
      this.screenShake = Math.max(this.screenShake, 2);
      if (window.sound) window.sound.playPing();
      this.createSparks(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 6);
      
      // Lighten brick colors on damage
      brick.color = brick.hp === 2 ? '#ff007f' : '#00f0ff';
    }
  }

  levelUp() {
    this.level++;
    this.flashDuration = 0.5;
    this.screenShake = 10;
    if (window.sound) window.sound.playPowerup();
    
    this.triggerAchievement('breaker_level');
    
    // Clear elements and reset balls
    this.balls = [];
    this.spawnBall(this.baseWidth / 2, this.paddle.y - 15);
    this.powerups = [];
    this.lasers = [];
    this.paddle.laserActive = 0;
    
    this.generateBricks();
  }

  handleGameOver() {
    this.gameState = 'GAMEOVER';
    this.screenShake = 12;
    if (window.sound) window.sound.playDamage();
    
    setTimeout(() => {
      this.onGameOver(this.score);
    }, 1000);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.baseWidth, this.baseHeight);

    this.ctx.save();
    if (this.screenShake > 0) {
      const dx = (Math.random() - 0.5) * this.screenShake;
      const dy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(dx, dy);
    }

    // --- Draw cyber background mesh lines ---
    this.ctx.strokeStyle = 'rgba(162, 0, 255, 0.04)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.baseWidth; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.baseHeight);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.baseHeight; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.baseWidth, y);
      this.ctx.stroke();
    }

    // --- Draw bottom safety shield wall ---
    if (this.paddle.shieldActive) {
      this.ctx.save();
      this.ctx.strokeStyle = '#ffaa00';
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = '#ffaa00';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 510);
      this.ctx.lineTo(this.baseWidth, 510);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // --- Draw Bricks ---
    this.bricks.forEach(brick => {
      if (!brick.active) return;

      this.ctx.save();
      this.ctx.shadowBlur = brick.hp === 3 ? 12 : 8;
      this.ctx.shadowColor = brick.color;
      
      const grad = this.ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, brick.color);
      
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
      
      // Brick borders
      this.ctx.strokeStyle = brick.color;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
      this.ctx.restore();
    });

    // --- Draw Lasers ---
    this.lasers.forEach(laser => {
      this.ctx.fillStyle = laser.color;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = laser.color;
      this.ctx.fillRect(laser.x - 2, laser.y, 4, 15);
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(laser.x - 1, laser.y + 3, 2, 9);
      this.ctx.shadowBlur = 0;
    });

    // --- Draw Powerups ---
    this.powerups.forEach(p => {
      const floatY = p.y + Math.sin(p.pulse) * 4;
      
      this.ctx.save();
      this.ctx.strokeStyle = p.color;
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = p.color;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.lineWidth = 2;
      
      // Capsule draw
      this.ctx.beginPath();
      this.ctx.arc(p.x + p.width/2, floatY + p.height/2, p.width/2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // Inside letter
      this.ctx.fillStyle = p.color;
      this.ctx.font = 'bold 12px Orbitron';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(p.text, p.x + p.width/2, floatY + p.height/2);
      this.ctx.restore();
    });

    // --- Draw Particles ---
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    // --- Draw Balls ---
    this.balls.forEach(ball => {
      // Draw Trails
      ball.trail.forEach(t => {
        this.ctx.fillStyle = ball.color;
        this.ctx.globalAlpha = t.alpha * 0.4;
        this.ctx.beginPath();
        this.ctx.arc(t.x, t.y, ball.radius - 1, 0, Math.PI * 2);
        this.ctx.fill();
      });
      this.ctx.globalAlpha = 1.0;

      // Draw Ball Core
      this.ctx.save();
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = ball.color;
      
      const grad = this.ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, ball.color);
      
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // --- Draw Paddle ---
    if (this.gameState === 'PLAYING') {
      this.ctx.save();
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = this.paddle.laserActive > 0 ? '#ff007f' : this.paddle.color;
      
      const grad = this.ctx.createLinearGradient(this.paddle.x, this.paddle.y, this.paddle.x, this.paddle.y + this.paddle.height);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, this.paddle.laserActive > 0 ? '#ff007f' : this.paddle.color);
      
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
      
      // Paddle edges highlights
      this.ctx.strokeStyle = this.paddle.laserActive > 0 ? '#ff007f' : this.paddle.color;
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);

      // Laser cannons (decorative notches) if laser active
      if (this.paddle.laserActive > 0) {
        this.ctx.fillStyle = '#ff007f';
        this.ctx.fillRect(this.paddle.x, this.paddle.y - 6, 8, 6);
        this.ctx.fillRect(this.paddle.x + this.paddle.width - 8, this.paddle.y - 6, 8, 6);
      }
      
      this.ctx.restore();
    }

    // --- Screen Hit Flash ---
    if (this.flashDuration > 0) {
      this.ctx.fillStyle = `rgba(0, 240, 255, ${this.flashDuration})`;
      this.ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);
    }

    this.ctx.restore();
  }

  start() {
    this.reset();
    this.gameState = 'PLAYING';
    this.triggerAchievement('play_breaker');
  }

  stop() {
    this.gameState = 'START';
  }
}

window.NeonBreaker = NeonBreaker;
