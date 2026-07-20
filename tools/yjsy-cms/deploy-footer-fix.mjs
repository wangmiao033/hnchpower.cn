import{mkdir,writeFile}from'node:fs/promises';
import{dirname,extname}from'node:path';
const O='https://yjsy.hnchpower.cn';
const OUT=new URL(`file://${process.cwd()}/public/`);
const SITE_SCRIPT='https://cdn.jsdelivr.net/gh/wangmiao033/hnchpower.cn@7a7688fefc4936e19ab8e33fd4a2d0f9727d5e77/tools/yjsy-cms/site-assets.js';
const ADMIN_SCRIPT='https://cdn.jsdelivr.net/gh/wangmiao033/hnchpower.cn@5c2c7485c928d51e796c43382380c8b133836276/tools/yjsy-cms/admin-assets.js';
const OLD_ADDRESS='上海市嘉定区真南路4268号2幢JT7917室';
const NEW_ADDRESS='广州市越秀区江月路13号之一301-自编390-16';
await mkdir(OUT,{recursive:true});
const seeds=['/','/xw/','/xw/p2.html','/xw/p3.html','/gg/','/gl/','/sy/','/robots.txt','/sitemap.xml','/BingSiteAuth.xml','/bdf344323d3225c6943aa340801bf2ff.txt','/admin/','/admin/admin.css','/admin/admin.js','/assets/yjsy-config.js','/assets/yjsy-runtime.js','/article.html'];
const q=seeds.map(x=>new URL(x,O).href),seen=new Set(),failures=[];
let copied=0,patched=0,addressReplaced=0;
const norm=u=>{const x=new URL(u);x.hash='';x.search='';return x.href};
function out(u,t=''){let p=decodeURIComponent(new URL(u).pathname);if(p==='/'||p.endsWith('/'))p+='index.html';p=p.slice(1);if(!extname(p)&&t.includes('text/html'))p+='.html';return p}
function add(raw,base){if(!raw)return;raw=raw.trim().replace(/&amp;/g,'&');if(!raw||raw.startsWith('#')||/^(?:data:|javascript:|mailto:|tel:)/i.test(raw))return;try{const u=new URL(raw,base);if(u.origin!==O||u.pathname.startsWith('/api/')||u.pathname.startsWith('/cms/')||u.pathname==='/sitemap-cms.xml'||u.pathname==='/assets/value')return;const k=norm(u.href);if(!seen.has(k)&&q.length<4000)q.push(u.href)}catch{}}
function discover(text,base,type){if(type.includes('html'))for(const m of text.matchAll(/\b(?:src|href|poster)\s*=\s*["']([^"'<>]+)["']/gi))add(m[1],base);for(const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi))add(m[1],base)}
function patch(text,type){
  if(/(?:text|javascript|html|css|xml|json)/i.test(type)){const n=text.split(OLD_ADDRESS).length-1;if(n){text=text.split(OLD_ADDRESS).join(NEW_ADDRESS);addressReplaced+=n}}
  if(type.includes('html')){
    const before=text;
    text=text.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\/wangmiao033\/hnchpower\.cn@[0-9a-f]+\/tools\/yjsy-cms\/site-assets\.js/g,'/assets/site-assets-live.js');
    text=text.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\/wangmiao033\/hnchpower\.cn@(?:main|[0-9a-f]+)\/tools\/yjsy-cms\/admin-assets\.js/g,'/admin/admin-assets-live.js');
    if(!text.includes('rel="preconnect" href="https://bypekqxsnuvqbgvdosdl.supabase.co"'))text=text.replace('</head>','<link rel="preconnect" href="https://bypekqxsnuvqbgvdosdl.supabase.co" crossorigin></head>');
    if(text!==before)patched++;
  }
  return text;
}
async function fetchText(url){const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; YJSYBuilder/2.0)'}});if(!r.ok)throw Error(`${url}: HTTP ${r.status}`);return r.text()}
const [siteScript,adminScript]=await Promise.all([fetchText(SITE_SCRIPT),fetchText(ADMIN_SCRIPT)]);
await mkdir(new URL('assets/',OUT),{recursive:true});await mkdir(new URL('admin/',OUT),{recursive:true});
await writeFile(new URL('assets/site-assets-live.js',OUT),siteScript);await writeFile(new URL('admin/admin-assets-live.js',OUT),adminScript);
async function worker(){while(q.length){const url=q.shift(),key=norm(url);if(seen.has(key))continue;seen.add(key);try{const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0 (compatible; YJSYFooterFixBuilder/2.0)'}});if(!r.ok)throw Error(`HTTP ${r.status}`);const t=r.headers.get('content-type')||'';let data=Buffer.from(await r.arrayBuffer());if(/(?:text|javascript|json|xml|css|html)/i.test(t)){let s=data.toString('utf8');discover(s,url,t);s=patch(s,t);data=Buffer.from(s)}const p=out(url,t),target=new URL(p,OUT);await mkdir(dirname(target.pathname),{recursive:true});await writeFile(target,data);copied++}catch(e){failures.push(`${url}: ${e.message}`)}}}
await Promise.all(Array.from({length:18},worker));
await writeFile(new URL('settings-speed-report.json',OUT),JSON.stringify({copied,patched,addressReplaced,localScripts:true,failures},null,2));
console.log(`Completed ${copied}; patches ${patched}; address replacements ${addressReplaced}; failures ${failures.length}`);
if(!copied)throw Error('Site copy failed');