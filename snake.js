/* =============================================================================
   NEON SNAKE ROYALE — Complete Game Engine
   Cyberpunk snake game with progression, loot, skins, prestige.
   Pure HTML5 Canvas + Web Audio. No dependencies.
   ============================================================================= */

// ============================================================================
// SECTION 1: CONSTANTS
// ============================================================================
const GRID = 28;          // grid cells per axis
const BASE_TICK = 135;    // ms per tick at start
const MIN_TICK = 55;      // fastest tick
const TICK_DEC = 0.4;     // ms faster per orb collected
const TIMED_DURATION = 180; // seconds for time attack

const SKIN_DEFS = [
  { id:'neon_blue',  name:'Neon Blue',  head:'#00f0ff', body:'#0088aa', glow:'rgba(0,240,255,.25)', cost:0 },
  { id:'neon_red',   name:'Neon Red',   head:'#ff3300', body:'#aa2200', glow:'rgba(255,51,0,.25)',  cost:300 },
  { id:'neon_green', name:'Neon Green',  head:'#00ff66', body:'#009944', glow:'rgba(0,255,102,.25)',cost:600 },
  { id:'cyber_gold', name:'Cyber Gold',  head:'#ffaa00', body:'#aa7700', glow:'rgba(255,170,0,.25)',cost:1200 },
  { id:'plasma_purple',name:'Plasma Purple',head:'#a200ff',body:'#6600aa',glow:'rgba(162,0,255,.25)',cost:2000 },
  { id:'matrix_black', name:'Matrix Black', head:'#aaffaa',body:'#335533',glow:'rgba(170,255,170,.2)',cost:3500 },
  { id:'holo',       name:'Holographic', head:'#ffffff', body:'#aaaaff', glow:'rgba(255,255,255,.3)',cost:5000, special:'holo' },
  { id:'rainbow',    name:'Rainbow',     head:'#ff0000', body:'#ff8800', glow:'rgba(255,255,255,.3)',cost:8000, special:'rainbow' },
];

const TRAIL_DEFS = [
  { id:'none',   name:'None',     color:'transparent', cost:0 },
  { id:'sparks', name:'Neon Sparks', color:'#00f0ff',  cost:200 },
  { id:'plasma', name:'Plasma',   color:'#a200ff',     cost:500 },
  { id:'lightning',name:'Lightning',color:'#ffaa00',    cost:1000 },
  { id:'fire',   name:'Fire',     color:'#ff3300',     cost:2000 },
  { id:'rainbow_t',name:'Rainbow', color:'#ff007f',    cost:4000, special:'rainbow' },
];

const POWER_TYPES = [
  { id:'magnet',  name:'Magnet',     icon:'🧲', color:'#a200ff', dur:8 },
  { id:'shield',  name:'Shield',     icon:'🛡️', color:'#00f0ff', dur:0 },
  { id:'ghost',   name:'Ghost',      icon:'👻', color:'#ffffff', dur:6 },
  { id:'speed',   name:'Speed Burst', icon:'⚡', color:'#ffaa00', dur:5 },
  { id:'slow',    name:'Slow Time',  icon:'⏳', color:'#00ff66', dur:7 },
  { id:'double',  name:'Double XP',  icon:'✨', color:'#ff007f', dur:10 },
];

const ACHIEVEMENTS = {
  first:       { name:'First Growth',  desc:'Collect your first orb',   icon:'🌱', check:g=>g.save.totalOrbs>=1 },
  len_50:      { name:'Growing',       desc:'Reach length 50',          icon:'📏', check:g=>g.maxLen>=50 },
  len_100:     { name:'Serpent',       desc:'Reach length 100',         icon:'🐍', check:g=>g.maxLen>=100 },
  len_500:     { name:'Leviathan',     desc:'Reach length 500',         icon:'🐉', check:g=>g.maxLen>=500 },
  orbs_1k:     { name:'Orb Hunter',    desc:'Collect 1,000 total orbs', icon:'💎', check:g=>g.save.totalOrbs>=1000 },
  orbs_10k:    { name:'Orb Master',    desc:'Collect 10,000 orbs',      icon:'💠', check:g=>g.save.totalOrbs>=10000 },
  score_5k:    { name:'Scorer',        desc:'Reach 5,000 score',        icon:'⭐', check:g=>g.score>=5000 },
  score_20k:   { name:'High Roller',   desc:'Reach 20,000 score',       icon:'🌟', check:g=>g.score>=20000 },
  survive_5m:  { name:'Survivor',      desc:'Survive 5 minutes',        icon:'⏱️', check:g=>g.elapsed>=300 },
  survive_10m: { name:'Iron Snake',    desc:'Survive 10 minutes',       icon:'🏅', check:g=>g.elapsed>=600 },
  loot_10:     { name:'Unboxer',       desc:'Open 10 loot boxes',       icon:'📦', check:g=>g.save.totalLoot>=10 },
  prestige_1:  { name:'Prestige',      desc:'Prestige once',            icon:'👑', check:g=>g.save.prestige>=1 },
};

const ENVS = [
  { name:'Neon City',     bg1:'#050122', bg2:'#0a0440', grid:'rgba(0,240,255,.05)',  wall:'#00f0ff', orb:'#00f0ff' },
  { name:'Cyber Grid',    bg1:'#120020', bg2:'#1a0038', grid:'rgba(162,0,255,.05)',   wall:'#a200ff', orb:'#a200ff' },
  { name:'Plasma Reactor', bg1:'#1a0008', bg2:'#280010', grid:'rgba(255,0,127,.05)',  wall:'#ff007f', orb:'#ff007f' },
  { name:'Digital Matrix', bg1:'#001a0a', bg2:'#002a10', grid:'rgba(0,255,102,.05)',  wall:'#00ff66', orb:'#00ff66' },
  { name:'Space Circuit',  bg1:'#000818', bg2:'#001030', grid:'rgba(68,136,255,.05)', wall:'#4488ff', orb:'#4488ff' },
];

const LOOT_TABLE = [
  { type:'credits', val:50,  weight:40, label:'50 Credits',  icon:'💰', rarity:'Common' },
  { type:'credits', val:150, weight:20, label:'150 Credits', icon:'💰', rarity:'Uncommon' },
  { type:'credits', val:500, weight:8,  label:'500 Credits', icon:'💰', rarity:'Rare' },
  { type:'xp',      val:200, weight:25, label:'200 XP',      icon:'✨', rarity:'Common' },
  { type:'xp',      val:600, weight:10, label:'600 XP',      icon:'✨', rarity:'Uncommon' },
  { type:'lootbox', val:1,   weight:3,  label:'Bonus Box!',  icon:'🎁', rarity:'Rare' },
];

// ============================================================================
// SECTION 2: SOUND
// ============================================================================
class SnakeSound{
  constructor(){this.ctx=null;this.g=null;this.on=true}
  init(){if(this.ctx)return;const A=window.AudioContext||window.webkitAudioContext;this.ctx=new A();this.g=this.ctx.createGain();this.g.gain.value=.35;this.g.connect(this.ctx.destination);if(this.ctx.state==='suspended')this.ctx.resume()}
  _t(f,d,tp,v,fe){if(!this.ctx||!this.on)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),gn=this.ctx.createGain();o.type=tp||'triangle';o.frequency.setValueAtTime(f,t);if(fe)o.frequency.exponentialRampToValueAtTime(fe,t+d*.8);gn.gain.setValueAtTime(v||.1,t);gn.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(gn);gn.connect(this.g);o.start(t);o.stop(t+d)}
  _n(d,v,f){if(!this.ctx||!this.on)return;const t=this.ctx.currentTime,sz=this.ctx.sampleRate*d,buf=this.ctx.createBuffer(1,sz,this.ctx.sampleRate),da=buf.getChannelData(0);for(let i=0;i<sz;i++)da[i]=Math.random()*2-1;const n=this.ctx.createBufferSource();n.buffer=buf;const fl=this.ctx.createBiquadFilter();fl.type='lowpass';fl.frequency.setValueAtTime(f||600,t);fl.frequency.exponentialRampToValueAtTime(80,t+d);const gn=this.ctx.createGain();gn.gain.setValueAtTime(v||.1,t);gn.gain.exponentialRampToValueAtTime(.001,t+d);n.connect(fl);fl.connect(gn);gn.connect(this.g);n.start(t);n.stop(t+d)}
  eat(){this._t(800,.06,'sine',.07,1300)}
  power(){[523,659,784].forEach((f,i)=>setTimeout(()=>this._t(f,.12,'triangle',.07),i*40))}
  die(){this._n(.2,.15,300);this._t(80,.15,'sawtooth',.15,30)}
  lvl(){[392,523,659,784,1047].forEach((f,i)=>setTimeout(()=>this._t(f,.12,'triangle',.06),i*45))}
  ach(){[440,554,659,880].forEach((f,i)=>setTimeout(()=>this._t(f,.14,'triangle',.06),i*55))}
  loot(){this._t(300,.08,'sawtooth',.06,600);setTimeout(()=>this._t(600,.15,'triangle',.08,1200),100)}
  toggle(){this.on=!this.on;return this.on}
}

// ============================================================================
// SECTION 3: UTILS
// ============================================================================
function fmtTime(s){const m=Math.floor(s/60),se=Math.floor(s%60);return m+':'+(se<10?'0':'')+se}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function seededRand(sd){let s=sd;return()=>{s=(s*1664525+1013904223)&0xFFFFFFFF;return(s>>>0)/0xFFFFFFFF}}
function todaySeed(){const d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()}
function todayStr(){return new Date().toISOString().slice(0,10)}
function weightedPick(arr,rng){const total=arr.reduce((s,a)=>s+a.weight,0);let r=(rng||Math.random)()*total;for(const a of arr){r-=a.weight;if(r<=0)return a}return arr[arr.length-1]}

// ============================================================================
// SECTION 4: MAIN GAME
// ============================================================================
class NeonSnakeRoyale{
  constructor(){
    this.canvas=document.getElementById('game-canvas');
    this.ctx=this.canvas.getContext('2d');
    this.sound=new SnakeSound();

    this.state='menu';
    this.mode='endless';
    this.rng=Math.random;

    // Save
    this.save={bestScore:0,bestLen:0,totalOrbs:0,totalGames:0,credits:0,xp:0,level:1,xpToNext:100,
      prestige:0,prestigeBonus:0,lootBoxes:0,totalLoot:0,
      achievements:[],unlockedSkins:['neon_blue'],activeSkin:'neon_blue',
      unlockedTrails:['none'],activeTrail:'none',
      missionDate:'',missionDone:[],soundOn:true};
    this.loadSave();

    // Game state
    this.score=0;this.elapsed=0;this.frameCount=0;this.maxLen=0;this.orbsThisRun=0;
    this.snake=[];this.dir={x:1,y:0};this.nextDir={x:1,y:0};
    this.orbs=[];this.powerItems=[];this.hazards=[];
    this.activePower=null;this.powerTimer=0;
    this.particles=[];this.textPops=[];
    this.tickInterval=BASE_TICK;this.tickTimer=0;
    this.interpProgress=0;this.prevSnake=[];
    this.envIdx=0;this.envTimer=0;
    this.arenaMin=0;this.arenaMax=GRID-1;
    this.timerLeft=TIMED_DURATION;
    this.challengeObj=null;this.challengeDone=false;

    // Screen
    this.screenW=0;this.screenH=0;this.cellSize=0;this.offsetX=0;this.offsetY=0;

    this.initCanvas();
    this.initInput();
    this.initUI();
    this.updateMenu();
    this.show('menu-screen');

    this.lastTime=0;
    this.boundTick=this.tick.bind(this);
    requestAnimationFrame(this.boundTick);
  }

  // ===== Canvas =====
  initCanvas(){this.resize();window.addEventListener('resize',()=>this.resize())}
  resize(){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    this.screenW=window.innerWidth;this.screenH=window.innerHeight;
    this.canvas.width=this.screenW*dpr;this.canvas.height=this.screenH*dpr;
    this.canvas.style.width=this.screenW+'px';this.canvas.style.height=this.screenH+'px';
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    // Calculate cell size to fit
    const pad=10;
    const avail=Math.min(this.screenW-pad*2, this.screenH*0.88-pad*2);
    this.cellSize=Math.floor(avail/GRID);
    this.offsetX=Math.floor((this.screenW-this.cellSize*GRID)/2);
    this.offsetY=Math.floor((this.screenH-this.cellSize*GRID)/2)+10;
  }

  // ===== Input =====
  initInput(){
    // Keyboard
    window.addEventListener('keydown',e=>{
      if(this.state==='playing'){
        const d=this.dir;
        if((e.code==='ArrowUp'||e.code==='KeyW')&&d.y!==1){this.nextDir={x:0,y:-1};e.preventDefault()}
        if((e.code==='ArrowDown'||e.code==='KeyS')&&d.y!==-1){this.nextDir={x:0,y:1};e.preventDefault()}
        if((e.code==='ArrowLeft'||e.code==='KeyA')&&d.x!==1){this.nextDir={x:-1,y:0};e.preventDefault()}
        if((e.code==='ArrowRight'||e.code==='KeyD')&&d.x!==-1){this.nextDir={x:1,y:0};e.preventDefault()}
        if(e.code==='Escape')this.pauseGame();
      }
    });
    // Touch swipe
    let tx=0,ty=0;
    this.canvas.addEventListener('touchstart',e=>{
      if(this.state!=='playing')return;
      e.preventDefault();const t=e.touches[0];tx=t.clientX;ty=t.clientY;
    },{passive:false});
    this.canvas.addEventListener('touchmove',e=>{
      if(this.state!=='playing')return;
      e.preventDefault();
      const t=e.touches[0];
      const dx=t.clientX-tx,dy=t.clientY-ty;
      if(Math.abs(dx)<15&&Math.abs(dy)<15)return;
      const d=this.dir;
      if(Math.abs(dx)>Math.abs(dy)){
        if(dx>0&&d.x!==-1)this.nextDir={x:1,y:0};
        else if(dx<0&&d.x!==1)this.nextDir={x:-1,y:0};
      }else{
        if(dy>0&&d.y!==-1)this.nextDir={x:0,y:1};
        else if(dy<0&&d.y!==1)this.nextDir={x:0,y:-1};
      }
      tx=t.clientX;ty=t.clientY;
    },{passive:false});
  }

  // ===== UI =====
  initUI(){
    document.getElementById('btn-start').addEventListener('click',()=>this.startGame());
    document.getElementById('btn-pause').addEventListener('click',()=>this.pauseGame());
    document.getElementById('btn-resume').addEventListener('click',()=>this.resumeGame());
    document.getElementById('btn-restart-p').addEventListener('click',()=>{this.hideAll();this.startGame()});
    document.getElementById('btn-menu-p').addEventListener('click',()=>this.goMenu());
    document.getElementById('btn-retry').addEventListener('click',()=>{this.hideAll();this.startGame()});
    document.getElementById('btn-menu-go').addEventListener('click',()=>this.goMenu());
    document.getElementById('btn-share').addEventListener('click',()=>this.shareScore());
    document.getElementById('btn-snd').addEventListener('click',()=>{
      this.sound.init();const on=this.sound.toggle();
      document.querySelector('#btn-snd i').className=on?'fas fa-volume-up':'fas fa-volume-mute';
      this.save.soundOn=on;this.doSave()});
    document.getElementById('btn-fs').addEventListener('click',()=>{
      const d=document.documentElement;
      if(!document.fullscreenElement)(d.requestFullscreen||d.webkitRequestFullscreen||d.msRequestFullscreen).call(d).catch(()=>{});
      else(document.exitFullscreen||document.webkitExitFullscreen||document.msExitFullscreen).call(document).catch(()=>{})});
    document.getElementById('btn-reset').addEventListener('click',()=>{
      if(confirm('Reset ALL progress?')){localStorage.removeItem('neon_snake_save');location.reload()}});
    document.getElementById('btn-prestige').addEventListener('click',()=>this.doPrestige());
    document.getElementById('btn-open-loot').addEventListener('click',()=>this.openLootBox());
    // Mode select
    document.querySelectorAll('.mode-btn').forEach(b=>{
      b.addEventListener('click',()=>{document.querySelectorAll('.mode-btn').forEach(x=>x.classList.remove('mode-active'));b.classList.add('mode-active');this.mode=b.dataset.mode})});
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(b=>{
      b.addEventListener('click',()=>{document.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('tab-active'));b.classList.add('tab-active');document.querySelectorAll('.tab-content').forEach(x=>x.classList.add('hidden'));document.getElementById('tp-'+b.dataset.tab).classList.remove('hidden')})});
  }

  show(id){document.getElementById(id).classList.remove('hidden')}
  hide(id){document.getElementById(id).classList.add('hidden')}
  hideAll(){['menu-screen','pause-screen','go-screen'].forEach(id=>this.hide(id))}

  // ===== Save =====
  loadSave(){try{const d=JSON.parse(localStorage.getItem('neon_snake_save'));if(d)this.save={...this.save,...d};this.sound.on=this.save.soundOn!==false}catch(e){}}
  doSave(){this.save.soundOn=this.sound.on;localStorage.setItem('neon_snake_save',JSON.stringify(this.save))}

  // ===== Menu =====
  updateMenu(){
    document.getElementById('r-score').textContent=this.save.bestScore;
    document.getElementById('r-len').textContent=this.save.bestLen;
    document.getElementById('r-orbs').textContent=this.save.totalOrbs;
    document.getElementById('r-prestige').textContent=this.save.prestige;
    document.querySelector('#btn-snd i').className=this.sound.on?'fas fa-volume-up':'fas fa-volume-mute';
    document.getElementById('btn-prestige').disabled=this.save.level<20;
    document.getElementById('loot-count').textContent=this.save.lootBoxes;
    document.getElementById('btn-open-loot').disabled=this.save.lootBoxes<1;
    document.getElementById('menu-credits').textContent=this.save.credits;
    this.buildMissions();this.buildAchievements();this.buildSkins();this.buildTrails();
    document.getElementById('loot-result').classList.add('hidden');
  }

  goMenu(){this.state='menu';this.hideAll();this.hide('hud');this.updateMenu();this.show('menu-screen')}

  // ===== Start =====
  startGame(){
    this.sound.init();this.hideAll();this.show('hud');
    this.rng=this.mode==='challenge'?seededRand(todaySeed()):Math.random;
    this.state='playing';
    this.score=0;this.elapsed=0;this.frameCount=0;this.maxLen=3;this.orbsThisRun=0;
    this.tickInterval=BASE_TICK;this.tickTimer=0;this.interpProgress=0;
    this.particles=[];this.textPops=[];this.orbs=[];this.powerItems=[];this.hazards=[];
    this.activePower=null;this.powerTimer=0;
    this.envIdx=Math.floor(this.rng()*ENVS.length);this.envTimer=0;
    this.arenaMin=0;this.arenaMax=GRID-1;
    this.timerLeft=TIMED_DURATION;
    this.challengeDone=false;
    this.challengeObj=this.mode==='challenge'?this.pickChallenge():null;

    // Init snake at center
    const mid=Math.floor(GRID/2);
    this.snake=[{x:mid,y:mid},{x:mid-1,y:mid},{x:mid-2,y:mid}];
    this.prevSnake=this.snake.map(s=>({...s}));
    this.dir={x:1,y:0};this.nextDir={x:1,y:0};

    // Spawn initial orbs
    for(let i=0;i<5;i++)this.spawnOrb();

    // Timer display
    document.getElementById('h-timer-box').style.display=this.mode==='timed'?'flex':'none';
    this.hide('h-power');
    this.updateHUD();
  }

  pickChallenge(){
    const pool=[
      {desc:'Reach length 80',check:g=>g.snake.length>=80},
      {desc:'Collect 100 orbs',check:g=>g.orbsThisRun>=100},
      {desc:'Survive 5 minutes',check:g=>g.elapsed>=300},
      {desc:'Score 8,000 points',check:g=>g.score>=8000},
    ];
    return pool[Math.floor(this.rng()*pool.length)];
  }

  pauseGame(){if(this.state!=='playing')return;this.state='paused';this.show('pause-screen')}
  resumeGame(){this.hide('pause-screen');this.state='playing'}

  // ===== Game Loop =====
  tick(ts){
    const dt=Math.min((ts-(this.lastTime||ts))/1000,0.05);
    this.lastTime=ts;
    if(this.state==='playing'){
      this.elapsed+=dt;this.frameCount++;
      this.tickTimer+=dt*1000;
      // Determine effective tick interval
      let eff=this.tickInterval;
      if(this.activePower&&this.activePower.id==='speed')eff*=0.65;
      if(this.activePower&&this.activePower.id==='slow')eff*=1.5;
      if(this.tickTimer>=eff){
        this.tickTimer-=eff;
        this.gameTick();
      }
      this.interpProgress=clamp(this.tickTimer/eff,0,1);
      this.updateParticles(dt);
      this.updateTextPops(dt);
      // Powerup timer
      if(this.activePower&&this.activePower.dur>0){
        this.powerTimer-=dt;
        document.getElementById('h-power-fill').style.width=Math.max(0,this.powerTimer/this.activePower.dur*100)+'%';
        if(this.powerTimer<=0){this.activePower=null;this.hide('h-power')}
      }
      // Time attack countdown
      if(this.mode==='timed'){
        this.timerLeft-=dt;
        document.getElementById('h-timer').textContent=fmtTime(Math.max(0,this.timerLeft));
        if(this.timerLeft<=0)this.die();
      }
      // Survival arena shrink
      if(this.mode==='survival'&&this.elapsed>10){
        const shrink=Math.floor((this.elapsed-10)/30);
        this.arenaMin=Math.min(shrink,GRID/2-3);
        this.arenaMax=GRID-1-this.arenaMin;
      }
      // Env change
      this.envTimer+=dt;
      if(this.envTimer>50){this.envTimer=0;this.envIdx=(this.envIdx+1)%ENVS.length}
      // Achievements
      if(this.frameCount%60===0)this.checkAch();
      if(this.frameCount%120===0)this.checkMissions();
      // Challenge check
      if(this.challengeObj&&!this.challengeDone&&this.challengeObj.check(this)){
        this.challengeDone=true;this.showToast('🎯','Challenge Complete!');this.score+=2000;
      }
      this.updateHUD();
    }
    this.draw();
    requestAnimationFrame(this.boundTick);
  }

  // ===== Game Tick (grid step) =====
  gameTick(){
    this.prevSnake=this.snake.map(s=>({...s}));
    this.dir={...this.nextDir};
    const head={x:this.snake[0].x+this.dir.x, y:this.snake[0].y+this.dir.y};

    // Wall collision
    if(head.x<this.arenaMin||head.x>this.arenaMax||head.y<this.arenaMin||head.y>this.arenaMax){
      if(this.activePower&&this.activePower.id==='ghost'){
        head.x=clamp(head.x,this.arenaMin,this.arenaMax);
        head.y=clamp(head.y,this.arenaMin,this.arenaMax);
      } else {this.die();return}
    }

    // Self collision
    const ghostActive=this.activePower&&this.activePower.id==='ghost';
    if(!ghostActive){
      for(let i=1;i<this.snake.length;i++){
        if(this.snake[i].x===head.x&&this.snake[i].y===head.y){
          if(this.activePower&&this.activePower.id==='shield'){
            this.activePower=null;this.hide('h-power');
            this.spawnBurst(head.x,head.y,'#00f0ff',10);break;
          }
          this.die();return;
        }
      }
    }

    // Hazard collision
    if(!ghostActive){
      for(const h of this.hazards){
        if(h.x===head.x&&h.y===head.y){
          if(this.activePower&&this.activePower.id==='shield'){
            this.activePower=null;this.hide('h-power');
            this.spawnBurst(head.x,head.y,'#00f0ff',10);
            break;
          }
          this.die();return;
        }
      }
    }

    this.snake.unshift(head);

    // Orb collection
    let ate=false;
    const magRange=this.activePower&&this.activePower.id==='magnet'?4:0;
    for(let i=this.orbs.length-1;i>=0;i--){
      const o=this.orbs[i];
      const dx=Math.abs(head.x-o.x),dy=Math.abs(head.y-o.y);
      if(dx===0&&dy===0||(magRange>0&&dx<=magRange&&dy<=magRange)){
        ate=true;
        const mult=this.activePower&&this.activePower.id==='double'?2:1;
        const pts=10*mult*(1+this.save.prestigeBonus*0.05);
        this.score+=Math.floor(pts);
        this.orbsThisRun++;
        this.sound.eat();
        this.spawnBurst(o.x,o.y,ENVS[this.envIdx].orb,6);
        if(mult>1)this.addTextPop(o.x,o.y,'x2!','#ff007f');
        this.orbs.splice(i,1);
        this.spawnOrb();
      }
    }
    if(!ate)this.snake.pop();
    if(this.snake.length>this.maxLen)this.maxLen=this.snake.length;

    // Speed up
    if(ate&&this.tickInterval>MIN_TICK)this.tickInterval=Math.max(MIN_TICK,this.tickInterval-TICK_DEC);

    // Score from distance
    this.score+=1;

    // Spawn powerup
    if(this.frameCount%300===0&&this.powerItems.length<2)this.spawnPowerItem();

    // Spawn hazards
    if(this.snake.length>15&&this.frameCount%400===0&&this.hazards.length<Math.min(15,Math.floor(this.snake.length/10)))this.spawnHazard();

    // Collect powerup
    for(let i=this.powerItems.length-1;i>=0;i--){
      const p=this.powerItems[i];
      if(p.x===head.x&&p.y===head.y){
        this.activatePower(p.type);this.powerItems.splice(i,1);
      }
    }

    // Keep orb count up
    while(this.orbs.length<3+Math.floor(this.snake.length/15))this.spawnOrb();

    // Trail particles
    const tail=this.snake[this.snake.length-1];
    const trailDef=TRAIL_DEFS.find(t=>t.id===this.save.activeTrail);
    if(trailDef&&trailDef.id!=='none'){
      this.spawnBurst(tail.x,tail.y,trailDef.special==='rainbow'?`hsl(${this.frameCount*5%360},100%,60%)`:trailDef.color,2);
    }
  }

  // ===== Spawning =====
  spawnOrb(){
    let x,y,tries=0;
    do{x=Math.floor(this.rng()*(this.arenaMax-this.arenaMin+1))+this.arenaMin;y=Math.floor(this.rng()*(this.arenaMax-this.arenaMin+1))+this.arenaMin;tries++}
    while(tries<50&&this.isOccupied(x,y));
    this.orbs.push({x,y,pulse:this.rng()*6});
  }
  spawnPowerItem(){
    let x,y,tries=0;
    do{x=Math.floor(this.rng()*(this.arenaMax-this.arenaMin+1))+this.arenaMin;y=Math.floor(this.rng()*(this.arenaMax-this.arenaMin+1))+this.arenaMin;tries++}
    while(tries<50&&this.isOccupied(x,y));
    this.powerItems.push({x,y,type:POWER_TYPES[Math.floor(this.rng()*POWER_TYPES.length)],pulse:0});
  }
  spawnHazard(){
    let x,y,tries=0;
    do{x=Math.floor(this.rng()*(this.arenaMax-this.arenaMin+1))+this.arenaMin;y=Math.floor(this.rng()*(this.arenaMax-this.arenaMin+1))+this.arenaMin;tries++}
    while(tries<50&&this.isOccupied(x,y));
    this.hazards.push({x,y});
  }
  isOccupied(x,y){
    for(const s of this.snake)if(s.x===x&&s.y===y)return true;
    for(const o of this.orbs)if(o.x===x&&o.y===y)return true;
    for(const h of this.hazards)if(h.x===x&&h.y===y)return true;
    for(const p of this.powerItems)if(p.x===x&&p.y===y)return true;
    return false;
  }

  activatePower(type){
    this.sound.power();
    this.activePower=type;this.powerTimer=type.dur;
    const el=document.getElementById('h-power');el.classList.remove('hidden');
    document.getElementById('h-power-icon').textContent=type.icon;
    document.getElementById('h-power-name').textContent=type.name;
    document.getElementById('h-power-fill').style.width='100%';
    this.addTextPop(this.snake[0].x,this.snake[0].y-1,type.name,type.color);
  }

  // ===== Death =====
  die(){
    this.state='gameover';
    this.sound.die();
    this.spawnBurst(this.snake[0].x,this.snake[0].y,'#ff3300',20);

    // XP earned
    const xpEarned=Math.floor(this.score*0.3+this.orbsThisRun*2);
    this.save.xp+=xpEarned;
    // Level up
    let leveled=false;
    while(this.save.xp>=this.save.xpToNext){
      this.save.xp-=this.save.xpToNext;
      this.save.level++;
      this.save.xpToNext=Math.floor(this.save.xpToNext*1.25);
      leveled=true;
      // Award loot box every 3 levels
      if(this.save.level%3===0)this.save.lootBoxes++;
    }
    if(leveled)this.sound.lvl();

    // Credits earned
    const creditsEarned=Math.floor(this.orbsThisRun*0.5+this.score*0.01);
    this.save.credits+=creditsEarned;

    // Records
    let newBest=false;
    if(this.score>this.save.bestScore){this.save.bestScore=this.score;newBest=true}
    if(this.maxLen>this.save.bestLen){this.save.bestLen=this.maxLen;newBest=true}
    this.save.totalOrbs+=this.orbsThisRun;
    this.save.totalGames++;
    this.doSave();
    this.checkAch();

    // Game over UI
    this.hide('hud');
    document.getElementById('go-stats').innerHTML=`
      <div class="go-s"><span class="go-v">${this.score}</span><span class="go-l">Score</span></div>
      <div class="go-s"><span class="go-v">${this.maxLen}</span><span class="go-l">Length</span></div>
      <div class="go-s"><span class="go-v">${this.orbsThisRun}</span><span class="go-l">Orbs</span></div>
      <div class="go-s"><span class="go-v">${fmtTime(this.elapsed)}</span><span class="go-l">Time</span></div>`;
    document.getElementById('go-rewards').innerHTML=`+${xpEarned} XP · +${creditsEarned} 💰${leveled?' · <b>LEVEL UP!</b>':''}${this.save.level%3===0&&leveled?' · 📦 Loot Box!':''}`;
    document.getElementById('go-best').textContent=newBest?'🏆 NEW PERSONAL BEST!':'';
    setTimeout(()=>this.show('go-screen'),500);
  }

  // ===== HUD =====
  updateHUD(){
    document.getElementById('h-score').textContent=this.score;
    document.getElementById('h-len').textContent=this.snake.length;
    document.getElementById('h-lvl').textContent='Lv '+this.save.level;
    document.getElementById('h-xp-fill').style.width=(this.save.xp/this.save.xpToNext*100)+'%';
  }

  // ===== Particles =====
  spawnBurst(gx,gy,color,count){
    const cx=this.offsetX+(gx+.5)*this.cellSize;
    const cy=this.offsetY+(gy+.5)*this.cellSize;
    for(let i=0;i<count;i++){
      const a=Math.random()*Math.PI*2;const s=1+Math.random()*3;
      if(this.particles.length<200)
        this.particles.push({x:cx,y:cy,vx:Math.cos(a)*s*50,vy:Math.sin(a)*s*50,r:1.5+Math.random()*2.5,color,alpha:1,decay:1.5+Math.random()});
    }
  }
  addTextPop(gx,gy,text,color){
    const cx=this.offsetX+(gx+.5)*this.cellSize;
    const cy=this.offsetY+(gy+.5)*this.cellSize;
    this.textPops.push({x:cx,y:cy,text,color,alpha:1,vy:-40});
  }
  updateParticles(dt){for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.alpha-=p.decay*dt;if(p.alpha<=0)this.particles.splice(i,1)}}
  updateTextPops(dt){for(let i=this.textPops.length-1;i>=0;i--){const t=this.textPops[i];t.y+=t.vy*dt;t.alpha-=dt*1.2;if(t.alpha<=0)this.textPops.splice(i,1)}}

  // ===== Drawing =====
  draw(){
    const ctx=this.ctx;const sw=this.screenW;const sh=this.screenH;const cs=this.cellSize;
    const env=ENVS[this.envIdx];

    // Background
    const bg=ctx.createLinearGradient(0,0,0,sh);
    bg.addColorStop(0,env.bg1);bg.addColorStop(1,env.bg2);
    ctx.fillStyle=bg;ctx.fillRect(0,0,sw,sh);

    // Grid
    ctx.strokeStyle=env.grid;ctx.lineWidth=1;
    for(let i=this.arenaMin;i<=this.arenaMax+1;i++){
      const x=this.offsetX+i*cs;const y=this.offsetY+i*cs;
      ctx.beginPath();ctx.moveTo(x,this.offsetY+this.arenaMin*cs);ctx.lineTo(x,this.offsetY+(this.arenaMax+1)*cs);ctx.stroke();
      ctx.beginPath();ctx.moveTo(this.offsetX+this.arenaMin*cs,y);ctx.lineTo(this.offsetX+(this.arenaMax+1)*cs,y);ctx.stroke();
    }

    // Arena border
    const bx=this.offsetX+this.arenaMin*cs;const by=this.offsetY+this.arenaMin*cs;
    const bw=(this.arenaMax-this.arenaMin+1)*cs;const bh=bw;
    ctx.strokeStyle=env.wall;ctx.lineWidth=2;ctx.strokeRect(bx,by,bw,bh);

    if(this.state==='menu'){return}

    // Hazards
    this.hazards.forEach(h=>{
      const hx=this.offsetX+h.x*cs+cs/2;const hy=this.offsetY+h.y*cs+cs/2;
      ctx.fillStyle='rgba(255,51,0,.12)';ctx.beginPath();ctx.arc(hx,hy,cs*.55,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ff3300';ctx.beginPath();ctx.arc(hx,hy,cs*.3,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#ff3300';ctx.lineWidth=1;ctx.stroke();
    });

    // Orbs
    this.orbs.forEach(o=>{
      o.pulse+=0.05;
      const ox=this.offsetX+o.x*cs+cs/2;const oy=this.offsetY+o.y*cs+cs/2;
      const pulse=1+Math.sin(o.pulse)*.25;
      ctx.fillStyle=env.orb+'22';ctx.beginPath();ctx.arc(ox,oy,cs*.4*pulse,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=env.orb;ctx.beginPath();ctx.arc(ox,oy,cs*.22*pulse,0,Math.PI*2);ctx.fill();
    });

    // Powerup items
    this.powerItems.forEach(p=>{
      p.pulse+=0.04;
      const px=this.offsetX+p.x*cs+cs/2;const py=this.offsetY+p.y*cs+cs/2;
      const pulse=1+Math.sin(p.pulse)*.15;
      ctx.strokeStyle=p.type.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(px,py,cs*.4*pulse,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle=p.type.color;ctx.font=`${Math.floor(cs*.55)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(p.type.icon,px,py);
    });

    // Snake
    const skin=SKIN_DEFS.find(s=>s.id===this.save.activeSkin)||SKIN_DEFS[0];
    const t=this.interpProgress;
    const ghostActive=this.activePower&&this.activePower.id==='ghost';

    for(let i=this.snake.length-1;i>=0;i--){
      const curr=this.snake[i];const prev=this.prevSnake[i]||curr;
      let sx=this.offsetX+(prev.x+(curr.x-prev.x)*t)*cs+cs/2;
      let sy=this.offsetY+(prev.y+(curr.y-prev.y)*t)*cs+cs/2;
      const isHead=i===0;
      const r=cs*(isHead?0.42:0.35);

      ctx.globalAlpha=ghostActive?0.35:1;

      // Glow
      ctx.fillStyle=skin.glow;ctx.beginPath();ctx.arc(sx,sy,r+3,0,Math.PI*2);ctx.fill();

      // Body color
      let fillColor=isHead?skin.head:skin.body;
      if(skin.special==='rainbow')fillColor=`hsl(${(this.frameCount*3+i*15)%360},100%,55%)`;
      if(skin.special==='holo')fillColor=`hsl(${(this.frameCount*2+i*10)%360},60%,75%)`;

      const grad=ctx.createRadialGradient(sx-r*.2,sy-r*.2,r*.1,sx,sy,r);
      grad.addColorStop(0,'#fff');grad.addColorStop(.4,fillColor);grad.addColorStop(1,'#020008');
      ctx.fillStyle=grad;ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.fill();

      // Border
      ctx.strokeStyle=fillColor;ctx.lineWidth=1;ctx.stroke();

      if(isHead){
        // Eyes
        const ex=sx+this.dir.x*r*.35;const ey=sy+this.dir.y*r*.35;
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ex,ey,r*.25,0,Math.PI*2);ctx.fill();
      }
      ctx.globalAlpha=1;
    }

    // Shield visual
    if(this.activePower&&this.activePower.id==='shield'){
      const h=this.snake[0];const hx=this.offsetX+(this.prevSnake[0].x+(h.x-this.prevSnake[0].x)*t)*cs+cs/2;
      const hy=this.offsetY+(this.prevSnake[0].y+(h.y-this.prevSnake[0].y)*t)*cs+cs/2;
      ctx.strokeStyle='rgba(0,240,255,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(hx,hy,cs*.6,0,Math.PI*2);ctx.stroke();
    }

    // Particles
    this.particles.forEach(p=>{ctx.globalAlpha=p.alpha;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()});
    ctx.globalAlpha=1;

    // Text pops
    this.textPops.forEach(tp=>{ctx.globalAlpha=tp.alpha;ctx.fillStyle=tp.color;ctx.font='bold 11px Orbitron,sans-serif';ctx.textAlign='center';ctx.fillText(tp.text,tp.x,tp.y)});
    ctx.globalAlpha=1;

    // Survival shrink warning
    if(this.mode==='survival'&&this.arenaMin>0){
      ctx.fillStyle='rgba(255,51,0,.03)';
      ctx.fillRect(this.offsetX,this.offsetY,this.arenaMin*cs,GRID*cs);
      ctx.fillRect(this.offsetX+(this.arenaMax+1)*cs,this.offsetY,(GRID-this.arenaMax-1)*cs,GRID*cs);
      ctx.fillRect(this.offsetX+this.arenaMin*cs,this.offsetY,bw,this.arenaMin*cs);
      ctx.fillRect(this.offsetX+this.arenaMin*cs,this.offsetY+(this.arenaMax+1)*cs,bw,(GRID-this.arenaMax-1)*cs);
    }

    // Challenge objective
    if(this.challengeObj&&!this.challengeDone){
      ctx.fillStyle='rgba(255,170,0,.7)';ctx.font='bold 11px Orbitron,sans-serif';ctx.textAlign='center';
      ctx.fillText('🎯 '+this.challengeObj.desc,sw/2,sh-16);
    }
  }

  // ===== Missions =====
  buildMissions(){
    const today=todayStr();
    if(this.save.missionDate!==today){this.save.missionDate=today;this.save.missionDone=[];this.doSave()}
    const r=seededRand(todaySeed());
    const pool=[
      {name:'Orb Collector',desc:'Collect 50 orbs in a run',icon:'💎',check:g=>g.orbsThisRun>=50},
      {name:'Orb Master',desc:'Collect 150 orbs in a run',icon:'💠',check:g=>g.orbsThisRun>=150},
      {name:'Survivor',desc:'Survive 3 minutes',icon:'⏱️',check:g=>g.elapsed>=180},
      {name:'Length 60',desc:'Reach length 60',icon:'📏',check:g=>g.snake.length>=60},
      {name:'High Score',desc:'Score 5,000 in a run',icon:'⭐',check:g=>g.score>=5000},
      {name:'Snake Master',desc:'Reach length 100',icon:'🐍',check:g=>g.snake.length>=100},
    ];
    this.missions=[];
    const idxs=[];while(idxs.length<3){const i=Math.floor(r()*pool.length);if(!idxs.includes(i))idxs.push(i)}
    idxs.forEach((idx,i)=>this.missions.push({...pool[idx],idx:i,done:this.save.missionDone.includes(i)}));
    const list=document.getElementById('mission-list');list.innerHTML='';
    this.missions.forEach((m,i)=>{
      const el=document.createElement('div');el.className='mi'+(m.done?' done':'');
      el.innerHTML=`<div class="mi-icon">${m.done?'✅':m.icon}</div><div class="mi-info"><div class="mi-name">${m.name}</div><div class="mi-desc">${m.desc}</div></div><div class="mi-chk">${m.done?'✓':'○'}</div>`;
      list.appendChild(el);
    });
  }
  checkMissions(){
    this.missions.forEach((m,i)=>{
      if(!m.done&&m.check(this)){
        m.done=true;if(!this.save.missionDone.includes(m.idx)){this.save.missionDone.push(m.idx);this.save.credits+=100;this.save.xp+=150;this.doSave()}
        this.showToast('🎯',m.name+' Complete!');
      }
    });
  }

  // ===== Achievements =====
  buildAchievements(){
    const list=document.getElementById('ach-list');list.innerHTML='';
    Object.entries(ACHIEVEMENTS).forEach(([id,a])=>{
      const u=this.save.achievements.includes(id);
      const el=document.createElement('div');el.className='ai'+(u?' unlocked':'');
      el.innerHTML=`<div class="ai-icon">${a.icon}</div><div><div class="ai-name">${a.name}</div><div class="ai-desc">${a.desc}</div></div>`;
      list.appendChild(el);
    });
  }
  checkAch(){
    Object.entries(ACHIEVEMENTS).forEach(([id,a])=>{
      if(this.save.achievements.includes(id))return;
      if(a.check(this)){this.save.achievements.push(id);this.save.credits+=200;this.save.lootBoxes++;this.doSave();this.sound.ach();this.showToast(a.icon,a.name)}
    });
  }

  // ===== Skins =====
  buildSkins(){
    const list=document.getElementById('skin-list');list.innerHTML='';
    SKIN_DEFS.forEach(s=>{
      const u=this.save.unlockedSkins.includes(s.id);
      const a=this.save.activeSkin===s.id;
      const el=document.createElement('div');
      el.className='sk'+(a?' active':'')+(u?'':' locked');
      el.innerHTML=`<div class="sk-swatch" style="background:${s.head}"></div><div class="sk-name">${u?s.name:s.cost+'💰'}</div>`;
      if(u)el.addEventListener('click',()=>{this.save.activeSkin=s.id;this.doSave();this.buildSkins()});
      else if(this.save.credits>=s.cost)el.addEventListener('click',()=>{
        this.save.credits-=s.cost;this.save.unlockedSkins.push(s.id);this.save.activeSkin=s.id;this.doSave();this.updateMenu()});
      list.appendChild(el);
    });
  }
  buildTrails(){
    const list=document.getElementById('trail-list');list.innerHTML='';
    TRAIL_DEFS.forEach(t=>{
      const u=this.save.unlockedTrails.includes(t.id);
      const a=this.save.activeTrail===t.id;
      const el=document.createElement('div');
      el.className='sk'+(a?' active':'')+(u?'':' locked');
      el.innerHTML=`<div class="sk-swatch" style="background:${t.color||'transparent'}${t.id==='none'?';border-style:dashed':''}"></div><div class="sk-name">${u?t.name:t.cost+'💰'}</div>`;
      if(u)el.addEventListener('click',()=>{this.save.activeTrail=t.id;this.doSave();this.buildTrails()});
      else if(this.save.credits>=t.cost)el.addEventListener('click',()=>{
        this.save.credits-=t.cost;this.save.unlockedTrails.push(t.id);this.save.activeTrail=t.id;this.doSave();this.updateMenu()});
      list.appendChild(el);
    });
  }

  // ===== Loot =====
  openLootBox(){
    if(this.save.lootBoxes<1)return;
    this.save.lootBoxes--;this.save.totalLoot++;
    const reward=weightedPick(LOOT_TABLE);
    if(reward.type==='credits')this.save.credits+=reward.val;
    if(reward.type==='xp')this.save.xp+=reward.val;
    if(reward.type==='lootbox')this.save.lootBoxes+=reward.val;
    this.doSave();
    this.sound.loot();
    // Show result
    const el=document.getElementById('loot-result');el.classList.remove('hidden');
    el.innerHTML=`<span class="lr-icon">${reward.icon}</span><div class="lr-name">${reward.label}</div><div class="lr-rarity">${reward.rarity}</div>`;
    this.updateMenu();
  }

  // ===== Prestige =====
  doPrestige(){
    if(this.save.level<20)return;
    if(!confirm(`Prestige? You'll reset to Level 1 but gain +5% permanent score bonus.`))return;
    this.save.prestige++;this.save.prestigeBonus=this.save.prestige;
    this.save.level=1;this.save.xp=0;this.save.xpToNext=100;
    this.doSave();this.updateMenu();
    this.showToast('👑','Prestige '+this.save.prestige+'!');
  }

  // ===== Toast =====
  showToast(icon,name){
    document.getElementById('t-icon').textContent=icon;
    document.getElementById('t-name').textContent=name;
    const t=document.getElementById('toast');t.classList.add('active');
    setTimeout(()=>t.classList.remove('active'),3000);
  }

  // ===== Share =====
  shareScore(){
    const c=document.getElementById('share-canvas');const ctx=c.getContext('2d');
    ctx.fillStyle='#050110';ctx.fillRect(0,0,600,340);
    ctx.strokeStyle='#00f0ff';ctx.lineWidth=3;ctx.strokeRect(6,6,588,328);
    ctx.font='900 32px Orbitron,sans-serif';ctx.fillStyle='#00f0ff';ctx.textAlign='center';
    ctx.fillText('NEON SNAKE ROYALE',300,50);
    ctx.font='900 48px Orbitron,sans-serif';ctx.fillStyle='#fff';ctx.fillText(this.score,300,120);
    ctx.font='600 13px Orbitron,sans-serif';ctx.fillStyle='rgba(255,255,255,.5)';ctx.fillText('SCORE',300,142);
    ctx.font='700 16px Montserrat,sans-serif';ctx.fillStyle='#ff007f';
    ctx.fillText(`Length ${this.maxLen} · ${this.orbsThisRun} Orbs · ${fmtTime(this.elapsed)}`,300,190);
    ctx.font='600 12px Montserrat,sans-serif';ctx.fillStyle='rgba(255,255,255,.35)';
    ctx.fillText('Can you beat me? Play at neon-arcade.github.io',300,250);
    const link=document.createElement('a');link.download='neon-snake-score.png';link.href=c.toDataURL('image/png');link.click();
  }
}

// ============================================================================
// INIT
// ============================================================================
window.addEventListener('DOMContentLoaded',()=>{window.game=new NeonSnakeRoyale()});
