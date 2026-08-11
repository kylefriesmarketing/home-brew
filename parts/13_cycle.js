"use strict";
/* CYCLE — day phases, lighting, sleep = save, objectives */

const CYCLE = {
  phase:"morning", phaseT:0, objectives:[],
  L:{}, // current light lerp state
};

const PHASE_LIGHT = {
  morning:  { sun:[24,20,12], sunI:1.5, sunC:0xffe8c0, hemi:0.75, bg:0x9db8c8, fogN:55, fogF:150, pts:0, fire:0, star:0 },
  afternoon:{ sun:[8,34,6],   sunI:1.7, sunC:0xfff2d8, hemi:0.8,  bg:0xa4c2d4, fogN:60, fogF:160, pts:0, fire:0, star:0 },
  evening:  { sun:[-26,9,10], sunI:1.05,sunC:0xffb070, hemi:0.5,  bg:0xd28a5e, fogN:45, fogF:130, pts:1.9, fire:0.45, star:0.15 },
  night:    { sun:[-10,22,-12],sunI:0.26,sunC:0x8a9ad8, hemi:0.34, bg:0x141e2a, fogN:30, fogF:110, pts:3.4, fire:0.9, star:0.95 },
};

CYCLE.setup = function(){
  CYCLE.applyLight(PHASE_LIGHT.morning, 1);
};

CYCLE.applyLight = function(T, t){
  const W=WORLD;
  W.sun.position.x=damp(W.sun.position.x,T.sun[0],1.2,t);
  W.sun.position.y=damp(W.sun.position.y,T.sun[1],1.2,t);
  W.sun.position.z=damp(W.sun.position.z,T.sun[2],1.2,t);
  W.sun.intensity=damp(W.sun.intensity,T.sunI,1.2,t);
  W.sun.color.lerp(new THREE.Color(T.sunC),Math.min(1,t*1.2));
  W.hemi.intensity=damp(W.hemi.intensity,T.hemi,1.2,t);
  const bg=new THREE.Color(T.bg);
  W.scene.background.lerp(bg,Math.min(1,t*1.2));
  W.scene.fog.color.lerp(bg,Math.min(1,t*1.2));
  W.scene.fog.near=damp(W.scene.fog.near,T.fogN,1.2,t);
  W.scene.fog.far=damp(W.scene.fog.far,T.fogF,1.2,t);
  W.moonlights.forEach(l=>l.intensity=damp(l.intensity,T.pts,1.2,t));
  if(W.fireflies) W.fireflies.material.opacity=damp(W.fireflies.material.opacity,T.fire,1.2,t);
  if(W.stars) W.stars.material.opacity=damp(W.stars.material.opacity,T.star,1.2,t);
};

CYCLE.update = function(dt){
  if(!G_STATE) return;
  let T=PHASE_LIGHT[CYCLE.phase];
  if(G_STATE.weather==="storm" && CYCLE.phase!=="night"){
    if(!CYCLE._stormT || CYCLE._stormBase!==T){
      CYCLE._stormBase=T;
      CYCLE._stormT=Object.assign({},T,{ sunI:T.sunI*0.42, hemi:T.hemi*0.65, bg:0x6e7d8a, fogN:T.fogN*0.6, fogF:T.fogF*0.65 });
    }
    T=CYCLE._stormT;
  }
  CYCLE.applyLight(T, dt);
  /* string lights follow the point lights */
  if(WORLD.props.stringMat){
    const target=(CYCLE.phase==="evening"||CYCLE.phase==="night") && G_STATE.power!==false ? 0.95 : 0;
    WORLD.props.stringMat.opacity=damp(WORLD.props.stringMat.opacity, target, 1.5, dt);
  }
  const len=DATA.TUNE.phaseLen[CYCLE.phase];
  if(len){
    CYCLE.phaseT+=dt;
    if(CYCLE.phaseT>=len) CYCLE.nextPhase();
  } else {
    CYCLE.phaseT+=dt;
    if(CYCLE.phaseT>120 && !CYCLE.nightNagged){ CYCLE.nightNagged=true; toast("😴 It's late. Bed's in the shack corner — sleep saves the game.","",4000); }
  }
  UI.hudClock();
};

CYCLE.nextPhase = function(){
  const order=["morning","afternoon","evening","night"];
  const i=order.indexOf(CYCLE.phase);
  CYCLE.phase=order[Math.min(i+1,3)];
  CYCLE.phaseT=0; CYCLE.nightNagged=false;
  BUS.emit("phase", CYCLE.phase);
  if(CYCLE.phase==="afternoon") toast("☀️ Afternoon — keg what's ready, prep the bar.","",2600);
  if(CYCLE.phase==="evening") toast("🌆 Evening! Thirsty folks incoming — get that sign flipped.","",3000);
  if(CYCLE.phase==="night"){
    if(G_STATE.open){
      G_STATE.open=false;
      WORLD.props.openSign.rotation.z=Math.PI;
      WORLD.props.openSign.children[0].material=clayMat(0xb5472e);
      toast("🌙 Last call! Closing up.","",2600);
    }
    PUB.lastCall();
  }
  UI.hud();
};

/* ---------- bed ---------- */
CYCLE.bedStation = function(){
  WORLD.addStation({ id:"bed", x:WORLD.anchors.bed.x, z:WORLD.anchors.bed.z, r:2.2,
    prompt(){ if(!G_STATE) return null;
      if(CYCLE.phase==="morning"||CYCLE.phase==="afternoon") return "Bed. (too early — daylight's burnin')";
      return "😴 Sleep — tally the day & save"; },
    action(){
      if(CYCLE.phase==="morning"||CYCLE.phase==="afternoon"){ toast("The mountain frowns on naps.","",1800); return; }
      UI.sleepSeq();
    }
  });
};

/* ---------- objectives ---------- */
CYCLE.seedObjectives = function(key){
  CYCLE.objectives=(DATA.OBJECTIVES[key]||[]).map(o=>({...o,done:false}));
  UI.renderObjectives();
};
CYCLE.obj = function(id){
  const o=CYCLE.objectives.find(o=>o.id===id&&!o.done);
  if(o){ o.done=true; SFX.play("ding"); UI.renderObjectives(); }
  if(id==="boilstart") CYCLE.obj("flavor");
};

/* ---------- day flow ---------- */
CYCLE.startGame = function(fresh){
  CYCLE.bedStation();
  if(!fresh && CYCLE.load()){ /* loaded */ }
  else {
    ECON.newState();
    ECON.spawnStarters();
    CYCLE.seedObjectives("d1");
    setTimeout(()=>{
      toast("Welcome to the mountain. This shack + that hose = your brewery.","gold",5000);
      setTimeout(()=>toast("Start at the KETTLE (big copper thing). E does everything.","",4500),2600);
    },800);
    BUS.emit("newday",1);
  }
  UI.hud(); UI.renderObjectives();
  ECON.refreshShelf();
  SFX.rank=G_STATE.rank;
};

CYCLE.tallyLines = function(){
  const L=G_STATE.ledger;
  const lines=[];
  lines.push(["🍺 Beer sales", fmt$(L.sales)]);
  lines.push(["💝 Tips", fmt$(L.tips)]);
  lines.push(["📦 Spent", "−"+fmt$(L.spent)]);
  const net=L.sales+L.tips-L.spent;
  lines.push(["— Net", fmt$(net)]);
  if(L.fameDelta) lines.push(["⭐ Fame", (L.fameDelta>0?"+":"")+Math.round(L.fameDelta)]);
  return lines;
};

CYCLE.finishSleep = function(){
  /* advance the world one night */
  G_STATE.day++;
  G_STATE.ledger={sales:0,tips:0,spent:0,fameDelta:0,notes:[]};
  for(const F of G_STATE.ferms){ if(F.beer&&!F.ready){ F.days--; if(F.days<=0) F.ready=true; } }
  const loanLine=STORY.loanDaily();
  CYCLE.phase="morning"; CYCLE.phaseT=0;
  /* wake at bedside */
  const P=MAIN.player;
  P.setPos(WORLD.anchors.bed.x+1.6, WORLD.anchors.bed.z);
  if(P.carry){ MAIN.dropCarry(false); }
  CYCLE.save();
  BUS.emit("newday",G_STATE.day);
  BUS.emit("phase","morning");
  ECON.morningDeliveries();
  if(G_STATE.day===2) CYCLE.seedObjectives("d2");
  if(G_STATE.day>2 && CYCLE.objectives.every(o=>o.done)) CYCLE.evergreen();
  SFX.play("rooster");
  setTimeout(()=>{
    toast(`🌄 Day ${G_STATE.day} on the mountain.`,"",3000);
    if(loanLine) setTimeout(()=>toast(loanLine, loanLine.includes("REPO")?"bad":"","3600"),1500);
    const ready=G_STATE.ferms.filter(f=>f.ready).length;
    if(ready) setTimeout(()=>toast(`🫧 ${ready} fermenter${ready>1?"s":""} ready to keg!`,"gold",3000),2600);
    STORY.maybeOfferLoan();
  },600);
  UI.hud(); UI.renderObjectives();
};

CYCLE.evergreen = function(){
  const R=DATA.RANKS[G_STATE.rank+1];
  const list=[];
  if(R) list.push({id:"rank",txt:`Climb: ${R.name} (fame ${Math.round(G_STATE.fame)}/${R.at})`,done:false});
  else list.push({id:"king",txt:`👑 Best in the World. The mountain is yours — brew weird.`,done:false});
  const undisc=DATA.LEGENDARIES.filter(l=>!G_STATE.discovered[l.key]).length;
  if(undisc) list.push({id:"disc",txt:`Legendary brews undiscovered: ${undisc} (Hollow Joe knows things)`,done:false});
  if(typeof DATA.BRAGS!=="undefined"){
    const got=Object.keys(G_STATE.brags||{}).length;
    if(got<DATA.BRAGS.length) list.push({id:"brag",txt:`🏆 Brag Board: ${got}/${DATA.BRAGS.length} plaques hung`,done:false});
  }
  if(G_STATE.loan) list.push({id:"loan",txt:`Pay off Copperhead (${fmt$(G_STATE.loan.bal)})`,done:false});
  if(G_STATE.spentGrain>=DATA.TUNE.bearAt) list.push({id:"bear",txt:`🐻 EMPTY THE DUMPSTER before the Boys come back`,done:false});
  if(G_STATE.weather==="storm") list.push({id:"storm",txt:`⛈️ Storm day — expect a MEAN boil and maybe a blackout`,done:false});
  if(G_STATE.leafDay) list.push({id:"leaf",txt:`🍁 LEAF DAY — bus of rich tourists at dusk. Stock UP.`,done:false});
  CYCLE.objectives=list;
  UI.renderObjectives();
};

/* ---------- save / load ---------- */
CYCLE.save = function(){
  try{
    const items=ITEMS.list.filter(i=>["keg","bucket","trophy","jarGift","crate"].includes(i.kind))
      .map(i=>({kind:i.kind, x:Math.round(i.x*10)/10, z:Math.round(i.z*10)/10, data:i.data}));
    localStorage.setItem("mybrew-save-v1", JSON.stringify({G:G_STATE, items}));
  }catch(e){ console.warn("save failed",e); }
};
CYCLE.hasSave = function(){ try{ return !!localStorage.getItem("mybrew-save-v1"); }catch(e){ return false; } };
CYCLE.load = function(){
  try{
    const raw=localStorage.getItem("mybrew-save-v1");
    if(!raw) return false;
    const s=JSON.parse(raw);
    window.G_STATE=ECON.mergeDefaults(s.G);
    G_STATE.open=false; G_STATE.tonight={touristsSwilled:0,served:0,swill:0}; G_STATE.power=true;
    /* rebuild items */
    [...ITEMS.list].forEach(killItem);
    for(const it of s.items){ const sp=spawnItem(it.kind, it.x, it.z, it.data||{}); if(it.kind==="keg") kegLook(sp); }
    /* machines + staff */
    for(const k in G_STATE.machines){ if(G_STATE.machines[k]){
      if(DATA.MACHINES[k] && DATA.MACHINES[k].staff) WINGS.hireArrive(k,true);
      else ECON.installMachine(k,true);
    } }
    for(const k in G_STATE.owned){ if(G_STATE.owned[k]&&!G_STATE.machines[k]&&!(DATA.MACHINES[k]&&DATA.MACHINES[k].staff)) ECON.showGhost(k); }
    /* taps */
    G_STATE.taps.forEach((T,i)=>{ if(T.beer) PUB.mountTapVisual(i); });
    /* wings, displays, hat, epilogue props */
    if(G_STATE.wings.kitchen) WINGS.unlock("kitchen",true);
    if(G_STATE.wings.gift) WINGS.unlock("gift",true);
    WINGS.refreshBarFood(); WINGS.refreshGiftShelf();
    if(G_STATE.hat) WINGS.wearHat(G_STATE.hat);
    if(G_STATE.flags.worldsWon) WINGS.buildJerky();
    if(WORLD.props.dumpsterGrain && G_STATE.spentGrain>0){
      WORLD.props.dumpsterGrain.visible=true;
      WORLD.props.dumpsterGrain.scale.setScalar(0.6+Math.min(G_STATE.spentGrain,5)*0.18);
      WORLD.props.dumpsterGrain.scale.y*=0.4;
    }
    /* glacier */
    if(G_STATE.flags.glacierOpen && WORLD.props.glacierRope){ WORLD.props.glacierRope.visible=false; WORLD.dropCollider("glacier"); }
    CYCLE.phase="morning"; CYCLE.phaseT=0;
    MAIN.player.setPos(WORLD.anchors.bed.x+1.6, WORLD.anchors.bed.z);
    BUS.emit("newday",G_STATE.day);
    ECON.morningDeliveries();
    if(G_STATE.day===1) CYCLE.seedObjectives("d1");
    else if(G_STATE.day===2) CYCLE.seedObjectives("d2");
    else CYCLE.evergreen();
    setTimeout(()=>toast(`🌄 Back on the mountain — Day ${G_STATE.day}.`,"",3000),500);
    return true;
  }catch(e){ console.warn("load failed",e); return false; }
};
