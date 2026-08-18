"use strict";
/* STORY — fame ladder, Copperhead, the Loan, the County Fair, Hollow Joe's hints */

const STORY = {
  copper:null, queue:[],
};

STORY.setup = function(){
  STORY.copper=makeCopperhead();
  WORLD.scene.add(STORY.copper.group);
  /* Copperhead's mailbox-side heckle point = his lot; loan porch scenes teleport him */
  BUS.on("phase", ph=>STORY.onPhase(ph));
  BUS.on("newday", d=>STORY.onDay(d));
};

STORY.at = function(sec, fn){ STORY.queue.push({at:MAIN.time+sec, fn}); };

STORY.update = function(dt){
  for(let i=STORY.queue.length-1;i>=0;i--){
    if(MAIN.time>=STORY.queue[i].at){ const q=STORY.queue.splice(i,1)[0]; q.fn(); }
  }
  if(STORY.copper && !STORY.copper.busy){
    STORY.copper.speedNow=0;
    animatePerson(STORY.copper,dt);
  }
};

/* ---------- fame & ranks ---------- */
STORY.fame = function(n, why){
  if(!G_STATE) return;
  G_STATE.fame=Math.max(0, G_STATE.fame+n);
  G_STATE.ledger.fameDelta=(G_STATE.ledger.fameDelta||0)+n;
  STORY.checkRank();
  UI.hud();
};

const FEST = {
  fair:     { flagWon:"fairWon",     flagInv:"fairInvited",     dayKey:"fairWonDay",
    title:"🎪 THE COUNTY FAIR", invite:"📯 Word's out! The COUNTY FAIR wants your beer. (It happens at dawn — sleep on it.)",
    copperBeer:"'Ol Reliable", copperScore:()=>5.6+rand(1.1)-(G_STATE.flags.fairTries||0)*0.35, fame:25 },
  regional: { flagWon:"regionalWon", flagInv:"regionalInvited", dayKey:"regionalDay",
    title:"🏆 THE REGIONAL CUP", invite:"📯 The REGIONAL CUP called. Nine-time champ: a certain moonshiner. Sleep on it — and maybe bring a BACKUP keg.",
    copperBeer:"'Ol Reliable Reserve", copperScore:()=>6.7+rand(0.9), fame:40, cheat:true },
  world:    { flagWon:"worldsWon",   flagInv:"worldsInvited",   dayKey:"worldsDay",
    title:"👑 THE WORLD CHAMPIONSHIP", invite:"📯 THE WORLD CHAMPIONSHIP OF BEER. You and Copperhead, head to head. Bring a LEGEND or bring excuses.",
    copperBeer:"Copperhead's Masterpiece", copperScore:()=>8.15+rand(0.45), fame:80 },
};

STORY.checkRank = function(){
  const R=DATA.RANKS;
  let target=G_STATE.rank;
  for(let i=G_STATE.rank+1;i<R.length;i++){
    if(G_STATE.fame>=R[i].at){
      if(R[i].needs && !G_STATE.flags[FEST[R[i].needs].flagWon]){
        const F=FEST[R[i].needs];
        if(!G_STATE.flags[F.flagInv]){
          G_STATE.flags[F.flagInv]=true;
          toast(F.invite,"gold",5600);
          if(R[i].needs==="regional") STORY.at(4,()=>STORY.copperSay(DATA.CH2.regionalIntro,5000));
          if(R[i].needs==="world") STORY.at(4,()=>STORY.copperSay(DATA.CH2.worldsIntro,5000));
        }
        break;
      }
      target=i;
    } else break;
  }
  if(target>G_STATE.rank){
    G_STATE.rank=target;
    SFX.rank=target;
    SFX.play("yay"); SFX.play("unfold");
    UI.rankBanner(DATA.RANKS[target].name);
    if(target===2){ WINGS.unlock("kitchen"); toast("Machines page 2 unlocked — and Big Tim's for hire!","gold"); }
    if(target===3){ WINGS.unlock("gift"); toast("Machines page 3 unlocked — pipes, self-pour, and Darlene's takin' offers!","gold"); }
    if(target===4){ toast("They know your name on the mountain. The GLACIER trail rope can come down.","gold",5000); }
    if(target===5){ STORY.worldsBest(); }
    STORY.checkRank();
  }
};

STORY.worldsBest = function(){
  toast("👑 BEST BREWERY IN THE WORLD. You did it, you absolute goober.","gold",8000);
  STORY.copperSay("…fine. FINE. Best I ever tasted. Don't let it go to yer head.",6000);
  G_STATE.flags.champion=true;
};

/* ---------- Copperhead ---------- */
STORY.copperSay = function(txt, ms=4000){
  const c=STORY.copper;
  UI.bubbleRig(c, `<span class="who">Copperhead</span>${txt}`, ms);
};

STORY.onDay = function(day){
  /* ⚠️ M5 — the day-1 heckle that OPENS the entire rivalry used to be spoken
     from (−46,−4): across the crick, outside the frustum at every legal camera
     distance, most likely never seen by anyone. He drives in now. */
  if(day===1) STORY.at(10, ()=>{
    if(!(typeof WILD!=="undefined" && WILD.copeDriveIn(DATA.COPPERHEAD.heckle1, 6000)))
      STORY.copperSay(DATA.COPPERHEAD.heckle1, 6000);
    SFX.play("honk",6,26);
  });
  /* day-2: the mystery jar on the porch */
  if(day===2 && !G_STATE.flags.jarGiven){
    G_STATE.flags.jarGiven=true;
    const p=WORLD.anchors.porch;
    spawnItem("jarGift", p.x, p.z, {});
    STORY.at(6,()=>{ toast("Something's sitting on your porch step…","gold",4000);
      /* DATA.COPPERHEAD.jarNote — the best-written string in the file — had
         ZERO references outside data.js. It is finally read aloud. */
      STORY.at(3.5, ()=>toast(DATA.COPPERHEAD.jarNote,"gold",6500));
      if(!(typeof WILD!=="undefined" && WILD.copeDriveIn("Found that in the back o' the still. Figured yer swill could use help.",5000)))
        STORY.copperSay("Found that in the back o' the still. Figured yer swill could use help.",5000); });
  }
  /* Fable pass: the morning after a legendary is born, he comes to look at
     you. One-shot beats go through WILD.copeSay — a QUEUE — because
     copeDriveIn returns false when the truck is already out, and the review
     caught these unique lines being silently dropped on collision mornings
     (legendMorn and the concession are strongly CORRELATED: the legendary IS
     the great night that breaks the stand). */
  if(G_STATE.flags.newLegendDay===day-1){
    G_STATE.flags.newLegendDay=0;
    STORY.at(rand(14,30), ()=>{ if(typeof WILD!=="undefined") WILD.copeSay(pick(DATA.COPPERHEAD.legendMorn), 6000); });
  }
  /* the rivalry's mornings — ONE chain, so states can't contradict:
     concession day > active stand > new sabotage > ambient drive-by */
  const RF=G_STATE.flags;
  if(RF.undercutBrokeDay===day){
    /* he concedes in person, and rolls NO new sabotage today — a fresh stand
       rising while he says "stand's closed" was a real 17.5%-of-breaks
       contradiction before this chain was unified */
    RF.undercutBrokeDay=0;
    STORY.at(rand(20,35), ()=>{ if(typeof WILD!=="undefined") WILD.copeSay(DATA.COPPERHEAD.undercutBroken, 5500); });
  } else if(RF.undercut){
    /* ⚠️ he is cheap, not tireless — an unbroken stand folds on the 4th
       morning, or the sabotage flow behind it starves (30-day soak). Derived
       from the day it was RAISED, never a counter: CYCLE.load re-emits newday
       for the same day on every resume, and a counter folded the stand after
       three browser refreshes without a single in-game day passing. */
    if(day-(RF.undercutStart||day)>=4){
      RF.undercut=false; RF.undercutStart=0;
      STORY.at(10,()=>{ toast("🪧 The stand's gone this morning. Nothing announced. Nothing explained.","",4000);
        if(typeof WILD!=="undefined") STORY.at(8,()=>WILD.copeSay("Stand's closed. Weren't the money. Got bored. …Weren't the money.",5000)); });
    } else {
      STORY.at(8,()=>toast("🪧 Copperhead's stand is still up the road. Cheap travels — but word travels harder.","bad",4200));
    }
  } else if(G_STATE.rank>=1 && day>2 && !RF["sab"+day] && Math.random()<0.35){
    RF["sab"+day]=true;
    if(Math.random()<0.5){
      RF.sabRaccoon=true;
      STORY.at(rand(20,60),()=>STORY.copperSay(DATA.COPPERHEAD.raccoon,4000));
    } else {
      RF.undercut=true; RF.undercutStart=day;
      STORY.at(8,()=>toast("🪧 "+DATA.COPPERHEAD.undercut,"bad",4500));
    }
  } else if(day>2 && Math.random()<0.22){
    /* drive-by mornings — pool by SEASONS.of(day), NOT SEASONS.current:
       STORY's newday handler runs before SEASONS', so .current is one season
       stale on exactly the turn mornings */
    const P=DATA.COPPERHEAD.driveby;
    const seas=(typeof SEASONS!=="undefined")?SEASONS.of(day):null;
    const pool=(seas && P[seas] && Math.random()<0.6) ? P[seas] : P.any;
    STORY.at(rand(15,45), ()=>{ if(typeof WILD!=="undefined") WILD.copeSay(pick(pool), 5000); });
  }
  /* festival mornings (one at a time, biggest first) */
  for(const type of ["world","regional","fair"]){
    const F=FEST[type];
    if(G_STATE.flags[F.flagInv] && !G_STATE.flags[F.flagWon] && day>(G_STATE[F.dayKey]||0)){
      STORY.at(3,()=>UI.festival(type));
      break;
    }
  }
  /* ranger fine from last night */
  if(G_STATE.flags.fineDue){
    G_STATE.flags.fineDue=false;
    STORY.at(12,()=>{ G_STATE.cash-=DATA.TUNE.fine; toast("🎫 "+DATA.DOT.fine,"bad",5000); SFX.play("ew"); UI.hud(); });
  }
  /* loan vig reminder */
  if(G_STATE.loan) STORY.at(20,()=>toast(`🐍 Copperhead's taste: ${fmt$(DATA.TUNE.loanVig)}/day. Balance ${fmt$(G_STATE.loan.bal)}.`,"bad",3500));
};

STORY.onPhase = function(ph){
  if(ph==="evening" && G_STATE.day>=2 && !G_STATE.open){
    STORY.at(6,()=>{ if(!G_STATE.open) toast("Evenin'. Folks are thirsty — flip that OPEN sign.","",3000); });
  }
  if(ph==="night"){
    /* dot fine check */
    if(G_STATE.tonight.touristsSwilled>=2) G_STATE.flags.fineDue=true;
    /* clean-night streak (Ranger Dot's hat) */
    if((G_STATE.tonight.served||0)>0 && (G_STATE.tonight.swill||0)===0){
      G_STATE.cleanNights=(G_STATE.cleanNights||0)+1;
      if(G_STATE.cleanNights===3) toast(DATA.DOT.hat,"gold",4500);
    } else if((G_STATE.tonight.swill||0)>0) G_STATE.cleanNights=0;
    /* leaf-day survival */
    if(G_STATE.leafDay && (G_STATE.tonight.served||0)>=8) G_STATE.flags.leafSurvived=true;
    WINGS.checkHatUnlocks();
    /* ⚠️ stash the evening's great-pour count BEFORE the wipe — finishSleep
       reads it for the undercut quality-break, and this wipe used to run
       first whenever the player stayed up past last call (the break could
       only ever fire for players who closed EARLY — inverted intent) */
    G_STATE.flags.nightGood=Math.max(G_STATE.flags.nightGood||0,
      (G_STATE.tonight&&G_STATE.tonight.good)||0);   // idempotent if night re-fires
    G_STATE.tonight={touristsSwilled:0,served:0,swill:0};
    PUB.lastCall();
  }
};

/* ---------- the Loan ---------- */
STORY.maybeOfferLoan = function(){
  if(G_STATE.loan || G_STATE.flags.loanOffered) return false;
  /* ⚠️ this used to require cash<12 AND no filled keg AND no tapped pints AND
     no fermenting batch — four conditions at once, so it almost never fired and
     bible §11 beat 4 ("your lowest moment is his best scene") was dead content
     most players never saw. Now: broke, with nothing ready to sell. A fermenting
     batch no longer saves you, because upkeep is due tonight either way. */
  const desperate = G_STATE.cash < DATA.TUNE.loanGate &&
    !ITEMS.list.some(i=>i.kind==="keg"&&i.data.state==="filled") &&
    !G_STATE.taps.some(t=>t.beer&&t.pints>0);
  if(!desperate) return false;
  G_STATE.flags.loanOffered=true;
  UI.loanOffer();
  return true;
};
STORY.acceptLoan = function(){
  G_STATE.loan={bal:DATA.TUNE.loanAmount, missed:0};
  G_STATE.cash+=DATA.TUNE.loanAmount;
  G_STATE.flags.loanTaken=true;
  SFX.play("chaching");
  STORY.copperTeleportPorch(()=>{
    STORY.copperSay("Pleasure doin' business, neighbor. I'll come by for my taste. Every. Day.",5000);
  });
  UI.hud();
};
STORY.copperTeleportPorch = function(fn){
  const c=STORY.copper, p=WORLD.anchors.porch;
  c.busy=true;
  c.setPos(p.x+1.5,p.z+1.5); c.face(Math.PI*0.75);
  fn&&fn();
  setTimeout(()=>{ c.setPos(c.home.x,c.home.z); c.face(Math.PI*0.85); c.busy=false; }, 6500);
};
STORY.loanDaily = function(){
  const L=G_STATE.loan; if(!L) return null;
  /* it COMPOUNDS now — the balance never used to move, so the debt could never
     spiral and the whole "with teeth" framing was a bluff */
  L.bal=Math.round(L.bal*(1+DATA.TUNE.loanInterest));
  if(G_STATE.cash>=DATA.TUNE.loanVig){
    G_STATE.cash-=DATA.TUNE.loanVig; G_STATE.ledger.spent+=DATA.TUNE.loanVig;
    return `🐍 Copperhead's taste: −${fmt$(DATA.TUNE.loanVig)}`;
  }
  L.missed++;
  if(L.missed>=DATA.TUNE.repoAt){
    L.missed=0;
    const installed=Object.keys(G_STATE.machines).filter(k=>G_STATE.machines[k]);
    if(installed.length){
      const key=installed[installed.length-1];
      G_STATE.machines[key]=false; G_STATE.owned[key]=false;
      if(ECON.machineMeshes[key]){ WORLD.scene.remove(ECON.machineMeshes[key]); delete ECON.machineMeshes[key]; }
      STORY.copperTeleportPorch(()=>STORY.copperSay(DATA.COPPERHEAD.loanRepo,5000));
      return `🚨 REPO! The cousins took your ${DATA.MACHINES[key].name}.`;
    }
    return "🚨 Copperhead's cousins found nothing worth taking. Yet.";
  }
  return `🐍 Missed the vig (${L.missed}/${DATA.TUNE.repoAt} strikes)`;
};
STORY.payLoan = function(){
  const L=G_STATE.loan; if(!L) return;
  if(G_STATE.cash>=L.bal){
    G_STATE.cash-=L.bal; G_STATE.ledger.spent+=L.bal;
    G_STATE.loan=null;
    STORY.copperTeleportPorch(()=>STORY.copperSay(DATA.COPPERHEAD.loanPaid,5000));
    toast("Loan PAID OFF. Your machines sleep safe.","gold",4000);
    UI.hud();
  } else toast("Not enough to clear it. ("+fmt$(L.bal)+")","bad");
};

/* ---------- festivals (fair → regional → worlds) ---------- */
STORY.FEST=FEST;
STORY.fairEntryList = function(){
  const list=[];
  G_STATE.taps.forEach((T,i)=>{ if(T.beer&&T.pints>=2) list.push({src:"tap"+i, label:`On tap: “${T.beer.name}” (${T.beer.tierName})`, beer:T.beer, take:()=>{T.pints-=2; if(T.pints<=0) PUB.kickKeg(i);} }); });
  ITEMS.list.forEach(it=>{ if(it.kind==="keg"&&it.data.state==="filled")
    list.push({src:"keg", label:`Keg: “${it.data.beer.name}” (${it.data.beer.tierName})`, beer:it.data.beer, take:()=>{ it.data.pints-=2; } }); });
  return list;
};
STORY.festJudge = function(type, beer){
  const F=FEST[type];
  const yours = beer.score*1.55 + rand(0,0.5) + (beer.legendary?0.8:0);
  const copper = F.copperScore();
  return { yours: Math.round(yours*10)/10, copper: Math.round(copper*10)/10, win: yours>copper, type };
};
STORY.festResult = function(res, beer){
  const F=FEST[res.type];
  if(res.type==="fair") G_STATE.flags.fairTries=(G_STATE.flags.fairTries||0)+1;
  G_STATE[F.dayKey]=G_STATE.day;
  if(res.win){
    G_STATE.flags[F.flagWon]=true;
    STORY.fame(F.fame, res.type);
    SFX.play("yay"); SFX.play("unfold");
    if(res.type==="fair"){
      spawnItem("trophy", 17.5, -4.9, {}).y=2.0;
      STORY.copperSay(DATA.COPPERHEAD.fairWin,5000);
      toast("🏆 COUNTY FAIR CHAMPION! The trophy lives on your bar now.","gold",6000);
    }
    if(res.type==="regional"){
      spawnItem("trophy", 16.2, -4.9, {}).y=2.0;
      STORY.copperSay(DATA.CH2.regionalWin,5000);
      toast("🏆 REGIONAL CUP CHAMPION — nine-year streak: ENDED.","gold",6000);
      /* hop-leaf confetti */
      for(let i=0;i<30;i++) setTimeout(()=>puff(MAIN.player.x+rand(-4,4), 6+rand(3), MAIN.player.z+rand(-4,4), pick([0x86b04c,0xe8a33d]), 0.2, -0.5, 2.5), i*80);
    }
    if(res.type==="world"){
      STORY.worldsFinale();
    }
    STORY.checkRank();
  } else {
    STORY.copperSay(res.type==="fair"?DATA.COPPERHEAD.fairLose: res.type==="regional"?DATA.CH2.regionalLoseClean:DATA.CH2.worldsLose,4500);
    toast("Lost by a whisker. It returns in a couple days — brew BETTER.","bad",5000);
    STORY.fame(res.type==="fair"?4:8,"showed up");
  }
};

/* ---------- the ending ---------- */
STORY.worldsFinale = function(){
  spawnItem("trophy", 14.9, -4.9, {}).y=2.0;
  for(let i=0;i<60;i++) setTimeout(()=>puff(MAIN.player.x+rand(-8,8), 7+rand(4), MAIN.player.z+rand(-8,8), pick([0x86b04c,0xe8a33d,0xffd98a]), 0.22, -0.5, 3), i*60);
  G_STATE.flags.jarLegal=true;
  WINGS.buildJerky();
  WINGS.checkHatUnlocks();
  /* Fable pass: the campaign's last scene happens ON YOUR PORCH, not from
     across the crick. He drives in one final time — no honk, for once — and
     says the thing the whole game was for. Then the truth about the jar.
     ⚠️ evict any ambient truck first: the old fallback attached the capstone
     bubble to a Copperhead whose position the OTHER truck's state machine
     still owned — it teleported him home mid-sentence, across the crick,
     the exact bug this scene exists to fix. */
  let drove=false;
  if(typeof WILD!=="undefined"){
    WILD.copeQueue.length=0;
    if(WILD.copeTruck){ WORLD.scene.remove(WILD.copeTruck.g); WILD.copeTruck=null; if(STORY.copper) STORY.copper.busy=false; }
    drove = WILD.copeDriveIn(DATA.CH2.worldsWin, 7000, 17);
  }
  if(!drove) STORY.copperSay(DATA.CH2.worldsWin,7000);
  STORY.at(8.5,()=>STORY.copperSay("That jar I left, first week? Weren't no charity. That was my best batch. Wanted to see what you'd DO with it.",7500));
  STORY.at(16,()=>toast(DATA.CH2.epilogue,"gold",7000));
  STORY.at(21,()=>UI.credits());
};

/* ---------- Hollow Joe hints ---------- */
STORY.joeHint = function(){
  const un=DATA.LEGENDARIES.filter(L=>L.hint && !G_STATE.discovered[L.key] && !G_STATE.hints[L.key]);
  if(!un.length){
    const partial=DATA.LEGENDARIES.filter(L=>L.hint && !G_STATE.discovered[L.key]);
    if(partial.length) return pick(partial).hint;
    return pick(DATA.JOE_LINES);
  }
  const L=pick(un);
  G_STATE.hints[L.key]=true;
  return L.hint;
};
