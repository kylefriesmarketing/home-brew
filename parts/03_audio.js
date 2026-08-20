"use strict";
/* SFX — all WebAudio synth: squelches, burps, and a banjo that grows with your fame */

const SFX = {
  ctx:null, master:null, musicG:null, ambG:null, ready:false, muted:false,
  rank:0, phase:"morning", nextStep:0, step:0, tempo:96,
  init(){
    if(this.ready) return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      this.ctx=new AC();
      /* ⚠️ PLAYTEST (Kyle): "screeching and awful, not peaceful nature."
         Everything was routed raw to the destination, so every bandpass
         squeal and clicky envelope hit the ear at full brightness. The whole
         bus now runs through a HIGH-SHELF CUT (−13dB above 3.2kHz — where
         "piercing" lives) then a gentle limiter, so nothing can spike.
         This tames every sound in the game at once. */
      this.master=this.ctx.createGain(); this.master.gain.value=0.42;
      const shelf=this.ctx.createBiquadFilter();
      shelf.type="highshelf"; shelf.frequency.value=3200; shelf.gain.value=-13;
      const air=this.ctx.createBiquadFilter();       // second stage: nothing above 9k
      air.type="lowpass"; air.frequency.value=9000; air.Q.value=0.5;
      const comp=this.ctx.createDynamicsCompressor();
      comp.threshold.value=-20; comp.knee.value=26; comp.ratio.value=4;
      comp.attack.value=0.006; comp.release.value=0.22;
      this.master.connect(shelf); shelf.connect(air); air.connect(comp);
      comp.connect(this.ctx.destination);
      this.shelf=shelf; this.air=air; this.comp=comp;   // kept for tuning/verification
      this.musicG=this.ctx.createGain(); this.musicG.gain.value=0.34; this.musicG.connect(this.master);
      this.ambG=this.ctx.createGain(); this.ambG.gain.value=0.3; this.ambG.connect(this.master);
      this.ready=true;
    }catch(e){ /* no audio env */ }
  },
  toggleMute(){ this.muted=!this.muted; if(this.master) this.master.gain.value=this.muted?0:0.42; return this.muted; },

  _out(x,z){
    if(!this.ready) return null;
    const g=this.ctx.createGain();
    let node=g;
    if(x!==undefined && MAIN.player){
      const dx=x-MAIN.player.x, dz=z-MAIN.player.z;
      const d=Math.hypot(dx,dz);
      g.gain.value = 1/(1+d/9);
      if(this.ctx.createStereoPanner){
        const p=this.ctx.createStereoPanner(); p.pan.value=clamp(dx/16,-0.85,0.85);
        g.connect(p); p.connect(this.master); return {g, in:g};
      }
    }
    g.connect(this.master); return {g, in:g};
  },
  tone(freq, dur, type="sine", vol=0.3, x, z, bend=0){
    if(!this.ready) return;
    const o=this.ctx.createOutput?null:null;
    const out=this._out(x,z); if(!out) return;
    const t=this.ctx.currentTime;
    const osc=this.ctx.createOscillator(); osc.type=type; osc.frequency.setValueAtTime(freq,t);
    if(bend) osc.frequency.exponentialRampToValueAtTime(Math.max(20,freq+bend), t+dur);
    const g=this.ctx.createGain();
    /* ⚠️ every tone in the game used to START AT FULL VOLUME on the same
       sample — an instant onset is a CLICK, and hundreds of them a minute is
       most of what "screeching" was. A 12ms attack costs nothing and removes
       the pop from every sound at once. */
    const atk=Math.min(0.012, dur*0.3);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+atk);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    osc.connect(g); g.connect(out.in);
    osc.start(t); osc.stop(t+dur+0.02);
  },
  noise(dur, vol=0.3, freq=800, q=1, x, z, bend=0){
    if(!this.ready) return;
    const out=this._out(x,z); if(!out) return;
    const t=this.ctx.currentTime;
    const len=Math.max(1,(dur*this.ctx.sampleRate)|0);
    const buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate);
    const d=buf.getChannelData(0); for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    const src=this.ctx.createBufferSource(); src.buffer=buf;
    const f=this.ctx.createBiquadFilter(); f.type="bandpass"; f.frequency.setValueAtTime(freq,t); f.Q.value=q;
    if(bend) f.frequency.exponentialRampToValueAtTime(Math.max(40,freq+bend), t+dur);
    const g=this.ctx.createGain();
    const atk=Math.min(0.014, dur*0.3);                     // no instant onsets
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+atk);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    src.connect(f); f.connect(g); g.connect(out.in);
    src.start(t); src.stop(t+dur);
  },
  pluck(freq, vol=0.5, dest){
    if(!this.ready) return;
    const t=this.ctx.currentTime;
    const burst=this.ctx.createBuffer(1,(0.02*this.ctx.sampleRate)|0,this.ctx.sampleRate);
    const bd=burst.getChannelData(0); for(let i=0;i<bd.length;i++) bd[i]=Math.random()*2-1;
    const src=this.ctx.createBufferSource(); src.buffer=burst;
    const delay=this.ctx.createDelay(0.1); delay.delayTime.value=1/freq;
    const fb=this.ctx.createGain(); fb.gain.value=0.93;
    const lp=this.ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=freq*6;
    const g=this.ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+1.3);
    src.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay);
    delay.connect(g); g.connect(dest||this.musicG);
    src.start(t); src.stop(t+0.03);
    setTimeout(()=>{ try{fb.disconnect(); delay.disconnect(); lp.disconnect(); g.disconnect();}catch(e){} }, 1600);
  },

  play(name, x, z){
    if(!this.ready) return;
    switch(name){
      case "thud": this.noise(0.12,0.4,180,1.2,x,z); break;
      case "kegbounce": this.tone(90,0.25,"sine",0.5,x,z,-30); this.noise(0.1,0.3,300,1,x,z); break;
      case "clank": this.noise(0.09,0.4,2400,3,x,z); this.tone(620,0.15,"square",0.12,x,z,-200); break;
      case "putt": this.tone(70+rand(20),0.08,"square",0.16,x,z); break;
      case "pour": this.noise(0.5,0.28,900,1.4,x,z,-300); break;
      case "glug": this.tone(160,0.14,"sine",0.4,x,z,60); this.tone(110,0.16,"sine",0.3,x,z,40); break;
      case "plop": this.tone(300,0.1,"sine",0.45,x,z,-160); break;
      case "splash": this.noise(0.35,0.4,1200,1,x,z,-500); break;
      case "sizzle": this.noise(0.5,0.22,3000,1,x,z); break;
      case "ding": this.tone(1180,0.5,"triangle",0.3,x,z); break;
      case "chaching": this.tone(880,0.1,"square",0.2,x,z); this.tone(1320,0.35,"triangle",0.28,x,z); break;
      case "burp": this.tone(110,0.4,"sawtooth",0.4,x,z,-45); this.noise(0.3,0.15,300,1,x,z,-100); break;
      case "fart": this.tone(85,0.5,"sawtooth",0.35,x,z,-30); this.noise(0.4,0.2,200,2,x,z,-80); break;
      case "squelch": this.noise(0.2,0.4,500,2,x,z,-250); break;
      case "boing": this.tone(220,0.4,"sine",0.4,x,z,190); break;
      case "honk": this.tone(290,0.3,"sawtooth",0.4,x,z); this.tone(360,0.3,"sawtooth",0.3,x,z); break;
      case "doorbell": this.tone(760,0.25,"triangle",0.3,x,z); this.tone(600,0.4,"triangle",0.3,x,z); break;
      case "yay": [523,659,784].forEach((f,i)=>setTimeout(()=>this.tone(f,0.25,"triangle",0.3,x,z),i*90)); break;
      case "ew": this.tone(300,0.5,"sawtooth",0.22,x,z,-180); break;
      case "bubble": this.tone(rand(300,600),0.1,"sine",0.16,x,z,120); break;
      case "cordpull": this.noise(0.2,0.3,600,2,x,z,900); break;
      case "unfold": [392,494,587,784].forEach((f,i)=>setTimeout(()=>this.tone(f,0.3,"triangle",0.3,x,z),i*110)); break;
      case "snore": this.tone(90,0.8,"sawtooth",0.2,x,z,25); break;
      case "spit": this.noise(0.15,0.4,1800,1.5,x,z,-800); break;
      case "gulp": this.tone(200,0.16,"sine",0.35,x,z,-90); break;
      case "hiccup": this.tone(500,0.12,"sine",0.3,x,z,240); break;
      case "fire": this.noise(0.6,0.2,400,0.8,x,z); break;
      case "steam": this.noise(0.8,0.24,2400,0.8,x,z,-900); break;
      case "rooster": [[440,.12],[550,.1],[660,.28],[520,.35]].forEach(([f,d],i)=>
        setTimeout(()=>this.tone(f,d,"sawtooth",0.22,x,z,i===3?-160:60),i*130)); break;
      case "thunder": this.noise(1.6,0.5,90,0.7,x,z,-40); setTimeout(()=>this.noise(0.9,0.3,60,0.6),300); break;
      case "growl": this.tone(70,0.7,"sawtooth",0.3,x,z,-15); this.noise(0.6,0.2,150,1.6,x,z); break;
      case "step": this.noise(0.05,0.13,240,1,x,z); break;
      case "alarm": [0,250,500].forEach(ms=>setTimeout(()=>this.tone(1400,0.18,"square",0.14),ms)); break;
      case "blip": default: this.tone(600,0.1,"triangle",0.2,x,z); break;
    }
  },

  /* banjo brain: pentatonic G, layers with rank */
  PENT:[196,220,247,294,330,392,440,494,587,659,784],
  ROOTS:[196,196,261.6,196,146.8,196,261.6,146.8],
  bar:0,
  /* ⚠️ PLAYTEST: the jug band used to play FOREVER — ~3 Karplus-Strong plucks
     a second, every second of every day, feedback 0.93 and a bright lowpass.
     Relentless, and the opposite of "peaceful nature". The band now plays only
     when there is a REASON: June's fiddle lead, which it backs. Otherwise the
     mountain's own bed carries the room. (`musicOn` can turn the band back on
     for a special moment; nothing sets it today.) */
  musicOn:false, fiddleLeadUntil:0,
  musicUpdate(dt){
    if(!this.ready || this.muted) return;
    const t=this.ctx.currentTime;
    if(!this.musicOn && t>=this.fiddleLeadUntil) return;
    if(t<this.nextStep) return;
    const stepDur=60/this.tempo/2; // 8ths
    this.nextStep=Math.max(t, this.nextStep)+stepDur;
    this.step++;
    const s=this.step%8;
    if(s===0) this.bar++;
    const night=(CYCLE&&CYCLE.phase==="night");
    if(night && this.step%2) return; // sparser at night
    /* while June's fiddle leads, the banjo holds its melody and the drone
       rests — bass and washboard keep the floor under her */
    const fiddleLead = t<this.fiddleLeadUntil;
    // melody pluck (random walk)
    if(!fiddleLead){
      this._mi = clamp((this._mi??4)+pick([-2,-1,-1,0,1,1,2]),0,this.PENT.length-1);
      if(Math.random()<0.8) this.pluck(this.PENT[this._mi], 0.32);
      if(Math.random()<0.18) this.pluck(this.PENT[clamp(this._mi+2,0,this.PENT.length-1)],0.2);
    }
    // bass on beats (rank 1+)
    if(this.rank>=1 && s%2===0) this.pluck(this.ROOTS[this.bar%8]/2, 0.4);
    // washboard (rank 2+)
    if(this.rank>=2 && s%2===1) this.noise(0.04,0.09,5000,1.5);
    // fiddle drone (rank 3+) — never under the real fiddle
    if(this.rank>=3 && s===0 && !fiddleLead && Math.random()<0.5){
      const f=pick([392,440,587]);
      this.tone(f,stepDur*7,"sawtooth",0.05); this.tone(f*1.5,stepDur*7,"sawtooth",0.03);
    }
    // jaw harp twang (rank 4+) — the full jug band
    if(this.rank>=4 && s===4 && Math.random()<0.45)
      this.tone(150,stepDur*2.2,"square",0.06,undefined,undefined,110);
  },
  ambT:0, rainT:0, breathT:0, crowdT:0,
  ambUpdate(dt){
    if(!this.ready||this.muted) return;
    /* layered beds that stack over the phase ambience */
    this.rainT-=dt;
    if(typeof G_STATE!=="undefined" && G_STATE && G_STATE.weather==="storm" && this.rainT<=0){
      this.rainT=0.35;
      this.noise(0.55,0.10,1400,0.5,undefined,undefined,-200);          // rain patter on the roof
      if(Math.random()<0.10) this.noise(2.2,0.15,70,0.5,undefined,undefined,-20);  // distant roll
    }
    this.breathT-=dt;
    if(typeof BREW!=="undefined" && BREW.boil && this.breathT<=0){
      this.breathT=1.1;
      this.noise(0.7, 0.035+BREW.boil.heat*0.08, 260, 0.7, undefined, undefined, 80);   // the kettle breathes
    }
    this.crowdT-=dt;
    if(typeof PUB!=="undefined" && PUB.customers.length>3 && this.crowdT<=0){
      this.crowdT=rand(1.2,2.4);
      this.noise(1.4, 0.045+Math.min(PUB.customers.length,10)*0.006, 500, 0.4, undefined, undefined, rand(-80,80));  // murmur
    }
    this.ambT-=dt;
    if(this.ambT>0) return;
    const ph=CYCLE?CYCLE.phase:"morning";
    const season=(typeof SEASONS!=="undefined")?SEASONS.current:"fall";
    /* ⚠️ PLAYTEST REWRITE. Every one of these lived in the most piercing band
       of human hearing: cicadas were bandpass noise at 5200Hz with Q=3 (that
       IS a screech), crickets 4200Hz, peepers 2700Hz, birds up to 3200Hz in
       90ms stabs. All moved DOWN an octave or more, given length and softer
       gain, and the 5.2kHz cicada is deleted outright. The continuous wind and
       water bed (startNatureBed) now carries the soundscape; these are just
       occasional voices on top of it. */
    if(ph==="morning"){                            // birdsong: falling, warm, sparse
      const f=rand(900,1500);
      const reps=season==="winter"?[0]:[0,150];
      reps.forEach((ms,i)=>setTimeout(()=>this.tone(f+i*rand(-120,160),0.22,"sine",
        season==="winter"?0.045:0.06,undefined,undefined,-180),ms));
      this.ambT=season==="winter"?rand(5,10):rand(3,7);
    } else if(ph==="afternoon"){
      if(Math.random()<0.5){ const f=rand(800,1400); this.tone(f,0.26,"sine",0.05,undefined,undefined,-140); }
      this.ambT=rand(4,9);
    } else {
      if(season==="winter"){                       // wind, and an owl with opinions
        this.noise(rand(1.6,2.6),0.055,220,0.4,undefined,undefined,-90);
        if(Math.random()<0.12) setTimeout(()=>this.tone(300,0.7,"sine",0.07,undefined,undefined,-40),400);
        this.ambT=rand(3,6);
      } else if(season==="spring"){                // peepers, an octave down
        const n=2+irand(3);
        for(let i=0;i<n;i++) setTimeout(()=>this.tone(1350+rand(-90,120),0.13,"sine",0.04),i*150);
        this.ambT=rand(2,4);
      } else {                                     // crickets — summer & fall
        const n=2+irand(2);
        for(let i=0;i<n;i++) setTimeout(()=>this.tone(2100+rand(-140,160),0.1,"sine",0.035),i*170);
        if(ph==="night"&&Math.random()<0.1) setTimeout(()=>this.tone(300,0.7,"sine",0.07,undefined,undefined,-40),400);
        this.ambT=rand(1.8,3.6);
      }
    }
  },

  /* ---------- THE BED: continuous, soft, always there ----------
     Discrete blips can never sound like a place. A quiet wind layer plus the
     crick running is what makes a mountain feel like a mountain — and it gives
     the ear something gentle to sit on instead of silence punctuated by pings. */
  bedNodes:null,
  startNatureBed(){
    if(!this.ready || this.bedNodes) return;
    const ctx=this.ctx, t=ctx.currentTime;
    const mk=(cutoff, q, gain, lfoRate, lfoDepth)=>{
      const len=(4*ctx.sampleRate)|0;
      const buf=ctx.createBuffer(1,len,ctx.sampleRate);
      const d=buf.getChannelData(0);
      /* brown-ish noise: integrated white, far softer than raw white noise */
      let last=0;
      for(let i=0;i<len;i++){ const w=Math.random()*2-1; last=(last+0.02*w)/1.02; d[i]=last*3.5; }
      const src=ctx.createBufferSource(); src.buffer=buf; src.loop=true;
      const f=ctx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=cutoff; f.Q.value=q;
      const g=ctx.createGain(); g.gain.value=gain;
      /* slow swell so the wind breathes instead of hissing flat */
      const lfo=ctx.createOscillator(); lfo.frequency.value=lfoRate;
      const lg=ctx.createGain(); lg.gain.value=lfoDepth;
      lfo.connect(lg); lg.connect(g.gain);
      src.connect(f); f.connect(g); g.connect(this.ambG);
      src.start(t); lfo.start(t);
      return {src,g,lfo,f};
    };
    this.bedNodes={
      wind: mk(420, 0.6, 0.10, 0.055, 0.055),   // the ridge
      leaves: mk(1500, 0.5, 0.022, 0.09, 0.014), // treeline rustle
      crick: mk(950, 1.4, 0.020, 0.13, 0.008),   // water over stones
    };
  },
  /* the bed leans with weather and time — louder wind in a storm, hushed at night */
  bedUpdate(){
    const B=this.bedNodes; if(!B) return;
    const storm=(typeof G_STATE!=="undefined" && G_STATE && G_STATE.weather==="storm");
    const night=(typeof CYCLE!=="undefined" && CYCLE.phase==="night");
    const w=storm?0.26:(night?0.07:0.10);
    const t=this.ctx.currentTime;
    B.wind.g.gain.setTargetAtTime(w, t, 2.5);
    B.wind.f.frequency.setTargetAtTime(storm?700:420, t, 2.5);
    B.leaves.g.gain.setTargetAtTime(storm?0.05:0.022, t, 2.5);
  },
  bedT:0,
  update(dt){
    this.musicUpdate(dt); this.ambUpdate(dt);
    if(this.ready && !this.bedNodes) this.startNatureBed();
    this.bedT-=dt; if(this.bedT<=0){ this.bedT=1.5; this.bedUpdate(); }
  },
};

/* camera shake helper lives here for convenience */
let _shake=0;
function shake(n){ _shake=Math.min(1,_shake+n); }

/* ============================================================================
   JUNE'S FIDDLE — a real voice, not UI pings. Sawtooth through a lowpass with
   slide-in and late vibrato (the two tells of a bowed string), a whisper of
   bow noise, double-stop fifths on the long notes. Plays a composed 8-bar
   old-time reel in G — same key and step clock as the banjo brain above, so
   the band backs her: while she leads, musicUpdate keeps bass + washboard but
   holds its own random-walk melody and drone (see fiddleLeadUntil gate).
   ============================================================================ */
SFX.fiddleLeadUntil=0;
SFX.fiddleNote = function(freq, dur, when, vol=0.11){
  if(!this.ready) return;
  const t=when;
  const osc=this.ctx.createOscillator(); osc.type="sawtooth";
  osc.frequency.setValueAtTime(freq*0.965, t);                 // slide in
  osc.frequency.exponentialRampToValueAtTime(freq, t+0.045);
  const vib=this.ctx.createOscillator(); vib.frequency.value=5.4;
  const vibG=this.ctx.createGain(); vibG.gain.setValueAtTime(0,t);
  vibG.gain.linearRampToValueAtTime(freq*0.006, t+Math.min(0.14,dur*0.5));  // vibrato arrives late
  vib.connect(vibG); vibG.connect(osc.frequency);
  const lp=this.ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=2300; lp.Q.value=0.8;
  const g=this.ctx.createGain();
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(vol, t+0.025);
  g.gain.setValueAtTime(vol, t+Math.max(0.03,dur-0.06));
  g.gain.exponentialRampToValueAtTime(0.001, t+dur);
  osc.connect(lp); lp.connect(g); g.connect(this.musicG);
  osc.start(t); osc.stop(t+dur+0.03); vib.start(t); vib.stop(t+dur+0.03);
  /* a fifth below on held notes — the double-stop */
  if(dur>0.5){
    const o2=this.ctx.createOscillator(); o2.type="sawtooth"; o2.frequency.setValueAtTime(freq*2/3, t);
    const lp2=this.ctx.createBiquadFilter(); lp2.type="lowpass"; lp2.frequency.value=1800;
    const g2=this.ctx.createGain();
    g2.gain.setValueAtTime(0.0001,t); g2.gain.exponentialRampToValueAtTime(vol*0.4, t+0.03);
    g2.gain.exponentialRampToValueAtTime(0.001, t+dur);
    o2.connect(lp2); lp2.connect(g2); g2.connect(this.musicG);
    o2.start(t); o2.stop(t+dur+0.03);
  }
};
/* the reel: A strain low and rocking, B strain high and bright — [freq, 8ths] */
SFX.REEL=[
  [392,1],[494,1],[587,1],[494,1],[659,1],[587,1],[494,1],[440,1],
  [392,1],[494,1],[587,1],[494,1],[440,2],[330,2],
  [392,1],[494,1],[587,1],[494,1],[659,1],[587,1],[494,1],[440,1],
  [587,1],[523,1],[494,1],[440,1],[392,4],
  [784,2],[659,1],[587,1],[784,2],[659,1],[587,1],
  [659,1],[587,1],[523,1],[494,1],[440,2],[587,2],
  [784,2],[659,1],[587,1],[659,1],[587,1],[523,1],[494,1],
  [587,1],[523,1],[494,1],[440,1],[392,4],
];
SFX.fiddleTune = function(){
  if(!this.ready) return 16;
  const stepDur=60/this.tempo/2;
  let t=Math.max(this.ctx.currentTime+0.12, this.nextStep);   // fall in with the band
  const t0=t;
  for(const [f,len] of this.REEL){
    const d=len*stepDur;
    this.fiddleNote(f, d*0.92, t);
    /* bow whisper rides the phrase starts */
    if(Math.random()<0.3) this.noise(d*0.8, 0.016, 3200, 0.7);
    t+=d;
  }
  this.fiddleLeadUntil=t;
  return t-t0;
};
