import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PUBLIC_DIR = join(process.cwd(), 'public');
const INDEX_PATH = join(PUBLIC_DIR, 'index.html');

let html = await readFile(INDEX_PATH, 'utf8');
const beforeBytes = Buffer.byteLength(html);

html = html
  .replace(/<style\b[^>]*id=(['"])yjsy-light-effects-style\1[^>]*>[\s\S]*?<\/style>/gi, '')
  .replace(/<script\b[^>]*id=(['"])yjsy-light-effects-runtime\1[^>]*>[\s\S]*?<\/script>/gi, '');

const css = `
.banner{position:relative}
#yjsy-fx-layer{position:absolute;z-index:4;inset:0;overflow:hidden;pointer-events:none;contain:layout paint style;transform:translateZ(0)}
.yjsy-fx-petal,.yjsy-fx-mote,.yjsy-fx-butterfly{position:absolute;display:block;pointer-events:none;will-change:transform,opacity}
.yjsy-fx-petal{top:-7%;left:var(--x);width:var(--size);height:calc(var(--size)*.66);border-radius:80% 8% 80% 12%;background:linear-gradient(145deg,rgba(255,236,239,.95),rgba(238,139,151,.84));box-shadow:0 0 4px rgba(255,220,226,.42);opacity:0;animation:yjsyPetal var(--dur) linear var(--delay) infinite}
@keyframes yjsyPetal{0%{opacity:0;transform:translate3d(0,-6vh,0) rotate(0deg)}9%{opacity:.9}78%{opacity:.72}100%{opacity:0;transform:translate3d(var(--drift),112vh,0) rotate(var(--spin))}}
.yjsy-fx-mote{left:var(--x);top:var(--y);width:var(--size);height:var(--size);border-radius:50%;background:rgba(255,234,159,.95);box-shadow:0 0 9px 3px rgba(255,213,91,.5);opacity:.18;animation:yjsyMote var(--dur) ease-in-out var(--delay) infinite alternate}
@keyframes yjsyMote{0%{opacity:.12;transform:translate3d(-8px,8px,0) scale(.72)}55%{opacity:.9}100%{opacity:.24;transform:translate3d(12px,-16px,0) scale(1.18)}}
.yjsy-fx-butterfly{left:var(--x);top:var(--y);width:22px;height:15px;opacity:.2;animation:yjsyButterfly var(--dur) ease-in-out var(--delay) infinite alternate}
.yjsy-fx-butterfly:before,.yjsy-fx-butterfly:after{content:'';position:absolute;top:2px;width:12px;height:10px;background:radial-gradient(ellipse at 70% 60%,rgba(255,255,255,.98),rgba(211,251,255,.24) 72%,transparent 76%);filter:drop-shadow(0 0 4px rgba(226,255,255,.72));transform-origin:100% 60%;animation:yjsyWing .62s ease-in-out infinite alternate}
.yjsy-fx-butterfly:before{left:0;border-radius:90% 18% 72% 18%;transform:rotate(18deg)}
.yjsy-fx-butterfly:after{right:0;border-radius:18% 90% 18% 72%;transform-origin:0 60%;transform:rotate(-18deg);animation-direction:alternate-reverse}
@keyframes yjsyWing{from{scale:.38 1}to{scale:1 1}}
@keyframes yjsyButterfly{0%{opacity:.15;transform:translate3d(-12px,8px,0) rotate(-5deg)}35%{opacity:.72}100%{opacity:.28;transform:translate3d(55px,-28px,0) rotate(7deg)}}
.taptap-direct-link{position:relative;overflow:hidden;border-radius:4px;transform:translateZ(0);transition:transform .2s ease,filter .2s ease}
.taptap-direct-link:after{content:'';position:absolute;z-index:2;top:-85%;left:-58%;width:31%;height:270%;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(255,255,255,.68),transparent);transform:translate3d(-240%,0,0) rotate(18deg);animation:yjsyShimmer 5.2s ease-in-out 1.1s infinite}
.taptap-direct-link:hover{transform:translateZ(0) scale(1.035);filter:brightness(1.08)}
@keyframes yjsyShimmer{0%,68%{transform:translate3d(-240%,0,0) rotate(18deg)}88%,100%{transform:translate3d(720%,0,0) rotate(18deg)}}
.header ul li{position:relative}
.header ul li:after{content:'';position:absolute;left:18%;right:18%;bottom:-8px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,#c88cae,transparent);transform:scaleX(0);transform-origin:center;transition:transform .22s ease}
.header ul li:hover:after{transform:scaleX(1)}
.yjsy-reveal{opacity:0;transform:translate3d(0,24px,0);transition:opacity .65s ease,transform .65s cubic-bezier(.2,.7,.2,1)}
.yjsy-reveal.yjsy-revealed{opacity:1;transform:translate3d(0,0,0)}
html.yjsy-fx-paused #yjsy-fx-layer *,html.yjsy-fx-paused .taptap-direct-link:after{animation-play-state:paused!important}
@media(max-width:900px){.taptap-direct-link:hover{transform:none}.header ul li:after{display:none}}
@media(prefers-reduced-motion:reduce){#yjsy-fx-layer{display:none!important}.taptap-direct-link:after{display:none!important}.taptap-direct-link,.yjsy-reveal{animation:none!important;transition:none!important;transform:none!important;opacity:1!important}}
`;

const js = `(()=>{
'use strict';
function start(){
  const banner=document.querySelector('.banner');
  if(!banner||document.getElementById('yjsy-fx-layer'))return;
  const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile=window.matchMedia&&window.matchMedia('(max-width: 900px)').matches;
  const lowEnd=(navigator.deviceMemory&&navigator.deviceMemory<=2)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=2);
  if(!reduced){
    const layer=document.createElement('div');
    layer.id='yjsy-fx-layer';
    layer.setAttribute('aria-hidden','true');
    banner.appendChild(layer);
    const petals=lowEnd?2:(mobile?4:8);
    const motes=lowEnd?1:(mobile?2:5);
    const butterflies=lowEnd?0:(mobile?1:2);
    for(let i=0;i<petals;i++){
      const item=document.createElement('i');
      item.className='yjsy-fx-petal';
      item.style.cssText='--x:'+((i*17+9)%94)+'%;--size:'+(8+(i%4)*2)+'px;--dur:'+(9+(i%5)*1.7)+'s;--delay:'+(-i*1.35)+'s;--drift:'+(-58+(i*29)%116)+'px;--spin:'+(280+i*97)+'deg';';
      layer.appendChild(item);
    }
    for(let i=0;i<motes;i++){
      const item=document.createElement('i');
      item.className='yjsy-fx-mote';
      item.style.cssText='--x:'+((i*23+14)%86)+'%;--y:'+(18+(i*19)%58)+'%;--size:'+(3+(i%3))+'px;--dur:'+(3.8+i*.65)+'s;--delay:'+(-i*.82)+'s;';
      layer.appendChild(item);
    }
    for(let i=0;i<butterflies;i++){
      const item=document.createElement('i');
      item.className='yjsy-fx-butterfly';
      item.style.cssText='--x:'+(22+i*48)+'%;--y:'+(24+i*22)+'%;--dur:'+(5.8+i*1.1)+'s;--delay:'+(-i*2.1)+'s;';
      layer.appendChild(item);
    }
  }
  const sections=[...document.querySelectorAll('.newNotice,.roleSummaryBg,.featureBg,.audio_visual')];
  sections.forEach(section=>section.classList.add('yjsy-reveal'));
  if(reduced||!('IntersectionObserver'in window)){
    sections.forEach(section=>section.classList.add('yjsy-revealed'));
  }else{
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        entry.target.classList.add('yjsy-revealed');
        observer.unobserve(entry.target);
      });
    },{rootMargin:'0px 0px -8% 0px',threshold:.08});
    sections.forEach(section=>observer.observe(section));
  }
  document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('yjsy-fx-paused',document.hidden),{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();`;

html = html.replace('</head>', `<style id="yjsy-light-effects-style">${css}</style></head>`);
html = html.replace('</body>', `<script id="yjsy-light-effects-runtime">${js}</script></body>`);

await writeFile(INDEX_PATH, html);
await writeFile(
  join(PUBLIC_DIR, 'light-effects-report.json'),
  JSON.stringify({
    htmlBeforeBytes: beforeBytes,
    htmlAfterBytes: Buffer.byteLength(html),
    cssBytes: Buffer.byteLength(css),
    jsBytes: Buffer.byteLength(js),
    maximumAnimatedNodes: 15,
    usesCanvas: false,
    usesMutationObserver: false,
    respectsReducedMotion: true,
    pausesWhenHidden: true
  }, null, 2)
);

console.log(`Light effects patch completed: CSS ${Buffer.byteLength(css)} bytes; JS ${Buffer.byteLength(js)} bytes; canvas=false; mutationObserver=false.`);
