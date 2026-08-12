"use strict";
/* TASTE — M3. Customers finally have appetites.
   Depends entirely on M2: before beers had a STYLE and a PURITY there was
   nothing for anyone to have an opinion about. Four mechanisms, cheapest first:
     · style preference   — every archetype likes and dislikes real styles
     · red/green requests — required condition + paid bonus (Potion Craft)
     · popularity decay   — the same style every night sags (Moonlighter)
     · class reputation   — per archetype, not per person (Recettear)
   All of it reads through PUB.appeal so the sim and the price tag can't drift. */

const TASTE = {};

/* ---------- popularity (per style, decays nightly) ---------- */
TASTE.pop = function(styleKey){
  if(!G_STATE || !G_STATE.pop) return 1;
  const fatigue=G_STATE.pop[styleKey]||0;
  return clamp(1-fatigue, DATA.POP.floor, DATA.POP.ceil);
};
TASTE.notePour = function(beer){
  if(!G_STATE.pop) G_STATE.pop={};
  const k=beer.style||"lager";
  G_STATE.pop[k]=clamp((G_STATE.pop[k]||0)+DATA.POP.perPint, 0, 1-DATA.POP.floor);
  /* every OTHER style recovers a little — variety is actively rewarded */
  for(const s in G_STATE.pop) if(s!==k) G_STATE.pop[s]=Math.max(0,G_STATE.pop[s]-DATA.POP.perPint*0.25);
};
TASTE.decayDay = function(){
  if(!G_STATE.pop) return;
  for(const s in G_STATE.pop) G_STATE.pop[s]=Math.max(0, G_STATE.pop[s]-DATA.POP.decayPerDay);
};

/* ---------- reputation (per archetype) ---------- */
TASTE.rep = function(type){ return (G_STATE && G_STATE.rep && G_STATE.rep[type]) || 0; };
TASTE.noteRep = function(type, delta){
  if(!G_STATE.rep) G_STATE.rep={};
  G_STATE.rep[type]=clamp((G_STATE.rep[type]||0)+delta, 0, DATA.REP.max);
};
/* each level adds to what that class will spend */
TASTE.walletMul = function(type){ return 1 + TASTE.rep(type)*DATA.REP.budgetPerLevel; };

/* ---------- style preference ---------- */
TASTE.styleMod = function(beer, type){
  const def=DATA.CUSTOMERS[type]; if(!def || !beer) return 0;
  if(def.purist) return ((beer.purity||0)-0.85)*6;      // Bob judges the RATIO
  const st=beer.style;
  if(def.likes && def.likes.includes(st)) return 1.5;
  if(def.dislikes && def.dislikes.includes(st)) return -1.9;
  return 0;
};

/* ---------- requests ---------- */
TASTE.rollRequest = function(type){
  const def=DATA.CUSTOMERS[type]||{};
  if(!(Math.random() < (def.req===undefined?0.3:def.req))) return null;
  const red=pick(DATA.REQUESTS.red);
  const green=Math.random()<0.5 ? pick(DATA.REQUESTS.green) : null;
  return { red, green };
};
TASTE.meetsRed = function(beer, req){
  if(!req || !req.red) return true;
  try{ return !!req.red.test(beer); }catch(e){ return true; }
};
TASTE.greenPay = function(beer, req){
  if(!req || !req.green) return 0;
  try{ return req.green.test(beer) ? req.green.pay : 0; }catch(e){ return 0; }
};
TASTE.requestText = function(req){
  if(!req) return null;
  return req.green ? `${req.red.txt} — ${req.green.txt}` : req.red.txt;
};

/* ---------- daily hook ---------- */
BUS.on("newday", ()=>{ if(G_STATE) TASTE.decayDay(); });
