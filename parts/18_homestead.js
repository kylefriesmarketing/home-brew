"use strict";
/* HOMESTEAD — roofs (dollhouse fade), MawMaw's farm stand, the porch rocker.
   Roof materials are CLONES: clayMat caches by colour, so fading a shared
   material would fade half the mountain with it. */

const HOMESTEAD = {
  roofs: [],           // {x1,z1,x2,z2, mats[], cur, apl} — bounds are the FADE zone
  rocked: false,
  standGroup: null,
  mawmaw: ["Box says thank ya.","She KNOWS.","Picked this mornin'. Probably.",
           "Highway robbery, sure — but here y'are.","MawMaw appreciates ya."],
};

/* ---------- hand-painted sign helper ---------- */
function textPlank(txt, sub, w, h, opts={}){
  const cv=document.createElement("canvas"); cv.width=512; cv.height=128;
  const g=cv.getContext("2d");
  g.fillStyle=opts.bg||"#5e402a"; g.fillRect(0,0,512,128);
  g.strokeStyle="rgba(0,0,0,0.25)"; g.lineWidth=10; g.strokeRect(5,5,502,118);
  g.fillStyle=opts.ink||"#f0e6cc"; g.textAlign="center"; g.textBaseline="middle";
  g.font="bold 58px Georgia"; g.fillText(txt, 256, sub?52:64);
  if(sub){ g.font="italic 26px Georgia"; g.fillText(sub, 256, 98); }
  const tex=new THREE.CanvasTexture(cv); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=4;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),
    new THREE.MeshStandardMaterial({map:tex, roughness:0.9}));
  return m;
}

/* ---------- roofs ---------- */
function roofRegister(group, fade){
  const mats=[];
  group.traverse(o=>{ if(o.isMesh){
    o.castShadow=false; o.receiveShadow=false;      // interiors were lit rooflessly — keep it
    o.material=o.material.clone(); o.material.transparent=true;
    mats.push(o.material);
  }});
  WORLD.scene.add(group);
  HOMESTEAD.roofs.push(Object.assign({mats, cur:1, apl:1}, fade));
  return group;
}

/* gable roof: ridge runs along X, slopes fall to ±Z eaves */
function gableRoof(x1,z1,x2,z2, eave, rise, col, capCol, endCol){
  const g=new THREE.Group();
  const over=0.9, cx=(x1+x2)/2, cz=(z1+z2)/2;
  const W=(x2-x1)+over*2, halfZ=(z2-z1)/2+over;
  const sl=Math.hypot(halfZ,rise), ang=Math.atan(rise/halfZ);
  const s=clayBox(W,0.16,sl,col,0.02,cx*7+z2);          // south slope (+z eave low)
  s.rotation.x=ang;  s.position.set(cx, eave+rise/2+0.08, cz+halfZ/2); g.add(s);
  const n=clayBox(W,0.16,sl,col,0.02,cx*5+z1);          // north slope
  n.rotation.x=-ang; n.position.set(cx, eave+rise/2+0.08, cz-halfZ/2); g.add(n);
  const cap=clayBox(W+0.25,0.2,0.5,capCol,0.05,cx*3);   // ridge cap
  cap.position.set(cx, eave+rise+0.1, cz); g.add(cap);
  /* gable-end triangles in the wall colour — the wall reads as continuing up */
  const hz=(z2-z1)/2;
  const shape=new THREE.Shape();
  shape.moveTo(-hz-0.12,0); shape.lineTo(hz+0.12,0); shape.lineTo(0,rise-0.04);
  const triGeo=new THREE.ShapeGeometry(shape);
  for(const ex of [x1,x2]){
    const tri=new THREE.Mesh(triGeo, clayMat(endCol,{side:THREE.DoubleSide}));
    tri.rotation.y=Math.PI/2; tri.position.set(ex, eave+0.02, cz); g.add(tri);
  }
  return g;
}

HOMESTEAD.buildRoofs = function(){
  /* brewhouse shack: rusted tin + the kettle's stovepipe */
  const shack=gableRoof(-19.5,-9,-3.5,5, 5.55, 2.3, 0x965a40, 0x6e4030, 0x8a6a48);
  const pipe=clayCyl(0.14,0.14,2.7,0x4a4a4a,0.04,801); pipe.position.set(-14,6.55,-4); shack.add(pipe);
  const pcap=clayCyl(0.26,0.26,0.12,0x3a3a3a,0.05,802); pcap.position.set(-14,8.0,-4); shack.add(pcap);
  roofRegister(shack, {x1:-20.6,z1:-10,x2:-2.6,z2:7.6});   // fade zone covers porch + rocker

  /* pub: dark shingle + the HOPS & HOLLERS board under the south eave */
  const pub=gableRoof(3.5,-9,20.5,6.5, 5.75, 2.5, 0x5a4632, 0x403222, 0x92543a);
  const hh=textPlank("HOPS & HOLLERS","fine mountain beer-drinkin'",3.4,0.85);
  hh.position.set(11.1,4.62,7.3); hh.rotation.z=-0.02; pub.add(hh);
  const hhBack=clayBox(3.7,1.0,0.1,0x5e402a,0.03,811); hhBack.position.set(11.1,4.62,7.22); pub.add(hhBack);
  for(const rx of [9.6,12.6]){
    const rope=clayBox(0.05,0.75,0.05,0xc9b878,0.1,812+rx); rope.position.set(rx,5.35,7.28); pub.add(rope);
  }
  roofRegister(pub, {x1:2.5,z1:-10,x2:21.5,z2:7.6});

  /* wings: one weathered-green lean-to sloping east, kitchen stack poking through */
  const wing=new THREE.Group();
  const run=8.7, drop=1.0, wl=Math.hypot(run,drop), wang=Math.atan(drop/run);
  const slab=clayBox(wl,0.15,17.1,0x5c7052,0.02,821);
  slab.rotation.z=-wang; slab.position.set(24.85,5.1,-1.25); wing.add(slab);
  const kpipe=clayCyl(0.12,0.12,1.7,0x4a4a4a,0.04,822); kpipe.position.set(23.9,5.15,-7.4); wing.add(kpipe);
  const kcap=clayCyl(0.22,0.22,0.1,0x3a3a3a,0.05,823); kcap.position.set(23.9,6.1,-7.4); wing.add(kcap);
  roofRegister(wing, {x1:19.8,z1:-10,x2:29.4,z2:7.6});
};

/* ---------- MawMaw's farm stand ---------- */
HOMESTEAD.buildStand = function(){
  const g=new THREE.Group();
  for(const [px,pz] of [[-2.05,-1.05],[2.05,-1.05],[-2.05,1.05],[2.05,1.05]]){
    const p=clayCyl(0.09,0.11,3.0,0x7a5a3a,0.05,830+px*pz); p.position.set(px,1.5,pz); g.add(p);
  }
  const counter=clayBox(4.4,1.05,1.5,0x8a6a48,0.03,834); counter.position.set(0,0.55,-0.3); g.add(counter);
  const top=clayBox(4.7,0.14,1.7,0x9a7a52,0.02,835); top.position.set(0,1.12,-0.3); g.add(top);
  /* striped awning, front edge low */
  const aw=new THREE.Group();
  for(let i=0;i<6;i++){
    const slat=clayBox(0.78,0.08,3.0, i%2?0xb5472e:0xe8dcc0, 0.03, 836+i);
    slat.position.set(-1.95+i*0.78,0,0); aw.add(slat);
  }
  aw.rotation.x=-0.26; aw.position.set(0,3.02,0); g.add(aw);
  /* the honor box */
  const box=clayBox(0.5,0.36,0.36,0x4a5a6a,0.05,843); box.position.set(1.6,1.35,-0.5); g.add(box);
  const slot=clayBox(0.3,0.04,0.08,0x2a3038,0.02,844); slot.position.set(1.6,1.55,-0.5); g.add(slot);
  /* sign */
  const sign=textPlank("MAWMAW'S","produce · honor box",2.8,0.8);
  sign.rotation.y=Math.PI; sign.rotation.z=0.025; sign.position.set(0,3.5,-1.45); g.add(sign);
  const signBack=clayBox(3.0,0.95,0.1,0x5e402a,0.03,845); signBack.position.set(0,3.5,-1.38); g.add(signBack);
  g.position.set(-9,0,21.2);
  WORLD.scene.add(g);
  WORLD.props.farmStand=g;
  WORLD.addCollider(-11.3,20.1,-6.7,22.0);
  HOMESTEAD.refreshStand();
};

HOMESTEAD.standPicks = function(){
  const H=Object.keys(DATA.INGREDIENTS).filter(k=>{
    const d=DATA.INGREDIENTS[k]; return !d.cursed && !d.secret && k!=="barley"; });
  const d=G_STATE? G_STATE.day : 1;
  return [...new Set(["barley", H[d%H.length], H[(d+3)%H.length], H[(d+6)%H.length]])];
};

/* today's produce, displayed on the counter (rebuilt each dawn) */
HOMESTEAD.refreshStand = function(){
  if(HOMESTEAD.standGroup){ WORLD.scene.remove(HOMESTEAD.standGroup); HOMESTEAD.standGroup=null; }
  if(!G_STATE) return;
  const g=new THREE.Group();
  HOMESTEAD.standPicks().forEach((t,i)=>{
    const m=itemMesh("ing",{type:t});
    m.scale.setScalar(0.85);
    m.position.set(-10.3+i*0.9, 1.3, 20.75);
    m.rotation.y=i*1.3;
    g.add(m);
  });
  WORLD.scene.add(g);
  HOMESTEAD.standGroup=g;
};

HOMESTEAD.shop = function(){
  const M=DATA.TUNE.standMarkup;
  const rows=HOMESTEAD.standPicks().map(k=>{
    const d=DATA.INGREDIENTS[k], pr=Math.ceil(d.cost*M);
    return `<div class="row"><span class="nm">${d.name}${k==="barley"?' <span class="sub">(always)</span>':""}</span><span class="pr">$${pr}</span><span class="btn small clickable" data-fs="${k}" data-pr="${pr}">buy</span></div>`;
  }).join("");
  const kegGone=G_STATE.flags.standKegDay===G_STATE.day;
  const kegRow= kegGone
    ? `<div class="row"><span class="nm">Spare keg</span><span class="sub">sold — she only had the one</span></div>`
    : `<div class="row"><span class="nm">Spare keg <span class="sub">(out back)</span></span><span class="pr">$${DATA.TUNE.standKegPrice}</span><span class="btn small clickable" data-fskeg="1">buy</span></div>`;
  const o=UI.open(`<h1>🧺 MawMaw's Farm Stand</h1>
    <div class="sub">MawMaw ain't here. Cash goes in the box. She counts it. She KNOWS.</div>
    <hr class="chalkline">${rows}${kegRow}
    <p class="sub" style="text-align:center">today's pickin's — rotates every mornin' · convenience surcharge: proudly yes</p>
    <div style="text-align:center;margin-top:8px"><span class="btn clickable" id="fs-x">🚪 back to it</span></div>`);
  o.querySelectorAll("[data-fs]").forEach(b=>b.onclick=()=>{
    const k=b.dataset.fs, pr=+b.dataset.pr;
    if(!ECON.pay(pr,"supplies")) return;
    G_STATE.stock[k]=(G_STATE.stock[k]||0)+1;
    ECON.refreshShelf();
    SFX.play("chaching");
    toast(pick(HOMESTEAD.mawmaw)+"  (+1 "+DATA.INGREDIENTS[k].name+")","",2200);
    HOMESTEAD.shop();
  });
  const kb=o.querySelector("[data-fskeg]");
  if(kb) kb.onclick=()=>{
    if(!ECON.pay(DATA.TUNE.standKegPrice,"supplies")) return;
    G_STATE.flags.standKegDay=G_STATE.day;
    const keg=spawnItem("keg",-7.3,19.4,{state:"clean"}); keg.vy=2; kegLook(keg);
    SFX.play("chaching");
    toast("🛢 She left it out back. Haul it yourself.","",2600);
    HOMESTEAD.shop();
  };
  o.querySelector("#fs-x").onclick=()=>UI.close();
};

/* ---------- the porch rocker ---------- */
HOMESTEAD.buildRocker = function(){
  const g=new THREE.Group();
  for(const rx of [-0.5,0.5]){
    const run=clayBox(0.12,0.1,1.7,0x6a4a30,0.06,850+rx); run.position.set(rx,0.08,0.05); g.add(run);
    for(const rz of [-0.35,0.4]){
      const leg=clayCyl(0.05,0.06,0.7,0x6a4a30,0.05,852+rx*rz); leg.position.set(rx,0.48,rz); g.add(leg);
    }
  }
  const seat=clayBox(1.05,0.14,0.95,0x8a6a48,0.05,856); seat.position.set(0,0.86,0); g.add(seat);
  for(const sx of [-0.32,0,0.32]){
    const slat=clayBox(0.16,0.95,0.1,0x8a6a48,0.05,857+sx); slat.rotation.x=-0.18;
    slat.position.set(sx,1.42,-0.5); g.add(slat);
  }
  const rail=clayBox(0.98,0.17,0.1,0x6a4a30,0.05,861); rail.rotation.x=-0.18; rail.position.set(0,1.95,-0.59); g.add(rail);
  for(const ax of [-0.56,0.56]){
    const arm=clayBox(0.12,0.08,0.85,0x6a4a30,0.05,862+ax); arm.position.set(ax,1.22,-0.05); g.add(arm);
  }
  g.position.set(-16.9,0,6.42);
  g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
  WORLD.scene.add(g);
  WORLD.props.rocker=g;
  WORLD.addCollider(-17.5,5.95,-16.3,6.9);
};

HOMESTEAD.sit = function(){
  if(BREW.boil){ toast("The kettle's rolling — no time to rock.","bad"); return; }
  if(CYCLE.phase==="night"){ toast("Past rockin' hours. Bed's callin'.","",2000); return; }
  if(MAIN.player.carry) MAIN.dropCarry(false);
  HOMESTEAD.rocked=true;
  MAIN.mode="rock";
  MAIN.timeScale=DATA.TUNE.rockScale;
  toast("🪑 Sittin' a spell — the day rolls by quick. (E or a step to get up)","gold",3200);
};
HOMESTEAD.standUp = function(quiet){
  if(!HOMESTEAD.rocked) return;
  HOMESTEAD.rocked=false;
  MAIN.timeScale=1;
  const P=MAIN.player;
  P.group.rotation.x=0;
  P.carryPose=0;
  P.setPos(-16.9,7.8);
  if(MAIN.mode==="rock") MAIN.mode="walk";
  if(!quiet) toast("…aaand up.","",1200);
};

/* ---------- setup + update ---------- */
HOMESTEAD.setup = function(){
  HOMESTEAD.buildRoofs();
  HOMESTEAD.buildStand();
  HOMESTEAD.buildRocker();
  WORLD.addStation({ id:"farmstand", x:-9, z:19.4, r:2.8,
    prompt(){ if(!G_STATE || MAIN.mode!=="walk") return null;
      return "🧺 MawMaw's stand — buy what ya forgot"; },
    action(){ HOMESTEAD.shop(); }
  });
  WORLD.addStation({ id:"rocker", x:-16.9, z:7.5, r:2.2,
    prompt(){ if(!G_STATE || MAIN.mode!=="walk") return null;
      if(CYCLE.phase==="night") return "Rocker. (past rockin' hours)";
      return "🪑 Sit a spell — let the day roll by"; },
    action(){ HOMESTEAD.sit(); }
  });
  BUS.on("newday", ()=>{ HOMESTEAD.refreshStand(); HOMESTEAD.standUp(true); });
  BUS.on("phase", ()=>HOMESTEAD.standUp(true));   // CYCLE's own phase toast announces where you landed
};

HOMESTEAD.update = function(dt){
  const P=MAIN.player;
  /* dollhouse roof fade */
  for(const R of HOMESTEAD.roofs){
    const inside = P && P.x>R.x1 && P.x<R.x2 && P.z>R.z1 && P.z<R.z2;
    R.cur=damp(R.cur, inside?0.12:1, 6, dt);
    if(Math.abs(R.cur-R.apl)>0.004){
      R.apl=R.cur;
      for(const m of R.mats) m.opacity=R.cur;
    }
  }
  /* rocking */
  const rk=WORLD.props.rocker;
  if(HOMESTEAD.rocked){
    if(MAIN.mode!=="rock"){ HOMESTEAD.standUp(true); return; }   // mode stolen (pause etc.)
    const I=MAIN.input;
    if(MAIN.ePressed || I.up||I.down||I.left||I.right){
      MAIN.ePressed=false;
      HOMESTEAD.standUp();
      return;
    }
    const rock=Math.sin(CLAY.t*2.2)*0.075;      // CLAY.t: props rock at 12fps like everything else
    if(rk) rk.rotation.x=rock;
    P.x=-16.9; P.z=6.42; P.y=0.42;
    P.facing=0; P.speedNow=0; P.carryPose=0.45;  // hands settle on the armrests
    P.group.position.set(-16.9, 0.42+Math.abs(rock)*0.12, 6.42+rock*0.35);
    P.group.rotation.x=rock*0.9;
  } else if(rk && Math.abs(rk.rotation.x)>0.001){
    rk.rotation.x=damp(rk.rotation.x,0,3,dt);   // settles after you hop off
  }
};
