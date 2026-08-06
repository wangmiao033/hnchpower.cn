import { readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const PUBLIC_DIR = join(process.cwd(), 'public');
const FULL_BG = '/assets/yjsy-bg-full.webp';

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

// Do not let the CMS runtime replace the immediately visible high-resolution
// background with a low-resolution preview while settings are being loaded.
const siteAssetsPath = join(PUBLIC_DIR, 'assets', 'site-assets-live.js');
let runtimePatched = false;
try {
  const source = await readFile(siteAssetsPath, 'utf8');
  const replacement = `function setHero(url){
  const c=document.querySelector('.container');
  if(!c||!url)return;
  const clean=String(url).split('?')[0];
  ++heroRequest;
  if(clean===DEFAULT_HERO||clean==='${FULL_BG}'){
    document.documentElement.classList.remove('yjsy-custom-hero');
    c.style.removeProperty('background-image');
    return;
  }
  document.documentElement.classList.add('yjsy-custom-hero');
  c.style.setProperty('background-image',\`url("\${url}")\`,'important');
}
function setSwiper`;
  const patched = source.replace(
    /function setHero\(url\)\{[\s\S]*?\n\}\nfunction setSwiper/,
    replacement
  );
  if (patched !== source) {
    await writeFile(siteAssetsPath, patched);
    runtimePatched = true;
  }
} catch (error) {
  console.warn(`Hero runtime patch skipped: ${error.message}`);
}

const directHero = `<style id="yjsy-progressive-bg">html,body{background:#a9d6cf}.container{background-color:#a9d6cf!important;background-image:url("${FULL_BG}")!important;background-position:center top!important;background-repeat:no-repeat!important;background-size:100% auto!important}.yjsy-custom-hero .container{background-image:var(--yjsy-custom-hero)!important}</style>`;
const htmlFiles = (await listFiles(PUBLIC_DIR)).filter(file => extname(file).toLowerCase() === '.html');
let htmlPatched = 0;

for (const file of htmlFiles) {
  const source = await readFile(file, 'utf8');
  let patched = source.replace(
    /<style id="yjsy-progressive-bg">[\s\S]*?<\/style><script id="yjsy-progressive-loader">[\s\S]*?<\/script>/g,
    directHero
  );
  // Clean up earlier versions that used a separate top/preview layer.
  patched = patched.replace(
    /<style id="yjsy-progressive-bg">[\s\S]*?<\/style>/g,
    directHero
  );
  if (patched !== source) {
    await writeFile(file, patched);
    htmlPatched++;
  }
}

await writeFile(
  join(PUBLIC_DIR, 'fast-hero-report.json'),
  JSON.stringify({ fullBackground: FULL_BG, htmlFiles: htmlFiles.length, htmlPatched, runtimePatched }, null, 2)
);
console.log(`Fast hero patch completed: ${htmlPatched}/${htmlFiles.length} HTML files; runtime=${runtimePatched}.`);
