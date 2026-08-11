"use strict";
/* ALIVE — the world-life & goofy-VFX pass (free, pure view, no sim state).
   Ground cover (instanced), critters & birds, road & neighbor life, pub
   interior life, and beer physics: pours, drips, foam, burps, hiccups. */

const ALIVE = {
  squirrels:[], birds:[], butterflies:[], bubbles:[], burps:[],
  raccoon:null, raccoonT:rand(40,80), truck:null, truckT:rand(30,60),
  cat:null, lanterns:[], stream:null, dripT:rand(6,12),
  cope:null, copeGlow:null, nightF:0, boosted:false,
};

/* ---------- where grass is allowed to live ---------- */
function nearSeg2(x,z, ax,az,bx,bz){
  const dx=bx-ax, dz=bz-az, L2=dx*dx+dz*dz;
  let t=L2? ((x-ax)*dx+(z-az)*dz)/L2 : 0; t=clamp(t,0,1);
  return Math.hypot(x-(ax+dx*t), z-(az+dz*t));
}
ALIVE.isGrass = function(x,z){
  if(x<-58||x>58||z<-50||z>32) return false;
  if(x>-5.5&&x<6&&z>-14&&z<20) return false;                    // yard gravel + pad
  if(z>22.4&&z<31.6) return false;                              // road
  if(x>-21&&x<30&&z>-10.5&&z<8) return false;                   // buildings + porch strip
  if(x>-12.5&&x<-5.5&&z>18.9&&z<23) return false;               // MawMaw's stand
  if(x>-5.5&&x<3&&z>-14&&z<-8.5) return false;                  // cold room / bottling back lot
  if(nearSeg2(x,z, 11.5,23.4, 11.5,6.6)<2) return false;        // door path
  if(nearSeg2(x,z, 1,-13, 3,-22)<2 || nearSeg2(x,z, 3,-22, 6,-31.6)<2) return false;   // spring trail
  if(nearSeg2(x,z, 6,-31.6, 26,-44)<2.4) return false;          // glacier trail
  if(Math.abs(x+30.5)<6.5 && z<26) return false;                // crick
  if(Math.hypot(x-6,z+33)<4) return false;                      // spring pool
  if(Math.hypot(x+48,z+6)<8) return false;                      // Copperhead's yard
  if(Math.hypot(x-26,z+44)<6) return false;                     // glacier
  if(WORLD.getH(x,z)>6.2) return false;                         // rock line
  return true;
};

ALIVE.buildCover = function(){
  const mats={
    tuft:clayMat(0x86a85e), clover:clayMat(0x6f9a4e), pebble:clayMat(0x8f8a80),
    shroom:clayMat(0xc2704a),
  };
  const geos={
    tuft:  geoGet("cvr-tuft",  ()=>new THREE.ConeGeometry(0.07,0.4,5)),
    clover:geoGet("cvr-clv",   ()=>{ const g=new THREE.SphereGeometry(0.11,7,5); g.scale(1,0.4,1); return g; }),
    flower:geoGet("cvr-flw",   ()=>new THREE.SphereGeometry(0.055,6,5)),
    pebble:geoGet("cvr-peb",   ()=>{ const g=new THREE.DodecahedronGeometry(0.08); g.scale(1,0.55,1); return g; }),
    shroom:geoGet("cvr-shr",   ()=>{ const g=new THREE.SphereGeometry(0.1,7,5); g.scale(1,0.55,1); return g; }),
  };
  const M=new THREE.Matrix4(), Q=new THREE.Quaternion(), S=new THREE.Vector3(), P=new THREE.Vector3();
  const E=new THREE.Euler();
  const scatter=(kind, count, mat, opts={})=>{
    const im=new THREE.InstancedMesh(geos[kind], mat, count);
    let placed=0, guard=0;
    while(placed<count && guard++<count*14){
      let x,z;
      if(opts.nearTrees && WORLD.props.treeSpots && WORLD.props.treeSpots.length){
        const t=pick(WORLD.props.treeSpots); x=t.x+rand(-1.6,1.6); z=t.z+rand(-1.6,1.6);
      } else { x=rand(-56,56); z=rand(-48,31); }
      if(!ALIVE.isGrass(x,z)) continue;
      const h=WORLD.getH(x,z);
      const s=rand(0.7,1.5);
      P.set(x, h+(opts.y||0.12)*s, z);
      E.set(kind==="tuft"?rand(-0.35,0.35):0, rand(Math.PI*2), kind==="tuft"?rand(-0.35,0.35):0);
      Q.setFromEuler(E);
      S.set(s,s*(kind==="tuft"?rand(0.8,1.4):1),s);
      M.compose(P,Q,S);
      im.setMatrixAt(placed,M);
      if(opts.colors) im.setColorAt(placed, new THREE.Color(pick(opts.colors)));
      placed++;
    }
    im.count=placed;
    im.instanceMatrix.needsUpdate=true;
    if(im.instanceColor) im.instanceColor.needsUpdate=true;
    im.castShadow=false; im.receiveShadow=true;
    WORLD.scene.add(im);
    return placed;
  };
  const n = scatter("tuft",240,mats.tuft,{y:0.16})
    + scatter("clover",120,mats.clover,{y:0.04})
    + scatter("flower",90,new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.8}),{y:0.14,colors:[0xf4ead8,0xe8c23d,0xe88aa8,0xd8f0a0]})
    + scatter("pebble",60,mats.pebble,{y:0.04})
    + scatter("shroom",26,mats.shroom,{y:0.05,nearTrees:true});
  ALIVE.coverCount=n;
};

/* ---------- critters ---------- */
function mkSquirrel(){
  const g=new THREE.Group();
  const body=clayCapsule(0.11,0.14,0x8a5a3a,0.1,1101); body.rotation.x=Math.PI/2*0.85; body.position.y=0.14; g.add(body);
  const head=claySphere(0.09,0x9a6a44,0.1,1102); head.position.set(0,0.24,0.14); g.add(head);
  for(const ex of [-0.04,0.04]){ const ear=clayCyl(0.01,0.025,0.05,0x8a5a3a,0.1,1103); ear.position.set(ex,0.32,0.12); g.add(ear); }
  const tail=claySphere(0.12,0x9a6a44,0.2,1104); tail.scale.set(0.5,1.5,0.7); tail.position.set(0,0.28,-0.16); tail.rotation.x=-0.5; g.add(tail);
  g.userData.tail=tail;
  WORLD.scene.add(g);
  return g;
}
function mkBird(){
  const g=new THREE.Group();
  const col=pick([0x6a5a48,0x4a5a6a,0xb5472e]);
  const body=claySphere(0.09,col,0.1,1111); body.scale.z=1.3; body.position.y=0.08; g.add(body);
  const head=claySphere(0.06,col,0.1,1112); head.position.set(0,0.16,0.09); g.add(head);
  const beak=clayCyl(0.005,0.02,0.05,0xe8a33d,0.05,1113); beak.rotation.x=Math.PI/2; beak.position.set(0,0.155,0.16); g.add(beak);
  const wings=[];
  for(const sx of [-1,1]){
    const w=clayBox(0.14,0.02,0.08,col,0.06,1114); w.position.set(sx*0.09,0.1,0); g.add(w); wings.push(w);
  }
  g.userData.wings=wings;
  WORLD.scene.add(g);
  return g;
}
function mkButterfly(){
  const g=new THREE.Group();
  const col=pick([0xe8a33d,0xf4ead8,0xe86a5a]);
  const wingG=geoGet("bfly",()=>new THREE.CircleGeometry(0.12,6));
  const m=new THREE.MeshBasicMaterial({color:col, side:THREE.DoubleSide});
  const wl=new THREE.Mesh(wingG,m), wr=new THREE.Mesh(wingG,m);
  wl.position.x=-0.09; wr.position.x=0.09; g.add(wl); g.add(wr);
  g.userData.wl=wl; g.userData.wr=wr;
  WORLD.scene.add(g);
  return g;
}

ALIVE.buildCritters = function(){
  const spots=(WORLD.props.treeSpots||[]).filter(t=>ALIVE.isGrass(t.x,t.z)||true);
  for(let i=0;i<2;i++){
    const s=spots.length?pick(spots):{x:-14+i*30,z:-18};
    ALIVE.squirrels.push({g:mkSquirrel(), x:s.x, z:s.z, tx:s.x, tz:s.z, state:"sit", t:rand(1,3)});
  }
  for(let i=0;i<3;i++) ALIVE.spawnBird();
  for(let i=0;i<3;i++){
    const b={g:mkButterfly(), x:rand(-20,20), z:rand(8,20), ph:rand(10), h:rand(0.5,1.4)};
    ALIVE.butterflies.push(b);
  }
};
ALIVE.spawnBird = function(){
  let x=rand(-21,27);
  if(x>7&&x<16) x-=14;                            // not the driveway gap
  const b={g:mkBird(), x, z:23, y:0.92+WORLD.getH(x,23), state:"perch", t:rand(2,6), vy:0};
  b.g.position.set(b.x,b.y,b.z);
  b.g.rotation.y=rand(Math.PI*2);
  ALIVE.birds.push(b);
};

/* ---------- road & neighbors ---------- */
function mkPickup(){
  const g=new THREE.Group();
  const col=pick([0x8a4a3a,0x4a5a6a,0x4c6a4c,0xb08c5a]);
  const cab=clayBox(1.7,1.4,2.0,col,0.05,1121); cab.position.set(0,1.15,0.8); g.add(cab);
  const bed=clayBox(1.9,0.9,2.6,col,0.04,1122); bed.position.set(0,0.85,-1.5); g.add(bed);
  const win=clayBox(1.72,0.5,0.9,0x8ab0c8,0.02,1123); win.position.set(0,1.65,0.9); g.add(win);
  g.userData.wheels=[];
  for(const [wx,wz] of [[-0.95,1.2],[0.95,1.2],[-0.95,-1.7],[0.95,-1.7]]){
    const wh=clayCyl(0.5,0.5,0.35,0x2a2a2a,0.05,1124); wh.rotation.z=Math.PI/2; wh.position.set(wx,0.5,wz); g.add(wh);
    g.userData.wheels.push(wh);
  }
  WORLD.scene.add(g);
  return g;
}

ALIVE.buildNeighbors = function(){
  /* Copperhead putters at his still across the crick */
  const rig=makePerson({skin:0xc98c5a, shirt:0x5e4a3a, pants:0x3a3a32, hat:"straw", belly:true, size:1.02});
  const base=WORLD.anchors.copperheads||{x:-48,z:-6};
  rig.setPos(base.x+3.2, base.z+0.6);
  WORLD.scene.add(rig.group);
  ALIVE.cope={rig, base, state:"pause", t:rand(2,5), tx:base.x+3.2, tz:base.z+0.6};
  /* his window glows at night */
  const glow=new THREE.Mesh(geoGet("copewin",()=>new THREE.PlaneGeometry(0.9,0.7)),
    new THREE.MeshBasicMaterial({color:0xffc27a, transparent:true, opacity:0}));
  const h=WORLD.getH(base.x,base.z);
  glow.position.set(base.x+1.2, h+1.6, base.z+1.82);
  WORLD.scene.add(glow);
  ALIVE.copeGlow=glow;
};

/* ---------- pub interior life ---------- */
function mkCat(){
  const g=new THREE.Group();
  const col=pick([0xe8a33d,0x4a4a42,0xb0a890]);
  const body=claySphere(0.3,col,0.12,1131); body.scale.set(1.15,0.55,0.9); body.position.y=0.16; g.add(body);
  const head=claySphere(0.15,col,0.1,1132); head.position.set(0.26,0.26,0.05); g.add(head);
  g.userData.head=head;
  for(const ex of [-0.06,0.06]){ const ear=clayCyl(0.005,0.045,0.09,col,0.1,1133); ear.position.set(0.26+ex,0.4,0.05); g.add(ear); }
  const tail=clayCyl(0.035,0.05,0.5,col,0.12,1134); tail.position.set(-0.32,0.24,0); tail.rotation.z=1.1; g.add(tail);
  g.userData.tail=tail;
  WORLD.scene.add(g);
  return g;
}

ALIVE.buildPub = function(){
  /* wall clutter on the north wall (inner face z ≈ -8.72) */
  const wallZ=-8.72;
  const dart=new THREE.Group();
  const board=clayCyl(0.42,0.42,0.08,0xd8c8a0,0.03,1141); board.rotation.x=Math.PI/2; dart.add(board);
  const ring=clayCyl(0.44,0.44,0.06,0xb5472e,0.03,1142); ring.rotation.x=Math.PI/2; ring.position.z=-0.02; dart.add(ring);
  const bull=clayCyl(0.08,0.08,0.1,0x2a3038,0.03,1143); bull.rotation.x=Math.PI/2; dart.add(bull);
  const dartStick=clayCyl(0.015,0.015,0.22,0xe8a33d,0.05,1144); dartStick.rotation.x=Math.PI/2; dartStick.position.set(0.18,0.12,0.14); dart.add(dartStick);
  dart.position.set(5.2,2.7,wallZ); WORLD.scene.add(dart);
  /* the mounted trout (it watches) */
  const trout=new THREE.Group();
  const plaque=clayBox(0.9,0.55,0.08,0x6a4a30,0.04,1146); trout.add(plaque);
  const fish=clayCapsule(0.13,0.4,0x7a9a8a,0.08,1147); fish.rotation.z=Math.PI/2; fish.rotation.y=0.2; fish.position.z=0.14; trout.add(fish);
  const tail2=clayBox(0.16,0.2,0.04,0x7a9a8a,0.1,1148); tail2.position.set(-0.4,0.05,0.14); tail2.rotation.z=0.5; trout.add(tail2);
  const eye=claySphere(0.035,0xffffff,0.05,1149); eye.position.set(0.24,0.05,0.24); trout.add(eye);
  trout.position.set(15,2.85,wallZ); WORLD.scene.add(trout);
  /* antlers over the bar */
  const ant=new THREE.Group();
  for(const s of [-1,1]){
    const a1=clayCyl(0.03,0.045,0.5,0xd8c8a0,0.08,1151); a1.rotation.z=s*0.8; a1.position.set(s*0.2,0.1,0); ant.add(a1);
    const a2=clayCyl(0.02,0.03,0.3,0xd8c8a0,0.08,1152); a2.rotation.z=s*1.5; a2.position.set(s*0.38,0.28,0); ant.add(a2);
  }
  const mount=clayBox(0.4,0.3,0.08,0x5e402a,0.04,1153); mount.position.y=-0.1; ant.add(mount);
  ant.position.set(10.2,3.1,wallZ); WORLD.scene.add(ant);

  /* the pub cat */
  ALIVE.catSpots=[ {x:15.3,y:1.72,z:-5.9}, {x:17.5,y:1.38,z:0.2}, {x:7.5,y:1.38,z:0.8} ];
  const spot=ALIVE.catSpots[0];
  const cg=mkCat();
  cg.position.set(spot.x,spot.y,spot.z);
  ALIVE.cat={g:cg, spot:0, state:"nap", t:rand(40,90), flick:rand(3,7), breathe:rand(10)};

  /* table lanterns */
  for(const [tx,tz] of [[7.5,0.8],[13,2],[17.5,0.2]]){
    const L=new THREE.Group();
    const glass=clayCyl(0.09,0.11,0.2,0xe8d9a8,0.04,1160); glass.position.y=0.1;
    glass.material=glass.material.clone(); glass.material.transparent=true; glass.material.opacity=0.5; L.add(glass);
    const flame=new THREE.Mesh(geoGet("flame",()=>new THREE.SphereGeometry(0.045,6,5)),
      new THREE.MeshBasicMaterial({color:new THREE.Color(2.2,1.4,0.5)}));
    flame.position.y=0.1; L.add(flame);
    const light=new THREE.PointLight(0xffb060,0,4.5,2); light.position.y=0.35; L.add(light);
    L.position.set(tx,1.36,tz);
    WORLD.scene.add(L);
    ALIVE.lanterns.push({g:L, flame, light, ph:rand(10)});
  }
};

/* ---------- beer physics ---------- */
ALIVE.buildBeerVfx = function(){
  const stream=new THREE.Mesh(geoGet("stream",()=>new THREE.CylinderGeometry(0.035,0.05,1,6)),
    new THREE.MeshStandardMaterial({color:0xe8a33d, transparent:true, opacity:0.85, roughness:0.2}));
  stream.visible=false;
  WORLD.scene.add(stream);
  ALIVE.stream=stream;
};
ALIVE.bubble = function(x,y,z,kind){          // kind: hic | mug
  if(ALIVE.bubbles.length>16) return;
  const m=new THREE.Mesh(geoGet("hicbub",()=>new THREE.SphereGeometry(0.09,7,6)),
    new THREE.MeshStandardMaterial({color:0xcfe8f0, transparent:true, opacity:0.5, roughness:0.1}));
  m.position.set(x,y,z);
  const s=kind==="mug"?0.5:rand(0.8,1.3);
  m.scale.setScalar(s);
  WORLD.scene.add(m);
  ALIVE.bubbles.push({m, t:0, life:rand(0.8,1.5), vy:rand(0.9,1.4), ph:rand(10)});
};
ALIVE.burp = function(x,y,z,big){
  if(ALIVE.burps.length>8) return;
  const m=new THREE.Mesh(geoGet("burpcld",()=>new THREE.SphereGeometry(0.14,8,6)),
    new THREE.MeshStandardMaterial({color:0x8fb85a, transparent:true, opacity:0.5, roughness:0.9}));
  m.position.set(x,y,z);
  m.scale.setScalar(big?1.15:0.85);
  WORLD.scene.add(m);
  ALIVE.burps.push({m, t:0, life:big?1.5:1.1, vy:0.8, big});
};

/* ---------- setup + update ---------- */
ALIVE.setup = function(){
  ALIVE.buildCover();
  ALIVE.buildCritters();
  ALIVE.buildNeighbors();
  ALIVE.buildPub();
  ALIVE.buildBeerVfx();
};

ALIVE.update = function(dt){
  const P=MAIN.player;
  const night=(CYCLE&&(CYCLE.phase==="evening"||CYCLE.phase==="night"))?1:0;
  ALIVE.nightF=damp(ALIVE.nightF, night, 1.5, dt);

  /* HDR boosts once things exist: string lights, fireflies, neon — so bloom finds them */
  if(!ALIVE.boosted && WORLD.props.stringMat){
    ALIVE.boosted=true;
    WORLD.props.stringMat.color=new THREE.Color(1.7,1.25,0.6);
    if(WORLD.fireflies) WORLD.fireflies.material.color=new THREE.Color(1.5,1.9,0.9);
  }
  if(!ALIVE.neonBoost && ECON.machineMeshes && ECON.machineMeshes.neon){
    ALIVE.neonBoost=true;
    const u=ECON.machineMeshes.neon.userData;
    if(u.plane) u.plane.material.color=new THREE.Color(1.6,1.6,1.6);
  }

  /* squirrels */
  for(const s of ALIVE.squirrels){
    s.t-=dt;
    const near=P && Math.hypot(P.x-s.x,P.z-s.z)<2.6;
    if(s.state==="sit"){
      s.g.userData.tail.rotation.x=-0.5+Math.sin(CLAY.t*6)*0.25;
      if(near || s.t<=0){
        const spots=WORLD.props.treeSpots||[];
        let best=null,bd=1e9;
        for(let i=0;i<8;i++){
          const c=spots.length?pick(spots):{x:s.x+rand(-10,10),z:s.z+rand(-10,10)};
          const d=Math.hypot(c.x-s.x,c.z-s.z);
          const away=!near || Math.hypot(c.x-(P?P.x:0),c.z-(P?P.z:0))>Math.hypot(s.x-(P?P.x:0),s.z-(P?P.z:0));
          if(d>4 && d<26 && away && d<bd){ bd=d; best=c; }
        }
        if(best){ s.tx=best.x; s.tz=best.z; s.state="dash"; }
        else s.t=rand(1,3);
      }
    } else {
      const dx=s.tx-s.x, dz=s.tz-s.z, d=Math.hypot(dx,dz);
      if(d<0.4){ s.state="sit"; s.t=rand(2,6); }
      else {
        const sp=6;
        s.x+=dx/d*sp*dt; s.z+=dz/d*sp*dt;
        s.g.rotation.y=Math.atan2(dx,dz);
      }
    }
    const hop=s.state==="dash"? Math.abs(Math.sin(CLAY.raw*14))*0.28 : 0;
    s.g.position.set(s.x, WORLD.getH(s.x,s.z)+hop, s.z);
  }

  /* fence birds */
  for(let i=ALIVE.birds.length-1;i>=0;i--){
    const b=ALIVE.birds[i];
    if(b.state==="perch"){
      b.t-=dt;
      if(b.t<=0){ b.t=rand(2,6); b.g.rotation.y+=rand(-1,1); if(Math.random()<0.4) b.g.position.x+=rand(-0.3,0.3); }
      if(P && Math.hypot(P.x-b.g.position.x,P.z-b.g.position.z)<4.2){
        b.state="fly"; b.vy=2.2; b.vx=rand(-1,1)*3; b.vz=(Math.random()<0.5?-1:1)*rand(2,4);
        SFX.play("blip",b.g.position.x,b.g.position.z);
      }
    } else {
      b.vy+=dt*1.2;
      b.g.position.x+=b.vx*dt; b.g.position.y+=b.vy*dt; b.g.position.z+=b.vz*dt;
      for(const w of b.g.userData.wings) w.rotation.z=Math.sin(CLAY.raw*26)*0.9;
      if(b.g.position.y>13){
        WORLD.scene.remove(b.g);
        ALIVE.birds.splice(i,1);
        setTimeout(()=>{ if(ALIVE.birds.length<3) ALIVE.spawnBird(); }, rand(8000,20000));
      }
    }
  }

  /* butterflies (daylight only) */
  const day=CYCLE&&(CYCLE.phase==="morning"||CYCLE.phase==="afternoon");
  for(const bf of ALIVE.butterflies){
    bf.g.visible=!!day;
    if(!day) continue;
    bf.ph+=dt;
    bf.x+=Math.sin(bf.ph*0.7)*dt*1.6;
    bf.z+=Math.cos(bf.ph*0.53)*dt*1.4;
    bf.x=clamp(bf.x,-28,28); bf.z=clamp(bf.z,-8,21);
    const y=WORLD.getH(bf.x,bf.z)+bf.h+Math.sin(bf.ph*2.2)*0.25;
    bf.g.position.set(bf.x,y,bf.z);
    const flap=Math.sin(CLAY.raw*20+bf.ph);
    bf.g.userData.wl.rotation.y=-0.5-flap*0.7;
    bf.g.userData.wr.rotation.y=0.5+flap*0.7;
    bf.g.rotation.y=Math.atan2(Math.sin(bf.ph*0.7),Math.cos(bf.ph*0.53));
  }

  /* the raccoon cases the dumpster after dark */
  ALIVE.raccoonT-=dt;
  if(!ALIVE.raccoon && night && ALIVE.raccoonT<=0 && typeof makeRaccoon==="function"){
    const rc=makeRaccoon();
    rc.position.set(28,0,14);
    WORLD.scene.add(rc);
    ALIVE.raccoon={g:rc, state:"in", t:0, ang:0};
  }
  if(ALIVE.raccoon){
    const r=ALIVE.raccoon, D=WORLD.anchors.dumpster||{x:-3.6,z:11.6};
    const spooked=P && Math.hypot(P.x-r.g.position.x,P.z-r.g.position.z)<3;
    if(spooked && r.state!=="out"){ r.state="out"; SFX.play("blip",r.g.position.x,r.g.position.z); }
    if(r.state==="in"){
      const dx=D.x+1.6-r.g.position.x, dz=D.z+1.4-r.g.position.z, d=Math.hypot(dx,dz);
      if(d<0.5){ r.state="sniff"; r.t=rand(6,12); }
      else { r.g.position.x+=dx/d*1.3*dt; r.g.position.z+=dz/d*1.3*dt; r.g.rotation.y=Math.atan2(dx,dz); }
    } else if(r.state==="sniff"){
      r.t-=dt; r.ang+=dt*0.9;
      r.g.position.x=D.x+Math.sin(r.ang)*1.8;
      r.g.position.z=D.z+1.2+Math.cos(r.ang)*1.2;
      r.g.rotation.y=r.ang+Math.PI/2;
      r.g.position.y=Math.abs(Math.sin(CLAY.t*9))*0.05;
      if(r.t<=0 || !night) r.state="out";
    } else {
      const dx=34-r.g.position.x, dz=16-r.g.position.z, d=Math.hypot(dx,dz);
      r.g.position.x+=dx/d*3.4*dt; r.g.position.z+=dz/d*3.4*dt;
      r.g.rotation.y=Math.atan2(dx,dz);
      if(d<1.5){ WORLD.scene.remove(r.g); ALIVE.raccoon=null; ALIVE.raccoonT=rand(90,160); }
    }
  }

  /* pickup trucks rattle by */
  ALIVE.truckT-=dt;
  if(!ALIVE.truck && ALIVE.truckT<=0){
    const dirRight=Math.random()<0.5;
    const g=mkPickup();
    g.position.set(dirRight?-70:70, WORLD.getH(0,27), 26.5+rand(0,1.6));
    g.rotation.y=dirRight?Math.PI/2:-Math.PI/2;
    ALIVE.truck={g, v:dirRight?11:-11, putt:0};
  }
  if(ALIVE.truck){
    const t=ALIVE.truck;
    t.g.position.x+=t.v*dt;
    for(const w of t.g.userData.wheels) w.rotation.x+=t.v*dt*2;
    t.putt-=dt;
    if(t.putt<=0){ t.putt=0.9; SFX.play("putt",t.g.position.x,t.g.position.z); }
    if(Math.random()<dt*6) puff(t.g.position.x-Math.sign(t.v)*2.2,0.7,t.g.position.z,0x9a9a92,0.25,0.5,0.9);
    if(Math.abs(t.g.position.x)>72){ WORLD.scene.remove(t.g); ALIVE.truck=null; ALIVE.truckT=rand(80,150); }
  }

  /* Copperhead putters; his window glows after dark */
  if(ALIVE.cope){
    const c=ALIVE.cope, rig=c.rig;
    if(night>0.5){ rig.group.visible=false; }        // he turns in
    else {
      rig.group.visible=true;
      if(c.state==="pause"){
        c.t-=dt; rig.speedNow=0;
        if(c.t<=0){
          c.state="walk";
          c.tx=c.base.x+pick([3.2,-3.4,0.5]); c.tz=c.base.z+pick([0.6,1.4,-1.2]);
        }
      } else {
        const dx=c.tx-rig.x, dz=c.tz-rig.z, d=Math.hypot(dx,dz);
        if(d<0.3){ c.state="pause"; c.t=rand(3,7); rig.speedNow=0; }
        else {
          rig.x+=dx/d*1.1*dt; rig.z+=dz/d*1.1*dt;
          rig.facing=Math.atan2(dx,dz); rig.speedNow=1.1;
          rig.group.position.set(rig.x, WORLD.getH(rig.x,rig.z), rig.z);
        }
      }
      animatePerson(rig,dt);
    }
    if(ALIVE.copeGlow) ALIVE.copeGlow.material.opacity=ALIVE.nightF*0.85;
  }

  /* the pub cat */
  if(ALIVE.cat){
    const c=ALIVE.cat, g=c.g;
    c.t-=dt; c.flick-=dt;
    if(c.state==="nap"){
      const br=1+Math.sin(CLAY.t*2.2+c.breathe)*0.02;
      g.scale.set(br,1/br,br);
      const near=P && Math.hypot(P.x-g.position.x,P.z-g.position.z)<1.8;
      g.userData.head.position.y=damp(g.userData.head.position.y, near?0.38:0.26, 4, dt);
      if(c.flick<=0){ c.flick=near?rand(0.5,1.2):rand(3,7); g.userData.tail.rotation.y+=rand(-0.8,0.8); }
      if(c.t<=0){
        c.state="hop"; c.hopT=0;
        c.from={...ALIVE.catSpots[c.spot]};
        c.spot=(c.spot+1)%ALIVE.catSpots.length;
        c.to={...ALIVE.catSpots[c.spot]};
        SFX.play("blip",g.position.x,g.position.z);
      }
    } else {
      c.hopT+=dt/1.6;
      const f=Math.min(1,c.hopT);
      const x=lerp(c.from.x,c.to.x,f), z=lerp(c.from.z,c.to.z,f);
      const y=lerp(c.from.y,c.to.y,f)+Math.sin(f*Math.PI)*1.1;
      g.position.set(x,y,z);
      g.rotation.y=Math.atan2(c.to.x-c.from.x,c.to.z-c.from.z);
      if(f>=1){ c.state="nap"; c.t=rand(50,110); g.position.set(c.to.x,c.to.y,c.to.z); }
    }
  }

  /* lanterns flicker at night */
  for(const L of ALIVE.lanterns){
    const on=ALIVE.nightF*(G_STATE&&G_STATE.power===false?0:1);
    const fl=on*(0.75+Math.sin(CLAY.raw*11+L.ph)*0.12+Math.sin(CLAY.raw*23+L.ph*2)*0.06);
    L.light.intensity=fl*0.9;
    L.flame.scale.setScalar(0.6+fl*0.7);
  }

  /* pour stream at the taps */
  if(ALIVE.stream){
    const pouring=PUB.pourLock>0 && PUB.lastPourTap>=0;
    ALIVE.stream.visible=pouring;
    if(pouring){
      const a=WORLD.anchors["tap"+PUB.lastPourTap];
      if(a){
        ALIVE.stream.position.set(a.x, 2.32, -5.62);
        ALIVE.stream.scale.y=1.15;
        ALIVE.stream.rotation.z=Math.sin(CLAY.raw*30)*0.02;
        if(Math.random()<dt*14) puff(a.x+rand(-0.06,0.06),1.78,-5.6,0xfff2d8,0.09,0.4,0.4);
      }
    }
  }
  /* idle tap drips */
  ALIVE.dripT-=dt;
  if(ALIVE.dripT<=0 && G_STATE){
    ALIVE.dripT=rand(6,14);
    const loaded=[0,1].filter(i=>G_STATE.taps[i]&&G_STATE.taps[i].beer);
    if(loaded.length){
      const a=WORLD.anchors["tap"+pick(loaded)];
      if(a) ALIVE.bubble(a.x, 2.3, -5.62, "mug");
    }
  }
  /* foam wobble + mug bubbles on drinkers */
  for(const cu of PUB.customers){
    if(cu.mug && cu.mug.userData.foam){
      const f=cu.mug.userData.foam;
      f.scale.x=1+Math.sin(CLAY.raw*7+cu.seed)*0.09;
      f.scale.z=1+Math.cos(CLAY.raw*6+cu.seed)*0.09;
      if(cu.state==="drink" && Math.random()<dt*0.35)
        ALIVE.bubble(cu.rig.x+rand(-0.2,0.2), cu.rig.y+1.6, cu.rig.z+rand(-0.2,0.2), "mug");
    }
  }
  /* bubbles rise and pop */
  for(let i=ALIVE.bubbles.length-1;i>=0;i--){
    const b=ALIVE.bubbles[i];
    b.t+=dt;
    b.m.position.y+=b.vy*dt;
    b.m.position.x+=Math.sin(CLAY.raw*5+b.ph)*dt*0.25;
    if(b.t>=b.life){
      puff(b.m.position.x,b.m.position.y,b.m.position.z,0xcfe8f0,0.1,0.3,0.35);
      WORLD.scene.remove(b.m);
      ALIVE.bubbles.splice(i,1);
    }
  }
  /* burp clouds drift up and POP */
  for(let i=ALIVE.burps.length-1;i>=0;i--){
    const b=ALIVE.burps[i];
    b.t+=dt;
    b.m.position.y+=b.vy*dt;
    const f=b.t/b.life;
    b.m.scale.setScalar((b.big?1.15:0.85)*(1+f*0.5+Math.sin(CLAY.raw*13)*0.06));
    b.m.material.opacity=0.55*(1-f*0.6);
    if(b.t>=b.life){
      for(let p=0;p<4;p++) puff(b.m.position.x+rand(-.2,.2),b.m.position.y,b.m.position.z+rand(-.2,.2),0xa8c26a,0.14,0.6,0.5);
      SFX.play("plop",b.m.position.x,b.m.position.z);
      WORLD.scene.remove(b.m);
      ALIVE.burps.splice(i,1);
    }
  }
};
