"use strict";
/* SEASONS — the rolling calendar (10-day wheel, fall first), winter's whole
   costume, the Brag Board plaque wall, and Copperhead's post-Worlds visits.
   Season is DERIVED from G_STATE.day — nothing new in the save except brags
   and a few flags, all deep-defaulted. */

const SEASONS = {
  current:"fall", lerpT:1, force:null, _init:false,
  winterF:0, springF:0,
  base:null, from:null, target:null, mask:null,
  slots:[], scanT:1,
};

SEASONS.of = function(day){
  if(SEASONS.force) return SEASONS.force;
  return DATA.SEASONS.order[Math.floor(((day||1)-1)/DATA.SEASONS.daysPer)%4];
};

/* ---------- terrain palette ---------- */
SEASONS.setupTerrain = function(){
  const geo=WORLD.props.ground.geometry;
  const col=geo.attributes.color;
  SEASONS.base=new Float32Array(col.array);
  SEASONS.from=new Float32Array(col.array);
  SEASONS.target=new Float32Array(col.array);
  SEASONS.mask=new Uint8Array(col.count);
  for(let i=0;i<col.count;i++){
    const r=SEASONS.base[i*3], g=SEASONS.base[i*3+1], b=SEASONS.base[i*3+2];
    SEASONS.mask[i]=(g>r*1.02 && g>b*1.05)?1:0;      // "is this vertex grassy"
  }
};
SEASONS.computeTarget = function(season){
  const B=SEASONS.base, T=SEASONS.target, M=SEASONS.mask;
  const mixTo=(i,tr,tg,tb,f)=>{ T[i*3]=B[i*3]+(tr-B[i*3])*f; T[i*3+1]=B[i*3+1]+(tg-B[i*3+1])*f; T[i*3+2]=B[i*3+2]+(tb-B[i*3+2])*f; };
  for(let i=0;i<M.length;i++){
    if(season==="winter")               mixTo(i, 0.88,0.91,0.96, M[i]?0.82:0.30);
    else if(season==="spring" && M[i])  mixTo(i, 0.42,0.68,0.30, 0.35);
    else if(season==="summer" && M[i])  mixTo(i, 0.66,0.66,0.34, 0.32);
    else { T[i*3]=B[i*3]; T[i*3+1]=B[i*3+1]; T[i*3+2]=B[i*3+2]; }
  }
};

/* ---------- winter dressing ---------- */
SEASONS.buildDressing = function(){
  /* snowfall + spring petals */
  const mkPts=(n,size,color,op)=>{
    const g=new THREE.BufferGeometry();
    const pos=new Float32Array(n*3);
    for(let i=0;i<n;i++){ pos[i*3]=rand(-50,50); pos[i*3+1]=rand(1,24); pos[i*3+2]=rand(-40,30); }
    g.setAttribute("position",new THREE.BufferAttribute(pos,3));
    const m=new THREE.Points(g,new THREE.PointsMaterial({color, size, transparent:true, opacity:0, sizeAttenuation:true}));
    WORLD.scene.add(m); return m;
  };
  SEASONS.snow=mkPts(320,0.22,0xf4f8ff);
  SEASONS.petals=mkPts(150,0.16,0xf0a8c0);

  /* the crick freezes over */
  const ice=new THREE.Mesh(geoGet("crickice",()=>new THREE.PlaneGeometry(7.6,66)),
    new THREE.MeshStandardMaterial({color:0xdceef8, transparent:true, opacity:0, roughness:0.25}));
  ice.rotation.x=-Math.PI/2; ice.position.set(-30.5,-1.28,-4);
  WORLD.scene.add(ice); SEASONS.ice=ice;
  const pice=new THREE.Mesh(geoGet("poolice",()=>new THREE.CircleGeometry(2.7,18)), ice.material);
  pice.rotation.x=-Math.PI/2; pice.position.set(6, WORLD.getH(6,-33)+0.09, -33);
  WORLD.scene.add(pice);

  /* icicles under the eaves */
  const ig=new THREE.Group();
  const im=new THREE.MeshStandardMaterial({color:0xdff0f8, transparent:true, opacity:0, roughness:0.15});
  const put=(x,y,z)=>{ const c=new THREE.Mesh(geoGet("icicle",()=>new THREE.ConeGeometry(0.05,0.42,5)), im);
    c.rotation.x=Math.PI; c.scale.setScalar(rand(0.6,1.3)); c.position.set(x,y,z); ig.add(c); };
  for(let x=-18;x<-5;x+=1.7) put(x+rand(-.3,.3), 5.4, 6.1);
  for(let x=4.5;x<20;x+=1.9) put(x+rand(-.3,.3), 5.6, 7.6);
  for(let x=-18;x<-5;x+=2.3) put(x+rand(-.3,.3), 5.4, -10.1);
  WORLD.scene.add(ig);
  SEASONS.icicles=ig; SEASONS.icicleMat=im;
};

/* ---------- season change ---------- */
SEASONS.applySeason = function(season, instant){
  if(season===SEASONS.current && SEASONS._init) return;
  const col=WORLD.props.ground.geometry.attributes.color;
  SEASONS.from.set(col.array);
  SEASONS.computeTarget(season);
  const was=SEASONS.current;
  SEASONS.current=season;
  SEASONS.lerpT=instant?1:0;
  if(instant){ col.array.set(SEASONS.target); col.needsUpdate=true; }
  if(SEASONS._init && !instant){
    /* the ONE season-turn announcement (a Fable-pass duplicate in STORY.onDay
       used to fire a second toast 2.5s after this one) */
    const M={ winter:"❄️ Frost on the kettle. Winter's here — the mountain keeps what it grows now.",
      spring:"🌱 The crick's runnin' loud again. Spring's on the mountain — peepers out, storms brewin'.",
      summer:"☀️ The haze settled in overnight. Summer's here — tourists follow the warmth.",
      fall:"🍁 First red leaf on the porch this morning. Fall's coming down the ridge — leaf-peepers soon." };
    setTimeout(()=>toast(M[season],"gold",4600),2400);
  }
  /* winter-brewing brag bookkeeping */
  if(G_STATE){
    if(season==="winter") G_STATE.flags._wbrews=(G_STATE.stats.brews||0);
    else if(was==="winter" && (G_STATE.stats.brews||0)>(G_STATE.flags._wbrews||0)) G_STATE.flags.winterBrewed=true;
  }
  SEASONS._init=true;
};

SEASONS.seasonUpdate = function(dt){
  /* palette lerp */
  if(SEASONS.lerpT<1){
    SEASONS.lerpT=Math.min(1,SEASONS.lerpT+dt/4);
    const col=WORLD.props.ground.geometry.attributes.color;
    const a=col.array, F=SEASONS.from, T=SEASONS.target, t=SEASONS.lerpT;
    for(let i=0;i<a.length;i++) a[i]=F[i]+(T[i]-F[i])*t;
    col.needsUpdate=true;
  }
  SEASONS.winterF=damp(SEASONS.winterF, SEASONS.current==="winter"?1:0, 1.2, dt);
  SEASONS.springF=damp(SEASONS.springF, SEASONS.current==="spring"?1:0, 1.2, dt);
  /* cover tint */
  if(ALIVE.coverMeshes) for(const cm of ALIVE.coverMeshes){
    const c=cm.im.material.color, b=cm.base;
    let tr=b.r,tg=b.g,tb=b.b;
    if(SEASONS.current==="winter"){ tr=b.r+(0.9-b.r)*0.85; tg=b.g+(0.93-b.g)*0.85; tb=b.b+(0.97-b.b)*0.85; }
    else if(SEASONS.current==="summer" && (cm.kind==="tuft"||cm.kind==="clover")){ tr=b.r+(0.7-b.r)*0.4; tg=b.g+(0.66-b.g)*0.25; tb=b.b+(0.32-b.b)*0.4; }
    else if(SEASONS.current==="spring" && (cm.kind==="tuft"||cm.kind==="clover")){ tr=b.r*0.9; tg=Math.min(1,b.g*1.12); tb=b.b*0.9; }
    c.r=damp(c.r,tr,1.5,dt); c.g=damp(c.g,tg,1.5,dt); c.b=damp(c.b,tb,1.5,dt);
  }
  /* snow + petals */
  if(SEASONS.snow){
    SEASONS.snow.material.opacity=damp(SEASONS.snow.material.opacity, SEASONS.winterF*0.9, 1.5, dt);
    if(SEASONS.snow.material.opacity>0.02){
      const p=SEASONS.snow.geometry.attributes.position;
      for(let i=0;i<p.count;i++){
        let y=p.getY(i)-dt*1.15;
        if(y<0.1) y=rand(18,24);
        p.setY(i,y);
        p.setX(i, p.getX(i)+Math.sin(CLAY.raw*0.8+i)*dt*0.35);
      }
      p.needsUpdate=true;
    }
    SEASONS.petals.material.opacity=damp(SEASONS.petals.material.opacity, SEASONS.springF*0.85, 1.5, dt);
    if(SEASONS.petals.material.opacity>0.02){
      const p=SEASONS.petals.geometry.attributes.position;
      for(let i=0;i<p.count;i++){
        let y=p.getY(i)-dt*0.55;
        if(y<0.1) y=rand(14,20);
        p.setY(i,y);
        p.setX(i, p.getX(i)+Math.sin(CLAY.raw*1.3+i*2)*dt*0.7);
      }
      p.needsUpdate=true;
    }
  }
  if(SEASONS.ice) SEASONS.ice.material.opacity=SEASONS.winterF*0.85;
  if(SEASONS.icicleMat) SEASONS.icicleMat.opacity=SEASONS.winterF*0.95;
  /* everyone's breath shows in the cold */
  if(SEASONS.winterF>0.5 && G_STATE){
    const P=MAIN.player;
    if(P && Math.random()<dt*0.5) puff(P.x+Math.sin(P.facing)*0.3, P.y+1.55, P.z+Math.cos(P.facing)*0.3, 0xeef4f8, 0.09, 0.3, 0.8);
    for(const c of PUB.customers) if(Math.random()<dt*0.3) puff(c.rig.x, c.rig.y+1.6, c.rig.z, 0xeef4f8, 0.08, 0.3, 0.7);
  }
};

/* ============================================================
   THE BRAG BOARD — plaques you can point at
   ============================================================ */
const BRAG_CHECKS = {
  firstbrew:  g=>(g.stats.brews||0)>=1,
  firstlegend:g=>Object.keys(g.discovered).length>=1,
  alllegend:  g=>Object.keys(g.discovered).length>=DATA.LEGENDARIES.length,
  served100:  g=>(g.stats.served||0)>=100,
  fairwon:    g=>g.fairWonDay>0,
  worldswon:  g=>!!g.flags.worldsWon,
  leaf:       g=>!!g.flags.leafSurvived,
  bearfriend: g=>!!g.flags.bearFriend,
  mop10:      g=>(g.stats.mopped||0)>=10,
  bottles:    g=>(g.stats.bottled||0)>=100,
  bobfan:     g=>(g.stats.bobReviews||0)>=5,
  hats:       g=>(g.hatsOwned||[]).length>=6,
  rich:       g=>(g.stats.maxCash||0)>=1000,
  winter:     g=>!!g.flags.winterBrewed,
  joe:        g=>(g.stats.joePints||0)>=5,
  machines:   g=>Object.keys(g.machines).filter(k=>g.machines[k]).length>=8,
};

SEASONS.buildBoard = function(){
  const back=clayBox(12.2,1.0,0.08,0x5e402a,0.03,1201);
  back.position.set(11.8,3.55,-8.76);
  WORLD.scene.add(back);
  for(let i=0;i<DATA.BRAGS.length;i++){
    const ghost=clayBox(0.5,0.6,0.05,0x4a3626,0.03,1202);
    ghost.position.set(6.35+i*0.72, 3.55, -8.7);
    WORLD.scene.add(ghost);
    SEASONS.slots.push({ghost, plaque:null});
  }
  WORLD.addStation({ id:"brags", x:17.9, z:-4.0, r:2.2,
    prompt(c){ if(!G_STATE||c.carried) return null; return "🏆 The Brag Board"; },
    action(){ SEASONS.showBoard(); }
  });
};

SEASONS.plaqueTex = function(icon){
  const cv=document.createElement("canvas"); cv.width=64; cv.height=64;
  const c=cv.getContext("2d");
  c.fillStyle="#8a6a48"; c.fillRect(0,0,64,64);
  c.strokeStyle="#e8c23d"; c.lineWidth=5; c.strokeRect(4,4,56,56);
  c.font="34px serif"; c.textAlign="center"; c.textBaseline="middle";
  c.fillText(icon,32,36);
  const t=new THREE.CanvasTexture(cv); t.colorSpace=THREE.SRGBColorSpace;
  return t;
};
SEASONS.hangPlaque = function(i){
  const s=SEASONS.slots[i];
  if(!s || s.plaque) return;
  const m=new THREE.Mesh(geoGet("plaque",()=>new THREE.PlaneGeometry(0.52,0.52)),
    new THREE.MeshStandardMaterial({map:SEASONS.plaqueTex(DATA.BRAGS[i].icon), roughness:0.7}));
  m.position.set(6.35+i*0.72, 3.55, -8.66);
  WORLD.scene.add(m);
  s.plaque=m;
};

SEASONS.bragUpdate = function(dt){
  SEASONS.scanT-=dt;
  if(SEASONS.scanT>0 || !G_STATE) return;
  SEASONS.scanT=1.2;
  const g=G_STATE;
  g.stats.maxCash=Math.max(g.stats.maxCash||0, g.cash);
  /* count Joe's cursed pints without touching pub code */
  for(const c of PUB.customers)
    if(c.type==="joe" && c.beer && !c._jp){ c._jp=true; g.stats.joePints=(g.stats.joePints||0)+1; }
  DATA.BRAGS.forEach((b,i)=>{
    if(g.brags[b.key]){ SEASONS.hangPlaque(i); return; }
    if(BRAG_CHECKS[b.key] && BRAG_CHECKS[b.key](g)){
      g.brags[b.key]=g.day;
      SEASONS.hangPlaque(i);
      SFX.play("yay",11.8,-8);
      toast(`🏆 BRAG EARNED: ${b.icon} ${b.name}!`,"gold",4200);
    }
  });
};

SEASONS.showBoard = function(){
  const g=G_STATE;
  const rows=DATA.BRAGS.map(b=>{
    const got=g.brags[b.key];
    return got
      ? `<div class="row"><span class="nm">${b.icon} ${b.name} <span class="sub">${b.desc}</span></span><span class="pr">Day ${got}</span></div>`
      : `<div class="row"><span class="nm" style="opacity:0.45">❔ ??? <span class="sub">${b.desc}</span></span></div>`;
  }).join("");
  const s=g.stats;
  const rank=DATA.RANKS[g.rank]?DATA.RANKS[g.rank].name:"?";
  const o=UI.open(`<h1>🏆 The Brag Board</h1>
    <div class="sub">${Object.keys(g.brags).length}/${DATA.BRAGS.length} plaques on the wall</div>
    <hr class="chalkline">${rows}<hr class="chalkline">
    <h2>The Ledger of You</h2>
    <div class="row"><span class="nm">Days on the mountain</span><span class="pr">${g.day}</span></div>
    <div class="row"><span class="nm">Rank</span><span class="pr">${rank}</span></div>
    <div class="row"><span class="nm">Batches brewed</span><span class="pr">${s.brews||0}</span></div>
    <div class="row"><span class="nm">Pints served</span><span class="pr">${s.served||0}</span></div>
    <div class="row"><span class="nm">Pints bottled</span><span class="pr">${s.bottled||0}</span></div>
    <div class="row"><span class="nm">Legendaries</span><span class="pr">${Object.keys(g.discovered).length}/${DATA.LEGENDARIES.length}</span></div>
    <div class="row"><span class="nm">Richest moment</span><span class="pr">${fmt$(s.maxCash||g.cash)}</span></div>
    <div class="row"><span class="nm">Spills mopped</span><span class="pr">${s.mopped||0}</span></div>
    <div style="text-align:center;margin-top:8px"><span class="btn clickable" id="bb-x">🚪 back to it</span></div>`);
  o.querySelector("#bb-x").onclick=()=>UI.close();
};

/* ============================================================
   COPPERHEAD COMES AROUND (post-Worlds epilogue beats)
   ============================================================ */
SEASONS.copeUpdate = function(dt){
  if(!G_STATE || !G_STATE.flags.worldsWon) return;
  const F=G_STATE.flags;
  if(CYCLE.phase==="evening" && G_STATE.open
     && F.copeDay!==G_STATE.day && (G_STATE.day-(F.copeLast||-9))>=3
     && PUB.customers.length<14){
    F.copeDay=G_STATE.day; F.copeLast=G_STATE.day;
    PUB.spawnCustomer("cope");
    toast("🐍 Copperhead just walked into YOUR bar. Act natural.","gold",3400);
  }
  let visiting=false;
  for(const c of PUB.customers){
    if(c.type!=="cope") continue;
    visiting=true;
    if(c.state==="toSpot" && !c._sip){
      c._sip=true;
      setTimeout(()=>{ if(!c.dead) UI.bubbleRig(c.rig, pick(["…s'alright.","hm. HM.","don't get cocky, kid.","better'n the ditch water. barely."]), 2600); },1400);
    }
    if((c.state==="leave"||c.state==="road") && !c._nod){
      c._nod=true;
      STORY.fame(2,"copperhead nod");
      const jerky=Math.random()<0.35;
      setTimeout(()=>toast(jerky
        ? "🐍 He left a jerky sample on the bar. It's incredible. Damn him."
        : "🐍 He pauses at the door. Nods once. That's Copperhead for “proud of ya, kid.”","gold",4200),800);
    }
  }
  if(ALIVE.cope && visiting) ALIVE.cope.rig.group.visible=false;   // a man can't be two places
};

/* ---------- setup + update ---------- */
SEASONS.setup = function(){
  SEASONS.setupTerrain();
  SEASONS.buildDressing();
  SEASONS.buildBoard();
  BUS.on("newday", d=>{
    const s=SEASONS.of(d);
    if(!SEASONS._init) SEASONS.applySeason(s, true);      // load / first day: no lerp, no toast
    else if(s!==SEASONS.current) SEASONS.applySeason(s, false);
    else if(G_STATE && SEASONS.current==="winter") G_STATE.flags._wbrews=Math.min(G_STATE.flags._wbrews??(G_STATE.stats.brews||0), G_STATE.stats.brews||0);
  });
};

SEASONS.update = function(dt){
  SEASONS.seasonUpdate(dt);
  if(G_STATE){ SEASONS.bragUpdate(dt); SEASONS.copeUpdate(dt); }
};
