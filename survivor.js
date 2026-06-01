/* =============================================================================
   NEON SURVIVOR — Complete Game Engine
   A Vampire Survivors-inspired endless survival game with neon cyberpunk visuals.
   Pure HTML5 Canvas + Web Audio API. No dependencies.
   ============================================================================= */

// ============================================================================
// SECTION 1: CONSTANTS & CONFIGURATION
// ============================================================================
const ARENA_W = 4000;
const ARENA_H = 4000;
const PLAYER_RADIUS = 14;
const XP_MAGNET_BASE = 80;
const MAX_PARTICLES = 300;
const MAX_ENEMIES = 150;
const MAX_DMG_NUMS = 40;

const UPGRADE_DEFS = {
  damage_up:     { name:'Power Surge',     desc:'+15% Damage',         rarity:'common',    icon:'⚡', maxLvl:5, weight:50 },
  speed_up:      { name:'Overclock',       desc:'+12% Move Speed',     rarity:'common',    icon:'💨', maxLvl:5, weight:50 },
  attack_speed:  { name:'Rapid Fire',      desc:'+15% Attack Speed',   rarity:'common',    icon:'🔥', maxLvl:5, weight:50 },
  health_up:     { name:'Nano Repair',     desc:'+25 Max HP & Heal',   rarity:'common',    icon:'💚', maxLvl:5, weight:50 },
  regen:         { name:'Auto-Heal',       desc:'+1 HP/sec',           rarity:'common',    icon:'💗', maxLvl:3, weight:50 },
  magnet:        { name:'XP Magnet',       desc:'+40% Pickup Range',   rarity:'common',    icon:'🧲', maxLvl:3, weight:50 },
  double_shot:   { name:'Twin Pulse',      desc:'Fire 2 projectiles',  rarity:'rare',      icon:'🔫', maxLvl:1, weight:30 },
  chain_lightning:{ name:'Chain Lightning', desc:'Chains to 3 enemies', rarity:'rare',      icon:'⛓️', maxLvl:3, weight:30 },
  shield:        { name:'Energy Shield',   desc:'Block hit every 10s', rarity:'rare',      icon:'🛡️', maxLvl:3, weight:30 },
  critical:      { name:'Crit Module',     desc:'+15% Crit (2x dmg)',  rarity:'rare',      icon:'💥', maxLvl:3, weight:30 },
  homing:        { name:'Homing Missiles', desc:'Seeking projectiles', rarity:'epic',      icon:'🚀', maxLvl:3, weight:15 },
  laser:         { name:'Laser Beam',      desc:'Piercing laser',      rarity:'epic',      icon:'🔴', maxLvl:3, weight:15 },
  drones:        { name:'Orbit Drones',    desc:'Spinning damage orbs',rarity:'epic',      icon:'🛸', maxLvl:3, weight:15 },
  black_hole:    { name:'Black Hole',      desc:'Pulls in enemies',    rarity:'legendary', icon:'🕳️', maxLvl:2, weight:5 },
  plasma_storm:  { name:'Plasma Storm',    desc:'AoE damage aura',     rarity:'legendary', icon:'🌀', maxLvl:2, weight:5 },
  time_warp:     { name:'Time Warp',       desc:'Slow nearby enemies', rarity:'legendary', icon:'⏳', maxLvl:2, weight:5 },
};

const ENEMY_TYPES = {
  basic:    { name:'Drone',    hp:30,   speed:80,  dmg:10, r:12, color:'#00f0ff', xp:5,   score:10 },
  hunter:   { name:'Hunter',   hp:20,   speed:140, dmg:8,  r:10, color:'#ff007f', xp:8,   score:15 },
  tank:     { name:'Tank',     hp:100,  speed:50,  dmg:15, r:20, color:'#ffaa00', xp:15,  score:25 },
  exploder: { name:'Exploder', hp:25,   speed:100, dmg:25, r:14, color:'#ff3300', xp:12,  score:20 },
  elite:    { name:'Elite',    hp:200,  speed:70,  dmg:20, r:18, color:'#a200ff', xp:30,  score:50 },
  boss:     { name:'Boss',     hp:1500, speed:40,  dmg:30, r:40, color:'#ffffff', xp:200, score:500 },
};

const ACHIEVEMENTS = {
  survive_1min:  { name:'First Minute',    desc:'Survive 60 seconds',   icon:'⏱️', check: g => g.elapsed >= 60 },
  survive_5min:  { name:'Five Alive',      desc:'Survive 5 minutes',    icon:'⏱️', check: g => g.elapsed >= 300 },
  survive_10min: { name:'Veteran',         desc:'Survive 10 minutes',   icon:'🏅', check: g => g.elapsed >= 600 },
  level_10:      { name:'Power Up',        desc:'Reach level 10',       icon:'⬆️', check: g => g.player.level >= 10 },
  level_25:      { name:'Ascended',        desc:'Reach level 25',       icon:'👑', check: g => g.player.level >= 25 },
  kill_100:      { name:'Centurion',       desc:'Kill 100 enemies',     icon:'💀', check: g => g.player.totalKills >= 100 },
  kill_500:      { name:'Destroyer',       desc:'Kill 500 enemies',     icon:'☠️', check: g => g.player.totalKills >= 500 },
  kill_1000:     { name:'Annihilator',     desc:'Kill 1000 enemies',    icon:'🔥', check: g => g.player.totalKills >= 1000 },
  first_boss:    { name:'Boss Slayer',     desc:'Defeat a boss',        icon:'⚔️', check: g => g.bossesKilled >= 1 },
  score_10k:     { name:'Score Master',    desc:'Reach 10,000 score',   icon:'🌟', check: g => g.player.score >= 10000 },
};

// ============================================================================
// SECTION 2: SOUND ENGINE
// ============================================================================
class SurvivorSound {
  constructor() { this.ctx = null; this.masterGain = null; this.enabled = true; }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.4;
    this.masterGain.connect(this.ctx.destination);
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  _tone(freq, dur, type, vol, freqEnd) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur * 0.8);
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.masterGain);
    o.start(t); o.stop(t + dur);
  }

  _noise(dur, vol, freq) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const sz = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, sz, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
    const n = this.ctx.createBufferSource(); n.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(freq || 800, t); f.frequency.exponentialRampToValueAtTime(100, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(f); f.connect(g); g.connect(this.masterGain);
    n.start(t); n.stop(t + dur);
  }

  playShoot()      { this._tone(600, 0.08, 'sawtooth', 0.08, 200); }
  playHit()        { this._tone(200, 0.06, 'square', 0.06, 80); }
  playExplosion()  { this._noise(0.25, 0.15, 400); this._tone(80, 0.15, 'sine', 0.2, 20); }
  playLevelUp()    { [523,659,784,1047].forEach((f,i) => { setTimeout(() => this._tone(f, 0.15, 'triangle', 0.12), i * 50); }); }
  playBossSpawn()  { this._tone(80, 0.4, 'sawtooth', 0.2, 40); this._noise(0.5, 0.1, 200); }
  playAchievement(){ [392,523,659,784].forEach((f,i) => { setTimeout(() => this._tone(f, 0.18, 'triangle', 0.1), i * 60); }); }
  playPickup()     { this._tone(800, 0.06, 'sine', 0.06, 1200); }
  playDamage()     { this._tone(120, 0.12, 'sawtooth', 0.15, 50); }

  toggle() { this.enabled = !this.enabled; return this.enabled; }
}

// ============================================================================
// SECTION 3: SEEDED RANDOM (for Daily Challenge)
// ============================================================================
function createSeededRandom(seed) {
  let s = seed;
  return function() { s = (s * 1664525 + 1013904223) & 0xFFFFFFFF; return (s >>> 0) / 0xFFFFFFFF; };
}
function getDailySeed() { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate(); }

// ============================================================================
// SECTION 4: UTILITY FUNCTIONS
// ============================================================================
function dist(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx*dx + dy*dy); }
function angle(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
function fmtTime(s) { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return m + ':' + (sec < 10 ? '0' : '') + sec; }
function randRange(a, b) { return a + Math.random() * (b - a); }

// ============================================================================
// SECTION 5: MAIN GAME CLASS
// ============================================================================
class NeonSurvivorGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    this.sound = new SurvivorSound();
    this.state = 'menu'; // menu, playing, levelup, paused, gameover
    this.mode = 'endless';
    this.elapsed = 0;
    this.frameCount = 0;
    this.rng = Math.random; // overridden for daily mode

    // Player
    this.player = {};
    // Arrays
    this.enemies = [];
    this.projectiles = [];
    this.xpOrbs = [];
    this.particles = [];
    this.damageNumbers = [];
    this.weapons = [];
    this.upgradeLevels = {};
    this.activeEffects = { chainTargets:[], blackHoles:[], droneAngle:0 };

    // Camera
    this.camera = { x: 0, y: 0 };
    this.shake = { intensity: 0, x: 0, y: 0 };

    // Spawning
    this.spawnTimer = 0;
    this.bossTimer = 0;
    this.bossesKilled = 0;
    this.nextBossTime = 180;

    // Save data
    this.saveData = { bestTime:0, bestScore:0, bestLevel:0, totalKills:0, totalGames:0, achievements:[], soundEnabled:true };
    this.sessionAchievements = [];

    // Input
    this.keys = new Set();
    this.joystickVec = { x: 0, y: 0 };
    this.joystickActive = false;
    this.isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    this.loadSave();
    this.initCanvas();
    this.initInput();
    this.initJoystick();
    this.initUI();
    this.updateMenuRecords();
    this.showScreen('menu-screen');

    // Start game loop
    this.lastTime = 0;
    this.boundTick = this.tick.bind(this);
    requestAnimationFrame(this.boundTick);
  }

  // ---------- Canvas Setup ----------
  initCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.screenW = window.innerWidth;
    this.screenH = window.innerHeight;
  }

  // ---------- Input ----------
  initInput() {
    window.addEventListener('keydown', e => {
      this.keys.add(e.key);
      if (e.key === 'Escape') {
        if (this.state === 'playing') this.pauseGame();
        else if (this.state === 'paused') this.resumeGame();
      }
    });
    window.addEventListener('keyup', e => this.keys.delete(e.key));
  }

  getInputVector() {
    let vx = 0, vy = 0;
    if (this.joystickActive) { vx = this.joystickVec.x; vy = this.joystickVec.y; }
    else {
      if (this.keys.has('w') || this.keys.has('W') || this.keys.has('ArrowUp')) vy -= 1;
      if (this.keys.has('s') || this.keys.has('S') || this.keys.has('ArrowDown')) vy += 1;
      if (this.keys.has('a') || this.keys.has('A') || this.keys.has('ArrowLeft')) vx -= 1;
      if (this.keys.has('d') || this.keys.has('D') || this.keys.has('ArrowRight')) vx += 1;
    }
    const len = Math.sqrt(vx*vx + vy*vy);
    if (len > 1) { vx /= len; vy /= len; }
    return { x: vx, y: vy };
  }

  // ---------- Virtual Joystick ----------
  initJoystick() {
    const zone = document.getElementById('joystick-zone');
    const base = document.getElementById('joystick-base');
    const thumb = document.getElementById('joystick-thumb');
    if (!this.isTouchDevice) { zone.classList.add('hidden'); return; }

    let touchId = null;
    const baseRect = () => base.getBoundingClientRect();
    const maxDist = 40;

    const handleMove = (cx, cy) => {
      const r = baseRect();
      const centerX = r.left + r.width / 2;
      const centerY = r.top + r.height / 2;
      let dx = cx - centerX, dy = cy - centerY;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d > maxDist) { dx = dx / d * maxDist; dy = dy / d * maxDist; }
      thumb.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joystickVec.x = dx / maxDist;
      this.joystickVec.y = dy / maxDist;
      this.joystickActive = true;
    };

    zone.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      touchId = t.identifier;
      handleMove(t.clientX, t.clientY);
    }, { passive: false });

    zone.addEventListener('touchmove', e => {
      e.preventDefault();
      for (let t of e.changedTouches) {
        if (t.identifier === touchId) { handleMove(t.clientX, t.clientY); break; }
      }
    }, { passive: false });

    const resetJoystick = () => {
      touchId = null;
      thumb.style.transform = 'translate(0,0)';
      this.joystickVec.x = 0; this.joystickVec.y = 0;
      this.joystickActive = false;
    };
    zone.addEventListener('touchend', e => { for (let t of e.changedTouches) { if (t.identifier === touchId) { resetJoystick(); break; } } }, { passive: true });
    zone.addEventListener('touchcancel', resetJoystick, { passive: true });
  }

  // ---------- UI Buttons ----------
  initUI() {
    // Menu
    document.getElementById('btn-play').addEventListener('click', () => this.startGame());
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('mode-active'));
        btn.classList.add('mode-active');
        this.mode = btn.dataset.mode;
      });
    });
    document.getElementById('btn-sound-toggle').addEventListener('click', () => {
      this.sound.init();
      const on = this.sound.toggle();
      document.querySelector('#btn-sound-toggle i').className = on ? 'fas fa-volume-up' : 'fas fa-volume-mute';
      this.saveData.soundEnabled = on; this.saveSave();
    });

    // In-game
    document.getElementById('btn-ingame-pause').addEventListener('click', () => this.pauseGame());
    document.getElementById('btn-resume').addEventListener('click', () => this.resumeGame());
    document.getElementById('btn-restart-pause').addEventListener('click', () => { this.hideAllScreens(); this.startGame(); });
    document.getElementById('btn-menu-pause').addEventListener('click', () => this.goToMenu());
    document.getElementById('btn-retry').addEventListener('click', () => { this.hideAllScreens(); this.startGame(); });
    document.getElementById('btn-menu-over').addEventListener('click', () => this.goToMenu());
  }

  showScreen(id) { document.getElementById(id).classList.remove('hidden'); }
  hideScreen(id) { document.getElementById(id).classList.add('hidden'); }
  hideAllScreens() { ['menu-screen','levelup-screen','pause-screen','gameover-screen'].forEach(id => this.hideScreen(id)); }

  // ---------- Save/Load ----------
  loadSave() {
    try {
      const d = JSON.parse(localStorage.getItem('neon_survivor_data'));
      if (d) this.saveData = { ...this.saveData, ...d };
      this.sound.enabled = this.saveData.soundEnabled !== false;
    } catch(e) {}
  }
  saveSave() { localStorage.setItem('neon_survivor_data', JSON.stringify(this.saveData)); }

  updateMenuRecords() {
    document.getElementById('rec-time').textContent = fmtTime(this.saveData.bestTime);
    document.getElementById('rec-score').textContent = this.saveData.bestScore;
    document.getElementById('rec-level').textContent = this.saveData.bestLevel;
    document.getElementById('rec-kills').textContent = this.saveData.totalKills;
    const icon = document.querySelector('#btn-sound-toggle i');
    if (icon) icon.className = this.sound.enabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
  }

  // ---------- Start / Reset ----------
  startGame() {
    this.sound.init();
    this.hideAllScreens();
    document.getElementById('hud').classList.remove('hidden');
    if (this.isTouchDevice) document.getElementById('joystick-zone').classList.remove('hidden');

    this.rng = this.mode === 'daily' ? createSeededRandom(getDailySeed()) : Math.random.bind(Math);

    this.elapsed = 0;
    this.frameCount = 0;
    this.spawnTimer = 0;
    this.bossTimer = 0;
    this.bossesKilled = 0;
    this.nextBossTime = this.mode === 'boss_rush' ? 10 : 180;
    this.sessionAchievements = [];

    this.enemies = [];
    this.projectiles = [];
    this.xpOrbs = [];
    this.particles = [];
    this.damageNumbers = [];
    this.activeEffects = { chainTargets:[], blackHoles:[], droneAngle:0 };

    this.player = {
      x: ARENA_W / 2, y: ARENA_H / 2,
      hp: 100, maxHp: 100,
      speed: 150, level: 1, xp: 0, xpToNext: 15,
      totalKills: 0, score: 0,
      invulnTimer: 0,
      damageMulti: 1, speedMulti: 1, attackSpeedMulti: 1,
      critChance: 0, magnetRange: XP_MAGNET_BASE,
      regenRate: 0,
      shieldActive: false, shieldTimer: 0, shieldCooldown: 0, shieldMaxCooldown: 10,
      timeWarpRadius: 0, plasmaRadius: 0, plasmaLevel: 0,
    };

    this.weapons = [
      { type:'pulse', level:1, timer:0, cooldown:1.0, damage:15, projSpeed:500, projCount:1, range:350 }
    ];
    this.upgradeLevels = {};

    this.camera = { x: this.player.x, y: this.player.y };
    this.shake = { intensity:0, x:0, y:0 };

    this.state = 'playing';
  }

  pauseGame() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    const ps = document.getElementById('pause-stats');
    ps.innerHTML = `
      <div class="record-item"><span>Score</span><span style="color:var(--cyan);font-family:Orbitron;font-weight:700">${this.player.score}</span></div>
      <div class="record-item"><span>Time</span><span style="color:var(--cyan);font-family:Orbitron;font-weight:700">${fmtTime(this.elapsed)}</span></div>
      <div class="record-item"><span>Kills</span><span style="color:var(--cyan);font-family:Orbitron;font-weight:700">${this.player.totalKills}</span></div>
      <div class="record-item"><span>Level</span><span style="color:var(--cyan);font-family:Orbitron;font-weight:700">${this.player.level}</span></div>
    `;
    this.showScreen('pause-screen');
  }

  resumeGame() {
    this.hideScreen('pause-screen');
    this.state = 'playing';
  }

  goToMenu() {
    this.state = 'menu';
    this.hideAllScreens();
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('joystick-zone').classList.add('hidden');
    this.updateMenuRecords();
    this.showScreen('menu-screen');
  }

  // ======================================================================
  // GAME LOOP
  // ======================================================================
  tick(timestamp) {
    const dt = Math.min((timestamp - (this.lastTime || timestamp)) / 1000, 0.05);
    this.lastTime = timestamp;

    if (this.state === 'playing') {
      this.elapsed += dt;
      this.frameCount++;
      this.update(dt);
    }
    this.draw();
    requestAnimationFrame(this.boundTick);
  }

  // ======================================================================
  // UPDATE
  // ======================================================================
  update(dt) {
    this.updatePlayer(dt);
    this.updateWeapons(dt);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateXPOrbs(dt);
    this.updateParticles(dt);
    this.updateDamageNumbers(dt);
    this.updateEffects(dt);
    this.spawnLogic(dt);
    this.updateCamera(dt);
    this.updateShake(dt);

    // Periodic achievement check
    if (this.frameCount % 60 === 0) this.checkAchievements();

    this.updateHUD();
  }

  // ---------- Player ----------
  updatePlayer(dt) {
    const p = this.player;
    const input = this.getInputVector();
    const spd = p.speed * p.speedMulti;
    p.x += input.x * spd * dt;
    p.y += input.y * spd * dt;
    p.x = clamp(p.x, PLAYER_RADIUS, ARENA_W - PLAYER_RADIUS);
    p.y = clamp(p.y, PLAYER_RADIUS, ARENA_H - PLAYER_RADIUS);

    if (p.invulnTimer > 0) p.invulnTimer -= dt;

    // Regen
    if (p.regenRate > 0 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + p.regenRate * dt);
    }

    // Shield cooldown
    if (!p.shieldActive && p.shieldCooldown > 0) {
      p.shieldCooldown -= dt;
      if (p.shieldCooldown <= 0) p.shieldActive = true;
    }

    // Plasma Storm damage
    if (p.plasmaLevel > 0) {
      const pr = 80 + p.plasmaLevel * 30;
      p.plasmaRadius = pr;
      this.enemies.forEach(e => {
        if (dist(p, e) < pr) {
          e.hp -= (3 + p.plasmaLevel * 2) * p.damageMulti * dt * 60 / 60;
        }
      });
    }

    // Time Warp
    p.timeWarpRadius = this.upgradeLevels.time_warp ? 180 + this.upgradeLevels.time_warp * 40 : 0;
  }

  damagePlayer(dmg) {
    const p = this.player;
    if (p.invulnTimer > 0) return;

    // Shield absorb
    if (p.shieldActive && this.upgradeLevels.shield) {
      p.shieldActive = false;
      p.shieldCooldown = p.shieldMaxCooldown - (this.upgradeLevels.shield - 1) * 2;
      this.spawnParticles(p.x, p.y, '#00f0ff', 12, 4);
      return;
    }

    const finalDmg = this.mode === 'hardcore' ? dmg * 2 : dmg;
    p.hp -= finalDmg;
    p.invulnTimer = 0.5;
    this.shake.intensity = 6;
    this.sound.playDamage();
    this.spawnParticles(p.x, p.y, '#ff3300', 8, 3);
    this.addDmgNum(p.x, p.y - 20, Math.floor(finalDmg), '#ff3300', 1.2);

    if (p.hp <= 0) {
      p.hp = 0;
      this.gameOver();
    }
  }

  // ---------- Enemies ----------
  updateEnemies(dt) {
    const p = this.player;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Time Warp slow
      let spdMulti = 1;
      if (p.timeWarpRadius > 0 && dist(p, e) < p.timeWarpRadius) spdMulti = 0.4;

      // Move toward player
      const a = angle(e, p);
      e.x += Math.cos(a) * e.speed * spdMulti * dt;
      e.y += Math.sin(a) * e.speed * spdMulti * dt;

      // Collision with player
      if (dist(e, p) < e.r + PLAYER_RADIUS) {
        this.damagePlayer(e.dmg);
        // Knockback player
        const ka = angle(e, p);
        p.x += Math.cos(ka) * 30;
        p.y += Math.sin(ka) * 30;
        p.x = clamp(p.x, PLAYER_RADIUS, ARENA_W - PLAYER_RADIUS);
        p.y = clamp(p.y, PLAYER_RADIUS, ARENA_H - PLAYER_RADIUS);
      }

      // Black hole pull
      this.activeEffects.blackHoles.forEach(bh => {
        const d = dist(e, bh);
        if (d < bh.radius && d > 5) {
          const pull = 200 * (1 - d / bh.radius);
          const a2 = angle(e, bh);
          e.x += Math.cos(a2) * pull * dt;
          e.y += Math.sin(a2) * pull * dt;
          e.hp -= 2 * dt * p.damageMulti;
        }
      });

      // Death check
      if (e.hp <= 0) {
        this.killEnemy(i);
      }
    }
  }

  killEnemy(idx) {
    const e = this.enemies[idx];
    const p = this.player;

    // Particles
    this.spawnParticles(e.x, e.y, e.color, e.type === 'boss' ? 25 : 10, e.r * 0.3);
    this.sound.playExplosion();

    // Exploder AoE
    if (e.type === 'exploder') {
      const aoeR = 80;
      this.spawnParticles(e.x, e.y, '#ff3300', 15, 5);
      if (dist(e, p) < aoeR) this.damagePlayer(e.dmg);
    }

    // Drop XP orbs
    const xpVal = this.mode === 'hardcore' ? Math.floor(e.xpVal * 1.5) : e.xpVal;
    const orbCount = e.type === 'boss' ? 12 : (e.type === 'elite' ? 5 : 2);
    for (let i = 0; i < orbCount; i++) {
      this.xpOrbs.push({
        x: e.x + (this.rng() - 0.5) * 30,
        y: e.y + (this.rng() - 0.5) * 30,
        value: Math.ceil(xpVal / orbCount),
        r: 5, pulse: this.rng() * Math.PI * 2,
      });
    }

    // Score
    const scoreVal = this.mode === 'hardcore' ? e.scoreVal * 2 : e.scoreVal;
    p.score += scoreVal;
    p.totalKills++;
    if (e.type === 'boss') { this.bossesKilled++; this.shake.intensity = 10; }

    this.enemies.splice(idx, 1);
  }

  // ---------- Spawning ----------
  spawnLogic(dt) {
    // Spawn rate: starts at 1.5s, decreases over time
    let interval = Math.max(0.15, 1.5 - this.elapsed * 0.003);
    if (this.mode === 'boss_rush') interval *= 1.4; // fewer normal enemies in boss rush

    this.spawnTimer += dt;
    if (this.spawnTimer >= interval && this.enemies.length < MAX_ENEMIES) {
      this.spawnTimer = 0;
      const count = 1 + Math.floor(this.elapsed / 120); // spawn more over time
      for (let i = 0; i < Math.min(count, 5); i++) this.spawnEnemy();
    }

    // Boss spawns
    this.bossTimer += dt;
    if (this.bossTimer >= this.nextBossTime) {
      this.bossTimer = 0;
      this.spawnBoss();
      if (this.mode === 'boss_rush') this.nextBossTime = 30;
    }
  }

  spawnEnemy() {
    // Pick type based on elapsed time
    const types = ['basic'];
    if (this.elapsed > 60)  types.push('hunter');
    if (this.elapsed > 120) types.push('tank');
    if (this.elapsed > 180) types.push('exploder');
    if (this.elapsed > 300) types.push('elite');
    const typeKey = types[Math.floor(this.rng() * types.length)];
    this._spawnEnemyOfType(typeKey);
  }

  spawnBoss() {
    this.sound.playBossSpawn();
    // Show warning
    const warn = document.getElementById('boss-warning');
    warn.classList.remove('hidden');
    setTimeout(() => warn.classList.add('hidden'), 2500);
    this._spawnEnemyOfType('boss');
  }

  _spawnEnemyOfType(typeKey) {
    const def = ENEMY_TYPES[typeKey];
    const p = this.player;

    // Spawn outside visible area
    const buffer = 100;
    const halfW = this.screenW / 2 + buffer;
    const halfH = this.screenH / 2 + buffer;
    let ex, ey;
    const side = Math.floor(this.rng() * 4);
    if (side === 0) { ex = p.x + halfW; ey = p.y + (this.rng() - 0.5) * halfH * 2; }
    else if (side === 1) { ex = p.x - halfW; ey = p.y + (this.rng() - 0.5) * halfH * 2; }
    else if (side === 2) { ey = p.y + halfH; ex = p.x + (this.rng() - 0.5) * halfW * 2; }
    else { ey = p.y - halfH; ex = p.x + (this.rng() - 0.5) * halfW * 2; }
    ex = clamp(ex, 10, ARENA_W - 10);
    ey = clamp(ey, 10, ARENA_H - 10);

    // Difficulty scaling
    const timeFactor = 1 + this.elapsed * 0.003;
    let hp = def.hp * timeFactor;
    if (this.mode === 'hardcore') hp *= 2;

    this.enemies.push({
      x: ex, y: ey,
      hp, maxHp: hp,
      speed: def.speed * (1 + this.elapsed * 0.0005),
      dmg: this.mode === 'hardcore' ? def.dmg * 2 : def.dmg,
      r: def.r, color: def.color,
      type: typeKey,
      xpVal: def.xp, scoreVal: def.score,
    });
  }

  // ---------- Weapons ----------
  updateWeapons(dt) {
    this.weapons.forEach(w => {
      w.timer -= dt * this.player.attackSpeedMulti;
      if (w.timer <= 0) {
        w.timer = w.cooldown;
        this.fireWeapon(w);
      }
    });

    // Chain lightning
    if (this.upgradeLevels.chain_lightning) {
      this._chainTimer = (this._chainTimer || 0) - dt * this.player.attackSpeedMulti;
      if (this._chainTimer <= 0) {
        this._chainTimer = 2.0;
        this.fireChainLightning();
      }
    }

    // Homing missiles
    if (this.upgradeLevels.homing) {
      this._homingTimer = (this._homingTimer || 0) - dt * this.player.attackSpeedMulti;
      if (this._homingTimer <= 0) {
        this._homingTimer = 2.5 - (this.upgradeLevels.homing - 1) * 0.4;
        this.fireHoming();
      }
    }

    // Laser
    if (this.upgradeLevels.laser) {
      this._laserTimer = (this._laserTimer || 0) - dt * this.player.attackSpeedMulti;
      if (this._laserTimer <= 0) {
        this._laserTimer = 3.0 - (this.upgradeLevels.laser - 1) * 0.5;
        this.fireLaser();
      }
    }

    // Black Hole
    if (this.upgradeLevels.black_hole) {
      this._bhTimer = (this._bhTimer || 0) - dt;
      if (this._bhTimer <= 0) {
        this._bhTimer = 8;
        const a2 = this.rng() * Math.PI * 2;
        const d = 100 + this.rng() * 150;
        this.activeEffects.blackHoles.push({
          x: this.player.x + Math.cos(a2) * d,
          y: this.player.y + Math.sin(a2) * d,
          radius: 100 + (this.upgradeLevels.black_hole - 1) * 40,
          life: 3, maxLife: 3,
        });
      }
    }

    // Drones orbit
    if (this.upgradeLevels.drones) {
      this.activeEffects.droneAngle += dt * 3;
      const droneCount = this.upgradeLevels.drones + 1;
      const droneR = 80;
      const droneDmg = (8 + this.upgradeLevels.drones * 4) * this.player.damageMulti;
      for (let i = 0; i < droneCount; i++) {
        const da = this.activeEffects.droneAngle + (Math.PI * 2 / droneCount) * i;
        const dx = this.player.x + Math.cos(da) * droneR;
        const dy = this.player.y + Math.sin(da) * droneR;
        this.enemies.forEach(e => {
          if (dist({x:dx,y:dy}, e) < e.r + 10) {
            e.hp -= droneDmg * dt;
            if (this.frameCount % 10 === 0) this.spawnParticles(dx, dy, '#a200ff', 2, 2);
          }
        });
      }
    }
  }

  fireWeapon(w) {
    const p = this.player;
    const nearest = this.findNearest(p, this.enemies, w.range);
    if (!nearest) return;

    this.sound.playShoot();
    const a = angle(p, nearest);
    const count = w.projCount + (this.upgradeLevels.double_shot ? 1 : 0);
    const spread = count > 1 ? 0.15 : 0;

    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spread;
      const isCrit = this.rng() < p.critChance;
      const dmg = w.damage * p.damageMulti * (isCrit ? 2 : 1);
      this.projectiles.push({
        x: p.x, y: p.y,
        vx: Math.cos(a + offset) * w.projSpeed,
        vy: Math.sin(a + offset) * w.projSpeed,
        damage: dmg, life: 1.2, r: 4,
        color: isCrit ? '#ffaa00' : '#00f0ff',
        piercing: false, homing: false, crit: isCrit,
      });
    }
  }

  fireChainLightning() {
    const p = this.player;
    const targets = [];
    let current = p;
    const chainCount = 2 + this.upgradeLevels.chain_lightning;
    const chainRange = 150;
    const dmg = (20 + this.upgradeLevels.chain_lightning * 8) * p.damageMulti;

    for (let i = 0; i < chainCount; i++) {
      const near = this.findNearest(current, this.enemies.filter(e => !targets.includes(e)), chainRange);
      if (!near) break;
      targets.push(near);
      const isCrit = this.rng() < p.critChance;
      const fd = dmg * (isCrit ? 2 : 1);
      near.hp -= fd;
      this.addDmgNum(near.x, near.y - near.r, Math.floor(fd), isCrit ? '#ffaa00' : '#00f0ff', isCrit ? 1.4 : 1);
      this.spawnParticles(near.x, near.y, '#00f0ff', 4, 2);
      current = near;
    }
    this.activeEffects.chainTargets = targets.map(t => ({x:t.x, y:t.y}));
    this._chainVisTimer = 0.2;
    if (targets.length > 0) this.sound.playShoot();
  }

  fireHoming() {
    const p = this.player;
    const nearest = this.findNearest(p, this.enemies, 500);
    if (!nearest) return;
    this.sound.playShoot();
    const count = this.upgradeLevels.homing;
    for (let i = 0; i < count; i++) {
      const a = angle(p, nearest) + (this.rng() - 0.5) * 0.5;
      this.projectiles.push({
        x: p.x, y: p.y,
        vx: Math.cos(a) * 250, vy: Math.sin(a) * 250,
        damage: (12 + this.upgradeLevels.homing * 5) * p.damageMulti,
        life: 2.5, r: 5, color: '#ff007f',
        piercing: false, homing: true, crit: false,
      });
    }
  }

  fireLaser() {
    const p = this.player;
    const nearest = this.findNearest(p, this.enemies, 500);
    if (!nearest) return;
    this.sound.playShoot();
    const a = angle(p, nearest);
    const dmg = (25 + this.upgradeLevels.laser * 10) * p.damageMulti;
    // Piercing beam — check all enemies in a line
    const beamLen = 600;
    const beamW = 12;
    this.enemies.forEach(e => {
      // Point-to-line distance
      const dx = e.x - p.x, dy = e.y - p.y;
      const proj = dx * Math.cos(a) + dy * Math.sin(a);
      if (proj < 0 || proj > beamLen) return;
      const perp = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
      if (perp < beamW + e.r) {
        const isCrit = this.rng() < p.critChance;
        const fd = dmg * (isCrit ? 2 : 1);
        e.hp -= fd;
        this.addDmgNum(e.x, e.y - e.r, Math.floor(fd), isCrit ? '#ffaa00' : '#ff3300', isCrit ? 1.4 : 1);
        this.spawnParticles(e.x, e.y, '#ff3300', 3, 2);
      }
    });
    this._laserBeam = { x: p.x, y: p.y, angle: a, len: beamLen, timer: 0.15 };
  }

  findNearest(origin, arr, maxRange) {
    let best = null, bestD = maxRange || Infinity;
    arr.forEach(e => { const d = dist(origin, e); if (d < bestD) { bestD = d; best = e; } });
    return best;
  }

  // ---------- Projectiles ----------
  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      // Homing steering
      if (pr.homing) {
        const target = this.findNearest(pr, this.enemies, 300);
        if (target) {
          const desired = angle(pr, target);
          const current = Math.atan2(pr.vy, pr.vx);
          let diff = desired - current;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const steer = clamp(diff, -3 * dt, 3 * dt);
          const newA = current + steer;
          const spd = Math.sqrt(pr.vx * pr.vx + pr.vy * pr.vy);
          pr.vx = Math.cos(newA) * spd;
          pr.vy = Math.sin(newA) * spd;
        }
      }

      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;

      // Trail particles
      if (this.frameCount % 3 === 0) {
        this.particles.push({ x:pr.x, y:pr.y, vx:(this.rng()-0.5)*20, vy:(this.rng()-0.5)*20, r:2, color:pr.color, alpha:0.5, decay:3 });
      }

      if (pr.life <= 0) { this.projectiles.splice(i, 1); continue; }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (dist(pr, e) < pr.r + e.r) {
          e.hp -= pr.damage;
          this.addDmgNum(e.x, e.y - e.r, Math.floor(pr.damage), pr.crit ? '#ffaa00' : '#fff', pr.crit ? 1.5 : 1);
          this.spawnParticles(e.x, e.y, e.color, 4, 2);
          this.sound.playHit();
          if (!pr.piercing) { this.projectiles.splice(i, 1); break; }
        }
      }
    }
  }

  // ---------- XP Orbs ----------
  updateXPOrbs(dt) {
    const p = this.player;
    for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
      const orb = this.xpOrbs[i];
      orb.pulse += dt * 3;

      const d = dist(orb, p);
      if (d < p.magnetRange) {
        const a = angle(orb, p);
        const pull = Math.min(600, 400 * (1 - d / p.magnetRange) + 100);
        orb.x += Math.cos(a) * pull * dt;
        orb.y += Math.sin(a) * pull * dt;
      }

      if (d < PLAYER_RADIUS + orb.r + 5) {
        p.xp += orb.value;
        p.score += orb.value;
        this.sound.playPickup();
        this.xpOrbs.splice(i, 1);
        this.checkLevelUp();
      }
    }
  }

  checkLevelUp() {
    const p = this.player;
    while (p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext;
      p.level++;
      p.xpToNext = Math.floor(p.xpToNext * 1.35);
      this.sound.playLevelUp();
      this.spawnParticles(p.x, p.y, '#00f0ff', 20, 5);
      this.spawnParticles(p.x, p.y, '#ff007f', 15, 4);
      this.showLevelUp();
      return; // pause for upgrade choice
    }
  }

  // ---------- Effects ----------
  updateEffects(dt) {
    // Chain lightning visual
    if (this._chainVisTimer > 0) this._chainVisTimer -= dt;
    else this.activeEffects.chainTargets = [];

    // Black holes
    for (let i = this.activeEffects.blackHoles.length - 1; i >= 0; i--) {
      const bh = this.activeEffects.blackHoles[i];
      bh.life -= dt;
      if (this.frameCount % 4 === 0) {
        const a = this.rng() * Math.PI * 2;
        const d = this.rng() * bh.radius;
        this.particles.push({ x:bh.x+Math.cos(a)*d, y:bh.y+Math.sin(a)*d, vx:(this.rng()-0.5)*10, vy:(this.rng()-0.5)*10, r:2, color:'#a200ff', alpha:0.6, decay:2 });
      }
      if (bh.life <= 0) this.activeEffects.blackHoles.splice(i, 1);
    }

    // Laser beam decay
    if (this._laserBeam) {
      this._laserBeam.timer -= dt;
      if (this._laserBeam.timer <= 0) this._laserBeam = null;
    }
  }

  // ---------- Particles ----------
  spawnParticles(x, y, color, count, maxSpd) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) return;
      const a = this.rng() * Math.PI * 2;
      const s = this.rng() * (maxSpd || 3);
      this.particles.push({ x, y, vx: Math.cos(a)*s*60, vy: Math.sin(a)*s*60, r: 1 + this.rng()*3, color, alpha:1, decay: 1.5 + this.rng() });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }
  }

  // ---------- Damage Numbers ----------
  addDmgNum(x, y, text, color, scale) {
    if (this.damageNumbers.length >= MAX_DMG_NUMS) this.damageNumbers.shift();
    this.damageNumbers.push({ x, y, text: String(text), color: color || '#fff', scale: scale || 1, alpha: 1, vy: -60 });
  }

  updateDamageNumbers(dt) {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.y += d.vy * dt;
      d.alpha -= dt * 1.2;
      if (d.alpha <= 0) this.damageNumbers.splice(i, 1);
    }
  }

  // ---------- Camera ----------
  updateCamera(dt) {
    this.camera.x = lerp(this.camera.x, this.player.x, 0.08);
    this.camera.y = lerp(this.camera.y, this.player.y, 0.08);
  }

  updateShake(dt) {
    if (this.shake.intensity > 0.1) {
      this.shake.x = (this.rng() - 0.5) * this.shake.intensity * 2;
      this.shake.y = (this.rng() - 0.5) * this.shake.intensity * 2;
      this.shake.intensity *= 0.9;
    } else {
      this.shake.x = 0; this.shake.y = 0; this.shake.intensity = 0;
    }
  }

  // ======================================================================
  // LEVEL UP SYSTEM
  // ======================================================================
  showLevelUp() {
    this.state = 'levelup';
    document.getElementById('levelup-level').textContent = `Level ${this.player.level}`;

    // Pick 3 random upgrades (weighted, excluding maxed)
    const pool = [];
    Object.entries(UPGRADE_DEFS).forEach(([id, def]) => {
      const currentLvl = this.upgradeLevels[id] || 0;
      if (currentLvl < def.maxLvl) {
        for (let w = 0; w < def.weight; w++) pool.push(id);
      }
    });

    const chosen = [];
    for (let i = 0; i < 3 && pool.length > 0; i++) {
      const idx = Math.floor(this.rng() * pool.length);
      const id = pool[idx];
      if (!chosen.includes(id)) {
        chosen.push(id);
        // Remove all instances of this id from pool
        for (let j = pool.length - 1; j >= 0; j--) { if (pool[j] === id) pool.splice(j, 1); }
      } else { i--; } // retry
    }

    const container = document.getElementById('upgrade-choices');
    container.innerHTML = '';
    chosen.forEach(id => {
      const def = UPGRADE_DEFS[id];
      const lvl = (this.upgradeLevels[id] || 0) + 1;
      const card = document.createElement('div');
      card.className = `upgrade-card rarity-${def.rarity}`;
      card.innerHTML = `
        <div class="upgrade-icon">${def.icon}</div>
        <div class="upgrade-info">
          <div class="upgrade-name">${def.name}</div>
          <div class="upgrade-desc">${def.desc}</div>
          <div class="upgrade-rarity">${def.rarity.toUpperCase()} · Lv ${lvl}</div>
        </div>
      `;
      card.addEventListener('click', () => { this.applyUpgrade(id); this.hideScreen('levelup-screen'); this.state = 'playing'; });
      container.appendChild(card);
    });

    this.showScreen('levelup-screen');
  }

  applyUpgrade(id) {
    this.upgradeLevels[id] = (this.upgradeLevels[id] || 0) + 1;
    const lvl = this.upgradeLevels[id];
    const p = this.player;

    switch (id) {
      case 'damage_up':     p.damageMulti += 0.15; break;
      case 'speed_up':      p.speedMulti += 0.12; break;
      case 'attack_speed':  p.attackSpeedMulti += 0.15; break;
      case 'health_up':     p.maxHp += 25; p.hp = Math.min(p.hp + 25, p.maxHp); break;
      case 'regen':         p.regenRate += 1; break;
      case 'magnet':        p.magnetRange += XP_MAGNET_BASE * 0.4; break;
      case 'double_shot':   /* handled in fireWeapon */ break;
      case 'chain_lightning': this._chainTimer = 0; break;
      case 'shield':        p.shieldActive = true; p.shieldMaxCooldown = 10 - (lvl - 1) * 2; break;
      case 'critical':      p.critChance += 0.15; break;
      case 'homing':        this._homingTimer = 0; break;
      case 'laser':         this._laserTimer = 0; break;
      case 'drones':        break;
      case 'black_hole':    this._bhTimer = 0; break;
      case 'plasma_storm':  p.plasmaLevel = lvl; break;
      case 'time_warp':     break;
    }

    this.updateWeaponIcons();
  }

  updateWeaponIcons() {
    const container = document.getElementById('hud-weapons');
    container.innerHTML = '';
    // Base weapon
    container.innerHTML += '<div class="weapon-icon" title="Pulse Cannon">⚡</div>';
    Object.entries(this.upgradeLevels).forEach(([id, lvl]) => {
      if (lvl > 0 && UPGRADE_DEFS[id]) {
        container.innerHTML += `<div class="weapon-icon" title="${UPGRADE_DEFS[id].name} Lv${lvl}">${UPGRADE_DEFS[id].icon}</div>`;
      }
    });
  }

  // ======================================================================
  // GAME OVER
  // ======================================================================
  gameOver() {
    this.state = 'gameover';
    const p = this.player;

    // Save records
    let isNewBest = false;
    if (p.score > this.saveData.bestScore) { this.saveData.bestScore = p.score; isNewBest = true; }
    if (this.elapsed > this.saveData.bestTime) { this.saveData.bestTime = this.elapsed; isNewBest = true; }
    if (p.level > this.saveData.bestLevel) { this.saveData.bestLevel = p.level; isNewBest = true; }
    this.saveData.totalKills += p.totalKills;
    this.saveData.totalGames++;
    this.saveSave();

    // Build stats HTML
    const stats = document.getElementById('gameover-stats');
    stats.innerHTML = `
      <div class="gameover-stat"><span class="stat-val">${p.score}</span><span class="stat-label">Score</span></div>
      <div class="gameover-stat"><span class="stat-val">${fmtTime(this.elapsed)}</span><span class="stat-label">Time</span></div>
      <div class="gameover-stat"><span class="stat-val">${p.totalKills}</span><span class="stat-label">Kills</span></div>
      <div class="gameover-stat"><span class="stat-val">${p.level}</span><span class="stat-label">Level</span></div>
    `;
    document.getElementById('gameover-best').textContent = isNewBest ? '🏆 NEW PERSONAL BEST!' : '';

    document.getElementById('hud').classList.add('hidden');
    document.getElementById('joystick-zone').classList.add('hidden');
    this.showScreen('gameover-screen');
  }

  // ======================================================================
  // ACHIEVEMENTS
  // ======================================================================
  checkAchievements() {
    Object.entries(ACHIEVEMENTS).forEach(([id, ach]) => {
      if (this.saveData.achievements.includes(id)) return;
      if (this.sessionAchievements.includes(id)) return;
      if (ach.check(this)) {
        this.sessionAchievements.push(id);
        this.saveData.achievements.push(id);
        this.saveSave();
        this.showAchievementToast(ach);
      }
    });
  }

  showAchievementToast(ach) {
    this.sound.playAchievement();
    document.getElementById('ach-icon').textContent = ach.icon;
    document.getElementById('ach-name').textContent = ach.name;
    const toast = document.getElementById('achievement-toast');
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3500);
  }

  // ======================================================================
  // HUD
  // ======================================================================
  updateHUD() {
    const p = this.player;
    const hpPct = (p.hp / p.maxHp * 100);
    document.getElementById('hud-hp-fill').style.width = hpPct + '%';
    document.getElementById('hud-hp-text').textContent = Math.ceil(p.hp) + '/' + p.maxHp;
    const xpPct = (p.xp / p.xpToNext * 100);
    document.getElementById('hud-xp-fill').style.width = xpPct + '%';
    document.getElementById('hud-xp-text').textContent = 'Lv ' + p.level;
    document.getElementById('hud-kills').textContent = p.totalKills;
    document.getElementById('hud-score').textContent = p.score;
    document.getElementById('hud-time').textContent = fmtTime(this.elapsed);

    // Minimap
    if (this.frameCount % 6 === 0) this.drawMinimap();
  }

  drawMinimap() {
    const mc = this.minimapCtx;
    const mw = this.minimapCanvas.width, mh = this.minimapCanvas.height;
    const scale = mw / ARENA_W;
    mc.clearRect(0, 0, mw, mh);

    // Background
    mc.fillStyle = 'rgba(0,0,0,0.7)';
    mc.fillRect(0, 0, mw, mh);

    // Enemies
    mc.fillStyle = 'rgba(255,0,127,0.6)';
    this.enemies.forEach(e => {
      const isBoss = e.type === 'boss';
      mc.fillStyle = isBoss ? '#ffffff' : 'rgba(255,0,127,0.6)';
      mc.fillRect(e.x * scale - (isBoss?2:1), e.y * scale - (isBoss?2:1), isBoss?4:2, isBoss?4:2);
    });

    // Player
    mc.fillStyle = '#00ff66';
    mc.fillRect(this.player.x * scale - 2, this.player.y * scale - 2, 4, 4);
  }

  // ======================================================================
  // RENDERING
  // ======================================================================
  draw() {
    const ctx = this.ctx;
    const sw = this.screenW, sh = this.screenH;

    ctx.fillStyle = '#050110';
    ctx.fillRect(0, 0, sw, sh);

    if (this.state === 'menu') { this.drawMenuBg(ctx); return; }

    ctx.save();
    // Camera transform
    const cx = -this.camera.x + sw / 2 + this.shake.x;
    const cy = -this.camera.y + sh / 2 + this.shake.y;
    ctx.translate(cx, cy);

    this.drawArena(ctx);
    this.drawXPOrbs(ctx);
    this.drawEffects(ctx);
    this.drawEnemies(ctx);
    this.drawProjectiles(ctx);
    this.drawPlayer(ctx);
    this.drawParticles(ctx);
    this.drawDamageNumbers(ctx);

    ctx.restore();
  }

  drawMenuBg(ctx) {
    // Animated grid
    const t = Date.now() * 0.001;
    ctx.strokeStyle = 'rgba(0,240,255,0.04)';
    ctx.lineWidth = 1;
    const off = (t * 20) % 60;
    for (let x = -off; x < this.screenW + 60; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.screenH); ctx.stroke(); }
    for (let y = -off; y < this.screenH + 60; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.screenW, y); ctx.stroke(); }
  }

  drawArena(ctx) {
    // Grid
    const gridSize = 80;
    ctx.strokeStyle = 'rgba(162,0,255,0.06)';
    ctx.lineWidth = 1;

    const left = Math.max(0, Math.floor((this.camera.x - this.screenW/2) / gridSize) * gridSize);
    const right = Math.min(ARENA_W, this.camera.x + this.screenW/2 + gridSize);
    const top = Math.max(0, Math.floor((this.camera.y - this.screenH/2) / gridSize) * gridSize);
    const bottom = Math.min(ARENA_H, this.camera.y + this.screenH/2 + gridSize);

    for (let x = left; x <= right; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke(); }
    for (let y = top; y <= bottom; y += gridSize) { ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke(); }

    // Arena border glow
    ctx.strokeStyle = 'rgba(0,240,255,0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, ARENA_W, ARENA_H);
  }

  drawPlayer(ctx) {
    const p = this.player;
    const flash = p.invulnTimer > 0 && Math.floor(p.invulnTimer * 10) % 2 === 0;

    // Shield visual
    if (p.shieldActive && this.upgradeLevels.shield) {
      ctx.strokeStyle = 'rgba(0,240,255,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_RADIUS + 8, 0, Math.PI * 2); ctx.stroke();
    }

    // Plasma storm visual
    if (p.plasmaRadius > 0) {
      ctx.fillStyle = `rgba(162,0,255,0.06)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.plasmaRadius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(162,0,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Time warp visual
    if (p.timeWarpRadius > 0) {
      ctx.strokeStyle = 'rgba(255,170,0,0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.timeWarpRadius, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Glow
    ctx.fillStyle = flash ? 'rgba(255,255,255,0.15)' : 'rgba(0,255,102,0.1)';
    ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_RADIUS + 6, 0, Math.PI * 2); ctx.fill();

    // Body
    const grad = ctx.createRadialGradient(p.x - 3, p.y - 3, 2, p.x, p.y, PLAYER_RADIUS);
    grad.addColorStop(0, flash ? '#ffffff' : '#ffffff');
    grad.addColorStop(0.5, flash ? '#aaffaa' : '#00ff66');
    grad.addColorStop(1, flash ? '#558855' : '#004d1a');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2); ctx.fill();

    // Border
    ctx.strokeStyle = flash ? '#fff' : '#00ff66';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Drones
    if (this.upgradeLevels.drones) {
      const droneCount = this.upgradeLevels.drones + 1;
      const droneR = 80;
      for (let i = 0; i < droneCount; i++) {
        const da = this.activeEffects.droneAngle + (Math.PI * 2 / droneCount) * i;
        const dx = p.x + Math.cos(da) * droneR;
        const dy = p.y + Math.sin(da) * droneR;
        ctx.fillStyle = 'rgba(162,0,255,0.2)';
        ctx.beginPath(); ctx.arc(dx, dy, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#a200ff';
        ctx.beginPath(); ctx.arc(dx, dy, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#a200ff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  drawEnemies(ctx) {
    this.enemies.forEach(e => {
      // Glow
      ctx.fillStyle = e.color.replace(')', ',0.1)').replace('rgb', 'rgba').replace('#', '');
      // Simpler glow: semi-transparent larger circle
      const glowColor = this.hexToRGBA(e.color, 0.12);
      ctx.fillStyle = glowColor;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + (e.type === 'boss' ? 10 : 5), 0, Math.PI * 2); ctx.fill();

      // Body
      const grad = ctx.createRadialGradient(e.x - e.r*0.2, e.y - e.r*0.2, e.r*0.1, e.x, e.y, e.r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, e.color);
      grad.addColorStop(1, '#020005');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = e.color;
      ctx.lineWidth = e.type === 'boss' ? 2 : 1;
      ctx.stroke();

      // HP bar for bosses / elites / tanks
      if (e.type === 'boss' || e.type === 'elite' || e.type === 'tank') {
        const bw = e.r * 2, bh = 3;
        const bx = e.x - bw/2, by = e.y - e.r - 8;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = e.color;
        ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
      }
    });
  }

  drawProjectiles(ctx) {
    this.projectiles.forEach(pr => {
      ctx.fillStyle = pr.color;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2); ctx.fill();
      // Bright center
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r * 0.4, 0, Math.PI * 2); ctx.fill();
    });

    // Laser beam
    if (this._laserBeam) {
      const lb = this._laserBeam;
      ctx.save();
      ctx.globalAlpha = lb.timer / 0.15;
      ctx.strokeStyle = '#ff3300';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(lb.x, lb.y);
      ctx.lineTo(lb.x + Math.cos(lb.angle) * lb.len, lb.y + Math.sin(lb.angle) * lb.len);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawXPOrbs(ctx) {
    this.xpOrbs.forEach(orb => {
      const pulse = 1 + Math.sin(orb.pulse) * 0.3;
      ctx.fillStyle = 'rgba(0,240,255,0.15)';
      ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r * pulse + 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r * pulse, 0, Math.PI * 2); ctx.fill();
    });
  }

  drawEffects(ctx) {
    // Chain lightning
    if (this.activeEffects.chainTargets.length > 1) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = this._chainVisTimer ? this._chainVisTimer / 0.2 : 0;
      ctx.beginPath();
      const ct = this.activeEffects.chainTargets;
      ctx.moveTo(this.player.x, this.player.y);
      ct.forEach(t => ctx.lineTo(t.x, t.y));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Black holes
    this.activeEffects.blackHoles.forEach(bh => {
      const alpha = bh.life / bh.maxLife * 0.4;
      ctx.fillStyle = `rgba(30,0,60,${alpha})`;
      ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.radius * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(162,0,255,${alpha * 1.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.radius * 0.6, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(162,0,255,${alpha})`;
      ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2); ctx.stroke();
    });
  }

  drawParticles(ctx) {
    this.particles.forEach(p => {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  drawDamageNumbers(ctx) {
    this.damageNumbers.forEach(d => {
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = d.color;
      ctx.font = `bold ${Math.floor(12 * d.scale)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(d.text, d.x, d.y);
    });
    ctx.globalAlpha = 1;
  }

  // ---------- Helpers ----------
  hexToRGBA(hex, alpha) {
    const r = parseInt(hex.slice(1,3), 16) || 0;
    const g = parseInt(hex.slice(3,5), 16) || 0;
    const b = parseInt(hex.slice(5,7), 16) || 0;
    return `rgba(${r},${g},${b},${alpha})`;
  }
}

// ============================================================================
// SECTION 6: INITIALIZATION
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
  window.game = new NeonSurvivorGame();
});
