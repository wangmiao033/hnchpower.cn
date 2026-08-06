import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const PUBLIC_DIR = join(process.cwd(), 'public');
const INDEX_PATH = join(PUBLIC_DIR, 'index.html');
const FULL_PATH = join(PUBLIC_DIR, 'assets/yjsy-bg-full.webp');
const HERO_AVIF_PATH = join(PUBLIC_DIR, 'assets/yjsy-hero-fast.avif');
const HERO_WEBP_PATH = join(PUBLIC_DIR, 'assets/yjsy-hero-fast.webp');
const HERO_AVIF_URL = '/assets/yjsy-hero-fast.avif';
const HERO_WEBP_URL = '/assets/yjsy-hero-fast.webp';
const FULL_URL = '/assets/yjsy-bg-full.webp';

const [sourceHtml, fullBuffer] = await Promise.all([
  readFile(INDEX_PATH, 'utf8'),
  readFile(FULL_PATH)
]);

const metadata = await sharp(fullBuffer, { limitInputPixels: false }).metadata();
const sourceWidth = metadata.width || 1912;
const sourceHeight = metadata.height || 4921;
const cropHeight = Math.min(1360, sourceHeight);
const extract = { left: 0, top: 0, width: sourceWidth, height: cropHeight };

const base = sharp(fullBuffer, { limitInputPixels: false }).extract(extract).resize({
  width: 1440,
  withoutEnlargement: true,
  fit: 'inside'
});

const [heroAvif, heroWebp] = await Promise.all([
  base.clone().avif({ quality: 43, effort: 5, chromaSubsampling: '4:2:0' }).toBuffer(),
  base.clone().webp({ quality: 66, effort: 5, smartSubsample: true }).toBuffer()
]);

await Promise.all([
  writeFile(HERO_AVIF_PATH, heroAvif),
  writeFile(HERO_WEBP_PATH, heroWebp)
]);

let html = sourceHtml
  .replace(/<link\b[^>]*href=(['"])\/assets\/yjsy-bg-full\.webp\1[^>]*>/gi, '')
  .replace(/<style\b[^>]*id=(['"])yjsy-split-hero\1[^>]*>[\s\S]*?<\/style>/gi, '')
  .replace(/<script\b[^>]*id=(['"])yjsy-deferred-full-bg\1[^>]*>[\s\S]*?<\/script>/gi, '');

const style = `<style id="yjsy-split-hero">
html,body{background:#a9d6cf}
html:not(.yjsy-full-bg) .container{background-color:#a9d6cf!important;background-image:none!important}
html:not(.yjsy-full-bg) .banner{background-color:#a9d6cf!important;background-image:url("${HERO_WEBP_URL}")!important;background-image:image-set(url("${HERO_AVIF_URL}") type("image/avif") 1x,url("${HERO_WEBP_URL}") type("image/webp") 1x)!important;background-position:center top!important;background-repeat:no-repeat!important;background-size:100% auto!important}
html.yjsy-full-bg .container{background-color:#a9d6cf!important;background-image:url("${FULL_URL}")!important;background-position:center top!important;background-repeat:no-repeat!important;background-size:100% auto!important}
html.yjsy-full-bg .banner{background-image:none!important}
.yjsy-custom-hero .container{background-image:var(--yjsy-custom-hero)!important}
</style>`;

const loader = `<script id="yjsy-deferred-full-bg">(()=>{
'use strict';
let started=false;
function loadFull(){
  if(started)return;
  started=true;
  const image=new Image();
  image.decoding='async';
  image.onload=()=>document.documentElement.classList.add('yjsy-full-bg');
  image.onerror=()=>{};
  image.src='${FULL_URL}';
}
function schedule(){
  const target=document.querySelector('.newNotice')||document.querySelector('.point');
  if('IntersectionObserver'in window&&target){
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();loadFull();}
    },{rootMargin:'0px 0px 120px 0px'});
    observer.observe(target);
  }
  window.addEventListener('scroll',()=>{if(window.scrollY>180)loadFull();},{passive:true,once:true});
  window.addEventListener('load',()=>{
    const run=()=>loadFull();
    if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:7000});else setTimeout(run,5000);
  },{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();</script>`;

html = html.replace(
  '</head>',
  `<link rel="preload" as="image" href="${HERO_AVIF_URL}" type="image/avif" fetchpriority="high">${style}${loader}</head>`
);

await writeFile(INDEX_PATH, html);
await writeFile(
  join(PUBLIC_DIR, 'split-hero-report.json'),
  JSON.stringify({
    source: { width: sourceWidth, height: sourceHeight, bytes: fullBuffer.length },
    cropHeight,
    outputWidth: 1440,
    heroAvifBytes: heroAvif.length,
    heroWebpBytes: heroWebp.length
  }, null, 2)
);

console.log(`Split hero patch completed: full ${fullBuffer.length} bytes; AVIF ${heroAvif.length} bytes; WebP ${heroWebp.length} bytes.`);
