"use strict";
/* ACTORS — clay people: the goober, customers, Copperhead */

const ACTORS = { list:[] };

function makePerson(opt={}){
  const skin=opt.skin??0xe8b48c, shirt=opt.shirt??0xd8d2c2, pants=opt.pants??0x4a5a7a;
  const size=opt.size??1;
  const g=new THREE.Group();
  const parts={};

  const legL=clayCapsule(0.16,0.3,pants,0.07,301); legL.position.set(-0.18,0.42,0);
  const legR=clayCapsule(0.16,0.3,pants,0.07,302); legR.position.set(0.18,0.42,0);
  const bootL=claySphere(0.17,0x4a3a2a,0.09,303); bootL.position.set(-0.18,0.14,0.05); bootL.scale.z=1.4;
  const bootR=bootL.clone(); bootR.position.x=0.18;
  g.add(legL,legR,bootL,bootR);

  const body=clayCapsule(0.42,0.5,shirt,0.06,304); body.position.y=1.05;
  body.scale.set(1,1,0.85);
  g.add(body);
  if(opt.overalls){
    const bib=clayBox(0.5,0.5,0.2,pants,0.05,305); bib.position.set(0,1.2,0.36); g.add(bib);
    const strapL=clayBox(0.12,0.5,0.1,pants,0.05,306); strapL.position.set(-0.2,1.45,0.3); strapL.rotation.x=0.4; g.add(strapL);
    const strapR=strapL.clone(); strapR.position.x=0.2; g.add(strapR);
  }
  if(opt.belly){ body.scale.set(1.15,1,1); }

  const armL=new THREE.Group(); armL.position.set(-0.5,1.35,0);
  const armLm=clayCapsule(0.13,0.42,opt.sleeves??shirt,0.08,307); armLm.position.y=-0.3; armL.add(armLm);
  const handL=claySphere(0.14,skin,0.1,308); handL.position.y=-0.62; armL.add(handL);
  const armR=armL.clone(); armR.position.x=0.5;
  g.add(armL,armR);

  const head=claySphere(0.42,skin,0.08,309); head.position.y=1.98;
  const nose=claySphere(0.11,skin,0.14,310); nose.position.set(0,-0.02,0.4); head.add(nose);
  const eyes=makeEyes(0.1,0.16); eyes.position.set(0,0.1,0.32); head.add(eyes);
  g.add(head);

  let hat=null;
  const hats={
    trucker(){ const h=new THREE.Group();
      const dome=claySphere(0.34,0xb5472e,0.07,311); dome.scale.y=0.6; h.add(dome);
      const brim=clayBox(0.42,0.06,0.36,0xe8d9a8,0.06,312); brim.position.set(0,0.02,0.4); h.add(brim); return h; },
    straw(){ const h=new THREE.Group();
      const brim=clayCyl(0.62,0.66,0.08,0xd8c27a,0.08,313); h.add(brim);
      const top=clayCyl(0.3,0.34,0.3,0xd8c27a,0.08,314); top.position.y=0.18; h.add(top); return h; },
    bucket(){ const h=new THREE.Group();
      const top=clayCyl(0.3,0.37,0.26,0xc9bd9a,0.07,319); top.position.y=0.1; h.add(top);
      const brim=clayCyl(0.46,0.52,0.1,0xb8ac8a,0.07,320); brim.position.y=-0.04; h.add(brim); return h; },
    beanie(){ const h=claySphere(0.36,0x4c7a4c,0.09,315); h.scale.y=0.75; return h; },
    cone(){ const h=clayCyl(0.02,0.3,0.5,0xe86a8a,0.06,316); h.position.y=0.2; return h; },
    snake(){ const h=new THREE.Group();
      const dome=claySphere(0.36,0x6a5a3a,0.1,317); dome.scale.y=0.65; h.add(dome);
      const band=clayCyl(0.34,0.34,0.12,0x8a3a2a,0.08,318); band.position.y=-0.05; h.add(band); return h; },
    ranger(){ const h=new THREE.Group();
      const brim=clayCyl(0.56,0.58,0.07,0x6a5a3a,0.07,319); h.add(brim);
      const top=claySphere(0.3,0x6a5a3a,0.08,320); top.position.y=0.16; top.scale.y=0.8; h.add(top); return h; },
    hood(){ const h=clayCyl(0.2,0.48,0.6,0x5a5a6a,0.1,321); h.position.y=0.1; return h; },
    foam(){ const h=new THREE.Group();
      const mug=clayCyl(0.3,0.3,0.5,0xe8a33d,0.06,322); mug.position.y=0.2; h.add(mug);
      const fo=claySphere(0.32,0xfff6e6,0.12,323); fo.position.y=0.5; fo.scale.y=0.5; h.add(fo); return h; },
    hard(){ const h=claySphere(0.37,0xe8c23d,0.05,324); h.scale.y=0.7; return h; },
    colander(){ const h=claySphere(0.38,0x9a9aa2,0.04,325); h.scale.y=0.6; return h; },
    wizard(){ const h=clayCyl(0.02,0.4,0.9,0x4a3a7a,0.07,326); h.position.y=0.35; return h; },
    coonskin(){ const h=new THREE.Group();
      const dome=claySphere(0.36,0x7a5a3a,0.12,327); dome.scale.y=0.6; h.add(dome);
      const tail=clayCapsule(0.09,0.4,0x5e402a,0.12,328); tail.position.set(0,-0.2,-0.4); tail.rotation.x=1.2; h.add(tail); return h; },
    leaf(){ const h=new THREE.Group();
      for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; const l=claySphere(0.12,pick([0xb5742e,0xc28a2e,0x9a4e2a]),0.15,329+i);
        l.position.set(Math.cos(a)*0.3,0,Math.sin(a)*0.3); l.scale.set(1,0.4,1.6); l.rotation.y=-a; h.add(l);} return h; },
  };
  const setHat=(key)=>{
    if(hat){ head.remove(hat); hat=null; }
    if(key && hats[key]){ hat=hats[key](); hat.position.y=0.36; head.add(hat); }
  };
  if(opt.hat) setHat(opt.hat);

  let acc=null;
  if(opt.accessory==="camera"){ acc=clayBox(0.3,0.22,0.16,0x2a2a2a,0.06,331); acc.position.set(0,1.15,0.5); g.add(acc); }
  if(opt.accessory==="pack"){ acc=clayBox(0.5,0.7,0.3,0xb5742e,0.07,332); acc.position.set(0,1.25,-0.5); g.add(acc); }
  if(opt.accessory==="lantern"){ acc=new THREE.Group();
    const lb=clayBox(0.18,0.26,0.18,0x8a8a5a,0.06,333); acc.add(lb);
    const gl=new THREE.PointLight(0xffd98a,0.5,4,2); acc.add(gl);
    acc.position.set(0.62,0.9,0.1); g.add(acc); }

  g.scale.setScalar(size);
  g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });

  const rig={
    group:g, parts:{head,body,armL,armR,legL,legR,bootL,bootR,eyes},
    x:0,z:0,y:0, vx:0,vz:0, facing:0,
    walkPhase:0, speedNow:0,
    baseHeadY:1.98, baseBodyY:1.05,
    carryPose:0, heavyPose:0, squash:0,
    greenT:0, headMat:head.material, greenMat:clayMat(0x9ac26a),
    setHat,
    setPos(x,z){ this.x=x; this.z=z; this.y=WORLD.getH(x,z); g.position.set(x,this.y,z); },
    face(a){ this.facing=a; },
  };
  ACTORS.list.push(rig);
  return rig;
}

/* per-frame procedural animation — uses CLAY.t so motion steps at 12fps */
function animatePerson(rig, dt){
  const g=rig.group, p=rig.parts;
  const sp=rig.speedNow;
  rig.walkPhase += sp*dt*2.6;
  const t=CLAY.t, wp=Math.floor(rig.walkPhase*CLAY.FPS)/CLAY.FPS; // quantized
  const swing=Math.sin(wp*6)* clamp(sp/5,0,1) * 0.7;
  const bob=Math.abs(Math.sin(wp*6))* clamp(sp/5,0,1) * 0.12;

  p.legL.rotation.x=swing; p.legR.rotation.x=-swing;
  p.bootL.position.z=0.05+Math.sin(wp*6)*0.14*clamp(sp/5,0,1);
  p.bootR.position.z=0.05-Math.sin(wp*6)*0.14*clamp(sp/5,0,1);

  const carry=rig.carryPose, heavy=rig.heavyPose;
  const armSwing=swing*0.8*(1-carry);
  p.armL.rotation.x=-armSwing - carry*(1.4+heavy*0.3);
  p.armR.rotation.x=armSwing - carry*(1.4+heavy*0.3);
  p.armL.rotation.z= 0.12+carry*0.25; p.armR.rotation.z=-0.12-carry*0.25;

  p.body.position.y=rig.baseBodyY+bob - heavy*0.1;
  p.body.rotation.x = heavy*-0.28 + clamp(sp/6,0,1)*0.1;
  p.head.position.y=rig.baseHeadY+bob*1.15 - heavy*0.16;
  p.head.rotation.x = heavy*0.3;

  // idle breathe + glance
  if(sp<0.4){
    p.body.scale.y = (p.body.userData.sy??1) * (1+Math.sin(t*2.2+g.position.x)*0.02);
    if(Math.random()<dt*0.4) p.head.rotation.y = rand(-0.6,0.6);
  } else p.head.rotation.y = damp(p.head.rotation.y,0,6,dt);

  // squash & stretch
  rig.squash=damp(rig.squash,0,9,dt);
  g.scale.y=(rig.groupScale??1)*(1-rig.squash);
  g.scale.x=g.scale.z=(rig.groupScale??1)*(1+rig.squash*0.55);

  // green face (bad beer)
  if(rig.greenT>0){ rig.greenT-=dt; p.head.material=rig.greenMat; }
  else p.head.material=rig.headMat;

  // eyes
  p.eyes.userData.update(dt, rig.vx, rig.vz, rig.look);
  if(p.eyes.userData.bt!==undefined){ p.eyes.userData.bt-=dt; if(p.eyes.userData.bt<=0){ p.eyes.scale.y=1; p.eyes.userData.bt=undefined; } }
  else if(Math.random()<dt*0.25) p.eyes.userData.blink();

  g.rotation.y = rig.facing;
}

/* ---- THE GOOBER (player) ---- */
function makeGoober(){
  const rig=makePerson({skin:0xe8b48c, shirt:0xe8e0cc, pants:0x4a5a7a, overalls:true, belly:true});
  rig.groupScale=1;
  rig.isPlayer=true;
  return rig;
}

/* ---- Copperhead standing at his still ---- */
function makeCopperhead(){
  const rig=makePerson({skin:0xd8a878, shirt:0x8a3a2a, pants:0x3a3a3a, hat:"snake", belly:true});
  rig.setPos(WORLD.anchors.copperheads.x+1.6, WORLD.anchors.copperheads.z+2.2);
  rig.face(Math.PI*0.85);
  rig.home={x:rig.x, z:rig.z};
  return rig;
}

/* ---- a bear (one of the Boys) ---- */
function makeBear(){
  const g=new THREE.Group();
  const body=clayCapsule(0.7,0.9,0x6a4a32,0.09,351); body.rotation.z=Math.PI/2; body.position.y=0.85; g.add(body);
  const head=claySphere(0.5,0x6a4a32,0.1,352); head.position.set(0,1.15,0.85); g.add(head);
  const snout=claySphere(0.22,0x8a6a4a,0.12,353); snout.position.set(0,1.05,1.28); g.add(snout);
  const nose=claySphere(0.09,0x241d14,0.1,354); nose.position.set(0,1.1,1.45); g.add(nose);
  for(const sx of [-1,1]){
    const ear=claySphere(0.14,0x5a3e2a,0.12,355); ear.position.set(sx*0.32,1.55,0.7); g.add(ear);
  }
  const eyes=makeEyes(0.09,0.2); eyes.position.set(0,1.3,1.2); g.add(eyes);
  for(const [lx,lz] of [[-0.4,0.5],[0.4,0.5],[-0.4,-0.5],[0.4,-0.5]]){
    const leg=clayCyl(0.16,0.2,0.7,0x5a3e2a,0.1,356); leg.position.set(lx,0.35,lz); g.add(leg);
  }
  const tail=claySphere(0.15,0x8a6a4a,0.15,357); tail.position.set(0,1.0,-1.0); g.add(tail);
  g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
  const rig={ group:g, x:0,z:0,y:0, facing:0, eyes,
    setPos(x,z){ this.x=x; this.z=z; this.y=WORLD.getH(x,z); g.position.set(x,this.y,z); } };
  return rig;
}

/* ---- a raccoon (sabotage & shoplifting departments) ---- */
function makeRaccoon(){
  const g=new THREE.Group();
  const body=clayCapsule(0.2,0.3,0x8a8a92,0.12,361); body.rotation.z=Math.PI/2; body.position.y=0.26; g.add(body);
  const head=claySphere(0.16,0x8a8a92,0.12,362); head.position.set(0,0.4,0.3); g.add(head);
  const mask=clayBox(0.26,0.09,0.1,0x2a2a2a,0.1,363); mask.position.set(0,0.43,0.4); g.add(mask);
  const tail=clayCapsule(0.09,0.35,0x6a6a72,0.15,364); tail.position.set(0,0.35,-0.42); tail.rotation.x=1.1; g.add(tail);
  for(let i=0;i<3;i++){ const ring=clayCyl(0.1,0.1,0.06,0x2a2a2a,0.1,365+i); ring.position.set(0,0.35+i*0.1,-0.42-i*0.03); ring.rotation.x=1.1; g.add(ring); }
  g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
  return g;
}

const CUSTOMER_LOOKS = {
  local:  ()=>({skin:pick([0xe8b48c,0xc98c5a,0x8a5a3a]), shirt:pick([0x7a6a4c,0x6a7a5a,0x8a5a4a]), pants:0x4a4a42, hat:pick(["trucker","straw",null,null]), belly:Math.random()<0.5}),
  tourist:()=>({skin:pick([0xf0c8a0,0xe8b48c]), shirt:pick([0xe86a5a,0xe8a33d,0x5a8ae8,0xe85a9a]), pants:pick([0xe8e0cc,0x8a8a92]), hat:pick(["cone","beanie",null]), accessory:"camera"}),
  hiker:  ()=>({skin:pick([0xe8b48c,0xc98c5a]), shirt:pick([0x4c7a4c,0x5a8a8a]), pants:0x5e402a, hat:pick(["beanie",null]), accessory:"pack"}),
  joe:    ()=>({skin:0xcabd9e, shirt:0x5a5a6a, pants:0x4a4a52, hat:"hood", accessory:"lantern"}),
  bob:    ()=>({skin:0xe8b48c, shirt:0xc9bd9a, pants:0x6a5a48, hat:"bucket", accessory:"camera"}),
};
function makeCustomer(type){
  const look=CUSTOMER_LOOKS[type]();
  const rig=makePerson(Object.assign({size:rand(0.88,1.08)}, look));
  rig.ctype=type;
  return rig;
}
