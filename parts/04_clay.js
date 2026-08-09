"use strict";
/* CLAY — the claymation toolkit: lumpy geometry, thumbprint materials, 12fps time */

const CLAY = {
  t: 0, raw: 0,               // t = quantized (12fps) time for character/prop anim, raw = smooth
  FPS: 12,
  step(dt){ this.raw += dt; this.t = Math.floor(this.raw*this.FPS)/this.FPS; },
};

/* displace vertices with cheap trig noise → hand-molded lumps */
function lumpify(geo, amp=0.06, freq=2.4, seed=0){
  const p = geo.attributes.position, n = p.count;
  for(let i=0;i<n;i++){
    const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
    const d = Math.sin(x*freq+seed)*Math.cos(y*freq*1.3+seed*2) + Math.sin(z*freq*0.8+seed*3)*0.7
            + Math.sin((x+y+z)*freq*2.1+seed)*0.35;
    const m = 1 + d*amp;
    p.setXYZ(i, x*m, y*m, z*m);
  }
  geo.computeVertexNormals();
  return geo;
}

const _matCache = {};
function clayMat(color, opts={}){
  const key = color + "|" + JSON.stringify(opts);
  if(_matCache[key]) return _matCache[key];
  const m = new THREE.MeshStandardMaterial(Object.assign({
    color, roughness: 0.88, metalness: 0.02,
  }, opts));
  _matCache[key] = m; return m;
}

/* geometry cache */
const _geoCache = {};
function geoGet(key, maker){ return _geoCache[key] || (_geoCache[key] = maker()); }

function claySphere(r, color, amp=0.07, seed=1){
  const g = new THREE.Mesh(geoGet(`sph${r}|${amp}|${seed}`, ()=>lumpify(new THREE.SphereGeometry(r, 14, 12), amp, 2.6/r, seed)), clayMat(color));
  g.castShadow = true; return g;
}
function clayBox(w,h,d,color, amp=0.05, seed=2){
  const g = new THREE.Mesh(geoGet(`box${w}|${h}|${d}|${amp}|${seed}`, ()=>lumpify(new THREE.BoxGeometry(w,h,d,3,3,3), amp, 2.0, seed)), clayMat(color));
  g.castShadow = true; return g;
}
function clayCyl(rt,rb,h,color, amp=0.05, seed=3, radial=12){
  const g = new THREE.Mesh(geoGet(`cyl${rt}|${rb}|${h}|${amp}|${seed}`, ()=>lumpify(new THREE.CylinderGeometry(rt,rb,h,radial,3), amp, 2.2, seed)), clayMat(color));
  g.castShadow = true; return g;
}
function clayCapsule(r,len,color, amp=0.06, seed=4){
  const g = new THREE.Mesh(geoGet(`cap${r}|${len}|${amp}|${seed}`, ()=>lumpify(new THREE.CapsuleGeometry(r,len,4,10), amp, 2.4/r*0.6, seed)), clayMat(color));
  g.castShadow = true; return g;
}

/* googly eyes: white ball + pupil that lags & wanders */
function makeEyes(r=0.09, gap=0.11){
  const grp = new THREE.Group();
  const mkEye = (sx)=>{
    const e = new THREE.Group();
    const ball = new THREE.Mesh(geoGet("eyeball"+r, ()=>new THREE.SphereGeometry(r,10,8)), clayMat(0xf7f2e6, {roughness:.5}));
    const pupil = new THREE.Mesh(geoGet("pupil"+r, ()=>new THREE.SphereGeometry(r*0.45,8,6)), clayMat(0x241d14, {roughness:.4}));
    pupil.position.z = r*0.72;
    e.add(ball); e.add(pupil); e.position.x = sx*gap;
    e.userData.pupil = pupil; e.userData.px=0; e.userData.py=0;
    grp.add(e); return e;
  };
  mkEye(-1); mkEye(1);
  grp.userData.update = (dt, vx, vz, look)=>{
    for(const e of grp.children){
      const u=e.userData;
      const wob = Math.sin(CLAY.raw*3.1 + e.position.x*9)*0.15;
      const tx = clamp((look?look.x:0) + (vx||0)*0.03 + wob, -.8,.8);
      const ty = clamp((look?look.y:0) + wob*0.6, -.6,.6);
      u.px = damp(u.px, tx, 6, dt); u.py = damp(u.py, ty, 6, dt);
      const r0 = e.children[0].geometry.parameters.radius;
      e.userData.pupil.position.set(u.px*r0*0.5, u.py*r0*0.5, r0*0.72);
    }
  };
  grp.userData.blink = ()=>{ grp.scale.y = 0.12; grp.userData.bt = 0.12; };
  return grp;
}

/* squash & stretch driver: node.userData.squash = amount; call claySquash in loop */
function claySquash(node, dt){
  const u = node.userData;
  if(u.squash === undefined) return;
  u.squash = damp(u.squash, 0, 8, dt);
  const s = u.squash;
  node.scale.set(1+s*0.6, 1-s, 1+s*0.6);
}

/* simple smoke/steam puff pool (world-positioned sprites) */
const PUFFS = { list:[], max:90 };
function puff(x,y,z, col=0xffffff, size=0.5, up=0.8, life=1.4){
  let p;
  if(PUFFS.list.length < PUFFS.max){
    p = new THREE.Mesh(geoGet("puff", ()=>new THREE.SphereGeometry(1, 7, 6)),
      new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0.5, depthWrite:false}));
    WORLD.scene.add(p); PUFFS.list.push(p);
  } else { p = PUFFS.list[irand(PUFFS.list.length)]; }
  p.visible = true;
  p.position.set(x,y,z);
  p.material.color.set(col);
  p.userData = { vy: up*(0.7+Math.random()*0.6), vx: rand(-.25,.25), vz: rand(-.25,.25), life, t:0, size };
  return p;
}
function puffsUpdate(dt){
  for(const p of PUFFS.list){
    if(!p.visible) continue;
    const u=p.userData; u.t += dt;
    if(u.t >= u.life){ p.visible=false; continue; }
    const f = u.t/u.life;
    p.position.x += u.vx*dt; p.position.y += u.vy*dt; p.position.z += u.vz*dt;
    const s = u.size*(0.5 + f*1.5);
    p.scale.set(s,s,s);
    p.material.opacity = 0.45*(1-f);
  }
}
