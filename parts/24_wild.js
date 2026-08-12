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
WILD.copeDriveIn = function(line, ms){
  if(WILD.copeTruck) return false;
  const g=(typeof mkPickup==="function")?mkPickup():null;
  if(!g) return false;
  g.position.set(-70, WORLD.getH(0,27), 26.6);
  g.rotation.y=Math.PI/2;
  WILD.copeTruck={ g, t:0, phase:"in", line, ms:ms||5000 };
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
    if(T.t> (T.ms/1000)+1.2){ T.phase="out"; T.t=0; if(C) C.busy=false; }
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
  BUS.on("newday", ()=>{ WILD.dayReset(); });
  BUS.on("phase", ()=>{ for(const p of WILD.patches) WILD.refreshPatch(p); });
};
WILD.update = function(dt){
  if(!G_STATE) return;
  WILD.dotUpdate(dt);
  WILD.copeUpdate(dt);
  /* M5: the camera pulls back as the empire grows — bible §4 and §18 both
     promise this as the "one mountain, deepening" payoff, and camDist was
     written in exactly ONE place: the mouse wheel. */
  const rank=G_STATE.rank||0;
  MAIN.camMax = 24 + rank*3.5;
};
