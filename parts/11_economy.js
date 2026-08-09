"use strict";
/* ECON — cash, stock, catalog, deliveries, machines, the forklift's reason to live */

const ECON = {
  shelfGroup:null, machineMeshes:{}, truckAnim:null, ghostPads:{},
};

ECON.freshState = function(){
  return {
    v:2, day:1, cash:DATA.TUNE.startCash, fame:0, rank:0,
    stock:{ barley:2, hops:1, blackberry:1 },
    kettle:{ stage:"idle", water:null, waterUnits:0, ings:[], barley:false, wortBeer:null, floaties:false },
    ferms:[ {beer:null,ready:false,days:0}, {beer:null,ready:false,days:0} ],
    taps:[ {beer:null,pints:0,price:3}, {beer:null,pints:0,price:3} ],
    machines:{}, owned:{},           // owned = bought but maybe not installed
    orders:[], discovered:{}, hints:{},
    open:false,
    loan:null,
    flags:{}, tonight:{touristsSwilled:0,served:0,swill:0},
    ledger:{sales:0,tips:0,spent:0,notes:[]},
    stats:{},
    fairWonDay:0, regionalDay:0, worldsDay:0,
    hat:null, hatsOwned:[],
    wings:{kitchen:false,gift:false},
    food:{}, gift:{tee:0,globe:0,plush:0},
    spentGrain:0, bearStage:0,
    weather:"clear", power:true, leafDay:false, cleanNights:0,
  };
};
ECON.newState = function(){
  window.G_STATE = ECON.freshState();
  return G_STATE;
};
/* deep-default a loaded save against the current schema */
ECON.mergeDefaults = function(saved){
  const fresh=ECON.freshState();
  const merge=(dst,src)=>{ for(const k in src){
    if(!(k in dst)) dst[k]=src[k];
    else if(dst[k] && src[k] && typeof dst[k]==="object" && typeof src[k]==="object" && !Array.isArray(dst[k])) merge(dst[k],src[k]);
  } };
  merge(saved, fresh);
  return saved;
};

ECON.earn = function(n, what){
  if(!G_STATE) return;
  G_STATE.cash+=n;
  if(what==="tips"||what==="joe tip") G_STATE.ledger.tips+=n; else G_STATE.ledger.sales+=n;
  UI.hud();
};
ECON.pay = function(n, what){
  if(!G_STATE) return false;
  if(G_STATE.cash<n){ toast("Not enough cash. ("+fmt$(G_STATE.cash)+")","bad"); return false; }
  G_STATE.cash-=n; G_STATE.ledger.spent+=n;
  UI.hud(); return true;
};

/* ---------- setup: stations + initial items ---------- */
ECON.setup = function(){
  /* pantry shelf */
  WORLD.addStation({ id:"shelf", x:WORLD.anchors.shelf.x, z:WORLD.anchors.shelf.z, r:2.6,
    prompt(c){ if(!G_STATE) return null;
      if(c.carried) return null;
      return "Pantry — grab an ingredient"; },
    action(){ UI.pantry(); }
  });
  /* mailbox: catalog + occasional gifts */
  WORLD.addStation({ id:"mailbox", x:WORLD.anchors.mailbox.x, z:WORLD.anchors.mailbox.z, r:2.2,
    prompt(){ return G_STATE? "Flip through the Supply Catalog" : null; },
    action(){ UI.catalog(false); }
  });
  ECON.refreshShelf();
};

ECON.spawnStarters = function(){
  spawnItem("keg", -10.5, 8.6, {state:"clean"});
  spawnItem("keg", -11.8, 9.2, {state:"clean"});
  spawnItem("bucket", -16.2, -6.4, {tier:null});
  spawnItem("bucket", -12.6, -1.2, {tier:null});
};

/* shelf visual: little crates per stocked type */
ECON.refreshShelf = function(){
  if(ECON.shelfGroup){ WORLD.scene.remove(ECON.shelfGroup); ECON.shelfGroup=null; }
  if(!G_STATE) return;
  const g=new THREE.Group();
  const types=Object.keys(G_STATE.stock).filter(k=>G_STATE.stock[k]>0);
  types.slice(0,12).forEach((t,i)=>{
    const row=Math.floor(i/4), col=i%4;
    const mini=itemMesh("ing",{type:t});
    mini.scale.setScalar(0.8);
    mini.position.set(-18.55, 0.75+row*0.8+0.35, -4.2+col*2.1);
    g.add(mini);
  });
  WORLD.scene.add(g);
  ECON.shelfGroup=g;
};

/* take one unit from stock into hands */
ECON.takeIngredient = function(type){
  if(!G_STATE.stock[type] || G_STATE.stock[type]<=0){ toast("Out of "+DATA.INGREDIENTS[type].name,"bad"); return; }
  if(MAIN.player.carry){ toast("Hands full!","bad"); return; }
  G_STATE.stock[type]--;
  const P=MAIN.player;
  const it=spawnItem("ing", P.x+Math.sin(P.facing)*0.7, P.z+Math.cos(P.facing)*0.7, {type});
  it.carriedBy=P; P.carry=it; P.carryPose=1;
  SFX.play("thud",P.x,P.z);
  ECON.refreshShelf();
};

/* ---------- ordering ---------- */
ECON.placeOrder = function(cart){    // cart = [{kind:'ing'|'keg'|'bucket'|'machine', key, qty, cost}]
  let total=0; cart.forEach(l=>total+=l.cost);
  if(!ECON.pay(total,"supplies")) return false;
  for(const l of cart) G_STATE.orders.push(l);
  toast(`Order placed (${fmt$(total)}) — truck comes at dawn. 🚚`);
  SFX.play("chaching");
  return true;
};

/* ---------- morning deliveries ---------- */
ECON.morningDeliveries = function(){
  if(!G_STATE.orders.length && G_STATE.day!==1) return;
  ECON.truckAnim={t:0, phase:"in"};
};
ECON.dropCrates = function(){
  const pad=WORLD.anchors.pad;
  const staff=G_STATE.orders.filter(o=>o.kind==="machine" && DATA.MACHINES[o.key].staff);
  const smalls=G_STATE.orders.filter(o=>o.kind!=="machine");
  const machines=G_STATE.orders.filter(o=>o.kind==="machine" && !DATA.MACHINES[o.key].staff);
  staff.forEach(s=>{
    G_STATE.machines[s.key]=true; G_STATE.owned[s.key]=true;
    setTimeout(()=>WINGS.hireArrive(s.key,false), 2500);
  });
  if(smalls.length){
    const crate=spawnItem("crate", pad.x+rand(-1,1), pad.z+rand(-1,1), {contents:smalls});
    crate.vy=2;
  }
  machines.forEach((m,i)=>{
    const crate=spawnItem("crate", pad.x-2.5+i*2.6, pad.z+2.2, {machine:m.key});
    crate.vy=2;
    G_STATE.owned[m.key]=true;
    ECON.showGhost(m.key);
  });
  G_STATE.orders=[];
  SFX.play("thud",pad.x,pad.z);
};

/* supply crate unpack station is implicit: E on crate while not carrying → contextual */
ECON.tryUnpack = function(it){
  if(it.kind!=="crate"||it.data.machine) return false;
  const lines=[];
  for(const l of it.data.contents||[]){
    if(l.kind==="ing"){ G_STATE.stock[l.key]=(G_STATE.stock[l.key]||0)+l.qty; lines.push(l.qty+"× "+DATA.INGREDIENTS[l.key].name); }
    if(l.kind==="keg"){ for(let i=0;i<l.qty;i++){ const k=spawnItem("keg", it.x+rand(-1,1), it.z+rand(-1,1), {state:"clean"}); k.vy=1.5; } lines.push(l.qty+"× keg"); }
    if(l.kind==="bucket"){ for(let i=0;i<l.qty;i++) spawnItem("bucket", it.x+rand(-1,1), it.z+rand(-1,1), {tier:null}); lines.push(l.qty+"× bucket"); }
    if(l.kind==="gift"){ G_STATE.gift[l.key]=(G_STATE.gift[l.key]||0)+l.qty; lines.push(l.qty+"× "+l.key); WINGS.refreshGiftShelf(); }
  }
  killItem(it);
  SFX.play("clank",it.x,it.z);
  toast("Unpacked: "+lines.join(", "));
  ECON.refreshShelf();
  return true;
};

/* ---------- machines ---------- */
ECON.showGhost = function(key){
  const a=WORLD.anchors["mach_"+key]; if(!a||ECON.ghostPads[key]) return;
  const ring=new THREE.Mesh(geoGet("ghostring",()=>new THREE.RingGeometry(1.0,1.25,4,1)),
    new THREE.MeshBasicMaterial({color:0xffd98a, transparent:true, opacity:0.55}));
  ring.rotation.x=-Math.PI/2; ring.rotation.z=Math.PI/4;
  ring.position.set(a.x, WORLD.getH(a.x,a.z)+0.08, a.z);
  WORLD.scene.add(ring);
  ECON.ghostPads[key]=ring;
  /* install station */
  WORLD.addStation({ id:"install_"+key, x:a.x, z:a.z, r:2.6, priority:true,
    prompt(c){
      if(!G_STATE.owned[key]||G_STATE.machines[key]) return null;
      if(c.carried && c.carried.kind==="crate" && c.carried.data.machine===key)
        return `Set the crate down here (Q), then pull the cord`;
      const crate=nearestItem(a.x,a.z,2.4, it=>it.kind==="crate"&&it.data.machine===key&&!it.carriedBy&&it!==FORK.cargo);
      return crate? `⚡ PULL THE CORD — install ${DATA.MACHINES[key].name}` : `${DATA.MACHINES[key].name} goes here (forklift the crate over)`;
    },
    action(c){
      const crate=nearestItem(a.x,a.z,2.4, it=>it.kind==="crate"&&it.data.machine===key&&!it.carriedBy&&it!==FORK.cargo);
      if(!crate) return;
      killItem(crate);
      ECON.installMachine(key,false);
    }
  });
};

ECON.installMachine = function(key, silent){
  G_STATE.machines[key]=true;
  G_STATE.owned[key]=true;
  if(ECON.ghostPads[key]){ WORLD.scene.remove(ECON.ghostPads[key]); delete ECON.ghostPads[key]; }
  const mesh=ECON.buildMachineMesh(key);
  if(mesh && !silent){
    mesh.scale.setScalar(0.05);
    const t0=MAIN.time;
    mesh.userData.unfold=t0;
    SFX.play("cordpull",mesh.position.x,mesh.position.z);
    setTimeout(()=>SFX.play("unfold",mesh.position.x,mesh.position.z),300);
    shake(0.4);
    toast(`🔧 ${DATA.MACHINES[key].name} INSTALLED — ${DATA.MACHINES[key].desc}`,"gold",4000);
  }
  if(key==="ferm2"){
    WORLD.props.ferm2ghost.traverse(o=>{ if(o.isMesh){ o.material.opacity=1; o.material.transparent=false; o.castShadow=true; } });
    WORLD.addCollider(-7.5,-2.7,-5.3,-0.5);
  }
  SFX.rank=G_STATE.rank;
  WINGS.checkHatUnlocks();
};

ECON.buildMachineMesh = function(key){
  if(ECON.machineMeshes[key]) return ECON.machineMeshes[key];
  const a=WORLD.anchors["mach_"+key];
  let g=new THREE.Group();
  switch(key){
    case "whirlybird": {
      const pole=clayCyl(0.1,0.13,3.4,0x8a6a24,0.04,601); pole.position.y=1.7; g.add(pole);
      const motor=clayBox(0.7,0.5,0.7,0xe8a33d,0.06,602); motor.position.y=3.5; g.add(motor);
      const wbEyes=makeEyes(0.08,0.13); wbEyes.position.set(0,3.55,0.38); g.add(wbEyes); g.userData.eyes=wbEyes;
      const arm=clayBox(2.6,0.12,0.16,0x8a8a92,0.04,603); arm.position.y=3.2; g.add(arm);
      const wh=new THREE.Group();
      for(let i=0;i<3;i++){ const bl=clayBox(0.1,0.05,1.1,0xd8d2c2,0.05,604+i); bl.position.z=0.55; bl.rotation.y=i*Math.PI*2/3;
        const piv=new THREE.Group(); piv.rotation.y=i*Math.PI*2/3; piv.add(bl); wh.add(piv); }
      wh.position.set(-2.4,3.15,0);
      g.add(wh); g.userData.spinner=wh;
      break; }
    case "granny": {
      const panel=clayBox(1.0,1.4,0.3,0x8a6a48,0.05,611); panel.position.y=0.9; g.add(panel);
      const dial=clayCyl(0.34,0.34,0.1,0xe8d9a8,0.04,612); dial.rotation.x=Math.PI/2; dial.position.set(0,1.1,0.2); g.add(dial);
      const needle=clayBox(0.05,0.26,0.03,0xb5472e,0.02,613); needle.position.set(0,1.2,0.28); g.add(needle);
      g.userData.needle=needle;
      break; }
    case "governor": {
      const base=clayCyl(0.4,0.5,0.8,0x8a8a92,0.05,621); base.position.y=0.4; g.add(base);
      const valve=claySphere(0.35,0xb87333,0.06,622); valve.position.y=1.0; g.add(valve);
      const wheel=new THREE.Mesh(geoGet("govwheel",()=>new THREE.TorusGeometry(0.3,0.05,6,14)),clayMat(0xb5472e));
      wheel.position.y=1.4; wheel.rotation.x=Math.PI/2; g.add(wheel);
      g.userData.spinner=wheel;
      const pipe=clayCyl(0.08,0.08,2.2,0xb87333,0.04,623); pipe.rotation.z=Math.PI/2; pipe.position.set(-1.1,0.9,0); g.add(pipe);
      break; }
    case "splashy": {
      const tank=clayBox(1.8,1.6,1.4,0x7e9bb2,0.05,631); tank.position.y=0.8; g.add(tank);
      const hopper=clayBox(1.2,0.5,1.2,0x5a7a92,0.06,632); hopper.position.set(0,1.8,0); hopper.rotation.z=0.08; g.add(hopper);
      const brush=clayCyl(0.3,0.3,1.2,0xe8d9a8,0.15,633); brush.rotation.z=Math.PI/2; brush.position.y=1.2; g.add(brush);
      g.userData.spinner=brush;
      const eyes=makeEyes(0.1,0.14); eyes.position.set(0,1.45,0.72); g.add(eyes); // Splashy has EYES
      g.userData.eyes=eyes;
      break; }
    case "pipes": {
      for(let i=0;i<5;i++){ const seg=clayCyl(0.09,0.09,3.4,0xb87333,0.04,641+i);
        seg.rotation.x=Math.PI/2; seg.position.set(-1.2+ i*0.02, 2.6+i*0.02, -1.5-i*3.1); g.add(seg); }
      const spig=clayBox(0.3,0.5,0.3,0xb5472e,0.05,646); spig.position.set(-1.2,2.2,-0.4); g.add(spig);
      break; }
    case "selfpour": {
      const sign=clayBox(2.2,0.6,0.12,0xe8a33d,0.05,651); sign.position.y=2.9; g.add(sign);
      const l1=new THREE.PointLight(0xffd98a,0.8,6,2); l1.position.y=2.6; g.add(l1);
      break; }
    case "ferm2": return null;
  }
  g.position.set(a.x, WORLD.getH(a.x,a.z)+0.3, a.z);
  if(key==="selfpour") g.position.set(10.6,0.3,-6.1);
  g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
  WORLD.scene.add(g);
  ECON.machineMeshes[key]=g;
  return g;
};

/* ---------- update: truck, unfold anims, machine idle spins ---------- */
ECON.update = function(dt){
  if(!G_STATE) return;
  /* truck */
  const T=ECON.truckAnim;
  if(T){
    const truck=WORLD.props.truck;
    T.t+=dt;
    if(T.phase==="in"){
      truck.position.x=lerp(-60,8,Math.min(1,T.t/4));
      truck.position.z=27;
      if(Math.random()<dt*3) puff(truck.position.x-1.5,1,truck.position.z+1,0x8a8a82,0.3,0.6,0.8);
      if(T.t>=4){ T.phase="stop"; T.t=0; SFX.play("honk",8,27); }
    } else if(T.phase==="stop"){
      if(T.t>0.8&&!T.dropped){ T.dropped=true; ECON.dropCrates(); toast("🚚 Delivery! Crates on the pad.","",2600); }
      if(T.t>2){ T.phase="out"; T.t=0; }
    } else {
      truck.position.x=lerp(8,70,Math.min(1,T.t/4.5));
      if(T.t>=4.5){ ECON.truckAnim=null; truck.position.x=-60; }
    }
  }
  /* unfold animations + idle machine motion */
  for(const key in ECON.machineMeshes){
    const m=ECON.machineMeshes[key]; if(!m) continue;
    if(m.userData.unfold!==undefined){
      const e=MAIN.time-m.userData.unfold;
      const s=e<0.6? 0.05+ (e/0.6)*1.15 : e<0.9? 1.2-(e-0.6)/0.3*0.2 : 1;
      m.scale.setScalar(Math.max(0.05,s));
      if(e>1){ m.scale.setScalar(1); delete m.userData.unfold; }
    }
    if(m.userData.spinner){
      const on = (key==="whirlybird"&&BREW.boil) || (key==="splashy"&&ITEMS.list.some(i=>i.data&&i.data.washT!==undefined)) || key==="governor"&&BREW.boil;
      if(on) m.userData.spinner.rotation.y+=dt*10;
    }
    if(m.userData.eyes) m.userData.eyes.userData.update(dt,0,0,null);
  }
};

/* supply-crate unpack: a station that shadows the nearest supply crate */
ECON.padStationOnce = function(){
  const near=()=>nearestItem(MAIN.player.x,MAIN.player.z,2.3,it=>it.kind==="crate"&&!it.data.machine);
  WORLD.addStation({ id:"unpack",
    get x(){ const c=near(); return c?c.x:9999; },
    get z(){ const c=near(); return c?c.z:9999; },
    r:2.4,
    prompt(c){ if(c.carried) return null; return near()? "Unpack the supply crate" : null; },
    action(){ const c=near(); if(c) ECON.tryUnpack(c); }
  });
};
