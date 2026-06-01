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
    this.particlesRunning = false;
    
    this.loadStats();
    this.initUI();
    this.initResponsive();
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

  // ============================================
  // RESPONSIVE INITIALIZATION
  // ============================================
  initResponsive() {
    if (window.Responsive) {
      Responsive.init();

      // Handle orientation changes — re-fit canvas
      Responsive.onOrientationChange(() => {
        this.handleResize();
      });

      // Fullscreen change handler — update icon
      Responsive.onFullscreenChange(() => {
        const icon = document.querySelector('#btn-fullscreen i');
        const mobIcon = document.querySelector('#mob-fullscreen i');
        if (Responsive.isFullscreen()) {
          if (icon) icon.className = 'fas fa-compress';
          if (mobIcon) mobIcon.className = 'fas fa-compress';
        } else {
          if (icon) icon.className = 'fas fa-expand';
          if (mobIcon) mobIcon.className = 'fas fa-expand';
        }
      });
    }
  }

  handleResize() {
    const canvas = document.getElementById('game-canvas');
    if (canvas && this.activeGame) {
      Responsive.fitCanvasToContainer(canvas);
    }
  }

  // ============================================
  // UI INITIALIZATION
  // ============================================
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
      
      const toggleMute = () => {
        if (volSlider.value > 0) {
          volSlider.dataset.prevVol = volSlider.value;
          volSlider.value = 0;
          volIcon.className = 'fas fa-volume-mute';
          if (window.sound) window.sound.setVolume('master', 0);
        } else {
          volSlider.value = volSlider.dataset.prevVol || 0.5;
          volIcon.className = 'fas fa-volume-down';
          if (window.sound) window.sound.setVolume('master', parseFloat(volSlider.value));
        }
      };
      
      volIcon.addEventListener('click', toggleMute);
      volIcon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMute(); }
      });
    }

    // Card Clicks - Game Select (click + keyboard Enter)
    const cards = document.querySelectorAll('.game-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const gameId = card.getAttribute('data-game');
        this.launchGame(gameId);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });

    // Control Overlays
    const btnHome = document.getElementById('btn-home');
    const btnRestart = document.getElementById('btn-restart');
    const btnPause = document.getElementById('btn-pause');
    const btnResume = document.getElementById('btn-resume');
    const btnOverHome = document.getElementById('btn-over-home');
    const btnOverRestart = document.getElementById('btn-over-restart');
    const btnOverHomeSidebar = document.getElementById('btn-over-home-sidebar');
    const btnFullscreen = document.getElementById('btn-fullscreen');

    if (btnHome) btnHome.addEventListener('click', () => this.exitToDashboard());
    if (btnOverHome) btnOverHome.addEventListener('click', () => this.exitToDashboard());
    if (btnOverHomeSidebar) btnOverHomeSidebar.addEventListener('click', () => this.exitToDashboard());
    
    if (btnRestart) btnRestart.addEventListener('click', () => this.restartGame());
    if (btnOverRestart) btnOverRestart.addEventListener('click', () => this.restartGame());
    
    if (btnPause) {
      btnPause.addEventListener('click', () => this.togglePause());
    }
    
    if (btnResume) {
      btnResume.addEventListener('click', () => this.resumeGame());
    }

    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    }

    // --- Mobile toolbar buttons ---
    const mobPause = document.getElementById('mob-pause');
    const mobFullscreen = document.getElementById('mob-fullscreen');
    const mobJump = document.getElementById('mob-jump');
    const mobSlide = document.getElementById('mob-slide');

    if (mobPause) mobPause.addEventListener('click', () => this.togglePause());
    if (mobFullscreen) mobFullscreen.addEventListener('click', () => this.toggleFullscreen());

    // Runner touch buttons (wired in launchGame to pass to runner instance)
    // We store references so game engines can use them
    this.mobJumpBtn = mobJump;
    this.mobSlideBtn = mobSlide;

    // --- Sidebar toggle for mobile ---
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const gameplaySidebar = document.getElementById('gameplay-sidebar');
    if (sidebarToggle && gameplaySidebar) {
      sidebarToggle.addEventListener('click', () => {
        gameplaySidebar.classList.toggle('sidebar-open');
        const isOpen = gameplaySidebar.classList.contains('sidebar-open');
        sidebarToggle.innerHTML = isOpen
          ? '<i class="fas fa-info-circle"></i> INSTRUCTIONS ▲'
          : '<i class="fas fa-info-circle"></i> INSTRUCTIONS ▼';
      });
    }

    this.updateDashboardUI();
  }

  togglePause() {
    if (!this.activeGame) return;
    if (this.activeGame.gameState === 'PLAYING') {
      this.activeGame.gameState = 'PAUSED';
      document.getElementById('pause-overlay').style.display = 'flex';
    } else if (this.activeGame.gameState === 'PAUSED') {
      this.resumeGame();
    }
  }

  resumeGame() {
    if (this.activeGame && this.activeGame.gameState === 'PAUSED') {
      this.activeGame.gameState = 'PLAYING';
      document.getElementById('pause-overlay').style.display = 'none';
    }
  }

  toggleFullscreen() {
    if (window.Responsive) {
      Responsive.toggleFullscreen(document.documentElement);
    }
  }

  updateDashboardUI() {
    // Populate stats
    const gp = document.getElementById('stat-games-played');
    const tp = document.getElementById('stat-total-points');
    if (gp) gp.innerText = this.stats.gamesPlayed;
    if (tp) tp.innerText = this.stats.totalPoints;
    
    // High Scores on selection cards
    const rh = document.getElementById('runner-card-high');
    const bh = document.getElementById('breaker-card-high');
    const mh = document.getElementById('merge-card-high');
    if (rh) rh.innerText = this.stats.runnerHigh;
    if (bh) bh.innerText = this.stats.breakerHigh;
    if (mh) mh.innerText = this.stats.mergeHigh;

    // Populates achievements sidebar
    const grid = document.getElementById('achievements-list-grid');
    if (grid) {
      grid.innerHTML = '';
      
      Object.keys(this.achievementsList).forEach(key => {
        const ach = this.achievementsList[key];
        const unlocked = this.stats.unlockedAchievements.includes(key);
        
        const row = document.createElement('div');
        row.className = `achievement-row ${unlocked ? 'unlocked' : ''}`;
        row.setAttribute('role', 'listitem');
        
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

  // ============================================
  // BACKGROUND PARTICLES (performance-gated)
  // ============================================
  initParticles() {
    const canvas = document.getElementById('bg-particles');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Reduce particle count on mobile / low-perf devices
    const tier = window.Responsive ? Responsive.getPerformanceTier() : 'high';
    const isMob = window.Responsive ? Responsive.isMobile() : false;
    const particleCount = isMob ? 12 : (tier === 'low' ? 15 : 35);
    
    const particles = [];
    const colorOptions = ['rgba(255, 0, 127, 0.15)', 'rgba(0, 240, 255, 0.15)', 'rgba(162, 0, 255, 0.15)'];
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 6 + 2,
        color: colorOptions[Math.floor(Math.random() * colorOptions.length)]
      });
    }
    
    this.particlesRunning = true;
    
    const animate = () => {
      if (!this.particlesRunning) {
        // Pause particles during gameplay to save GPU
        requestAnimationFrame(animate);
        return;
      }
      
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

  // ============================================
  // GAME LAUNCHING
  // ============================================
  launchGame(gameId) {
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
    }
    
    this.activeGameId = gameId;
    
    // Pause background particles during gameplay
    this.particlesRunning = false;
    
    // Add body class for mobile spacing
    document.body.classList.add('game-active');
    
    // UI Panels toggle
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('gameplay-view').style.display = 'grid';
    
    // Hide Overlays
    document.getElementById('gameover-overlay').style.display = 'none';
    document.getElementById('pause-overlay').style.display = 'none';
    
    // Reset HUD Score
    document.getElementById('hud-score-value').innerText = '0';

    // Close sidebar on mobile
    const gameplaySidebar = document.getElementById('gameplay-sidebar');
    if (gameplaySidebar) gameplaySidebar.classList.remove('sidebar-open');

    // --- Configure mobile toolbar ---
    const mobileToolbar = document.getElementById('mobile-toolbar');
    const mobJump = document.getElementById('mob-jump');
    const mobSlide = document.getElementById('mob-slide');
    const isTouchDevice = window.Responsive ? Responsive.isTouchDevice() : false;
    
    if (mobileToolbar && isTouchDevice) {
      mobileToolbar.classList.add('active');
      
      if (gameId === 'runner') {
        // Show jump + slide buttons
        if (mobJump) mobJump.style.display = 'flex';
        if (mobSlide) mobSlide.style.display = 'flex';
      } else {
        // Breaker & Merge use canvas touch — hide jump/slide
        if (mobJump) mobJump.style.display = 'none';
        if (mobSlide) mobSlide.style.display = 'none';
      }
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
          <span class="instruction-key">SPACEBAR</span> or <span class="instruction-key">▲</span> : Jump<br>
          <span class="instruction-key">▼</span> : Slide/Duck
        </div>
        <p style="margin-top: 8px; font-size: 0.8rem; color: var(--neon-pink);">On mobile: Use bottom toolbar or swipe up/down on canvas.</p>
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
          <span class="instruction-key">CLICK</span> / <span class="instruction-key">SPACE</span> : Shoot Lasers
        </div>
        <p style="margin-top: 8px; font-size: 0.8rem; color: var(--neon-cyan);">On mobile: Drag finger on canvas to move paddle. Double-tap to fire lasers.</p>
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
        <p>Drop glowing cosmic cores into the chamber. Two identical cores merge to upgrade!</p>
        <div style="margin-top: 10px;">
          <span class="instruction-key">MOUSE</span> / <span class="instruction-key">TOUCH</span> : Position Core<br>
          <span class="instruction-key">CLICK</span> / <span class="instruction-key">TAP</span> : Drop Core
        </div>
        <p style="margin-top: 8px; font-size: 0.8rem; color: var(--neon-purple);">Don't let cores pile past the red danger line!</p>
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
    
    // Fit canvas after a brief delay to ensure layout is computed
    requestAnimationFrame(() => {
      this.handleResize();
    });
    
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
    const el = document.getElementById('hud-score-value');
    if (el) el.innerText = score;
  }

  gameOver(finalScore) {
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
    }
    
    // Vibration feedback
    if (window.Responsive) Responsive.vibrate(30);
    
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
    const scoreEl = document.getElementById('gameover-final-score');
    if (scoreEl) scoreEl.innerText = finalScore;
    
    const banner = document.getElementById('gameover-banner-high');
    if (isNewHigh) {
      if (banner) {
        banner.style.display = 'block';
        banner.innerText = "🏆 NEW ARCADE RECORD! 🏆";
      }
      // Extra vibration for new high score
      if (window.Responsive) Responsive.vibrate([30, 50, 30]);
    } else {
      if (banner) banner.style.display = 'none';
    }
    
    if (overlay) overlay.style.display = 'flex';
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
    
    // Resume background particles
    this.particlesRunning = true;
    
    // Remove body class
    document.body.classList.remove('game-active');
    
    if (window.sound) {
      window.sound.stopBGM();
    }
    
    // Exit fullscreen if active
    if (window.Responsive && Responsive.isFullscreen()) {
      Responsive.exitFullscreen();
    }
    
    // Hide mobile toolbar
    const mobileToolbar = document.getElementById('mobile-toolbar');
    if (mobileToolbar) mobileToolbar.classList.remove('active');
    
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

    // Vibration feedback
    if (window.Responsive) Responsive.vibrate([10, 20, 10]);

    // Display beautiful slide-in toast
    const toast = document.getElementById('achievement-toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastTitle = document.getElementById('toast-title');
    const toastName = document.getElementById('toast-name');
    
    if (toastIcon) toastIcon.innerText = ach.icon;
    if (toastTitle) toastTitle.innerText = `🏆 ACHIEVEMENT UNLOCKED!`;
    if (toastName) toastName.innerText = ach.title;

    if (toast) toast.classList.add('active');
    
    if (window.sound) window.sound.playPowerup();

    setTimeout(() => {
      if (toast) toast.classList.remove('active');
    }, 4000);
  }
}

// Instantiate central manager when DOM fully content loaded
window.addEventListener('DOMContentLoaded', () => {
  window.arcadeManager = new ArcadeManager();
});
