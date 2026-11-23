#!/usr/bin/env node
/**
 * Builds the animated README banner: dist/assets/banner.svg
 * Run: node scripts/build-banner.js
 *
 * Everything (photos, logo, animation) is embedded in the one SVG file, because GitHub shows README
 * images through <img>, which can't load other files. Change CARDS below to swap the photos.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist/assets/banner.svg');
const W = 1200, H = 480;
const YELLOW = '#ffe800';
const SITE = 'azmi.is-cool.dev';

// Card photos: local path (from repo root) or URL. `focus` is the vertical crop point (0 = top, 1 = bottom).
const CARDS = [
  // back / middle  (azmi.is-cool.dev/#gallery-40)
  { src: 'dist/assets/Photography/ecpa-celebration-energy-2.jpg', w: 220, h: 300, angle: 3, x: 900, y: 215, focus: 0.25, alt: 'Portrait by the brick wall' },
  // front left     (unchanged)
  { src: 'dist/assets/Photography/20220413163432__MG_7932-01 (1).jpg', w: 205, h: 300, angle: -6, x: 745, y: 272, focus: 0.4, alt: 'Hafsa Prapti portrait' },
  // front right    (azmi.is-cool.dev/#gallery-78)
  { src: 'https://hcdn.picsart.com/5a5132a0-34ed-441b-ac3e-bf30a8abd104.jpg', w: 225, h: 320, angle: 4, x: 1055, y: 255, focus: 0.45, alt: 'Littolpotat PicsArt digital art' }
];

const PILLS = ['Portraits', 'Events &amp; Street', 'Digital Art', 'Nature &amp; Details'];

async function load(src) {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Could not download ${src} (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFileSync(path.join(ROOT, src));
}

async function cardImage(card) {
  // 2x pixels for sharp display on high-density screens
  const buf = await sharp(await load(card.src))
    .rotate()
    .resize({ width: card.w * 2, height: card.h * 2, fit: 'cover', position: card.focus <= 0.3 ? 'top' : card.focus >= 0.7 ? 'bottom' : 'centre' })
    .jpeg({ quality: 78, mozjpeg: true, progressive: true })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

async function logoImage() {
  const buf = await sharp(path.join(ROOT, 'dist/assets/AZMI-LOGO@2x.png'))
    .trim()
    .resize({ width: 860 })
    .png({ palette: true, quality: 90, compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true });
  return { uri: `data:image/png;base64,${buf.data.toString('base64')}`, w: buf.info.width, h: buf.info.height };
}

function pillsSvg() {
  const charW = 7.1; // approx width per character at 13px
  let x = 72;
  return PILLS.map((label, i) => {
    const text = label.replace(/&amp;/g, '&');
    const w = Math.round(text.length * charW + 26);
    const g = `
    <g class="pill" style="animation-delay:${(1.1 + i * 0.12).toFixed(2)}s">
      <rect x="${x}" y="290" width="${w}" height="28" rx="14" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.32)"/>
      <text x="${x + w / 2}" y="308.5" text-anchor="middle" class="pill-text">${label}</text>
    </g>`;
    x += w + 10;
    return g;
  }).join('');
}

(async () => {
  const [logo, ...images] = await Promise.all([logoImage(), ...CARDS.map(cardImage)]);
  const logoW = 430, logoH = Math.round(logo.h * (logoW / logo.w));

  const cards = CARDS.map((c, i) => {
    const bw = 4; // yellow border
    return `
  <g transform="translate(${c.x} ${c.y}) rotate(${c.angle})">
    <g class="card card-${i}">
      <g class="float float-${i}">
        <rect x="${-c.w / 2 - bw}" y="${-c.h / 2 - bw}" width="${c.w + bw * 2}" height="${c.h + bw * 2}" rx="18" fill="#cdba1e" filter="url(#shadow)"/>
        <image href="${images[i]}" x="${-c.w / 2}" y="${-c.h / 2}" width="${c.w}" height="${c.h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-${i})"><title>${c.alt}</title></image>
      </g>
    </g>
  </g>`;
  }).join('');

  const clips = CARDS.map((c, i) => `<clipPath id="clip-${i}"><rect x="${-c.w / 2}" y="${-c.h / 2}" width="${c.w}" height="${c.h}" rx="14"/></clipPath>`).join('\n    ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
  <title id="t">〘卂乙爪丨〙ヅ — Azizul Abedin Azmi</title>
  <desc id="d">Photography portfolio: portraits, events and street, digital art, nature. ${SITE}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#14120e"/><stop offset="1" stop-color="#0a0a14"/>
    </linearGradient>
    <radialGradient id="glow-l" cx="0.08" cy="0.05" r="0.55"><stop offset="0" stop-color="#5a4a0a" stop-opacity="0.55"/><stop offset="1" stop-color="#5a4a0a" stop-opacity="0"/></radialGradient>
    <radialGradient id="glow-r" cx="0.84" cy="0.6" r="0.4"><stop offset="0" stop-color="#4a3e0c" stop-opacity="0.4"/><stop offset="1" stop-color="#4a3e0c" stop-opacity="0"/></radialGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0.35" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.9"/><stop offset="0.65" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="logo-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
      <image href="${logo.uri}" x="70" y="78" width="${logoW}" height="${logoH}" style="filter:brightness(3) grayscale(1)"/>
    </mask>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="8" dy="14" stdDeviation="14" flood-color="#000" flood-opacity="0.75"/>
    </filter>
    ${clips}
  </defs>

  <style>
    .pill-text { font: 500 13px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; fill: #e1e1e1; }
    .name { font: 700 30px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; fill: #fff; }
    .tag  { font: 400 16px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; fill: ${YELLOW}; letter-spacing: .5px; }
    .url  { font: 300 15px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; fill: #c8c8c8; }

    .logo, .rise, .pill, .card, .line, .url { transform-box: fill-box; transform-origin: center; }
    .logo  { animation: focus 1.2s cubic-bezier(.2,.7,.2,1) both; }
    .shine { animation: sweep 4.5s ease-in-out 1.4s infinite; }
    .rise  { animation: rise .8s cubic-bezier(.2,.7,.2,1) both; }
    .pill  { animation: pop .5s cubic-bezier(.3,1.4,.5,1) both; }
    .line  { transform-origin: left center; animation: grow .7s ease 1.6s both; }
    .url   { animation: rise .8s ease 1.8s both; }
    .card  { animation: deal 1s cubic-bezier(.2,.8,.2,1) both; }
    .card-0 { animation-delay: .35s; } .card-1 { animation-delay: .55s; } .card-2 { animation-delay: .75s; }
    .float { animation: float 6s ease-in-out infinite; }
    .float-0 { animation-delay: 1.4s; } .float-1 { animation-delay: 2.4s; animation-duration: 7s; } .float-2 { animation-delay: 1.9s; animation-duration: 6.5s; }
    .rec { animation: blink 1.2s steps(2, jump-none) infinite; }

    @keyframes focus { from { opacity: 0; filter: blur(10px); transform: scale(1.06); } to { opacity: 1; filter: blur(0); transform: none; } }
    @keyframes sweep { 0% { transform: translateX(-560px); } 55%, 100% { transform: translateX(560px); } }
    @keyframes rise  { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
    @keyframes pop   { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: none; } }
    @keyframes grow  { from { transform: scaleX(0); } to { transform: none; } }
    @keyframes deal  { from { opacity: 0; transform: translate(-90px, 40px) rotate(-14deg) scale(.85); } to { opacity: 1; transform: none; } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
    @keyframes blink { 0% { opacity: 1; } 100% { opacity: .15; } }
    /* Less motion requested (e.g. Windows "Animation effects" off): keep soft fades, drop movement. */
    @media (prefers-reduced-motion: reduce) {
      .logo, .rise, .pill, .url, .card { animation-name: fade; }
      .line { animation: none; }
      .float, .shine { animation: none; }
      .shine { display: none; }
    }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  </style>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow-l)"/>
  <rect width="${W}" height="${H}" fill="url(#glow-r)"/>

  <!-- logo with a light sweep that only lights the logo shapes -->
  <image class="logo" href="${logo.uri}" x="70" y="78" width="${logoW}" height="${logoH}"/>
  <g mask="url(#logo-mask)"><rect class="shine" x="70" y="70" width="${logoW}" height="${logoH + 16}" fill="url(#shine)"/></g>

  <text class="name rise" x="72" y="222" style="animation-delay:.5s">Azizul Abedin Azmi</text>
  <text class="tag rise" x="72" y="256" style="animation-delay:.7s">PHOTOGRAPHY  ·  PORTRAITS  ·  DIGITAL ART</text>
  ${pillsSvg()}

  <rect class="line" x="72" y="379" width="40" height="2" fill="${YELLOW}"/>
  <circle class="rec" cx="78" cy="409" r="4" fill="#ff3b30"/>
  <text class="url" x="92" y="414">${SITE}</text>
  ${cards}
</svg>
`;
  fs.writeFileSync(OUT, svg);
  console.log(`banner.svg written: ${(svg.length / 1024).toFixed(0)} KB`);
})().catch((e) => { console.error(e); process.exit(1); });
