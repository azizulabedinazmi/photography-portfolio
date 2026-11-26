/**
 * Azmi Photography & Digital Art Portfolio - Modern Smart Features & Interactions
 * Features:
 * - 55-Item Unified Gallery Renderer (Photography + Digital Artworks)
 * - Dynamic Rotating Headline Animation (Soul & Light, Digital Art, etc.)
 * - Cinematic Continuous Horizontal Highlights Marquee
 * - 3D Card Hover Tilt with Dynamic Specular Reflection
 * - Staggered Scroll Reveal Animations (Intersection Observer)
 * - DSLR Shutter Audio Synthesizer & Camera Flash Burst + Mobile Haptic Feedback
 * - Dark / Light Theme Engine with localStorage & System sync
 * - Instant Category & Keyword Search filtering
 * - Adaptive Layout Switcher (Grid Masonry, Editorial Magazine, Contact Sheet)
 * - Fullscreen Zen Exhibition Slideshow Mode with Mobile Touch Swipe Navigation
 * - Dedicated EXIF & Behind-the-Scenes Story Popover Modal
 * - Keyboard Shortcuts & Micro-interactions
 */

(function () {
  'use strict';

  // --- HELPER: UNIVERSAL MEDIA URL RESOLVER (Google Drive, PicsArt, Local) ---
  function attr(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function altText(item) {
    return attr(item.alt || item.title);
  }

  const VARIANT_WIDTH = { w480: 480, w600: 480, w960: 960, w1600: 1600 };
  function variantUrl(url, size) {
    const v = window.IMAGE_VARIANTS && window.IMAGE_VARIANTS[url];
    if (!v) return null;
    const want = VARIANT_WIDTH[size] || 1600;
    const hit = v.srcset.find(([, w]) => w >= want) || v.srcset[v.srcset.length - 1];
    return encodeURI(hit[0].startsWith('/') ? hit[0] : '/' + hit[0]);
  }

  function responsiveAttrs(url) {
    const v = window.IMAGE_VARIANTS && window.IMAGE_VARIANTS[url];
    if (!v) return '';
    const set = v.srcset.map(([p, w]) => `${encodeURI(p.startsWith('/') ? p : '/' + p)} ${w}w`).join(', ');
    return `srcset="${set}" sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw" width="${v.w}" height="${v.h}"`;
  }

  function resolveMediaUrl(url, size = 'w1600') {
    if (!url) return '';
    const variant = variantUrl(url, size);
    if (variant) return variant;
    return sourceUrl(url, size);
  }

  function sourceUrl(url, size = 'w1600') {
    if (!url) return '';
    const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|gdrive:)?([a-zA-Z0-9_\-]{25,})/i;
    const match = url.match(driveRegex);
    if (match && match[1] && !url.includes('picsart.com') && !url.startsWith('dist/') && !url.startsWith('/dist/')) {
      return `https://lh3.googleusercontent.com/d/${match[1]}=${size}`;
    }
    if (url.startsWith('dist/')) return '/' + url;
    return url;
  }

  // --- REAL PHOTO / ARTWORK DETAILS ---
  // Camera settings come from the photo file itself (read at build time into
  // IMAGE_VARIANTS[src].exif); digital art shows its real edit details instead.
  // Nothing is invented: unknown values are simply left out.
  function fileExif(item) {
    const v = window.IMAGE_VARIANTS && window.IMAGE_VARIANTS[item.src];
    return (v && v.exif) || null;
  }

  const prettySoftware = (s) => (/^google$/i.test(s || '') ? 'Google Photos' : s);

  function prettyDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // One-line summary used on cards, captions and the slideshow.
  function cameraLine(item) {
    if (item.category === 'art') {
      const d = item.editDetails || {};
      const steps = Array.isArray(item.replay) && item.replay.length > 1 ? `${item.replay.length} edit steps` : '';
      return [steps || 'Digital Edit', d.made ? prettyDate(d.made) : ''].filter(Boolean).join(' · ');
    }
    const e = fileExif(item);
    if (e && (e.camera || e.shutter)) {
      return [e.camera, [e.focal, e.aperture].filter(Boolean).join(' '), e.shutter, e.iso].filter(Boolean).join(' · ');
    }
    // No camera data in the file: don't guess settings.
    return e && e.taken ? `Taken ${prettyDate(e.taken)}` : (item.location || '');
  }

  // Fills the info panel's detail tiles and rows; returns the story text.
  function renderDetails(item) {
    const titleEl = document.getElementById('exif-params-title');
    const grid = document.getElementById('exif-params');
    const note = document.getElementById('exif-params-note');
    const gear = document.getElementById('exif-gear');
    const tile = (label, value) => `
      <div class="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 text-center min-w-0">
        <div class="text-[10px] font-mono text-neutral-400 uppercase">${attr(label)}</div>
        <div class="text-sm font-bold font-mono text-neutral-900 dark:text-white mt-0.5 truncate" title="${attr(value)}">${attr(value)}</div>
      </div>`;
    const row = (label, value) => value ? `
      <div class="flex items-start justify-between gap-4 text-xs font-mono">
        <span class="text-neutral-500 shrink-0">${attr(label)}:</span>
        <span class="font-semibold text-neutral-900 dark:text-white text-right">${attr(value)}</span>
      </div>` : '';
    const setNote = (text) => { if (note) { note.textContent = text || ''; note.classList.toggle('hidden', !text); } };

    let tiles = [], rows = [], heading = '', story = '';

    if (item.category === 'art') {
      const d = item.editDetails || {};
      const steps = Array.isArray(item.replay) && item.replay.length > 1 ? item.replay : null;
      const stepNames = steps ? steps.map((s) => replayLabel(s.type)) : [];
      const tools = d.tools && d.tools.length ? d.tools : [...new Set(stepNames.filter((n) => n !== 'Original'))];
      const v = window.IMAGE_VARIANTS && window.IMAGE_VARIANTS[item.src];
      const canvas = d.canvas || (v ? `${v.w}×${v.h}` : '');
      const e = fileExif(item);
      heading = '<span>🎨</span> Edit Details';
      tiles = [
        ['Edit Steps', steps ? String(steps.length) : '—'],
        ['Tools Used', tools.length ? String(tools.length) : '—'],
        ['Canvas', canvas ? canvas.replace('×', ' × ') : '—'],
        ['Created', d.made ? prettyDate(d.made) : (e && e.taken ? prettyDate(e.taken) : '—')],
      ];
      rows = [
        row('Tools', tools.join(' · ')),
        row('Filters', (d.filters || []).join(' · ')),
        row('Edited with', e && e.software ? prettySoftware(e.software) : ''),
        row('Collection', item.location),
      ];
      setNote(steps ? 'Tap ▶ Replay on the card to watch every step.' : '');
      if (steps) {
        // Collapse runs: "Add Object, Add Object, Add Object" -> "Add Object ×3"
        const runs = [];
        stepNames.forEach((n) => (runs.length && runs[runs.length - 1][0] === n ? runs[runs.length - 1][1]++ : runs.push([n, 1])));
        story = `Built in ${steps.length} steps: ${runs.map(([n, k]) => (k > 1 ? `${n} ×${k}` : n)).join(' → ')}.`;
      } else if (tools.length) {
        story = `Made with ${tools.join(', ')}${d.filters && d.filters.length ? ` and the ${d.filters.join(', ')} filter` : ''}. The step-by-step history for this piece wasn't saved.`;
      } else {
        story = 'Digital edit. The step-by-step history for this piece wasn\'t saved.';
      }
      if (d.made) story += ` Created ${prettyDate(d.made)}.`;
    } else {
      const e = fileExif(item);
      heading = '<span>📷</span> Camera & Exposure';
      if (e && (e.shutter || e.aperture || e.iso || e.focal)) {
        tiles = [['Shutter', e.shutter || '—'], ['Aperture', e.aperture || '—'], ['ISO', e.iso || '—'], ['Focal Length', e.focal || '—']];
        setNote('Read from the original photo file.');
      } else {
        tiles = [];
        setNote(e && e.software
          ? `This file was saved by ${prettySoftware(e.software)}, which removed the camera settings.`
          : 'No camera settings are stored in this photo file.');
      }
      rows = [
        row('Camera', e && e.camera),
        row('Lens', e && e.lens),
        row('Taken', e && e.taken ? prettyDate(e.taken) : ''),
        row('Edited in', e && e.software ? prettySoftware(e.software) : ''),
        row('Collection', item.location),
      ];
      const shot = e && e.camera ? ` Shot on a ${e.camera}${e.lens ? ` with the ${e.lens}` : ''}${e.taken ? ` on ${prettyDate(e.taken)}` : ''}.` : '';
      story = item.isSeries
        ? `Part of the "${item.title}" series (${item.seriesCount} frames).${shot}`
        : (shot.trim() || `${item.title}.`);
    }

    if (titleEl) titleEl.innerHTML = heading;
    if (grid) {
      grid.innerHTML = tiles.map(([l, v]) => tile(l, v)).join('');
      grid.classList.toggle('hidden', !tiles.length);
    }
    if (gear) {
      gear.innerHTML = rows.join('');
      gear.classList.toggle('hidden', !rows.join('').trim());
    }
    return story;
  }

  // --- 0. GALLERY RENDERER ---
  const GalleryRenderer = {
    render() {
      const container = document.getElementById('portfolio-gallery');
      if (!container || !window.GALLERY_DATA) return;

      if (container.children.length === 0) {
        container.innerHTML = window.GALLERY_DATA.map((item, index) => {
          const isSeries = item.isSeries;
          const isArt = item.category === 'art';
          const itemSrc = sourceUrl(item.src);
          const fullSrc = resolveMediaUrl(item.src);
          const gridSrc = resolveMediaUrl(item.src, 'w960');
          
          let badge = '';
          if (isSeries) {
            badge = `
              <div class="absolute top-3 left-3 pointer-events-none z-10">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide bg-black/60 dark:bg-black/75 backdrop-blur-md text-white border border-white/10 shadow-lg">
                  <svg class="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/></svg>
                  Series (${item.seriesCount})
                </span>
              </div>`;
          } else if (isArt) {
            badge = `
              <div class="absolute top-3 left-3 pointer-events-none z-10">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide bg-gradient-to-r from-purple-600/80 to-pink-600/80 backdrop-blur-md text-white border border-white/15 shadow-lg">
                  <span>🎨</span> Digital Art
                </span>
              </div>`;
          }

          const extraLinks = (isSeries && item.seriesExtra) ? item.seriesExtra.map(extra => `
            <a href="${resolveMediaUrl(extra)}" data-thumb-src="${resolveMediaUrl(extra, 'w480')}" data-fancybox="gallery" ${item.seriesGroup}="true" data-caption="<strong>${item.title}</strong> (Series)" style="display: none;"></a>
          `).join('') : '';

          const seriesAttr = isSeries ? `${item.seriesGroup}="true"` : '';

          const categoryText = {
            portraits: 'Portrait',
            events: 'Event / Street',
            nature: 'Nature / Detail',
            art: 'Digital Art'
          }[item.category] || 'Fine Art';

          return `
            <div class="gallery-item tilt-card group relative overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800/80 opacity-0 translate-y-8 transition-all duration-500 hover:shadow-2xl hover:border-neutral-400 dark:hover:border-neutral-600"
                 data-category="${item.category}"
                 data-title="${item.title}"
                 data-tags="${item.tags || ''}"
                 data-camera="${attr(cameraLine(item))}"
                 data-location="${item.location || ''}"
                 data-photo-id="${item.id}"
                 data-photo-src="${itemSrc}"
                 data-is-series="${isSeries ? 'true' : 'false'}">
              
              <a href="${fullSrc}" 
                 data-fancybox="gallery" 
                 data-thumb-src="${resolveMediaUrl(item.src, 'w480')}"
                 ${seriesAttr}
                 data-caption="<strong>${item.title}</strong><br><span class='text-xs opacity-75'>${attr(cameraLine(item))}</span>"
                 class="block w-full h-full overflow-hidden cursor-zoom-in">
                <img src="${gridSrc}" 
                     ${responsiveAttrs(item.src)}
                     alt="${altText(item)}" 
                     title="${attr(item.title)}"
                     loading="${index < 4 ? 'eager' : 'lazy'}" decoding="async" ${index < 2 ? 'fetchpriority="high"' : ''}
                     class="w-full h-auto object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out" />
              </a>

              ${badge}

              ${Array.isArray(item.replay) && item.replay.length > 1 ? `
              <button type="button"
                      class="replay-btn absolute top-3 right-14 z-10 inline-flex items-center gap-1.5 pl-2.5 pr-3 py-2 rounded-full bg-black/40 hover:bg-black/75 backdrop-blur-md border border-white/15 text-white text-[11px] font-semibold tracking-wide transition-all duration-300 opacity-90 sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
                      data-index="${index}"
                      title="Replay how this edit was made">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.34-5.89a1.5 1.5 0 000-2.54L6.3 2.84z"/></svg>
                Replay
              </button>` : ''}

              <!-- Info / EXIF Button (Replaces Moodboard Heart) -->
              <button type="button"
                      class="exif-btn absolute top-3 right-3 z-10 p-2.5 rounded-full bg-black/40 hover:bg-black/75 backdrop-blur-md border border-white/15 text-white transition-all duration-300 opacity-90 sm:opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 hover:scale-110 focus:opacity-100"
                      data-index="${index}"
                      title="View Camera EXIF & Story Behind Shot (I)">
                <svg class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
                </svg>
              </button>

              <div class="absolute inset-x-0 bottom-0 p-4 pt-12 photo-card-overlay opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col justify-end">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-white/20 backdrop-blur-sm text-white font-semibold">${categoryText}</span>
                  <span class="text-[11px] text-white/70 font-mono truncate">${item.location.split(',')[0]}</span>
                </div>
                <h3 class="text-white text-base font-semibold tracking-tight drop-shadow-sm truncate">${item.title}</h3>
                <p class="text-[11px] text-white/80 font-mono mt-0.5 flex items-center gap-1.5 truncate">
                  <svg class="w-3 h-3 text-neutral-300 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/></svg>
                  ${attr(cameraLine(item))}
                </p>
              </div>

              ${extraLinks}
            </div>
          `;
        }).join('');
      }

      Masonry.init(container);
      HoverSlides.init();
      CardAnimations.init();
      FilmstripMarquee.render();
      ExifModalManager.bind();
      ReplayPlayer.bind();
    }
  };

  // --- EDIT REPLAY PLAYER ---
  // Steps through how a digital artwork was built (Original → Cutout → … → Final),
  // using the per-step images stored in each gallery item's `replay` list.
  const REPLAY_LABELS = {
    image: 'Original', cutout: 'Cutout', square_fit: 'Square Fit', add_object: 'Add Object',
    free_style: 'Free Style', effects: 'Effects', transform: 'Transform', mask: 'Mask',
    quickDraw: 'Quick Draw', adjust: 'Adjust', shape_mask: 'Shape Mask', crop: 'Crop',
    text: 'Text', draw: 'Draw', border: 'Border', frame: 'Frame', stretch: 'Stretch',
    beautify: 'Beautify', remove: 'Remove', clone: 'Clone', curves: 'Curves', tilt_shift: 'Tilt Shift'
  };
  const replayLabel = (type) => REPLAY_LABELS[type] ||
    String(type || 'Step').replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (c) => c.toUpperCase());
  const replaySize = (src, q) => src + (src.includes('?') ? '&' : '?') + q;
  // Checkerboard shown behind transparent edit steps (cutouts), like an editor canvas,
  // so a cutout never blends with whatever image sits underneath it.
  const STEP_BG = 'background-color:#fff;background-image:conic-gradient(#e7e7e7 25%,#fff 0 50%,#e7e7e7 0 75%,#fff 0);background-size:16px 16px;';

  const ReplayPlayer = {
    el: null, item: null, idx: 0, timer: null, touchX: 0, STEP_MS: 1500,

    bind() {
      document.querySelectorAll('.replay-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const item = window.GALLERY_DATA[parseInt(btn.dataset.index, 10)];
          if (item) this.open(item);
        });
      });
    },

    build() {
      if (this.el) return;
      const el = document.createElement('div');
      el.id = 'replay-modal';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-label', 'Edit replay');
      el.className = 'fixed inset-0 z-[70] hidden opacity-0 transition-opacity duration-300 bg-[#0b0b0b]/97 backdrop-blur-xl flex flex-col select-none';
      el.innerHTML = `
        <div class="flex items-center justify-between gap-4 px-4 sm:px-8 pt-4 sm:pt-6">
          <div class="min-w-0">
            <div class="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-300/90">Edit Replay</div>
            <h3 id="replay-title" class="text-lg sm:text-2xl font-serif font-bold text-white truncate"></h3>
          </div>
          <button type="button" id="replay-close" class="shrink-0 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition" aria-label="Close replay">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div id="replay-stage" class="relative flex-1 min-h-0 flex items-center justify-center px-4 sm:px-16 py-4">
          <img id="replay-img-a" alt="" style="${STEP_BG}" class="absolute max-h-full max-w-[calc(100%-2rem)] sm:max-w-[calc(100%-8rem)] object-contain rounded-xl shadow-2xl transition-opacity duration-500 opacity-100" draggable="false" />
          <img id="replay-img-b" alt="" style="${STEP_BG}" class="absolute max-h-full max-w-[calc(100%-2rem)] sm:max-w-[calc(100%-8rem)] object-contain rounded-xl shadow-2xl transition-opacity duration-500 opacity-0" draggable="false" />
          <button type="button" id="replay-prev" class="absolute left-2 sm:left-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition" aria-label="Previous step">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button type="button" id="replay-next" class="absolute right-2 sm:right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition" aria-label="Next step">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
        <div class="px-4 sm:px-8 pb-5 sm:pb-7">
          <div class="flex items-center justify-center gap-3 mb-3">
            <button type="button" id="replay-play" class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition active:scale-95"></button>
            <span id="replay-counter" class="text-xs font-mono text-white/60"></span>
          </div>
          <div class="h-0.5 w-full max-w-3xl mx-auto bg-white/10 rounded-full overflow-hidden mb-4">
            <div id="replay-progress" class="h-full bg-amber-300 transition-all duration-500" style="width:0%"></div>
          </div>
          <div id="replay-strip" class="flex gap-3 overflow-x-auto pb-1 justify-start sm:justify-center [scrollbar-width:thin]"></div>
        </div>`;
      document.body.appendChild(el);
      this.el = el;

      el.querySelector('#replay-close').addEventListener('click', () => this.close());
      el.querySelector('#replay-prev').addEventListener('click', () => { this.pause(); this.go(this.idx - 1); });
      el.querySelector('#replay-next').addEventListener('click', () => { this.pause(); this.go(this.idx + 1); });
      el.querySelector('#replay-play').addEventListener('click', () => (this.timer ? this.pause() : this.play()));
      el.querySelector('#replay-stage').addEventListener('click', (e) => { if (e.target.id === 'replay-stage') this.close(); });
      el.addEventListener('touchstart', (e) => { this.touchX = e.touches[0].clientX; }, { passive: true });
      el.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - this.touchX;
        if (Math.abs(dx) > 45) { this.pause(); this.go(this.idx + (dx < 0 ? 1 : -1)); }
      }, { passive: true });
      document.addEventListener('keydown', (e) => {
        if (!this.item) return;
        if (e.key === 'Escape') { e.stopImmediatePropagation(); this.close(); }
        else if (e.key === 'ArrowRight') { this.pause(); this.go(this.idx + 1); }
        else if (e.key === 'ArrowLeft') { this.pause(); this.go(this.idx - 1); }
        else if (e.key === ' ') { e.preventDefault(); this.timer ? this.pause() : this.play(); }
      }, true);
    },

    open(item) {
      this.build();
      this.item = item;
      this.steps = item.replay.map((s) => ({ label: replayLabel(s.type), src: s.src }));
      this.el.querySelector('#replay-title').textContent = item.title || '';
      this.el.querySelector('#replay-strip').innerHTML = this.steps.map((s, i) => `
        <button type="button" data-step="${i}" class="replay-step shrink-0 flex flex-col items-center gap-1.5 group/step">
          <span class="block w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden ring-2 ring-transparent transition">
            <img src="${replaySize(s.src, 'to=crop&type=webp&r=144x144&q=85')}" alt="" class="w-full h-full object-cover" loading="lazy" draggable="false" />
          </span>
          <span class="text-[10px] font-medium text-white/50 whitespace-nowrap transition">${s.label}</span>
        </button>`).join('');
      this.el.querySelectorAll('.replay-step').forEach((b) => b.addEventListener('click', () => { this.pause(); this.go(+b.dataset.step); }));
      // Warm the cache so steps swap instantly.
      this.steps.forEach((s) => { const i = new Image(); i.src = replaySize(s.src, 'type=webp&to=min&r=1200&q=85'); });

      this.el.classList.remove('hidden');
      void this.el.offsetWidth;
      this.el.classList.remove('opacity-0');
      document.body.classList.add('overflow-hidden');
      this.front = 'a';
      this.idx = -1;
      this.go(0);
      this.play();
    },

    close() {
      if (!this.el || !this.item) return;
      this.pause();
      this.item = null;
      this.el.classList.add('opacity-0');
      document.body.classList.remove('overflow-hidden');
      setTimeout(() => { if (!this.item) this.el.classList.add('hidden'); }, 300);
    },

    go(i) {
      const n = this.steps.length;
      i = Math.max(0, Math.min(n - 1, i));
      if (i === this.idx) return;
      this.idx = i;
      const step = this.steps[i];
      const show = this.el.querySelector(`#replay-img-${this.front === 'a' ? 'b' : 'a'}`);
      const hide = this.el.querySelector(`#replay-img-${this.front}`);
      show.onload = () => { show.style.opacity = '1'; hide.style.opacity = '0'; };
      show.alt = `${this.item.title} — step ${i + 1}: ${step.label}`;
      show.src = replaySize(step.src, 'type=webp&to=min&r=1200&q=85');
      if (show.complete && show.naturalWidth) show.onload();
      this.front = this.front === 'a' ? 'b' : 'a';

      this.el.querySelector('#replay-counter').textContent = `Step ${i + 1} / ${n} · ${step.label}`;
      this.el.querySelector('#replay-progress').style.width = `${((i + 1) / n) * 100}%`;
      this.el.querySelector('#replay-prev').style.visibility = i === 0 ? 'hidden' : '';
      this.el.querySelector('#replay-next').style.visibility = i === n - 1 ? 'hidden' : '';
      this.el.querySelectorAll('.replay-step').forEach((b, j) => {
        const on = j === i;
        b.firstElementChild.classList.toggle('ring-amber-300', on);
        b.firstElementChild.classList.toggle('ring-transparent', !on);
        b.lastElementChild.classList.toggle('text-white', on);
        b.lastElementChild.classList.toggle('text-white/50', !on);
        if (on) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      });
    },

    play() {
      this.pause();
      if (this.idx >= this.steps.length - 1) this.go(0);
      this.timer = setInterval(() => {
        if (this.idx >= this.steps.length - 1) return this.pause();
        this.go(this.idx + 1);
      }, this.STEP_MS);
      this.renderPlay();
    },

    pause() {
      clearInterval(this.timer);
      this.timer = null;
      this.renderPlay();
    },

    renderPlay() {
      const btn = this.el && this.el.querySelector('#replay-play');
      if (!btn) return;
      btn.innerHTML = this.timer
        ? '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .41.34.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .41.34.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z"/></svg> Pause'
        : '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.34-5.89a1.5 1.5 0 000-2.54L6.3 2.84z"/></svg> Replay';
    }
  };

  // --- MASONRY LAYOUT ---
  // CSS grid stretches every card in a row to the tallest photo, which turned
  // landscape shots into tall portrait-shaped boxes. Instead every card is
  // placed explicitly: it spans as many 1px rows as its own height and goes
  // into the shortest column, so each photo keeps its real shape with no gaps.
  // In the 4-column view with photos and art mixed, all digital art gets its
  // own lane in column 4 and photos fill columns 1–3.
  const Masonry = {
    init(container) {
      this.container = container;
      this.cards = [...container.querySelectorAll('.gallery-item')];
      container.style.gridAutoRows = '1px';
      container.style.rowGap = '0px';
      container.style.alignItems = 'start';
      let t = 0;
      this.layout = () => { clearTimeout(t); t = setTimeout(() => this.place(), 16); };
      this.place();
      window.addEventListener('resize', this.layout);
      this.cards.forEach((card) => card.querySelectorAll('img').forEach((img) => img.addEventListener('load', this.layout)));
      // Also catches layout-switch and filter changes that alter card sizes.
      if ('ResizeObserver' in window) {
        const ro = new ResizeObserver(this.layout);
        this.cards.forEach((card) => ro.observe(card));
      }
    },

    place() {
      // Drop old placements first: a card pinned to column 4 would otherwise
      // create extra implicit columns after switching to a 2-column layout.
      this.cards.forEach((card) => { card.style.gridColumn = ''; card.style.gridRow = ''; });
      const cs = getComputedStyle(this.container);
      const cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length || 1;
      const gap = parseFloat(cs.columnGap) || 0;
      const visible = this.cards.filter((c) => c.style.display !== 'none');
      const isArt = (c) => c.dataset.category === 'art';
      const artLane = cols === 4 && visible.some(isArt) && visible.some((c) => !isArt(c));
      const heights = new Array(cols).fill(0);
      const shortest = (from, to) => {
        let best = from;
        for (let i = from; i <= to; i++) if (heights[i] < heights[best]) best = i;
        return best;
      };

      const put = (card, col) => {
        const span = Math.max(1, Math.ceil(card.offsetHeight + gap));
        card.style.gridColumn = String(col + 1);
        card.style.gridRow = `${heights[col] + 1} / span ${span}`;
        heights[col] += span;
      };

      if (!artLane) {
        visible.forEach((card) => put(card, shortest(0, cols - 1)));
        return;
      }

      // Photos fill columns 1–3; art runs down column 4 alongside them.
      // Once the art column reaches the bottom of the photos, the remaining
      // artworks flow into the space below, across all four columns.
      const last = cols - 1;
      visible.filter((c) => !isArt(c)).forEach((card) => put(card, shortest(0, last - 1)));
      const photoBottom = Math.max(...heights.slice(0, last));
      visible.filter(isArt).forEach((card) => {
        put(card, heights[last] < photoBottom ? last : shortest(0, last));
      });
    }
  };

  // --- HOVER SLIDESHOW ---
  // Hovering a series card cycles through its frames; hovering a digital-art
  // card plays its edit steps. Only on devices with a real hover pointer.
  const HoverSlides = {
    FRAME_MS: 900,

    init() {
      if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      document.querySelectorAll('.gallery-item').forEach((card) => {
        const item = (window.GALLERY_DATA || []).find((i) => String(i.id) === card.dataset.photoId);
        const frames = item ? this.framesFor(item) : [];
        if (frames.length < 2) return;
        card.addEventListener('mouseenter', () => this.start(card, frames));
        card.addEventListener('mouseleave', () => this.stop(card));
      });
    },

    framesFor(item) {
      if (Array.isArray(item.replay) && item.replay.length > 1) {
        return item.replay.map((s) => replaySize(s.src, 'type=webp&to=min&r=720&q=80'));
      }
      if (item.isSeries && Array.isArray(item.seriesExtra) && item.seriesExtra.length) {
        return [item.src, ...item.seriesExtra]
          .map((s) => resolveMediaUrl(typeof s === 'string' ? s : s && s.image, 'w960'))
          .filter(Boolean);
      }
      return [];
    },

    start(card, frames) {
      this.stop(card);
      const link = card.querySelector('a[data-fancybox]');
      if (!link) return;
      link.style.position = 'relative';
      let layer = card.querySelector('.hover-slide');
      if (!layer) {
        layer = document.createElement('div');
        layer.className = 'hover-slide absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300';
        layer.innerHTML = `
          <img alt="" style="${STEP_BG}" class="absolute inset-0 w-full h-full object-cover transition-opacity duration-500" draggable="false" />
          <img alt="" style="${STEP_BG}" class="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 opacity-0" draggable="false" />
          <div class="absolute top-14 left-3 right-3 flex gap-1">${frames.map(() => '<span class="h-0.5 flex-1 rounded-full bg-white/30 overflow-hidden"><i class="block h-full w-0 bg-white"></i></span>').join('')}</div>`;
        link.appendChild(layer);
        frames.forEach((f) => { const i = new Image(); i.src = f; });
      }
      const imgs = layer.querySelectorAll('img');
      const bars = layer.querySelectorAll('i');
      let n = 0, front = 0;
      const show = (k) => {
        if (k === 0 && imgs[front].getAttribute('src') === frames[0]) {
          // first frame is already up
        } else {
          const next = imgs[1 - front];
          const swap = () => {
            next.onload = null;
            next.style.opacity = '1';
            imgs[front].style.opacity = '0';
            front = 1 - front;
          };
          next.onload = swap;
          next.src = frames[k];
          if (next.complete && next.naturalWidth) swap();
        }
        bars.forEach((b, j) => {
          b.style.transition = 'none';
          b.style.width = j < k ? '100%' : '0';
          if (j === k) { void b.offsetWidth; b.style.transition = `width ${this.FRAME_MS}ms linear`; b.style.width = '100%'; }
        });
      };
      imgs.forEach((im) => { im.onload = null; });
      imgs[front].src = frames[0];
      imgs[front].style.opacity = '1';
      imgs[1 - front].style.opacity = '0';
      show(0);
      layer.style.opacity = '1';
      card._slideTimer = setInterval(() => { n = (n + 1) % frames.length; show(n); }, this.FRAME_MS);
    },

    stop(card) {
      clearInterval(card._slideTimer);
      card._slideTimer = null;
      const layer = card.querySelector('.hover-slide');
      if (layer) layer.style.opacity = '0';
    }
  };

  // --- CARD ANIMATIONS & 3D TILT ---
  const CardAnimations = {
    init() {
      const items = document.querySelectorAll('.gallery-item');
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, obs) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.remove('opacity-0', 'translate-y-8');
              entry.target.classList.add('opacity-100', 'translate-y-0');
              obs.unobserve(entry.target);
            }
          });
        }, { threshold: 0.08, rootMargin: '0px 0px 50px 0px' });

        items.forEach(el => observer.observe(el));
      } else {
        items.forEach(el => {
          el.classList.remove('opacity-0', 'translate-y-8');
          el.classList.add('opacity-100', 'translate-y-0');
        });
      }

      // 3D Perspective Tilt on Mouse Movement
      items.forEach(card => {
        let bounds;
        function rotateToMouse(e) {
          const mouseX = e.clientX;
          const mouseY = e.clientY;
          const leftX = mouseX - bounds.x;
          const topY = mouseY - bounds.y;
          const center = { x: leftX - bounds.width / 2, y: topY - bounds.height / 2 };
          const distance = Math.sqrt(center.x ** 2 + center.y ** 2);
          
          card.style.transform = `
            scale3d(1.02, 1.02, 1.02)
            rotate3d(
              ${center.y / 100},
              ${-center.x / 100},
              0,
              ${Math.log(distance) * 1.5}deg
            )
          `;
        }

        card.addEventListener('mouseenter', () => {
          bounds = card.getBoundingClientRect();
          document.addEventListener('mousemove', rotateToMouse);
        });

        card.addEventListener('mouseleave', () => {
          document.removeEventListener('mousemove', rotateToMouse);
          card.style.transform = '';
        });
      });
    }
  };

  // --- FILMSTRIP MARQUEE ---
  const FilmstripMarquee = {
    render() {
      const inner = document.getElementById('filmstrip-marquee-inner');
      if (!inner || !window.GALLERY_DATA) return;

      const highlights = window.GALLERY_DATA.slice(0, 18);
      const renderItem = (item) => `
        <a href="${resolveMediaUrl(item.src)}" data-fancybox="filmstrip" class="block shrink-0 w-36 sm:w-48 h-24 sm:h-32 rounded-xl overflow-hidden border border-neutral-300 dark:border-neutral-800 shadow-md group relative">
          <img src="${resolveMediaUrl(item.src, 'w480')}" alt="${altText(item)}" class="w-full h-full object-cover transform group-hover:scale-110 transition duration-500" loading="lazy" />
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span class="text-[11px] font-mono text-white text-center px-2 truncate">${item.title}</span>
          </div>
        </a>
      `;

      inner.innerHTML = highlights.map(renderItem).join('') + highlights.map(renderItem).join('');
    }
  };

  // --- ROTATING HEADLINE ---
  const HeadlineRotator = {
    words: ['Soul & Light', 'Digital Art', 'Cultural Stories', 'Fine Art Moments', 'Raw Emotions'],
    idx: 0,
    init() {
      const el = document.getElementById('rotating-headline-word');
      if (!el) return;
      setInterval(() => {
        this.idx = (this.idx + 1) % this.words.length;
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
        setTimeout(() => {
          el.textContent = this.words[this.idx];
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }, 300);
      }, 3500);
    }
  };

  // --- DSLR SHUTTER AUDIO SYNTHESIZER & FLASH WITH HAPTIC FEEDBACK ---
  const ShutterSound = {
    enabled: false,
    audioCtx: null,
    init() {
      const btn = document.querySelector('.sound-toggle-btn');
      if (!btn) return;
      const iconOn = document.querySelector('.sound-icon-on');
      const iconOff = document.querySelector('.sound-icon-off');

      const saved = localStorage.getItem('azmi_sound');
      if (saved === 'true') {
        this.enabled = true;
        if (iconOn) iconOn.classList.remove('hidden');
        if (iconOff) iconOff.classList.add('hidden');
      }

      btn.addEventListener('click', () => {
        this.enabled = !this.enabled;
        localStorage.setItem('azmi_sound', this.enabled ? 'true' : 'false');
        if (this.enabled) {
          if (iconOn) iconOn.classList.remove('hidden');
          if (iconOff) iconOff.classList.add('hidden');
          this.playClick();
        } else {
          if (iconOn) iconOn.classList.add('hidden');
          if (iconOff) iconOff.classList.remove('hidden');
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 's' || e.key === 'S') {
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            btn.click();
          }
        }
      });
    },

    playClick() {
      // Trigger Haptic Vibration on mobile
      if ('vibrate' in navigator) {
        try { navigator.vibrate(25); } catch (e) {}
      }

      if (!this.enabled) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!this.audioCtx) this.audioCtx = new AudioContext();
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.audioCtx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.08);

        // Flash burst
        const flash = document.getElementById('camera-flash');
        if (flash) {
          flash.classList.remove('camera-flash-active');
          void flash.offsetWidth;
          flash.classList.add('camera-flash-active');
        }
      } catch (err) {}
    }
  };

  // --- DARK / LIGHT THEME ENGINE ---
  const ThemeEngine = {
    init() {
      const toggle = document.querySelector('.theme-toggle-btn');
      if (!toggle) return;
      const sun = document.querySelector('.theme-icon-sun');
      const moon = document.querySelector('.theme-icon-moon');

      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        if (sun) sun.classList.remove('hidden');
        if (moon) moon.classList.add('hidden');
      } else {
        if (sun) sun.classList.add('hidden');
        if (moon) moon.classList.remove('hidden');
      }

      toggle.addEventListener('click', () => {
        const currentlyDark = document.documentElement.classList.contains('dark');
        if (currentlyDark) {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('azmi_theme', 'light');
          if (sun) sun.classList.add('hidden');
          if (moon) moon.classList.remove('hidden');
        } else {
          document.documentElement.classList.add('dark');
          localStorage.setItem('azmi_theme', 'dark');
          if (sun) sun.classList.remove('hidden');
          if (moon) moon.classList.add('hidden');
        }
        ShutterSound.playClick();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 't' || e.key === 'T') {
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            toggle.click();
          }
        }
      });
    }
  };

  // --- DEDICATED EXIF & STORY MODAL MANAGER ---
  const ExifModalManager = {
    backdrop: null,
    modal: null,
    currentIdx: 0,

    init() {
      this.backdrop = document.getElementById('exif-modal-backdrop');
      this.modal = document.getElementById('exif-modal');
      const closeBtn = document.getElementById('exif-close-btn');

      if (closeBtn) closeBtn.addEventListener('click', () => this.close());
      if (this.backdrop) this.backdrop.addEventListener('click', () => this.close());

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modal && !this.modal.classList.contains('opacity-0')) {
          this.close();
        }
      });
    },

    bind() {
      document.querySelectorAll('.exif-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const idx = parseInt(btn.dataset.index, 10);
          this.open(idx);
        });
      });
    },

    open(index) {
      if (!window.GALLERY_DATA || !window.GALLERY_DATA[index]) return;
      this.currentIdx = index;
      const item = window.GALLERY_DATA[index];
      const titleEl = document.getElementById('exif-title');
      const catEl = document.getElementById('exif-category');
      const storyEl = document.getElementById('exif-story');
      const tagsEl = document.getElementById('exif-tags');
      const zoomBtn = document.getElementById('exif-zoom-btn');

      if (titleEl) titleEl.textContent = item.title;
      if (catEl) catEl.textContent = `${item.category.toUpperCase()} · ${item.location}`;
      const story = renderDetails(item);
      if (storyEl) storyEl.textContent = story;

      if (tagsEl) {
        const tags = (item.tags || '').split(',').map(s => s.trim()).filter(Boolean);
        tagsEl.innerHTML = tags.map(t => `<span class="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[10px] font-mono text-neutral-600 dark:text-neutral-400">#${t}</span>`).join('');
      }

      if (zoomBtn) {
        zoomBtn.href = resolveMediaUrl(item.src);
      }

      if (this.backdrop) {
        this.backdrop.classList.remove('opacity-0', 'pointer-events-none');
        this.backdrop.classList.add('opacity-100');
      }
      if (this.modal) {
        this.modal.classList.remove('translate-y-full', 'sm:translate-y-8', 'opacity-0', 'pointer-events-none');
        this.modal.classList.add('translate-y-0', 'opacity-100');
      }

      ShutterSound.playClick();
    },

    close() {
      if (this.backdrop) {
        this.backdrop.classList.add('opacity-0', 'pointer-events-none');
        this.backdrop.classList.remove('opacity-100');
      }
      if (this.modal) {
        this.modal.classList.add('translate-y-full', 'sm:translate-y-8', 'opacity-0', 'pointer-events-none');
        this.modal.classList.remove('translate-y-0', 'opacity-100');
      }
    }
  };

  // --- FULLSCREEN ZEN EXHIBITION MODE WITH TOUCH SWIPE ---
  const ZenMode = {
    active: false,
    currentIndex: 0,
    timer: null,
    touchStartX: 0,

    init() {
      const modal = document.getElementById('zen-exhibition-modal');
      if (!modal) return;
      const openBtns = document.querySelectorAll('.open-zen-btn');
      const closeBtn = document.getElementById('zen-close-btn');
      const prevBtn = document.getElementById('zen-prev-btn');
      const nextBtn = document.getElementById('zen-next-btn');
      const playBtn = document.getElementById('zen-play-btn');
      const exifBtn = document.getElementById('zen-exif-btn');

      openBtns.forEach(btn => btn.addEventListener('click', () => this.open()));
      if (closeBtn) closeBtn.addEventListener('click', () => this.close());
      if (prevBtn) prevBtn.addEventListener('click', () => this.prev());
      if (nextBtn) nextBtn.addEventListener('click', () => this.next());
      if (playBtn) playBtn.addEventListener('click', () => this.togglePlay());
      if (exifBtn) exifBtn.addEventListener('click', () => {
        ExifModalManager.open(this.currentIndex);
      });

      // Mobile Touch Swipe Gesture Support
      modal.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 0) {
          this.touchStartX = e.touches[0].clientX;
        }
      }, { passive: true });

      modal.addEventListener('touchend', (e) => {
        if (e.changedTouches && e.changedTouches.length > 0) {
          const diff = e.changedTouches[0].clientX - this.touchStartX;
          if (Math.abs(diff) > 45) {
            diff > 0 ? this.prev() : this.next();
          }
        }
      }, { passive: true });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'z' || e.key === 'Z') {
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            this.active ? this.close() : this.open();
          }
        }
        if (!this.active) return;
        if (e.key === 'Escape') this.close();
        if (e.key === 'ArrowRight') this.next();
        if (e.key === 'ArrowLeft') this.prev();
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          this.togglePlay();
        }
        if (e.key === 'i' || e.key === 'I') {
          ExifModalManager.open(this.currentIndex);
        }
      });
    },

    open() {
      const modal = document.getElementById('zen-exhibition-modal');
      if (!modal || !window.GALLERY_DATA) return;
      this.active = true;
      modal.classList.remove('hidden');
      void modal.offsetWidth;
      modal.classList.remove('opacity-0');
      modal.classList.add('opacity-100');
      document.body.classList.add('overflow-hidden');
      this.showPhoto(this.currentIndex);
      ShutterSound.playClick();
    },

    close() {
      const modal = document.getElementById('zen-exhibition-modal');
      if (!modal) return;
      this.active = false;
      modal.classList.remove('opacity-100');
      modal.classList.add('opacity-0');
      setTimeout(() => modal.classList.add('hidden'), 300);
      document.body.classList.remove('overflow-hidden');
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },

    showPhoto(idx) {
      if (!window.GALLERY_DATA || window.GALLERY_DATA.length === 0) return;
      this.currentIndex = (idx + window.GALLERY_DATA.length) % window.GALLERY_DATA.length;
      const item = window.GALLERY_DATA[this.currentIndex];
      const img = document.getElementById('zen-main-img');
      const ambient = document.getElementById('zen-ambient-bg');
      const title = document.getElementById('zen-photo-title');
      const meta = document.getElementById('zen-photo-meta');
      const counter = document.getElementById('zen-photo-counter');

      const fullUrl = resolveMediaUrl(item.src);
      if (img) {
        img.style.opacity = '0';
        setTimeout(() => {
          img.src = fullUrl;
          img.onload = () => { img.style.opacity = '1'; };
        }, 150);
      }
      if (ambient) ambient.style.backgroundImage = `url('${resolveMediaUrl(item.src, 'w480')}')`;
      if (title) title.textContent = item.title;
      if (meta) meta.textContent = [item.category.toUpperCase(), cameraLine(item), item.location].filter(Boolean).join(' · ');
      if (counter) counter.textContent = `${this.currentIndex + 1} / ${window.GALLERY_DATA.length}`;
    },

    next() {
      this.showPhoto(this.currentIndex + 1);
      ShutterSound.playClick();
    },

    prev() {
      this.showPhoto(this.currentIndex - 1);
      ShutterSound.playClick();
    },

    togglePlay() {
      const playIcon = document.getElementById('zen-play-icon');
      const pauseIcon = document.getElementById('zen-pause-icon');
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
        if (playIcon) playIcon.classList.remove('hidden');
        if (pauseIcon) pauseIcon.classList.add('hidden');
      } else {
        this.next();
        this.timer = setInterval(() => this.next(), 4000);
        if (playIcon) playIcon.classList.add('hidden');
        if (pauseIcon) pauseIcon.classList.remove('hidden');
      }
    }
  };

  // --- CATEGORY & SEARCH FILTERING ---
  const FilterEngine = {
    activeCategory: 'all',
    searchTerm: '',

    init() {
      const catBtns = document.querySelectorAll('.category-filter-btn');
      const searchInput = document.getElementById('gallery-search-input');
      const clearBtn = document.getElementById('gallery-search-clear');

      catBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          catBtns.forEach(b => {
            b.classList.remove('bg-black', 'text-white', 'dark:bg-white', 'dark:text-black');
            b.classList.add('bg-neutral-100', 'text-neutral-700', 'dark:bg-neutral-900', 'dark:text-neutral-300');
          });
          btn.classList.remove('bg-neutral-100', 'text-neutral-700', 'dark:bg-neutral-900', 'dark:text-neutral-300');
          btn.classList.add('bg-black', 'text-white', 'dark:bg-white', 'dark:text-black');

          this.activeCategory = btn.dataset.category || 'all';
          this.apply();
        });
      });

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchTerm = e.target.value.toLowerCase().trim();
          if (clearBtn) clearBtn.classList.toggle('hidden', this.searchTerm.length === 0);
          this.apply();
        });
      }

      if (clearBtn && searchInput) {
        clearBtn.addEventListener('click', () => {
          searchInput.value = '';
          this.searchTerm = '';
          clearBtn.classList.add('hidden');
          this.apply();
        });
      }
    },

    apply() {
      const items = document.querySelectorAll('.gallery-item');
      let visibleCount = 0;

      items.forEach(item => {
        const cat = item.dataset.category;
        const isSeries = item.dataset.isSeries === 'true';
        const title = (item.dataset.title || '').toLowerCase();
        const tags = (item.dataset.tags || '').toLowerCase();
        const camera = (item.dataset.camera || '').toLowerCase();

        // Category match
        let catMatch = false;
        if (this.activeCategory === 'all') catMatch = true;
        else if (this.activeCategory === 'series') catMatch = isSeries;
        else if (this.activeCategory === cat) catMatch = true;

        // Search match
        let searchMatch = true;
        if (this.searchTerm) {
          searchMatch = title.includes(this.searchTerm) || tags.includes(this.searchTerm) || camera.includes(this.searchTerm);
        }

        if (catMatch && searchMatch) {
          item.style.display = '';
          visibleCount++;
        } else {
          item.style.display = 'none';
        }
      });

      const countEl = document.getElementById('gallery-results-count');
      if (countEl) countEl.textContent = `Showing ${visibleCount} Curated Works`;
      if (Masonry.layout) Masonry.layout();

      const noResults = document.getElementById('gallery-no-results');
      if (noResults) noResults.classList.toggle('hidden', visibleCount > 0);
    }
  };

  // --- VIEW DENSITY SWITCHER ---
  const LayoutSwitcher = {
    init() {
      const btns = document.querySelectorAll('.view-switcher-btn');
      const gallery = document.getElementById('portfolio-gallery');
      if (!btns || !gallery) return;

      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          btns.forEach(b => {
            b.classList.remove('bg-white', 'text-black', 'dark:bg-neutral-800', 'dark:text-white', 'shadow-sm');
            b.classList.add('text-neutral-400');
          });
          btn.classList.add('bg-white', 'text-black', 'dark:bg-neutral-800', 'dark:text-white', 'shadow-sm');
          btn.classList.remove('text-neutral-400');

          const view = btn.dataset.view;
          gallery.className = '';
          if (view === 'editorial') {
            gallery.className = 'grid grid-cols-1 md:grid-cols-2 gap-8';
          } else if (view === 'compact') {
            gallery.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3';
          } else {
            gallery.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5';
          }
          if (Masonry.layout) {
            Masonry.layout();
            setTimeout(Masonry.layout, 600); // again once card transitions settle
          }
        });
      });
    }
  };

  // --- BACK TO TOP ---
  const BackToTop = {
    init() {
      const btn = document.getElementById('back-to-top-btn');
      if (!btn) return;
      window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
          btn.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
          btn.classList.add('opacity-100', 'translate-y-0');
        } else {
          btn.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
          btn.classList.remove('opacity-100', 'translate-y-0');
        }
      }, { passive: true });

      btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  };

  // --- INITIALIZE EVERYTHING ON DOM READY ---
  function init() {
    GalleryRenderer.render();
    HeadlineRotator.init();
    ShutterSound.init();
    ThemeEngine.init();
    ExifModalManager.init();
    ZenMode.init();
    FilterEngine.init();
    LayoutSwitcher.init();
    BackToTop.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
