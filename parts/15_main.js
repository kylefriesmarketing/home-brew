"use strict";
/* MAIN — input, player controller, camera, interact, the loop, boot */

const MAIN = {
  player:null, started:false, mode:"walk",   // walk | fork | boil | ui | sleep
  input:{up:false,down:false,left:false,right:false,run:false,lift:false,lower:false,fire:false,vent:false,stir:false},
  ePressed:false, qPressed:false,
  camYaw:0, camPitch:0.60, camDist:14.5, camMax:24, camTarget:new THREE.Vector3(),
  camPos:new THREE.Vector3(0,10,20),
  promptStation:null, promptItem:null,
  time:0,
};

/* ---------- input ---------- */
MAIN.bindInput = function(){
  const I=MAIN.input;
  const keymap = e=>{
    switch(e.code){
      case "KeyW": case "ArrowUp": return "up";
      case "KeyS": case "ArrowDown": return "down";
      case "KeyA": case "ArrowLeft": return "left";
      case "KeyD": case "ArrowRight": return "right";
      case "ShiftLeft": case "ShiftRight": return "run";
      case "KeyR": return "lift";
      case "KeyF": return MAIN.mode==="boil" ? "fire" : "lower";
      case "Space": return "vent";
    }
    return null;
  };
  addEventListener("keydown", e=>{
    if(e.code==="Space") e.preventDefault();
    SFX.init();
    if(MAIN.mode==="ui"){ if(UI) UI.key(e); return; }
    const k=keymap(e); if(k) I[k]=true;
    if(e.code==="KeyS" && MAIN.mode==="boil"){ I.stir=true; if(BREW) BREW.stirTap(); }
    if(e.code==="KeyE" && !e.repeat) MAIN.ePressed=true;
    if(e.code==="KeyQ" && !e.repeat) MAIN.qPressed=true;
    if(e.code==="Escape" && UI) UI.escape();
    if(e.code==="KeyM"){ const m=SFX.toggleMute(); toast(m?"🔇 muted":"🔊 sound on","",1200); }
  });
  addEventListener("keyup", e=>{
    const k=keymap(e); if(k) I[k]=false;
    if(e.code==="KeyS") I.stir=false;
  });
  /* mouse: RMB orbit, wheel zoom, LMB = E */
  let dragging=false, lx=0;
  addEventListener("contextmenu", e=>e.preventDefault());
  addEventListener("pointerdown", e=>{
    SFX.init();
    if(e.button===2){ dragging=true; lx=e.clientX; }
    else if(e.button===0 && MAIN.mode!=="ui"){ MAIN.ePressed=true; }
  });
  addEventListener("pointermove", e=>{
    if(dragging){ MAIN.camYaw -= (e.clientX-lx)*0.006; lx=e.clientX; }
  });
  addEventListener("pointerup", ()=>dragging=false);
  /* M5: the ceiling grows with your rank so the empire becomes visible */
  addEventListener("wheel", e=>{ MAIN.camDist=clamp(MAIN.camDist+Math.sign(e.deltaY)*1.2, 7, MAIN.camMax||24); }, {passive:true});
};

/* ---------- interact scan ---------- */
MAIN.scanInteract = function(){
  const P=MAIN.player;
  const carried = P.carry||null;
  const ctx={carried, player:P};
  let best=null, bd=1e9;
  for(const s of WORLD.stations){
    const d=dist2(P.x,P.z,s.x,s.z);
    const r=(s.r||2.2);
    if(d<r*r && d<bd){
      const txt=s.prompt(ctx);
      if(txt){ best={s,txt}; bd=d; }
    }
  }
  let item=null;
  if(!carried){
    item=nearestItem(P.x+Math.sin(P.facing)*0.7, P.z+Math.cos(P.facing)*0.7, 1.9, it=>it!==FORK.cargo);
  }
  // station wins unless the item is basically underfoot (or much closer);
  // priority stations (installs) always win over loose items
  if(best && item){
    const ds=bd, di=dist2(P.x,P.z,item.x,item.z);
    if(best.s.priority) item=null;
    else if(di < 0.64 || di < ds*0.35) best=null; else item=null;
  }
  MAIN.promptStation=best?best.s:null;
  MAIN.promptItem=item;
  const el=$("prompt");
  if(best){ $("prompt-txt").textContent=" "+best.txt; el.style.display="block"; }
  else if(item){
    const verb = (item.kind==="crate" && !item.data.machine) ? " Unpack — " : " Pick up — ";
    $("prompt-txt").textContent=verb+itemLabel(item); el.style.display="block";
  }
  else if(carried){ $("prompt-txt").textContent=" (Q to drop "+itemLabel(carried)+")"; el.style.display="none"; }
  else el.style.display="none";
};

MAIN.doInteract = function(){
  const P=MAIN.player;
  if(MAIN.promptStation){ MAIN.promptStation.action({carried:P.carry||null, player:P}); return; }
  if(MAIN.promptItem){
    const it=MAIN.promptItem;
    if(it.kind==="crate" && !it.data.machine){ ECON.tryUnpack(it); return; }
    it.carriedBy=P; P.carry=it;
    P.carryPose=1; P.heavyPose = it.mass==="heavy"?1: it.mass==="mid"?0.45:0;
    SFX.play("thud",P.x,P.z);
    if(it.mass==="heavy") toast("oh LORD that's heavy","",1500);
  }
};
MAIN.dropCarry = function(throwIt){
  const P=MAIN.player;
  const it=P.carry; if(!it) return;
  it.carriedBy=null; P.carry=null; P.carryPose=0; P.heavyPose=0;
  const pow=throwIt? (it.mass==="heavy"?2.5: it.mass==="mid"?5:8) : 1.2;
  it.vx=Math.sin(P.facing)*pow + P.vx*0.6;
  it.vz=Math.cos(P.facing)*pow + P.vz*0.6;
  it.vy=throwIt?3.2:0.6;
  if(throwIt){ SFX.play("boing",P.x,P.z); P.squash=0.25; }
};

/* ---------- player movement ---------- */
MAIN.updatePlayer = function(dt){
  const P=MAIN.player, I=MAIN.input;
  if(MAIN.mode!=="walk"){ P.speedNow=0; animatePerson(P,dt); return; }
  let mx=(I.right?1:0)-(I.left?1:0), mz=(I.down?1:0)-(I.up?1:0);
  const mag=Math.hypot(mx,mz);
  let speed=DATA.TUNE.walkSpeed*(I.run?DATA.TUNE.runMul:1);
  if(P.carry){ speed*=DATA.TUNE.carrySlow[P.carry.mass]; }
  if(mag>0){
    mx/=mag; mz/=mag;
    const cy=MAIN.camYaw;
    const wx=mx*Math.cos(cy)+mz*Math.sin(cy);
    const wz=-mx*Math.sin(cy)+mz*Math.cos(cy);
    P.vx=damp(P.vx,wx*speed,10,dt); P.vz=damp(P.vz,wz*speed,10,dt);
    P.facing=angLerp(P.facing,Math.atan2(P.vx,P.vz),Math.min(1,14*dt));
  } else {
    P.vx=damp(P.vx,0,12,dt); P.vz=damp(P.vz,0,12,dt);
  }
  let nx=P.x+P.vx*dt, nz=P.z+P.vz*dt;
  [nx,nz]=WORLD.collide(nx,nz,0.55);
  nx=clamp(nx,-70,70); nz=clamp(nz,-58,36);
  P.x=nx; P.z=nz;
  const gH=WORLD.getH(P.x,P.z);
  const prevY=P.y;
  P.y=damp(P.y,gH,18,dt);
  if(prevY-gH>0.6 && Math.abs(P.y-gH)<0.1){ P.squash=0.3; SFX.play("thud",P.x,P.z); }
  P.speedNow=Math.hypot(P.vx,P.vz);
  P.group.position.set(P.x,P.y,P.z);
  // heavy carry stagger
  if(P.carry && P.carry.mass==="heavy" && P.speedNow>1 && Math.random()<dt*2){
    P.facing+=rand(-0.3,0.3); SFX.play("thud",P.x,P.z);
  }
  // footstep scuffs + steps
  if(P.speedNow>2 && Math.random()<dt*6){
    puff(P.x+rand(-.2,.2), P.y+0.1, P.z+rand(-.2,.2), 0xb0a080, 0.16, 0.3, 0.6);
  }
  const stepBeat=Math.floor(P.walkPhase*1.9);
  if(P.speedNow>2.4 && stepBeat!==P._lastStep){ P._lastStep=stepBeat; SFX.play("step",P.x,P.z); }
  animatePerson(P,dt);
};

/* ---------- forklift mount ---------- */
MAIN.updateForkMode = function(dt){
  const P=MAIN.player;
  if(MAIN.mode==="fork"){
    // seat the goober
    P.x=FORK.x; P.z=FORK.z; P.y=FORK.rig.position.y+1.05;
    P.group.position.set(P.x-Math.sin(FORK.heading)*0.05,P.y,P.z-Math.cos(FORK.heading)*0.05);
    P.facing=FORK.heading+Math.PI;
    P.speedNow=0;
    animatePerson(P,dt);
    if(MAIN.ePressed){
      MAIN.ePressed=false;
      MAIN.mode="walk"; FORK.mounted=false;
      const ox=FORK.x+Math.cos(FORK.heading)*1.6, oz=FORK.z-Math.sin(FORK.heading)*1.6;
      const [px,pz]=WORLD.collide(ox,oz,0.55); P.x=px; P.z=pz;
      toast("hopped off","",900);
    }
  }
};

/* ---------- camera ---------- */
MAIN.updateCamera = function(dt){
  const P=MAIN.player;
  const focus = MAIN.mode==="fork" ? {x:FORK.x, y:FORK.rig.position.y, z:FORK.z} :
                MAIN.mode==="boil" && BREW ? {x:WORLD.props.kettle.position.x, y:1.5, z:WORLD.props.kettle.position.z} :
                {x:P.x+P.vx*0.25, y:P.y, z:P.z+P.vz*0.25};
  const d=MAIN.mode==="boil"?9:MAIN.camDist;
  const pitch=MAIN.camPitch;
  const tx=focus.x+Math.sin(MAIN.camYaw)*Math.cos(pitch)*d;
  const tz=focus.z+Math.cos(MAIN.camYaw)*Math.cos(pitch)*d;
  let ty=focus.y+Math.sin(pitch)*d+1.6;
  // keep camera above terrain
  ty=Math.max(ty, WORLD.getH(tx,tz)+2.2);
  MAIN.camPos.x=damp(MAIN.camPos.x,tx,6,dt);
  MAIN.camPos.y=damp(MAIN.camPos.y,ty,6,dt);
  MAIN.camPos.z=damp(MAIN.camPos.z,tz,6,dt);
  MAIN.camTarget.x=damp(MAIN.camTarget.x,focus.x,8,dt);
  MAIN.camTarget.y=damp(MAIN.camTarget.y,focus.y+1.2,8,dt);
  MAIN.camTarget.z=damp(MAIN.camTarget.z,focus.z,8,dt);
  _shake=damp(_shake,0,5,dt);
  /* ⚠️ the offset used to be added to the camera AND the lookAt target, which
     left the view direction unchanged — every impact in the game landed as
     faint parallax instead of a shake. Shake the EYE only, and let the target
     stay put, so the world actually swings through frame. */
  const sx=(Math.random()-0.5)*_shake*0.9, sy=(Math.random()-0.5)*_shake*0.9;
  WORLD.camera.position.set(MAIN.camPos.x+sx, MAIN.camPos.y+sy, MAIN.camPos.z);
  WORLD.camera.lookAt(MAIN.camTarget.x, MAIN.camTarget.y, MAIN.camTarget.z);
  WORLD.camera.rotateZ((Math.random()-0.5)*_shake*0.06);   // a touch of roll sells the hit
};

/* ---------- title orbit cam ---------- */
MAIN.titleCam = function(dt){
  const t=CLAY.raw*0.05;
  const x=Math.sin(t)*26, z=14+Math.cos(t*0.7)*8;
  WORLD.camera.position.set(x, 10+Math.sin(t*0.5)*2, z);
  WORLD.camera.lookAt(0,1.5,-2);
};

/* ---------- the loop ---------- */
/* drive() is the frame entry: at timeScale N it runs N-1 extra un-rendered
   sub-ticks so EVERYTHING (customers, ferments, truck, weather) fast-forwards
   together — same trick as MB.step, no system ever sees a big dt */
MAIN.timeScale = 1;
MAIN.drive = function(dt){
  const n = Math.max(1, Math.round(MAIN.timeScale));
  if(n > 1){
    const sub = Math.min(dt, 0.05);
    for(let i = 1; i < n; i++) MAIN.tick(sub, true);
  }
  MAIN.tick(dt);
};
MAIN.tick = function(dt, skipRender){
  dt=Math.min(dt,0.05);
  MAIN.time+=dt;
  CLAY.step(dt);
  clayBoilSurface();                                 // re-sculpt the thumbprints on each held frame
  if(CLAY.tick && WORLD.renderer) WORLD.renderer.shadowMap.needsUpdate=true;
  WORLD.update(dt);
  puffsUpdate(dt);
  SFX.update(dt);

  if(!MAIN.started){
    MAIN.titleCam(dt);
    if(typeof ALIVE!=="undefined") ALIVE.update(dt);
    if(!skipRender){
    latchApply();                                    // hold the 12fps pose…
    if(typeof POST!=="undefined"&&POST.ok) POST.render(); else WORLD.renderer.render(WORLD.scene, WORLD.camera);
    latchRelease();                                  // …and give the sim its pose straight back
  }
    return;
  }

  if(CYCLE) CYCLE.update(dt);
  MAIN.updatePlayer(dt);
  MAIN.updateForkMode(dt);
  FORK.update(dt, MAIN.mode==="fork"?MAIN.input:{});
  ITEMS.update(dt);
  BREW.update(dt);
  PUB.update(dt);
  ECON.update(dt);
  STORY.update(dt);
  if(typeof WINGS!=="undefined") WINGS.update(dt);
  if(typeof EVENTS!=="undefined") EVENTS.update(dt);
  if(typeof HOMESTEAD!=="undefined") HOMESTEAD.update(dt);
  if(typeof ALIVE!=="undefined") ALIVE.update(dt);
  if(typeof SEASONS!=="undefined") SEASONS.update(dt);
  if(typeof TIPS!=="undefined") TIPS.update(dt);
  if(typeof WILD!=="undefined") WILD.update(dt);
  UI.update(dt);

  if(MAIN.mode==="walk"||MAIN.mode==="fork") MAIN.scanInteract();
  else { $("prompt").style.display="none"; }
  if(MAIN.ePressed){
    MAIN.ePressed=false;
    if(MAIN.mode==="walk") MAIN.doInteract();
  }
  if(MAIN.qPressed){
    MAIN.qPressed=false;
    if(MAIN.mode==="walk") MAIN.dropCarry(MAIN.input.run);
  }
  MAIN.updateCamera(dt);
  if(!skipRender){
    latchApply();                                    // hold the 12fps pose…
    if(typeof POST!=="undefined"&&POST.ok) POST.render(); else WORLD.renderer.render(WORLD.scene, WORLD.camera);
    latchRelease();                                  // …and give the sim its pose straight back
  }
};

/* ---------- boot ---------- */
MAIN.boot = function(){
  WORLD.build();
  FORK.build();
  MAIN.player=makeGoober();
  MAIN.player.setPos(0.5,8);
  MAIN.player.face(0.4);
  WORLD.scene.add(MAIN.player.group);
  // forklift seat station
  WORLD.addStation({ id:"forkseat", get x(){return FORK.x;}, get z(){return FORK.z;}, r:2.0,
    prompt:c=> MAIN.mode==="walk" ? "Hop on the forklift  (R raise · F lower)" : null,
    action:c=>{ if(c.carried) MAIN.dropCarry(false); MAIN.mode="fork"; FORK.mounted=true; SFX.play("putt",FORK.x,FORK.z); toast("🚜 forklift time. R/F for the forks.","",2200); }
  });
  MAIN.bindInput();
  ECON.setup();
  BREW.setup();
  PUB.setup();
  STORY.setup();
  CYCLE.setup();
  if(typeof WINGS!=="undefined") WINGS.setup();
  if(typeof EVENTS!=="undefined") EVENTS.setup();
  if(typeof HOMESTEAD!=="undefined") HOMESTEAD.setup();
  if(typeof POST!=="undefined") POST.setup();
  if(typeof ALIVE!=="undefined") ALIVE.setup();
  if(typeof SEASONS!=="undefined") SEASONS.setup();
  if(typeof TIPS!=="undefined") TIPS.setup();
  if(typeof WILD!=="undefined") WILD.setup();
  UI.setup();

  let last=performance.now();
  const frame=()=>{
    const now=performance.now();
    const dt=(now-last)/1000; last=now;
    MAIN.drive(dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  // hidden-tab fallback stepping
  setInterval(()=>{
    if(document.hidden){
      const now=performance.now();
      const dt=(now-last)/1000; last=now;
      MAIN.drive(dt);
    }
  }, 50);
};

MAIN.startGame = function(fresh){
  if(CYCLE) CYCLE.startGame(fresh);
  MAIN.started=true;
  $("hud").style.display="flex";
  $("title").style.display="none";
};

/* ---------- debug API ---------- */
window.MB = {
  get G(){ return window.G_STATE; },
  MAIN, WORLD, ITEMS, FORK,
  tp(x,z){ MAIN.player.setPos(x,z); },
  give(n){ if(window.G_STATE){ G_STATE.cash+=n; if(UI) UI.hud(); } },
  start(fresh=true){ MAIN.startGame(fresh); },
  press(code){ dispatchEvent(new KeyboardEvent("keydown",{code})); dispatchEvent(new KeyboardEvent("keyup",{code})); },
  hold(code){ dispatchEvent(new KeyboardEvent("keydown",{code})); },
  release(code){ dispatchEvent(new KeyboardEvent("keyup",{code})); },
  /* dev/test helpers */
  phase(p){ CYCLE.phase=p; CYCLE.phaseT=0; BUS.emit("phase",p); UI.hud(); },
  brewNow(ings=["blackberry","honey"], water="spring", exec=1.3){
    const {pot,axes,style,purity}=BREW.calcPotential(water,ings,false);
    const L=BREW.checkLegendary(water,ings);
    const Wc=DATA.WATERS[water].cap;
    let score=pot*exec;
    if(L&&exec>=1.15) score=Math.max(score,(Wc/4)*(4.6+(exec-1.15)*2))+DATA.TUNE.legendBonus;
    const tier=BREW.tierOf(score);
    const beer={name:BREW.beerName(water,ings,axes,tier.key,tier.key==="legend"?L:null,style),
      tier:tier.key,tierName:tier.name,tierCol:tier.col,score,exec,axes,ing:ings,water,
      style:style.key, styleName:style.name, styleBlurb:style.blurb, purity:Math.round(purity*100)/100,
      legendary:tier.key==="legend"&&L?L.key:null,suggest:tier.price};
    const P=MAIN.player;
    const keg=spawnItem("keg",P.x+1,P.z,{state:"filled",beer,pints:DATA.TUNE.pintsPerKeg});
    kegLook(keg);
    return beer;
  },
  tapNow(i=0){
    const keg=ITEMS.list.find(it=>it.kind==="keg"&&it.data.state==="filled");
    if(!keg) return "no filled keg";
    const T=G_STATE.taps[i];
    T.beer=keg.data.beer; T.pints=keg.data.pints; T.price=T.beer.suggest;
    killItem(keg); PUB.mountTapVisual(i);
    return T.beer.name;
  },
  spawn(t){ return PUB.spawnCustomer(t)? "ok":"no"; },
  sleep(){ CYCLE.finishSleep(); },
  step(sec=1){ const n=Math.max(1,Math.round(sec/0.05)); for(let i=0;i<n;i++) MAIN.tick(0.05,true); MAIN.tick(0.016); return "stepped "+sec+"s"; },
  state(){ const g=G_STATE; return {day:g.day,phase:CYCLE.phase,cash:Math.round(g.cash),fame:Math.round(g.fame),rank:g.rank,
    stock:g.stock, taps:g.taps.map(t=>t.beer?{n:t.beer.name,p:t.pints,pr:t.price}:null),
    ferms:g.ferms.map(f=>f.beer?{n:f.beer.name,r:f.ready}:null),
    kettle:{stage:g.kettle.stage,w:g.kettle.water,u:g.kettle.waterUnits,ings:g.kettle.ings,barley:g.kettle.barley},
    customers:PUB.customers.map(c=>c.state), items:ITEMS.list.map(i=>i.kind), machines:g.machines, loan:g.loan,
    wings:g.wings, food:g.food, gift:g.gift, weather:g.weather, power:g.power, leafDay:g.leafDay,
    grain:g.spentGrain, bearStage:g.bearStage, hats:g.hatsOwned, hat:g.hat, cleanNights:g.cleanNights,
    flags:Object.keys(g.flags).filter(k=>g.flags[k]) }; },
};

addEventListener("load", ()=>MAIN.boot());
