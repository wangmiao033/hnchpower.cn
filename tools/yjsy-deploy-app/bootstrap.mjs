import { writeFile } from 'node:fs/promises';

const RAW = 'https://raw.githubusercontent.com/wangmiao033/hnchpower.cn/main/tools/yjsy-deploy-app/';
const scripts = ['build.mjs', 'taptap-rep-patch.mjs', 'fast-hero-patch.mjs', 'instant-render-patch.mjs'];

for (const name of scripts) {
  const response = await fetch(`${RAW}${name}`, {
    cache: 'no-store',
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; YJSYVercelBootstrap/1.0)' }
  });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  await writeFile(new URL(name, import.meta.url), await response.text());
}

await import(`./taptap-rep-patch.mjs?v=${Date.now()}`);
await import(`./fast-hero-patch.mjs?v=${Date.now()}`);
await import(`./instant-render-patch.mjs?v=${Date.now()}`);
