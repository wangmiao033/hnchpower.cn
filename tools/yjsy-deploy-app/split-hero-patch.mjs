import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const PUBLIC_DIR = join(process.cwd(), 'public');
const INDEX_PATH = join(PUBLIC_DIR, 'index.html');
const FULL_PATH = join(PUBLIC_DIR, 'assets/yjsy-bg-full.webp');
const HERO_AVIF_PATH = join(PUBLIC_DIR, 'assets/yjsy-hero-ultra.avif');
const HERO_WEBP_PATH = join(PUBLIC_DIR, 'assets/yjsy-hero-ultra.webp');
const HERO_AVIF_URL = '/assets/yjsy-hero-ultra.avif';
const HERO_WEBP_URL = '/assets/yjsy-hero-ultra.webp';
const FULL_URL = '/assets/yjsy-bg-full.webp';
const TARGET_MIN = 30 * 1024;
const TARGET_MAX = 40 * 1024;
const TARGET_MID = 35 * 1024;

const [sourceHtml, fullBuffer] = await Promise.all([
  readFile(INDEX_PATH, 'utf8'),
  readFile(FULL_PATH)
]);

const metadata = await sharp(fullBuffer, { limitInputPixels: false }).metadata();
const sourceWidth = metadata.width || 1912;
const sourceHeight = metadata.height || 4921;
const cropHeight = Math.min(1220, sourceHeight);
const outputWidth = Math.min(1200, sourceWidth);
const extract = { left: 0, top: 0, width: sourceWidth, height: cropHeight };

const base = sharp(fullBuffer, { limitInputPixels: false }).extract(extract).resize({
  width: outputWidth,
  withoutEnlargement: true,
  fit: 'inside'
});

async function encodeAvif(quality) {
  return base.clone().avif({
    quality,
    effort: 4,
    chromaSubsampling: '4:2:0'
  }).toBuffer();
}

const attempts = [];
let heroAvif = await encodeAvif(40);
attempts.push({ quality: 40, bytes: heroAvif.length, buffer: heroAvif });

if (heroAvif.length > TARGET_MAX) {
  for (const quality of [38, 36, 34, 32, 30, 28, 26]) {
    const buffer = await encodeAvif(quality);
    attempts.push({ quality, bytes: buffer.length, buffer });
    if (buffer.length <= TARGET_MAX) break;
  }
} else if (heroAvif.length < TARGET_MIN) {
  for (const quality of [42, 44, 46, 48, 50]) {
    const buffer = await encodeAvif(quality);
    attempts.push({ quality, bytes: buffer.length, buffer });
    if (buffer.length >= TARGET_MIN) break;
  }
}

const inRange = attempts.filter(item => item.bytes >= TARGET_MIN && item.bytes <= TARGET_MAX);
const selected = (inRange.length ? inRange : attempts).sort((a, b) => {
  const aDistance = Math.abs(a.bytes - TARGET_MID);
  const bDistance = Math.abs(b.bytes - TARGET_MID);
  return aDistance - bDistance || b.quality - a.quality;
})[0];
heroAvif = selected.buffer;

const [heroWebp, tinyPreview] = await Promise.all([
  base.clone().webp({ quality: 56, effort: 4, smartSubsample: true }).toBuffer(),
  base.clone().resize({ width: 48, withoutEnlargement: true }).blur(0.45).webp({ quality: 22, effort: 2 }).toBuffer()
]);

await Promise.all([
  writeFile(HERO_AVIF_PATH, heroAvif),
  writeFile(HERO_WEBP_PATH, heroWebp)
]);

const previewData = `data:image/webp;base64,${tinyPreview.toString('base64')}`;
let html = sourceHtml
  .replace(/<link\b[^>]*href=(['"])\/assets\/yjsy-(?:bg-full|hero-(?:fast|ultra))\.(?:webp|avif)\1[^>]*>/gi, '')
  .replace(/<style\b[^>]*id=(['"])yjsy-split-hero\1[^>]*>[\s\S]*?<\/style>/gi, '')
  .replace(/<script\b[^>]*id=(['"])yjsy-deferred-full-bg\1[^>]*>[\s\S]*?<\/script>/gi, '');

const style = `<style id="yjsy-split-hero">
html,body{background:#a9d6cf}
html:not(.yjsy-full-bg) .container{background-color:#a9d6cf!important;background-image:none!important}
html:not(.yjsy-full-bg) .banner{background-color:#a9d6cf!important;background-image:url("${HERO_WEBP_URL}"),url("${previewData}")!important;background-image:image-set(url("${HERO_AVIF_URL}") type("image/avif") 1x,url("${HERO_WEBP_URL}") type("image/webp") 1x),url("${previewData}")!important;background-position:center top,center top!important;background-repeat:no-repeat,no-repeat!important;background-size:100% auto,100% auto!important}
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
    },{rootMargin:'0px 0px 160px 0px'});
    observer.observe(target);
  }
  window.addEventListener('scroll',()=>{if(window.scrollY>180)loadFull();},{passive:true,once:true});
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
    outputWidth,
    targetBytes: { min: TARGET_MIN, max: TARGET_MAX },
    selectedAvifQuality: selected.quality,
    heroAvifBytes: heroAvif.length,
    heroWebpBytes: heroWebp.length,
    tinyPreviewBytes: tinyPreview.length,
    attempts: attempts.map(({ quality, bytes }) => ({ quality, bytes }))
  }, null, 2)
);

console.log(`Ultra hero patch completed: full ${fullBuffer.length} bytes; AVIF ${heroAvif.length} bytes (q${selected.quality}); WebP ${heroWebp.length} bytes; preview ${tinyPreview.length} bytes.`);
