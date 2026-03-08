/**
 * NtandoStore Tech — Build & Obfuscation Script
 * Minifies HTML/CSS and obfuscates JS so source code is unreadable
 * Run: node build.js
 */

const fs = require('fs');
const path = require('path');
const { minify: minifyHTML } = require('html-minifier-terser');
const { minify: minifyJS } = require('terser');
const JavaScriptObfuscator = require('javascript-obfuscator');

const SRC = path.join(__dirname, 'public');
const DIST = path.join(__dirname, 'dist');

async function build() {
  console.log('🔨 NtandoStore Tech Build Starting...');
  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

  // ── Minify HTML ──────────────────────────────────────────
  console.log('📄 Minifying HTML...');
  const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf-8');
  const minHtml = await minifyHTML(html, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    minifyCSS: true,
    minifyJS: true,
    useShortDoctype: true,
  });
  fs.writeFileSync(path.join(DIST, 'index.html'), minHtml);
  console.log(`   ✓ HTML: ${html.length} → ${minHtml.length} bytes`);

  // ── Minify CSS ───────────────────────────────────────────
  console.log('🎨 Minifying CSS...');
  const css = fs.readFileSync(path.join(SRC, 'style.css'), 'utf-8');
  const minCss = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n/g, '')
    .replace(/\s*{\s*/g, '{')
    .replace(/\s*}\s*/g, '}')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*;\s*/g, ';')
    .replace(/\s*,\s*/g, ',')
    .trim();
  fs.writeFileSync(path.join(DIST, 'style.css'), minCss);
  console.log(`   ✓ CSS: ${css.length} → ${minCss.length} bytes`);

  // ── Obfuscate JS ─────────────────────────────────────────
  console.log('🔒 Obfuscating JS via Ntando Baileys Protection...');
  const js = fs.readFileSync(path.join(SRC, 'app.js'), 'utf-8');
  const { code: minJs } = await minifyJS(js, {
    compress: { passes: 2 },
    mangle: true,
    format: { comments: false },
  });
  const obfuscated = JavaScriptObfuscator.obfuscate(minJs, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.7,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.3,
    debugProtection: true,
    debugProtectionInterval: 3000,
    identifierNamesGenerator: 'hexadecimal',
    selfDefending: true,
    splitStrings: true,
    splitStringsChunkLength: 8,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    transformObjectKeys: true,
  }).getObfuscatedCode();
  fs.writeFileSync(path.join(DIST, 'app.js'), obfuscated);
  console.log(`   ✓ JS obfuscated: ${js.length} → ${obfuscated.length} bytes`);

  // Copy socket.io client
  const siPath = path.join(__dirname, 'node_modules/socket.io/client-dist/socket.io.min.js');
  if (fs.existsSync(siPath)) {
    fs.copyFileSync(siPath, path.join(DIST, 'socket.io.min.js'));
    console.log('   ✓ socket.io client copied');
  }

  console.log('\n✅ Build complete! Protected by Ntando Baileys.\n');
}

build().catch(err => { console.error('Build failed:', err); process.exit(1); });
