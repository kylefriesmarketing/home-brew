"use strict";
/* UI — chalkboard HUD, overlays, bubbles, gauges, the paper catalog */

const UI = {
  overlay:null, bubbles:[], sleepStep:null, lastHud:"", cart:[],
};

/* ---------- overlay plumbing ---------- */
UI.open = function(html, cls=""){
  UI.closeNow();
  const o=document.createElement("div");
  o.className="overlay"; o.innerHTML=`<div class="board tape panel ${cls}">${html}</div>`;
  $("overlays").appendChild(o);
  UI.overlay=o;
  MAIN.mode="ui";
  return o;
};
UI.closeNow = function(){
  if(UI.overlay){ UI.overlay.remove(); UI.overlay=null; }
};
UI.close = function(){
  UI.closeNow();
  MAIN.mode="walk";
};
UI.key = function(e){
  if(e.code==="Escape" && UI.overlay && !UI.sleepLock) UI.close();
};
UI.escape = function(){
  if(UI.overlay){ if(!UI.sleepLock) UI.close(); return; }
  UI.pause();
};

/* ---------- setup + title ---------- */
UI.setup = function(){
  $("titletag").textContent=pick(DATA.TAGLINES);
  const has=CYCLE.hasSave();
  if(has){
    $("bt-continue").style.display="inline-block";
    try{ $("bt-day").textContent=JSON.parse(localStorage.getItem("mybrew-save-v1")).G.day; }catch(e){}
  }
  $("title").style.display="flex";
  $("bt-new").onclick=()=>{ try{localStorage.removeItem("mybrew-save-v1");}catch(e){} SFX.init(); MAIN.startGame(true); };
  $("bt-continue").onclick=()=>{ SFX.init(); MAIN.startGame(false); };
  $("bt-how").onclick=()=>UI.howto(true);
  addEventListener("keydown", e=>{
    if(e.code==="KeyB" && MAIN.started && MAIN.mode==="walk") UI.brewBook();
  });
};

UI.howto = function(fromTitle){
  const o=UI.open(`<h1>How to run a brewery</h1>
  <div class="sub">…with your own two clay hands</div><hr class="chalkline">
  <p><kbd>WASD</kbd> walk &nbsp; <kbd>Shift</kbd> hustle &nbsp; <kbd>E</kbd> / <kbd>click</kbd> do the thing &nbsp; <kbd>Q</kbd> drop (<kbd>Shift-Q</kbd> yeet)</p>
  <p><kbd>R</kbd>/<kbd>F</kbd> forklift forks &nbsp; <kbd>B</kbd> brew book &nbsp; <kbd>M</kbd> mute &nbsp; <kbd>Esc</kbd> pause</p>
  <hr class="chalkline">
  <p>🍺 <b>The loop:</b> water in kettle → barley + weird stuff → FIRE IT UP (hold the needles in the green: <kbd>F</kbd> fire, <kbd>Space</kbd> vent, <kbd>S</kbd> stir) → wort to fermenter → sleep → keg it → tap it → price it → flip OPEN at dusk → get rich, get famous.</p>
  <p>🐍 The moonshiner across the crick does not believe in you.</p>
  <div style="text-align:center;margin-top:10px"><span class="btn" id="how-ok">Got it</span></div>`);
  o.querySelector("#how-ok").onclick=()=>{ if(fromTitle&&!MAIN.started){ UI.closeNow(); MAIN.mode="walk"; $("title").style.display="flex"; } else UI.close(); };
};

/* ---------- HUD ---------- */
UI.hud = function(){
  if(!G_STATE) return;
  $("hud-cash").textContent=fmt$(G_STATE.cash);
  const R=DATA.RANKS[G_STATE.rank], N=DATA.RANKS[G_STATE.rank+1];
  const prog = N? clamp((G_STATE.fame-R.at)/(N.at-R.at),0,1) : 1;
  const stars="★".repeat(Math.round(prog*5)).padEnd(5,"☆");
  $("hud-fame").innerHTML=`<span class="rank">${R.name}</span><br><span class="stars">${stars}</span>`;
  const L=$("hud-loan");
  if(G_STATE.loan){ L.style.display="block"; L.textContent=`🐍 loan ${fmt$(G_STATE.loan.bal)}`; }
  else L.style.display="none";
};
UI.hudClock = function(){
  const ph=CYCLE.phase;
  const icons={morning:"🌄",afternoon:"☀️",evening:"🌆",night:"🌙"};
  const txt=`Day ${G_STATE.day} · <span class="ph">${icons[ph]} ${ph[0].toUpperCase()+ph.slice(1)}</span>`;
  if(UI.lastHud!==txt){ $("hud-day").innerHTML=txt; UI.lastHud=txt; }
};

/* ---------- objectives ---------- */
UI.renderObjectives = function(){
  const box=$("objectives"); box.innerHTML="";
  for(const o of CYCLE.objectives){
    const d=document.createElement("div");
    d.className="obj"+(o.done?" done":"");
    d.textContent=o.txt;
    box.appendChild(d);
  }
};

/* ---------- speech bubbles ---------- */
UI.bubbleRig = function(rig, html, ms=2500){
  const el=document.createElement("div");
  el.className="bubble"; el.innerHTML=html;
  $("bubbles").appendChild(el);
  UI.bubbles.push({el, rig, until:performance.now()+ms});
};
UI.update = function(dt){
  const now=performance.now();
  const v=new THREE.Vector3();
  for(let i=UI.bubbles.length-1;i>=0;i--){
    const b=UI.bubbles[i];
    if(now>b.until || !b.rig.group.parent){ b.el.remove(); UI.bubbles.splice(i,1); continue; }
    v.set(b.rig.x, b.rig.y+3.1, b.rig.z).project(WORLD.camera);
    if(v.z>1){ b.el.style.opacity=0; continue; }
    b.el.style.opacity=1;
    b.el.style.left=((v.x*0.5+0.5)*innerWidth)+"px";
    b.el.style.top=((-v.y*0.5+0.5)*innerHeight)+"px";
  }
};

/* ---------- pantry ---------- */
UI.pantry = function(){
  const types=Object.keys(G_STATE.stock).filter(k=>G_STATE.stock[k]>0);
  const rows = types.length? types.map(t=>{
    const d=DATA.INGREDIENTS[t];
    return `<div class="row"><span class="nm">${d.cursed?"☠️ ":""}${d.name}</span><span class="qty">×${G_STATE.stock[t]}</span><span class="btn small clickable" data-take="${t}">grab</span></div>`;
  }).join("") : `<p class="sub">Bare shelves. Order supplies at the mailbox (or in bed).</p>`;
  const o=UI.open(`<h1>🧺 Pantry</h1><div class="sub">one in the hands is worth two on the shelf</div><hr class="chalkline">${rows}
    <div style="text-align:center;margin-top:8px"><span class="btn red" id="pt-x">close</span></div>`);
  o.querySelectorAll("[data-take]").forEach(b=>b.onclick=()=>{ UI.close(); ECON.takeIngredient(b.dataset.take); });
  o.querySelector("#pt-x").onclick=()=>UI.close();
};

/* ---------- catalog ---------- */
UI.catalog = function(sleepMode){
  UI.cart=[];
  const render=()=>{
    const ing=Object.keys(DATA.INGREDIENTS).filter(k=>!DATA.INGREDIENTS[k].secret).map(k=>{
      const d=DATA.INGREDIENTS[k];
      return `<div class="row"><span class="nm">${d.cursed?"☠️ ":""}${d.name} <span class="sub">${"·".repeat(1)} s${d.s} b${d.b} f${d.f} w${d.w}</span></span><span class="pr">$${d.cost}</span><span class="btn small clickable" data-add="ing:${k}">+1</span></div>`;
    }).join("");
    const gear=`<div class="row"><span class="nm">Fresh Keg</span><span class="pr">$${DATA.TUNE.kegCost}</span><span class="btn small clickable" data-add="keg:keg">+1</span></div>
      <div class="row"><span class="nm">Tin Bucket</span><span class="pr">$6</span><span class="btn small clickable" data-add="bucket:bucket">+1</span></div>`;
    const mach=Object.keys(DATA.MACHINES).map(k=>{
      const m=DATA.MACHINES[k];
      const owned=G_STATE.owned[k]||G_STATE.machines[k];
      const locked=m.rank>G_STATE.rank || (m.needsWing && !G_STATE.wings[m.needsWing]);
      const lockTxt=m.rank>G_STATE.rank? `rank ${m.rank+1}` : m.needsWing&&!G_STATE.wings[m.needsWing]? m.needsWing+" first" : "";
      const btn=owned?`<span class="btn small dim">${m.staff?"hired":"owned"}</span>`:locked?`<span class="btn small dim">${lockTxt}</span>`:`<span class="btn small clickable" data-add="machine:${k}">${m.staff?"hire":"buy"}</span>`;
      return `<div class="row"><span class="nm">${m.staff?"🧑‍🔧":"🔧"} ${m.name} <span class="sub">${m.desc}</span></span><span class="pr">$${m.cost}</span>${btn}</div>`;
    }).join("");
    const giftSec = G_STATE.wings.gift ? `<h2>Gift Shop stock</h2>
      <div class="row"><span class="nm">Airbrushed Tees <span class="sub">sell $18</span></span><span class="pr">$8</span><span class="btn small clickable" data-add="gift:tee">+1</span></div>
      <div class="row"><span class="nm">Snowglobes <span class="sub">sell $14</span></span><span class="pr">$6</span><span class="btn small clickable" data-add="gift:globe">+1</span></div>
      <div class="row"><span class="nm">Plush Bears <span class="sub">sell $22</span></span><span class="pr">$10</span><span class="btn small clickable" data-add="gift:plush">+1</span></div>` : "";
    const cart=UI.cart.length? UI.cart.map((l,i)=>`<div class="row"><span class="nm">${l.label}</span><span class="pr">$${l.cost}</span><span class="btn small red clickable" data-rm="${i}">×</span></div>`).join("") : `<p class="sub">cart's empty</p>`;
    const total=UI.cart.reduce((a,l)=>a+l.cost,0);
    return `<h1>📖 Supply Catalog</h1><div class="sub">licked thumb, dog-eared pages — truck comes at dawn</div>
      <hr class="chalkline"><h2>Ingredients</h2>${ing}<h2>Gear</h2>${gear}${giftSec}<h2>Machines & Staff <span class="sub">(machines installed by YOU, via forklift)</span></h2>${mach}
      <hr class="chalkline"><h2>🛒 Cart — total $${total} <span class="sub">(you have ${fmt$(G_STATE.cash)})</span></h2>${cart}
      <div style="text-align:center;margin-top:10px">
        <span class="btn clickable" id="cat-ok">${UI.cart.length?"Place order":"—"}</span>
        <span class="btn red clickable" id="cat-x">${sleepMode?"😴 Good night":"close"}</span>
      </div>`;
  };
  const o=UI.open(render());
  const wire=()=>{
    o.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{
      const [kind,key]=b.dataset.add.split(":");
      if(kind==="ing") UI.cart.push({kind,key,qty:1,cost:DATA.INGREDIENTS[key].cost,label:DATA.INGREDIENTS[key].name});
      if(kind==="keg") UI.cart.push({kind:"keg",key:"keg",qty:1,cost:DATA.TUNE.kegCost,label:"Fresh Keg"});
      if(kind==="bucket") UI.cart.push({kind:"bucket",key:"bucket",qty:1,cost:6,label:"Tin Bucket"});
      if(kind==="gift") UI.cart.push({kind:"gift",key,qty:1,cost:{tee:8,globe:6,plush:10}[key],label:"Gift: "+key});
      if(kind==="machine") UI.cart.push({kind:"machine",key,qty:1,cost:DATA.MACHINES[key].cost,label:DATA.MACHINES[key].name});
      o.querySelector(".panel").innerHTML=render.call ? render() : render; wire();
    });
    o.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{ UI.cart.splice(+b.dataset.rm,1); o.querySelector(".panel").innerHTML=render(); wire(); });
    o.querySelector("#cat-ok").onclick=()=>{
      if(!UI.cart.length) return;
      if(ECON.placeOrder(UI.cart)){ UI.cart=[]; o.querySelector(".panel").innerHTML=render(); wire(); }
    };
    o.querySelector("#cat-x").onclick=()=>{
      if(sleepMode){ UI.goodnight(); } else UI.close();
    };
  };
  wire();
};

/* ---------- price dialog ---------- */
UI.priceDialog = function(i){
  const T=G_STATE.taps[i];
  const render=()=>{
    const sass = T.price<=T.beer.suggest*0.6? "practically charity" :
      T.price<=T.beer.suggest*1.15? "fair mountain price" :
      T.price<=T.beer.suggest*1.8? "tourist pricing 👀" : "highway robbery (they WILL notice)";
    return `<h1>🏷️ “${T.beer.name}”</h1>
      <div class="sub">${T.beer.tierName} · suggested $${T.beer.suggest}</div><hr class="chalkline">
      <div style="text-align:center;font-size:40px;margin:8px"><span class="btn clickable" id="pm">−</span>
      <span class="pricetag" style="font-size:34px;margin:0 14px">$${T.price}</span>
      <span class="btn clickable" id="pp">+</span></div>
      <p style="text-align:center" class="sub">${sass}</p>
      <div style="text-align:center"><span class="btn clickable" id="pd-ok">nail it to the tap</span></div>`;
  };
  const o=UI.open(render());
  const wire=()=>{
    o.querySelector("#pm").onclick=()=>{ T.price=Math.max(0.5,Math.round((T.price-0.5)*2)/2); o.querySelector(".panel").innerHTML=render(); wire(); };
    o.querySelector("#pp").onclick=()=>{ T.price=Math.min(25,Math.round((T.price+0.5)*2)/2); o.querySelector(".panel").innerHTML=render(); wire(); };
    o.querySelector("#pd-ok").onclick=()=>{ UI.close(); CYCLE.obj("price"); toast(`$${T.price} it is.`,"",1200); };
  };
  wire();
};

/* ---------- water choice (pipes) ---------- */
UI.waterChoice = function(){
  const o=UI.open(`<h1>💧 Fill with…</h1><hr class="chalkline">
    <div style="display:flex;gap:14px;justify-content:center;margin:12px">
      <span class="btn clickable" id="w-hose">Garden Hose (cap: Decent)</span>
      <span class="btn clickable" id="w-spring">Piped Spring (cap: Great)</span>
    </div>`);
  o.querySelector("#w-hose").onclick=()=>{ UI.close(); BREW.startHose("hose"); };
  o.querySelector("#w-spring").onclick=()=>{ UI.close(); BREW.startHose("spring"); };
};

/* ---------- boil gauges ---------- */
UI.drawBand = function(cv, lo, hi){
  const g=cv.getContext("2d");
  g.clearRect(0,0,130,74);
  const cx=65, cy=74, r=58;
  const a=v=>Math.PI + v*Math.PI;
  g.beginPath(); g.strokeStyle="rgba(76,122,76,.9)"; g.lineWidth=16;
  g.arc(cx,cy,r,a(lo),a(hi)); g.stroke();
  g.beginPath(); g.strokeStyle="rgba(36,29,20,.25)"; g.lineWidth=3;
  for(let v=0;v<=1.01;v+=0.125){ const x=cx+Math.cos(a(v))*r, y=cy+Math.sin(a(v))*r;
    g.moveTo(cx+Math.cos(a(v))*(r-10), cy+Math.sin(a(v))*(r-10)); g.lineTo(x,y); }
  g.stroke();
};
UI.boilStart = function(b){
  $("boilui").style.display="flex";
  $("boiltimer").style.display="block";
  $("stirwrap").style.display=G_STATE.machines.whirlybird?"none":"block";
  UI.drawBand($("heatband"), b.bandH[0], b.bandH[1]);
  UI.drawBand($("presband"), b.bandP[0], b.bandP[1]);
};
UI.boilFrame = function(b){
  $("heatneedle").style.transform=`rotate(${-90+b.heat*180}deg)`;
  $("presneedle").style.transform=`rotate(${-90+b.pres*180}deg)`;
  $("stirfill").style.width=(b.stir*100)+"%";
  $("stirfill").style.background=b.stir>0.4?"var(--green)":"var(--red)";
  $("boiltimer").textContent=`${Math.ceil(b.dur-b.t)}s — quality brewing: ${Math.round(b.good/(b.dur*0.62)*100)}%`;
  const ev=$("boilevent");
  if(b.eventNow){
    ev.style.display="block";
    ev.textContent = b.eventNow.type==="foam"? `🫧 FOAM-OVER! MASH [S] ×${b.eventNow.mash}` :
      b.eventNow.type==="bee"? "🐝 BEE. STAY CALM." : "🪵 FLOATIES! VENT!";
  } else ev.style.display="none";
};
UI.boilEnd = function(){
  $("boilui").style.display="none"; $("boilevent").style.display="none"; $("boiltimer").style.display="none";
};

/* ---------- sleep sequence ---------- */
UI.sleepSeq = function(){
  const lines=CYCLE.tallyLines().map(l=>`<div class="row"><span class="nm">${l[0]}</span><span class="pr">${l[1]}</span></div>`).join("");
  const bob = G_STATE.day%3===0? `<p class="sub" style="margin-top:8px">${pick(DATA.BOB)}</p>` : "";
  const loanBtn = G_STATE.loan && G_STATE.cash>=G_STATE.loan.bal ?
    `<div style="text-align:center;margin:6px"><span class="btn clickable" id="sl-loan">🐍 Pay off the loan (${fmt$(G_STATE.loan.bal)})</span></div>` : "";
  const o=UI.open(`<h1>🕯️ Day ${G_STATE.day} — the ledger</h1><hr class="chalkline">${lines}${bob}${loanBtn}
    <div style="text-align:center;margin-top:12px"><span class="btn clickable" id="sl-cat">📖 Order supplies</span>
    <span class="btn clickable" id="sl-zz">😴 Straight to sleep</span></div>`);
  UI.sleepLock=true;
  if(o.querySelector("#sl-loan")) o.querySelector("#sl-loan").onclick=()=>{ STORY.payLoan(); UI.sleepSeq(); };
  o.querySelector("#sl-cat").onclick=()=>{ UI.catalog(true); UI.sleepLock=true; };
  o.querySelector("#sl-zz").onclick=()=>UI.goodnight();
};
UI.goodnight = function(){
  UI.closeNow();
  UI.sleepLock=false;
  MAIN.mode="sleep";
  SFX.play("snore");
  $("fade").style.opacity=1;
  setTimeout(()=>{
    CYCLE.finishSleep();
    MAIN.mode="walk";
    setTimeout(()=>{ $("fade").style.opacity=0; },300);
  },1100);
};

/* ---------- loan offer ---------- */
UI.loanOffer = function(){
  const o=UI.open(`<h1>🐍 A visitor on the porch</h1><hr class="chalkline">
    <p><i>Copperhead leans on your rail, jar of cash in hand.</i></p>
    <p>“${DATA.COPPERHEAD.loanOffer}”</p>
    <p class="sub">$${DATA.TUNE.loanAmount} now · ${fmt$(DATA.TUNE.loanVig)}/day vig · miss ${DATA.TUNE.repoAt} and his cousins take a MACHINE</p>
    <div style="text-align:center;margin-top:10px">
      <span class="btn clickable" id="ln-yes">🤝 Take the jar money</span>
      <span class="btn red clickable" id="ln-no">Starve with dignity</span>
    </div>`);
  UI.sleepLock=true;
  o.querySelector("#ln-yes").onclick=()=>{ UI.sleepLock=false; UI.close(); STORY.acceptLoan(); };
  o.querySelector("#ln-no").onclick=()=>{ UI.sleepLock=false; UI.close(); G_STATE.flags.loanOffered=false; toast("Respect. The hose is free, at least.","",3000); };
};

/* ---------- festivals (fair / regional / worlds) ---------- */
UI.festival = function(type){
  const F=STORY.FEST[type];
  const entries=STORY.fairEntryList();
  if(!entries.length){
    toast(`${F.title} came calling but you've got NO beer ready. Next time.`,"bad",4500);
    G_STATE[F.dayKey]=G_STATE.day;
    return;
  }
  const rows=entries.map((e,i)=>`<div class="row"><span class="nm">${e.label}</span><span class="btn small clickable" data-e="${i}">enter this</span></div>`).join("");
  const cheatNote = type==="regional" ? `<p class="sub">⚠️ rumor says the champ plays DIRTY. A backup entry wouldn't hurt.</p>` :
    type==="world" ? `<p class="sub">winner takes the WORLD. no pressure.</p>` : "";
  const o=UI.open(`<h1>${F.title}</h1><div class="sub">three judges, one ribbon, and Copperhead's smug face</div>
    <hr class="chalkline">${rows}${cheatNote}
    <div style="text-align:center;margin-top:8px"><span class="btn red clickable" id="fr-x">not today</span></div>`);
  UI.sleepLock=true;
  o.querySelector("#fr-x").onclick=()=>{ UI.sleepLock=false; UI.close(); G_STATE[F.dayKey]=G_STATE.day; };
  o.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>{
    const e=entries[+b.dataset.e];
    e.take();
    UI.festJudging(type, e.beer);
  });
};
UI.fair = ()=>UI.festival("fair");

UI.festJudging = function(type, beer, wasSwapped){
  const F=STORY.FEST[type];
  const res=STORY.festJudge(type, beer);
  if(wasSwapped) res.swappedIn=true;
  const judges= type==="world" ? [["🌍","Le Juge Suprême"],["👵","Granny Pearl"],["🧔","The Beer Baron"]] :
    [["🎩","Mayor Tibbs"],["👵","Granny Pearl"],["🧑‍🌾","Farmer Dell"]];
  const jr=judges.map((j,i)=>`<div class="judge"><span class="face" id="jf${i}">${j[0]}</span><div class="jm"><div class="sub">${j[1]}</div><div class="meter"><i id="jm${i}"></i></div></div></div>`).join("");
  const o=UI.open(`<h1>${F.title}: “${beer.name}”</h1><hr class="chalkline">${jr}
    <div class="row"><span class="nm">YOU</span><span class="pr" id="ys">…</span></div>
    <div class="row"><span class="nm">🐍 “${F.copperBeer}”</span><span class="pr" id="cs">…</span></div>
    <div style="text-align:center;margin-top:10px"><span class="btn clickable dim" id="fr-ok">…judging…</span></div>`);
  UI.sleepLock=true;
  const sipDelay=type==="world"?1200:900;
  judges.forEach((j,i)=>{
    setTimeout(()=>{
      SFX.play("gulp");
      const el=o.querySelector("#jm"+i);
      el.style.width=clamp(res.yours/9*100,4,100)+"%";
      const f=o.querySelector("#jf"+i);
      if(res.yours>6.2) f.textContent="🤩"; else if(res.yours>4.5) f.textContent="😋"; else if(res.yours>3) f.textContent="🙂"; else f.textContent="😬";
    }, 700+i*sipDelay);
  });
  const revealAt=700+3*sipDelay+500;

  /* THE REGIONAL CHEAT: between sips and reveal, your keg gets swapped */
  if(type==="regional" && F.cheat && !wasSwapped){
    setTimeout(()=>{
      SFX.play("ew"); shake(0.5);
      const backups=STORY.fairEntryList();
      const swapBtns = backups.length?
        `<span class="btn clickable" id="ch-swap">🔄 Swap in your backup (${backups[0].beer.name})</span>` : "";
      o.querySelector(".panel").innerHTML=`<h1>🚨 YOUR KEG'S BEEN SWAPPED!</h1>
        <div class="sub">that snake — the judges are about to drink DITCH WATER with your name on it</div><hr class="chalkline">
        <p>${DATA.CH2.regionalCheat}</p>
        <div style="display:flex;flex-direction:column;gap:10px;align-items:center;margin-top:10px">
          ${swapBtns}
          <span class="btn clickable" id="ch-expose">📣 EXPOSE HIM — Ranger Dot saw everything</span>
          <span class="btn red clickable" id="ch-press">😤 Press on with whatever's in that keg</span>
        </div>`;
      const sw=o.querySelector("#ch-swap");
      if(sw) sw.onclick=()=>{ const b=backups[0]; b.take(); UI.festJudging("regional", b.beer, true); };
      o.querySelector("#ch-expose").onclick=()=>{
        const r2={yours:res.yours, copper:"DQ", win:true, type:"regional", exposed:true};
        UI.festReveal(o, r2, beer, F);
      };
      o.querySelector("#ch-press").onclick=()=>{
        const r2={yours:Math.round(res.yours*0.55*10)/10, copper:res.copper, type:"regional"};
        r2.win=r2.yours>r2.copper;
        UI.festReveal(o, r2, beer, F, true);
      };
    }, revealAt-200);
    return;
  }
  setTimeout(()=>UI.festReveal(o, res, beer, F), revealAt);
};

UI.festReveal = function(o, res, beer, F, rebuilt){
  if(rebuilt || res.exposed){
    o.querySelector(".panel").innerHTML=`<h1>${F.title}</h1><hr class="chalkline">
      <div class="row"><span class="nm">YOU</span><span class="pr" id="ys">…</span></div>
      <div class="row"><span class="nm">🐍 “${F.copperBeer}”</span><span class="pr" id="cs">…</span></div>
      <div style="text-align:center;margin-top:10px"><span class="btn clickable dim" id="fr-ok">…judging…</span></div>`;
  }
  o.querySelector("#ys").textContent=res.yours;
  o.querySelector("#cs").textContent=res.copper;
  SFX.play(res.win?"yay":"ew");
  const ok=o.querySelector("#fr-ok");
  ok.classList.remove("dim");
  ok.textContent=res.win? (res.exposed?"📣 JUSTICE (and a ribbon)":"🏆 TAKE THE RIBBON") : "…next time";
  ok.onclick=()=>{ UI.sleepLock=false; UI.close(); STORY.festResult(res, beer); };
};

/* ---------- kitchen dish picker ---------- */
UI.dishPick = function(){
  const rows=Object.keys(DATA.DISHES).map(k=>{
    const d=DATA.DISHES[k];
    return `<div class="row"><span class="nm">${d.name} <span class="sub">pairs w/ ${d.pairName} · sells $${d.sell}</span></span><span class="pr">$${d.cost}</span><span class="btn small clickable" data-d="${k}">cook</span></div>`;
  }).join("");
  const o=UI.open(`<h1>🍳 The Fryer</h1><div class="sub">it contains multitudes (watch for the DING — pull it before it burns!)</div>
    <hr class="chalkline">${rows}
    <div style="text-align:center;margin-top:8px"><span class="btn red clickable" id="dp-x">close</span></div>`);
  o.querySelector("#dp-x").onclick=()=>UI.close();
  o.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{
    const k=b.dataset.d;
    if(!ECON.pay(DATA.DISHES[k].cost,"cooking")) return;
    WINGS.cooking={dish:k, t:0, state:"cooking"};
    SFX.play("sizzle",WORLD.anchors.fryer.x,WORLD.anchors.fryer.z);
    UI.close();
  });
};

/* ---------- hat shop ---------- */
UI.hatShop = function(){
  const rows=Object.keys(DATA.HATS).map(k=>{
    const h=DATA.HATS[k];
    const owned=G_STATE.hatsOwned.includes(k);
    const worn=G_STATE.hat===k;
    let btn;
    if(worn) btn=`<span class="btn small clickable" data-off="1">doff</span>`;
    else if(owned) btn=`<span class="btn small clickable" data-wear="${k}">wear</span>`;
    else if(h.how==="buy") btn=`<span class="btn small clickable" data-buy="${k}">$${h.cost}</span>`;
    else btn=`<span class="btn small dim">🔒 ${h.desc}</span>`;
    return `<div class="row"><span class="nm">${worn?"👑 ":""}${h.name} <span class="sub">${owned?h.desc:""}</span></span>${btn}</div>`;
  }).join("");
  const o=UI.open(`<h1>🎩 The Hat Rack</h1><div class="sub">a brewery is only as good as its headwear</div>
    <hr class="chalkline">${rows}
    <div style="text-align:center;margin-top:8px"><span class="btn red clickable" id="hs-x">close</span></div>`);
  o.querySelector("#hs-x").onclick=()=>UI.close();
  o.querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>{
    const k=b.dataset.buy;
    if(!ECON.pay(DATA.HATS[k].cost,"hat")) return;
    G_STATE.hatsOwned.push(k); WINGS.wearHat(k);
    SFX.play("chaching"); UI.hatShop();
  });
  o.querySelectorAll("[data-wear]").forEach(b=>b.onclick=()=>{ WINGS.wearHat(b.dataset.wear); SFX.play("boing"); UI.hatShop(); });
  o.querySelectorAll("[data-off]").forEach(b=>b.onclick=()=>{ WINGS.wearHat(null); UI.hatShop(); });
};

/* ---------- credits ---------- */
UI.credits = function(){
  const s=G_STATE.stats;
  const o=UI.open(`<h1>👑 BEST BREWERY IN THE WORLD</h1>
    <div class="sub">one dirtbag · one hose · one dream — realized</div><hr class="chalkline">
    <p style="text-align:center;font-size:18px">HOME BREW</p>
    <p style="text-align:center" class="sub">a Dirty Boy Devs joint · The Room</p>
    <hr class="chalkline">
    <div class="row"><span class="nm">Days on the mountain</span><span class="pr">${G_STATE.day}</span></div>
    <div class="row"><span class="nm">Batches brewed</span><span class="pr">${s.brews||0}</span></div>
    <div class="row"><span class="nm">Pints served</span><span class="pr">${s.served||0}</span></div>
    <div class="row"><span class="nm">Legendaries discovered</span><span class="pr">${Object.keys(G_STATE.discovered).length}/${DATA.LEGENDARIES.length}</span></div>
    <div class="row"><span class="nm">Ficus incidents</span><span class="pr">${s.ficus||0}</span></div>
    <hr class="chalkline">
    <p class="sub" style="text-align:center">the mountain keeps going. so do you. (endless sandbox unlocked — brew weird.)</p>
    <div style="text-align:center;margin-top:10px"><span class="btn clickable" id="cr-x">🍺 Back to the brewery</span></div>`);
  UI.sleepLock=true;
  o.querySelector("#cr-x").onclick=()=>{ UI.sleepLock=false; UI.close(); };
};

/* ---------- rank banner ---------- */
UI.rankBanner = function(name){
  const d=document.createElement("div");
  d.className="toast gold";
  d.style.fontSize="26px";
  d.innerHTML=`⭐ RANK UP ⭐<br>${name}`;
  $("toasts").appendChild(d);
  setTimeout(()=>{ d.style.transition="opacity .6s"; d.style.opacity=0; setTimeout(()=>d.remove(),650); },4200);
};

/* ---------- brew book ---------- */
UI.brewBook = function(){
  const rows=DATA.LEGENDARIES.map(L=>{
    if(G_STATE.discovered[L.key]) return `<div class="row"><span class="nm">⭐ ${L.name}</span><span class="sub">${L.wild?"the jar decides":(L.ing.join(" + ")+(L.water?" · "+DATA.WATERS[L.water].name:""))}</span></div>`;
    if(G_STATE.hints[L.key]) return `<div class="row"><span class="nm">❓ ???</span><span class="sub" style="max-width:340px">“${L.hint}”</span></div>`;
    return `<div class="row"><span class="nm">❓ ???</span><span class="sub">Hollow Joe might know…</span></div>`;
  }).join("");
  const s=G_STATE.stats;
  const o=UI.open(`<h1>📕 The Brew Book</h1><div class="sub">${Object.keys(G_STATE.discovered).length}/${DATA.LEGENDARIES.length} legendary recipes</div>
    <hr class="chalkline">${rows}<hr class="chalkline">
    <p class="sub">batches brewed: ${s.brews||0} · pints served: ${s.served||0} · ficus incidents: ${s.ficus||0}</p>
    <div style="text-align:center"><span class="btn clickable" id="bb-x">close</span></div>`);
  o.querySelector("#bb-x").onclick=()=>UI.close();
};

/* ---------- pause ---------- */
UI.pause = function(){
  if(!MAIN.started) return;
  const o=UI.open(`<h1>⏸️ Paused</h1><hr class="chalkline">
    <div style="display:flex;flex-direction:column;gap:10px;align-items:center;margin-top:8px">
      <span class="btn clickable" id="pz-go">▶ Back to it</span>
      <span class="btn clickable" id="pz-how">❓ How to play</span>
      <span class="btn clickable" id="pz-mute">${SFX.muted?"🔊 Unmute":"🔇 Mute"}</span>
      <span class="btn red clickable" id="pz-quit">💾 Save & quit to title</span>
    </div>`);
  o.querySelector("#pz-go").onclick=()=>UI.close();
  o.querySelector("#pz-how").onclick=()=>UI.howto(false);
  o.querySelector("#pz-mute").onclick=()=>{ SFX.toggleMute(); UI.pause(); };
  o.querySelector("#pz-quit").onclick=()=>{ CYCLE.save(); location.reload(); };
};
