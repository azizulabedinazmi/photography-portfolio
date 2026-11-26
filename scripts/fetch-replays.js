#!/usr/bin/env node
/**
 * Syncs digital-art items in dist/gallery-data.json: edit details (canvas size,
 * date made, tools and filters used) and the step-by-step "Replay".
 *
 * Every item with a `postId` (the number at the end of the artwork's post link,
 * e.g. .../i/image-416248407049203) gets a `replay` list: one image per editing
 * step (Original, Cutout, Add Object, ..., final). Items that already have a
 * replay are skipped unless you pass --force.
 *
 *   npm run fetch-replays            # fill in missing replays
 *   npm run fetch-replays -- --force # refresh all
 *
 * Requests are spaced out; if the source starts refusing (rate limit), the
 * script stops and keeps everything fetched so far — just run it again later.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'dist', 'gallery-data.json');
const API = 'https://picsart.com/api/i/image?accessToken=&imageId=';
const PROFILE_ID = '362306335026101';
const force = process.argv.includes('--force');

// Post keywords that name an editing tool or a filter.
const TOOLS = {
  cutout: 'Cutout', crop: 'Crop', squarefit: 'Square Fit', freestyle: 'Free Style',
  sticker: 'Stickers', addobjects: 'Add Objects', photo: 'Photo Layer', adjust: 'Adjust',
  convolution: 'Sharpen', brushes: 'Brushes', shapemask: 'Shape Mask', haircolor: 'Hair Color',
  clone: 'Clone', remove: 'Remove', focalzoom: 'Focal Zoom', text: 'Text', draw: 'Draw',
  mask: 'Mask', border: 'Border', frame: 'Frame', curves: 'Curves', tiltshift: 'Tilt Shift',
};
const FILTERS = {
  hdrone: 'HDR One', icy1: 'Icy 1', film3: 'Film 3', brl4: 'BRL 4', tl2: 'TL 2',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const raw = fs.readFileSync(FILE, 'utf8');
  const data = JSON.parse(raw);
  const items = Array.isArray(data) ? data : data.items;

  // 1. Edit details for every artwork, from one profile request:
  //    canvas size, date made, tools and filters used.
  const linked = items.filter((i) => i.postId);
  if (linked.length) {
    const res = await fetch(`https://picsart.com/api/i/user-photos?userId=${PROFILE_ID}&limit=500`, {
      headers: { Accept: 'application/json', 'User-Agent': 'portfolio-replay-sync/1.0' },
    });
    const text = await res.text();
    if (res.ok && text.startsWith('{')) {
      const posts = JSON.parse(text).response || [];
      let n = 0;
      for (const item of linked) {
        const p = posts.find((x) => String(x.id) === String(item.postId));
        if (!p) continue;
        const kw = p.keywords || [];
        item.editDetails = {
          canvas: p.width && p.height ? `${p.width}×${p.height}` : undefined,
          made: p.created ? String(p.created).slice(0, 10) : undefined,
          tools: [...new Set(kw.map((k) => TOOLS[k]).filter(Boolean))],
          filters: [...new Set(kw.map((k) => FILTERS[k]).filter(Boolean))],
        };
        n++;
      }
      console.log(`Edit details: updated ${n}/${linked.length} artwork(s).`);
    } else {
      console.warn(`Edit details: source answered ${res.status}; kept existing details.`);
    }
    await sleep(2500);
  }

  // 2. Step-by-step replays.
  const todo =items.filter((i) => i.postId && (force || !Array.isArray(i.replay) || i.replay.length < 2));
  console.log(`Replays: ${todo.length} item(s) to fetch.`);

  let done = 0;
  for (const item of todo) {
    const res = await fetch(API + encodeURIComponent(item.postId), {
      headers: { Accept: 'application/json', 'User-Agent': 'portfolio-replay-sync/1.0' },
    });
    const text = await res.text();
    if (!res.ok || !text.startsWith('{')) {
      console.warn(`  Stopped at "${item.title}": source answered ${res.status}. Run again later.`);
      break;
    }
    const image = JSON.parse(text).image || {};
    const steps = (image.edit_history || [])
      .filter((s) => s && s.result)
      .map((s) => ({ type: s.type, src: s.result }));
    if (steps.length > 1) {
      item.replay = steps;
      console.log(`  ✓ ${item.title}: ${steps.length} steps`);
    } else {
      console.log(`  – ${item.title}: no edit history`);
    }
    done++;
    await sleep(2500);
  }

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + (raw.endsWith('\n') ? '\n' : ''));
  console.log(`Replays: ${done}/${todo.length} processed. Run "node scripts/build-seo.js" (or npm run build) to publish.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
