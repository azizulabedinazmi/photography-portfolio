const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist_site');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

console.log('Postbuild: syncing static directories into dist_site...');

// Ensure dist_site exists
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// 1. Copy dist/assets into dist_site/dist/assets and dist_site/assets
copyRecursiveSync(path.join(ROOT, 'dist/assets'), path.join(OUT, 'dist/assets'));
copyRecursiveSync(path.join(ROOT, 'dist/assets'), path.join(OUT, 'assets'));

// 2. Copy gallery data & variants into dist_site/dist/
['gallery-data.json', 'gallery-data.js', 'image-variants.js', 'output.css', 'portfolio-smart.js'].forEach((file) => {
  const p = path.join(ROOT, 'dist', file);
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(OUT, 'dist', file));
  }
});

// 3. Copy admin suite & client proofing into dist_site
copyRecursiveSync(path.join(ROOT, 'admin'), path.join(OUT, 'admin'));
copyRecursiveSync(path.join(ROOT, 'client'), path.join(OUT, 'client'));

// 4. Copy SEO and root config files
['robots.txt', 'sitemap.xml', 'ads.txt'].forEach((file) => {
  const p = path.join(ROOT, file);
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(OUT, file));
  }
});

console.log('Postbuild: sync complete.');
