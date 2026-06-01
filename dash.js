/* =============================================================================
   NEON DASH — Complete Game Engine
   Endless cyberpunk runner. Jump, slide, dash, survive.
   Pure HTML5 Canvas + Web Audio. No dependencies.
   ============================================================================= */

// ============================================================================
// SECTION 1: CONSTANTS
// ============================================================================
const GRAVITY = 0.75;
const JUMP_VEL = -14.5;
const DOUBLE_JUMP_VEL = -12;
const SLIDE_DURATION = 30; // frames
const DASH_DURATION = 18; // frames
const BASE_SPEED = 7;
const MAX_SPEED = 20;
const SPEED_INC = 0.0008;
const GROUND_OFFSET = 0.72; // fraction of canvas height
const PLAYER_W = 30;
const PLAYER_H = 50;
const SLIDE_H = 22;
const MAX_PARTICLES = 250;

const SKINS = [
  { id:'neon_blue',   name:'Neon Blue',    color:'#00f0ff', trail:'rgba(0,240,255,.3)',   cost:0 },
  { id:'cyber_red',   name:'Cyber Red',    color:'#ff3300', trail:'rgba(255,51,0,.3)',     cost:200 },
  { id:'plasma_purple',name:'Plasma Purple',color:'#a200ff', trail:'rgba(162,0,255,.3)',   cost:500 },
  { id:'matrix_green', name:'Matrix Green', color:'#00ff66', trail:'rgba(0,255,102,.3)',   cost:1000 },
  { id:'gold_runner',  name:'Gold Runner',  color:'#ffaa00', trail:'rgba(255,170,0,.3)',   cost:2000 },
  { id:'hot_pink',     name:'Hot Pink',     color:'#ff007f', trail:'rgba(255,0,127,.3)',   cost:3500 },
  { id:'white_light',  name:'White Light',  color:'#ffffff', trail:'rgba(255,255,255,.3)', cost:5000 },
];

const ACHIEVEMENTS = {
  first_run:   { name:'First Steps',    desc:'Complete your first run',      icon:'👟', check: g => g.save.totalGames >= 1 },
  score_1k:    { name:'Getting Warmed',  desc:'Reach 1,000 score',           icon:'⭐', check: g => g.score >= 1000 },
  score_5k:    { name:'Speedster',       desc:'Reach 5,000 score',           icon:'🌟', check: g => g.score >= 5000 },
  score_10k:   { name:'Neon Legend',     desc:'Reach 10,000 score',          icon:'💫', check: g => g.score >= 10000 },
  crystals_100:{ name:'Collector',       desc:'Collect 100 total crystals',  icon:'💎', check: g => g.save.totalCrystals >= 100 },
  crystals_1k: { name:'Crystal Hoarder', desc:'Collect 1,000 total crystals',icon:'💠', check: g => g.save.totalCrystals >= 1000 },
  survive_1m:  { name:'One Minute Man',  desc:'Survive 60 seconds',         icon:'⏱️', check: g => g.elapsed >= 60 },
  survive_5m:  { name:'Marathon Runner', desc:'Survive 5 minutes',           icon:'🏃', check: g => g.elapsed >= 300 },
  survive_10m: { name:'Iron Will',       desc:'Survive 10 minutes',          icon:'🏅', check: g => g.elapsed >= 600 },
  combo_10:    { name:'Combo King',      desc:'Reach 10x combo',            icon:'🔥', check: g => g.maxCombo >= 10 },
  dash_50:     { name:'Dash Master',     desc:'Perform 50 dashes in a run', icon:'💨', check: g => g.dashCount >= 50 },
  near_miss_20:{ name:'Risk Taker',      desc:'20 near misses in a run',   icon:'😎', check: g => g.nearMissCount >= 20 },
};

const ENVS = [
  { name:'Neon City',      skyTop:'#050122', skyBot:'#0a0440', bldgFar:'#0c0832', bldgNear:'#120a4a', ground:'#0e083e', accent:'#00f0ff', gridColor:'rgba(0,240,255,.06)' },
  { name:'Cyber Tunnel',   skyTop:'#120020', skyBot:'#1a0038', bldgFar:'#1a0040', bldgNear:'#220050', ground:'#16003a', accent:'#a200ff', gridColor:'rgba(162,0,255,.06)' },
  { name:'Digital Grid',   skyTop:'#001a0a', skyBot:'#002a10', bldgFar:'#002a14', bldgNear:'#003a1a', ground:'#00200e', accent:'#00ff66', gridColor:'rgba(0,255,102,.06)' },
  { name:'Space Highway',  skyTop:'#000818', skyBot:'#001030', bldgFar:'#000c22', bldgNear:'#001838', ground:'#000a1a', accent:'#4488ff', gridColor:'rgba(68,136,255,.06)' },
  { name:'Holo District',  skyTop:'#1a0028', skyBot:'#280040', bldgFar:'#200038', bldgNear:'#30004e', ground:'#1a0030', accent:'#ff007f', gridColor:'rgba(255,0,127,.06)' },
];

const POWERUP_TYPES = [
  { id:'shield',    name:'Shield',     icon:'🛡️', color:'#00f0ff', dur:0 },
  { id:'magnet',    name:'Magnet',     icon:'🧲', color:'#a200ff', dur:480 },
  { id:'speed',     name:'Speed Boost',icon:'⚡', color:'#ffaa00', dur:360 },
  { id:'slow',      name:'Slow Motion',icon:'⏳', color:'#00ff66', dur:360 },
  { id:'ghost',     name:'Ghost Mode', icon:'👻', color:'#ffffff', dur:300 },
];

const OBSTACLE_TYPES = ['spike','wall','low_laser','high_laser','double_laser','drone','electric'];

// ============================================================================
// SECTION 2: SOUND ENGINE
// ============================================================================
class DashSound {
  constructor(){ this.ctx=null; this.gain=null; this.on=true; }
  init(){ if(this.ctx)return; const A=window.AudioContext||window.webkitAudioContext; this.ctx=new A(); this.gain=this.ctx.createGain(); this.gain.gain.value=0.35; this.gain.connect(this.ctx.destination); if(this.ctx.state==='suspended')this.ctx.resume(); }
  _t(f,d,tp,v,fe){ if(!this.ctx||!this.on)return; const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain(); o.type=tp||'triangle'; o.frequency.setValueAtTime(f,t); if(fe)o.frequency.exponentialRampToValueAtTime(fe,t+d*.8); g.gain.setValueAtTime(v||.1,t); g.gain.exponentialRampToValueAtTime(.001,t+d); o.connect(g);g.connect(this.gain); o.start(t);o.stop(t+d); }
  _n(d,v,f){ if(!this.ctx||!this.on)return; const t=this.ctx.currentTime,sz=this.ctx.sampleRate*d,buf=this.ctx.createBuffer(1,sz,this.ctx.sampleRate),da=buf.getChannelData(0); for(let i=0;i<sz;i++)da[i]=Math.random()*2-1; const n=this.ctx.createBufferSource();n.buffer=buf; const fl=this.ctx.createBiquadFilter();fl.type='lowpass';fl.frequency.setValueAtTime(f||600,t);fl.frequency.exponentialRampToValueAtTime(80,t+d); const g=this.ctx.createGain();g.gain.setValueAtTime(v||.1,t);g.gain.exponentialRampToValueAtTime(.001,t+d); n.connect(fl);fl.connect(g);g.connect(this.gain); n.start(t);n.stop(t+d); }
  jump(){ this._t(400,.08,'triangle',.08,800); }
  dash(){ this._t(300,.1,'sawtooth',.07,600); this._n(.06,.04,400); }
  crystal(){ this._t(900,.05,'sine',.06,1400); }
  hit(){ this._n(.2,.15,300); this._t(80,.15,'sawtooth',.15,30); }
  powerup(){ [523,659,784].forEach((f,i)=>setTimeout(()=>this._t(f,.12,'triangle',.08),i*40)); }
  achieve(){ [392,523,659,784].forEach((f,i)=>setTimeout(()=>this._t(f,.15,'triangle',.07),i*50)); }
  slide(){ this._n(.08,.05,200); }
  toggle(){ this.on=!this.on; return this.on; }
}

// ============================================================================
// SECTION 3: UTILITIES
// ============================================================================
function fmtTime(s){ const m=Math.floor(s/60),sec=Math.floor(s%60); return m+':'+(sec<10?'0':'')+sec; }
function clamp(v,mn,mx){ return Math.max(mn,Math.min(mx,v)); }
function seededRand(seed){ let s=seed; return ()=>{ s=(s*1664525+1013904223)&0xFFFFFFFF; return(s>>>0)/0xFFFFFFFF; }; }
function todaySeed(){ const d=new Date(); return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(); }
function todayStr(){ return new Date().toISOString().slice(0,10); }
function lerp(a,b,t){ return a+(b-a)*t; }

// ============================================================================
// SECTION 4: MAIN GAME CLASS
// ============================================================================
class NeonDash {
  constructor(){
    this.canvas=document.getElementById('game-canvas');
    this.ctx=this.canvas.getContext('2d');
    this.sound=new DashSound();

    this.state='menu'; // menu, playing, paused, gameover
    this.isDaily=false;
    this.rng=Math.random;

    // Save data
    this.save={ bestScore:0, bestDist:0, totalCrystals:0, totalGames:0,
      achievements:[], unlockedSkins:['neon_blue'], activeSkin:'neon_blue',
      lastPlayDate:'', streak:0, dailyDate:'', dailyDone:[], soundOn:true };
    this.loadSave();

    // Game state
    this.score=0; this.distance=0; this.crystalsCollected=0; this.elapsed=0;
    this.frameCount=0; this.gameSpeed=BASE_SPEED; this.combo=0; this.maxCombo=0;
    this.dashCount=0; this.nearMissCount=0;

    // Player
    this.player={};
    // World
    this.obstacles=[]; this.crystals=[]; this.powerups=[];
    this.particles=[]; this.trailParticles=[];
    // Active powerup
    this.activePower=null; this.powerTimer=0;
    // Environment
    this.envIdx=0; this.envTimer=0;
    // Parallax buildings
    this.farBuildings=[]; this.nearBuildings=[];
    // Screen shake
    this.shake={i:0,x:0,y:0};
    // Spawn timers
    this.obsTimer=0; this.crystalTimer=0; this.powerupTimer=0;
    // Combo timer
    this.comboTimer=0;

    this.groundY=0; this.screenW=0; this.screenH=0;

    this.initCanvas();
    this.initInput();
    this.initUI();
    this.updateMenu();
    this.showScreen('menu-screen');

    this.lastTime=0;
    this.boundTick=this.tick.bind(this);
    requestAnimationFrame(this.boundTick);
  }

  // ===== Canvas =====
  initCanvas(){
    this.resizeCanvas();
    window.addEventListener('resize',()=>this.resizeCanvas());
  }
  resizeCanvas(){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    this.screenW=window.innerWidth; this.screenH=window.innerHeight;
    this.canvas.width=this.screenW*dpr; this.canvas.height=this.screenH*dpr;
    this.canvas.style.width=this.screenW+'px'; this.canvas.style.height=this.screenH+'px';
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.groundY=Math.floor(this.screenH*GROUND_OFFSET);
  }

  // ===== Input =====
  initInput(){
    // Keyboard
    this.keys=new Set();
    window.addEventListener('keydown',e=>{
      if(this.state!=='playing')return;
      if(e.code==='Space'||e.code==='ArrowUp'){ e.preventDefault(); this.doJump(); }
      if(e.code==='ArrowDown'){ e.preventDefault(); this.doSlide(); }
      if(e.code==='ShiftLeft'||e.code==='ShiftRight'){ e.preventDefault(); this.doDash(); }
      if(e.code==='Escape') this.pauseGame();
    });
    window.addEventListener('keyup',e=>{
      if(e.code==='ArrowDown'&&this.player.sliding) this.endSlide();
    });

    // Touch
    let touchStartY=0, touchStartX=0, touchStartTime=0, lastTapTime=0;
    this.canvas.addEventListener('touchstart',e=>{
      if(this.state!=='playing')return;
      e.preventDefault();
      const t=e.touches[0];
      touchStartY=t.clientY; touchStartX=t.clientX; touchStartTime=Date.now();
      // Double tap detection
      const now=Date.now();
      if(now-lastTapTime<300){ this.doDash(); lastTapTime=0; }
      else lastTapTime=now;
    },{passive:false});
    this.canvas.addEventListener('touchend',e=>{
      if(this.state!=='playing')return;
      const t=e.changedTouches[0];
      const dy=touchStartY-t.clientY, dx=Math.abs(touchStartX-t.clientX);
      const elapsed=Date.now()-touchStartTime;
      if(Math.abs(dy)>30&&Math.abs(dy)>dx&&elapsed<400){
        if(dy>0) this.doJump(); else this.doSlide();
      }
      if(this.player.sliding&&elapsed>350) this.endSlide();
    },{passive:true});
  }

  // ===== Player Actions =====
  doJump(){
    const p=this.player;
    if(p.sliding) this.endSlide();
    if(p.grounded){
      p.vy=JUMP_VEL; p.grounded=false; p.jumps=1;
      this.sound.jump();
      this.spawnDust(p.x,this.groundY,6);
    } else if(p.jumps<2){
      p.vy=DOUBLE_JUMP_VEL; p.jumps=2;
      this.sound.jump();
      this.spawnDust(p.x,p.y+p.h,5);
    }
  }
  doSlide(){
    const p=this.player;
    if(!p.grounded||p.sliding)return;
    p.sliding=true; p.slideTimer=SLIDE_DURATION;
    p.h=SLIDE_H; p.y=this.groundY-SLIDE_H;
    this.sound.slide();
  }
  endSlide(){
    const p=this.player;
    if(!p.sliding)return;
    p.sliding=false; p.h=PLAYER_H; p.y=this.groundY-PLAYER_H;
  }
  doDash(){
    const p=this.player;
    if(p.dashing)return;
    p.dashing=true; p.dashTimer=DASH_DURATION;
    this.dashCount++;
    this.sound.dash();
  }

  // ===== Save/Load =====
  loadSave(){ try{ const d=JSON.parse(localStorage.getItem('neon_dash_save')); if(d) this.save={...this.save,...d}; this.sound.on=this.save.soundOn!==false; }catch(e){} }
  saveSave(){ this.save.soundOn=this.sound.on; localStorage.setItem('neon_dash_save',JSON.stringify(this.save)); }

  // ===== Screens =====
  showScreen(id){ document.getElementById(id).classList.remove('hidden'); }
  hideScreen(id){ document.getElementById(id).classList.add('hidden'); }
  hideAll(){ ['menu-screen','pause-screen','gameover-screen'].forEach(id=>this.hideScreen(id)); }

  // ===== UI =====
  initUI(){
    document.getElementById('btn-start').addEventListener('click',()=>this.startGame(false));
    document.getElementById('btn-daily').addEventListener('click',()=>this.startGame(true));
    document.getElementById('btn-pause').addEventListener('click',()=>this.pauseGame());
    document.getElementById('btn-resume').addEventListener('click',()=>this.resumeGame());
    document.getElementById('btn-restart-pause').addEventListener('click',()=>{this.hideAll();this.startGame(this.isDaily);});
    document.getElementById('btn-menu-pause').addEventListener('click',()=>this.goMenu());
    document.getElementById('btn-retry').addEventListener('click',()=>{this.hideAll();this.startGame(this.isDaily);});
    document.getElementById('btn-menu-over').addEventListener('click',()=>this.goMenu());
    document.getElementById('btn-share').addEventListener('click',()=>this.shareScore());
    document.getElementById('btn-sound').addEventListener('click',()=>{
      this.sound.init(); const on=this.sound.toggle();
      document.querySelector('#btn-sound i').className=on?'fas fa-volume-up':'fas fa-volume-mute';
      this.save.soundOn=on; this.saveSave();
    });
    document.getElementById('btn-fullscreen').addEventListener('click',()=>{
      const d=document.documentElement;
      if(!document.fullscreenElement){ (d.requestFullscreen||d.webkitRequestFullscreen||d.msRequestFullscreen).call(d).catch(()=>{}); }
      else (document.exitFullscreen||document.webkitExitFullscreen||document.msExitFullscreen).call(document).catch(()=>{});
    });
    document.getElementById('btn-reset').addEventListener('click',()=>{
      if(confirm('Reset all progress?')){ localStorage.removeItem('neon_dash_save'); location.reload(); }
    });
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('tab-active'));
        btn.classList.add('tab-active');
        document.querySelectorAll('.tab-content').forEach(tc=>tc.classList.add('hidden'));
        document.getElementById('tab-'+btn.dataset.tab).classList.remove('hidden');
      });
    });
  }

  updateMenu(){
    // Records
    document.getElementById('rec-score').textContent=this.save.bestScore;
    document.getElementById('rec-dist').textContent=Math.floor(this.save.bestDist)+'m';
    document.getElementById('rec-crystals').textContent=this.save.totalCrystals;
    document.getElementById('rec-games').textContent=this.save.totalGames;
    // Sound icon
    document.querySelector('#btn-sound i').className=this.sound.on?'fas fa-volume-up':'fas fa-volume-mute';
    // Streak
    this.updateStreak();
    document.getElementById('streak-val').textContent=this.save.streak;
    // Daily challenges
    this.buildDailies();
    // Achievements
    this.buildAchievements();
    // Skins
    this.buildSkins();
  }

  updateStreak(){
    const today=todayStr();
    if(this.save.lastPlayDate===today) return;
    const yesterday=new Date(); yesterday.setDate(yesterday.getDate()-1);
    const yStr=yesterday.toISOString().slice(0,10);
    if(this.save.lastPlayDate===yStr) this.save.streak++;
    else if(this.save.lastPlayDate!==today) this.save.streak=1;
    this.save.lastPlayDate=today;
    this.saveSave();
  }

  buildDailies(){
    const seed=todaySeed(); const r=seededRand(seed);
    const today=todayStr();
    if(this.save.dailyDate!==today){ this.save.dailyDate=today; this.save.dailyDone=[]; this.saveSave(); }
    const pool=[
      {name:'Speed Demon',desc:'Survive 2 minutes',check:g=>g.elapsed>=120},
      {name:'Crystal Hunter',desc:'Collect 50 crystals',check:g=>g.crystalsCollected>=50},
      {name:'Crystal Hoard',desc:'Collect 100 crystals',check:g=>g.crystalsCollected>=100},
      {name:'Dash Expert',desc:'Perform 20 dashes',check:g=>g.dashCount>=20},
      {name:'Score Rush',desc:'Reach 3,000 score',check:g=>g.score>=3000},
      {name:'Near Miss Pro',desc:'10 near misses',check:g=>g.nearMissCount>=10},
      {name:'Combo Chain',desc:'Reach 5x combo',check:g=>g.maxCombo>=5},
      {name:'Iron Runner',desc:'Survive 3 minutes',check:g=>g.elapsed>=180},
    ];
    // Pick 3 unique
    this.dailyChallenges=[];
    const indices=[];
    while(indices.length<3){ const i=Math.floor(r()*pool.length); if(!indices.includes(i))indices.push(i); }
    indices.forEach((idx,i)=>{
      const c={...pool[idx], idx:i, done:this.save.dailyDone.includes(i)};
      this.dailyChallenges.push(c);
    });
    // Render
    const list=document.getElementById('daily-list');
    list.innerHTML='';
    this.dailyChallenges.forEach((c,i)=>{
      const el=document.createElement('div');
      el.className='daily-item'+(c.done?' done':'');
      el.innerHTML=`<div class="daily-icon">${c.done?'✅':'🎯'}</div><div class="daily-info"><div class="daily-name">${c.name}</div><div class="daily-desc">${c.desc}</div></div><div class="daily-check">${c.done?'✓':'○'}</div>`;
      list.appendChild(el);
    });
  }

  checkDailies(){
    if(!this.isDaily)return;
    this.dailyChallenges.forEach((c,i)=>{
      if(!c.done&&c.check(this)){
        c.done=true;
        if(!this.save.dailyDone.includes(i)){ this.save.dailyDone.push(i); this.saveSave(); }
        this.showToast('🎯',c.name+' Complete!');
      }
    });
  }

  buildAchievements(){
    const list=document.getElementById('ach-list');
    list.innerHTML='';
    Object.entries(ACHIEVEMENTS).forEach(([id,a])=>{
      const unlocked=this.save.achievements.includes(id);
      const el=document.createElement('div');
      el.className='ach-item'+(unlocked?' unlocked':'');
      el.innerHTML=`<div class="ach-icon">${a.icon}</div><div><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div></div>`;
      list.appendChild(el);
    });
  }

  buildSkins(){
    const list=document.getElementById('skin-list');
    list.innerHTML='';
    SKINS.forEach(s=>{
      const unlocked=this.save.unlockedSkins.includes(s.id);
      const active=this.save.activeSkin===s.id;
      const el=document.createElement('div');
      el.className='skin-card'+(active?' active':'')+(unlocked?'':' locked');
      el.innerHTML=`<div class="skin-swatch" style="background:${s.color};color:${s.color}"></div><div class="skin-label">${unlocked?s.name:(s.cost+'💎')}</div>`;
      if(unlocked){
        el.addEventListener('click',()=>{ this.save.activeSkin=s.id; this.saveSave(); this.buildSkins(); });
      }
      list.appendChild(el);
    });
    // Progress bar toward next locked skin
    const nextLocked=SKINS.find(s=>!this.save.unlockedSkins.includes(s.id));
    const progFill=document.getElementById('skin-progress-fill');
    const progText=document.getElementById('skin-progress-text');
    if(nextLocked){
      const pct=Math.min(100,Math.floor(this.save.totalCrystals/nextLocked.cost*100));
      progFill.style.width=pct+'%';
      progText.textContent=`${pct}% toward ${nextLocked.name} (${this.save.totalCrystals}/${nextLocked.cost} 💎)`;
    } else {
      progFill.style.width='100%';
      progText.textContent='All skins unlocked!';
    }
  }

  showToast(icon,name){
    document.getElementById('toast-icon').textContent=icon;
    document.getElementById('toast-name').textContent=name;
    const t=document.getElementById('toast'); t.classList.add('active');
    setTimeout(()=>t.classList.remove('active'),3000);
  }

  // ===== Start / Reset =====
  startGame(daily){
    this.sound.init();
    this.hideAll();
    document.getElementById('hud').classList.remove('hidden');
    this.isDaily=daily;
    this.rng=daily?seededRand(todaySeed()):Math.random;

    this.score=0; this.distance=0; this.crystalsCollected=0; this.elapsed=0;
    this.frameCount=0; this.gameSpeed=BASE_SPEED; this.combo=0; this.maxCombo=0;
    this.dashCount=0; this.nearMissCount=0; this.comboTimer=0;
    this.obstacles=[]; this.crystals=[]; this.powerups=[]; this.particles=[]; this.trailParticles=[];
    this.activePower=null; this.powerTimer=0;
    this.obsTimer=0; this.crystalTimer=0; this.powerupTimer=0;
    this.shake={i:0,x:0,y:0};
    this.envIdx=Math.floor(this.rng()*ENVS.length); this.envTimer=0;

    // Generate buildings
    this.genBuildings();

    // Player init
    const skin=SKINS.find(s=>s.id===this.save.activeSkin)||SKINS[0];
    this.player={
      x:this.screenW*0.15, y:this.groundY-PLAYER_H, w:PLAYER_W, h:PLAYER_H,
      vy:0, grounded:true, jumps:0,
      sliding:false, slideTimer:0,
      dashing:false, dashTimer:0,
      color:skin.color, trail:skin.trail,
      alive:true
    };

    // Hide powerup HUD
    document.getElementById('hud-powerup').classList.add('hidden');
    document.getElementById('hud-combo').classList.add('hidden');

    this.state='playing';
  }

  genBuildings(){
    this.farBuildings=[]; this.nearBuildings=[];
    for(let x=0;x<this.screenW+200;x+=60+this.rng()*40){
      this.farBuildings.push({x,w:30+this.rng()*50,h:40+this.rng()*100});
    }
    for(let x=0;x<this.screenW+200;x+=50+this.rng()*60){
      this.nearBuildings.push({x,w:40+this.rng()*60,h:60+this.rng()*140});
    }
  }

  pauseGame(){ if(this.state!=='playing')return; this.state='paused'; this.showScreen('pause-screen'); }
  resumeGame(){ this.hideScreen('pause-screen'); this.state='playing'; }
  goMenu(){ this.state='menu'; this.hideAll(); document.getElementById('hud').classList.add('hidden'); this.updateMenu(); this.showScreen('menu-screen'); }

  // ===== Game Loop =====
  tick(ts){
    const dt=Math.min((ts-(this.lastTime||ts))/1000,0.05);
    this.lastTime=ts;
    if(this.state==='playing'){ this.elapsed+=dt; this.frameCount++; this.update(dt); }
    this.draw();
    requestAnimationFrame(this.boundTick);
  }

  // ===== Update =====
  update(dt){
    const p=this.player;
    const gs=this.activePower?.id==='slow'?this.gameSpeed*0.5:(this.activePower?.id==='speed'?this.gameSpeed*1.5:this.gameSpeed);

    // Speed up
    if(this.gameSpeed<MAX_SPEED) this.gameSpeed+=SPEED_INC*60*dt;

    // Distance / Score
    this.distance+=gs*dt*8;
    this.score=Math.floor(this.distance/10);
    if(this.activePower?.id==='speed') this.score=Math.floor(this.score*1.5);

    // Player physics
    if(!p.grounded){
      p.vy+=GRAVITY;
      p.y+=p.vy;
      if(p.y+p.h>=this.groundY){ p.y=this.groundY-p.h; p.vy=0; p.grounded=true; p.jumps=0; }
    }
    // Slide timer
    if(p.sliding){ p.slideTimer--; if(p.slideTimer<=0) this.endSlide(); }
    // Dash timer
    if(p.dashing){ p.dashTimer--; if(p.dashTimer<=0) p.dashing=false; }

    // Combo decay
    if(this.combo>0){ this.comboTimer-=dt; if(this.comboTimer<=0){ this.combo=0; document.getElementById('hud-combo').classList.add('hidden'); } }

    // Trail particles
    if(this.frameCount%2===0){
      this.trailParticles.push({x:p.x-5,y:p.y+p.h/2+(this.rng()-.5)*p.h*.6,r:2+this.rng()*3,alpha:.6,decay:2+this.rng(),color:p.trail});
    }
    for(let i=this.trailParticles.length-1;i>=0;i--){
      const tp=this.trailParticles[i];
      tp.x-=gs*0.5;
      tp.alpha-=tp.decay*dt;
      if(tp.alpha<=0)this.trailParticles.splice(i,1);
    }
    // Cap trail
    if(this.trailParticles.length>80) this.trailParticles.splice(0,this.trailParticles.length-80);

    // Spawn obstacles
    this.obsTimer-=dt;
    if(this.obsTimer<=0){
      this.spawnObstacle();
      const interval=Math.max(0.4, 1.8 - this.elapsed*0.004);
      this.obsTimer=interval+this.rng()*interval*0.5;
    }

    // Spawn crystals
    this.crystalTimer-=dt;
    if(this.crystalTimer<=0){
      this.spawnCrystals();
      this.crystalTimer=0.8+this.rng()*1.2;
    }

    // Spawn powerups
    this.powerupTimer-=dt;
    if(this.powerupTimer<=0){
      this.spawnPowerup();
      this.powerupTimer=15+this.rng()*20;
    }

    // Move obstacles
    for(let i=this.obstacles.length-1;i>=0;i--){
      const o=this.obstacles[i];
      o.x-=gs*60*dt;
      if(o.type==='drone') o.y+=Math.sin(this.frameCount*0.05+o.phase)*1.5;
      if(o.x+o.w<-50){ this.obstacles.splice(i,1); continue; }
      // Near miss detection
      if(!o.missed&&!o.hit&&o.x+o.w<p.x&&o.x+o.w>p.x-gs*3){
        const vertClose=Math.abs((p.y+p.h/2)-(o.y+o.h/2))<o.h;
        if(vertClose){ o.missed=true; this.nearMissCount++; this.score+=50; this.addCombo(); this.spawnText(p.x,p.y-20,'NEAR MISS!','#ffaa00'); }
      }
      // Collision
      if(!o.hit&&this.checkCollision(p,o)){
        if(p.dashing||(this.activePower&&this.activePower.id==='ghost')){
          o.hit=true; continue;
        }
        if(this.activePower&&this.activePower.id==='shield'){
          o.hit=true; this.activePower=null; this.powerTimer=0;
          document.getElementById('hud-powerup').classList.add('hidden');
          this.spawnBurst(p.x,p.y+p.h/2,p.color,15);
          continue;
        }
        this.handleDeath(); return;
      }
    }

    // Move crystals
    const magnetRange=this.activePower?.id==='magnet'?250:0;
    for(let i=this.crystals.length-1;i>=0;i--){
      const c=this.crystals[i];
      c.x-=gs*60*dt;
      c.pulse+=dt*4;
      // Magnet pull
      if(magnetRange>0){
        const dx=p.x+p.w/2-c.x, dy=p.y+p.h/2-c.y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if(d<magnetRange&&d>5){ const pull=300*(1-d/magnetRange); c.x+=dx/d*pull*dt; c.y+=dy/d*pull*dt; }
      }
      if(c.x<-30){ this.crystals.splice(i,1); this.combo=0; continue; }
      // Collect
      const dx=p.x+p.w/2-c.x, dy=p.y+p.h/2-c.y;
      if(Math.sqrt(dx*dx+dy*dy)<28){
        this.crystalsCollected++; this.score+=10*(1+Math.floor(this.combo/3));
        this.addCombo();
        this.sound.crystal();
        this.spawnBurst(c.x,c.y,'#00f0ff',5);
        this.crystals.splice(i,1);
      }
    }

    // Move powerups
    for(let i=this.powerups.length-1;i>=0;i--){
      const pw=this.powerups[i];
      pw.x-=gs*60*dt; pw.pulse+=dt*3;
      if(pw.x<-30){ this.powerups.splice(i,1); continue; }
      const dx=p.x+p.w/2-pw.x, dy=p.y+p.h/2-pw.y;
      if(Math.sqrt(dx*dx+dy*dy)<30){
        this.activatePowerup(pw.type); this.powerups.splice(i,1);
      }
    }

    // Powerup timer
    if(this.activePower&&this.activePower.dur>0){
      this.powerTimer-=dt;
      const fill=document.getElementById('hud-powerup-fill');
      fill.style.width=Math.max(0,this.powerTimer/this.activePower.dur*100*60)+'%';
      if(this.powerTimer<=0){ this.activePower=null; document.getElementById('hud-powerup').classList.add('hidden'); }
    }

    // Update particles
    for(let i=this.particles.length-1;i>=0;i--){
      const pt=this.particles[i];
      pt.x+=pt.vx*dt; pt.y+=pt.vy*dt; pt.alpha-=pt.decay*dt;
      if(pt.alpha<=0)this.particles.splice(i,1);
    }
    if(this.particles.length>MAX_PARTICLES) this.particles.splice(0,this.particles.length-MAX_PARTICLES);

    // Scroll buildings
    this.farBuildings.forEach(b=>b.x-=gs*0.15);
    this.nearBuildings.forEach(b=>b.x-=gs*0.4);
    // Recycle buildings
    const refar=this.farBuildings; if(refar.length>0&&refar[0].x+refar[0].w<-10){ const b=refar.shift(); b.x=refar[refar.length-1].x+refar[refar.length-1].w+20+this.rng()*40; b.h=40+this.rng()*100; refar.push(b); }
    const renear=this.nearBuildings; if(renear.length>0&&renear[0].x+renear[0].w<-10){ const b=renear.shift(); b.x=renear[renear.length-1].x+renear[renear.length-1].w+15+this.rng()*50; b.h=60+this.rng()*140; renear.push(b); }

    // Environment change
    this.envTimer+=dt;
    if(this.envTimer>45){ this.envTimer=0; this.envIdx=(this.envIdx+1)%ENVS.length; }

    // Shake decay
    if(this.shake.i>0.1){ this.shake.x=(this.rng()-.5)*this.shake.i*2; this.shake.y=(this.rng()-.5)*this.shake.i*2; this.shake.i*=0.88; }
    else{ this.shake.x=0; this.shake.y=0; this.shake.i=0; }

    // Check achievements
    if(this.frameCount%60===0) this.checkAchievements();
    if(this.frameCount%120===0) this.checkDailies();

    // Update HUD
    document.getElementById('hud-score').textContent=this.score;
    document.getElementById('hud-crystals').textContent=this.crystalsCollected;
  }

  // ===== Spawning =====
  spawnObstacle(){
    const x=this.screenW+50;
    const avail=[...OBSTACLE_TYPES];
    if(this.elapsed<30){ avail.length=0; avail.push('spike','wall'); }
    else if(this.elapsed<60){ avail.length=0; avail.push('spike','wall','low_laser','high_laser'); }
    else if(this.elapsed<120){ avail.length=0; avail.push('spike','wall','low_laser','high_laser','drone'); }
    const type=avail[Math.floor(this.rng()*avail.length)];
    let o;
    switch(type){
      case 'spike':
        o={x,y:this.groundY-25,w:25,h:25,type,color:'#ff3300'}; break;
      case 'wall':
        const wh=60+this.rng()*30;
        o={x,y:this.groundY-wh,w:30,h:wh,type,color:'#ff007f'}; break;
      case 'low_laser':
        o={x,y:this.groundY-18,w:80,h:8,type,color:'#00f0ff'}; break;
      case 'high_laser':
        o={x,y:this.groundY-PLAYER_H+5,w:80,h:8,type,color:'#00f0ff'}; break;
      case 'double_laser':
        o={x,y:this.groundY-PLAYER_H+5,w:80,h:PLAYER_H-10,type,color:'#ff3300'}; break;
      case 'drone':
        o={x,y:this.groundY-50-this.rng()*80,w:28,h:28,type,color:'#a200ff',phase:this.rng()*Math.PI*2}; break;
      case 'electric':
        o={x,y:this.groundY-70,w:20,h:70,type,color:'#ffaa00'}; break;
      default:
        o={x,y:this.groundY-25,w:25,h:25,type:'spike',color:'#ff3300'}; break;
    }
    o.missed=false; o.hit=false;
    this.obstacles.push(o);
  }

  spawnCrystals(){
    const x=this.screenW+30;
    const count=2+Math.floor(this.rng()*3);
    const baseY=this.groundY-30-this.rng()*80;
    for(let i=0;i<count;i++){
      this.crystals.push({x:x+i*28,y:baseY,r:7,pulse:this.rng()*6});
    }
  }

  spawnPowerup(){
    const type=POWERUP_TYPES[Math.floor(this.rng()*POWERUP_TYPES.length)];
    this.powerups.push({x:this.screenW+30,y:this.groundY-60-this.rng()*60,r:14,type,pulse:0});
  }

  activatePowerup(type){
    this.sound.powerup();
    this.activePower=type;
    this.powerTimer=type.dur/60;
    const el=document.getElementById('hud-powerup');
    el.classList.remove('hidden');
    document.getElementById('hud-powerup-icon').textContent=type.icon;
    document.getElementById('hud-powerup-fill').style.width='100%';
    this.spawnText(this.player.x+30,this.player.y-30,type.name,type.color);
  }

  // ===== Collision =====
  checkCollision(p,o){
    const px=p.x,py=p.y,pw=p.w,ph=p.h;
    // Shrink hitbox slightly for fairness
    const margin=4;
    return px+pw-margin>o.x && px+margin<o.x+o.w && py+ph-margin>o.y && py+margin<o.y+o.h;
  }

  // ===== Combo =====
  addCombo(){ this.combo++; if(this.combo>this.maxCombo)this.maxCombo=this.combo; this.comboTimer=3; if(this.combo>=2){ const el=document.getElementById('hud-combo'); el.classList.remove('hidden'); document.getElementById('hud-combo-val').textContent=this.combo; el.style.animation='none'; el.offsetHeight; el.style.animation=''; } }

  // ===== Death =====
  handleDeath(){
    this.player.alive=false;
    this.state='gameover';
    this.sound.hit();
    this.shake.i=10;
    this.spawnBurst(this.player.x+this.player.w/2,this.player.y+this.player.h/2,this.player.color,25);

    // Save stats
    let newBest=false;
    if(this.score>this.save.bestScore){ this.save.bestScore=this.score; newBest=true; }
    if(this.distance/10>this.save.bestDist){ this.save.bestDist=Math.floor(this.distance/10); newBest=true; }
    this.save.totalCrystals+=this.crystalsCollected;
    this.save.totalGames++;
    // Unlock skins
    SKINS.forEach(s=>{ if(!this.save.unlockedSkins.includes(s.id)&&this.save.totalCrystals>=s.cost) this.save.unlockedSkins.push(s.id); });
    this.saveSave();
    this.checkAchievements();

    // Show game over
    document.getElementById('hud').classList.add('hidden');
    const stats=document.getElementById('go-stats');
    stats.innerHTML=`
      <div class="go-stat"><span class="go-val">${this.score}</span><span class="go-label">Score</span></div>
      <div class="go-stat"><span class="go-val">${Math.floor(this.distance/10)}m</span><span class="go-label">Distance</span></div>
      <div class="go-stat"><span class="go-val">${this.crystalsCollected}</span><span class="go-label">Crystals</span></div>
      <div class="go-stat"><span class="go-val">${fmtTime(this.elapsed)}</span><span class="go-label">Time</span></div>
    `;
    document.getElementById('go-best').textContent=newBest?'🏆 NEW PERSONAL BEST!':'';
    setTimeout(()=>this.showScreen('gameover-screen'),600);
  }

  // ===== Achievements =====
  checkAchievements(){
    Object.entries(ACHIEVEMENTS).forEach(([id,a])=>{
      if(this.save.achievements.includes(id))return;
      if(a.check(this)){
        this.save.achievements.push(id); this.saveSave();
        this.sound.achieve();
        this.showToast(a.icon,a.name);
      }
    });
  }

  // ===== Share =====
  shareScore(){
    const c=document.getElementById('share-canvas');
    const ctx=c.getContext('2d');
    ctx.fillStyle='#050110'; ctx.fillRect(0,0,600,340);
    // Border
    ctx.strokeStyle='#00f0ff'; ctx.lineWidth=3; ctx.strokeRect(6,6,588,328);
    // Title
    ctx.font='900 36px Orbitron,sans-serif'; ctx.fillStyle='#00f0ff'; ctx.textAlign='center';
    ctx.fillText('NEON DASH',300,55);
    // Score
    ctx.font='900 52px Orbitron,sans-serif'; ctx.fillStyle='#fff';
    ctx.fillText(this.score,300,130);
    ctx.font='600 14px Orbitron,sans-serif'; ctx.fillStyle='rgba(255,255,255,.5)';
    ctx.fillText('SCORE',300,155);
    // Stats
    ctx.font='700 18px Montserrat,sans-serif'; ctx.fillStyle='#ff007f';
    ctx.fillText(`${Math.floor(this.distance/10)}m · ${this.crystalsCollected}💎 · ${fmtTime(this.elapsed)}`,300,200);
    // CTA
    ctx.font='600 13px Montserrat,sans-serif'; ctx.fillStyle='rgba(255,255,255,.4)';
    ctx.fillText('Can you beat my score? Play at neon-arcade.github.io',300,260);
    // Download
    const link=document.createElement('a');
    link.download='neon-dash-score.png'; link.href=c.toDataURL('image/png'); link.click();
  }

  // ===== Particles =====
  spawnBurst(x,y,color,count){ for(let i=0;i<count;i++){ const a=this.rng()*Math.PI*2; const s=1+this.rng()*4; if(this.particles.length<MAX_PARTICLES) this.particles.push({x,y,vx:Math.cos(a)*s*80,vy:Math.sin(a)*s*80,r:1.5+this.rng()*3,color,alpha:1,decay:1.5+this.rng()}); } }
  spawnDust(x,y,count){ for(let i=0;i<count;i++){ if(this.particles.length<MAX_PARTICLES) this.particles.push({x:x+(this.rng()-.5)*20,y,vx:(this.rng()-.5)*40,vy:-this.rng()*60,r:1+this.rng()*2,color:'rgba(255,255,255,.5)',alpha:.7,decay:2+this.rng()}); } }
  spawnText(x,y,text,color){ this.particles.push({x,y,vx:0,vy:-50,r:0,text,color,alpha:1,decay:1.2}); }

  // ===== Drawing =====
  draw(){
    const ctx=this.ctx;
    const sw=this.screenW, sh=this.screenH;
    const env=ENVS[this.envIdx];

    // Sky
    const sky=ctx.createLinearGradient(0,0,0,this.groundY);
    sky.addColorStop(0,env.skyTop); sky.addColorStop(1,env.skyBot);
    ctx.fillStyle=sky; ctx.fillRect(0,0,sw,sh);

    // Grid lines
    ctx.strokeStyle=env.gridColor; ctx.lineWidth=1;
    const goff=(this.distance*0.3)%60;
    for(let x=-goff;x<sw;x+=60){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,this.groundY); ctx.stroke(); }
    for(let y=0;y<this.groundY;y+=60){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(sw,y); ctx.stroke(); }

    // Far buildings
    ctx.fillStyle=env.bldgFar;
    this.farBuildings.forEach(b=>ctx.fillRect(b.x,this.groundY-b.h,b.w,b.h));

    // Near buildings
    ctx.fillStyle=env.bldgNear;
    this.nearBuildings.forEach(b=>{
      ctx.fillRect(b.x,this.groundY-b.h,b.w,b.h);
      // Windows
      ctx.fillStyle='rgba(255,255,255,.03)';
      for(let wy=this.groundY-b.h+8;wy<this.groundY-5;wy+=14){
        for(let wx=b.x+5;wx<b.x+b.w-5;wx+=10) ctx.fillRect(wx,wy,4,6);
      }
      ctx.fillStyle=env.bldgNear;
    });

    // Ground
    ctx.fillStyle=env.ground; ctx.fillRect(0,this.groundY,sw,sh-this.groundY);
    // Ground line glow
    ctx.strokeStyle=env.accent; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,this.groundY); ctx.lineTo(sw,this.groundY); ctx.stroke();
    // Ground gridlines
    ctx.strokeStyle=env.gridColor; ctx.lineWidth=1;
    const ggoff=(this.distance*0.8)%40;
    for(let x=-ggoff;x<sw;x+=40){ ctx.beginPath(); ctx.moveTo(x,this.groundY); ctx.lineTo(x,sh); ctx.stroke(); }

    if(this.state==='menu'){ return; }

    // Apply shake
    ctx.save();
    ctx.translate(this.shake.x,this.shake.y);

    // XP orbs / Crystals
    this.crystals.forEach(c=>{
      const pulse=1+Math.sin(c.pulse)*.25;
      ctx.fillStyle='rgba(0,240,255,.12)';
      ctx.beginPath(); ctx.arc(c.x,c.y,c.r*pulse+5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#00f0ff';
      ctx.beginPath(); ctx.arc(c.x,c.y,c.r*pulse,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.arc(c.x-1,c.y-1,c.r*pulse*.3,0,Math.PI*2); ctx.fill();
    });

    // Powerups
    this.powerups.forEach(pw=>{
      const pulse=1+Math.sin(pw.pulse)*.2;
      ctx.fillStyle=pw.type.color+'22';
      ctx.beginPath(); ctx.arc(pw.x,pw.y,pw.r*pulse+6,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=pw.type.color; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(pw.x,pw.y,pw.r*pulse,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle=pw.type.color; ctx.font='bold 14px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(pw.type.icon,pw.x,pw.y);
    });

    // Obstacles
    this.obstacles.forEach(o=>{
      if(o.hit) return;
      ctx.fillStyle=o.color;
      if(o.type==='spike'){
        ctx.beginPath(); ctx.moveTo(o.x,o.y+o.h); ctx.lineTo(o.x+o.w/2,o.y); ctx.lineTo(o.x+o.w,o.y+o.h); ctx.closePath(); ctx.fill();
      } else if(o.type==='drone'){
        ctx.fillStyle=o.color+'33';
        ctx.beginPath(); ctx.arc(o.x+o.w/2,o.y+o.h/2,o.w/2+4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=o.color;
        ctx.beginPath(); ctx.arc(o.x+o.w/2,o.y+o.h/2,o.w/2,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#fff';
        ctx.beginPath(); ctx.arc(o.x+o.w/2-2,o.y+o.h/2-2,o.w*.15,0,Math.PI*2); ctx.fill();
      } else if(o.type==='low_laser'||o.type==='high_laser'){
        ctx.fillStyle=o.color+'44';
        ctx.fillRect(o.x,o.y-3,o.w,o.h+6);
        ctx.fillStyle=o.color;
        ctx.fillRect(o.x,o.y,o.w,o.h);
        ctx.fillStyle='#fff';
        ctx.fillRect(o.x,o.y+2,o.w,o.h-4);
      } else {
        // wall, electric, double_laser
        ctx.fillStyle=o.color+'22';
        ctx.fillRect(o.x-3,o.y-3,o.w+6,o.h+6);
        ctx.fillStyle=o.color;
        ctx.fillRect(o.x,o.y,o.w,o.h);
      }
    });

    // Trail particles
    this.trailParticles.forEach(tp=>{
      ctx.globalAlpha=tp.alpha; ctx.fillStyle=tp.color;
      ctx.beginPath(); ctx.arc(tp.x,tp.y,tp.r,0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha=1;

    // Player
    const p=this.player;
    if(p.alive||this.state==='gameover'){
      const ghost=this.activePower?.id==='ghost';
      ctx.globalAlpha=ghost?0.4:(p.dashing?0.7:1);

      // Glow
      ctx.fillStyle=p.color+'18';
      ctx.fillRect(p.x-6,p.y-6,p.w+12,p.h+12);

      // Dash streak
      if(p.dashing){
        ctx.fillStyle=p.trail;
        ctx.fillRect(p.x-30,p.y+4,35,p.h-8);
      }

      // Body
      const grad=ctx.createLinearGradient(p.x,p.y,p.x,p.y+p.h);
      grad.addColorStop(0,'#fff'); grad.addColorStop(.4,p.color); grad.addColorStop(1,'#020008');
      ctx.fillStyle=grad;
      ctx.fillRect(p.x,p.y,p.w,p.h);

      // Border
      ctx.strokeStyle=p.color; ctx.lineWidth=1.5;
      ctx.strokeRect(p.x,p.y,p.w,p.h);

      // Visor
      ctx.fillStyle='#fff';
      const vy=p.y+(p.sliding?4:12);
      ctx.fillRect(p.x+8,vy,p.w-8,5);

      // Shield visual
      if(this.activePower?.id==='shield'){
        ctx.strokeStyle='rgba(0,240,255,.4)'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(p.x+p.w/2,p.y+p.h/2,Math.max(p.w,p.h)/2+8,0,Math.PI*2); ctx.stroke();
      }

      ctx.globalAlpha=1;
    }

    // Particles
    this.particles.forEach(pt=>{
      ctx.globalAlpha=pt.alpha;
      if(pt.text){
        ctx.fillStyle=pt.color; ctx.font='bold 11px Orbitron,sans-serif'; ctx.textAlign='center';
        ctx.fillText(pt.text,pt.x,pt.y);
      } else {
        ctx.fillStyle=pt.color;
        ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.r,0,Math.PI*2); ctx.fill();
      }
    });
    ctx.globalAlpha=1;

    ctx.restore();
  }

  // ===== Fullscreen safe =====
  // Game state is preserved through fullscreen transitions —
  // we use resize handler only, no restart.
}

// ============================================================================
// SECTION 5: INITIALIZATION
// ============================================================================
window.addEventListener('DOMContentLoaded',()=>{ window.game=new NeonDash(); });
