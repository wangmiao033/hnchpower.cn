import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PUBLIC_DIR = join(process.cwd(), 'public');
const INDEX_PATH = join(PUBLIC_DIR, 'index.html');
const HOME_CSS_PATH = join(PUBLIC_DIR, 'static.sh9130.com/gw/dlw/gw/css/home.css');
const INDEX_JS_PATH = join(PUBLIC_DIR, 'static.sh9130.com/gw/dlw/gw/js/index.js');

const [sourceHtml, sourceCss, sourceJs] = await Promise.all([
  readFile(INDEX_PATH, 'utf8'),
  readFile(HOME_CSS_PATH, 'utf8'),
  readFile(INDEX_JS_PATH, 'utf8')
]);

const safeCss = sourceCss.replace(/<\/style/gi, '<\\/style');
const safeJs = sourceJs.replace(/<\/script/gi, '<\\/script');
let html = sourceHtml;

// Remove the render-blocking stylesheet request on the homepage. The complete
// stylesheet is small enough to inline and Brotli-compress with the HTML.
html = html.replace(
  /<link\b[^>]*href=(['"])\/static\.sh9130\.com\/gw\/dlw\/gw\/css\/home\.css\1[^>]*>/i,
  `<style id="yjsy-home-css-inline">${safeCss}</style>`
);

// The rem bootstrap is under 1 KB. Inline it so body parsing never waits for JS.
html = html.replace(
  /<script\b[^>]*src=(['"])\/static\.sh9130\.com\/gw\/dlw\/gw\/js\/index\.js\1[^>]*><\/script>/i,
  `<script id="yjsy-rem-inline">${safeJs}</script>`
);

// TapTap anchors already work without JavaScript. Defer enhancement logic.
html = html.replace(
  /<script\b[^>]*src=(['"])\/assets\/taptap-rep-runtime\.js\1[^>]*><\/script>/gi,
  '<script defer src="/assets/taptap-rep-runtime.js"></script>'
);

// Start the hero download as soon as the browser reads the head.
if (!html.includes('href="/assets/yjsy-bg-full.webp"')) {
  html = html.replace(
    '</head>',
    '<link rel="preload" as="image" href="/assets/yjsy-bg-full.webp" type="image/webp" fetchpriority="high"></head>'
  );
}

await writeFile(INDEX_PATH, html);
console.log(`Instant render patch completed: HTML ${Buffer.byteLength(sourceHtml)} -> ${Buffer.byteLength(html)} bytes; inlined CSS ${Buffer.byteLength(sourceCss)} bytes.`);
