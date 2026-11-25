/**
 * Azizul Abedin Azmi Photography & Digital Art Portfolio
 * Modern Astro + Netlify Build
 */
// Re-export or mirror of public/dist/portfolio-smart.js
const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, '../public/dist/portfolio-smart.js');
if (fs.existsSync(target)) {
  fs.copyFileSync(target, path.join(__dirname, 'portfolio-smart.js'));
}
