"use strict";
/* WORLD — the mountain diorama: terrain, crick, trail, buildings, props, lights */

const WORLD = {
  scene:null, renderer:null, camera:null,
  colliders:[],           // {x1,z1,x2,z2}
  stations:[],            // {id,x,z,r,prompt(ctx),action(ctx)}
  props:{}, anchors:{},
  sun:null, hemi:null, moonlights:[],
  waterTex:null, fireflies:null, stars:null,
};

WORLD.getH = function(x, z){
  let h = 0;
  const n = Math.max(0, -z - 16);
  h += n*0.32 + n*n*0.006;                                    // north mountain rise
  if(x < -24){                                                // down to the crick
    const t = Math.min(1, (-24 - x)/4);
    h -= t*1.0;
  }
  const cd = Math.exp(-((x+30.5)*(x+30.5))/16);               // crick channel
  if(z < 26) h -= 2.2*cd*Math.min(1,(26-z)/6);
  if(x < -36) h += (-36 - x)*0.5;                             // far bank up to Copperhead's
  if(x > 30){ const t=(x-30)/8; h += t*t*1.4; }               // east bank
  if(z > 34){ const t=(z-34)/8; h -= t*2.0; }                 // south falls away
  // gentle lumps outside the flat lot
  const inLot = (x>-24 && x<26 && z>-15 && z<22);
  if(!inLot) h += Math.sin(x*0.23)*Math.cos(z*0.31)*0.35 + Math.sin(x*0.11+z*0.17)*0.3;
  return h;
};

/* ⚠️ M6 — WORLD.collide tested EVERY collider (~135 of them) for the player and
   for every loose item, every frame: 5,400+ AABB tests/frame at 40 items, with
   no spatial structure at all. A uniform grid hash cuts it to the handful of
   boxes actually near you. Rebuilt lazily whenever the collider set changes. */
const CGRID={ cell:6, map:null, dirty:true };
WORLD.addCollider = (x1,z1,x2,z2,id)=>{ CGRID.dirty=true;
  WORLD.colliders.push({x1:Math.min(x1,x2),z1:Math.min(z1,z2),x2:Math.max(x1,x2),z2:Math.max(z1,z2),id}); };
WORLD.dropCollider = id => { CGRID.dirty=true; WORLD.colliders=WORLD.colliders.filter(c=>c.id!==id); };
function cgridBuild(){
  const C=CGRID.cell, m=new Map();
  /* ⚠️ collision RESOLUTION IS ORDER-DEPENDENT — it mutates x/z mid-loop, so a
     point overlapping two boxes resolves differently depending on which is
     tested first. Stamp the array index and sort the gathered set by it, or the
     grid's cell-walk order silently changes behaviour in those corners.
     (Measured before this: 2 of 4000 sample points disagreed with brute force.) */
  WORLD.colliders.forEach((c,i)=>{ c._i=i; });
  for(const c of WORLD.colliders){
    const i0=Math.floor(c.x1/C), i1=Math.floor(c.x2/C);
    const j0=Math.floor(c.z1/C), j1=Math.floor(c.z2/C);
    for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
      const k=i+","+j; let a=m.get(k); if(!a){ a=[]; m.set(k,a); } a.push(c);
    }
  }
  CGRID.map=m; CGRID.dirty=false;
}
WORLD.addStation = s => { WORLD.stations.push(s); return s; };

/* resolve a circle against colliders (returns corrected x,z) */
WORLD.collide = function(x, z, r){
  if(CGRID.dirty || !CGRID.map) cgridBuild();
  const C=CGRID.cell;
  /* gather only the boxes in the cells this circle can touch */
  const i0=Math.floor((x-r)/C), i1=Math.floor((x+r)/C);
  const j0=Math.floor((z-r)/C), j1=Math.floor((z+r)/C);
  const near=[];
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    const a=CGRID.map.get(i+","+j);
    if(a) for(const c of a) if(near.indexOf(c)<0) near.push(c);
  }
  if(near.length>1) near.sort((a,b)=>a._i-b._i);   // preserve original order
  for(const c of near){
    const nx = clamp(x, c.x1, c.x2), nz = clamp(z, c.z1, c.z2);
    let dx = x-nx, dz = z-nz;
    let d2 = dx*dx+dz*dz;
    if(d2 < r*r){
      if(d2 < 1e-6){ // inside: push along smallest exit
        const l=x-c.x1, rr=c.x2-x, t=z-c.z1, b=c.z2-z;
        const m=Math.min(l,rr,t,b);
        if(m===l)x=c.x1-r; else if(m===rr)x=c.x2+r; else if(m===t)z=c.z1-r; else z=c.z2+r;
      } else {
        const d=Math.sqrt(d2); x = nx + dx/d*r; z = nz + dz/d*r;
      }
    }
  }
  return [x,z];
};

/* ---------------- build ---------------- */
WORLD.build = function(){
  const scene = WORLD.scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9db8c8);
  scene.fog = new THREE.Fog(0x9db8c8, 55, 150);

  const renderer = WORLD.renderer = new THREE.WebGLRenderer({canvas:$("c"), antialias:true});
  /* ⚠️ M6 — this allocated full-res HDR MSAA targets at min(dpr,2) with no
     quality setting at all: on a 4K panel that's a ~265MB colour buffer. The
     scale is a saved preference now (Pause → 🖥️ Resolution). */
  WORLD.resScale = (()=>{ try{ return +(localStorage.getItem("homebrew-res")||1); }catch(e){ return 1; } })();
  WORLD.applyRes = (s)=>{
    WORLD.resScale = clamp(s, 0.5, 1);
    try{ localStorage.setItem("homebrew-res", String(WORLD.resScale)); }catch(e){}
    renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2) * WORLD.resScale);
    renderer.setSize(innerWidth, innerHeight);
    if(typeof POST!=="undefined" && POST.ok) POST.checkSize();
  };
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2) * WORLD.resScale);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const camera = WORLD.camera = new THREE.PerspectiveCamera(46, innerWidth/innerHeight, 0.1, 400);
  camera.position.set(0, 12, 24);

  addEventListener("resize", ()=>{
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  });

  /* lights */
  const hemi = WORLD.hemi = new THREE.HemisphereLight(0xcfe0e8, 0x5a4a38, 0.75);
  scene.add(hemi);
  const sun = WORLD.sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
  sun.position.set(18, 30, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  /* was ±42 (an 84-unit frustum ≈ 24px/unit — a mug got a 6-PIXEL shadow).
     Tightened to the real play area: same map, ~1.7x the texel density. */
  sc.left=-26; sc.right=34; sc.top=30; sc.bottom=-26; sc.near=2; sc.far=90;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.02;      // the correct knob for lumpy displaced geometry
  /* the whole shadow map used to re-render every frame (incl. 180 tree draws);
     now it refreshes on the 12fps tick — fidelity AND framerate */
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  scene.add(sun); scene.add(sun.target);

  const pubLight = new THREE.PointLight(0xffb35a, 0, 22, 2); pubLight.position.set(11, 3.4, -2);
  const shackLight = new THREE.PointLight(0xffc27a, 0, 20, 2); shackLight.position.set(-11, 3.4, -2);
  const kitchenLight = new THREE.PointLight(0xffc27a, 0, 14, 2); kitchenLight.position.set(24.5, 3.2, -4.5);
  const giftLight = new THREE.PointLight(0xffb35a, 0, 14, 2); giftLight.position.set(24.5, 3.2, 3.6);
  scene.add(pubLight); scene.add(shackLight); scene.add(kitchenLight); scene.add(giftLight);
  WORLD.moonlights = [pubLight, shackLight, kitchenLight, giftLight];

  buildTerrain(scene);
  buildWater(scene);
  buildBackdrop(scene);
  buildShack(scene);
  buildPub(scene);
  buildWings(scene);
  buildYard(scene);
  buildDumpster(scene);
  buildStringLights(scene);
  buildBus(scene);
  buildTrailAndSpring(scene);
  buildCopperheads(scene);
  buildNightBits(scene);
};

/* ---- terrain with painted zones ---- */
function buildTerrain(scene){
  const S=170, SEG=110;
  const geo = new THREE.PlaneGeometry(S,S,SEG,SEG);
  geo.rotateX(-Math.PI/2);
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count*3);
  const c = new THREE.Color();
  const grass1=new THREE.Color(0x6f8f4e), grass2=new THREE.Color(0x81a057), dirt=new THREE.Color(0x8a6a44),
        gravel=new THREE.Color(0x8f8a80), road=new THREE.Color(0x6e6a62), sand=new THREE.Color(0xb0985e),
        rock=new THREE.Color(0x7d7f77), leaf=new THREE.Color(0xa8763c), snow=new THREE.Color(0xe8eef2);
  const nearSeg = (x,z, ax,az,bx,bz)=>{ // dist to segment
    const dx=bx-ax, dz=bz-az, L2=dx*dx+dz*dz;
    let t = L2? ((x-ax)*dx+(z-az)*dz)/L2 : 0; t=clamp(t,0,1);
    const px=ax+dx*t, pz=az+dz*t; return Math.hypot(x-px,z-pz);
  };
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i), z=pos.getZ(i);
    const h=WORLD.getH(x,z);
    pos.setY(i, h);
    // base grass with patchiness
    const t=(Math.sin(x*0.7)+Math.cos(z*0.9)+Math.sin((x+z)*0.33))*0.25+0.5;
    c.copy(grass1).lerp(grass2, clamp(t,0,1));
    if(h>6.5) c.lerp(rock, clamp((h-6.5)/5,0,0.8));
    if(h>11.5) c.lerp(snow, clamp((h-11.5)/3,0,0.9));
    // autumn scatter
    if(Math.sin(x*3.1)*Math.cos(z*2.7)>0.86) c.lerp(leaf,0.5);
    // road band
    if(z>23.4 && z<30.6) c.copy(road).offsetHSL(0,0,Math.sin(x*1.7)*0.02);
    // yard gravel
    if(x>-4.5 && x<5 && z>-13 && z<19) c.copy(gravel).offsetHSL(0,0,Math.sin(x*4+z*3)*0.03);
    // delivery pad
    if(x>-4 && x<4 && z>12 && z<18.6) c.copy(gravel).lerp(dirt,0.15);
    // path road→pub door
    if(nearSeg(x,z, 11.5,23.4, 11.5,6.6)<1.5) c.copy(dirt);
    // trail to spring
    if(nearSeg(x,z, 1,-13, 3,-22)<1.35 || nearSeg(x,z, 3,-22, 6,-31.6)<1.35) c.copy(dirt).lerp(rock,0.25);
    // crick banks sandy
    const cd=Math.exp(-((x+30.5)*(x+30.5))/22);
    if(cd>0.45 && z<26) c.lerp(sand, (cd-0.45)*1.1);
    cols[i*3]=c.r; cols[i*3+1]=c.g; cols[i*3+2]=c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols,3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({vertexColors:true, roughness:0.95, metalness:0});
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  scene.add(m);
  WORLD.props.ground = m;
}

/* ---- crick + spring pool ---- */
function buildWater(scene){
  const cv=document.createElement("canvas"); cv.width=64; cv.height=256;
  const g=cv.getContext("2d");
  g.fillStyle="#5f88a8"; g.fillRect(0,0,64,256);
  for(let i=0;i<40;i++){ g.fillStyle=`rgba(255,255,255,${rand(0.05,0.18)})`;
    const y=rand(256); g.fillRect(rand(50), y, rand(6,22), rand(1,2.5)); }
  const tex=new THREE.CanvasTexture(cv); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(1,6);
  WORLD.waterTex = tex;
  const mat=new THREE.MeshStandardMaterial({map:tex, transparent:true, opacity:0.82, roughness:0.25, color:0xbcd8e8});
  const crick=new THREE.Mesh(new THREE.PlaneGeometry(7.5,66), mat);
  crick.rotation.x=-Math.PI/2; crick.position.set(-30.5,-1.35,-4);
  scene.add(crick); WORLD.props.crick=crick;
  const pool=new THREE.Mesh(new THREE.CircleGeometry(2.6,20), mat);
  pool.rotation.x=-Math.PI/2;
  pool.position.set(6, WORLD.getH(6,-33)+0.06, -33);
  scene.add(pool); WORLD.props.springPool=pool;
}

/* ---- distant ridges, sky stars, trees ---- */
function buildBackdrop(scene){
  const mkRidge=(dist, h, col, op)=>{
    const pts=[]; const w=260;
    for(let i=0;i<=24;i++){ const x=-w/2+w*i/24;
      pts.push(new THREE.Vector2(x, h*(0.55+0.45*Math.abs(Math.sin(i*1.7+dist)))*1)); }
    const shape=new THREE.Shape();
    shape.moveTo(-w/2,0); pts.forEach(p=>shape.lineTo(p.x,p.y)); shape.lineTo(w/2,0);
    const m=new THREE.Mesh(new THREE.ShapeGeometry(shape),
      /* DoubleSide: camYaw is unclamped, so orbiting 180° used to show the
         BACK of these ridge cards — i.e. an empty fog-coloured void */
      new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:op, fog:false,
        depthWrite:false, side:THREE.DoubleSide}));
    m.position.set(0, 2, -dist); m.renderOrder=-10-dist;
    scene.add(m); return m;
  };
  WORLD.props.ridges = [ mkRidge(120, 34, 0x8fa8bc, 0.9), mkRidge(95, 26, 0x7e97ad, 0.92), mkRidge(75, 18, 0x6d8399, 0.95) ];

  // trees: cones (spruce) + blob (deciduous, autumn)
  const spruceG = lumpify(new THREE.ConeGeometry(1.6, 4.4, 8, 2), 0.08, 1.4, 7);
  const blobG = lumpify(new THREE.SphereGeometry(1.7, 9, 8), 0.16, 1.5, 9);
  const trunkG = new THREE.CylinderGeometry(0.22, 0.3, 1.6, 6);
  const sprM=[clayMat(0x3e5e3a), clayMat(0x4a6a40)];
  const blobM=[clayMat(0xb5742e), clayMat(0xc28a2e), clayMat(0x9a4e2a), clayMat(0x6f8f3e)];
  const trunkM=clayMat(0x6a4a30);
  /* ⚠️ M6 — 90 trees × 2 meshes = 180 draw calls for 3 geometries, and with
     shadow-map autoUpdate on they all re-rendered every frame. Instanced: 3
     draws total, per-tree colour via setColorAt. */
  const TREES={ trunk:[], spruce:[], blob:[] };
  const treeAt=(x,z,kind)=>{
    const h=WORLD.getH(x,z);
    const s=rand(0.8,1.5), sy=s*rand(0.9,1.2), ry=rand(Math.PI*2);
    TREES.trunk.push({x,y:h,z,s,sy,ry, col:trunkM.color});
    const arr = kind==="s"? TREES.spruce : TREES.blob;
    arr.push({x, y:h, z, s, sy, ry, top:(kind==="s"?3.2:3.0),
      col:(kind==="s"?pick(sprM):pick(blobM)).color});
    WORLD.addCollider(x-0.5,z-0.5,x+0.5,z+0.5);
    (WORLD.props.treeSpots=WORLD.props.treeSpots||[]).push({x,z});
  };
  const flushTrees=()=>{
    const M=new THREE.Matrix4(), Q=new THREE.Quaternion(), E=new THREE.Euler(),
          P=new THREE.Vector3(), S=new THREE.Vector3();
    const build=(list, geo, mat, yOff)=>{
      if(!list.length) return;
      const im=new THREE.InstancedMesh(geo, mat.clone(), list.length);
      list.forEach((t,i)=>{
        E.set(0,t.ry,0); Q.setFromEuler(E);
        P.set(t.x, t.y + (yOff||0)*t.sy, t.z);
        S.set(t.s, t.sy, t.s);
        M.compose(P,Q,S); im.setMatrixAt(i,M);
        im.setColorAt(i, t.col);
      });
      im.instanceMatrix.needsUpdate=true;
      if(im.instanceColor) im.instanceColor.needsUpdate=true;
      im.castShadow=true; im.receiveShadow=true;
      scene.add(im);
    };
    build(TREES.trunk,  trunkG,  trunkM,  0.7);
    build(TREES.spruce, spruceG, sprM[0], 3.2);
    build(TREES.blob,   blobG,   blobM[0], 3.0);
  };
  // scatter around the lot edges & mountain — keep lot + road + trail + crick clear
  const clear=(x,z)=> (x>-25 && x<27 && z>-16 && z<23) || (z>22 && z<32) ||
    (Math.abs(x+30.5)<6 && z<26) || (Math.hypot(x-6,z+33)<5) ||
    (nearTrail(x,z)) || (x<-36 && Math.hypot(x+48,z+6)<10) || Math.hypot(x-26,z+44)<8;
  function nearTrail(x,z){
    const seg=(ax,az,bx,bz)=>{ const dx=bx-ax,dz=bz-az,L2=dx*dx+dz*dz;
      let t=L2?((x-ax)*dx+(z-az)*dz)/L2:0; t=clamp(t,0,1);
      return Math.hypot(x-(ax+dx*t), z-(az+dz*t)); };
    return seg(1,-13,3,-22)<2.4 || seg(3,-22,6,-31.6)<2.4 || seg(6,-31.6,26,-44)<2.6;
  }
  let placed=0, guard=0;
  while(placed<90 && guard++<900){
    const x=rand(-70,70), z=rand(-60,40);
    if(clear(x,z)) continue;
    treeAt(x,z, (z<-20||Math.random()<0.45)?"s":"b"); placed++;
  }
  flushTrees();
}

/* ---- plank material helper ---- */
function plankMat(col){ return clayMat(col); }

/* wall helper: builds a lumpy box wall + collider */
function wall(scene, x1,z1,x2,z2, h, col=0x8a6a48, th=0.5){
  const cx=(x1+x2)/2, cz=(z1+z2)/2;
  const w=Math.abs(x2-x1)||th, d=Math.abs(z2-z1)||th;
  const m=clayBox(Math.max(w,th), h, Math.max(d,th), col, 0.03, cx+cz);
  m.position.set(cx, h/2, cz);
  m.receiveShadow=true;
  scene.add(m);
  WORLD.addCollider(cx-Math.max(w,th)/2, cz-Math.max(d,th)/2, cx+Math.max(w,th)/2, cz+Math.max(d,th)/2);
  return m;
}
function rafters(scene, x1,z1,x2,z2, y, col=0x6a4a30){
  const g=new THREE.Group();
  y+=1.9;                                     // ride high — never stripe the play space
  const n=Math.floor(Math.abs(x2-x1)/2.6);
  for(let i=0;i<=n;i++){
    const b=new THREE.Mesh(geoGet("rafter"+Math.abs(z2-z1), ()=>new THREE.BoxGeometry(0.2,0.22,Math.abs(z2-z1)+0.8)), clayMat(col));
    b.position.set(lerp(x1,x2,i/n), y, (z1+z2)/2);
    g.add(b);
  }
  const beamL=new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x2-x1)+0.6,0.26,0.26), clayMat(col));
  beamL.position.set((x1+x2)/2, y-0.15, z1); g.add(beamL);
  const beamR=beamL.clone(); beamR.position.z=z2; g.add(beamR);
  g.traverse(o=>{ o.castShadow=false; });
  scene.add(g); return g;
}

/* ---- THE BREWHOUSE SHACK ---- */
function buildShack(scene){
  const X1=-19.5, X2=-3.5, Z1=-9, Z2=5;
  // floor
  const fl=new THREE.Mesh(new THREE.BoxGeometry(X2-X1, 0.3, Z2-Z1), clayMat(0x9a7a52));
  fl.position.set((X1+X2)/2, 0.15, (Z1+Z2)/2); fl.receiveShadow=true; scene.add(fl);
  // walls: full north/west, half south + east opening
  wall(scene, X1, Z1, X2, Z1, 3.6, 0x8a6a48);            // north
  wall(scene, X1, Z1, X1, Z2, 3.6, 0x826344);            // west
  wall(scene, X1, Z2, -13.5, Z2, 1.1, 0x8a6a48);         // south half-walls (door gap at -13.5..-11)
  wall(scene, -11, Z2, X2, Z2, 1.1, 0x8a6a48);
  wall(scene, X2, Z1, X2, -3.5, 1.1, 0x826344);          // east half wall (gap -3.5..1 for yard access)
  wall(scene, X2, 0.5, X2, Z2, 1.1, 0x826344);
  rafters(scene, X1+0.4, Z1+0.4, X2-0.4, Z2-0.4, 3.7);
  // corner posts
  [[X1,Z1],[X2,Z1],[X1,Z2],[X2,Z2]].forEach(([x,z])=>{
    const p=clayCyl(0.22,0.26,5.8,0x6a4a30,0.04,x*z); p.position.set(x,2.9,z); scene.add(p);
  });

  /* kettle — the heart */
  const kettle=new THREE.Group();
  const body=clayCyl(1.5,1.7,2.2,0xb87333,0.05,11,16); body.position.y=1.35; kettle.add(body);
  const rim=clayCyl(1.62,1.55,0.3,0x8a5a28,0.04,12,16); rim.position.y=2.5; kettle.add(rim);
  const lid=clayCyl(1.35,1.45,0.25,0x9a6432,0.05,13,16); lid.position.y=2.72; kettle.add(lid);
  const knob=claySphere(0.2,0x6a4a28,0.1,14); knob.position.y=2.95; kettle.add(knob);
  const fire=new THREE.Mesh(geoGet("firebox",()=>new THREE.BoxGeometry(2.2,0.6,2.2)), clayMat(0x4a3a32)); fire.position.y=0.3; kettle.add(fire);
  const glow=new THREE.PointLight(0xff7a2a,0,7,2); glow.position.y=0.7; kettle.add(glow);
  // wort surface (visible when filled)
  const wort=new THREE.Mesh(geoGet("wortdisc",()=>new THREE.CircleGeometry(1.42,18)),
    new THREE.MeshStandardMaterial({color:0xc9a86a, roughness:0.4}));
  wort.rotation.x=-Math.PI/2; wort.position.y=2.45; wort.visible=false; kettle.add(wort);
  const paddle=clayBox(0.14,2.6,0.4,0xc9a878,0.06,15); paddle.position.set(1.1,3.1,0); paddle.rotation.z=0.5; kettle.add(paddle);
  kettle.position.set(-14,0.3,-4);
  scene.add(kettle);
  WORLD.addCollider(-15.9,-5.9,-12.1,-2.1);
  WORLD.props.kettle=kettle; WORLD.props.kettleGlow=glow; WORLD.props.wort=wort; WORLD.props.kettleLid=lid; WORLD.props.kettlePaddle=paddle;
  WORLD.anchors.kettle={x:-14,z:-1.6};
  // coiled hose on the wall by the kettle
  const hose=new THREE.Group();
  for(let i=0;i<3;i++){ const ring=new THREE.Mesh(geoGet("hosering",()=>new THREE.TorusGeometry(0.5,0.09,8,16)), clayMat(0x3e7a3e));
    ring.position.set(0,i*0.16,0); ring.rotation.x=Math.PI/2*0.1; hose.add(ring); }
  hose.position.set(-17.5,1.6,-8.6); hose.rotation.x=Math.PI/2; scene.add(hose);

  /* fermenters (2 pads; #2 arrives via machine) */
  const mkFerm=(x,z,ghost)=>{
    const f=new THREE.Group();
    const tank=clayCyl(0.95,1.1,2.6,0xd8d2c2,0.04,21,14); tank.position.y=1.6; f.add(tank);
    const top=claySphere(0.95,0xc8c2b2,0.05,22); top.position.y=2.9; top.scale.y=0.55; f.add(top);
    const airlock=clayCyl(0.09,0.09,0.5,0x88b0b8,0.1,23); airlock.position.set(0.3,3.4,0); f.add(airlock);
    const legs=clayCyl(0.5,0.6,0.35,0x6a5a48,0.05,24); legs.position.y=0.2; f.add(legs);
    const band=clayCyl(1.02,1.02,0.24,0xb5472e,0.03,25,14); band.position.y=1.9; f.add(band);
    f.position.set(x,0.3,z);
    if(ghost){ f.traverse(o=>{ if(o.isMesh){ o.material=o.material.clone(); o.material.transparent=true; o.material.opacity=0.16; o.castShadow=false; } }); }
    scene.add(f); return f;
  };
  WORLD.props.ferm1=mkFerm(-6.4,-5.6,false);
  WORLD.props.ferm2ghost=mkFerm(-6.4,-1.6,true);
  WORLD.props.ferm2=null;
  WORLD.addCollider(-7.5,-6.7,-5.3,-4.5);
  WORLD.anchors.ferm1={x:-6.4,z:-4.2}; WORLD.anchors.ferm2={x:-6.4,z:-0.2};

  /* pantry shelf along west wall */
  const shelf=new THREE.Group();
  const frame=clayBox(0.6,2.6,7.6,0x7a5a3a,0.03,31); frame.position.set(0,1.3,0); shelf.add(frame);
  for(let i=0;i<3;i++){ const board=clayBox(0.9,0.12,7.6,0x9a7a52,0.02,32+i); board.position.set(0,0.7+i*0.8,0); shelf.add(board); }
  shelf.position.set(-18.7,0.3,-1);
  scene.add(shelf);
  WORLD.addCollider(-19.4,-4.9,-18.1,2.9);
  WORLD.props.shelf=shelf; WORLD.anchors.shelf={x:-17.6,z:-1};

  /* sink corner */
  const sink=new THREE.Group();
  const basin=clayBox(1.4,1.1,1.1,0xd8d8d0,0.04,41); basin.position.y=0.55; sink.add(basin);
  const faucet=clayCyl(0.08,0.08,0.7,0x9a9a9a,0.05,42); faucet.position.set(0,1.35,-0.3); sink.add(faucet);
  const spout=claySphere(0.1,0x9a9a9a,0.06,43); spout.position.set(0,1.68,-0.25); sink.add(spout);
  sink.position.set(-18.4,0.3,-7.8); scene.add(sink);
  WORLD.addCollider(-19.2,-8.4,-17.6,-7.2);
  WORLD.anchors.sink={x:-17.3,z:-7.4};

  /* bed loft corner */
  const bed=new THREE.Group();
  const mat2=clayBox(2.4,0.5,1.4,0x8a4a3a,0.05,51); mat2.position.y=0.5; bed.add(mat2);
  const pillow=clayBox(0.7,0.3,1.0,0xe8e0cc,0.09,52); pillow.position.set(-0.7,0.85,0); bed.add(pillow);
  const quilt=clayBox(1.5,0.2,1.35,0x4c7a4c,0.07,53); quilt.position.set(0.35,0.82,0); bed.add(quilt);
  const legs2=clayBox(2.4,0.35,1.4,0x6a4a30,0.03,54); legs2.position.y=0.17; bed.add(legs2);
  bed.position.set(-17.6,0.3,3.4); scene.add(bed);
  WORLD.addCollider(-18.9,2.6,-16.3,4.2);
  WORLD.anchors.bed={x:-15.9,z:3.4};

  /* wash trough outside the front */
  const trough=new THREE.Group();
  const tb=clayBox(2.6,0.9,1.3,0x7a8a92,0.05,61); tb.position.y=0.45; trough.add(tb);
  const wtr=new THREE.Mesh(geoGet("troughwater",()=>new THREE.BoxGeometry(2.3,0.1,1.0)),
    new THREE.MeshStandardMaterial({color:0x88b8cc, roughness:0.2, transparent:true, opacity:0.85}));
  wtr.position.y=0.78; trough.add(wtr);
  trough.position.set(-8.5,0,7.6); scene.add(trough);
  WORLD.addCollider(-9.9,6.9,-7.1,8.3);
  WORLD.anchors.trough={x:-8.5,z:9.2};
  WORLD.props.trough=trough;

  /* machine ghost pads (whirlybird by kettle, splashy by trough, pipes by kettle wall) */
  WORLD.anchors.mach_whirlybird={x:-11.6,z:-6.4};
  WORLD.anchors.mach_granny={x:-16.4,z:-6.6};
  WORLD.anchors.mach_governor={x:-11.6,z:-2.2};
  WORLD.anchors.mach_ferm2={x:-6.4,z:-1.6};
  WORLD.anchors.mach_splashy={x:-11.2,z:7.6};
  WORLD.anchors.mach_pipes={x:-16.5,z:-8.2};
  WORLD.anchors.mach_selfpour={x:11,z:-6.2};
}

/* ---- THE PUB ---- */
function buildPub(scene){
  const X1=3.5, X2=20.5, Z1=-9, Z2=6.5;
  const fl=new THREE.Mesh(new THREE.BoxGeometry(X2-X1,0.3,Z2-Z1), clayMat(0x8a6a44));
  fl.position.set((X1+X2)/2,0.15,(Z1+Z2)/2); fl.receiveShadow=true; scene.add(fl);
  wall(scene, X1,Z1, X2,Z1, 3.8, 0x92543a);                       // north
  /* east wall in segments — gaps for the future wings' doorways */
  wall(scene, X2,Z1, X2,-2.4, 3.8, 0x8a4e36);
  wall(scene, X2,-0.6, X2,1.6, 3.8, 0x8a4e36);
  wall(scene, X2,3.4, X2,Z2, 3.8, 0x8a4e36);
  wall(scene, X1,Z1, X1,-3.5, 1.1, 0x92543a);                     // west half (gap to yard at -3.5..1.5)
  wall(scene, X1,1.5, X1,Z2, 1.1, 0x92543a);
  wall(scene, X1,Z2, 9.6,Z2, 1.1, 0x92543a);                      // south halfs with door gap 9.6..12.6
  wall(scene, 12.6,Z2, X2,Z2, 1.1, 0x92543a);
  rafters(scene, X1+0.4, Z1+0.4, X2-0.4, Z2-0.4, 3.9, 0x5e402a);
  [[X1,Z1],[X2,Z1],[X1,Z2],[X2,Z2]].forEach(([x,z])=>{
    const p=clayCyl(0.22,0.26,6.0,0x5e402a,0.04,x*z*3); p.position.set(x,3.0,z); scene.add(p);
  });

  /* bar counter along north */
  const bar=clayBox(12.5,1.25,1.5,0x6a4a30,0.03,71); bar.position.set(11.6,0.92,-5.9); bar.castShadow=true; scene.add(bar);
  const barTop=clayBox(12.9,0.16,1.8,0x9a7a52,0.02,72); barTop.position.set(11.6,1.62,-5.9); scene.add(barTop);
  WORLD.addCollider(5.3,-6.7,17.9,-5.1);
  WORLD.anchors.barService={x:11.6,z:-7.3};       // behind the bar
  WORLD.anchors.barFront={x:11.6,z:-4.4};

  /* taps ×2 + third ghost */
  const mkTap=(x,ghost)=>{
    const t=new THREE.Group();
    const kegRest=clayBox(1.2,0.5,1.0,0x7a5a3a,0.04,81); kegRest.position.y=1.95; t.add(kegRest);
    const tower=clayCyl(0.12,0.15,0.8,0xb8a060,0.05,82); tower.position.y=2.6; t.add(tower);
    const spout2=clayBox(0.1,0.12,0.42,0x8a8a8a,0.05,83); spout2.position.set(0,2.9,0.28); t.add(spout2);
    const handle=clayBox(0.16,0.5,0.14,0xb5472e,0.08,84); handle.position.set(0,3.2,0.1); handle.rotation.x=-0.3; t.add(handle);
    // price tag on a string
    const tag=new THREE.Mesh(geoGet("tag",()=>new THREE.BoxGeometry(0.5,0.34,0.05)), clayMat(0xe8d9a8));
    tag.position.set(0.42,2.4,0.3); tag.rotation.z=-0.15; t.add(tag);
    t.position.set(x,0,-5.9);
    if(ghost) t.traverse(o=>{ if(o.isMesh){ o.material=o.material.clone(); o.material.transparent=true; o.material.opacity=0.15; o.castShadow=false; }});
    scene.add(t); return t;
  };
  WORLD.props.tap0=mkTap(8.6,false);
  WORLD.props.tap1=mkTap(12.6,false);
  WORLD.anchors.tap0={x:8.6,z:-4.6}; WORLD.anchors.tap1={x:12.6,z:-4.6};

  /* register */
  const reg=new THREE.Group();
  const rb=clayBox(0.9,0.7,0.7,0x8a8a92,0.05,91); rb.position.y=0.35; reg.add(rb);
  const rk=clayBox(0.7,0.2,0.5,0xd8d2c2,0.06,92); rk.position.set(0,0.75,0.1); rk.rotation.x=-0.4; reg.add(rk);
  reg.position.set(16.8,1.7,-5.9); scene.add(reg);
  WORLD.props.register=reg;

  /* stools + tables + ficus + jukebox */
  const stoolG=new THREE.Group();
  for(const sx of [7.2,9.6,12,14.4,16.6]){
    const s=new THREE.Group();
    const seat=clayCyl(0.42,0.36,0.18,0xb5472e,0.06,sx*7); seat.position.y=1.02; s.add(seat);
    const leg=clayCyl(0.09,0.13,1.0,0x6a4a30,0.04,sx*9); leg.position.y=0.5; s.add(leg);
    s.position.set(sx,0.3,-4.3); stoolG.add(s);
  }
  scene.add(stoolG);
  const tables=[];
  for(const [tx,tz] of [[7.5,0.8],[13,2],[17.5,0.2]]){
    const t=new THREE.Group();
    const top=clayCyl(1.05,0.95,0.16,0x9a7a52,0.04,tx*tz+5); top.position.y=1.28; t.add(top);
    const leg=clayCyl(0.12,0.18,1.2,0x6a4a30,0.04,tx*tz+6); leg.position.y=0.64; t.add(leg);
    t.position.set(tx,0.3,tz); scene.add(t); tables.push({x:tx,z:tz});
    WORLD.addCollider(tx-0.7,tz-0.7,tx+0.7,tz+0.7);
  }
  WORLD.anchors.tables=tables;
  const ficus=new THREE.Group();
  const pot=clayCyl(0.5,0.36,0.7,0xb5472e,0.05,101); pot.position.y=0.35; ficus.add(pot);
  const bush=claySphere(0.8,0x4c7a4c,0.2,102); bush.position.y=1.4; ficus.add(bush);
  ficus.position.set(19.2,0.3,4.8); scene.add(ficus);
  WORLD.props.ficus=ficus; WORLD.anchors.ficus={x:19.2,z:4.8};
  WORLD.addCollider(18.6,4.2,19.8,5.4);
  const juke=new THREE.Group();
  const jb=clayBox(1.1,2.0,0.8,0x8a3a5a,0.06,111); jb.position.y=1.0; juke.add(jb);
  const jarc=clayCyl(0.55,0.55,0.8,0xe8a33d,0.05,112); jarc.rotation.z=Math.PI/2; jarc.rotation.y=Math.PI/2; jarc.position.y=2.0; jarc.scale.z=0.5; juke.add(jarc);
  juke.position.set(19.5,0.3,-3.2); scene.add(juke);
  WORLD.addCollider(18.9,-3.8,20.1,-2.6);

  /* pub door + OPEN sign */
  const sign=new THREE.Group();
  const sb=clayBox(1.5,0.8,0.12,0xe8d9a8,0.04,121); sb.position.y=0; sign.add(sb);
  sign.position.set(11.1,2.2,6.7); scene.add(sign);
  WORLD.props.openSign=sign;
  WORLD.anchors.pubDoor={x:11.1,z:6.6};
  WORLD.anchors.pubDoorIn={x:11.1,z:4.6};

  /* boarded doorways to the future wings */
  const board=(z,key)=>{
    const b=new THREE.Group();
    const door=clayBox(0.24,2.4,1.7,0x5e402a,0.04,z*13); door.position.y=1.2; b.add(door);
    const plank1=clayBox(0.3,0.3,2.0,0x9a7a52,0.05,z*17); plank1.position.y=1.5; plank1.rotation.x=0.4; b.add(plank1);
    const plank2=plank1.clone(); plank2.rotation.x=-0.5; plank2.position.y=1.0; b.add(plank2);
    b.position.set(20.5,0.3,z); scene.add(b);
    WORLD.addCollider(20.1,z-0.95,20.9,z+0.95,"board_"+key);
    WORLD.props["board_"+key]=b;
    return b;
  };
  board(-1.5,"kitchen"); board(2.5,"gift");
  WORLD.anchors.kitchenDoor={x:19.6,z:-1.5}; WORLD.anchors.giftDoor={x:19.6,z:2.5};
}

WORLD.openWing = function(key){
  const b=WORLD.props["board_"+key];
  if(b){ b.visible=false; WORLD.dropCollider("board_"+key); }
};

/* ---- THE WINGS: kitchen + gift shop shells (built always, sealed until rank) ---- */
function buildWings(scene){
  const KX1=20.5, KX2=28.5;
  /* kitchen: z -9 .. -0.8 */
  {
    const Z1=-9, Z2=-0.8;
    const fl=new THREE.Mesh(new THREE.BoxGeometry(KX2-KX1,0.3,Z2-Z1), clayMat(0x96703f));
    fl.position.set((KX1+KX2)/2,0.15,(Z1+Z2)/2); fl.receiveShadow=true; scene.add(fl);
    wall(scene, KX1,Z1, KX2,Z1, 3.8, 0x8a4e36);
    wall(scene, KX2,Z1, KX2,Z2, 3.8, 0x82492f);
    wall(scene, KX1,Z2, KX2,Z2, 1.1, 0x8a4e36);
    rafters(scene, KX1+0.4, Z1+0.4, KX2-0.4, Z2-0.4, 3.8, 0x5e402a);
    /* the fryer (also the smoker; it contains multitudes) */
    const fry=new THREE.Group();
    const body=clayBox(1.6,1.3,1.2,0x8a8a92,0.04,701); body.position.y=0.65; fry.add(body);
    const vat=clayBox(1.3,0.3,0.9,0x4a3a2a,0.05,702); vat.position.y=1.35; fry.add(vat);
    const oil=new THREE.Mesh(geoGet("fryoil",()=>new THREE.BoxGeometry(1.15,0.08,0.75)),
      new THREE.MeshStandardMaterial({color:0xd8a83a, roughness:0.3}));
    oil.position.y=1.42; fry.add(oil);
    const dial=clayCyl(0.14,0.14,0.1,0xb5472e,0.06,703); dial.rotation.x=Math.PI/2; dial.position.set(0.6,0.9,0.62); fry.add(dial);
    const stack=clayCyl(0.14,0.18,1.6,0x4a4a4a,0.06,704); stack.position.set(-0.6,2.2,-0.3); fry.add(stack);
    fry.position.set(24.5,0.3,-7.2); scene.add(fry);
    WORLD.addCollider(23.6,-7.9,25.4,-6.5);
    WORLD.props.fryer=fry; WORLD.props.fryerOil=oil;
    WORLD.anchors.fryer={x:24.5,z:-5.8};
    /* prep counter */
    const counter=clayBox(4.5,1.2,1.0,0x6a4a30,0.03,705); counter.position.set(23.5,0.9,-2.2); counter.castShadow=true; scene.add(counter);
    const cTop=clayBox(4.8,0.14,1.2,0x9a7a52,0.02,706); cTop.position.set(23.5,1.56,-2.2); scene.add(cTop);
    WORLD.addCollider(21.1,-2.7,25.9,-1.7);
    WORLD.anchors.kCounter={x:23.5,z:-3.6};
    /* Big Tim's spot */
    WORLD.anchors.timSpot={x:26.2,z:-5.6};
  }
  /* gift shop: z 0.8 .. 6.5 */
  {
    const Z1=0.8, Z2=6.5;
    const fl=new THREE.Mesh(new THREE.BoxGeometry(KX2-KX1,0.3,Z2-Z1), clayMat(0x9c7a4e));
    fl.position.set((KX1+KX2)/2,0.15,(Z1+Z2)/2); fl.receiveShadow=true; scene.add(fl);
    wall(scene, KX1,Z1, KX2,Z1, 3.8, 0x8a4e36);
    wall(scene, KX2,Z1, KX2,Z2, 3.8, 0x82492f);
    wall(scene, KX1,Z2, 24,Z2, 1.1, 0x8a4e36);
    wall(scene, 26,Z2, KX2,Z2, 1.1, 0x8a4e36);
    rafters(scene, KX1+0.4, Z1+0.4, KX2-0.4, Z2-0.4, 3.8, 0x5e402a);
    /* merch shelves along the north wall */
    const shelf=new THREE.Group();
    const frame=clayBox(6.4,2.2,0.5,0x7a5a3a,0.03,711); frame.position.set(0,1.1,0); shelf.add(frame);
    for(let i=0;i<2;i++){ const bd=clayBox(6.4,0.1,0.8,0x9a7a52,0.02,712+i); bd.position.set(0,0.75+i*0.75,0.2); shelf.add(bd); }
    shelf.position.set(24.5,0.3,1.45); scene.add(shelf);
    WORLD.addCollider(21.3,1.0,27.7,1.9);
    WORLD.anchors.giftShelf={x:24.5,z:2.9};
    WORLD.props.giftShelf=shelf;
    /* hat rack */
    const rack=new THREE.Group();
    const pole=clayCyl(0.09,0.13,2.2,0x6a4a30,0.05,715); pole.position.y=1.1; rack.add(pole);
    for(let i=0;i<4;i++){ const a=i/4*Math.PI*2;
      const arm=clayCyl(0.04,0.04,0.5,0x6a4a30,0.06,716+i); arm.rotation.z=Math.PI/2; arm.rotation.y=a;
      arm.position.set(Math.cos(a)*0.25,1.7-i*0.12,Math.sin(a)*0.25); rack.add(arm); }
    rack.position.set(27.4,0.3,5.3); scene.add(rack);
    WORLD.addCollider(27.0,4.9,27.8,5.7);
    WORLD.anchors.hatRack={x:26.6,z:5.0};
    WORLD.anchors.browse={x:24.3,z:3.8};
    /* jerky rack pad (epilogue) */
    WORLD.anchors.jerky={x:21.6,z:5.4};
  }
}

/* ---- dumpster (the Boys' buffet) ---- */
function buildDumpster(scene){
  const g=new THREE.Group();
  const bin=clayBox(2.4,1.4,1.4,0x4c6a4c,0.05,721); bin.position.y=0.7; g.add(bin);
  const lid=clayBox(2.5,0.16,1.5,0x3e5a3e,0.06,722); lid.position.set(0,1.45,-0.1); lid.rotation.x=-0.18; g.add(lid);
  const grain=claySphere(0.8,0xc9a86a,0.2,723); grain.position.set(0.4,1.5,0.3); grain.scale.set(1,0.4,1); grain.visible=false; g.add(grain);
  g.position.set(-3.6,0,13.2);
  scene.add(g);
  WORLD.addCollider(-4.9,12.4,-2.3,14.0);
  WORLD.props.dumpster=g; WORLD.props.dumpsterGrain=grain; WORLD.props.dumpsterLid=lid;
  WORLD.anchors.dumpster={x:-3.6,z:11.6};
}

/* ---- string lights over the pub front ---- */
function buildStringLights(scene){
  const g=new THREE.Group();
  const mat=new THREE.MeshBasicMaterial({color:0xffc86a, transparent:true, opacity:0});
  const strand=(x1,z1,x2,z2,y)=>{
    const n=14;
    for(let i=0;i<=n;i++){
      const t=i/n;
      const sag=Math.sin(t*Math.PI)*0.55;
      const bulb=new THREE.Mesh(geoGet("bulb",()=>new THREE.SphereGeometry(0.09,6,5)), mat);
      bulb.position.set(lerp(x1,x2,t), y-sag, lerp(z1,z2,t));
      g.add(bulb);
    }
  };
  strand(4.2,6.4, 20.3,6.4, 4.1);
  strand(4.2,-8.6, 20.3,-8.6, 4.3);
  strand(20.7,6.6, 28.3,6.6, 4.0);
  scene.add(g);
  WORLD.props.stringLights=g; WORLD.props.stringMat=mat;
}

/* ---- the leaf-season tour bus ---- */
function buildBus(scene){
  const g=new THREE.Group();
  const body=clayBox(2.4,2.2,7.5,0xd8863a,0.04,731); body.position.y=1.6; g.add(body);
  const stripe=clayBox(2.5,0.5,7.6,0xf4ead8,0.03,732); stripe.position.y=1.9; g.add(stripe);
  for(let i=0;i<4;i++){ const win=clayBox(2.52,0.6,1.1,0x8ab0c8,0.02,733+i); win.position.set(0,2.35,-2.7+i*1.8); g.add(win); }
  for(const [wx,wz] of [[-1.1,2.6],[1.1,2.6],[-1.1,-2.6],[1.1,-2.6]]){
    const wh=clayCyl(0.6,0.6,0.4,0x2a2a2a,0.04,738); wh.rotation.z=Math.PI/2; wh.position.set(wx,0.6,wz); g.add(wh);
  }
  g.position.set(70,0,27.5); g.rotation.y=Math.PI/2;
  scene.add(g);
  WORLD.props.bus=g;
}

/* ---- yard: forklift pad, delivery pad, mailbox, fence bits ---- */
function buildYard(scene){
  // delivery pad chalk outline
  const pad=new THREE.Mesh(geoGet("padline",()=>new THREE.RingGeometry(2.6,2.9,4,1)),
    new THREE.MeshBasicMaterial({color:0xf4ead8, transparent:true, opacity:0.5}));
  pad.rotation.x=-Math.PI/2; pad.rotation.z=Math.PI/4; pad.position.set(0,0.06,15.2);
  scene.add(pad);
  WORLD.anchors.pad={x:0,z:15.2};

  // mailbox by the road
  const mb=new THREE.Group();
  const post=clayCyl(0.09,0.12,1.2,0x6a4a30,0.05,131); post.position.y=0.6; mb.add(post);
  const box=clayBox(0.5,0.4,0.8,0xb5472e,0.06,132); box.position.y=1.35; mb.add(box);
  const flag=clayBox(0.06,0.34,0.1,0xe8a33d,0.05,133); flag.position.set(0.28,1.6,0.2); mb.add(flag);
  mb.position.set(4.5,0,22.5); scene.add(mb);
  WORLD.props.mailbox=mb; WORLD.anchors.mailbox={x:4.5,z:21.4};
  WORLD.addCollider(4.1,22.1,4.9,22.9);

  // porch step at shack door (jar spawns here)
  WORLD.anchors.porch={x:-12.2,z:6.2};

  // crick dip spot
  WORLD.anchors.crick={x:-25.6,z:8};

  // fence along road edges (broken, charming)
  for(let x=-22;x<28;x+=3.4){
    if(x>8 && x<15) continue; // driveway gap
    const f=clayBox(0.18,1.0,0.18,0x9a8a6a,0.08,x*3); f.position.set(x,0.5+WORLD.getH(x,23),23);
    scene.add(f);
    const rail=clayBox(3.0,0.14,0.12,0x9a8a6a,0.06,x*5); rail.position.set(x+1.6,0.85+WORLD.getH(x,23),23); rail.rotation.z=rand(-0.05,0.05);
    scene.add(rail);
  }

  /* the delivery truck (parks off-map, drives in) */
  const truck=new THREE.Group();
  const cab=clayBox(1.8,1.7,2.2,0xb5472e,0.05,141); cab.position.set(0,1.3,1.9); truck.add(cab);
  const bedT=clayBox(2.2,1.3,3.4,0x8a8a82,0.04,142); bedT.position.set(0,1.0,-1.2); truck.add(bedT);
  for(const [wx,wz] of [[-1,1.6],[1,1.6],[-1,-2],[1,-2]]){
    const wh=clayCyl(0.55,0.55,0.4,0x2a2a2a,0.05,143); wh.rotation.z=Math.PI/2; wh.position.set(wx,0.55,wz); truck.add(wh);
  }
  truck.position.set(-60,0,27); truck.rotation.y=Math.PI/2;
  scene.add(truck); WORLD.props.truck=truck;
}

/* ---- trail, spring, glacier gate ---- */
function buildTrailAndSpring(scene){
  const sx=6, sz=-33, sh=WORLD.getH(sx,sz);
  const ring=new THREE.Group();
  for(let i=0;i<8;i++){ const a=i/8*Math.PI*2;
    const r=claySphere(rand(0.35,0.6),0x8a8a82,0.15,150+i); r.position.set(Math.cos(a)*2.8,0.2,Math.sin(a)*2.8); ring.add(r); }
  ring.position.set(sx,sh,sz); scene.add(ring);
  WORLD.anchors.spring={x:sx,z:sz+3.4};
  const springSign=clayBox(1.3,0.7,0.1,0xe8d9a8,0.05,161); springSign.position.set(sx-2.6,sh+1.4,sz+2.8); springSign.rotation.y=0.4; scene.add(springSign);

  // glacier: blueish crag + rope gate on the trail up
  const gx=26, gz=-44, gh=WORLD.getH(gx,gz);
  const berg=new THREE.Group();
  for(let i=0;i<5;i++){ const b=clayBox(rand(1.4,3),rand(1.4,3.2),rand(1.4,3),0xcfe4f0,0.12,170+i);
    b.position.set(rand(-2,2),rand(0.5,2),rand(-2,2)); b.rotation.y=rand(3); berg.add(b); }
  berg.position.set(gx,gh,gz); scene.add(berg);
  WORLD.anchors.glacier={x:gx,z:gz+3.6};
  const gatePost1=clayCyl(0.12,0.15,1.4,0x6a4a30,0.06,181); gatePost1.position.set(14,WORLD.getH(14,-37)+0.7,-37); scene.add(gatePost1);
  const gatePost2=gatePost1.clone(); gatePost2.position.set(17.4,WORLD.getH(17.4,-38)+0.7,-38); scene.add(gatePost2);
  const rope=clayBox(3.6,0.08,0.08,0xc9b878,0.1,182); rope.position.set(15.7,WORLD.getH(15.7,-37.5)+1.1,-37.5); rope.rotation.y=-0.25; scene.add(rope);
  WORLD.props.glacierRope=rope;
  WORLD.anchors.glacierGate={x:15.7,z:-36.2};
  WORLD.addCollider(13.4,-38.4,18,-36.9,"glacier");   // rope blocks until unlocked
}

/* ---- Copperhead's place across the crick ---- */
function buildCopperheads(scene){
  const cx=-48, cz=-6, ch=WORLD.getH(cx,cz);
  const g=new THREE.Group();
  const shack=clayBox(4.5,3,3.6,0x5e4a3a,0.06,191); shack.position.y=1.5; g.add(shack);
  const roof=clayBox(5.2,0.4,4.2,0x3e332a,0.05,192); roof.position.y=3.2; roof.rotation.z=0.06; g.add(roof);
  // the still: kettle + coil
  const still=clayCyl(0.8,1.0,1.6,0x8a8a92,0.06,193); still.position.set(3.2,0.8,0.6); g.add(still);
  const coil=new THREE.Mesh(geoGet("coil",()=>new THREE.TorusKnotGeometry(0.4,0.1,40,6,2,3)), clayMat(0xb87333));
  coil.position.set(3.2,2.0,0.6); g.add(coil);
  const truck2=clayBox(2,1.4,3.6,0x4a5a6a,0.06,194); truck2.position.set(-3.4,0.7,1.4); g.add(truck2);
  g.position.set(cx,ch,cz);
  scene.add(g);
  WORLD.props.copperheads=g;
  WORLD.anchors.copperheads={x:cx,z:cz};
  // smoke ember from the still (puffs spawned in loop)
  WORLD.props.stillSmokeAt={x:cx+3.2,y:ch+3,z:cz+0.6};
}

/* ---- night: fireflies + stars ---- */
function buildNightBits(scene){
  const fg=new THREE.BufferGeometry();
  const N=90, pos=new Float32Array(N*3);
  for(let i=0;i<N;i++){
    const x=rand(-30,30), z=rand(-20,24);
    pos[i*3]=x; pos[i*3+1]=WORLD.getH(x,z)+rand(0.5,2.6); pos[i*3+2]=z;
  }
  fg.setAttribute("position", new THREE.BufferAttribute(pos,3));
  const fm=new THREE.PointsMaterial({color:0xd8f0a0, size:0.16, transparent:true, opacity:0, sizeAttenuation:true});
  WORLD.fireflies=new THREE.Points(fg,fm); scene.add(WORLD.fireflies);

  const sg=new THREE.BufferGeometry();
  const SN=240, sp=new Float32Array(SN*3);
  for(let i=0;i<SN;i++){ const a=rand(Math.PI*2), r=rand(60,140);
    sp[i*3]=Math.cos(a)*r; sp[i*3+1]=rand(30,90); sp[i*3+2]=Math.sin(a)*r-40; }
  sg.setAttribute("position", new THREE.BufferAttribute(sp,3));
  WORLD.stars=new THREE.Points(sg, new THREE.PointsMaterial({color:0xdfe8ff, size:0.5, transparent:true, opacity:0, fog:false}));
  scene.add(WORLD.stars);
}

WORLD.update = function(dt){
  if(WORLD.waterTex) WORLD.waterTex.offset.y -= dt*0.06;
  // firefly drift
  if(WORLD.fireflies && WORLD.fireflies.material.opacity>0.01){
    const p=WORLD.fireflies.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      p.setY(i, p.getY(i)+Math.sin(CLAY.raw*1.7+i*2.3)*0.004);
      p.setX(i, p.getX(i)+Math.cos(CLAY.raw*0.9+i)*0.006);
    }
    p.needsUpdate=true;
  }
  // still smoke
  if(Math.random()<dt*1.6){
    const s=WORLD.props.stillSmokeAt;
    if(s) puff(s.x+rand(-.2,.2), s.y, s.z, 0xbfc4c8, 0.5, 0.7, 3.2);
  }
};
