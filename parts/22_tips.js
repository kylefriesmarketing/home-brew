"use strict";
/* TIPS — the discoverability layer. Eight systems shipped after the day-2
   tutorial ends and NOTHING ever mentioned them; a new player could finish the
   campaign never finding the rocker or MawMaw's stand.
   Rules (learned the hard way on Age of Toys):
   - fire only when the board has just demonstrated WHY the thing exists
   - once each, ever (localStorage), with a lockout so they never stack
   - EVERY predicate wrapped in try/catch — a tip must never break a match
   - suppressed during the day-1/day-2 tutorial and inside menus/boil */

const TIPS = {
  seen:{}, lock:0, poll:0, KEY:"homebrew-tips-seen",
  LOCKOUT:45, POLL:3.5,
};

TIPS.load = function(){
  try{ TIPS.seen=JSON.parse(localStorage.getItem(TIPS.KEY)||"{}"); }catch(e){ TIPS.seen={}; }
};
TIPS.mark = function(id){
  TIPS.seen[id]=1;
  try{ localStorage.setItem(TIPS.KEY, JSON.stringify(TIPS.seen)); }catch(e){}
};

/* each: when() must be TRUE at the moment the lesson is obvious */
TIPS.LIST = [
  { id:"stand",
    when:g=> g.day>=3 && CYCLE.phase!=="night"
        && Object.values(g.stock).reduce((a,b)=>a+b,0)<=1 && !g.orders.length,
    txt:"🧺 Bare shelves and no truck comin'? MawMaw's farm stand is up by the road — costs more, but she's always open." },

  { id:"rocker",
    when:g=> g.day>=3 && (CYCLE.phase==="morning"||CYCLE.phase==="afternoon")
        && !BREW.boil && !g.ferms.some(f=>f.ready) && !g.open
        && CYCLE.phaseT>55,
    txt:"🪑 Nothin' to do but wait? Sit a spell on the porch rocker — the day rolls by seven times quicker." },

  { id:"mop",
    when:g=> (g.puddles||[]).length>=2 && (g.stats.mopped||0)===0,
    txt:"🧹 Sticky floors trip folks up. The mop's leanin' by the wash trough — carry it to a spill and press E." },

  { id:"brag",
    when:g=> Object.keys(g.brags||{}).length>=1,
    txt:"🏆 That plaque went up on the Brag Board over the bar. Walk to the end of the bar to read the whole wall." },

  { id:"bottler",
    when:g=> g.machines.bottler && CYCLE.phase==="night"
        && ITEMS.list.some(i=>i.kind==="keg"&&i.data.state==="filled"&&!i.carriedBy),
    txt:"🍾 Got a filled keg and it's late? Park it on the Bottling Line out back — it prints money while you sleep." },

  { id:"winter",
    when:()=> typeof SEASONS!=="undefined" && SEASONS.current==="winter",
    txt:"❄️ Winter bites the fire — heat drains faster in the kettle, so feed it harder. Fewer folks come out, too." },

  { id:"bob",
    when:()=> PUB.customers.some(c=>c.type==="bob"),
    txt:"📓 That's Barleycorn Bob. Whatever he drinks tonight, the whole holler reads about tomorrow — pour him your best." },

  { id:"joe",
    when:()=> PUB.customers.some(c=>c.type==="joe"),
    txt:"👃 Hollow Joe pays TRIPLE for cursed brews — and he mutters recipe secrets at the bar. Listen close." },

  { id:"garden",
    when:g=> g.rank>=1 && !g.machines.moppy && (g.stats.mopped||0)>=3,
    txt:"🤖 Tired of moppin'? Moppy the mop-roomba is in the catalog. He fears the porch step, but he works for free." },

  { id:"tribes",
    when:g=> (g.stats.brews||0)>=6 && Object.keys(g.discovered||{}).length===0,
    txt:"⭐ Some ingredient combos hide LEGENDARY beers. Cursed stuff counts double — try somethin' you'd never drink." },
];

TIPS.setup = function(){
  TIPS.load();
  /* a player who already knows the game shouldn't get lectured on load */
  TIPS.lock=20;
};

TIPS.update = function(dt){
  if(!G_STATE || !MAIN.started) return;
  if(MAIN.mode!=="walk" && MAIN.mode!=="fork") return;      // never over a menu or the boil
  if(G_STATE.day<=2) return;                                // the real tutorial owns days 1-2
  TIPS.lock-=dt;
  if(TIPS.lock>0) return;
  TIPS.poll-=dt;
  if(TIPS.poll>0) return;
  TIPS.poll=TIPS.POLL;
  for(const t of TIPS.LIST){
    if(TIPS.seen[t.id]) continue;
    let hit=false;
    try{ hit=!!t.when(G_STATE); }catch(e){ hit=false; }      // a bad predicate must never break the match
    if(!hit) continue;
    TIPS.mark(t.id);
    TIPS.lock=TIPS.LOCKOUT;
    toast(t.txt,"gold",6000);
    SFX.play("ding");
    return;
  }
};
