import { readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const PUBLIC_DIR = join(process.cwd(), 'public');
const RUNTIME_PATH = join(PUBLIC_DIR, 'assets/taptap-rep-runtime.js');
const RUNTIME_URL = '/assets/taptap-rep-runtime.js?v=20260806-stable1';

let runtime = await readFile(RUNTIME_PATH, 'utf8');
const beforeRuntime = runtime;

// Do not rewrite the same text node repeatedly. More importantly, remove the
// document-wide MutationObserver: ensureEntry mutates the DOM itself, so the
// observer could continuously retrigger and lock the browser main thread.
runtime = runtime
  .replace(
    "if(sideTitle)sideTitle.textContent='TapTap下载';",
    "if(sideTitle&&sideTitle.textContent!=='TapTap下载')sideTitle.textContent='TapTap下载';"
  )
  .replace(/\nnew MutationObserver\(ensureEntry\)\.observe\(document\.documentElement,\{childList:true,subtree:true\}\);/g, '');

await writeFile(RUNTIME_PATH, runtime);

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
let htmlPatched = 0;
for (const file of htmlFiles) {
  const source = await readFile(file, 'utf8');
  const output = source.replace(
    /\/assets\/taptap-rep-runtime\.js(?:\?v=[^"']*)?/g,
    RUNTIME_URL
  );
  if (output !== source) {
    await writeFile(file, output);
    htmlPatched++;
  }
}

await writeFile(
  join(PUBLIC_DIR, 'runtime-stability-report.json'),
  JSON.stringify({
    observerRemoved: !runtime.includes('new MutationObserver(ensureEntry)'),
    runtimeChanged: runtime !== beforeRuntime,
    htmlFiles: htmlFiles.length,
    htmlPatched,
    runtimeUrl: RUNTIME_URL
  }, null, 2)
);

console.log(`Runtime stability patch completed: observerRemoved=${!runtime.includes('new MutationObserver(ensureEntry)')}; HTML ${htmlPatched}/${htmlFiles.length}.`);
