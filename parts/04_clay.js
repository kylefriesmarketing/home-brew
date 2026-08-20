"use strict";
/* CLAY — the claymation toolkit: lumpy geometry, thumbprint materials, 12fps time */

const CLAY = {
  t: 0, raw: 0,               // t = quantized (12fps) time for character/prop anim, raw = smooth
  FPS: 12,
  frame: 0, tick: false,      // tick = TRUE on the frame the 12fps index advances
  step(dt){
    this.raw += dt;
    this.t = Math.floor(this.raw*this.FPS)/this.FPS;
    const f = Math.floor(this.raw*this.FPS);
    this.tick = (f !== this.frame);
    this.frame = f;
  },
};

/* ===========================================================================
   THE 12fps POSE LATCH — the single biggest visual tell of stop-motion.
   The bible calls it one of the four things never to cut, but only walkPhase
   was quantized: the puppets' WORLD transforms were written smoothly every
   frame, so legs stepped on twos while bodies glided at 60. That reads as a
   walk-cycle bug, not claymation.

   Design: sim runs at 60 and is never touched. Right before the render we
   swap in each puppet's HELD pose, draw, then restore the true pose. Because
   the restore is immediate, it is safe even for actors whose mesh transform
   IS their sim truth (Moppy, the birds, the raccoon).

   ⚠️ NEVER latch the camera, liquids, steam, particles, UI or post. Real
   stop-motion cameras are on motion-control rigs and move CONTINUOUSLY between
   exposures — the smooth camera against steppy puppets is the whole tell.
   =========================================================================== */
const LATCH = { list:[], saved:[], on:true };

function latchCollect(){
  const L=LATCH.list; L.length=0;
  const add=o=>{ if(o && o.isObject3D) L.push(o); };
  /* ⚠️ PLAYTEST (Kyle): "the movement of the character is clunky."
     THE PLAYER IS DELIBERATELY NOT LATCHED. This list holds each object's root
     transform on the 12fps clock — for the character you steer, that froze his
     WORLD POSITION 12 times a second while the camera tracked him smoothly at
     60, so he visibly juddered against the ground and lagged your input.
     The stop-motion read does NOT come from this: the limbs step because
     animatePerson quantises walkPhase to CLAY.FPS. Freeing the root keeps the
     puppet stepping while the movement stays responsive.
     ⚠️ do not "fix" this by adding MAIN.player.group back. */
  if(typeof PUB!=="undefined") for(const c of PUB.customers) add(c.rig && c.rig.group);
  if(typeof ITEMS!=="undefined") for(const it of ITEMS.list) add(it.mesh);
  if(typeof FORK!=="undefined") add(FORK.rig);
  if(typeof ALIVE!=="undefined"){
    for(const s of ALIVE.squirrels) add(s.g);
    for(const b of ALIVE.birds) add(b.g);
    for(const b of ALIVE.butterflies) add(b.g);
    if(ALIVE.cat) add(ALIVE.cat.g);
    if(ALIVE.raccoon) add(ALIVE.raccoon.g);
    if(ALIVE.truck) add(ALIVE.truck.g);
    if(ALIVE.cope) add(ALIVE.cope.rig.group);
  }
  if(typeof ECON!=="undefined") for(const k in ECON.machineMeshes) add(ECON.machineMeshes[k]);
  if(typeof STORY!=="undefined" && STORY.copper) add(STORY.copper.group);
  if(typeof WINGS!=="undefined" && WINGS.staffRigs) for(const k in WINGS.staffRigs){
    const r=WINGS.staffRigs[k]; add(r && r.group);
  }
  return L;
}

function latchApply(){
  if(!LATCH.on) return;
  const L=latchCollect(), S=LATCH.saved;
  S.length=0;
  for(let i=0;i<L.length;i++){
    const o=L[i];
    if(!o.userData._hp){ o.userData._hp=o.position.clone(); o.userData._hr=o.rotation.clone(); o.userData._hs=o.scale.clone(); }
    const hp=o.userData._hp, hr=o.userData._hr, hs=o.userData._hs;
    if(CLAY.tick){ hp.copy(o.position); hr.copy(o.rotation); hs.copy(o.scale); }
    S.push(o.position.x,o.position.y,o.position.z, o.rotation.x,o.rotation.y,o.rotation.z, o.scale.x,o.scale.y,o.scale.z);
    o.position.copy(hp); o.rotation.copy(hr); o.scale.copy(hs);
  }
}
function latchRelease(){
  if(!LATCH.on) return;
  const L=LATCH.list, S=LATCH.saved;
  for(let i=0,j=0;i<L.length;i++,j+=9){
    const o=L[i];
    o.position.set(S[j],S[j+1],S[j+2]);
    o.rotation.set(S[j+3],S[j+4],S[j+5]);
    o.scale.set(S[j+6],S[j+7],S[j+8]);
  }
}

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

/* ===========================================================================
   THUMBPRINT SURFACE — clayMat used to be a bare MeshStandardMaterial with NO
   maps at all, despite this file promising "thumbprint materials". lumpify()
   gives low-frequency SILHOUETTE wobble; clay reads as clay because of MICRO
   detail. One 512² canvas, generated at boot, shared by every material — so
   this costs one texture upload and zero extra draw calls.
   =========================================================================== */
const CLAYTEX = { normal:null, rough:null, built:false };

function buildClayTextures(){
  if(CLAYTEX.built) return;
  CLAYTEX.built = true;
  const S = 512;
  /* --- height field: layered value noise + thumbprint arcs --- */
  const h = new Float32Array(S*S);
  const rnd = (()=>{ let s=1337; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; })();
  const grid = (cells)=>{
    const g = new Float32Array((cells+1)*(cells+1));
    for(let i=0;i<g.length;i++) g[i]=rnd();
    return {g,cells};
  };
  const smooth = t => t*t*(3-2*t);
  const sample = (L,x,y)=>{
    const c=L.cells, fx=x*c, fy=y*c;
    const x0=Math.floor(fx)%c, y0=Math.floor(fy)%c;
    const tx=smooth(fx-Math.floor(fx)), ty=smooth(fy-Math.floor(fy));
    const at=(a,b)=>L.g[(b%c)*(c+1)+(a%c)];
    return (at(x0,y0)*(1-tx)+at(x0+1,y0)*tx)*(1-ty) + (at(x0,y0+1)*(1-tx)+at(x0+1,y0+1)*tx)*ty;
  };
  const octaves=[grid(8), grid(19), grid(43), grid(97)];
  /* weight the LOW frequencies: broad soft dimples read as pressed clay,
     high-frequency speckle reads as concrete. */
  const amps=[0.66,0.26,0.07,0.025];
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){
    let v=0;
    for(let o=0;o<octaves.length;o++) v += sample(octaves[o], x/S, y/S)*amps[o];
    h[y*S+x]=v;
  }
  /* thumbprints: concentric arcs, random centres — the detail people recognise */
  const stampPrint=(cx,cy,rot,scale)=>{
    const cos=Math.cos(rot), sin=Math.sin(rot);
    for(let r=2; r<20*scale; r+=2.4){
      const steps=Math.max(24, r*7);
      for(let i=0;i<steps;i++){
        const a=(i/steps)*Math.PI*1.5 - 0.6;
        const rr=r + Math.sin(a*3)*0.9;
        const lx=Math.cos(a)*rr, ly=Math.sin(a)*rr*1.25;
        const px=Math.round(cx + lx*cos - ly*sin);
        const py=Math.round(cy + lx*sin + ly*cos);
        if(px<0||py<0||px>=S||py>=S) continue;
        h[py*S+px] -= 0.30;
        if(px+1<S) h[py*S+px+1] -= 0.18;
        if(py+1<S) h[(py+1)*S+px] -= 0.18;
      }
    }
  };
  for(let i=0;i<14;i++) stampPrint(rnd()*S, rnd()*S, rnd()*6.28, 0.7+rnd()*0.8);

  /* --- Sobel → tangent-space normal map --- */
  const ncv=document.createElement("canvas"); ncv.width=ncv.height=S;
  const nctx=ncv.getContext("2d");
  const nimg=nctx.createImageData(S,S);
  const H=(x,y)=>h[((y+S)%S)*S+((x+S)%S)];
  const STR=7.0;   // clay wants CHUNKY relief; 2.4 was invisible past ~2 metres
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){
    const dx=(H(x+1,y)-H(x-1,y))*STR;
    const dy=(H(x,y+1)-H(x,y-1))*STR;
    let nx=-dx, ny=-dy, nz=1;
    const len=Math.hypot(nx,ny,nz);
    const i=(y*S+x)*4;
    nimg.data[i]  =((nx/len)*0.5+0.5)*255;
    nimg.data[i+1]=((ny/len)*0.5+0.5)*255;
    nimg.data[i+2]=((nz/len)*0.5+0.5)*255;
    nimg.data[i+3]=255;
  }
  nctx.putImageData(nimg,0,0);
  const nt=new THREE.CanvasTexture(ncv);
  nt.wrapS=nt.wrapT=THREE.RepeatWrapping; nt.repeat.set(2,2);
  nt.center.set(0.5,0.5);
  CLAYTEX.normal=nt;

  /* --- roughness: contrast-inverted height, so the sheen varies 0.55–0.85 --- */
  const rcv=document.createElement("canvas"); rcv.width=rcv.height=S;
  const rctx=rcv.getContext("2d");
  const rimg=rctx.createImageData(S,S);
  for(let i=0;i<S*S;i++){
    const v=clamp(0.85 - (h[i]-0.5)*0.6, 0.55, 0.9);
    const j=i*4;
    rimg.data[j]=rimg.data[j+1]=rimg.data[j+2]=v*255;
    rimg.data[j+3]=255;
  }
  rctx.putImageData(rimg,0,0);
  const rt=new THREE.CanvasTexture(rcv);
  rt.wrapS=rt.wrapT=THREE.RepeatWrapping; rt.repeat.set(2,2);
  rt.center.set(0.5,0.5);
  CLAYTEX.rough=rt;
}

/* BOIL THE SURFACE: nudge the map offset/rotation on each 12fps frame so the
   thumbprints land slightly differently every held frame — exactly like a
   puppet re-sculpted between exposures. Makes even a STATIC object read as
   stop-motion, for the cost of two float writes. */
function clayBoilSurface(){
  if(!CLAYTEX.normal || !CLAY.tick) return;
  const f=CLAY.frame;
  const hash=(n)=>{ const s=Math.sin(n*127.1)*43758.5453; return s-Math.floor(s); };
  /* ⚠️ PLAYTEST (Kyle): "the texture for the floor and walls is shaking."
     Correct, and it was this. These two textures are SHARED by every clay
     material in the game, so boiling them boils the ground and the walls too —
     and on a big surface the ROTATION term swings the far corners a long way
     each held frame. That reads as an earthquake, not as thumbprints being
     re-sculpted. Rotation is gone and the offset is a fifth of what it was:
     still alive in close-up, invisible on a wall.
     ⚠️ do NOT re-add rotation here — it cannot be made small enough to be safe
     on a large plane. If a stronger boil is ever wanted, it needs its OWN
     texture pair used only by small props. */
  const ox=(hash(f)-0.5)*0.006, oy=(hash(f+31.7)-0.5)*0.006;
  CLAYTEX.normal.offset.set(ox,oy); CLAYTEX.normal.rotation=0;
  CLAYTEX.rough.offset.set(ox,oy);  CLAYTEX.rough.rotation=0;
}

const _matCache = {};
function clayMat(color, opts={}){
  const key = color + "|" + JSON.stringify(opts);
  if(_matCache[key]) return _matCache[key];
  buildClayTextures();
  /* MeshPhysicalMaterial for the CLEARCOAT — damp clay carries a thin sheen
     layer. Kept broad and dim (never a hotspot): that's the difference between
     "modelling clay" and "wet plastic". */
  const m = new THREE.MeshPhysicalMaterial(Object.assign({
    color, roughness: 0.88, metalness: 0,
    normalMap: CLAYTEX.normal, roughnessMap: CLAYTEX.rough,
    clearcoat: 0.08, clearcoatRoughness: 0.6,
  }, opts));
  if(m.normalScale) m.normalScale.set(0.8,0.8);

  /* FAKE SUBSURFACE — backlit clay glowing warm at the thin bits (ears,
     fingers, hat brims) is the strongest "this material is soft" cue there is.
     Zucconi's wrap-diffuse term, patched into the lighting via onBeforeCompile
     so we keep all of three's shadows/tone mapping for free. */
  m.onBeforeCompile = (sh)=>{
    sh.uniforms.sssColor = { value: new THREE.Color(0.55,0.20,0.12) };
    sh.uniforms.sssPower = { value: 0.55 };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 sssColor; uniform float sssPower;`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        #if NUM_DIR_LIGHTS > 0
        {
          vec3 V = normalize( vViewPosition );
          vec3 Ldir = normalize( directionalLights[0].direction );
          // light travelling THROUGH the surface toward the eye
          float wrap = pow( clamp( dot( V, -Ldir ), 0.0, 1.0 ), 3.0 );
          float thin = 1.0 - abs( dot( normalize( normal ), V ) );   // thin at grazing angles
          reflectedLight.indirectDiffuse += diffuseColor.rgb * sssColor *
            ( wrap * 0.75 + thin * 0.25 ) * sssPower * directionalLights[0].color;
        }
        #endif`);
    m.userData.shader = sh;
  };
  m.customProgramCacheKey = ()=>"claySSS";
  _matCache[key] = m; return m;
}

/* geometry cache */
const _geoCache = {};
function geoGet(key, maker){ return _geoCache[key] || (_geoCache[key] = maker()); }

function claySphere(r, color, amp=0.07, seed=1){
  const g = new THREE.Mesh(geoGet(`sph${r}|${amp}|${seed}`, ()=>lumpify(new THREE.SphereGeometry(r, 14, 12), amp, 2.6/r, seed)), clayMat(color));
  g.castShadow = true; g.receiveShadow = true; return g;
}
function clayBox(w,h,d,color, amp=0.05, seed=2){
  const g = new THREE.Mesh(geoGet(`box${w}|${h}|${d}|${amp}|${seed}`, ()=>lumpify(new THREE.BoxGeometry(w,h,d,3,3,3), amp, 2.0, seed)), clayMat(color));
  g.castShadow = true; g.receiveShadow = true; return g;
}
function clayCyl(rt,rb,h,color, amp=0.05, seed=3, radial=12){
  const g = new THREE.Mesh(geoGet(`cyl${rt}|${rb}|${h}|${amp}|${seed}|${radial}`, ()=>lumpify(new THREE.CylinderGeometry(rt,rb,h,radial,3), amp, 2.2, seed)), clayMat(color));
  g.castShadow = true; g.receiveShadow = true; return g;
}
function clayCapsule(r,len,color, amp=0.06, seed=4){
  const g = new THREE.Mesh(geoGet(`cap${r}|${len}|${amp}|${seed}`, ()=>lumpify(new THREE.CapsuleGeometry(r,len,4,10), amp, 2.4/r*0.6, seed)), clayMat(color));
  g.castShadow = true; g.receiveShadow = true; return g;
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
