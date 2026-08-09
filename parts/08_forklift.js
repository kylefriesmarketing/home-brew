"use strict";
/* FORKLIFT — steers like a shopping cart with opinions */

const FORK = { rig:null, x:2, z:11, heading:Math.PI*0.8, v:0, lift:0, liftT:0, mounted:false, cargo:null };

FORK.build = function(){
  const g=new THREE.Group();
  const body=clayBox(1.5,1.0,2.0,0xe8a33d,0.05,501); body.position.y=0.8; g.add(body);
  const seat=clayBox(0.8,0.3,0.7,0x4a3a2a,0.06,502); seat.position.set(0,1.4,0.2); g.add(seat);
  const back=clayBox(0.8,0.7,0.2,0x4a3a2a,0.06,503); back.position.set(0,1.8,0.55); g.add(back);
  const cage=clayBox(1.3,0.14,1.3,0x8a6a24,0.05,504); cage.position.set(0,2.3,0); g.add(cage);
  for(const [px,pz] of [[-0.6,-0.55],[0.6,-0.55],[-0.6,0.6],[0.6,0.6]]){
    const post=clayCyl(0.06,0.06,1.1,0x8a6a24,0.05,505); post.position.set(px,1.85,pz); g.add(post);
  }
  const counter=clayBox(1.2,0.7,0.6,0x5e402a,0.05,506); counter.position.set(0,0.6,1.05); g.add(counter);
  const eyes=makeEyes(0.11,0.2); eyes.position.set(0,0.75,1.4); g.add(eyes);
  FORK.eyes=eyes;
  for(const [wx,wz,r] of [[-0.8,-0.7,0.42],[0.8,-0.7,0.42],[-0.75,0.85,0.3],[0.75,0.85,0.3]]){
    const wh=clayCyl(r,r,0.3,0x2a2a2a,0.04,507); wh.rotation.z=Math.PI/2; wh.position.set(wx,r,wz); g.add(wh);
  }
  const mast=new THREE.Group();
  const rail1=clayBox(0.12,2.4,0.12,0x6a6a72,0.03,508); rail1.position.set(-0.5,1.2,0); mast.add(rail1);
  const rail2=rail1.clone(); rail2.position.x=0.5; mast.add(rail2);
  const carriage=new THREE.Group();
  const cross=clayBox(1.1,0.16,0.14,0x6a6a72,0.03,509); carriage.add(cross);
  const forkL=clayBox(0.14,0.08,1.3,0x8a8a92,0.02,510); forkL.position.set(-0.35,-0.1,-0.72); carriage.add(forkL);
  const forkR=forkL.clone(); forkR.position.x=0.35; carriage.add(forkR);
  carriage.position.y=0.25;
  mast.add(carriage);
  mast.position.set(0,0,-1.15);
  g.add(mast);
  g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
  WORLD.scene.add(g);
  FORK.rig=g; FORK.carriage=carriage; FORK.mast=mast;
  FORK.place();
};
FORK.place = function(){
  const g=FORK.rig;
  g.position.set(FORK.x, WORLD.getH(FORK.x,FORK.z), FORK.z);
  g.rotation.y=FORK.heading;
  FORK.carriage.position.y=0.25+FORK.lift*1.9;
};

FORK.forkTip = function(){
  const fx=Math.sin(FORK.heading), fz=Math.cos(FORK.heading);
  return { x:FORK.x - fx*1.9, z:FORK.z - fz*1.9, y:WORLD.getH(FORK.x,FORK.z)+0.35+FORK.lift*1.9 };
};

FORK.update = function(dt, input){
  if(FORK.mounted){
    const fwd=(input.up?1:0)-(input.down?1:0);
    const steer=(input.left?1:0)-(input.right?1:0);
    FORK.v = damp(FORK.v, fwd* (FORK.cargo?4.2:5.4), 2.2, dt);
    // shopping-cart steering: twitchy at speed, sloppy at crawl
    const twist = steer * dt * (0.8 + Math.abs(FORK.v)*0.24) * (FORK.v>=0?1:-1);
    FORK.heading += twist + Math.sin(CLAY.raw*7)*dt*0.06*Math.abs(FORK.v)*0.3;
    const fx=Math.sin(FORK.heading), fz=Math.cos(FORK.heading);
    let nx=FORK.x - fx*FORK.v*dt, nz=FORK.z - fz*FORK.v*dt;
    const [cx,cz]=WORLD.collide(nx,nz,1.15);
    if(cx!==nx||cz!==nz){ if(Math.abs(FORK.v)>2.5){ SFX.play("clank",FORK.x,FORK.z); shake(0.25);} FORK.v*=-0.25; }
    FORK.x=cx; FORK.z=cz;
    // lift
    FORK.lift = clamp(FORK.lift + ((input.lift?1:0)-(input.lower?1:0))*dt*0.8, 0, 1);
    // bump loose items
    for(const it of ITEMS.list){
      if(it.carriedBy||it===FORK.cargo) continue;
      const d=dist2(FORK.x-fx*1.2,FORK.z-fz*1.2,it.x,it.z);
      if(d<1.2){ const dd=Math.sqrt(d)||0.1;
        it.vx+=(it.x-(FORK.x-fx*1.2))/dd*Math.abs(FORK.v)*0.9;
        it.vz+=(it.z-(FORK.z-fz*1.2))/dd*Math.abs(FORK.v)*0.9;
        it.vy+=Math.abs(FORK.v)*0.15; }
    }
    // engine put-put
    if(Math.abs(FORK.v)>0.5 && Math.random()<dt*7) SFX.play("putt",FORK.x,FORK.z);
  } else {
    FORK.v=damp(FORK.v,0,4,dt);
  }
  if(FORK.eyes) FORK.eyes.userData.update(dt, FORK.v*0.4, 0, null);
  // cargo pickup/follow
  const tip=FORK.forkTip();
  if(FORK.cargo){
    const c=FORK.cargo;
    c.x=damp(c.x,tip.x,18,dt); c.z=damp(c.z,tip.z,18,dt); c.y=damp(c.y,tip.y,14,dt);
    c.rot=FORK.heading;
    c.mesh.position.set(c.x,c.y,c.z); c.mesh.rotation.set(0,c.rot,0);
    // drop when lowered to ground
    if(FORK.lift<0.06 && !FORK.mounted){ FORK.cargo=null; }
    if(FORK.lift<0.05 && FORK.mounted && !MAIN.input.lower) {/* keep until player lowers fully */}
    if(FORK.lift<=0.01){ FORK.cargo=null; toast("Crate set down.","",1400); }
  } else if(FORK.mounted && FORK.lift>0.05){
    const cand=nearestItem(tip.x,tip.z,1.0, it=>(it.kind==="crate"||it.kind==="keg") && Math.abs(it.y-(tip.y-0.35))<1.2);
    if(cand && FORK.lift>0.08 && FORK.lift<0.95 && MAIN.input.lift){ FORK.cargo=cand; SFX.play("clank",FORK.x,FORK.z); }
  }
  FORK.place();
};
