class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterVolume = 0.5;
    this.bgmVolume = 0.3;
    this.sfxVolume = 0.6;
    
    this.musicPlaying = false;
    this.musicInterval = null;
    this.tempo = 120; // BPM
    this.currentBeat = 0;
    
    // Bass sequence: A2 -> C3 -> G2 -> F2 (each 4 beats)
    this.bassNotes = [
      55.00, 55.00, 55.00, 55.00, // A1
      65.41, 65.41, 65.41, 65.41, // C2
      49.00, 49.00, 49.00, 49.00, // G1
      43.65, 43.65, 43.65, 43.65  // F1
    ];
    
    // Lead sequence
    this.leadNotes = [
      220.00, 0, 261.63, 329.63, 0, 261.63, 220.00, 0,
      261.63, 0, 329.63, 392.00, 0, 329.63, 261.63, 0,
      196.00, 0, 246.94, 293.66, 0, 246.94, 196.00, 0,
      174.61, 0, 220.00, 261.63, 0, 220.00, 174.61, 0
    ];
  }

  init() {
    if (this.ctx) return;
    
    // Create audio context after user interaction
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
    
    // BGM Gain node
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
    this.bgmGain.connect(this.masterGain);
    
    // SFX Gain node
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);
  }

  setVolume(type, val) {
    this.init();
    val = Math.max(0, Math.min(1, val));
    if (type === 'master') {
      this.masterVolume = val;
      if (this.masterGain) this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
    } else if (type === 'bgm') {
      this.bgmVolume = val;
      if (this.bgmGain) this.bgmGain.gain.setValueAtTime(val, this.ctx.currentTime);
    } else if (type === 'sfx') {
      this.sfxVolume = val;
      if (this.sfxGain) this.sfxGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  // --- BACKGROUND MUSIC ---
  startBGM() {
    this.init();
    if (this.musicPlaying) return;
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    this.musicPlaying = true;
    this.currentBeat = 0;
    
    const stepTime = 60 / this.tempo / 2; // Eighth notes
    let nextNoteTime = this.ctx.currentTime;
    
    const scheduleNext = () => {
      while (nextNoteTime < this.ctx.currentTime + 0.1) {
        if (!this.musicPlaying) return;
        this.playSeqStep(nextNoteTime);
        nextNoteTime += stepTime;
        this.currentBeat = (this.currentBeat + 1) % 32;
      }
      this.musicInterval = setTimeout(scheduleNext, 30);
    };
    
    scheduleNext();
  }

  stopBGM() {
    this.musicPlaying = false;
    if (this.musicInterval) {
      clearTimeout(this.musicInterval);
      this.musicInterval = null;
    }
  }

  playSeqStep(time) {
    if (!this.ctx || !this.bgmGain || this.bgmVolume === 0) return;
    
    // BASSLINE - play on 1, 3, 5, 7 beats (quarter notes basically)
    if (this.currentBeat % 2 === 0) {
      const bassIndex = Math.floor(this.currentBeat / 2) % this.bassNotes.length;
      const freq = this.bassNotes[bassIndex];
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, time);
      filter.frequency.exponentialRampToValueAtTime(100, time + 0.25);
      
      gain.gain.setValueAtTime(0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.28);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);
      
      osc.start(time);
      osc.stop(time + 0.3);
    }
    
    // SYNTH LEAD - play on melody notes
    const leadFreq = this.leadNotes[this.currentBeat];
    if (leadFreq > 0) {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(leadFreq, time);
      
      // detuned secondary oscillator for synth fatness
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(leadFreq * 1.005, time);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, time);
      filter.frequency.exponentialRampToValueAtTime(350, time + 0.2);
      
      gain.gain.setValueAtTime(0.12, time);
      gain.gain.linearRampToValueAtTime(0.06, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
      
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);
      
      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 0.25);
      osc2.stop(time + 0.25);
    }
    
    // PROCEDURAL DRUM - Kick on 1 and 5, Snare on 3 and 7 (in 8-beat cycles)
    const beat8 = this.currentBeat % 8;
    if (beat8 === 0 || beat8 === 4) {
      // Kick drum
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.frequency.setValueAtTime(120, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
      
      gain.gain.setValueAtTime(0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      
      osc.connect(gain);
      gain.connect(this.bgmGain);
      
      osc.start(time);
      osc.stop(time + 0.15);
    } else if (beat8 === 2 || beat8 === 6) {
      // Snare drum (synthesized using filter sweep + noise-like rapid triangle)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, time);
      
      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      
      osc.connect(gain);
      gain.connect(this.bgmGain);
      
      osc.start(time);
      osc.stop(time + 0.1);
      
      // Snare noise splash
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;
      
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
      
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.bgmGain);
      
      noise.start(time);
      noise.stop(time + 0.08);
    }
  }

  // --- PROCEDURAL SFX ---
  
  playLaser() {
    this.init();
    if (this.sfxVolume === 0) return;
    
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.15);
    
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(time);
    osc.stop(time + 0.16);
  }

  playJump() {
    this.init();
    if (this.sfxVolume === 0) return;
    
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(600, time + 0.18);
    
    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(time);
    osc.stop(time + 0.19);
  }

  playExplosion() {
    this.init();
    if (this.sfxVolume === 0) return;
    
    const time = this.ctx.currentTime;
    
    // Procedural explosion noise buffer
    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, time);
    filter.frequency.exponentialRampToValueAtTime(10, time + 0.4);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    noise.start(time);
    noise.stop(time + 0.45);
    
    // Add low-end boom oscillator
    const boom = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boom.frequency.setValueAtTime(100, time);
    boom.frequency.exponentialRampToValueAtTime(20, time + 0.25);
    
    boomGain.gain.setValueAtTime(0.5, time);
    boomGain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
    
    boom.connect(boomGain);
    boomGain.connect(this.sfxGain);
    boom.start(time);
    boom.stop(time + 0.3);
  }

  playPing() {
    this.init();
    if (this.sfxVolume === 0) return;
    
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, time);
    
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(time);
    osc.stop(time + 0.12);
  }

  playPowerup() {
    this.init();
    if (this.sfxVolume === 0) return;
    
    const time = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C E G C E
    
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = time + index * 0.06;
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
      
      osc.connect(gain);
      gain.connect(this.sfxGain);
      
      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  }

  playMerge() {
    this.init();
    if (this.sfxVolume === 0) return;
    
    const time = this.ctx.currentTime;
    
    // Dual oscillating frequencies for electronic merge sound
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(300, time);
    osc1.frequency.linearRampToValueAtTime(450, time + 0.12);
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(450, time);
    osc2.frequency.linearRampToValueAtTime(600, time + 0.12);
    
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);
    
    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.16);
    osc2.stop(time + 0.16);
  }

  playDamage() {
    this.init();
    if (this.sfxVolume === 0) return;
    
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.linearRampToValueAtTime(60, time + 0.2);
    
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.linearRampToValueAtTime(0.1, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(time);
    osc.stop(time + 0.23);
  }
}

// Create a globally accessible instance
const sound = new SoundEngine();
window.sound = sound;
