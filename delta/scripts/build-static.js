/* Builds the instant browser demo into dist/static (no server needed): the real server modules
   are bundled for the browser and answer the app's /api requests inside the page.
   Usage: npm run build:static */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const root = path.join(__dirname, '..'), out = path.join(root, 'dist', 'static');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'shared'), { recursive: true });

const shim = name => path.join(root, 'browser', 'shims', name + '.js');
(async () => {
await esbuild.build({
  entryPoints: [path.join(root, 'browser', 'static-server.js')], bundle: true, minify: true, format: 'iife', platform: 'browser', target: ['es2020'],
  outfile: path.join(out, 'demo-server.js'), legalComments: 'none',
  external: ['nodemailer', 'stripe'],
  alias: { 'node:crypto': shim('crypto'), 'node:fs': shim('fs'), 'node:path': shim('path'), crypto: shim('crypto'), fs: shim('fs'), path: shim('path') },
  inject: [path.join(root, 'browser', 'shims', 'buffer-global.js')],
  plugins: [{ name: 'browser-config', setup(b) { b.onResolve({ filter: /^\.\/config$/ }, a => (a.importer.includes(`${path.sep}server${path.sep}`) ? { path: path.join(root, 'browser', 'config.js') } : undefined)); } }],
});
for (const f of ['data.js', 'domain.js', 'countries.js']) fs.copyFileSync(path.join(root, 'shared', f), path.join(out, 'shared', f));
fs.cpSync(path.join(root, 'public'), out, { recursive: true });
let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8')
  .replace(/(href|src)="\/(?!\/)/g, '$1="')
  .replace(/imagesrcset="\/brand/g, 'imagesrcset="brand').replace(/, \/brand/g, ', brand')
  .replace('<script src="app.js"></script>', '<script src="demo-server.js"></script>\n<script src="app.js"></script>');
fs.writeFileSync(path.join(out, 'index.html'), html);
const kb = f => Math.round(fs.statSync(path.join(out, f)).size / 1024) + ' KB';
console.log(`Static demo built in dist/static — demo-server.js ${kb('demo-server.js')}, app.js ${kb('app.js')}`);
})().catch(e => { console.error(e); process.exit(1); });
