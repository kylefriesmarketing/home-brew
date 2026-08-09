"use strict";
const $ = id => document.getElementById(id);
const clamp = (v,a,b) => v<a?a:v>b?b:v;
const lerp = (a,b,t) => a+(b-a)*t;
const damp = (a,b,k,dt) => lerp(a,b,1-Math.exp(-k*dt));
const rand = (a=1,b) => b===undefined ? Math.random()*a : a+Math.random()*(b-a);
const irand = n => (Math.random()*n)|0;
const pick = arr => arr[irand(arr.length)];
const dist2 = (ax,az,bx,bz) => { const dx=ax-bx, dz=az-bz; return dx*dx+dz*dz; };
const fmt$ = n => (n<0?"-$":"$") + Math.abs(Math.round(n*10)/10);
const angLerp = (a,b,t) => { let d=b-a; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2; return a+d*t; };
const V3 = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);

/* toast queue */
function toast(txt, cls="", ms=3400){
  const t=document.createElement("div"); t.className="toast "+cls; t.innerHTML=txt;
  $("toasts").appendChild(t);
  setTimeout(()=>{ t.style.transition="opacity .5s, transform .5s"; t.style.opacity=0; t.style.transform="translateY(-10px)"; setTimeout(()=>t.remove(),520); }, ms);
}

var G_STATE = null;   // the whole save; created by ECON.newState()

/* tiny event bus */
const BUS = { m:{}, on(k,f){ (this.m[k]=this.m[k]||[]).push(f); }, emit(k,a){ (this.m[k]||[]).forEach(f=>f(a)); } };
