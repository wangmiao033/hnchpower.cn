import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

await import('./build.mjs');

const PUBLIC_DIR = join(process.cwd(), 'public');
const ASSET_DIR = join(PUBLIC_DIR, 'assets');
const TAPTAP_URL = 'https://tap.cn/t7TFUWR8';
const BUTTON_PATH = '/assets/taptap-download.svg';
const QR_PATH = '/assets/taptap-rep-qr.svg';
const ASSET_BASE = 'https://raw.githubusercontent.com/wangmiao033/hnchpower.cn/f3605c3b829a4115244849defd670ab37d6bd0b8/tools/yjsy-cms/';

async function fetchAsset(name) {
  const response = await fetch(`${ASSET_BASE}${name}`, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; YJSYTapTapREP/1.0)' }
  });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

await mkdir(ASSET_DIR, { recursive: true });
const [buttonSvg, qrSvg] = await Promise.all([
  fetchAsset('taptap-download.svg'),
  fetchAsset('taptap-rep-qr.svg')
]);
await Promise.all([
  writeFile(join(ASSET_DIR, 'taptap-download.svg'), buttonSvg),
  writeFile(join(ASSET_DIR, 'taptap-rep-qr.svg'), qrSvg)
]);

const runtime = `(()=>{
'use strict';
const TAPTAP_URL='${TAPTAP_URL}';
const BUTTON='${BUTTON_PATH}';
const QR='${QR_PATH}';
function ensureStyle(){
  if(document.getElementById('taptap-rep-style'))return;
  const style=document.createElement('style');
  style.id='taptap-rep-style';
  style.textContent='#taptap-mobile-entry{display:none}@media(max-width:900px){body{padding-bottom:76px!important}#taptap-mobile-entry{position:fixed;z-index:2147483000;left:12px;right:12px;bottom:12px;display:flex!important;align-items:center;justify-content:center;gap:12px;box-sizing:border-box;height:56px;max-width:520px;margin:0 auto;padding:0 18px;border-radius:14px;background:linear-gradient(135deg,#00d9c7,#00bfb7);box-shadow:0 8px 28px rgba(0,0,0,.3);color:#fff!important;font:700 18px/1 Arial,Microsoft YaHei,sans-serif;text-decoration:none!important}.taptap-mobile-logo{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;background:#fff;color:#00cbbd;font-size:15px;font-weight:800}.taptap-mobile-copy{display:flex;flex-direction:column;gap:4px}.taptap-mobile-copy small{font-size:10px;letter-spacing:1.2px;opacity:.9}}';
  document.head.append(style);
}
function ensureEntry(){
  ensureStyle();
  document.querySelectorAll('.btn_d').forEach(btn=>{
    if(btn.dataset.type==='ios')return;
    btn.dataset.type='taptap';
    btn.setAttribute('aria-label','TapTap 官方下载');
    btn.title='TapTap 官方下载';
    const img=btn.querySelector('img');
    if(img){if(img.getAttribute('src')!==BUTTON)img.src=BUTTON;img.alt='TapTap 官方下载';}
  });
  document.querySelectorAll('.banner .qrcode,.slide_qrcode img,.new_right_ew img').forEach(img=>{
    if(img.getAttribute('src')!==QR)img.src=QR;
    img.alt='TapTap REP 官方下载二维码';
    const link=img.closest('a');
    if(link){link.href=TAPTAP_URL;link.target='_blank';link.rel='noopener noreferrer';}
  });
  const sideTitle=document.querySelector('.slide_right .aside_flex p');
  if(sideTitle)sideTitle.textContent='TapTap下载';
  if(!document.getElementById('taptap-mobile-entry')){
    const link=document.createElement('a');
    link.id='taptap-mobile-entry';
    link.href=TAPTAP_URL;
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.setAttribute('aria-label','通过 TapTap 下载异界深渊：大灵王');
    link.innerHTML='<span class="taptap-mobile-logo">Tap</span><span class="taptap-mobile-copy"><strong>TapTap 下载</strong><small>OFFICIAL DOWNLOAD</small></span>';
    document.body.append(link);
  }
}
window.addEventListener('click',event=>{
  const button=event.target.closest?.('.btn_d');
  if(!button||button.dataset.type==='ios')return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const opened=window.open(TAPTAP_URL,'_blank','noopener');
  if(!opened)window.location.href=TAPTAP_URL;
},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureEntry,{once:true});else ensureEntry();
new MutationObserver(ensureEntry).observe(document.documentElement,{childList:true,subtree:true});
})();`;

await writeFile(join(ASSET_DIR, 'taptap-rep-runtime.js'), runtime);

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full));
    else files.push(full);
  }
  return files;
}

const htmlFiles = (await listFiles(PUBLIC_DIR)).filter(file => extname(file).toLowerCase() === '.html');
let patched = 0;
for (const file of htmlFiles) {
  let html = await readFile(file, 'utf8');
  const before = html;
  html = html
    .replaceAll('https://l.taptap.cn/8RS22vie?channel=rep-rep_apumrp4yupr', TAPTAP_URL)
    .replaceAll('/static.sh9130.com/uploads/apk/dlwgwbdb/dlwgwbdb_1905117.apk', TAPTAP_URL)
    .replaceAll('/static.sh9130.com/gw/dlw/gw/images/andriod_dowload_new.png', BUTTON_PATH)
    .replaceAll('/static.sh9130.com/gw/dlw/gw/images/andriod_dowload.png', BUTTON_PATH)
    .replaceAll('/static.sh9130.com/gw/dlw/gw/images/qrcode.png?1', QR_PATH)
    .replaceAll('/static.sh9130.com/gw/dlw/gw/images/qrcode.png', QR_PATH)
    .replaceAll('/static.sh9130.com/gw/dlw/gw/images/slide_qrcode.png', QR_PATH)
    .replaceAll('Android 官方下载', 'TapTap 官方下载')
    .replace(/data-type=(['"])android\1/g, 'data-type=$1taptap$1');
  if (!html.includes('/assets/taptap-rep-runtime.js')) {
    html = html.replace('</body>', '<script src="/assets/taptap-rep-runtime.js"></script></body>');
  }
  if (html !== before) {
    await writeFile(file, html);
    patched++;
  }
}

await writeFile(
  join(PUBLIC_DIR, 'taptap-rep-report.json'),
  JSON.stringify({ link: TAPTAP_URL, htmlFiles: htmlFiles.length, patched, assets: [BUTTON_PATH, QR_PATH] }, null, 2)
);
console.log(`TapTap REP patch completed: ${patched}/${htmlFiles.length} HTML files patched.`);
