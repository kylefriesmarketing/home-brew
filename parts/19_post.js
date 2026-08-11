"use strict";
/* POST — the miniature-diorama film look (free, pure view).
   scene → HDR MSAA target → (bright ¼ → blur ×2 = bloom) + (blur ½ ×2 = defocus)
   → composite(sharp, defocus band, bloom, grade) → canvas.
   THE three.js FACT this hinges on: tone mapping only applies when rendering to
   the CANVAS (renderTarget === null). So the scene lands in the RT as LINEAR HDR
   and the composite shader applies ACES + sRGB itself via the include chunks
   (material.toneMapped = true). Intermediates stay linear. Same architecture as
   Age of Toys' post.js — lessons inherited: sceneRT.samples=4 or the canvas MSAA
   is silently lost; bloom threshold 1.0 uses HDR headroom as the gate (a LOWER
   threshold makes the sunlit grass glow). */

const POST = {
  ok:false, enabled:true,
  p:{ bloomStr:0.35, bloomThresh:1.0, blurMax:0.68, vignette:0.26, sat:1.07,
      warmth:0.035, lift:1.0,
      /* DEPTH focus (replaces the fixed screen band — a wall at the top of frame
         used to blur while a mountain at screen-centre stayed razor sharp).
         focusRange is in WORLD UNITS: a thin sharp plane is what makes a real
         macro shot read as miniature. */
      focusRange:8.0, focusBias:0.0, coCPow:1.3,
      /* film */
      grain:0.035, halation:0.5, ca:0.9, weave:0.9, flicker:0.012 },
};

POST.setup = function(){
  const R=WORLD.renderer;
  if(!R.capabilities.isWebGL2){ POST.ok=false; return; }
  const size=new THREE.Vector2(); R.getDrawingBufferSize(size);
  const mk=(w,h,samples)=>new THREE.WebGLRenderTarget(w,h,{
    type:THREE.HalfFloatType, samples:samples||0,
    minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter, depthBuffer:!!samples });
  POST.sceneRT=mk(size.x,size.y,4);
  /* depth attachment so focus can be computed from real distance. three
     blit-resolves the multisampled depth into this texture, so we keep MSAA. */
  POST.sceneRT.depthTexture=new THREE.DepthTexture(size.x,size.y);
  POST.sceneRT.depthTexture.type=THREE.UnsignedIntType;
  POST.defA=mk(size.x>>1,size.y>>1); POST.defB=mk(size.x>>1,size.y>>1);
  POST.bloomA=mk(size.x>>2,size.y>>2); POST.bloomB=mk(size.x>>2,size.y>>2);
  POST.w=size.x; POST.h=size.y;

  POST.qscene=new THREE.Scene();
  POST.qcam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  POST.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2));
  POST.quad.frustumCulled=false;
  POST.qscene.add(POST.quad);

  const vsh=`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,1.0,1.0); }`;

  POST.matBright=new THREE.ShaderMaterial({ uniforms:{ tSrc:{value:null}, thresh:{value:1.0} },
    vertexShader:vsh, fragmentShader:`
    varying vec2 vUv; uniform sampler2D tSrc; uniform float thresh;
    void main(){ vec3 c=texture2D(tSrc,vUv).rgb;
      float l=dot(c,vec3(0.2126,0.7152,0.0722));
      gl_FragColor=vec4(c*max(l-thresh,0.0)/max(l,0.0001),1.0); }`,
    depthTest:false, depthWrite:false });
  POST.matBright.toneMapped=false;

  POST.matBlur=new THREE.ShaderMaterial({ uniforms:{ tSrc:{value:null}, dir:{value:new THREE.Vector2(1,0)}, texel:{value:new THREE.Vector2()} },
    vertexShader:vsh, fragmentShader:`
    varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 dir; uniform vec2 texel;
    void main(){
      vec2 d=dir*texel;
      vec3 c=texture2D(tSrc,vUv).rgb*0.227;
      c+=texture2D(tSrc,vUv+d*1.385).rgb*0.316; c+=texture2D(tSrc,vUv-d*1.385).rgb*0.316;
      c+=texture2D(tSrc,vUv+d*3.231).rgb*0.070; c+=texture2D(tSrc,vUv-d*3.231).rgb*0.070;
      gl_FragColor=vec4(c,1.0); }`,
    depthTest:false, depthWrite:false });
  POST.matBlur.toneMapped=false;

  POST.matComp=new THREE.ShaderMaterial({ uniforms:{
      tSharp:{value:null}, tBlur:{value:null}, tBloom:{value:null}, tDepth:{value:null},
      bloomStr:{value:0.35}, blurMax:{value:0.55}, vig:{value:0.26},
      sat:{value:1.07}, warmth:{value:0.035}, lift:{value:1.0},
      camNear:{value:0.1}, camFar:{value:400.0},
      focusDist:{value:16.0}, focusRange:{value:7.0}, coCPow:{value:1.35},
      grainAmt:{value:0.035}, halation:{value:0.5}, caAmt:{value:0.9},
      weaveAmt:{value:0.9}, flicker:{value:0.0}, expo:{value:1.0}, texel:{value:new THREE.Vector2()} },
    vertexShader:vsh, fragmentShader:`
    #include <packing>
    varying vec2 vUv;
    uniform sampler2D tSharp; uniform sampler2D tBlur; uniform sampler2D tBloom; uniform sampler2D tDepth;
    uniform float bloomStr, blurMax, vig, sat, warmth, lift;
    uniform float camNear, camFar, focusDist, focusRange, coCPow;
    uniform float grainAmt, halation, caAmt, weaveAmt, flicker, expo;
    uniform vec2 texel;

    float linDepth(vec2 uv){
      float d=texture2D(tDepth,uv).x;
      return -perspectiveDepthToViewZ(d, camNear, camFar);   // distance in WORLD units
    }
    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

    void main(){
      /* GATE WEAVE — the film gate never registers perfectly twice. Sub-pixel
         shift on the exposure clock; the whole frame moves together. */
      vec2 uv = vUv + vec2(weaveAmt,weaveAmt*0.7)*texel*flicker;

      /* CIRCLE OF CONFUSION from real distance. Depth of field shrinks as
         magnification grows — that's the physical fact miniatures exploit, and
         a fixed screen band cannot express it. */
      float dist=linDepth(uv);
      float coc=clamp(abs(dist-focusDist)/max(focusRange,0.001),0.0,1.0);
      coc=pow(coc,coCPow)*blurMax;

      vec3 sharp=texture2D(tSharp,uv).rgb;
      /* radial chromatic aberration, corners only, sub-pixel */
      vec2 dir=(uv-0.5);
      float rad=dot(dir,dir);
      vec2 caO=dir*rad*caAmt*texel*2.0;
      sharp.r=texture2D(tSharp,uv+caO).r;
      sharp.b=texture2D(tSharp,uv-caO).b;

      vec3 soft=texture2D(tBlur,uv).rgb;
      vec3 c=mix(sharp,soft,coc);

      vec3 bl=texture2D(tBloom,uv).rgb;
      c+=bl*bloomStr;
      /* HALATION — light bleeding warm through the emulsion backing */
      c+=bl*vec3(1.0,0.42,0.16)*halation;

      c*=lift*expo;                                    // exposure flicker
      c.r*=1.0+warmth; c.b*=1.0-warmth*0.8;
      float l=dot(c,vec3(0.2126,0.7152,0.0722));
      c=mix(vec3(l),c,sat);

      /* GRAIN in scene-linear BEFORE the tone map, luminance-weighted so it
         lives in the shadows the way real stock does */
      float g=hash(uv*vec2(1024.0,1024.0)+flicker*37.0)-0.5;
      c+=g*grainAmt*(1.0-smoothstep(0.0,0.85,l))*max(l,0.06);

      float vd=distance(uv,vec2(0.5));
      c*=1.0-smoothstep(0.42,0.86,vd)*vig;
      gl_FragColor=vec4(max(c,0.0),1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    depthTest:false, depthWrite:false });
  POST.matComp.toneMapped=true;

  POST.ok=true;
};

POST.checkSize = function(){
  const R=WORLD.renderer, s=new THREE.Vector2(); R.getDrawingBufferSize(s);
  if(s.x===POST.w && s.y===POST.h) return;
  POST.w=s.x; POST.h=s.y;
  if(POST.sceneRT.depthTexture){                   // keep the depth attachment in step
    POST.sceneRT.depthTexture.image.width=s.x;
    POST.sceneRT.depthTexture.image.height=s.y;
    POST.sceneRT.depthTexture.needsUpdate=true;
  }
  POST.sceneRT.setSize(s.x,s.y);
  POST.defA.setSize(s.x>>1,s.y>>1); POST.defB.setSize(s.x>>1,s.y>>1);
  POST.bloomA.setSize(s.x>>2,s.y>>2); POST.bloomB.setSize(s.x>>2,s.y>>2);
};

POST.pass = function(mat, src, dst, dir){
  const R=WORLD.renderer;
  POST.quad.material=mat;
  if(mat===POST.matBlur){
    mat.uniforms.tSrc.value=src.texture;
    mat.uniforms.dir.value.set(dir?1:0, dir?0:1);
    mat.uniforms.texel.value.set(1/dst.width,1/dst.height);
  }
  R.setRenderTarget(dst);
  R.render(POST.qscene,POST.qcam);
};

POST.render = function(){
  const R=WORLD.renderer;
  if(!POST.ok || !POST.enabled){ R.setRenderTarget(null); R.render(WORLD.scene,WORLD.camera); return; }
  POST.checkSize();
  const p=POST.p;
  R.setRenderTarget(POST.sceneRT);
  R.render(WORLD.scene,WORLD.camera);
  /* bloom chain */
  POST.matBright.uniforms.tSrc.value=POST.sceneRT.texture;
  POST.matBright.uniforms.thresh.value=p.bloomThresh;
  POST.quad.material=POST.matBright;
  R.setRenderTarget(POST.bloomA); R.render(POST.qscene,POST.qcam);
  POST.pass(POST.matBlur,POST.bloomA,POST.bloomB,true);
  POST.pass(POST.matBlur,POST.bloomB,POST.bloomA,false);
  /* defocus chain */
  POST.matBlur.uniforms.tSrc.value=POST.sceneRT.texture;
  POST.quad.material=POST.matBlur;
  POST.matBlur.uniforms.dir.value.set(1,0);
  POST.matBlur.uniforms.texel.value.set(1/POST.defA.width,1/POST.defA.height);
  R.setRenderTarget(POST.defA); R.render(POST.qscene,POST.qcam);
  POST.pass(POST.matBlur,POST.defA,POST.defB,false);
  POST.pass(POST.matBlur,POST.defB,POST.defA,true);
  /* composite to canvas (tone map + sRGB happen HERE) */
  const u=POST.matComp.uniforms;
  u.tSharp.value=POST.sceneRT.texture; u.tBlur.value=POST.defA.texture; u.tBloom.value=POST.bloomA.texture;
  u.tDepth.value=POST.sceneRT.depthTexture;
  u.bloomStr.value=p.bloomStr; u.blurMax.value=p.blurMax; u.vig.value=p.vignette;
  u.sat.value=p.sat; u.warmth.value=p.warmth; u.lift.value=p.lift;
  const cam=WORLD.camera;
  u.camNear.value=cam.near; u.camFar.value=cam.far;
  /* focus rides the thing the camera is actually looking at */
  u.focusDist.value=(typeof MAIN!=="undefined" && MAIN.camTarget)
    ? cam.position.distanceTo(MAIN.camTarget)+p.focusBias : 16;
  u.focusRange.value=p.focusRange; u.coCPow.value=p.coCPow;
  u.grainAmt.value=p.grain; u.halation.value=p.halation; u.caAmt.value=p.ca; u.weaveAmt.value=p.weave;
  /* weave + exposure flicker step on the EXPOSURE clock, not per frame —
     film moves once per photographed frame, not 60 times a second */
  const fr=(typeof CLAY!=="undefined")?CLAY.frame:0;
  const h=(n)=>{ const s=Math.sin(n*127.1)*43758.5453; return s-Math.floor(s); };
  u.flicker.value=(h(fr)-0.5)*2.0;
  u.expo.value=1.0+(h(fr+13.7)-0.5)*2.0*p.flicker;
  u.texel.value.set(1/POST.w, 1/POST.h);
  POST.quad.material=POST.matComp;
  R.setRenderTarget(null);
  R.render(POST.qscene,POST.qcam);
};
