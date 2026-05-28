class ArcadeManager {
  constructor() {
    this.stats = {
      gamesPlayed: 0,
      totalPoints: 0,
      runnerHigh: 0,
      breakerHigh: 0,
      mergeHigh: 0,
      unlockedAchievements: []
    };
    
    this.achievementsList = {
      play_runner: { title: "System Initialized", desc: "First run in the Cyber-Runner void.", icon: "⚡" },
      play_breaker: { title: "Plasma Bounce", desc: "First break in the Neon Grid.", icon: "⚪" },
      play_merge: { title: "Cosmic Gravity", desc: "First drop in the Cosmic Chamber.", icon: "☄️" },
      breaker_multiball: { title: "Splitting Atoms", desc: "Activate Multi-Ball plasma split.", icon: "✨" },
      breaker_level: { title: "Grid Buster", desc: "Cleared a Neon Breaker brick layout.", icon: "🧱" },
      merge_star: { title: "Nuclear Fusion", desc: "Merged a Tier 5 Neon Star.", icon: "⭐" },
      merge_supernova: { title: "Stellar Collapse", desc: "Merged a Tier 6 Supernova.", icon: "💥" },
      merge_blackhole: { title: "Infinite Density", desc: "Merged two Black Holes!", icon: "🕳️" }
    };

    this.activeGame = null;
    this.activeGameId = null; // 'runner', 'breaker', 'merge'
    this.gameLoopId = null;
    
    this.loadStats();
    this.initUI();
    this.initParticles();
  }

  loadStats() {
    const saved = localStorage.getItem('neon_arcade_stats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.stats = { ...this.stats, ...parsed };
      } catch (e) {
        console.error("Failed to parse local storage stats.", e);
      }
    }
  }

  saveStats() {
    localStorage.setItem('neon_arcade_stats', JSON.stringify(this.stats));
    this.updateDashboardUI();
  }

  initUI() {
    // Volume adjustments
    const volSlider = document.getElementById('volume-slider');
    const volIcon = document.getElementById('volume-icon');
    
    if (volSlider && volIcon) {
      volSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (window.sound) {
          window.sound.setVolume('master', val);
        }
        if (val === 0) {
          volIcon.className = 'fas fa-volume-mute';
        } else if (val < 0.5) {
          volIcon.className = 'fas fa-volume-down';
        } else {
          volIcon.className = 'fas fa-volume-up';
        }
      });
      
      volIcon.addEventListener('click', () => {
        if (volSlider.value > 0) {
          volSlider.value = 0;
          volIcon.className = 'fas fa-volume-mute';
          if (window.sound) window.sound.setVolume('master', 0);
        } else {
          volSlider.value = 0.5;
          volIcon.className = 'fas fa-volume-down';
          if (window.sound) window.sound.setVolume('master', 0.5);
        }
      });
    }

    // Card Clicks - Game Select
    const cards = document.querySelectorAll('.game-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const gameId = card.getAttribute('data-game');
        this.launchGame(gameId);
      });
    });

    // Control Overlays
    const btnHome = document.getElementById('btn-home');
    const btnRestart = document.getElementById('btn-restart');
    const btnPause = document.getElementById('btn-pause');
    const btnResume = document.getElementById('btn-resume');
    const btnOverHome = document.getElementById('btn-over-home');
    const btnOverRestart = document.getElementById('btn-over-restart');

    if (btnHome) btnHome.addEventListener('click', () => this.exitToDashboard());
    if (btnOverHome) btnOverHome.addEventListener('click', () => this.exitToDashboard());
    
    if (btnRestart) btnRestart.addEventListener('click', () => this.restartGame());
    if (btnOverRestart) btnOverRestart.addEventListener('click', () => this.restartGame());
    
    if (btnPause) {
      btnPause.addEventListener('click', () => {
        if (this.activeGame && this.activeGame.gameState === 'PLAYING') {
          this.activeGame.gameState = 'PAUSED';
          document.getElementById('pause-overlay').style.display = 'flex';
        }
      });
    }
    
    if (btnResume) {
      btnResume.addEventListener('click', () => {
        if (this.activeGame && this.activeGame.gameState === 'PAUSED') {
          this.activeGame.gameState = 'PLAYING';
          document.getElementById('pause-overlay').style.display = 'none';
        }
      });
    }

    this.updateDashboardUI();
  }

  updateDashboardUI() {
    // Populate stats
    document.getElementById('stat-games-played').innerText = this.stats.gamesPlayed;
    document.getElementById('stat-total-points').innerText = this.stats.totalPoints;
    
    // High Scores on selection cards
    document.getElementById('runner-card-high').innerText = this.stats.runnerHigh;
    document.getElementById('breaker-card-high').innerText = this.stats.breakerHigh;
    document.getElementById('merge-card-high').innerText = this.stats.mergeHigh;

    // Populates achievements sidebar
    const grid = document.getElementById('achievements-list-grid');
    if (grid) {
      grid.innerHTML = '';
      
      Object.keys(this.achievementsList).forEach(key => {
        const ach = this.achievementsList[key];
        const unlocked = this.stats.unlockedAchievements.includes(key);
        
        const row = document.createElement('div');
        row.className = `achievement-row ${unlocked ? 'unlocked' : ''}`;
        
        row.innerHTML = `
          <div class="achievement-icon" style="color: ${unlocked ? 'var(--neon-yellow)' : 'var(--text-secondary)'}">${ach.icon}</div>
          <div class="achievement-details">
            <div class="achievement-title">${ach.title}</div>
            <div class="achievement-desc">${ach.desc}</div>
          </div>
        `;
        
        grid.appendChild(row);
      });
    }
  }

  initParticles() {
    const canvas = document.getElementById('bg-particles');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const colorOptions = ['rgba(255, 0, 127, 0.15)', 'rgba(0, 240, 255, 0.15)', 'rgba(162, 0, 255, 0.15)'];
    
    for (let i = 0; i < 35; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 6 + 2,
        color: colorOptions[Math.floor(Math.random() * colorOptions.length)]
      });
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(animate);
    };
    
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
    
    animate();
  }

  launchGame(gameId) {
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
    }
    
    this.activeGameId = gameId;
    
    // UI Panels toggle
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('gameplay-view').style.display = 'grid';
    
    // Hide Overlays
    document.getElementById('gameover-overlay').style.display = 'none';
    document.getElementById('pause-overlay').style.display = 'none';
    
    // Reset HUD Score
    document.getElementById('hud-score-value').innerText = '0';

    // Show mobile touch buttons if on small screens or simulation
    const touchCtrl = document.getElementById('touch-controls-layout');
    if (touchCtrl) {
      touchCtrl.style.display = gameId === 'runner' ? 'flex' : 'none';
    }

    // Set side instruction info panel
    const infoTitle = document.getElementById('game-info-title');
    const infoIcon = document.getElementById('game-info-icon');
    const infoInstructions = document.getElementById('game-instructions-box');
    
    if (window.sound) {
      window.sound.init();
      window.sound.startBGM();
    }
    
    // Init Game Engine Instance based on type selected
    if (gameId === 'runner') {
      infoTitle.innerText = 'Cyber-Runner';
      infoIcon.innerText = '⚡';
      infoIcon.style.color = 'var(--neon-pink)';
      infoIcon.style.textShadow = '0 0 10px var(--neon-pink)';
      infoInstructions.innerHTML = `
        <h4>HOW TO PLAY:</h4>
        <p>Race forward in the digital void! Jump spikes and slide under high beams.</p>
        <div style="margin-top: 10px;">
          <span class="instruction-key">SPACEBAR</span> or <span class="instruction-key">▲ Key</span> : Jump<br>
          <span class="instruction-key">▼ Key</span> : Slide/Duck
        </div>
        <p style="margin-top: 8px; font-size: 0.8rem; color: var(--neon-pink);">* Touch Controls active at the bottom on mobile devices.</p>
      `;
      
      this.activeGame = new window.CyberRunner(
        'game-canvas',
        (finalScore) => this.gameOver(finalScore),
        (score) => this.updateHUDScore(score),
        (achKey) => this.unlockAchievement(achKey)
      );
    } 
    else if (gameId === 'breaker') {
      infoTitle.innerText = 'Neon Breaker';
      infoIcon.innerText = '⚪';
      infoIcon.style.color = 'var(--neon-cyan)';
      infoIcon.style.textShadow = '0 0 10px var(--neon-cyan)';
      infoInstructions.innerHTML = `
        <h4>HOW TO PLAY:</h4>
        <p>Move the paddle left/right. Catch power-ups. Break all glowing bricks.</p>
        <div style="margin-top: 10px;">
          <span class="instruction-key">MOUSE</span> / <span class="instruction-key">TOUCH</span> : Move Paddle<br>
          <span class="instruction-key">CLICK</span> / <span class="instruction-key">SPACEBAR</span> : Shoot Lasers (when active)
        </div>
        <p style="margin-top: 8px; font-size: 0.8rem; color: var(--neon-cyan);">Powerups: [M] Multi-Ball, [L] Laser Blasters, [S] Boundary Shield, [T] Slow-mo, [E] Expand.</p>
      `;
      
      this.activeGame = new window.NeonBreaker(
        'game-canvas',
        (finalScore) => this.gameOver(finalScore),
        (score) => this.updateHUDScore(score),
        (achKey) => this.unlockAchievement(achKey)
      );
    } 
    else if (gameId === 'merge') {
      infoTitle.innerText = 'Cosmic Merge';
      infoIcon.innerText = '☄️';
      infoIcon.style.color = 'var(--neon-purple)';
      infoIcon.style.textShadow = '0 0 10px var(--neon-purple)';
      infoInstructions.innerHTML = `
        <h4>HOW TO PLAY:</h4>
        <p>Drop glowing cosmic cores into the chamber. Two identical cores merge to upgrade. Highly addictive!</p>
        <div style="margin-top: 10px;">
          <span class="instruction-key">MOUSE MOVE</span> / <span class="instruction-key">TOUCH</span> : Position Core<br>
          <span class="instruction-key">CLICK</span> / <span class="instruction-key">RELEASE</span> : Drop Core
        </div>
        <p style="margin-top: 8px; font-size: 0.8rem; color: var(--neon-purple);">* Don't let cores pile up past the dashed red line for 3 seconds!</p>
      `;
      
      this.activeGame = new window.CosmicMerge(
        'game-canvas',
        (finalScore) => this.gameOver(finalScore),
        (score) => this.updateHUDScore(score),
        (achKey) => this.unlockAchievement(achKey)
      );
    }
    
    // Start active game state
    this.activeGame.active = true;
    this.activeGame.start();
    
    // Start central animation tick loop
    this.tick();
  }

  tick() {
    if (!this.activeGame || !this.activeGame.active) return;
    
    this.activeGame.update();
    this.activeGame.draw();
    
    this.gameLoopId = requestAnimationFrame(() => this.tick());
  }

  updateHUDScore(score) {
    document.getElementById('hud-score-value').innerText = score;
  }

  gameOver(finalScore) {
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
    }
    
    // Store Stats
    this.stats.gamesPlayed++;
    this.stats.totalPoints += finalScore;
    
    let isNewHigh = false;
    if (this.activeGameId === 'runner' && finalScore > this.stats.runnerHigh) {
      this.stats.runnerHigh = finalScore;
      isNewHigh = true;
    } else if (this.activeGameId === 'breaker' && finalScore > this.stats.breakerHigh) {
      this.stats.breakerHigh = finalScore;
      isNewHigh = true;
    } else if (this.activeGameId === 'merge' && finalScore > this.stats.mergeHigh) {
      this.stats.mergeHigh = finalScore;
      isNewHigh = true;
    }
    
    this.saveStats();

    // Show Game Over Overlay
    const overlay = document.getElementById('gameover-overlay');
    document.getElementById('gameover-final-score').innerText = finalScore;
    
    const banner = document.getElementById('gameover-banner-high');
    if (isNewHigh) {
      banner.style.display = 'block';
      banner.innerText = "🏆 NEW ARCADE RECORD! 🏆";
    } else {
      banner.style.display = 'none';
    }
    
    overlay.style.display = 'flex';
  }

  restartGame() {
    this.launchGame(this.activeGameId);
  }

  exitToDashboard() {
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }
    
    if (this.activeGame) {
      this.activeGame.active = false;
      this.activeGame.stop();
      this.activeGame = null;
    }
    
    this.activeGameId = null;
    
    if (window.sound) {
      window.sound.stopBGM();
    }
    
    // Views toggling
    document.getElementById('dashboard-view').style.display = 'grid';
    document.getElementById('gameplay-view').style.display = 'none';
    
    this.updateDashboardUI();
  }

  unlockAchievement(key) {
    if (this.stats.unlockedAchievements.includes(key)) return;
    
    this.stats.unlockedAchievements.push(key);
    this.saveStats();
    
    const ach = this.achievementsList[key];
    if (!ach) return;

    // Display beautiful slide-in toast
    const toast = document.getElementById('achievement-toast');
    document.getElementById('toast-icon').innerText = ach.icon;
    document.getElementById('toast-title').innerText = `🏆 ACHIEVEMENT UNLOCKED!`;
    document.getElementById('toast-name').innerText = ach.title;

    toast.classList.add('active');
    
    if (window.sound) window.sound.playPowerup();

    setTimeout(() => {
      toast.classList.remove('active');
    }, 4000);
  }
}

// Instantiate central manager when DOM fully content loaded
window.addEventListener('DOMContentLoaded', () => {
  window.arcadeManager = new ArcadeManager();
});
