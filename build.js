const fs = require('fs');
const path = require('path');

const root = __dirname;
const srcPath = path.join(root, 'klangreise.html');
const outDir = path.join(root, 'dist');
const outPath = path.join(outDir, 'index.html');

if (!fs.existsSync(srcPath)) {
  console.error('Source file not found:', srcPath);
  process.exit(1);
}

async function run() {
  const html = fs.readFileSync(srcPath, 'utf8');
  let result = html;
  let minified = false;

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
