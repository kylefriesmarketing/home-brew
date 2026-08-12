"use strict";
/* PUB — taps, pricing, customers, reactions, and the ficus that has seen things */

const PUB = {
  customers:[], tapMeshes:[null,null], spawnT:4, joeCame:false, pourLock:0, freezeT:0, lastPourTap:-1,
};

function removeRig(rig){
  if(rig.group.parent) rig.group.parent.remove(rig.group);
  const i=ACTORS.list.indexOf(rig); if(i>=0) ACTORS.list.splice(i,1);
}

/* walk toward target; returns true when arrived */
PUB.walk = function(c, tx, tz, dt, speed){
  const r=c.rig;
  const dx=tx-r.x, dz=tz-r.z;
  const d=Math.hypot(dx,dz);
  if(d<0.35){ r.speedNow=0; return true; }
  const sp=speed*(1-Math.min(c.drunk*0.13,0.5));
  let vx=dx/d*sp, vz=dz/d*sp;
  if(c.drunk>0){ const w=Math.sin(CLAY.raw*3+c.seed)*c.drunk*0.45; const px=-vz/sp, pz=vx/sp; vx+=px*w; vz+=pz*w; }
  let nx=r.x+vx*dt, nz=r.z+vz*dt;
  [nx,nz]=WORLD.collide(nx,nz,0.5);
  r.x=nx; r.z=nz; r.y=WORLD.getH(nx,nz);
  r.vx=vx; r.vz=vz;
  r.facing=angLerp(r.facing,Math.atan2(vx,vz),Math.min(1,10*dt));
  r.speedNow=sp;
  r.group.position.set(r.x,r.y,r.z);
  if(c.drunk>0){ r.group.rotation.z=Math.sin(CLAY.t*4+c.seed)*0.08*c.drunk; if(Math.random()<dt*0.25*c.drunk){ SFX.play("hiccup",r.x,r.z); r.squash=0.15; if(typeof ALIVE!=="undefined") ALIVE.bubble(r.x, r.y+2.0, r.z, "hic"); } }
  return false;
};

PUB.setup = function(){
  /* tap stations */
  for(let i=0;i<2;i++){
    const a=WORLD.anchors["tap"+i];
    WORLD.addStation({ id:"tap"+i, x:a.x, z:a.z, r:2.0,
      prompt(c){
        if(!G_STATE) return null;
        const T=G_STATE.taps[i];
        if(c.carried && c.carried.kind==="keg" && c.carried.data.state==="filled" && !T.beer)
          return `Tap it — “${c.carried.data.beer.name}”`;
        if(!c.carried && T.beer) return `“${T.beer.name}” · ${T.pints} pints · $${T.price} (E: price)`;
        if(!c.carried && !T.beer) return "Empty tap — bring a filled keg";
        return null;
      },
      action(c){
        const T=G_STATE.taps[i];
        if(c.carried && c.carried.kind==="keg" && c.carried.data.state==="filled" && !T.beer){
          T.beer=c.carried.data.beer; T.pints=c.carried.data.pints;
          if(T.price<=0||T.price===undefined) T.price=T.beer.suggest;
          MAIN.player.carry=null; MAIN.player.carryPose=0; MAIN.player.heavyPose=0;
          killItem(c.carried);
          PUB.mountTapVisual(i);
          SFX.play("clank",a.x,a.z); SFX.play("pour",a.x,a.z);
          toast(`Tapped: “${T.beer.name}” — tag says $${T.price}`);
          CYCLE.obj("tapit");
          return;
        }
        if(T.beer){ UI.priceDialog(i); }
      }
    });
  }
  /* service point behind the bar */
  WORLD.addStation({ id:"serve", x:WORLD.anchors.barService.x, z:WORLD.anchors.barService.z, r:6,
    prompt(c){
      if(!G_STATE || G_STATE.machines.selfpour) return null;
      const cust=PUB.customers.find(cu=>cu.state==="order" && cu.chosen>=0);
      if(!cust) return null;
      if(MAIN.player.z>-5.1) return null; // must be behind the bar
      const T=G_STATE.taps[cust.chosen];
      return `Pour “${T.beer.name}” for the ${cust.def.name} ($${T.price})`;
    },
    action(){
      const cust=PUB.customers.find(cu=>cu.state==="order" && cu.chosen>=0);
      if(cust) PUB.serve(cust);
    }
  });
  /* the OPEN sign */
  WORLD.addStation({ id:"open", x:WORLD.anchors.pubDoor.x, z:WORLD.anchors.pubDoor.z, r:2.4,
    prompt(){ if(!G_STATE) return null;
      return G_STATE.open? "Flip the sign — CLOSE the pub" : "Flip the sign — OPEN the pub!"; },
    action(){
      G_STATE.open=!G_STATE.open;
      WORLD.props.openSign.rotation.z = G_STATE.open? 0 : Math.PI;
      WORLD.props.openSign.children[0].material=clayMat(G_STATE.open?0x4c7a4c:0xb5472e);
      SFX.play(G_STATE.open?"doorbell":"clank",WORLD.anchors.pubDoor.x,WORLD.anchors.pubDoor.z);
      toast(G_STATE.open?"🍺 OPEN FOR BUSINESS":"Closed up.","",1800);
      if(G_STATE.open) CYCLE.obj("open");
    }
  });
  /* jukebox */
  WORLD.addStation({ id:"juke", x:19.5, z:-3.2, r:2,
    prompt(){ return "Kick the jukebox"; },
    action(){
      SFX.play("clank",19.5,-3.2);
      const run=[0,2,4,6,7,6,4,2].map(i=>SFX.PENT[i+irand(3)]);
      run.forEach((f,i)=>setTimeout(()=>SFX.pluck(f,0.5),i*90));
      shake(0.15);
      toast(pick(["the jukebox remembers a song","it plays something from 1987","dust falls out. also music"]),"",1600);
    }
  });
};

PUB.mountTapVisual = function(i){
  const a=WORLD.anchors["tap"+i];
  if(PUB.tapMeshes[i]){ WORLD.scene.remove(PUB.tapMeshes[i]); PUB.tapMeshes[i]=null; }
  const T=G_STATE.taps[i];
  if(!T.beer) return;
  const m=itemMesh("keg",{});
  m.userData.band.visible=true;
  m.userData.band.material=clayMat(parseInt(T.beer.tierCol.replace("#","0x")));
  m.position.set(a.x,2.2,-5.9);
  WORLD.scene.add(m);
  PUB.tapMeshes[i]=m;
};

PUB.kickKeg = function(i){
  const a=WORLD.anchors["tap"+i];
  const T=G_STATE.taps[i];
  T.beer=null; T.pints=0;
  if(PUB.tapMeshes[i]){ WORLD.scene.remove(PUB.tapMeshes[i]); PUB.tapMeshes[i]=null; }
  const keg=spawnItem("keg", a.x, -4.6, {state:"dirty"});
  keg.y=2.2; keg.vy=1.5; keg.vx=rand(-1,1); keg.vz=3+rand(1);
  kegLook(keg);
  SFX.play("kegbounce",a.x,-4.6);
  toast("💨 Keg kicked! Dirty keg needs a wash.","",2200);
};

/* customer lifecycle */
PUB.spawnCustomer = function(type){
  if(!type){
    /* five regular archetypes now; the Snob shows up as you get famous */
    const fame=G_STATE? G_STATE.fame : 0;
    const r=Math.random();
    const snobChance=clamp(fame/450, 0, 0.16);
    type = r<0.34?"local" : r<0.58?"tourist" : r<0.74?"hiker"
         : r<0.74+snobChance?"snob" : "student";
  }
  const rig=makeCustomer(type);
  rig.setPos(11.5+rand(-1,1), 28);
  WORLD.scene.add(rig.group);
  const c={
    rig, type, def:DATA.CUSTOMERS[type], state:"toDoor", t:0, seed:rand(10),
    chosen:-1, drunk:0, pints:0, patience:26, mug:null, spot:null,
    /* reputation with this CLASS raises what they'll spend (Recettear) */
    wallet:DATA.CUSTOMERS[type].wallet*(0.8+rand(0.4))
      *((typeof TASTE!=="undefined")?TASTE.walletMul(type):1),
    req:(typeof TASTE!=="undefined")?TASTE.rollRequest(type):null,
  };
  PUB.customers.push(c);
  if(Math.random()<0.5 && c.def.chat) setTimeout(()=>{ if(!c.dead) UI.bubbleRig(rig, pick(c.def.chat), 2400); }, rand(1000,4000));
  return c;
};

/* the ONE appetite formula — the sim and the price tag both read it, so the
   readout can never drift from what customers actually do */
/* M3: the ONE appetite formula now also carries taste — style preference,
   popularity fatigue and the customer's standing request. `cust` is optional:
   the price tag asks the ARCHETYPE-level question (no specific request), the
   sim passes the actual customer. */
PUB.appeal = function(beer, price, type, cust){
  if(type==="joe"){
    const cursedIng=beer.ing.some(t=>DATA.INGREDIENTS[t].cursed);
    return (beer.axes.w>=2||cursedIng||beer.legendary) ? 10 : -1;
  }
  const def=DATA.CUSTOMERS[type]||DATA.CUSTOMERS.local;
  let v = beer.score*1.35 - price*def.sense;
  if(beer.legendary) v+=2.2;
  if(typeof TASTE!=="undefined"){
    v += TASTE.styleMod(beer, type);                 // they like it / they don't
    v *= TASTE.pop(beer.style);                      // poured it all week? it sags
    /* a RED condition is a hard gate — they walk rather than settle */
    if(cust && cust.req && !TASTE.meetsRed(beer, cust.req)) return -99;
  }
  return v;
};
/* would a typical one buy? (the +0.15 is the mean of the rand spread below) */
PUB.willBuy = function(beer, price, type){
  const def=DATA.CUSTOMERS[type]||DATA.CUSTOMERS.local;
  if(price>def.wallet*((typeof TASTE!=="undefined")?TASTE.walletMul(type):1)) return false;
  return PUB.appeal(beer,price,type)+0.15 > 0.2;
};

PUB.chooseTap = function(c){
  let best=-1, bv=0.2;
  for(let i=0;i<2;i++){
    const T=G_STATE.taps[i];
    if(!T.beer||T.pints<=0) continue;
    if(T.price>c.wallet) continue;
    const v = PUB.appeal(T.beer, T.price, c.type, c) + (c.type==="joe"?0:rand(-0.5,0.8));
    if(v>bv){ bv=v; best=i; }
  }
  return best;
};

PUB.serve = function(c){
  const T=G_STATE.taps[c.chosen];
  if(!T||!T.beer||T.pints<=0){ c.chosen=-1; return; }
  PUB.pourLock=0.9;
  PUB.lastPourTap=c.chosen;
  SFX.play("pour",c.rig.x,c.rig.z);
  T.pints--;
  /* GREEN condition pays a premium on top */
  const green=(typeof TASTE!=="undefined")?TASTE.greenPay(T.beer, c.req):0;
  const paid = (c.type==="joe"? T.price*3 : T.price) * (1+green);
  c.greenHit=green>0;
  ECON.earn(paid, "beer");
  if(typeof TASTE!=="undefined") TASTE.notePour(T.beer);
  SFX.play("chaching",16.8,-5.9);
  c.wallet-=T.price;
  c.beer=T.beer; c.paidPrice=T.price; c.state="toSpot"; c.pints++;
  c.servedByHand = !G_STATE.machines.selfpour;
  G_STATE.tonight.served=(G_STATE.tonight.served||0)+1;
  /* food order alongside the pint */
  if(G_STATE.wings && G_STATE.wings.kitchen && c.type!=="joe"){
    const stocked=Object.keys(G_STATE.food||{}).filter(k=>G_STATE.food[k]>0);
    if(stocked.length && Math.random()<DATA.TUNE.foodChance){
      const paired=stocked.find(k=>T.beer.axes[DATA.DISHES[k].pair]>=2);
      const dish=paired||pick(stocked);
      G_STATE.food[dish]--;
      c.dish=dish; c.dishPaired=!!paired && dish===paired;
      ECON.earn(DATA.DISHES[dish].sell,"food");
      SFX.play("ding",16.5,-5.5);
      WINGS.refreshBarFood();
    }
  }
  // mug in hand
  const mug=itemMesh("mug",{});
  c.rig.parts.armR.add(mug); mug.position.set(0,-0.72,0.15);
  c.mug=mug;
  // pick a spot (pre-resolved out of colliders so arrival is always reachable)
  const spots=[...WORLD.anchors.tables.map(t=>({x:t.x+rand(-1.5,1.5), z:t.z+rand(-1.5,1.5)})),
    {x:rand(6,18), z:rand(-3.5,4)}];
  const s=pick(spots);
  const [sx,sz]=WORLD.collide(s.x,s.z,0.7);
  c.spot={x:sx,z:sz};
  if(T.pints<=0) PUB.kickKeg(c.chosen);
  G_STATE.stats.served=(G_STATE.stats.served||0)+1;
  CYCLE.obj("serve");
  if(c.type==="joe" && !G_STATE.flags.joeServed){ G_STATE.flags.joeServed=true; STORY.fame(4,"joe"); }
};

PUB.finishDrink = function(c){
  const beer=c.beer, r=c.rig;
  if(c.mug){ c.rig.parts.armR.remove(c.mug); c.mug=null; }
  const fm=c.def.fameMul;
  /* M3: reputation with this CLASS moves on every pint — good beer for the
     people who wanted it raises what the whole class will spend next time */
  if(typeof TASTE!=="undefined"){
    const liked=TASTE.styleMod(beer,c.type)>0;
    const bad=beer.tier==="swill";
    TASTE.noteRep(c.type, bad? DATA.REP.perBadPint
      : (liked? DATA.REP.perGoodPint*1.6 : DATA.REP.perGoodPint));
    if(c.greenHit){
      SFX.play("chaching",r.x,r.z);
      UI.bubbleRig(r, pick(["EXACTLY what I wanted","you READ my mind","that's the one"]), 2200);
      STORY.fame(1.5*fm,"request met");
    }
  }
  /* the pairing payoff */
  if(c.dish){
    if(c.dishPaired && beer.tier!=="swill"){
      for(let i=0;i<5;i++) puff(r.x+rand(-.4,.4), r.y+2.5, r.z+rand(-.4,.4), 0xffd98a, 0.2, 1.1, 1.1);
      SFX.play("yay",r.x,r.z);
      UI.bubbleRig(r, pick(["the PAIRING. oh my god.","who PLANNED this?? five stars","*chef kiss*"]), 2200);
      ECON.earn(DATA.DISHES[c.dish].sell*0.5,"tips");
      STORY.fame(2.5*fm,"pairing");
    } else {
      SFX.play("burp",r.x,r.z);
      STORY.fame(0.8*fm,"food");
    }
  }
  if(c.type==="joe"){
    UI.bubbleRig(r, pick(["…yes. WRONG. wonderful.","tastes like the underside of the porch. I love it.","the crick approves."]), 3000);
    SFX.play("yay",r.x,r.z); STORY.fame(3,"joe");
    ECON.earn(c.paidPrice*0.5,"joe tip");
    c.state="leave"; return;
  }
  if(beer.tier==="legend"){
    for(let i=0;i<6;i++) puff(r.x+rand(-.4,.4), r.y+2.4, r.z+rand(-.4,.4), 0xff9ad2, 0.22, 1.2, 1.2);
    SFX.play("yay",r.x,r.z);
    UI.bubbleRig(r, pick(["I SAW GOD","best beer of my LIFE","I'm moving here"]), 2600);
    ECON.earn(c.paidPrice*0.6*c.def.tipMul,"tips");
    STORY.fame(5*fm,"legend pint");
  } else if(beer.tier==="great"){
    for(let i=0;i<4;i++) puff(r.x+rand(-.4,.4), r.y+2.3, r.z+rand(-.4,.4), 0xff9ad2, 0.18, 1, 1);
    SFX.play("burp",r.x,r.z);
    if(typeof ALIVE!=="undefined") ALIVE.burp(r.x, r.y+2.1, r.z, true);
    UI.bubbleRig(r, pick(["dang GOOD","*happy burp*","another!"]), 2000);
    ECON.earn(c.paidPrice*0.4*c.def.tipMul,"tips");
    STORY.fame(3*fm,"great pint");
  } else if(beer.tier==="good"){
    SFX.play("burp",r.x,r.z);
    if(typeof ALIVE!=="undefined") ALIVE.burp(r.x, r.y+2.0, r.z, false);
    if(Math.random()<0.5) UI.bubbleRig(r, pick(["not bad!","hits the spot","yep. beer."]), 1800);
    ECON.earn(c.paidPrice*0.2*c.def.tipMul,"tips");
    STORY.fame(2*fm,"good pint");
  } else if(beer.tier==="decent"){
    if(Math.random()<0.4) UI.bubbleRig(r, pick(["it's… wet","seen worse","hm."]), 1600);
    STORY.fame(0.5*fm,"pint");
  } else { // swill
    r.greenT=4;
    SFX.play("ew",r.x,r.z);
    G_STATE.tonight.swill=(G_STATE.tonight.swill||0)+1;
    const gouged = c.paidPrice>=3;
    UI.bubbleRig(r, pick(gouged?["I PAID MONEY for this?!","$"+c.paidPrice+"?? for THIS??","robbery. flavored robbery."]:["ugh…","that's a crime","my mistake"]), 2200);
    STORY.fame((gouged?-4:-2)*fm,"swill");
    if(c.type==="tourist") G_STATE.tonight.touristsSwilled++;
    if(Math.random()<0.45){ c.state="toFicus"; return; }
  }
  c.drunk++;
  // reorder? browse the gift shop? or head home
  if(beer.tier!=="swill" && c.wallet>2 && Math.random()<(beer.tier==="legend"?0.65:0.4) && c.drunk<3){
    c.state="toBar"; c.chosen=-1; c.patience=26;
  } else if(c.type==="tourist" && G_STATE.wings && G_STATE.wings.gift && Math.random()<0.6){
    c.state="toShop";
  } else c.state="leave";
};

PUB.update = function(dt){
  if(!G_STATE) return;
  PUB.pourLock=Math.max(0,PUB.pourLock-dt);
  /* pouring pose */
  if(PUB.pourLock>0 && MAIN.mode==="walk"){
    MAIN.player.parts.armR.rotation.x=-1.9;
    MAIN.player.parts.armR.rotation.z=-0.4;
  }
  /* bear in the pub: everyone FREEZE */
  if(PUB.freezeT>0){
    PUB.freezeT-=dt;
    for(const c of PUB.customers){ c.rig.speedNow=0; animatePerson(c.rig,dt*0.15); }
    return;
  }
  /* spawns */
  const ph=CYCLE.phase;
  if(ph==="evening" && G_STATE.open){
    PUB.spawnT-=dt;
    const rate=(DATA.TUNE.custBase+G_STATE.fame*DATA.TUNE.custFame)/60
      *((typeof SEASONS!=="undefined")?DATA.SEASONS[SEASONS.current].cust:1); // per second
    if(PUB.spawnT<=0 && PUB.customers.length<14){
      PUB.spawnT=1/Math.max(rate,0.01)*(0.6+rand(0.8));
      PUB.spawnCustomer();
    }
    /* ⚠️ M4 — Joe IS the discovery system (the recipe space is ~4,840 states for
       15 findable recipes, so brute force is correctly impossible and the hints
       are the only way in). But he only ever appeared if a cursed beer was ON
       TAP — and cursed beers are Swill by construction, costing −2 to −4 fame a
       pint plus a Ranger Dot fine. To unlock discovery you had to repeatedly do
       the thing the fame system punishes, for ~15 evenings.
       He wanders down on his own now; a cursed tap still summons him (and he
       still pays triple for it). */
    const anyCursed=G_STATE.taps.some(T=>T.beer&&(T.beer.axes.w>=2||T.beer.ing.some(t=>DATA.INGREDIENTS[t].cursed)));
    const owed=(G_STATE.day-(G_STATE.flags.joeLast||-3))>=3;
    if(!PUB.joeCame && (anyCursed || (owed && G_STATE.day>=3 && Math.random()<0.02))){
      PUB.joeCame=true; G_STATE.flags.joeLast=G_STATE.day;
      setTimeout(()=>PUB.spawnCustomer("joe"),rand(3000,9000));
    }
  }
  /* AI steps */
  for(const c of PUB.customers){
    const r=c.rig; c.t+=dt;
    switch(c.state){
      case "toDoor":
        if(PUB.walk(c, 11.1, 7.6, dt, 3.2)) c.state="enter";
        break;
      case "enter":
        if(PUB.walk(c, 11.1, 4.2, dt, 2.8)){
          if(!G_STATE.open || ph!=="evening"){ c.state="leave"; break; }
          c.state="toBar"; SFX.play("doorbell",11,6);
        }
        break;
      case "toBar": {
        const idx=Math.min(PUB.customers.filter(o=>o.state==="order").length, 5);
        if(PUB.walk(c, 6.8+idx*1.9, -4.3, dt, 2.6)){
          c.state="order"; c.patience=26;
          if(c.type==="joe" && Math.random()<0.8)
            setTimeout(()=>{ if(!c.dead) UI.bubbleRig(c.rig, `<span class="who">Hollow Joe</span>“${STORY.joeHint()}”`, 6500); }, 900);
          /* say what you came in for — a request nobody can SEE is just a
             silent refusal, which reads as the game being broken */
          if(c.req && typeof TASTE!=="undefined")
            setTimeout(()=>{ if(!c.dead) UI.bubbleRig(c.rig, "“"+TASTE.requestText(c.req)+"”", 4200); }, 500);
          c.chosen=PUB.chooseTap(c);
          if(c.chosen<0){
            const gated = c.req && G_STATE.taps.some(T=>T.beer&&T.pints>0&&!TASTE.meetsRed(T.beer,c.req));
            UI.bubbleRig(r, pick(c.type==="joe"?["nothing WRONG on tap. shame."]
              : gated?["that ain't what I asked for","not what I came for","…nope"]
              :["nothin' on tap??","too rich for my blood","I'll come back"]), 2200);
            c.state="leave"; STORY.fame(-0.5,"no sale");
          }
        }
        break; }
      case "order":
        c.patience-=dt;
        r.speedNow=0; r.group.position.set(r.x,r.y,r.z);
        r.facing=angLerp(r.facing, Math.PI, dt*4); // face the bar (north)
        if(G_STATE.machines.selfpour && G_STATE.power!==false && c.t%1<dt && c.chosen>=0){ PUB.serve(c); SFX.play("pour",r.x,r.z); }
        else if(c.patience<=0){
          UI.bubbleRig(r, pick(["service around here…","I got mushrooms growin'","bye"]), 2000);
          STORY.fame(-1,"ignored"); c.state="leave";
        }
        break;
      case "toSpot":
        if(PUB.walk(c, c.spot.x, c.spot.z, dt, 2.4) || c.t>12){ c.state="drink"; c.t=0; c.sips=0; }
        break;
      case "drink":
        r.speedNow=0;
        if(c.t>rand(2.2,3.2)+c.sips){
          c.sips++; c.t=0;
          SFX.play("gulp",r.x,r.z);
          if(Math.random()<0.09 && typeof HOMESTEAD!=="undefined")
            HOMESTEAD.spill(r.x+rand(-.5,.5), r.z+rand(-.5,.5), rand(0.4,0.6), "beer");
          r.parts.armR.rotation.x=-2.4; setTimeout(()=>{ if(!c.dead) r.parts.armR.rotation.x=0; },420);
          if(c.mug&&c.mug.userData.foam) c.mug.userData.foam.scale.y=Math.max(0.08,0.5-c.sips*0.12);
          if(c.sips>=4) PUB.finishDrink(c);
        }
        break;
      case "toFicus":
        if(PUB.walk(c, WORLD.anchors.ficus.x-0.8, WORLD.anchors.ficus.z-0.6, dt, 3.4)){
          c.state="puke"; c.t=0;
        }
        break;
      case "puke":
        if(c.t>0.5&&!c.puked){
          c.puked=true;
          SFX.play("spit",r.x,r.z); SFX.play("ew",r.x,r.z);
          for(let i=0;i<7;i++) puff(WORLD.anchors.ficus.x+rand(-.3,.3),1.2,WORLD.anchors.ficus.z+rand(-.3,.3),0x9ac26a,0.25,0.8,1);
          r.squash=0.4;
          G_STATE.stats.ficus=(G_STATE.stats.ficus||0)+1;
          toast("…the ficus takes another one for the team.","bad",2000);
        }
        if(c.t>1.6){ c.drunk++; c.state="leave"; }
        break;
      case "toShop":
        if(PUB.walk(c, WORLD.anchors.browse.x+rand(-1,1), WORLD.anchors.browse.z+rand(-0.8,0.8), dt, 2.4)){
          c.state="browse"; c.t=0;
        }
        break;
      case "browse":
        r.speedNow=0;
        r.facing=angLerp(r.facing, Math.PI, dt*3); // face the shelves
        if(c.t>rand(2.5,4)){
          WINGS.buySomething();
          if(Math.random()<0.3) UI.bubbleRig(r, pick(["I NEED the snowglobe","this tee slaps","souvenirs or it didn't happen"]), 1800);
          c.state="leave";
        }
        break;
      case "leave":
        if(c.mug){ r.parts.armR.remove(c.mug); c.mug=null; }
        if(PUB.walk(c, 11.1, 7.8, dt, 2.8)) c.state="road";
        break;
      case "road":
        if(PUB.walk(c, 11.5+rand(-14,14), 28.5, dt, 2.8)){
          c.dead=true;
        }
        break;
    }
    animatePerson(r,dt);
  }
  PUB.customers=PUB.customers.filter(c=>{ if(c.dead){ removeRig(c.rig); return false; } return true; });
};

/* nightly close-out: everyone leaves */
PUB.lastCall = function(){
  for(const c of PUB.customers){
    if(c.state!=="leave"&&c.state!=="road"){ c.state="leave"; }
  }
  PUB.joeCame=false;
};
