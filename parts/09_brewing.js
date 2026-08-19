"use strict";
/* BREW — water → kettle → THE BOIL → fermenter → keg. The soul of the game. */

const BREW = {
  hoseFillT:0, hosing:false, hoseTier:"hose",
  boil:null,
  washLock:0,
};

/* ---------- quality math ---------- */
/* which style does this flavour VECTOR point at, and how cleanly?
   purity = cosine similarity to the style's target ratio (1 = dead on) */
BREW.styleOf = function(axes){
  const v=[axes.s,axes.b,axes.f,axes.w];
  const mag=Math.hypot(v[0],v[1],v[2],v[3]);
  if(mag<0.001) return { style:DATA.STYLES[0], purity:0.35 };      // water and a prayer
  let best=DATA.STYLES[0], bestCos=-1;
  for(const S of DATA.STYLES){
    const m=S.mix, mm=Math.hypot(m[0],m[1],m[2],m[3]);
    const cos=(v[0]*m[0]+v[1]*m[1]+v[2]*m[2]+v[3]*m[3])/(mag*mm);
    if(cos>bestCos){ bestCos=cos; best=S; }
  }
  return { style:best, purity:clamp(bestCos,0,1) };
};

/* ⚠️ M2: RATIO decides the style, TOTAL decides the tier.
   The old version summed the four axes into one scalar with hand-tuned body /
   balance / lopsided / funk / weird terms — which produced exactly one optimal
   recipe (coffee+honey, potential 3.98) that beat all 16 Legendaries and made
   the whole pantry decorative. Now:
     total   → how much beer is in the beer (needs ~9 to max out, so a strong
               brew costs all three flavour slots)
     purity  → how close the ratio sits to a real style; gates hard, so
               over-pouring your dominant axis drags you off-ratio into mud
   Water still caps the ceiling, exactly as before. */
BREW.calcPotential = function(waterKey, ings, floaties){
  const W=DATA.WATERS[waterKey];
  let s=0,b=0,f=W.funk||0,w=0;
  for(const t of ings){ const d=DATA.INGREDIENTS[t]; s+=d.s; b+=d.b; f+=d.f; w+=d.w; }
  const axes={s,b,f,w};
  const { style, purity } = BREW.styleOf(axes);
  /* ⚠️ TUNED FOR SPREAD, measured not guessed: at total/9 and a 0.45 purity
     floor, 69% of all 1,139 combos landed within 5% of the best — the ratio
     system was varied in STYLE but flat in QUALITY, because almost every
     3-ingredient brew maxed the water cap. Needing 12 total for full intensity
     (which takes genuinely potent, often cursed ingredients) and gating harder
     on purity spreads the field back out. */
  const total=s+b+f+w;
  let base=clamp(total/12, 0, 1);
  if(floaties) base*=0.82;
  const quality=base*(0.20+0.80*purity);
  const pot=Math.min(0.6 + quality*(W.cap+0.4-0.6), W.cap+0.001);
  return { pot, axes, style, purity, total };
};

BREW.checkLegendary = function(waterKey, ings){
  const sorted=[...ings].sort().join("+");
  for(const L of DATA.LEGENDARIES){
    if(L.wild){ if(ings.includes("jar")) return L; continue; }
    if(L.ing.slice().sort().join("+")===sorted && (!L.water || L.water===waterKey)) return L;
  }
  return null;
};

/* names now END IN THE STYLE YOU ACTUALLY BREWED — the style is the payoff of
   the whole ratio system, so it has to be readable on the tap handle */
BREW.beerName = function(waterKey, ings, axes, tierKey, legendary, style){
  if(legendary) return legendary.name;
  if(tierKey==="swill") return pick(DATA.NAMES.swill);
  const styleWord = style ? style.name : pick(DATA.NAMES.styles);
  for(const t of ings){ if(DATA.NAMES.byIng[t] && Math.random()<0.75)
    return DATA.NAMES.byIng[t]+" "+styleWord; }
  const dom = Object.entries(axes).sort((a,b)=>b[1]-a[1])[0][0];
  return pick(DATA.NAMES.byAxis[dom]||DATA.NAMES.byAxis.s)+" "+styleWord;
};

BREW.tierOf = function(score){
  let t=DATA.TIERS[0];
  for(const ti of DATA.TIERS) if(score>=ti.min) t=ti;
  return t;
};

/* ---------- stations ---------- */
BREW.setup = function(){
  const K=WORLD.anchors.kettle;

  /* kettle */
  WORLD.addStation({ id:"kettle", x:K.x, z:K.z, r:2.6,
    prompt(c){
      if(!G_STATE) return null;
      const k=G_STATE.kettle;
      if(BREW.boil) return null;
      if(c.carried){
        const it=c.carried;
        if(it.kind==="bucket" && it.data.tier && k.stage!=="wort" && k.waterUnits<3)
          return `Pour in ${DATA.WATERS[it.data.tier].name} (${k.waterUnits}/3)`;
        if(it.kind==="ing" && k.stage!=="wort"){
          const d=DATA.INGREDIENTS[it.data.type];
          if(d.base) return !k.barley ? "Dump in the barley"
            : k.ings.length<3 ? "Add EXTRA grain (takes a flavor slot)" : "Barley's already in";
          return k.ings.length<3 ? `Toss in ${d.name}` : "It's full up (3 flavors max)";
        }
        if(it.kind==="jarGift") return "Pour in… whatever this is";
        return null;
      }
      if(k.stage==="wort") return "Taste the wort";
      if(BREW.hosing) return null;
      if(k.waterUnits<3){
        return G_STATE.machines.pipes ? "Fill — choose Hose or Piped Spring" : "Hook up the garden hose (free water!)";
      }
      if(!k.barley) return (G_STATE.machines.silo && (G_STATE.stock.barley||0)>0)
        ? "🔥 FIRE IT UP (the auger's got the grain)"
        : "Needs a barley sack from the pantry";
      return "🔥 FIRE IT UP";
    },
    action(c){
      const k=G_STATE.kettle;
      if(c.carried){
        const it=c.carried;
        if(it.kind==="bucket" && it.data.tier && k.waterUnits<3){
          BREW.addWater(it.data.tier);
          it.data.tier=null; it.mesh.userData.water.visible=false;
          return;
        }
        if(it.kind==="ing"){
          const d=DATA.INGREDIENTS[it.data.type];
          /* first sack is the BASE; a second sack is "extra grain" and takes a
             flavor slot — this is what makes Hot Dog Hefeweizen brewable */
          if(d.base){
            if(!k.barley) k.barley=true;
            else if(k.ings.length<3) k.ings.push(it.data.type);
            else return;
          }
          else { if(k.ings.length>=3) return; k.ings.push(it.data.type); }
          MAIN.player.carry=null; MAIN.player.carryPose=0; killItem(it);
          SFX.play("plop",K.x,K.z); SFX.play("splash",K.x,K.z);
          puff(K.x,2.6,K.z-2.4,0xc9a86a,0.4,1.2,0.9);
          BREW.wortLook();
          if(CYCLE) CYCLE.obj(d.base?"grain":"flavor");
          return;
        }
        if(it.kind==="jarGift"){
          MAIN.player.carry=null; MAIN.player.carryPose=0; killItem(it);
          G_STATE.stock.jar=(G_STATE.stock.jar||0)+1;
          k.ings.push("jar"); G_STATE.stock.jar--;
          toast("It shimmers. It hums. It's IN THE KETTLE NOW.","gold");
          SFX.play("bubble",K.x,K.z);
          BREW.wortLook();
          return;
        }
      }
      if(k.stage==="wort"){ BREW.taste(); return; }
      if(k.waterUnits<3){
        if(G_STATE.machines.pipes && UI){ UI.waterChoice(); }
        else BREW.startHose("hose");
        return;
      }
      if(!k.barley){
        if(G_STATE.machines.silo && (G_STATE.stock.barley||0)>0){
          G_STATE.stock.barley--; k.barley=true;
          ECON.refreshShelf();
          if(typeof HOMESTEAD!=="undefined") HOMESTEAD.augerFeed();
        } else { toast("No grain, no beer. Pantry's on the west wall.","bad"); return; }
      }
      BREW.startBoil();
    }
  });

  /* water sources (bucket fills) */
  const bucketFill=(id, anchor, tier, label)=>{
    WORLD.addStation({ id, x:anchor.x, z:anchor.z, r:2.4,
      prompt(c){
        if(!c.carried || c.carried.kind!=="bucket") return null;
        if(c.carried.data.tier) return "Bucket's full (pour it in the kettle)";
        return label;
      },
      action(c){
        const it=c.carried;
        it.data.tier=tier;
        const w=it.mesh.userData.water; w.visible=true;
        w.material=new THREE.MeshStandardMaterial({color:DATA.WATERS[tier].color, roughness:0.25});
        SFX.play(tier==="crick"?"splash":"pour", anchor.x,anchor.z);
        toast(`Bucket of ${DATA.WATERS[tier].name}`,"",1300);
      }
    });
  };
  bucketFill("sink",   WORLD.anchors.sink,   "sink",   "Fill bucket — Kitchen Sink");
  bucketFill("crick",  WORLD.anchors.crick,  "crick",  "Dip bucket — Muddy Crick");
  bucketFill("spring", WORLD.anchors.spring, "spring", "Fill bucket — Mountain Spring 💧");
  WORLD.addStation({ id:"glacier", x:WORLD.anchors.glacier.x, z:WORLD.anchors.glacier.z, r:3,
    prompt(c){
      if(!G_STATE || !G_STATE.flags.glacierOpen) return null;
      if(!c.carried || c.carried.kind!=="bucket") return null;
      return c.carried.data.tier? "Bucket's full" : "Chip off some GLACIER MELT ❄️";
    },
    action(c){
      const it=c.carried; it.data.tier="glacier";
      const w=it.mesh.userData.water; w.visible=true;
      w.material=new THREE.MeshStandardMaterial({color:DATA.WATERS.glacier.color, roughness:0.15});
      SFX.play("clank",WORLD.anchors.glacier.x,WORLD.anchors.glacier.z);
      toast("Ice age in a bucket.","gold",1600);
    }
  });
  WORLD.addStation({ id:"glaciergate", x:WORLD.anchors.glacierGate.x, z:WORLD.anchors.glacierGate.z, r:2.4,
    prompt(){ if(!G_STATE) return null;
      return G_STATE.flags.glacierOpen? null : (G_STATE.rank>=4 ? "Untie the rope — the glacier trail" : "Rope's tied: 'COME BACK FAMOUS'"); },
    action(){
      if(G_STATE.rank>=4){
        G_STATE.flags.glacierOpen=true;
        if(WORLD.props.glacierRope) WORLD.props.glacierRope.visible=false;
        WORLD.dropCollider("glacier");
        toast("⛰️ The glacier trail is OPEN.","gold");
      } else toast("The rope judges you. Get famous first (rank 5).","bad");
    }
  });

  /* fermenters */
  const fermStation=(i, anchor)=>{
    WORLD.addStation({ id:"ferm"+i, x:anchor.x, z:anchor.z, r:2.3,
      prompt(c){
        if(!G_STATE) return null;
        if(i===1 && !G_STATE.machines.ferm2) return null;
        const F=G_STATE.ferms[i], k=G_STATE.kettle;
        if(k.stage==="wort" && !F.beer && !c.carried) return "Pour the wort in — Fermenter "+(i+1);
        if(F.beer && !F.ready) return "(bubbling… ready after a night's sleep)";
        if(F.beer && F.ready){
          const more=(F.kegs||1)>1? ` — ${F.kegs} kegs' worth in there!` : "";
          if(c.carried && c.carried.kind==="keg" && c.carried.data.state==="clean")
            return `Fill keg — “${F.beer.name}” (${F.beer.tierName})${more}`;
          return `Ready: “${F.beer.name}” — bring a CLEAN keg${more}`;
        }
        return null;
      },
      action(c){
        const F=G_STATE.ferms[i], k=G_STATE.kettle;
        if(k.stage==="wort" && !F.beer && !c.carried){
          F.beer=k.wortBeer; F.ready=false; F.days=DATA.TUNE.fermentDays;
          F.kegs=G_STATE.machines.bigbertha?2:1;
          k.stage="idle"; k.water=null; k.waterUnits=0; k.ings=[]; k.barley=false; k.wortBeer=null;
          BREW.wortLook();
          SFX.play("pour",anchor.x,anchor.z); SFX.play("glug",anchor.x,anchor.z);
          for(let p=0;p<6;p++) setTimeout(()=>puff(anchor.x,2.8,anchor.z,0xd8cfa8,0.35,1,0.8),p*120);
          toast(`Wort's in. “${F.beer.name}” needs one night to become itself.`);
          if(CYCLE) CYCLE.obj("xfer");
          return;
        }
        if(F.beer && F.ready && c.carried && c.carried.kind==="keg" && c.carried.data.state==="clean"){
          const keg=c.carried;
          keg.data.state="filled"; keg.data.beer=F.beer; keg.data.pints=DATA.TUNE.pintsPerKeg;
          kegLook(keg);
          F.kegs=(F.kegs||1)-1;
          if(F.kegs>0) setTimeout(()=>toast("Bertha-sized batch — another keg's worth still in there!","gold",2400),1300);
          else { F.beer=null; F.ready=false; }
          SFX.play("pour",anchor.x,anchor.z);
          toast(`🍺 Kegged: “${keg.data.beer.name}” (${keg.data.beer.tierName})`);
          if(CYCLE) CYCLE.obj("kegit");
          return;
        }
        if(F.beer && !F.ready) toast("Shhh. It's fermenting. Come back tomorrow.","",1600);
      }
    });
  };
  fermStation(0, WORLD.anchors.ferm1);
  fermStation(1, WORLD.anchors.ferm2);

  /* wash trough */
  WORLD.addStation({ id:"trough", x:WORLD.anchors.trough.x, z:WORLD.anchors.trough.z, r:2.4,
    prompt(c){
      if(!G_STATE) return null;
      if(G_STATE.machines.splashy) return c.carried&&c.carried.kind==="keg"&&c.carried.data.state==="dirty" ? "Feed Ol' Splashy the dirty keg" : null;
      if(c.carried && c.carried.kind==="keg" && c.carried.data.state==="dirty") return "Scrub the keg (gets you wet)";
      return null;
    },
    action(c){
      const keg=c.carried;
      if(G_STATE.machines.splashy){
        MAIN.player.carry=null; MAIN.player.carryPose=0;
        keg.carriedBy=null; keg.x=WORLD.anchors.trough.x+rand(-.5,.5); keg.z=WORLD.anchors.trough.z-1.6; keg.y=WORLD.getH(keg.x,keg.z)+0.2;
        keg.data.washT=4;
        toast("Ol' Splashy accepts your offering.","",1500);
        SFX.play("splash",keg.x,keg.z);
        return;
      }
      keg.data.state="clean"; keg.data.beer=null; kegLook(keg);
      SFX.play("splash",WORLD.anchors.trough.x,WORLD.anchors.trough.z);
      SFX.play("squelch",WORLD.anchors.trough.x,WORLD.anchors.trough.z);
      for(let p=0;p<8;p++) puff(WORLD.anchors.trough.x+rand(-1,1),1.2,WORLD.anchors.trough.z-1+rand(-0.5,0.5),0xbfe0ea,0.3,1.4,0.7);
      MAIN.player.squash=0.25;
      toast("Scrubbed. You are now 40% trough water.","",1800);
    }
  });
};

BREW.addWater = function(tier){
  const k=G_STATE.kettle;
  if(k.water && k.water!==tier){
    const worse = DATA.WATERS[tier].cap < DATA.WATERS[k.water].cap ? tier : k.water;
    if(worse!==k.water) toast("Mixed waters — the batch takes after the worse one.","bad");
    k.water=worse;
  } else k.water=tier;
  k.waterUnits++;
  if(tier==="crick" && Math.random()<0.5) k.floaties=true;
  SFX.play("glug",WORLD.anchors.kettle.x,WORLD.anchors.kettle.z);
  BREW.wortLook();
  if(k.waterUnits>=3){
    toast(`Water's in: ${DATA.WATERS[k.water].name}. Now the grain + the weird stuff.`);
    if(CYCLE) CYCLE.obj("water");
  }
};

BREW.startHose = function(tier){
  BREW.hosing=true; BREW.hoseTier=tier; BREW.hoseFillT=0;
  SFX.play("pour",WORLD.anchors.kettle.x,WORLD.anchors.kettle.z);
  toast(tier==="hose"?"Hose is running… chlorine bouquet intensifies.":"Piped spring water, flowing cold.","",2000);
};

/* wort surface color/level */
BREW.wortLook = function(){
  const k=G_STATE?G_STATE.kettle:null;
  const wort=WORLD.props.wort; if(!wort||!k) return;
  const show = k.waterUnits>0 || k.stage==="wort";
  wort.visible=show;
  if(!show) return;
  wort.position.y = 1.4 + (k.waterUnits/3)*1.0 + (k.stage==="wort"?0.05:0);
  let col=new THREE.Color(k.water?DATA.WATERS[k.water].color:0x9fd8e8);
  if(k.barley) col.lerp(new THREE.Color(0xc9a86a),0.6);
  for(const t of (k.ings||[])) col.lerp(new THREE.Color(DATA.INGREDIENTS[t].col),0.3);
  if(k.stage==="wort" && k.wortBeer) col=new THREE.Color(parseInt(k.wortBeer.tierCol.replace("#","0x")));
  wort.material.color=col;
};

/* ---------- THE BOIL ---------- */
BREW.startBoil = function(){
  const k=G_STATE.kettle;
  const on = key => G_STATE.machines[key] && G_STATE.power!==false;
  const storm = G_STATE.weather==="storm" ? 1.4 : 1;
  BREW.boil={
    t:0, dur:DATA.TUNE.boilTime,
    heat:0.45, pres:0.25,
    /* Granny wanders out of calibration with use — her help decays from 0.55
       back toward 1.0 until you walk over and reset her dial (PlateUp's
       unreliable-automation lesson) */
    heatDrift:(on("granny")? lerp(0.55,1,clamp(G_STATE.grannyDrift||0,0,1)) : 1)
      *0.11*((typeof SEASONS!=="undefined")?DATA.SEASONS[SEASONS.current].heat:1),
    presRise:(on("governor")?0.55:1)*0.055*storm,
    bandH:[0.42,0.72], bandP:[0.1,0.55],
    good:0, stir:1, scorchT:0, blowT:0,
    events:[], nextEvent:rand(5,9),
    raccoon: !!(G_STATE.flags.sabRaccoon),
  };
  G_STATE.flags.sabRaccoon=false;
  if(BREW.boil.raccoon){
    /* the WILD walker becomes the roof raccoon — without this handoff a boil
       started mid-walk spawned a SECOND raccoon while the first was visibly
       crossing the yard, then made it flee */
    if(typeof WILD!=="undefined" && WILD.coon){ WORLD.scene.remove(WILD.coon.g); WILD.coon=null; }
    const rc=makeRaccoon();
    rc.position.set(WORLD.anchors.kettle.x+0.9, 3.0, WORLD.anchors.kettle.z-2.4-0.9);
    WORLD.scene.add(rc);
    BREW.raccoonProp=rc;
  }
  MAIN.mode="boil";
  const P=MAIN.player, K=WORLD.anchors.kettle;
  P.x=K.x+1.9; P.z=K.z-2.2+1.6; P.setPos(P.x,P.z); P.face(Math.PI*1.5);
  SFX.play("fire",K.x,K.z);
  toast("HOLD THE BANDS. F feeds the fire, SPACE vents, S stirs.","gold",3000);
  if(UI) UI.boilStart(BREW.boil);
  if(CYCLE) CYCLE.obj("boilstart");
};

BREW.stirTap = function(){
  if(!BREW.boil) return;
  const b=BREW.boil;
  if(b.eventNow && b.eventNow.type==="foam"){
    b.eventNow.mash--;
    SFX.play("squelch");
    if(b.eventNow.mash<=0){ b.eventNow=null; toast("Foam beaten back!","",1200); }
    return;
  }
  b.stir=clamp(b.stir+0.22,0,1);
  b.stirRecent=0.9;                 // a stir counts as hands-on for a beat
  SFX.play("glug");
};

BREW.update = function(dt){
  const K=WORLD.anchors.kettle;
  /* flying lid (post-explosion) */
  const lid=WORLD.props.kettleLid;
  if(lid.userData.fly){
    const f=lid.userData.fly;
    f.t+=dt; f.vy-=26*dt;
    lid.position.y+=f.vy*dt; lid.position.x+=f.vx*dt; lid.position.z+=f.vz*dt;
    lid.rotation.x+=dt*9; lid.rotation.z+=dt*7;
    if(f.t>1.2 && lid.position.y<=2.72){
      lid.position.set(0,2.72,0); lid.rotation.set(0,0,0);
      delete lid.userData.fly;
      SFX.play("clank",K.x,K.z);
    }
  }
  /* hose filling */
  if(BREW.hosing){
    BREW.hoseFillT+=dt;
    if(Math.random()<dt*6) puff(K.x+rand(-.5,.5),2.6,K.z-2.4+rand(-.5,.5),0x9fd8e8,0.2,0.5,0.5);
    if(BREW.hoseFillT>1.1){
      BREW.hoseFillT=0;
      BREW.addWater(BREW.hoseTier);
      if(G_STATE.kettle.waterUnits>=3) BREW.hosing=false;
    }
  }
  /* splashy auto-wash */
  if(G_STATE && G_STATE.machines.splashy && G_STATE.power!==false){
    for(const it of ITEMS.list){
      if(it.kind==="keg" && it.data.washT!==undefined){
        it.data.washT-=dt;
        if(Math.random()<dt*4) puff(it.x,it.y+1,it.z,0xbfe0ea,0.3,1.2,0.6);
        if(it.data.washT<=0){
          delete it.data.washT;
          it.data.state="clean"; it.data.beer=null; kegLook(it);
          SFX.play("ding",it.x,it.z);
          if(typeof HOMESTEAD!=="undefined" && Math.random()<0.5)
            HOMESTEAD.spill(it.x+rand(-0.8,0.8), it.z+rand(-0.6,0.6), rand(0.4,0.6), "water");  // Splashy overspray
        }
      }
    }
  }
  /* fermenter airlock bubbles */
  if(G_STATE) G_STATE.ferms.forEach((F,i)=>{
    if(F.beer && !F.ready && Math.random()<dt*1.4){
      const a=i===0?WORLD.anchors.ferm1:WORLD.anchors.ferm2;
      puff(a.x+0.3,3.6,a.z-2.4,0xd8f0d8,0.14,0.7,0.7);
      if(Math.random()<0.3) SFX.play("bubble",a.x,a.z);
    }
  });

  /* boil sim */
  const b=BREW.boil;
  if(!b) return;
  b.t+=dt;
  const I=MAIN.input;
  // heat: drifts down, F feeds
  b.heat += (I.fire? 0.34 : -b.heatDrift) * dt * (0.8+Math.random()*0.4);
  // pressure: rises, SPACE vents
  b.pres += (I.vent? -0.5 : b.presRise*(1+b.heat*0.9)) * dt * (0.8+Math.random()*0.5);
  if(b.raccoon && Math.random()<dt*0.7){ b.heat+=rand(-0.06,0.06); b.pres+=rand(-0.04,0.08); }
  // stir decay (whirlybird locks it full — if the power's on)
  if(G_STATE.machines.whirlybird && G_STATE.power!==false){ b.stir=1; WORLD.props.kettlePaddle.rotation.y+=dt*9; }
  else { b.stir=clamp(b.stir-dt*0.09,0,1); WORLD.props.kettlePaddle.rotation.y+=b.stir*dt*3; }
  // the raccoon does a little dance
  if(BREW.raccoonProp){
    BREW.raccoonProp.position.y=3.0+Math.sin(CLAY.t*8)*0.08;
    BREW.raccoonProp.rotation.y=Math.sin(CLAY.t*3)*0.6;
  }
  b.heat=clamp(b.heat,0,1); b.pres=clamp(b.pres,0,1);

  // storm: thunder cracks jolt the pressure out of nowhere
  if(G_STATE.weather==="storm" && Math.random()<dt*0.05){
    b.pres+=0.14; shake(0.3);
    SFX.play("thunder",K.x,K.z);
    toast("⚡ THUNDER — pressure jolt!","bad",1200);
  }

  // events
  b.nextEvent-=dt;
  if(!b.eventNow && b.nextEvent<=0){
    b.nextEvent=rand(6,11);
    const roll=Math.random();
    if(G_STATE.kettle.floaties && roll<0.35){ b.eventNow={type:"floaties",t:2.6}; b.pres+=0.2; toast("🪵 FLOATIES! Pressure jump — VENT!","bad",1800); SFX.play("ew"); }
    else if(roll<0.48){ b.eventNow={type:"bee",t:3}; toast("🐝 a bee is INTERESTED","bad",1500); }
    else if(roll<0.6){ b.eventNow={type:"squirrel",t:3.2}; toast("🐿️ A SQUIRREL STOLE A LOG — feed that fire!","bad",1900); SFX.play("boing",K.x,K.z); }
    else if(roll<0.7){ b.eventNow={type:"pop",t:2.8}; toast("🍿 popcorn kernel in the grain?!","bad",1600); }
    else if(roll<0.78){ b.eventNow={type:"sniff",t:3.4, ok:true}; toast("👃 Hollow Joe leans over the fence. HOLD IT STEADY.","gold",2200); }
    else { b.eventNow={type:"foam",t:4, mash:4}; SFX.play("steam"); }
  }
  if(b.eventNow){
    b.eventNow.t-=dt;
    if(b.eventNow.type==="bee"){ b.heat+=Math.sin(b.t*13)*dt*0.24; }
    if(b.eventNow.type==="foam"){ b.pres+=dt*0.1; }
    if(b.eventNow.type==="squirrel"){ b.heat-=dt*0.3; }
    if(b.eventNow.type==="pop"){
      if(Math.random()<dt*5){ b.heat+=rand(-0.05,0.05); b.pres+=rand(-0.03,0.06); SFX.play("plop",K.x,K.z); puff(K.x+rand(-.6,.6),3.2,K.z-2.4,0xfff2d8,0.16,1.8,0.6); }
    }
    if(b.eventNow.type==="sniff"){
      const okNow=(b.heat>=b.bandH[0]&&b.heat<=b.bandH[1])&&(b.pres>=b.bandP[0]&&b.pres<=b.bandP[1]);
      if(!okNow) b.eventNow.ok=false;
    }
    if(b.eventNow.t<=0){
      if(b.eventNow.type==="foam"){
        b.pres+=0.16; toast("foam got away from you","bad",1300);
        if(typeof HOMESTEAD!=="undefined") HOMESTEAD.spill(K.x+rand(-1.4,1.4), K.z-2.4+rand(-1,1), rand(0.5,0.7), "wort");
      }
      if(b.eventNow.type==="squirrel") toast("the squirrel is gone. so is your log.","",1400);
      if(b.eventNow.type==="sniff"){
        if(b.eventNow.ok){
          ECON.earn(15,"joe tip"); SFX.play("chaching",K.x,K.z);
          toast("👃 Joe nods slow. “smells cursed. i love it.” (+$15)","gold",2600);
        } else toast("Joe wanders off, unimpressed.","",1600);
      }
      b.eventNow=null;
    }
  }

  // scoring
  const inH=b.heat>=b.bandH[0]&&b.heat<=b.bandH[1];
  const inP=b.pres>=b.bandP[0]&&b.pres<=b.bandP[1];
  /* ⚠️ M4 — AUTOMATE THE CHORE, NEVER THE JUDGMENT. For $340 (Whirlybird +
     Granny + Governor) the boil used to become a metronome with two beats: a
     heat correction every 5s and a vent every 9.5s, on a 38s minigame. The
     machines still hold the bands so you can't FAIL — they just earn less
     credit while they do it. Hands on the controls = full credit; coasting on
     three machines ≈ 0.67×, which is comfortably below the 71% Legendary gate.
     Automation is now safety and parallelism, not a replacement for you. */
  if(inH&&inP){
    const handsOn = I.fire || I.vent || I.stir || b.stirRecent>0;
    let cred=1;
    if(!handsOn){
      const auto=(G_STATE.machines.granny?1:0)+(G_STATE.machines.governor?1:0)
                +(G_STATE.machines.whirlybird?1:0);
      if(G_STATE.power!==false) cred=1-auto*DATA.TUNE.autoCreditLoss;
    }
    b.good+=dt*(0.6+0.4*b.stir)*cred;
    b.autoCred=cred;
    if(handsOn) b.hands=(b.hands||0)+dt;      // time you actually worked it
  }
  b.stirRecent=Math.max(0,(b.stirRecent||0)-dt);
  // dangers
  if(b.heat>0.93){ b.scorchT+=dt; if(b.scorchT>1.8&&!b.scorched){ b.scorched=true; toast("💀 SCORCHED. It tastes like campfire regret.","bad"); SFX.play("sizzle",K.x,K.z);} }
  else b.scorchT=0;
  if(b.pres>0.96){ b.blowT+=dt; if(b.blowT>1.6){ BREW.blowLid(); return; } }
  else b.blowT=0;

  // presentation
  const glow=WORLD.props.kettleGlow;
  glow.intensity=0.6+b.heat*2.2;
  if(Math.random()<dt*(3+b.heat*8)) puff(K.x+rand(-.8,.8),3.1,K.z-2.4+rand(-.8,.8),0xe8e2d2,0.3+b.heat*0.3,1.2+b.heat,1.1);
  if(Math.random()<dt*b.pres*4) SFX.play("bubble",K.x,K.z);
  WORLD.props.wort.position.y=2.42+Math.sin(CLAY.t*10)*0.04*b.heat;
  // lid rattles when pressure climbs
  const lid2=WORLD.props.kettleLid;
  if(!lid2.userData.fly){
    const rattle=b.pres>0.72? (b.pres-0.72)*3.5 : 0;
    lid2.position.y=2.72+ (rattle? Math.abs(Math.sin(CLAY.raw*38))*0.07*rattle : 0);
    lid2.rotation.z=rattle? Math.sin(CLAY.raw*31)*0.03*rattle : 0;
    if(rattle>0.5 && Math.random()<dt*4) SFX.play("clank",K.x,K.z);
  }
  if(UI) UI.boilFrame(b);

  if(b.t>=b.dur) BREW.finishBoil(false);
};

BREW.blowLid = function(){
  const K=WORLD.anchors.kettle;
  const lid=WORLD.props.kettleLid;
  lid.userData.fly={vy:14, vx:rand(-2,2), vz:rand(-2,2), t:0};
  shake(1); SFX.play("boing",K.x,K.z); SFX.play("steam",K.x,K.z); SFX.play("splash",K.x,K.z);
  for(let i=0;i<22;i++) puff(K.x+rand(-1.5,1.5),2.6+rand(2),K.z-2.4+rand(-1.5,1.5),0xc9a86a,0.5,rand(2,5),1.6);
  if(typeof HOMESTEAD!=="undefined") for(let i=0;i<3;i++)
    HOMESTEAD.spill(K.x+rand(-2.2,2.2), K.z-2.4+rand(-1.6,1.6), rand(0.5,0.85), "wort");
  MAIN.player.squash=0.5;
  MAIN.player.greenT=4;
  toast("💥 THE LID! You are wearing the batch.","bad",3200);
  BREW.finishBoil(true);
};

BREW.finishBoil = function(blown){
  const b=BREW.boil, k=G_STATE.kettle;
  let exec = 0.3 + 1.2*clamp(b.good/(b.dur*0.62),0,1);
  /* ⚠️ THE HANDS-ON GATE. Trimming automated credit alone did nothing — the
     quality bar only needs 62% of the boil in-band, so a 33% credit cut still
     maxed out inside the slack (measured: coasting all three machines still
     scored 100%). So the rule is explicit instead of emergent: machines can
     carry you to a reliable GREAT, but Legendary-grade execution requires that
     you actually worked the kettle. Automation = safety and parallelism;
     excellence stays manual. */
  const handsFrac=(b.hands||0)/b.dur;
  if(exec>1.14 && handsFrac<DATA.TUNE.handsForLegend){
    exec=1.14;
    if(!b._gated){ b._gated=true;
      setTimeout(()=>toast("🤖 The machines held it steady — but a Legendary wants YOUR hands on the kettle.","",4200),900); }
  }
  if(b.scorched) exec=Math.min(exec,0.6);
  if(blown) exec=0.3;
  exec=clamp(exec,0.3,1.5);
  const {pot,axes,style,purity,total}=BREW.calcPotential(k.water,k.ings,k.floaties);
  const L=BREW.checkLegendary(k.water,k.ings);
  /* ⚠️ this used to OVERRIDE score for a Legendary: 4.6+(exec-1.15)*2, capping
     at 5.30 — while a plain coffee+honey on spring water scores pot 3.98 × 1.5
     = 5.97. Every one of the 16 secret recipes was strictly WORSE than the
     obvious two-ingredient mix, which made the whole discovery fantasy
     pointless. Now the legendary status is a FLOOR (so cursed recipes, whose
     raw potential is deliberately awful, still land in tier) PLUS a bonus (so a
     Legendary always beats the same brew without it, and building it out of
     good ingredients pays MORE). */
  /* ⚠️ Water-scaling this floor was MY bug and it was severe: crick/sink/hose
     Legendaries (trout, rampst, pawpaw, laundry, crayola, hefe — 6 of 16)
     could never reach legend TIER, so `isLegend` stayed false and they lost
     their name, their ★, and their DISCOVERY. A Legendary recipe transcends
     its water — the floor is water-agnostic again.
     The ordering instead holds by construction: LEGENDARY tier is reserved for
     actual Legendaries. Generic brews are capped just below it, so the best
     beer you can invent is "Great" and the top rung is earned by discovery —
     which is what drives the whole hint system the bible is built around. */
  const LEGEND_MIN=DATA.TIERS.find(t=>t.key==="legend").min;
  let score = pot*exec;
  if(L && exec>=1.15) score = Math.max(score, 4.6 + (exec-1.15)*2) + DATA.TUNE.legendBonus;
  else score = Math.min(score, LEGEND_MIN-0.01);
  const tier=BREW.tierOf(score);
  const isLegend = !!L && exec>=1.15;      // identity, not a quality threshold
  const beer={
    name: BREW.beerName(k.water,k.ings,axes,tier.key, isLegend?L:null, style),
    tier: tier.key, tierName: tier.name, tierCol: tier.col,
    score: Math.round(score*100)/100, exec: Math.round(exec*100)/100,
    axes, ing:[...k.ings], water:k.water,
    /* M2: style + purity ride the beer so the pub (M3) can have opinions */
    style: style.key, styleName: style.name, styleBlurb: style.blurb,
    purity: Math.round(purity*100)/100, total,
    legendary: isLegend? L.key : null,
    suggest: tier.price,
  };
  k.stage="wort"; k.wortBeer=beer; k.floaties=false;
  BREW.boil=null; MAIN.mode="walk";
  if(BREW.raccoonProp){ WORLD.scene.remove(BREW.raccoonProp); BREW.raccoonProp=null; }
  /* spent grain piles up — the Boys are watching */
  G_STATE.spentGrain=(G_STATE.spentGrain||0)+DATA.TUNE.grainPerBrew;
  if(G_STATE.machines.granny){
    G_STATE.grannyDrift=clamp((G_STATE.grannyDrift||0)+DATA.TUNE.grannyDriftPerBrew,0,1);
    if(G_STATE.grannyDrift>0.55 && !G_STATE.flags._grannyWarn){
      G_STATE.flags._grannyWarn=true;
      setTimeout(()=>toast("🔧 Granny's Dial has wandered off true. Give it a knock (E).","bad",4000),3000);
    }
  }
  if(WORLD.props.dumpsterGrain){
    WORLD.props.dumpsterGrain.visible=G_STATE.spentGrain>0;
    WORLD.props.dumpsterGrain.scale.setScalar(0.6+Math.min(G_STATE.spentGrain,5)*0.18);
    WORLD.props.dumpsterGrain.scale.y*=0.4;
  }
  if(UI) UI.boilEnd();
  BREW.wortLook();
  G_STATE.stats.brews=(G_STATE.stats.brews||0)+1;
  /* remember your finest work by NAME — Odell's pup answers to it */
  if(score>(G_STATE.bestBrewScore||0)){ G_STATE.bestBrewScore=score; G_STATE.bestBrewName=beer.name; }
  if(isLegend && !G_STATE.discovered[L.key]){
    G_STATE.discovered[L.key]=true;
    G_STATE.flags.newLegendDay=G_STATE.day;      // he'll come look at you tomorrow
    toast(`⭐ LEGENDARY DISCOVERED: “${L.name}” ⭐`,"gold",5000);
    SFX.play("yay"); SFX.play("unfold");
    if(STORY) STORY.fame(8,"legendary");
  } else {
    toast(`Boil done: “${beer.name}” — ${beer.tierName} (exec ×${beer.exec})`, tier.key==="swill"?"bad":"",3400);
  }
  if(CYCLE) CYCLE.obj("boil");
};

/* taste the wort — feedback + gags */
BREW.taste = function(){
  const beer=G_STATE.kettle.wortBeer; if(!beer) return;
  const P=MAIN.player;
  SFX.play("gulp",P.x,P.z);
  setTimeout(()=>{
    if(beer.tier==="swill"){ P.greenT=3; SFX.play("ew",P.x,P.z); toast("…it's basically yard soup.","bad"); }
    else if(beer.tier==="legend"){ SFX.play("yay",P.x,P.z); toast("✨ tastes like the mountain APPROVES ✨","gold"); }
    else if(beer.axes.w>=2){ SFX.play("burp",P.x,P.z); P.squash=0.3;
      setTimeout(()=>{ SFX.play("fart",P.x,P.z); puff(P.x,P.y+0.5,P.z-0.4,0x9ac26a,0.3,0.6,1.2); P.squash=0.2; },700);
      toast("interesting. deeply, deeply interesting.");
    }
    else { SFX.play("burp",P.x,P.z); toast("hey now! that's got promise. *burp*"); }
    /* M2: tell the player WHAT THEY MADE. The style is the whole point of the
       ratio system, and purity is the feedback that teaches it. */
    if(beer.styleName) setTimeout(()=>{
      const pure = beer.purity>=0.97 ? "textbook" : beer.purity>=0.9 ? "solid" :
                   beer.purity>=0.78 ? "a bit muddled" : "honestly, a mess of a";
      toast(`🍺 That's ${pure} ${beer.styleName} — ${beer.styleBlurb}`,"",4200);
    },1600);
  },500);
};
