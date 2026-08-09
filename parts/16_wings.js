"use strict";
/* WINGS — the Kitchen, the Gift Shop, hats, and the two warm bodies you can hire */

const WINGS = {
  cooking:null,            // {dish, t, state:'cooking'|'ready'}
  barFoodGroup:null, shelfGroup:null, jerkyBuilt:false,
  darlene:null, tim:null, timCookT:0,
};

WINGS.powered = ()=> G_STATE && G_STATE.power!==false;

/* ---------- setup ---------- */
WINGS.setup = function(){
  /* fryer */
  WORLD.addStation({ id:"fryer", x:WORLD.anchors.fryer.x, z:WORLD.anchors.fryer.z, r:2.4,
    prompt(c){
      if(!G_STATE || !G_STATE.wings.kitchen) return null;
      const ck=WINGS.cooking;
      if(!ck) return c.carried? null : "🍳 Fire up the fryer (pick a dish)";
      if(ck.state==="cooking") return `Cooking ${DATA.DISHES[ck.dish].name}… (${Math.ceil(DATA.DISHES[ck.dish].cook-ck.t)}s)`;
      if(ck.state==="ready") return `⚡ PULL IT! ${DATA.DISHES[ck.dish].name} is READY`;
      return null;
    },
    action(c){
      const ck=WINGS.cooking;
      if(!ck){ if(!c.carried) UI.dishPick(); return; }
      if(ck.state==="ready"){
        const d=DATA.DISHES[ck.dish];
        WINGS.cooking=null;
        const P=MAIN.player;
        const it=spawnItem("plate", P.x+Math.sin(P.facing)*0.7, P.z+Math.cos(P.facing)*0.7, {dish:ck.dish});
        if(!P.carry){ it.carriedBy=P; P.carry=it; P.carryPose=1; }
        SFX.play("ding",WORLD.anchors.fryer.x,WORLD.anchors.fryer.z);
        toast(`${d.name} — carry it to the bar pass!`,"",2000);
      }
    }
  });
  /* bar food pass */
  WORLD.addStation({ id:"foodpass", x:16.5, z:-4.4, r:2.2,
    prompt(c){
      if(!G_STATE || !G_STATE.wings.kitchen) return null;
      if(c.carried && c.carried.kind==="plate") return `Stock the bar — ${DATA.DISHES[c.carried.data.dish].name}`;
      return null;
    },
    action(c){
      const dish=c.carried.data.dish;
      G_STATE.food[dish]=(G_STATE.food[dish]||0)+1;
      MAIN.player.carry=null; MAIN.player.carryPose=0;
      killItem(c.carried);
      SFX.play("plop",16.5,-5.5);
      WINGS.refreshBarFood();
      toast(`${DATA.DISHES[dish].name} on the pass. Pairs with ${DATA.DISHES[dish].pairName}.`,"",2200);
    }
  });
  /* hat rack */
  WORLD.addStation({ id:"hatrack", x:WORLD.anchors.hatRack.x, z:WORLD.anchors.hatRack.z, r:2.2,
    prompt(){ return G_STATE && G_STATE.wings.gift ? "🎩 The hat rack" : null; },
    action(){ UI.hatShop(); }
  });
  /* dumpster chore */
  WORLD.addStation({ id:"dumpster", x:WORLD.anchors.dumpster.x, z:WORLD.anchors.dumpster.z, r:2.4,
    prompt(){
      if(!G_STATE) return null;
      if(G_STATE.spentGrain<=0) return null;
      return `Empty the spent grain (${G_STATE.spentGrain} 🌾${G_STATE.spentGrain>=DATA.TUNE.bearAt?" — the Boys are CIRCLING":""})`;
    },
    action(){
      G_STATE.spentGrain=0; G_STATE.bearStage=0;
      WORLD.props.dumpsterGrain.visible=false;
      SFX.play("thud",WORLD.anchors.dumpster.x,WORLD.anchors.dumpster.z);
      SFX.play("squelch",WORLD.anchors.dumpster.x,WORLD.anchors.dumpster.z);
      toast(DATA.EVENTS.dumpsterClean,"",2600);
    }
  });
  WINGS.refreshBarFood();
};

/* ---------- wing unlocks ---------- */
WINGS.unlock = function(key, silent){
  G_STATE.wings[key]=true;
  WORLD.openWing(key);
  if(!silent){
    SFX.play("unfold");
    if(key==="kitchen") toast("🍳 THE KITCHEN IS OPEN — boards are off! Cook at the fryer, stock the bar pass.","gold",5000);
    if(key==="gift") toast("🧸 THE GIFT SHOP IS OPEN — stock merch, sell your legend. Hat rack's in the corner.","gold",5000);
  }
};

/* ---------- bar food + shelf displays ---------- */
WINGS.refreshBarFood = function(){
  if(WINGS.barFoodGroup){ WORLD.scene.remove(WINGS.barFoodGroup); WINGS.barFoodGroup=null; }
  if(!G_STATE) return;
  const g=new THREE.Group();
  let slot=0;
  for(const key in G_STATE.food){
    for(let i=0;i<Math.min(G_STATE.food[key],4);i++){
      const p=itemMesh("plate",{dish:key});
      p.scale.setScalar(0.8);
      p.position.set(15.2+slot*0.55, 1.75, -6.2+(i%2)*0.4);
      g.add(p); slot++;
      if(slot>7) break;
    }
    if(slot>7) break;
  }
  WORLD.scene.add(g);
  WINGS.barFoodGroup=g;
};

WINGS.refreshGiftShelf = function(){
  if(WINGS.shelfGroup){ WORLD.scene.remove(WINGS.shelfGroup); WINGS.shelfGroup=null; }
  if(!G_STATE) return;
  const g=new THREE.Group();
  const items=[];
  for(let i=0;i<Math.min(G_STATE.gift.tee,4);i++) items.push("tee");
  for(let i=0;i<Math.min(G_STATE.gift.globe,4);i++) items.push("globe");
  for(let i=0;i<Math.min(G_STATE.gift.plush,4);i++) items.push("plush");
  items.slice(0,10).forEach((k,i)=>{
    let m;
    if(k==="tee"){ m=clayBox(0.5,0.42,0.1,pick([0xb5472e,0x4c7a4c,0xe8a33d]),0.05,741+i); }
    else if(k==="globe"){ m=new THREE.Mesh(geoGet("globe",()=>new THREE.SphereGeometry(0.2,10,8)),
      new THREE.MeshStandardMaterial({color:0xcfe8ff, transparent:true, opacity:0.6, roughness:0.1})); }
    else { m=new THREE.Group();
      const body=claySphere(0.18,0x8a5a3a,0.12,745+i); m.add(body);
      const head=claySphere(0.12,0x8a5a3a,0.12,748+i); head.position.y=0.22; m.add(head); }
    m.position.set(21.8+(i%5)*1.35, 1.15+Math.floor(i/5)*0.75, 1.62);
    g.add(m);
  });
  WORLD.scene.add(g);
  WINGS.shelfGroup=g;
};

/* tourist buys something; returns earned amount or 0 */
WINGS.buySomething = function(){
  const G=G_STATE.gift;
  const stocked=[["tee",18],["globe",14],["plush",22]].filter(([k])=>G[k]>0);
  const legends=Object.keys(G_STATE.discovered).length;
  if(legends>0 && Math.random()<0.3){
    SFX.play("chaching",24,3);
    ECON.earn(20,"merch");
    toast("🧢 Sold a Legendary tee! (Big Tim prints 'em in the back)","",1800);
    return 20;
  }
  if(!stocked.length) return 0;
  const [k,price]=pick(stocked);
  G[k]--;
  ECON.earn(price,"merch");
  SFX.play("chaching",24,3);
  WINGS.refreshGiftShelf();
  return price;
};

/* ---------- the jerky rack (epilogue) ---------- */
WINGS.buildJerky = function(){
  if(WINGS.jerkyBuilt) return;
  WINGS.jerkyBuilt=true;
  const g=new THREE.Group();
  const frame=clayBox(1.2,1.8,0.3,0x5e402a,0.05,751); frame.position.y=0.9; g.add(frame);
  for(let i=0;i<6;i++){ const j=clayBox(0.16,0.4,0.06,0x6a3a2a,0.15,752+i);
    j.position.set(-0.4+(i%3)*0.4, 1.3-Math.floor(i/3)*0.6, 0.18); j.rotation.z=rand(-0.2,0.2); g.add(j); }
  const sign=clayBox(1.1,0.3,0.06,0xe8d9a8,0.04,758); sign.position.set(0,1.9,0.1); g.add(sign);
  const a=WORLD.anchors.jerky;
  g.position.set(a.x, WORLD.getH(a.x,a.z)+0.3, a.z);
  WORLD.scene.add(g);
};

/* ---------- staff ---------- */
WINGS.hireArrive = function(key, silent){
  if(key==="darlene" && !WINGS.darlene){
    const rig=makePerson({skin:0xe8b48c, shirt:0xc85a7a, pants:0x4a4a52, hat:"straw"});
    rig.setPos(10.2,-7.2); rig.face(0);
    WORLD.scene.add(rig.group);
    WINGS.darlene=rig;
    if(!silent) toast("💁 Darlene's behind the bar. She pours, you brew.","gold",3600);
  }
  if(key==="bigtim" && !WINGS.tim){
    const rig=makePerson({skin:0xc98c5a, shirt:0xe8e0cc, pants:0x5e402a, size:1.18, belly:true, hat:"beanie"});
    rig.setPos(WORLD.anchors.timSpot.x, WORLD.anchors.timSpot.z); rig.face(Math.PI);
    WORLD.scene.add(rig.group);
    WINGS.tim=rig;
    if(!silent) toast("👨‍🍳 Big Tim reports to the fryer. He whispers to it. It listens.","gold",3600);
  }
};

WINGS.update = function(dt){
  if(!G_STATE) return;
  /* cooking */
  const ck=WINGS.cooking;
  if(ck){
    ck.t+=dt;
    const d=DATA.DISHES[ck.dish];
    const F=WORLD.anchors.fryer;
    if(ck.state==="cooking"){
      if(Math.random()<dt*3) puff(F.x+rand(-.4,.4),1.9,F.z-1.4,0xe8e2d2,0.2,0.8,0.8);
      if(Math.random()<dt*2) SFX.play("sizzle",F.x,F.z);
      if(ck.t>=d.cook){ ck.state="ready"; ck.t=0; SFX.play("ding",F.x,F.z); }
    } else if(ck.state==="ready"){
      if(ck.t>7){
        WINGS.cooking=null;
        SFX.play("sizzle",F.x,F.z); SFX.play("ew",F.x,F.z);
        for(let i=0;i<10;i++) puff(F.x+rand(-.5,.5),2+rand(1),F.z-1.4,0x3a3a3a,0.4,1.5,1.6);
        toast(`💀 The ${d.name} burned. The fryer is not sorry.`,"bad",2600);
      }
    }
  }
  /* Big Tim autopilot */
  if(G_STATE.machines.bigtim && WINGS.tim && G_STATE.wings.kitchen){
    WINGS.timCookT-=dt;
    const total=Object.values(G_STATE.food).reduce((a,b)=>a+b,0);
    if(WINGS.timCookT<=0 && total<4 && !WINGS.cooking){
      WINGS.timCookT=13;
      const key=Object.keys(DATA.DISHES).sort((a,b)=>(G_STATE.food[a]||0)-(G_STATE.food[b]||0))[0];
      if(G_STATE.cash>=DATA.DISHES[key].cost){
        G_STATE.cash-=DATA.DISHES[key].cost;
        G_STATE.food[key]=(G_STATE.food[key]||0)+1;
        SFX.play("ding",WORLD.anchors.fryer.x,WORLD.anchors.fryer.z);
        WINGS.refreshBarFood(); UI.hud();
        if(Math.random()<0.3) UI.bubbleRig(WINGS.tim, pick(["there ya go, darlin'","*whispers to the fryer*","hot 'n ready"]), 1800);
      }
    }
  }
  /* Darlene autopilot */
  if(G_STATE.machines.darlene && WINGS.darlene){
    const cust=PUB.customers.find(c=>c.state==="order" && c.chosen>=0 && c.t>0.9);
    if(cust && PUB.pourLock<=0){
      PUB.serve(cust);
      SFX.play("pour",10.2,-6);
      if(Math.random()<0.25) UI.bubbleRig(WINGS.darlene, pick(["comin' up","easy, sugar","tab's a myth here"]), 1600);
    }
  }
  /* staff idle anim */
  if(WINGS.darlene){ WINGS.darlene.speedNow=0; animatePerson(WINGS.darlene,dt); }
  if(WINGS.tim){ WINGS.tim.speedNow=0; animatePerson(WINGS.tim,dt); }
};

/* hat helpers */
WINGS.checkHatUnlocks = function(){
  const H=G_STATE.hatsOwned;
  const own=(k,msg)=>{ if(!H.includes(k)){ H.push(k); toast(`🎩 HAT UNLOCKED: ${DATA.HATS[k].name} — ${msg}`,"gold",4000); SFX.play("yay"); } };
  const installed=Object.keys(G_STATE.machines).filter(k=>G_STATE.machines[k]&&!DATA.MACHINES[k].staff).length;
  if(installed>=3) own("hard","certified.");
  if(Object.keys(G_STATE.discovered).length>=5) own("wizard","the kettle obeys you now.");
  if(G_STATE.flags.leafSurvived) own("leaf","you survived the bus.");
  if((G_STATE.cleanNights||0)>=3) own("ranger","Dot tips her brim.");
  if(G_STATE.flags.worldsWon) own("snake","his actual hat. he insisted.");
};
WINGS.wearHat = function(key){
  G_STATE.hat=key;
  MAIN.player.setHat(key);
};
