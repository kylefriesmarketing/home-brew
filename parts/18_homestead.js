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
  /* machine pads (ghost rings + install stations key off these) */
  Object.assign(WORLD.anchors, {
    mach_moppy:{x:18.8,z:-7.6},  mach_silo:{x:-21.3,z:-6},   mach_conveyor:{x:0,z:-2.8},
    mach_coldroom:{x:0,z:-11.2}, mach_winch:{x:3.6,z:17.4},  mach_fillline:{x:-4.7,z:-2.9},
    mach_neon:{x:14.8,z:8.8},    mach_bigbertha:{x:-14,z:-7.1},
    ferm3:{x:0,z:-9.5},
  });
  HOMESTEAD.ferm3Station();
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
  if(G_STATE) HOMESTEAD.machinesUpdate(dt);
};

/* ============================================================
   THE MACHINE SHOP — the rest of the bible's §14 roster.
   Meshes route here via ECON.buildMachineMesh's default case;
   effects live in machinesUpdate + hooks in brew/econ.
   ============================================================ */

HOMESTEAD.augerT=0; HOMESTEAD.winchT=0; HOMESTEAD.fillT=0;
HOMESTEAD.mop={ang:2.2, t:3, spin:0, shy:0};

HOMESTEAD.augerFeed = function(){
  HOMESTEAD.augerT=1.4;
  SFX.play("glug",-14,-4);
  toast("🌾 The auger rumbles — grain's in.","",1800);
};
HOMESTEAD.winchSwing = function(){
  HOMESTEAD.winchT=2.4;
  SFX.play("clank",3.6,17.4);
};
HOMESTEAD.coldroomInstalled = function(){
  while(G_STATE.ferms.length<3) G_STATE.ferms.push({beer:null,ready:false,days:0});
  if(!HOMESTEAD._coldCol){
    HOMESTEAD._coldCol=true;
    WORLD.addCollider(-1.9,-12.8,1.9,-12.3);
    WORLD.addCollider(-1.9,-12.8,-1.5,-10.0);
    WORLD.addCollider(1.5,-12.8,1.9,-10.0);
  }
};

/* neon sign texture — withO lights every tube; !withO leaves the first O dark */
function neonTex(withO){
  const cv=document.createElement("canvas"); cv.width=1024; cv.height=224;
  const c=cv.getContext("2d");
  c.fillStyle="#221d2e"; c.fillRect(0,0,1024,224);
  c.strokeStyle="rgba(0,0,0,0.4)"; c.lineWidth=14; c.strokeRect(7,7,1010,210);
  c.textAlign="center"; c.textBaseline="middle"; c.font="bold 100px Georgia";
  const txt="HOPS & HOLLERS";
  c.fillStyle="#3a3050"; c.fillText(txt,512,116);
  c.shadowColor="#ff7ac8"; c.shadowBlur=30; c.fillStyle="#ffd6ee";
  if(withO) c.fillText(txt,512,116);
  else {
    const wAll=c.measureText(txt).width, wPre=c.measureText("H").width, wO=c.measureText("O").width;
    const x0=512-wAll/2;
    c.textAlign="left";
    c.fillText("H", x0, 116);
    c.fillText("PS & HOLLERS", x0+wPre+wO, 116);
    c.textAlign="center";
  }
  const t=new THREE.CanvasTexture(cv); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4;
  return t;
}

/* ---------- builders (g is the machine group; anchor-placed by ECON after) ---------- */
HOMESTEAD.buildMach = {

  moppy(g){
    const base=clayCyl(0.5,0.55,0.26,0x8a8a92,0.05,901); base.position.y=0.22; g.add(base);
    const skirt=clayCyl(0.6,0.58,0.1,0xe8dcc0,0.18,902); skirt.position.y=0.07; g.add(skirt);
    const btn=claySphere(0.09,0xb5472e,0.08,903); btn.position.set(0,0.38,0); g.add(btn);
    const eyes=makeEyes(0.07,0.1); eyes.position.set(0,0.34,0.44); g.add(eyes);
    g.userData.eyes=eyes;
    const flag=clayBox(0.04,0.4,0.04,0x6a4a30,0.06,904); flag.position.set(-0.3,0.55,-0.2); g.add(flag);
    const pennant=clayBox(0.02,0.12,0.2,0xe8a33d,0.05,905); pennant.position.set(-0.3,0.72,-0.1); g.add(pennant);
  },

  silo(g){
    for(const [lx,lz] of [[-0.6,-0.6],[0.6,-0.6],[-0.6,0.6],[0.6,0.6]]){
      const leg=clayCyl(0.08,0.1,1.0,0x6a5a48,0.05,911+lx*lz); leg.position.set(lx,0.5,lz); g.add(leg);
    }
    const body=clayCyl(0.95,1.0,3.2,0xd8d2c2,0.04,915); body.position.y=2.5; g.add(body);
    const band=clayCyl(1.0,1.0,0.22,0xb5472e,0.03,916); band.position.y=2.0; g.add(band);
    const cone=clayCyl(0.12,1.0,1.0,0x9a8a72,0.05,917); cone.position.y=4.55; g.add(cone);
    const cap=claySphere(0.2,0x6a5a48,0.08,918); cap.position.y=5.1; g.add(cap);
    const tube=clayCyl(0.13,0.13,4.6,0x8a8a92,0.04,919);
    tube.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), new THREE.Vector3(0.86,-0.12,0.24).normalize());
    tube.position.set(2.3,3.9,0.6);
    g.add(tube); g.userData.auger=tube;
    const spout=clayCyl(0.16,0.1,0.4,0x6a5a48,0.05,920); spout.position.set(4.5,3.3,1.2); g.add(spout);
  },

  conveyor(g){
    for(const rz of [-0.55,0.55]){
      const rail=clayBox(10.6,0.12,0.14,0x6a4a30,0.03,921+rz); rail.position.set(0,0.36,rz); g.add(rail);
    }
    for(const [lx,lz] of [[-4.8,-0.5],[4.8,-0.5],[-4.8,0.5],[4.8,0.5]]){
      const leg=clayBox(0.14,0.34,0.14,0x6a5a48,0.05,923+lx*lz); leg.position.set(lx,0.17,lz); g.add(leg);
    }
    g.userData.rollers=[];
    for(let i=0;i<7;i++){
      const r=clayCyl(0.15,0.15,1.05,0x9a7a52,0.06,930+i);
      r.rotation.x=Math.PI/2; r.position.set(-4.5+i*1.5,0.34,0);
      g.add(r); g.userData.rollers.push(r);
    }
  },

  coldroom(g){
    const fl=clayBox(3.6,0.16,3.0,0xcfd8dc,0.03,941); fl.position.set(0,0.02,-0.1); g.add(fl);
    const back=clayBox(3.6,2.9,0.4,0xdfe8ea,0.04,942); back.position.set(0,1.45,-1.45); g.add(back);
    for(const sx of [-1.7,1.7]){
      const side=clayBox(0.4,2.9,2.6,0xd4e0e4,0.04,943+sx); side.position.set(sx,1.45,-0.2); g.add(side);
    }
    const roof=clayBox(4.1,0.3,3.4,0xeef4f6,0.06,946); roof.position.set(0,3.0,-0.15); roof.rotation.z=0.04; g.add(roof);
    for(let i=0;i<5;i++){
      const ice=clayCyl(0.001,0.05,0.3+(i%3)*0.12,0xdff0f8,0.02,948+i);
      ice.position.set(-1.4+i*0.7,2.75,1.28); g.add(ice);
    }
    const f=new THREE.Group();
    const tank=clayCyl(0.95,1.1,2.6,0xdfe8ea,0.04,951,14); tank.position.y=1.6; f.add(tank);
    const top=claySphere(0.95,0xcfdce2,0.05,952); top.position.y=2.9; top.scale.y=0.55; f.add(top);
    const airlock=clayCyl(0.09,0.09,0.5,0x88b0b8,0.1,953); airlock.position.set(0.3,3.4,0); f.add(airlock);
    const legs=clayCyl(0.5,0.6,0.35,0x6a7a82,0.05,954); legs.position.y=0.2; f.add(legs);
    const band=clayCyl(1.02,1.02,0.24,0x5a8ab8,0.03,955,14); band.position.y=1.9; f.add(band);
    f.position.set(0,0.05,-0.35); f.scale.setScalar(0.82);
    g.add(f);
  },

  winch(g){
    for(const lx of [-0.8,0.8]){
      const leg=clayCyl(0.1,0.13,3.4,0x6a4a30,0.05,961+lx); leg.position.set(lx,1.7,0); leg.rotation.z=lx>0?-0.22:0.22; g.add(leg);
    }
    const arm=new THREE.Group();
    const beam=clayBox(0.16,0.16,3.0,0x8a6a48,0.04,963); beam.position.set(0,0,-1.4); arm.add(beam);
    const rope=clayBox(0.05,1.6,0.05,0xc9b878,0.08,964); rope.position.set(0,-0.85,-2.7); arm.add(rope);
    const hook=new THREE.Mesh(geoGet("winchhook",()=>new THREE.TorusGeometry(0.16,0.05,6,10)), clayMat(0x8a8a92));
    hook.position.set(0,-1.75,-2.7); arm.add(hook);
    arm.position.y=3.3;
    arm.rotation.y=0.6;
    g.add(arm); g.userData.arm=arm;
  },

  fillline(g){
    for(const pz of [-2.3,2.3]){
      const post=clayCyl(0.09,0.12,3.0,0x8a8a92,0.05,971+pz); post.position.set(0,1.5,pz); g.add(post);
    }
    const rail=clayBox(0.14,0.14,5.2,0x8a8a92,0.04,973); rail.position.set(0,2.95,0); g.add(rail);
    for(const hz of [-1.3,1.3]){
      const armOut=clayBox(1.8,0.12,0.12,0x8a8a92,0.04,974+hz); armOut.position.set(-0.9,2.9,hz); g.add(armOut);
      const hose=clayCyl(0.06,0.06,1.5,0x3e7a3e,0.08,976+hz); hose.position.set(-1.7,2.05,hz); g.add(hose);
      const nozzle=claySphere(0.11,0xb5472e,0.06,978+hz); nozzle.position.set(-1.7,1.25,hz); g.add(nozzle);
    }
    const pump=clayBox(0.7,0.8,0.7,0xe8a33d,0.05,980); pump.position.set(0,0.4,0); g.add(pump);
    const eyes=makeEyes(0.07,0.1); eyes.position.set(0,0.62,0.38); g.add(eyes); g.userData.eyes=eyes;
  },

  neon(g){
    const board=clayBox(6.4,1.6,0.18,0x2a2430,0.02,981); board.position.y=0.95; g.add(board);
    const texA=neonTex(true), texB=neonTex(false);
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(6.0,1.35),
      new THREE.MeshBasicMaterial({map:texA, transparent:true}));
    plane.position.set(0,0.95,0.11); g.add(plane);
    for(const px of [-2.6,2.6]){
      const strut=clayBox(0.12,0.7,0.12,0x4a4a4a,0.05,983+px); strut.position.set(px,0.18,0); g.add(strut);
    }
    const light=new THREE.PointLight(0xff9ad8,0,15,2); light.position.set(0,1.0,1.6); g.add(light);
    g.userData.texA=texA; g.userData.texB=texB; g.userData.plane=plane;
    g.userData.light=light; g.userData.ft=0; g.userData.oLit=true;
    g.userData.place=(grp)=>{
      grp.position.set(12,8.35,-1.25);
      grp.traverse(o=>{ if(o.isMesh){ o.castShadow=false; o.material=o.material.clone(); o.material.transparent=true; } });
      grp.userData.plane=grp.children.find(o=>o.geometry&&o.geometry.type==="PlaneGeometry");
      const pubRoof=HOMESTEAD.roofs[1];
      if(pubRoof) grp.traverse(o=>{ if(o.isMesh) pubRoof.mats.push(o.material); });
    };
  },

  bigbertha(g){
    const K=WORLD.props.kettle;
    if(K && !K.userData.bertha){
      K.userData.bertha=true;
      K.scale.setScalar(1.26);
      const body=K.children[0];
      if(body){ body.material=body.material.clone(); body.material.color.set(0xa84a30); }
      const band=clayCyl(1.68,1.72,0.34,0x6a3a28,0.04,991,16); band.position.y=1.7; K.add(band);
      for(let i=0;i<8;i++){ const a=i/8*Math.PI*2;
        const riv=claySphere(0.08,0xd8b06a,0.1,992+i);
        riv.position.set(Math.cos(a)*1.66,1.7,Math.sin(a)*1.66); K.add(riv);
      }
    }
    const plate=textPlank("BIG BERTHA","kettle mk2",1.9,0.55);
    plate.position.y=1.15; g.add(plate);
    const post=clayCyl(0.07,0.09,1.0,0x6a4a30,0.05,999); post.position.y=0.5; g.add(post);
  },
};

/* ---------- Fermenter No. 3 (in the Cold Room) ---------- */
HOMESTEAD.ferm3Station = function(){
  const anchor=WORLD.anchors.ferm3;
  WORLD.addStation({ id:"ferm3", x:anchor.x, z:anchor.z, r:2.3,
    prompt(c){
      if(!G_STATE || !G_STATE.machines.coldroom) return null;
      const F=G_STATE.ferms[2]; if(!F) return null;
      const k=G_STATE.kettle;
      if(k.stage==="wort" && !F.beer && !c.carried) return "Pour the wort in — Fermenter 3 (the cold one)";
      if(F.beer && !F.ready) return "(bubbling in the cold… ready after a night's sleep)";
      if(F.beer && F.ready){
        if(c.carried && c.carried.kind==="keg" && c.carried.data.state==="clean")
          return `Fill keg — “${F.beer.name}” (${F.beer.tierName})`;
        return `Ready: “${F.beer.name}” — bring a CLEAN keg`;
      }
      return null;
    },
    action(c){
      const F=G_STATE.ferms[2]; if(!F) return;
      const k=G_STATE.kettle;
      if(k.stage==="wort" && !F.beer && !c.carried){
        F.beer=k.wortBeer; F.ready=false; F.days=DATA.TUNE.fermentDays;
        F.kegs=G_STATE.machines.bigbertha?2:1;
        k.stage="idle"; k.water=null; k.waterUnits=0; k.ings=[]; k.barley=false; k.wortBeer=null;
        BREW.wortLook();
        SFX.play("pour",anchor.x,anchor.z); SFX.play("glug",anchor.x,anchor.z);
        for(let p=0;p<6;p++) setTimeout(()=>puff(anchor.x,2.4,anchor.z-1,0xdfeef4,0.35,1,0.8),p*120);
        toast(`Wort's in the cold room. “${F.beer.name}” sleeps well tonight.`);
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
      if(F.beer && !F.ready) toast("Shhh. It's fermenting. In the COLD.","",1600);
    }
  });
};

/* ---------- per-frame machine life ---------- */
HOMESTEAD.machinesUpdate = function(dt){
  const M=G_STATE.machines, MM=ECON.machineMeshes;

  /* Moppy wanders the pub, bumps the furniture, fears the porch step */
  if(M.moppy && MM.moppy){
    const m=MM.moppy, s=HOMESTEAD.mop;
    s.t-=dt;
    if(s.shy>0){
      s.shy-=dt;
      m.scale.x=1+Math.sin(CLAY.raw*30)*0.05; m.scale.z=1-Math.sin(CLAY.raw*30)*0.05;
    } else if(s.spin>0){
      s.spin-=dt; m.rotation.y+=dt*7;
      if(Math.random()<dt*3) puff(m.position.x,0.25,m.position.z,0xd8d2c2,0.14,0.3,0.5);
    } else {
      m.scale.set(1,1,1);
      if(s.t<=0){
        if(Math.random()<0.3){ s.spin=1.1; } else { s.ang+=rand(-1.4,1.4); }
        s.t=rand(3,6.5);
      }
      const sp=0.85;
      let nx=m.position.x+Math.sin(s.ang)*sp*dt, nz=m.position.z+Math.cos(s.ang)*sp*dt;
      [nx,nz]=WORLD.collide(nx,nz,0.55);
      if(nz>5.4 && nx>9 && nx<13.2){ s.shy=0.9; s.ang+=Math.PI; SFX.play("boing",nx,nz); }
      nx=clamp(nx,4.3,19.9); nz=clamp(nz,-8.2,6.0);
      if(Math.hypot(nx-m.position.x,nz-m.position.z)<sp*dt*0.3) s.ang+=rand(1.2,2.4);
      m.position.x=nx; m.position.z=nz;
      m.rotation.y=damp(m.rotation.y,s.ang,6,dt);
    }
    if(m.userData.eyes) m.userData.eyes.userData.update(dt,0,0,null);
  }

  /* auger feed rumble */
  if(HOMESTEAD.augerT>0){
    HOMESTEAD.augerT-=dt;
    const s=MM.silo;
    if(s&&s.userData.auger) s.userData.auger.rotation.z=Math.sin(CLAY.raw*40)*0.02;
    if(Math.random()<dt*8) puff(-14+rand(-.4,.4),3.1,-4+rand(-.4,.4),0xc9a86a,0.3,0.9,0.7);
  }

  /* winch swings after a dawn unpack */
  if(HOMESTEAD.winchT>0){
    HOMESTEAD.winchT-=dt;
    const w=MM.winch;
    if(w&&w.userData.arm) w.userData.arm.rotation.y=0.6+Math.sin(CLAY.t*3)*0.5*(HOMESTEAD.winchT/2.4);
  }

  /* neon: the O gives up at random; glows at dusk; fame trickles while it shines */
  if(M.neon && MM.neon){
    const u=MM.neon.userData;
    u.ft-=dt;
    if(u.ft<=0){
      u.oLit=Math.random()<0.7;
      u.ft=u.oLit?rand(0.5,2.4):rand(0.07,0.45);
      if(u.plane){ u.plane.material.map=u.oLit?u.texA:u.texB; u.plane.material.needsUpdate=true; }
    }
    const glow=(CYCLE.phase==="evening"||CYCLE.phase==="night") && G_STATE.power!==false;
    if(u.light) u.light.intensity=damp(u.light.intensity, glow?(u.oLit?1.4:0.9):0, 6, dt);
    if(glow && CYCLE.phase==="evening"){
      G_STATE.fame+=dt*0.032;
      G_STATE.ledger.fameDelta+=dt*0.032;
    }
  }

  /* keg filler line: ready fermenter + clean keg beside it → filled */
  HOMESTEAD.fillT-=dt;
  if(HOMESTEAD.fillT<=0){
    HOMESTEAD.fillT=1;
    if(M.fillline){
      const anchors=[WORLD.anchors.ferm1, WORLD.anchors.ferm2, WORLD.anchors.ferm3];
      G_STATE.ferms.forEach((F,i)=>{
        if(!F || !F.beer || !F.ready) return;
        if(i===1 && !M.ferm2) return;
        if(i===2 && !M.coldroom) return;
        const a=anchors[i]; if(!a) return;
        const keg=nearestItem(a.x,a.z,3.4, it=>it.kind==="keg"&&it.data.state==="clean"&&!it.carriedBy&&it!==FORK.cargo);
        if(!keg) return;
        keg.data.state="filled"; keg.data.beer=F.beer; keg.data.pints=DATA.TUNE.pintsPerKeg;
        kegLook(keg);
        F.kegs=(F.kegs||1)-1;
        if(F.kegs<=0){ F.beer=null; F.ready=false; }
        SFX.play("pour",a.x,a.z);
        for(let p=0;p<4;p++) setTimeout(()=>puff(keg.x,1.2,keg.z,0xd8cfa8,0.28,0.9,0.7),p*140);
        toast(`🔁 Filler line kegged “${keg.data.beer.name}”`,"",2200);
      });
    }
  }

  /* conveyor: anything set on the belt rides east into the pub */
  if(M.conveyor && MM.conveyor){
    let busy=false;
    for(const it of ITEMS.list){
      if(it.carriedBy || it===FORK.cargo) continue;
      if(it.x>-5.4 && it.x<5.4 && it.z>-3.5 && it.z<-2.1){
        it.vx=damp(it.vx||0, 2.3, 8, dt);
        it.vz=damp(it.vz||0, (-2.8-it.z)*2, 6, dt);
        busy=true;
      }
    }
    if(busy) for(const r of MM.conveyor.userData.rollers) r.rotation.y+=dt*6;
  }

  /* the cold room breathes */
  if(M.coldroom && Math.random()<dt*0.7){
    puff(rand(-1,1),1.1,-9.9,0xe8f4f8,0.4,0.35,1.6);
  }
};
