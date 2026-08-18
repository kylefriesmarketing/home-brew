"use strict";
/* WILD — M5. Giving the mountain pockets, and putting the cast IN FRONT of you.
   The assessment's sharpest note: the antagonist is 47 units away, across a
   creek, outside the frustum, for 11 of his 14 scenes — so the heckle that
   opens the whole rivalry is most likely never seen. Off-screen dialogue costs
   the same to write and delivers nothing. */

const WILD = { patches:[], dot:null, copeTruck:null, ripe:{} };

/* ---------- FORAGING ---------- */
function forageMesh(def){
  const g=new THREE.Group();
  const bush=claySphere(0.62, def.key==="honey"?0x6a4a30:0x3e5e3a, 0.22, 1400+def.spots.length);
  bush.scale.set(1,0.8,1); bush.position.y=0.5; g.add(bush);
  /* the ripe fruit itself — hidden when picked */
  const fruit=new THREE.Group();
  for(let i=0;i<5;i++){
    const b=claySphere(0.11, def.col, 0.16, 1410+i);
    b.position.set(rand(-0.42,0.42), 0.55+rand(0,0.45), rand(-0.42,0.42));
    fruit.add(b);
  }
  g.add(fruit); g.userData.fruit=fruit;
  return g;
}

WILD.buildForage = function(){
  for(const def of DATA.FORAGE){
    def.spots.forEach((sp,i)=>{
      const [x,z]=sp;
      const g=forageMesh(def);
      g.position.set(x, WORLD.getH(x,z), z);
      g.rotation.y=rand(Math.PI*2);
      WORLD.scene.add(g);
      const patch={ id:def.key+i, def, x, z, mesh:g, picked:false };
      WILD.patches.push(patch);
      WORLD.addStation({ id:"forage_"+patch.id, x, z, r:2.2,
        prompt(){
          if(!G_STATE || MAIN.mode!=="walk") return null;
          if(!WILD.inSeason(def)) return `${def.name} — nothin' on it this season`;
          if(patch.picked) return `${def.name} — picked clean today`;
          return `🌿 Pick ${DATA.INGREDIENTS[def.ing].name} (free, if you walked for it)`;
        },
        action(){
          if(!WILD.inSeason(def) || patch.picked) return;
          patch.picked=true;
          WILD.refreshPatch(patch);
          G_STATE.stock[def.ing]=(G_STATE.stock[def.ing]||0)+1;
          G_STATE.stats.foraged=(G_STATE.stats.foraged||0)+1;
          ECON.refreshShelf();
          SFX.play("plop",x,z); MAIN.player.squash=0.2;
          for(let p=0;p<5;p++) puff(x+rand(-.4,.4),0.8,z+rand(-.4,.4),def.col,0.14,0.5,0.7);
          toast(`🌿 Picked ${DATA.INGREDIENTS[def.ing].name} — the mountain provides.`,"",2200);
        }
      });
    });
  }
};
WILD.inSeason = function(def){
  const s=(typeof SEASONS!=="undefined")?SEASONS.current:"fall";
  return def.seasons.includes(s);
};
WILD.refreshPatch = function(p){
  const show = WILD.inSeason(p.def) && !p.picked;
  if(p.mesh.userData.fruit) p.mesh.userData.fruit.visible=show;
};
WILD.dayReset = function(){
  for(const p of WILD.patches){ p.picked=false; WILD.refreshPatch(p); }
};

/* ---------- RANGER DOT — she is referenced in your best set-piece and has no body ---------- */
WILD.buildDot = function(){
  const rig=makePerson({skin:0xc98c5a, shirt:0x4c6a4c, pants:0x5e4a3a, hat:"straw", size:1.0});
  rig.setPos(14, 20);
  WORLD.scene.add(rig.group);
  WILD.dot={ rig, state:"patrol", t:rand(3,8), tx:14, tz:20, said:0 };
  /* she notices what you serve */
  WORLD.addStation({ id:"dot", get x(){ return WILD.dot?WILD.dot.rig.x:9999; },
    get z(){ return WILD.dot?WILD.dot.rig.z:9999; }, r:2.4,
    prompt(){ if(!G_STATE||MAIN.mode!=="walk") return null; return "👮 Ranger Dot"; },
    action(){
      const lines=(G_STATE.tonight&&G_STATE.tonight.swill>0)
        ? ["Ranger Dot","I saw what you poured them tourists. I'm watchin'."]
        : (G_STATE.spentGrain>=DATA.TUNE.bearAt)
        ? ["Ranger Dot","That dumpster's a dinner bell. Empty it 'fore the Boys come."]
        : pick([["Ranger Dot","Mountain looks good today. Keep it that way."],
                ["Ranger Dot","Bears been quiet. Don't give 'em a reason."],
                ["Ranger Dot","You keep this place honest, we'll get along fine."]]);
      UI.bubbleRig(WILD.dot.rig, `<span class="who">${lines[0]}</span>“${lines[1]}”`, 4200);
      SFX.play("blip",WILD.dot.rig.x,WILD.dot.rig.z);
    }
  });
};
WILD.dotUpdate = function(dt){
  const D=WILD.dot; if(!D) return;
  const r=D.rig;
  const night=(CYCLE.phase==="night");
  r.group.visible=!night;
  if(night) return;
  D.t-=dt;
  if(D.state==="patrol"){
    const dx=D.tx-r.x, dz=D.tz-r.z, d=Math.hypot(dx,dz);
    if(d<0.5 || D.t<=0){
      D.state="stand"; D.t=rand(4,10); r.speedNow=0;
    } else {
      r.x+=dx/d*1.5*dt; r.z+=dz/d*1.5*dt;
      r.facing=Math.atan2(dx,dz); r.speedNow=1.5;
      r.y=WORLD.getH(r.x,r.z);
      r.group.position.set(r.x,r.y,r.z);
    }
  } else if(D.t<=0){
    /* she walks the road, the yard edge and the trailhead — never inside */
    const spots=[[14,20],[-6,19],[4,21],[22,16],[2,-12],[-14,14]];
    const s=pick(spots); D.tx=s[0]; D.tz=s[1];
    D.state="patrol"; D.t=rand(14,26);
  }
  animatePerson(r,dt);
};

/* ---------- COPPERHEAD, IN YOUR YARD ---------- */
WILD.copeDriveIn = function(line, ms, hold){
  if(WILD.copeTruck) return false;
  const g=(typeof mkPickup==="function")?mkPickup():null;
  if(!g) return false;
  g.position.set(-70, WORLD.getH(0,27), 26.6);
  g.rotation.y=Math.PI/2;
  WILD.copeTruck={ g, t:0, phase:"in", line, ms:ms||5000, hold:hold||0 };
  return true;
};
WILD.copeUpdate = function(dt){
  const T=WILD.copeTruck; if(!T) return;
  T.t+=dt;
  const C=STORY.copper;
  if(T.phase==="in"){
    T.g.position.x=lerp(-70, 6, Math.min(1,T.t/3.4));
    for(const w of T.g.userData.wheels) w.rotation.x+=dt*8;
    if(Math.random()<dt*5) puff(T.g.position.x-2.2,0.7,T.g.position.z,0x9a9a92,0.25,0.5,0.9);
    if(T.t>=3.4){
      T.phase="talk"; T.t=0;
      SFX.play("honk",6,26.6);
      /* put the MAN in frame, not a voice from 47 units away */
      if(C){ C.busy=true; C.setPos(6.5, 23.5); C.face(Math.PI); C.group.visible=true; }
      STORY.copperSay(T.line, T.ms);
    }
  } else if(T.phase==="talk"){
    if(C){ C.speedNow=0; animatePerson(C,dt); }
    if(T.t> Math.max((T.ms/1000)+1.2, T.hold)){ T.phase="out"; T.t=0; if(C) C.busy=false; }
  } else {
    T.g.position.x=lerp(6, 72, Math.min(1,T.t/3.6));
    for(const w of T.g.userData.wheels) w.rotation.x+=dt*8;
    if(C && T.t<0.6) C.setPos(-46.4,-3.8);          // he goes home
    if(T.t>=3.6){ WORLD.scene.remove(T.g); WILD.copeTruck=null; }
  }
};

/* ---------- setup + update ---------- */
WILD.setup = function(){
  WILD.buildForage();
  WILD.buildDot();
  WILD.buildSign();
  BUS.on("newday", ()=>{ WILD.dayReset(); });
  BUS.on("phase", ()=>{ for(const p of WILD.patches) WILD.refreshPatch(p); });
};
WILD.update = function(dt){
  if(!G_STATE) return;
  WILD.dotUpdate(dt);
  WILD.copeUpdate(dt);
  WILD.coonUpdate(dt);
  if(WILD.sign) WILD.sign.visible=!!G_STATE.flags.undercut;
  if(typeof REGULARS!=="undefined") REGULARS.update(dt);
  /* M5: the camera pulls back as the empire grows — bible §4 and §18 both
     promise this as the "one mountain, deepening" payoff, and camDist was
     written in exactly ONE place: the mouse wheel. */
  const rank=G_STATE.rank||0;
  MAIN.camMax = 24 + rank*3.5;
};

/* ---------- Fable pass: the undercut war made visible ---------- */
WILD.buildSign = function(){
  const g=new THREE.Group();
  const post=clayCyl(0.07,0.07,1.5,0x6a4a30); post.position.y=0.75; g.add(post);
  const board=clayBox(1.5,0.7,0.09,0xe8d9a8,0.2); board.position.y=1.5; g.add(board);
  const trim=clayBox(1.56,0.1,0.1,0xb5472e,0.2); trim.position.y=1.88; g.add(trim);
  /* a crude painted "$2" — two strokes, mountain signage at its finest */
  const s1=clayBox(0.1,0.42,0.1,0xb5472e,0.2); s1.position.set(-0.25,1.5,0.03); s1.rotation.z=0.2; g.add(s1);
  const s2=clayBox(0.34,0.1,0.1,0xb5472e,0.2); s2.position.set(0.18,1.42,0.03); g.add(s2);
  const s3=clayBox(0.34,0.1,0.1,0xb5472e,0.2); s3.position.set(0.18,1.62,0.03); g.add(s3);
  g.position.set(-9.5, WORLD.getH(-9.5,27.2), 27.2);
  g.rotation.y=0.25; g.visible=false;
  WORLD.scene.add(g);
  WILD.sign=g;
};

/* ---------- Fable pass: the raccoon has a body now ---------- */
WILD.coonUpdate = function(dt){
  const F=G_STATE.flags;
  /* spawn: on a sabotage morning the varmint walks IN, visibly, and can be
     caught before it ever reaches your roof */
  if(F.sabRaccoon && !WILD.coon && F.coonDay!==G_STATE.day
     && (CYCLE.phase==="morning"||CYCLE.phase==="afternoon")){
    F.coonDay=G_STATE.day;
    const g=makeRaccoon();
    g.position.set(-30, WORLD.getH(-30,-16), -16);
    WORLD.scene.add(g);
    WILD.coon={g, phase:"trot", t:0};
    toast("🦝 Something's slinking toward the kettle…","bad",3200);
  }
  const C=WILD.coon; if(!C) return;
  C.t+=dt;
  const K=WORLD.anchors.kettle;
  if(C.phase==="trot"){
    /* ⚠️ it climbs the OUTSIDE wall — aiming straight at the kettle walked it
       through the shack geometry, which a screenshot caught immediately */
    const tx=K.x+0.9, tz=K.z-2.4;
    const dx=tx-C.g.position.x, dz=tz-C.g.position.z, d=Math.hypot(dx,dz);
    if(d<3.4){ C.phase="climb"; C.t=0; }
    else{
      C.g.position.x+=dx/d*1.5*dt; C.g.position.z+=dz/d*1.5*dt;
      C.g.position.y=WORLD.getH(C.g.position.x,C.g.position.z)+0.25+Math.abs(Math.sin(C.t*9))*0.06;
      C.g.rotation.y=Math.atan2(dx,dz);
    }
    if(!F.sabRaccoon) C.phase="flee";                   // shooed
  } else if(C.phase==="climb"){
    C.g.position.y=Math.min(3.0, C.g.position.y+dt*1.4);
    if(C.g.position.y>=3.0){ C.phase="roofglide"; }
    if(!F.sabRaccoon) C.phase="flee";                   // shooed late
    if(CYCLE.phase==="night") C.phase="flee";
  } else if(C.phase==="roofglide"){
    const tx=K.x+0.9, tz=K.z-2.4;
    const dx=tx-C.g.position.x, dz=tz-C.g.position.z, d=Math.hypot(dx,dz);
    if(d>0.2){ C.g.position.x+=dx/d*1.1*dt; C.g.position.z+=dz/d*1.1*dt; C.g.rotation.y=Math.atan2(dx,dz); }
    if(!F.sabRaccoon) C.phase="flee";                   // boil consumed it, or shooed late
    if(CYCLE.phase==="night") C.phase="flee";
  } else { /* flee */
    C.g.position.x-=dt*4.5; C.g.position.z-=dt*2.2;
    C.g.position.y=Math.max(WORLD.getH(C.g.position.x,C.g.position.z)+0.25, C.g.position.y-dt*3);
    C.g.rotation.y=Math.atan2(-1,-0.5);
    if(C.g.position.x<-32){ WORLD.scene.remove(C.g); WILD.coon=null; }
  }
};

WORLD.addStation({ id:"coon",
  get x(){ return WILD.coon?WILD.coon.g.position.x:9999; },
  get z(){ return WILD.coon?WILD.coon.g.position.z:9999; }, r:2.6,
  prompt(){ if(!WILD.coon || (WILD.coon.phase!=="trot"&&WILD.coon.phase!=="climb") || MAIN.mode!=="walk") return null;
    return "🦝 SHOO the raccoon"; },
  action(){
    if(!WILD.coon || (WILD.coon.phase!=="trot"&&WILD.coon.phase!=="climb")) return;
    G_STATE.flags.sabRaccoon=false;
    WILD.coon.phase="flee";
    SFX.play("spit", WILD.coon.g.position.x, WILD.coon.g.position.z);
    MAIN.player.squash=0.25;
    toast("🦝 Shooed it clear off the property. It left with most of its dignity.","",3000);
    STORY.fame(1,"varmint patrol");
    if(Math.random()<0.5) STORY.at(rand(20,40), ()=>WILD.copeDriveIn(DATA.COPPERHEAD.coonShooed, 4200));
  }
});
