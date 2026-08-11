"use strict";
/* EVENTS — storms that kill the power, the leaf-peeper bus, and the Boys */

const EVENTS = {
  rain:null, rainVel:null, thunderT:0, blackoutRolled:false,
  busAnim:null, leafSpawned:0, bear:null, raccoon:null,
};

EVENTS.setup = function(){
  BUS.on("newday", d=>EVENTS.onDay(d));
  BUS.on("phase", p=>EVENTS.onPhase(p));
  /* rain particle pool */
  const N=340;
  const geo=new THREE.BufferGeometry();
  const pos=new Float32Array(N*3);
  for(let i=0;i<N;i++){ pos[i*3]=rand(-40,40); pos[i*3+1]=rand(2,26); pos[i*3+2]=rand(-30,30); }
  geo.setAttribute("position", new THREE.BufferAttribute(pos,3));
  EVENTS.rain=new THREE.Points(geo, new THREE.PointsMaterial({color:0xa8c8e0, size:0.14, transparent:true, opacity:0}));
  WORLD.scene.add(EVENTS.rain);
};

EVENTS.onDay = function(day){
  G_STATE.power=true; EVENTS.blackoutRolled=false;
  /* storm roll */
  G_STATE.weather = (day>3 && Math.random()<DATA.TUNE.stormChance*((typeof SEASONS!=="undefined")?DATA.SEASONS[SEASONS.of(day)].storm:1)) ? "storm" : "clear";
  if(G_STATE.weather==="storm") setTimeout(()=>toast(DATA.EVENTS.stormMorn,"bad",4500), 2200);
  /* leaf day */
  G_STATE.leafDay = (day%DATA.TUNE.leafEvery===3) && day>4 && G_STATE.weather!=="storm"
    && ((typeof SEASONS==="undefined") || SEASONS.of(day)==="fall");   // leaf-peepers only peep in fall
  if(G_STATE.leafDay) setTimeout(()=>toast(DATA.EVENTS.leafMorn,"gold",5000), 3000);
  EVENTS.leafSpawned=0;
  /* the Boys */
  if(G_STATE.spentGrain>=DATA.TUNE.bearAt){
    G_STATE.bearStage=(G_STATE.bearStage||0)+1;
    const a=WORLD.anchors.dumpster;
    setTimeout(()=>{
      for(let i=0;i<14;i++) puff(a.x+rand(-1.5,1.5),1+rand(1),a.z+rand(-1.5,1.5),0xc9a86a,0.35,1.2,1.5);
      WORLD.props.dumpsterLid.rotation.x=-1.2;
      SFX.play("thud",a.x,a.z); SFX.play("growl",a.x,a.z);
      toast(G_STATE.bearStage>=2? DATA.EVENTS.bear2 : DATA.EVENTS.bear1,"bad",4500);
      STORY.fame(-1,"bear mess");
    }, 4000);
  }
};

EVENTS.onPhase = function(ph){
  if(ph==="evening"){
    /* storm blackout roll */
    if(G_STATE.weather==="storm" && !EVENTS.blackoutRolled){
      EVENTS.blackoutRolled=true;
      const delay=rand(15,50);
      STORY.at(delay, ()=>{
        if(CYCLE.phase!=="evening") return;
        G_STATE.power=false;
        SFX.play("thunder"); shake(0.7);
        toast(DATA.EVENTS.blackout,"bad",5000);
      });
    }
    /* leaf bus */
    if(G_STATE.leafDay){ EVENTS.busAnim={t:0, phase:"in"}; }
    /* bear invasion at stage 2+ */
    if((G_STATE.bearStage||0)>=2 && !EVENTS.bear){
      STORY.at(rand(20,60), ()=>EVENTS.bearInvasion());
    }
  }
  if(ph==="morning" && G_STATE.power===false){
    G_STATE.power=true;
    toast(DATA.EVENTS.powerBack,"",2600);
  }
};

/* ---------- the bear walks in ---------- */
EVENTS.bearInvasion = function(){
  if(EVENTS.bear || CYCLE.phase!=="evening") return;
  const rig=makeBear();
  rig.setPos(11.5,27);
  WORLD.scene.add(rig.group);
  EVENTS.bear={rig, state:"toDoor", t:0};
  SFX.play("growl",11.5,27);
  toast(DATA.EVENTS.bearPub,"bad",4000);
  PUB.freezeT=7;
};

EVENTS.updateBear = function(dt){
  const B=EVENTS.bear; if(!B) return;
  const r=B.rig; B.t+=dt;
  const walk=(tx,tz,sp)=>{
    const dx=tx-r.x, dz=tz-r.z, d=Math.hypot(dx,dz);
    if(d<0.5) return true;
    r.x+=dx/d*sp*dt; r.z+=dz/d*sp*dt;
    r.y=WORLD.getH(r.x,r.z);
    r.facing=Math.atan2(dx,dz);
    r.group.position.set(r.x,r.y,r.z);
    r.group.rotation.y=r.facing;
    const wp=Math.floor(B.t*CLAY.FPS)/CLAY.FPS;
    r.group.position.y=r.y+Math.abs(Math.sin(wp*7))*0.1;
    r.group.rotation.z=Math.sin(wp*7)*0.06;
    return false;
  };
  switch(B.state){
    case "toDoor": if(walk(11.1,6.9,2.2)) B.state="inside"; break;
    case "inside": if(walk(WORLD.anchors.ficus.x-1.2, WORLD.anchors.ficus.z-0.6, 1.8)){ B.state="sniff"; B.t=0; } break;
    case "sniff":
      if(B.t>2.6){
        B.state="out";
        const good=Math.random()<0.55;
        if(good){ STORY.fame(8,"bear content"); toast(DATA.EVENTS.bearPubGood,"gold",4500); SFX.play("yay"); G_STATE.flags.bearFriend=true; }
        else { STORY.fame(-5,"bear panic"); toast(DATA.EVENTS.bearPubBad,"bad",4500); SFX.play("ew"); }
        G_STATE.bearStage=0; G_STATE.spentGrain=0;
        WORLD.props.dumpsterGrain.visible=false;
      } else if(Math.random()<dt*2){ SFX.play("growl",r.x,r.z); }
      break;
    case "out": if(walk(11.5,28.5,2.6)){ removeRig(r); EVENTS.bear=null; } break;
  }
};

/* ---------- update loop ---------- */
EVENTS.update = function(dt){
  if(!G_STATE) return;
  const storm=G_STATE.weather==="storm";
  /* rain */
  const mat=EVENTS.rain.material;
  mat.opacity=damp(mat.opacity, storm?0.55:0, 1.5, dt);
  if(mat.opacity>0.02){
    const p=EVENTS.rain.geometry.attributes.position;
    const px=MAIN.player.x, pz=MAIN.player.z;
    for(let i=0;i<p.count;i++){
      let y=p.getY(i)-dt*22;
      if(y<0){ y=rand(16,26); p.setX(i, px+rand(-35,35)); p.setZ(i, pz+rand(-28,28)); }
      p.setY(i,y);
    }
    p.needsUpdate=true;
  }
  /* thunder */
  if(storm){
    EVENTS.thunderT-=dt;
    if(EVENTS.thunderT<=0){
      EVENTS.thunderT=rand(7,16);
      SFX.play("thunder");
      WORLD.sun.intensity+=1.6;      // flash; CYCLE damps it back
      shake(0.3);
    }
    /* blackout flicker */
    if(G_STATE.power===false){
      WORLD.moonlights.forEach(l=>l.intensity*= (Math.random()<0.06? 0.2 : 1));
    }
  }
  /* leaf drift on leaf day */
  if(G_STATE.leafDay && Math.random()<dt*4){
    puff(MAIN.player.x+rand(-14,14), 7+rand(4), MAIN.player.z+rand(-12,12),
      pick([0xb5742e,0xc28a2e,0x9a4e2a]), 0.16, -0.8, 2.5);
  }
  /* bus */
  const A=EVENTS.busAnim;
  if(A){
    const bus=WORLD.props.bus;
    A.t+=dt;
    if(A.phase==="in"){
      bus.position.x=lerp(70,16,Math.min(1,A.t/5));
      if(A.t>=5){ A.phase="park"; A.t=0; SFX.play("honk",16,27); SFX.play("honk",16,27); }
    } else if(A.phase==="park"){
      if(!A.spawned){ A.spawned=true;
        for(let i=0;i<6;i++) setTimeout(()=>{ if(CYCLE.phase==="evening"&&G_STATE.open){ const c=PUB.spawnCustomer("tourist"); c.wallet*=1.5; EVENTS.leafSpawned++; } }, i*2500+rand(1500));
      }
      if(A.t>40){ A.phase="out"; A.t=0; }
    } else {
      bus.position.x=lerp(16,-70,Math.min(1,A.t/6));
      if(A.t>=6) EVENTS.busAnim=null;
    }
  }
  EVENTS.updateBear(dt);
};
