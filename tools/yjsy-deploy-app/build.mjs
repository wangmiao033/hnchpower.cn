import{mkdir,writeFile}from'node:fs/promises';
import{dirname,extname}from'node:path';
import sharp from'sharp';

const O='https://yjsy.hnchpower.cn';
const OUT=new URL(`file://${process.cwd()}/public/`);
const SITE_SCRIPT='https://cdn.jsdelivr.net/gh/wangmiao033/hnchpower.cn@d5507375e1a8e5a23f6b6a1d3a5bd2b4383be02c/tools/yjsy-cms/site-assets.js';
const ADMIN_SCRIPT='https://cdn.jsdelivr.net/gh/wangmiao033/hnchpower.cn@5c2c7485c928d51e796c43382380c8b133836276/tools/yjsy-cms/admin-assets.js';
const HERO_SOURCE='/static.sh9130.com/gw/dlw/gw/images/bg.jpg';
const OLD_ADDRESS='上海市嘉定区真南路4268号2幢JT7917室';
const NEW_ADDRESS='广州市越秀区江月路13号之一301-自编390-16';
const PREVIEW='/assets/yjsy-bg-preview.webp';
const FULL='/assets/yjsy-bg-full.webp';

await mkdir(OUT,{recursive:true});
await mkdir(new URL('assets/',OUT),{recursive:true});
await mkdir(new URL('admin/',OUT),{recursive:true});

async function fetchBuffer(url){
  const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; YJSYBuilder/3.1)'}});
  if(!r.ok)throw Error(`${url}: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
async function fetchText(url){return(await fetchBuffer(url)).toString('utf8')}

async function buildProgressiveBackground(){
  const input=await fetchBuffer(new URL(HERO_SOURCE,O));
  const meta=await sharp(input,{limitInputPixels:false}).metadata();
  const width=meta.width||1920,height=meta.height||1080;
  const outputWidth=Math.min(1920,width);
  const preview=await sharp(input,{limitInputPixels:false}).resize({width:72,withoutEnlargement:true}).blur(0.35).webp({quality:28,effort:4}).toBuffer();
  const full=await sharp(input,{limitInputPixels:false}).resize({width:outputWidth,withoutEnlargement:true}).webp({quality:76,effort:5,smartSubsample:true}).toBuffer();
  await Promise.all([
    writeFile(new URL(PREVIEW.slice(1),OUT),preview),
    writeFile(new URL(FULL.slice(1),OUT),full)
  ]);
  return{width,height,inputBytes:input.length,previewBytes:preview.length,fullBytes:full.length,previewData:`data:image/webp;base64,${preview.toString('base64')}`};
}

const progressive=await buildProgressiveBackground();
const [siteScript,adminScript]=await Promise.all([fetchText(SITE_SCRIPT),fetchText(ADMIN_SCRIPT)]);
await writeFile(new URL('assets/site-assets-live.js',OUT),siteScript);
await writeFile(new URL('admin/admin-assets-live.js',OUT),adminScript);

const progressiveHead=`<link rel="preload" as="image" href="${FULL}" type="image/webp" fetchpriority="high"><style id="yjsy-progressive-bg">html,body{background:#a9d6cf}.container{background-color:#a9d6cf!important;background-image:url("${progressive.previewData}")!important;background-position:center top!important;background-repeat:no-repeat!important;background-size:100% auto!important}.yjsy-bg-ready .container{background-image:url("${FULL}")!important}.yjsy-custom-hero .container{background-image:var(--yjsy-custom-hero)!important}</style><script id="yjsy-progressive-loader">(()=>{const done=()=>document.documentElement.classList.add('yjsy-bg-ready');const i=new Image();i.decoding='async';i.fetchPriority='high';i.onload=done;i.onerror=done;i.src='${FULL}';if(i.complete)done()})();</script>`;

const seeds=['/','/xw/','/xw/p2.html','/xw/p3.html','/gg/','/gl/','/sy/','/robots.txt','/sitemap.xml','/BingSiteAuth.xml','/bdf344323d3225c6943aa340801bf2ff.txt','/admin/','/admin/admin.css','/admin/admin.js','/assets/yjsy-config.js','/assets/yjsy-runtime.js','/article.html'];
const q=seeds.map(x=>new URL(x,O).href),seen=new Set(),failures=[];
let copied=0,patched=0,addressReplaced=0,lazyImages=0;
const norm=u=>{const x=new URL(u);x.hash='';x.search='';return x.href};
function out(u,t=''){let p=decodeURIComponent(new URL(u).pathname);if(p==='/'||p.endsWith('/'))p+='index.html';p=p.slice(1);if(!extname(p)&&t.includes('text/html'))p+='.html';return p}
function add(raw,base){
  if(!raw)return;raw=raw.trim().replace(/&amp;/g,'&');
  if(!raw||raw.startsWith('#')||raw.includes(',')||/^(?:data:|javascript:|mailto:|tel:)/i.test(raw))return;
  try{const u=new URL(raw,base);if(u.origin!==O||u.pathname.startsWith('/api/')||u.pathname.startsWith('/cms/')||u.pathname==='/sitemap-cms.xml'||u.pathname==='/assets/value')return;const k=norm(u.href);if(!seen.has(k)&&q.length<4000)q.push(u.href)}catch{}
}
function discover(text,base,type){
  if(type.includes('html'))for(const m of text.matchAll(/\b(?:src|href|poster)\s*=\s*["']([^"'<>]+)["']/gi))add(m[1],base);
  if(type.includes('html')||type.includes('css'))for(const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi))add(m[1],base);
}
function optimizeImages(text){
  let index=0;
  return text.replace(/<img\b([^>]*)>/gi,(match,raw)=>{
    index++;
    let attrs=raw.replace(/\s+(?:loading|decoding|fetchpriority)\s*=\s*["'][^"']*["']/gi,'');
    const selfClosing=/\/\s*$/.test(attrs);attrs=attrs.replace(/\/\s*$/,'');
    const eager=index<=4;
    const extra=` decoding="async"${eager?(index<=2?' fetchpriority="high"':''):' loading="lazy"'}`;
    if(!eager)lazyImages++;
    return `<img${attrs}${extra}${selfClosing?' /':''}>`;
  });
}
function patch(text,type,path){
  if(/(?:text|javascript|html|css|xml|json)/i.test(type)){
    const n=text.split(OLD_ADDRESS).length-1;if(n){text=text.split(OLD_ADDRESS).join(NEW_ADDRESS);addressReplaced+=n}
  }
  if(type.includes('html')){
    const before=text;
    text=text.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\/wangmiao033\/hnchpower\.cn@[0-9a-f]+\/tools\/yjsy-cms\/site-assets\.js/g,'/assets/site-assets-live.js');
    text=text.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\/wangmiao033\/hnchpower\.cn@(?:main|[0-9a-f]+)\/tools\/yjsy-cms\/admin-assets\.js/g,'/admin/admin-assets-live.js');
    if(!text.includes('rel="preconnect" href="https://bypekqxsnuvqbgvdosdl.supabase.co"'))text=text.replace('</head>','<link rel="preconnect" href="https://bypekqxsnuvqbgvdosdl.supabase.co" crossorigin></head>');
    text=optimizeImages(text);
    if(path==='/'){
      text=text.replace(/<link rel="preload" as="image" href="\/static\.sh9130\.com\/gw\/dlw\/gw\/images\/bg\.jpg"[^>]*>/g,'');
      text=text.replace(/<link rel="preload" as="image" href="\/assets\/yjsy-bg-(?:top|full)\.webp"[^>]*>/g,'');
      text=text.replace(/<style id="hero-loading-fix">[\s\S]*?<\/style>/g,'');
      text=text.replace(/<style id="yjsy-progressive-bg">[\s\S]*?<\/style><script id="yjsy-progressive-loader">[\s\S]*?<\/script>/g,'');
      text=text.replace('</head>',`${progressiveHead}</head>`);
    }
    if(text!==before)patched++;
  }
  return text;
}
async function worker(){
  while(q.length){
    const url=q.shift(),key=norm(url);if(seen.has(key))continue;seen.add(key);
    try{
      const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0 (compatible; YJSYProgressiveBuilder/3.1)'}});
      if(!r.ok)throw Error(`HTTP ${r.status}`);
      const t=r.headers.get('content-type')||'',path=new URL(url).pathname;
      let data=Buffer.from(await r.arrayBuffer());
      if(/(?:text|javascript|json|xml|css|html)/i.test(t)){let s=data.toString('utf8');discover(s,url,t);s=patch(s,t,path);data=Buffer.from(s)}
      const p=out(url,t),target=new URL(p,OUT);await mkdir(dirname(target.pathname),{recursive:true});await writeFile(target,data);copied++;
    }catch(e){failures.push(`${url}: ${e.message}`)}
  }
}
await Promise.all(Array.from({length:18},worker));
await writeFile(new URL('progressive-image-report.json',OUT),JSON.stringify({copied,patched,addressReplaced,lazyImages,progressive:{...progressive,previewData:undefined},failures},null,2));
console.log(`Completed ${copied}; patches ${patched}; lazy images ${lazyImages}; full background ${progressive.fullBytes} bytes; failures ${failures.length}`);
if(!copied)throw Error('Site copy failed');