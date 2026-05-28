class CosmicMerge {
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
    
    // Physics Chamber dimensions
    this.chamber = {
      x: this.baseWidth / 2 - 190,
      y: 50,
      width: 380,
      height: 460
    };

    // Danger Line near top
    this.dangerY = this.chamber.y + 70;
    this.dangerTimer = 0;
    this.dangerMaxTime = 180; // 3 seconds at 60fps
    
    // Cosmic Core Tiers configuration
    this.tiers = [
      { name: 'Spore', radius: 14, color: '#00f0ff', value: 2 },
      { name: 'Cell', radius: 20, color: '#00ff66', value: 4 },
      { name: 'Comet', radius: 28, color: '#a200ff', value: 8 },
      { name: 'Planet', radius: 38, color: '#ff007f', value: 16 },
      { name: 'Star', radius: 48, color: '#ffaa00', value: 32 },
      { name: 'Supernova', radius: 58, color: '#ff3300', value: 64 },
      { name: 'Black Hole', radius: 70, color: '#ffffff', value: 128 }
    ];

    this.reset();
    this.initInput();
  }

  reset() {
    this.score = 0;
    this.cores = [];
    this.particles = [];
    
    this.gravity = 0.35;
    this.friction = 0.98; // slowing speed on collisions
    this.bounce = 0.25; // bounciness of core collisions
    
    this.currentCore = null;
    this.nextCoreTier = this.getRandomSpawnTier();
    this.dropCooldown = 0;
    
    this.dangerTimer = 0;
    this.screenShake = 0;
    this.flashDuration = 0;

    this.spawnNextCore();
  }

  getRandomSpawnTier() {
    // Only spawn the first 3 small sizes to keep it tactical
    return Math.floor(Math.random() * 3);
  }

  spawnNextCore() {
    const tierIdx = this.nextCoreTier;
    const tier = this.tiers[tierIdx];
    
    this.currentCore = {
      x: this.baseWidth / 2,
      y: this.chamber.y + 30,
      vx: 0,
      vy: 0,
      radius: tier.radius,
      tier: tierIdx,
      color: tier.color,
      dropped: false
    };
    
    this.nextCoreTier = this.getRandomSpawnTier();
  }

  initInput() {
    const getChamberCoords = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.baseWidth / rect.width;
      const relativeX = (clientX - rect.left) * scaleX;
      return relativeX;
    };

    const handleMove = (x) => {
      if (!this.active || this.gameState !== 'PLAYING' || !this.currentCore || this.currentCore.dropped) return;
      
      // Restrain floating core to chamber walls
      const leftLimit = this.chamber.x + this.currentCore.radius + 2;
      const rightLimit = this.chamber.x + this.chamber.width - this.currentCore.radius - 2;
      
      this.currentCore.x = Math.max(leftLimit, Math.min(rightLimit, x));
    };

    const handleDrop = () => {
      if (!this.active || this.gameState !== 'PLAYING' || !this.currentCore || this.currentCore.dropped || this.dropCooldown > 0) return;
      
      this.currentCore.dropped = true;
      this.currentCore.vy = 1; // trigger fall
      this.cores.push(this.currentCore);
      
      this.dropCooldown = 45; // cooldown frames
      if (window.sound) window.sound.playLaser();
      
      setTimeout(() => {
        if (this.gameState === 'PLAYING') {
          this.spawnNextCore();
        }
      }, 600);
    };

    // Mouse Listeners
    this.canvas.addEventListener('mousemove', (e) => {
      handleMove(getChamberCoords(e.clientX, e.clientY));
    });

    this.canvas.addEventListener('mousedown', (e) => {
      handleDrop();
    });

    // Touch Listeners (drag & release to drop)
    this.canvas.addEventListener('touchmove', (e) => {
      if (!this.active || this.gameState !== 'PLAYING') return;
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(getChamberCoords(touch.clientX, touch.clientY));
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      if (!this.active || this.gameState !== 'PLAYING') return;
      e.preventDefault();
      handleDrop();
    }, { passive: false });
  }

  createSparks(x, y, color, count) {
    const num = count || 15;
    for (let i = 0; i < num; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        size: Math.random() * 5 + 2,
        color: color,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.015
      });
    }
  }

  update() {
    if (this.gameState !== 'PLAYING') return;

    if (this.dropCooldown > 0) this.dropCooldown--;
    if (this.screenShake > 0) this.screenShake -= 0.4;
    if (this.flashDuration > 0) this.flashDuration -= 0.02;

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

    // --- Physics Solver Loop ---
    // Apply gravity and update positions of dropped cores
    this.cores.forEach(c => {
      if (!c.dropped) return;
      
      c.vy += this.gravity;
      c.x += c.vx;
      c.y += c.vy;

      // Bottom Wall collision
      const bottomLimit = this.chamber.y + this.chamber.height - c.radius;
      if (c.y >= bottomLimit) {
        c.y = bottomLimit;
        c.vy = -c.vy * this.bounce;
        c.vx *= 0.85; // friction on ground
        
        if (Math.abs(c.vy) < 0.2) c.vy = 0;
      }

      // Chamber Wall Collisions
      const leftLimit = this.chamber.x + c.radius;
      const rightLimit = this.chamber.x + this.chamber.width - c.radius;
      if (c.x <= leftLimit) {
        c.x = leftLimit;
        c.vx = -c.vx * 0.6;
      }
      if (c.x >= rightLimit) {
        c.x = rightLimit;
        c.vx = -c.vx * 0.6;
      }
    });

    // Solve Circle-to-Circle collisions (using standard relaxation separation solver)
    this.solveCollisions();

    // Check danger line condition (cores piling too high)
    let inDangerZone = false;
    this.cores.forEach(c => {
      if (c.dropped && c.y - c.radius < this.dangerY && Math.abs(c.vy) < 0.5) {
        inDangerZone = true;
      }
    });

    if (inDangerZone) {
      this.dangerTimer++;
      if (this.dangerTimer >= this.dangerMaxTime) {
        this.handleGameOver();
        return;
      }
    } else {
      if (this.dangerTimer > 0) this.dangerTimer -= 2;
      if (this.dangerTimer < 0) this.dangerTimer = 0;
    }
  }

  solveCollisions() {
    const len = this.cores.length;
    let mergeTriggered = false;

    // Run collision check multiple passes to settle clusters tightly
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < len; i++) {
        for (let j = i + 1; j < len; j++) {
          const c1 = this.cores[i];
          const c2 = this.cores[j];
          
          if (!c1.dropped || !c2.dropped) continue;

          const dx = c2.x - c1.x;
          const dy = c2.y - c1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = c1.radius + c2.radius;

          if (dist < minDist) {
            // Collision detected!
            
            // --- Merge Check ---
            if (c1.tier === c2.tier && !mergeTriggered) {
              this.mergeCores(i, j);
              mergeTriggered = true; // only handle one merge per frame calculation to avoid index shifting bugs
              return;
            }

            // Normal Vector
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);

            // Separate overlapping circles equally
            const overlap = minDist - dist;
            c1.x -= nx * overlap * 0.5;
            c1.y -= ny * overlap * 0.5;
            c2.x += nx * overlap * 0.5;
            c2.y += ny * overlap * 0.5;

            // Re-constrain to walls during separation
            [c1, c2].forEach(c => {
              const left = this.chamber.x + c.radius;
              const right = this.chamber.x + this.chamber.width - c.radius;
              if (c.x < left) c.x = left;
              if (c.x > right) c.x = right;
            });

            // Calculate impulse response velocities
            const kx = c1.vx - c2.vx;
            const ky = c1.vy - c2.vy;
            const impulse = (kx * nx + ky * ny) * (1 + this.bounce) * 0.5;
            
            c1.vx -= nx * impulse;
            c1.vy -= ny * impulse;
            c2.vx += nx * impulse;
            c2.vy += ny * impulse;

            // Apply settling friction
            c1.vx *= this.friction;
            c1.vy *= this.friction;
            c2.vx *= this.friction;
            c2.vy *= this.friction;
          }
        }
      }
    }
  }

  mergeCores(idx1, idx2) {
    const c1 = this.cores[idx1];
    const c2 = this.cores[idx2];
    
    const midX = (c1.x + c2.x) / 2;
    const midY = (c1.y + c2.y) / 2;
    const nextTierIdx = c1.tier + 1;
    
    // Remove the two colliding cores
    // Sort indices descending to splice safely
    const firstIdx = Math.max(idx1, idx2);
    const secondIdx = Math.min(idx1, idx2);
    this.cores.splice(firstIdx, 1);
    this.cores.splice(secondIdx, 1);

    if (window.sound) window.sound.playMerge();
    this.screenShake = 6;

    // Check tier overflow
    if (nextTierIdx >= this.tiers.length) {
      // Merged two Black Holes (highest tier)! Clear both, massive points burst!
      this.score += 1000;
      this.onScoreUpdate(this.score);
      this.createSparks(midX, midY, '#ffffff', 40);
      this.flashDuration = 0.45;
      this.triggerAchievement('merge_blackhole');
      return;
    }

    // Spawn new merged core
    const nextTier = this.tiers[nextTierIdx];
    const mergedCore = {
      x: midX,
      y: midY,
      vx: (Math.random() - 0.5) * 3,
      vy: -2.5, // pop upwards slightly
      radius: nextTier.radius,
      tier: nextTierIdx,
      color: nextTier.color,
      dropped: true
    };
    
    this.cores.push(mergedCore);
    
    // Add merging spark visual effect
    this.createSparks(midX, midY, nextTier.color, 18);
    
    // Score update
    this.score += nextTier.value;
    this.onScoreUpdate(this.score);

    // Achievements updates based on tier merged
    if (nextTierIdx === 4) this.triggerAchievement('merge_star'); // Merged Neon Star
    if (nextTierIdx === 5) this.triggerAchievement('merge_supernova'); // Merged Supernova
  }

  handleGameOver() {
    this.gameState = 'GAMEOVER';
    this.screenShake = 15;
    this.flashDuration = 0.5;
    if (window.sound) window.sound.playDamage();
    
    // Dissolve all cores into particles
    this.cores.forEach(c => {
      this.createSparks(c.x, c.y, c.color, 8);
    });
    this.cores = [];
    
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

    // --- Draw UI background mesh lines ---
    this.ctx.strokeStyle = 'rgba(162, 0, 255, 0.04)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.baseWidth; x += 45) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.baseHeight);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.baseHeight; y += 45) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.baseWidth, y);
      this.ctx.stroke();
    }

    // --- Draw the Drop Chamber Container ---
    this.ctx.save();
    this.ctx.fillStyle = '#07010f';
    this.ctx.fillRect(this.chamber.x, this.chamber.y, this.chamber.width, this.chamber.height);
    
    // Draw Chamber glowing borders
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(this.chamber.x, this.chamber.y, this.chamber.width, this.chamber.height);
    this.ctx.restore();

    // --- Draw Danger Horizon Line ---
    this.ctx.save();
    this.ctx.lineWidth = 2;
    if (this.dangerTimer > 0) {
      const flash = Math.sin(this.dangerTimer * 0.15) > 0;
      this.ctx.strokeStyle = flash ? '#ff3300' : 'rgba(255, 51, 0, 0.2)';
      this.ctx.shadowBlur = flash ? 8 : 0;
      this.ctx.shadowColor = '#ff3300';
    } else {
      this.ctx.strokeStyle = 'rgba(255, 51, 0, 0.25)';
    }
    this.ctx.setLineDash([6, 6]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.chamber.x + 2, this.dangerY);
    this.ctx.lineTo(this.chamber.x + this.chamber.width - 2, this.dangerY);
    this.ctx.stroke();
    this.ctx.restore();

    // --- Draw floating current core indicator lines ---
    if (this.gameState === 'PLAYING' && this.currentCore && !this.currentCore.dropped) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      this.ctx.setLineDash([4, 4]);
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(this.currentCore.x, this.currentCore.y);
      this.ctx.lineTo(this.currentCore.x, this.chamber.y + this.chamber.height);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // --- Draw Particles ---
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    // --- Draw Active Dropped Cores ---
    this.cores.forEach(c => {
      this.drawCore(c);
    });

    // --- Draw current floating Spawning Core ---
    if (this.gameState === 'PLAYING' && this.currentCore && !this.currentCore.dropped) {
      this.drawCore(this.currentCore);
    }

    // --- Draw Danger HUD Warnings ---
    if (this.dangerTimer > 40) {
      this.ctx.save();
      this.ctx.fillStyle = '#ff3300';
      this.ctx.font = 'bold 15px Orbitron';
      this.ctx.textAlign = 'center';
      this.ctx.shadowBlur = 6;
      this.ctx.shadowColor = '#ff3300';
      this.ctx.fillText('DANGER ZONE ACCUMULATION!', this.baseWidth / 2, this.chamber.y + 25);
      this.ctx.restore();
    }

    // --- Draw "Next Core" Panel HUD ---
    this.drawNextCoreHUD();

    // --- Screen Hit Flash ---
    if (this.flashDuration > 0) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashDuration})`;
      this.ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);
    }

    this.ctx.restore();
  }

  drawCore(c) {
    this.ctx.save();
    this.ctx.shadowBlur = c.tier >= 3 ? 15 : 8;
    this.ctx.shadowColor = c.color;
    
    // Premium radial gradients to give volume and metallic texture
    const grad = this.ctx.createRadialGradient(
      c.x - c.radius * 0.2, c.y - c.radius * 0.2, c.radius * 0.1,
      c.x, c.y, c.radius
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, c.color);
    grad.addColorStop(1, '#020005');
    
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Distinct border matching tier glow
    this.ctx.strokeStyle = c.color;
    this.ctx.lineWidth = c.tier >= 4 ? 2 : 1.2;
    this.ctx.stroke();

    // Decorative inner design markings
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(c.x, c.y, c.radius * 0.6, 0, Math.PI * 2);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  drawNextCoreHUD() {
    const px = this.chamber.x + this.chamber.width + 45;
    const py = this.chamber.y + 110;
    
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(26, 11, 46, 0.5)';
    this.ctx.strokeStyle = 'rgba(162, 0, 255, 0.25)';
    this.ctx.lineWidth = 2;
    
    // Draw Next Core container box
    this.ctx.fillRect(px, py, 110, 110);
    this.ctx.strokeRect(px, py, 110, 110);

    // Label
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.font = '9px Orbitron';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('NEXT CORE', px + 55, py + 22);

    // Core Preview
    if (this.nextCoreTier !== null) {
      const tier = this.tiers[this.nextCoreTier];
      const previewCore = {
        x: px + 55,
        y: py + 62,
        radius: Math.min(22, tier.radius * 1.1),
        tier: this.nextCoreTier,
        color: tier.color
      };
      
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = previewCore.color;
      
      const grad = this.ctx.createRadialGradient(
        previewCore.x - previewCore.radius*0.2, previewCore.y - previewCore.radius*0.2, previewCore.radius*0.1,
        previewCore.x, previewCore.y, previewCore.radius
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, previewCore.color);
      grad.addColorStop(1, '#020005');
      
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(previewCore.x, previewCore.y, previewCore.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.strokeStyle = previewCore.color;
      this.ctx.stroke();
    }
    
    // Quick core visual cheat-sheet
    const sy = py + 140;
    this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
    this.ctx.font = '8px Orbitron';
    this.ctx.fillText('Tiers Progression:', px + 55, sy);
    
    this.tiers.forEach((t, i) => {
      const tx = px + 10 + i * 15;
      const ty = sy + 18;
      this.ctx.fillStyle = t.color;
      this.ctx.shadowBlur = 5;
      this.ctx.shadowColor = t.color;
      this.ctx.beginPath();
      this.ctx.arc(tx, ty, 5, 0, Math.PI * 2);
      this.ctx.fill();
    });
    
    this.ctx.restore();
  }

  start() {
    this.reset();
    this.gameState = 'PLAYING';
    this.triggerAchievement('play_merge');
  }

  stop() {
    this.gameState = 'START';
  }
}

window.CosmicMerge = CosmicMerge;
