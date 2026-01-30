const fs = require('fs');
const path = require('path');

const root = __dirname;
const srcPath = path.join(root, 'klangreise.html');
const outDir = path.join(root, 'dist');
const outPath = path.join(outDir, 'index.html');
const assetsSrcDir = path.join(root, 'assets');
const assetsOutDir = path.join(outDir, 'assets');
const manifestSrcPath = path.join(root, 'manifest.json');
const manifestOutPath = path.join(outDir, 'manifest.json');
const swSrcPath = path.join(root, 'service-worker.js');
const swOutPath = path.join(outDir, 'service-worker.js');

if (!fs.existsSync(srcPath)) {
  console.error('Source file not found:', srcPath);
  process.exit(1);
}

async function run() {
  const html = fs.readFileSync(srcPath, 'utf8');
  let result = html;
  let minified = false;

  function removeDirIfExists(dir) {
    if (!fs.existsSync(dir)) return;
    if (typeof fs.rmSync === 'function') {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    }
    // Node <14.14 fallback.
    fs.rmdirSync(dir, { recursive: true });
  }

  function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else if (entry.isFile()) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  try {
    const { minify } = require('html-minifier-terser');
    result = await minify(html, {
      collapseWhitespace: true,
      conservativeCollapse: false,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      keepClosingSlash: true,
      minifyCSS: true,
      minifyJS: { compress: true, mangle: false },
      sortAttributes: true,
      sortClassName: true
    });
    minified = true;
  } catch (err) {
    console.warn('html-minifier-terser not installed; copying without minification.');
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, result, 'utf8');

  // Copy static assets (audio/images) into dist so Vercel can serve them from outputDirectory.
  removeDirIfExists(assetsOutDir);
  copyDir(assetsSrcDir, assetsOutDir);
  if (fs.existsSync(manifestSrcPath)) {
    fs.copyFileSync(manifestSrcPath, manifestOutPath);
  }
  if (fs.existsSync(swSrcPath)) {
    fs.copyFileSync(swSrcPath, swOutPath);
  }

  const inSize = Buffer.byteLength(html, 'utf8');
  const outSize = Buffer.byteLength(result, 'utf8');
  const inKB = (inSize / 1024).toFixed(1);
  const outKB = (outSize / 1024).toFixed(1);
  const savedPct = inSize > 0 ? ((1 - outSize / inSize) * 100).toFixed(1) : '0.0';

  console.log('Built', outPath);
  if (minified) {
    console.log(`Size: ${outKB} KB (was ${inKB} KB, -${savedPct}%)`);
  } else {
    console.log(`Size: ${outKB} KB`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
