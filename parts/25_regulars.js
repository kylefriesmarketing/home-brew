"use strict";
/* REGULARS — the Fable pass. The pub served a stream of strangers: every local
   was "Local", nobody came back, nobody remembered. Six named souls now ride
   the existing archetype machinery — a regular IS a local/hiker/student with
   identity layered on, so appetites, requests and reputation all still apply.
   They remember their visits across days AND saves, develop a usual, and each
   carries a small three-beat story that only shows itself if they keep coming. */

const REGULARS = {
  fiddle:null,
  ROSTER:[
    { key:"earl", name:"Earl", base:"local", who:"retired miner",
      look:{skin:0xc98c5a, shirt:0x5a5a52, pants:0x4a4a42, hat:"trucker", belly:true},
      intro:"Earl. Thirty-one years in the Coppervale seam. You pour, I'll sit.",
      greets:["Evenin'. Same stool.","Still standin', this place. Good.","Don't mind me. Mind the beer."],
      beats:["Mine took my knees and my hearin'. Left my thirst, mercifully.",
             "Can't drink the dark ones no more. Tastes like the seam. No offense to yer stout.",
             "Fourteen boys never came up from Coppervale. I drink the first sip slow. That's for them."],
      chat:["hm.","*settles*","quiet night. good kind."] },
    { key:"maybelle", name:"Maybelle", base:"local", who:"mail carrier",
      look:{skin:0xe8b48c, shirt:0x5a6a9a, pants:0x4a4a42, accessory:"pack"},
      intro:"Maybelle. I carry the mail, which means I carry everything worth knowin'. One pint.",
      greets:["Route ends here now. On purpose.","You didn't hear NOTHIN' from me.","Evenin', sugar. What's fresh?"],
      beats:["Copperhead writes to a sister in Knoxville every week. Real careful handwritin'. Don't tell him I said.",
             "Found a letter in the dead-pile addressed to this property. 1961. Somebody up here was brewin' long before you.",
             "Twenty-two years on this route. It never felt short 'til it started endin' at your porch."],
      chat:["mm-HM.","the THINGS I could tell you","*sorts envelopes*"] },
    { key:"june", name:"June", base:"local", who:"fiddle player",
      look:{skin:0x8a5a3a, shirt:0x8a4a5a, pants:0x4a4a42, hat:"straw"},
      intro:"June. I play a little. If the beer's honest I might prove it.",
      greets:["Brought the fiddle. Just in case.","Evenin'. Room sounds right tonight.","Somethin' worth playin' about on tap?"],
      beats:["My granny played this mountain 'fore there was a road on it. Same fiddle. She's in the wood somewhere.",
             "I don't play for money. I play so the room remembers it was happy. Different trade.",
             "Wrote a reel last week. Callin' it the Home Brew. It's got a stumble in the middle — that's on purpose."],
      chat:["*hums*","*tunes a string*","la — no. LA. there it is."] },
    { key:"deacon", name:"Deacon", base:"hiker", who:"walks the ridge",
      look:{skin:0xe8b48c, shirt:0x4c7a4c, pants:0x5e402a, hat:"beanie", accessory:"pack"},
      intro:"Deacon. Walked down off the ridge. It'll keep.",
      greets:["The ridge says hello.","Down for the evenin'.","*nods*"],
      beats:["Folks ask what I'm lookin' for up there. Nothin'. That's the entire point.",
             "You can hear this place from the second switchback now. The talkin', the pourin'. Carries clean.",
             "Brought you a crick stone. Round as forty years of water could make it. Put it by the taps."],
      chat:["…","*looks out the window*","it'll rain Thursday."] },
    { key:"wren", name:"Wren", base:"student", who:"trail crew",
      look:{skin:0xf0c8a0, shirt:0xe8c23d, pants:0x4a4a6a, hat:"trucker"},
      intro:"Wren. Trail crew. I got seven dollars and I earned every one of 'em today.",
      greets:["cheapest GOOD one, please","crew got the switchback done!!","I'm SO tired. one beer."],
      beats:["Savin' for real boots. The waterproof kind. Four more paychecks.",
             "GOT THE BOOTS. Look at 'em. LOOK at them.",
             "They made me crew lead. First round's on me — for the whole room. Put it on my tab. My LEAD tab."],
      chat:["blister count: four","the NEW kid stepped in the crick","*falls asleep sitting up*"] },
    { key:"odell", name:"Odell", base:"hiker", who:"had a dog",
      look:{skin:0xc98c5a, shirt:0x5a8a8a, pants:0x5e402a},
      intro:"Odell. Used to walk this stretch with my dog Biscuit. Still walk it.",
      greets:["evenin'. just the one.","porch looks good in this light.","*waves at a bird*"],
      beats:["Biscuit's up past the bee tree. Best spot on the mountain. He'd have liked your porch.",
             "There's a stray been followin' me since the trailhead. I ain't feedin' her. …I'm feedin' her a little.",
             "Named the pup after yer beer. She answers to it and everything. Good name. Good beer."],
      chat:["*whistles low*","she's out there waitin' on me","good porch. good night."] },
  ],
};

REGULARS.state = function(key){
  if(!G_STATE.regulars) G_STATE.regulars={};                    // old saves
  return G_STATE.regulars[key] || (G_STATE.regulars[key]={v:0,last:-1,fav:null,sc:{},n:0,beat:0});
};

/* ---------- claiming: a fresh generic spawn becomes a regular ---------- */
REGULARS.claim = function(c){
  if(!G_STATE || CYCLE.phase!=="evening" || G_STATE.day<2) return;
  if(c.regular || c.def.special) return;
  const cands=REGULARS.ROSTER.filter(r=>r.base===c.type
    && REGULARS.state(r.key).last!==G_STATE.day
    && !PUB.customers.some(o=>o!==c && o.regular===r.key));
  if(!cands.length) return;
  const r=pick(cands);
  if(Math.random()>0.5) return;                                 // they have lives
  const s=REGULARS.state(r.key);
  s.v++; s.last=G_STATE.day;
  /* swap the anonymous rig for THEIR body, in place */
  const old=c.rig;
  WORLD.scene.remove(old.group);
  const rig=makePerson(Object.assign({size:1.0}, r.look));
  rig.ctype=c.type; rig.setPos(old.x, old.z); rig.facing=old.facing;
  WORLD.scene.add(rig.group);
  c.rig=rig; c.regular=r.key;
  c.def=Object.assign({}, c.def, {chat:r.chat});                // their voice, not the archetype's
  /* the greeting: first visit introduces, milestones deepen, otherwise familiar */
  let line=null, hold=3400;
  if(s.v===1) line=r.intro;
  else { const bi = s.v>=12?2 : s.v>=7?1 : s.v>=3?0 : -1;
    if(bi>=0 && s.beat<=bi){ s.beat=bi+1; line=r.beats[bi]; hold=6000; }
    else line=pick(r.greets);
  }
  if(line) setTimeout(()=>{ if(!c.dead) UI.bubbleRig(rig, `<span class="who">${r.name} · ${r.who}</span>“${line}”`, hold); }, rand(1200,2600));
  /* the USUAL: once known, seeing it on tap matters */
  if(s.fav){
    c.regularFav=s.fav;
    const on=G_STATE.taps.some(t=>t.beer && t.pints>0 && t.beer.style===s.fav);
    if(on) setTimeout(()=>{ if(!c.dead){
      UI.bubbleRig(rig, `<span class="who">${r.name}</span>“You kept my usual on. You KEPT it on.”`, 3200);
      STORY.fame(1.5,"a regular's usual");
    }}, 4600);
  }
};

/* ---------- memory: every pint teaches us their taste ---------- */
REGULARS.onDrink = function(c, beer){
  const r=REGULARS.ROSTER.find(x=>x.key===c.regular); if(!r) return;
  const s=REGULARS.state(c.regular);
  const w = beer.tier==="legend"?3 : beer.tier==="great"?2 : beer.tier==="good"?1 : beer.tier==="decent"?0.4 : 0;
  s.sc[beer.style]=(s.sc[beer.style]||0)+w; s.n++;
  if(s.n>=3 && !s.fav){
    let best=null,bv=-1; for(const k in s.sc) if(s.sc[k]>bv){ bv=s.sc[k]; best=k; }
    if(bv>0){ s.fav=best;
      const st=DATA.STYLES.find(x=>x.key===best);
      setTimeout(()=>{ if(!c.dead) UI.bubbleRig(c.rig,
        `<span class="who">${r.name}</span>“That ${st?st.name:best}… that's my one. That's the one I'll be wantin'.”`, 4200); }, 1600);
    }
  } else if(s.fav && beer.style===s.fav && w>=1){
    ECON.earn(1.5*c.def.tipMul, "tips");                        // the usual, poured right
  }
  /* June plays when the beer earns it */
  if(c.regular==="june" && w>=2 && !REGULARS.fiddle && G_STATE.flags.fiddleDay!==G_STATE.day){
    G_STATE.flags.fiddleDay=G_STATE.day;
    REGULARS.startFiddle(c);
  }
};

/* ---------- June's fiddle — the room holds still for it ---------- */
REGULARS.startFiddle = function(c){
  REGULARS.fiddle={t:16, c, note:0};
  toast("🎻 June's got the fiddle out. Nobody's leaving yet.","gold",3600);
  for(const o of PUB.customers){ if(!o.dead && o.state!=="leave" && o.state!=="road") o.patience=Math.max(o.patience,14); }
  STORY.fame(2,"June played");
};
REGULARS.update = function(dt){
  const F=REGULARS.fiddle; if(!F) return;
  F.t-=dt;
  const r=F.c && !F.c.dead ? F.c.rig : null;
  if(!r || F.t<=0){ REGULARS.fiddle=null; return; }
  F.note-=dt;
  if(F.note<=0){ F.note=0.45+Math.random()*0.35;
    SFX.play(Math.random()<0.7?"ding":"blip", r.x, r.z);
    puff(r.x+rand(-.3,.3), r.y+2.6, r.z+rand(-.3,.3), 0xffd98a, 0.1, 1.1, 0.9);
  }
};

/* intercept every spawn; generic evening walk-ins may be somebody we know */
(function(){
  const _spawn=PUB.spawnCustomer;
  PUB.spawnCustomer=function(type){
    const c=_spawn(type);
    try{ REGULARS.claim(c); }catch(e){}
    return c;
  };
})();
