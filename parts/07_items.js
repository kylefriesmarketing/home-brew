"use strict";
/* ITEMS — physical stuff you grab, haul, drop, and lose down the crick */

const ITEMS = { list:[] };

function itemMesh(kind, data){
  const g=new THREE.Group();
  if(kind==="bucket"){
    const b=clayCyl(0.32,0.24,0.5,0x8a8a92,0.05,401); b.position.y=0.25; g.add(b);
    const handle=new THREE.Mesh(geoGet("buckethandle",()=>new THREE.TorusGeometry(0.26,0.04,6,12,Math.PI)), clayMat(0x6a6a72));
    handle.position.y=0.5; g.add(handle);
    const water=new THREE.Mesh(geoGet("bucketwater",()=>new THREE.CircleGeometry(0.27,12)),
      new THREE.MeshStandardMaterial({color:0x88b8cc, roughness:0.25}));
    water.rotation.x=-Math.PI/2; water.position.y=0.42; water.visible=false; g.add(water);
    g.userData.water=water;
  }
  else if(kind==="keg"){
    const body=clayCyl(0.5,0.5,0.95,0xb0a89a,0.03,402,14); body.position.y=0.5; g.add(body);
    const hoop1=clayCyl(0.53,0.53,0.08,0x6a6a72,0.02,403,14); hoop1.position.y=0.22; g.add(hoop1);
    const hoop2=hoop1.clone(); hoop2.position.y=0.8; g.add(hoop2);
    const cap=clayCyl(0.14,0.14,0.1,0x8a8a92,0.05,404); cap.position.y=1.0; g.add(cap);
    const band=clayCyl(0.52,0.52,0.2,0xe8a33d,0.02,405,14); band.position.y=0.5; band.visible=false; g.add(band);
    const grime=clayCyl(0.52,0.54,0.3,0x6a7a4a,0.09,406,14); grime.position.y=0.32; grime.visible=false; g.add(grime);
    g.userData.band=band; g.userData.grime=grime;
  }
  else if(kind==="crate"){
    const big=data&&data.machine;
    const s=big?1.6:0.9;
    const box=clayBox(s,s*0.8,s,0xb08c5a,0.04,407+(big?1:0)); box.position.y=s*0.4; g.add(box);
    const lid=clayBox(s*1.04,s*0.1,s*1.04,0x9a7a4c,0.05,409); lid.position.y=s*0.82; g.add(lid);
    const stencil=clayBox(s*0.7,s*0.3,0.03,0x5e402a,0.02,410); stencil.position.set(0,s*0.42,s*0.51); g.add(stencil);
  }
  else if(kind==="ing"){
    const def=DATA.INGREDIENTS[data.type], col=def.col;
    switch(def.look){
      case "sack": { const s=clayCapsule(0.3,0.3,col,0.12,411); s.position.y=0.4; s.scale.y=1.15; g.add(s);
        const tie=claySphere(0.1,0x8a6a44,0.1,412); tie.position.y=0.85; g.add(tie); break; }
      case "cone": { for(let i=0;i<3;i++){ const c=clayCyl(0.06,0.16,0.3,col,0.15,413+i);
        c.position.set(rand(-.12,.12),0.2,rand(-.12,.12)); c.rotation.z=rand(-.4,.4); g.add(c);} break; }
      case "berries": { for(let i=0;i<5;i++){ const b=claySphere(0.09,col,0.1,416+i);
        b.position.set(rand(-.12,.12),0.12+rand(.12),rand(-.12,.12)); g.add(b);} break; }
      case "jar": { const j=clayCyl(0.17,0.17,0.4,0xd8d8d0,0.03,421); j.position.y=0.22;
        j.material=new THREE.MeshStandardMaterial({color:0xd8d8d0,transparent:true,opacity:0.55,roughness:0.2}); g.add(j);
        const fill=clayCyl(0.14,0.14,0.28,col,0.03,422); fill.position.y=0.18; g.add(fill);
        const lid2=clayCyl(0.18,0.18,0.08,0x8a6a44,0.05,423); lid2.position.y=0.46; g.add(lid2); break; }
      case "fruit": { for(let i=0;i<2;i++){ const f=claySphere(0.15,col,0.08,424+i);
        f.position.set(i*0.2-0.1,0.15,rand(-.06,.06)); g.add(f);
        const stem=clayCyl(0.02,0.02,0.1,0x5e402a,0.1,426); stem.position.set(i*0.2-0.1,0.32,0); g.add(stem);} break; }
      case "bundle": { for(let i=0;i<4;i++){ const s=clayCapsule(0.05,0.3,col,0.15,427+i);
        s.position.set(rand(-.08,.08),0.22,rand(-.08,.08)); s.rotation.z=rand(-.25,.25); g.add(s);}
        const bulb=claySphere(0.09,0xe8e0d0,0.1,431); bulb.position.y=0.05; g.add(bulb); break; }
      case "pile": { for(let i=0;i<6;i++){ const p=claySphere(0.07,[0xe85a8a,0x5ae8a0,0xe8d24c,0x5a9ae8][i%4],0.08,432+i);
        p.position.set(rand(-.14,.14),0.07+rand(.1),rand(-.14,.14)); g.add(p);} break; }
      case "fish": { const b=clayCapsule(0.14,0.4,col,0.08,438); b.rotation.z=Math.PI/2; b.position.y=0.16; g.add(b);
        const tail=clayBox(0.16,0.2,0.04,col,0.1,439); tail.position.set(-0.38,0.16,0); tail.rotation.z=0.6; g.add(tail);
        const eye=claySphere(0.04,0xffffff,0.05,440); eye.position.set(0.26,0.22,0.1); g.add(eye);
        const stink=claySphere(0.05,0x9ac26a,0.2,441); stink.position.set(0,0.42,0); stink.material=new THREE.MeshBasicMaterial({color:0x9ac26a,transparent:true,opacity:0.4}); g.add(stink);
        break; }
      case "sock": { const s1=clayCapsule(0.1,0.3,col,0.12,442); s1.position.y=0.22; s1.rotation.x=0.4; g.add(s1);
        const s2=clayCapsule(0.09,0.2,col,0.12,443); s2.position.set(0,0.05,0.14); s2.rotation.x=1.4; g.add(s2);
        const stripe=clayCyl(0.11,0.11,0.06,0xb5472e,0.05,444); stripe.position.y=0.36; stripe.rotation.x=0.4; g.add(stripe); break; }
      case "crayon": { const c=clayCyl(0.07,0.07,0.44,col,0.02,445); c.position.y=0.22; g.add(c);
        const tip=clayCyl(0.01,0.07,0.12,col,0.02,446); tip.position.y=0.5; g.add(tip);
        const label=clayCyl(0.075,0.075,0.2,0xe8e0cc,0.02,447); label.position.y=0.2; g.add(label); break; }
      case "letter": { const env=clayBox(0.36,0.04,0.26,col,0.02,448); env.position.y=0.05; env.rotation.y=0.3; g.add(env);
        const heart=claySphere(0.045,0xb5472e,0.08,449); heart.scale.y=0.5; heart.position.set(0.05,0.09,0.02); g.add(heart); break; }
    }
  }
  else if(kind==="plate"){
    const d=DATA.DISHES[data.dish];
    const plate=clayCyl(0.3,0.26,0.06,0xe8e0d0,0.03,458); plate.position.y=0.05; g.add(plate);
    if(data.dish==="pretzel"){ const p=new THREE.Mesh(geoGet("pretz",()=>new THREE.TorusKnotGeometry(0.13,0.05,30,6,2,3)), clayMat(d.col)); p.position.y=0.16; p.rotation.x=Math.PI/2; g.add(p); }
    else if(data.dish==="wings"){ for(let i=0;i<3;i++){ const w=clayCapsule(0.06,0.12,d.col,0.15,459+i); w.position.set(rand(-.12,.12),0.13,rand(-.1,.1)); w.rotation.z=rand(3); g.add(w);} }
    else if(data.dish==="pickles"){ for(let i=0;i<4;i++){ const p=clayCyl(0.06,0.06,0.14,d.col,0.1,462+i); p.position.set(rand(-.13,.13),0.12,rand(-.1,.1)); p.rotation.x=Math.PI/2; p.rotation.y=rand(3); g.add(p);} }
    else { const c=clayCyl(0.2,0.22,0.12,d.col,0.06,466); c.position.y=0.13; g.add(c); }
  }
  else if(kind==="mug"){
    const m=clayCyl(0.13,0.11,0.24,0xd8c8a8,0.04,450); m.position.y=0.12; g.add(m);
    const foam=claySphere(0.13,0xfff6e6,0.1,451); foam.position.y=0.28; foam.scale.y=0.5; g.add(foam);
    g.userData.foam=foam;
  }
  else if(kind==="jarGift"){
    const j=clayCyl(0.2,0.2,0.44,0xd8d8d0,0.03,452); j.position.y=0.24;
    j.material=new THREE.MeshStandardMaterial({color:0xe8e8e0,transparent:true,opacity:0.5,roughness:0.15}); g.add(j);
    const shine=clayCyl(0.17,0.17,0.36,0xcfe8ff,0.03,453); shine.position.y=0.22;
    shine.material=new THREE.MeshStandardMaterial({color:0xcfe8ff, emissive:0x445a88, roughness:0.3}); g.add(shine);
    const lid=clayCyl(0.21,0.21,0.09,0x8a6a44,0.04,454); lid.position.y=0.5; g.add(lid);
    const note=clayBox(0.3,0.22,0.02,0xf4ead8,0.03,455); note.position.set(0.2,0.3,0.16); note.rotation.y=0.5; g.add(note);
  }
  else if(kind==="trophy"){
    const cup=clayCyl(0.25,0.12,0.4,0xe8c23d,0.05,456); cup.position.y=0.5; g.add(cup);
    const base=clayBox(0.34,0.16,0.34,0x6a4a30,0.04,457); base.position.y=0.1; g.add(base);
  }
  else if(kind==="mop"){
    const stick=clayCyl(0.05,0.06,1.5,0x9a7a52,0.05,461); stick.position.y=0.8; stick.rotation.z=0.12; g.add(stick);
    const head=claySphere(0.2,0xe8e0cc,0.25,462); head.position.set(0.16,0.12,0); head.scale.y=0.6; g.add(head);
    for(let i=0;i<5;i++){ const strand=clayCapsule(0.035,0.16,0xd8d0b8,0.2,463+i);
      strand.position.set(0.16+rand(-.12,.12),0.1,rand(-.12,.12)); strand.rotation.z=rand(-.5,.5); g.add(strand); }
  }
  g.traverse(o=>{ if(o.isMesh && o.castShadow===undefined) o.castShadow=true; });
  return g;
}

function spawnItem(kind, x, z, data={}){
  const mesh=itemMesh(kind, data);
  WORLD.scene.add(mesh);
  const massMap={ bucket:"light", ing:"light", mug:"light", jarGift:"light", trophy:"light", plate:"light",
    keg:"mid", crate: data.machine?"heavy":"mid" };
  const it={
    kind, data, mesh,
    x, z, y:WORLD.getH(x,z), vx:0, vy:0, vz:0, rot:rand(Math.PI*2), rotV:0,
    r: kind==="crate"?(data.machine?0.9:0.5) : kind==="keg"?0.55 : 0.3,
    mass: massMap[kind]||"light",
    carriedBy:null, dead:false,
    hold:{x:0,y:0,z:0},
  };
  mesh.position.set(it.x,it.y,it.z);
  ITEMS.list.push(it);
  return it;
}

function killItem(it){
  it.dead=true;
  if(it.mesh.parent) it.mesh.parent.remove(it.mesh);
  const i=ITEMS.list.indexOf(it); if(i>=0) ITEMS.list.splice(i,1);
}

/* keg visual state */
function kegLook(it){
  const u=it.mesh.userData;
  u.band.visible = it.data.state==="filled" || it.data.state==="tapped";
  if(u.band.visible && it.data.beer){ u.band.material=clayMat(parseInt(it.data.beer.tierCol.replace("#","0x"))); }
  u.grime.visible = it.data.state==="dirty";
}

/* physics + carry follow */
ITEMS.update = function(dt){
  const P = MAIN.player;
  for(const it of ITEMS.list){
    if(it.dead) continue;
    /* ⚠️ M6 — forklift cargo is never given `carriedBy`, so this skip missed it
       and ITEMS (which runs AFTER FORK) applied full gravity on top of FORK's
       positioning. `vy` grew at 22/s, so after ~5s the crate hung ~8 units
       below the forks and rocketed on release — and it was eligible for the
       crick-drift kill branch while airborne. FORK owns its cargo entirely. */
    if(it===FORK.cargo){ it.vx=it.vy=it.vz=0; continue; }
    if(it.carriedBy){
      const rig=it.carriedBy;
      const heavy=it.mass==="heavy"?1: it.mass==="mid"?0.4:0;
      const fx=Math.sin(rig.facing), fz=Math.cos(rig.facing);
      const ty=rig.y + (it.mass==="heavy"?0.55: 1.05-heavy*0.25);
      const tx=rig.x+fx*(0.75+heavy*0.35), tz=rig.z+fz*(0.75+heavy*0.35);
      it.x=damp(it.x,tx,14,dt); it.y=damp(it.y,ty,12,dt); it.z=damp(it.z,tz,14,dt);
      it.rot=damp(it.rot,rig.facing,10,dt);
      it.vx=rig.vx; it.vz=rig.vz; it.vy=0;
      it.mesh.position.set(it.x,it.y,it.z);
      it.mesh.rotation.set(0,it.rot, Math.sin(CLAY.t*7)*0.04*(1+heavy));
      /* IK-LITE: the carry pose used to be a FIXED arm rotation while the item
         damped independently to a point in front of the chest — so the hands
         and the cargo were never actually connected, and a heavy crate floated
         with hands nowhere near it. Aim the arms AT the thing being carried.
         Runs after animatePerson, so this write wins for the frame. */
      const pa=rig.parts;
      if(pa && pa.armL && pa.armR){
        const sh=pa.armL.parent || rig.group;
        sh.updateMatrixWorld(true);
        const sp=new THREE.Vector3(); pa.armL.getWorldPosition(sp);
        const fwd=Math.hypot(it.x-rig.x, it.z-rig.z);
        const dy=it.y-sp.y;
        const pitch=-Math.atan2(Math.max(fwd,0.01), -dy);
        /* ⚠️ PLAYTEST (Kyle): "the arms glitch out" — half of it was HERE.
           This used to damp FROM `pa.armL.rotation.x`, the value animatePerson
           had just written from its own walk-swing spring. Two systems owning
           one property: the IK could never converge (it only ever moved a
           fraction toward the target before being overwritten) and the arm
           vibrated between the swing pose and the carry pose every frame.
           The IK now keeps its OWN damped state and ASSIGNS — one authority
           for the value, so it actually reaches the cargo and holds still. */
        const grip=0.1+ (it.r||0.3)*0.35;
        rig._ikPitch = damp(rig._ikPitch ?? pitch, pitch, 16, dt);
        rig._ikGrip  = damp(rig._ikGrip  ?? grip,  grip,  14, dt);
        pa.armL.rotation.x=pa.armR.rotation.x=rig._ikPitch;
        pa.armL.rotation.z= rig._ikGrip;
        pa.armR.rotation.z=-rig._ikGrip;
      }
      continue;
    }
    // free physics
    const gH=WORLD.getH(it.x,it.z);
    it.vy -= 22*dt;
    it.x += it.vx*dt; it.y += it.vy*dt; it.z += it.vz*dt;
    if(it.y < gH){
      it.y=gH;
      if(it.vy<-3){ it.vy=-it.vy*0.32; SFX.play("thud", it.x, it.z); if(it.kind==="keg") SFX.play("kegbounce", it.x,it.z); }
      else it.vy=0;
      // ground friction + slope roll for kegs
      const f = it.kind==="keg" ? 0.995 : 0.86;
      it.vx*=Math.pow(1-0.9*dt,1); it.vz*=Math.pow(1-0.9*dt,1);
      it.vx*=f; it.vz*=f;
      if(it.kind==="keg"){
        const e=0.35;
        const gx=(WORLD.getH(it.x+e,it.z)-WORLD.getH(it.x-e,it.z))/(2*e);
        const gz=(WORLD.getH(it.x,it.z+e)-WORLD.getH(it.x,it.z-e))/(2*e);
        it.vx += -gx*6*dt; it.vz += -gz*6*dt;
      }
    }
    const [cx,cz]=WORLD.collide(it.x,it.z,it.r);
    if(cx!==it.x){ it.vx*=-0.3; it.x=cx; }
    if(cz!==it.z){ it.vz*=-0.3; it.z=cz; }
    // rolling look
    const sp=Math.hypot(it.vx,it.vz);
    if(it.kind==="keg" && sp>0.5 && it.y<=gH+0.05){
      it.mesh.rotation.z += sp*dt*1.4;
    }
    it.mesh.position.set(it.x,it.y,it.z);
    // gone down the crick?
    if(it.x<-26.5 && it.y < WORLD.getH(it.x,it.z)+0.4 && Math.abs(it.x+30.5)<4){
      it.vz += 3.2*dt*10*dt; // slow drift south
      it.z += 1.6*dt;
      it.mesh.rotation.z += dt*2;
      if(it.z>24){
        if(it.kind==="keg") toast("🛶 A keg has gone to see the ocean. Godspeed.", "bad");
        else toast("The crick claimed your "+(it.kind==="ing"?DATA.INGREDIENTS[it.data.type].name:it.kind)+".", "bad");
        killItem(it);
      }
    }
  }
};

/* pickup helpers */
function nearestItem(x,z,r, filter){
  let best=null, bd=r*r;
  for(const it of ITEMS.list){
    if(it.dead||it.carriedBy) continue;
    if(filter && !filter(it)) continue;
    const d=dist2(x,z,it.x,it.z);
    if(d<bd){ bd=d; best=it; }
  }
  return best;
}
function itemLabel(it){
  if(it.kind==="ing") return DATA.INGREDIENTS[it.data.type].name;
  if(it.kind==="bucket") return it.data.tier?`Bucket (${DATA.WATERS[it.data.tier].name})`:"Empty Bucket";
  if(it.kind==="keg"){
    if(it.data.state==="filled") return `Keg — ${it.data.beer.name}`;
    if(it.data.state==="dirty") return "Dirty Keg";
    return "Clean Keg";
  }
  if(it.kind==="crate") return it.data.machine? `CRATE: ${DATA.MACHINES[it.data.machine].name}` : "Supply Crate";
  if(it.kind==="jarGift") return "…a mystery jar?";
  if(it.kind==="plate") return DATA.DISHES[it.data.dish].name;
  return it.kind;
}
