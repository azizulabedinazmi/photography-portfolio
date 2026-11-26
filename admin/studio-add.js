/* Admin Studio — Add tab (upload to R2, upload as a series, add by link), Drive & Photos tools,
 * login and start-up. */
window.SA = (() => {
  'use strict';
  const { $, esc, state, slugify, change, toast, save, LIVE } = S;
  const PHOTO = /\.(jpe?g|png|webp|tiff?|heic)$/i;
  const CATS = [['portraits', 'Portraits'], ['events', 'Events & Documentary'], ['nature', 'Nature & Details'], ['art', 'Digital Art']];
  const catOptions = (sel) => CATS.map(([v, l]) => `<option value="${v}" ${sel === v ? 'selected' : ''}>${l}</option>`).join('');

  // Sends one original straight from the browser to private R2 through a signed link.
  // Returns its gallery path (dist/assets/Photography/<name>), or null when skipped.
  async function uploadOriginal(file, onProgress = () => {}, overwrite = false) {
    const res = await fetch('/.netlify/functions/admin-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await S.token()) },
      body: JSON.stringify({ name: file.name, type: file.type, size: file.size, overwrite })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 409) {
      if (!confirm(`“${data.name}” is already in storage.\n\nOK = replace it with this file\nCancel = skip this photo`)) return null;
      return uploadOriginal(file, onProgress, true);
    }
    if (!res.ok) throw new Error(data.error || 'Could not get an upload link');
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', data.uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Storage refused the upload (' + xhr.status + ')')));
      xhr.onerror = () => reject(new Error('Upload blocked. Add the CORS rule to the R2 bucket (README → Admin Studio).'));
      xhr.send(file);
    });
    return data.src;
  }

  // ---------- Add tab ----------
  $('#tab-upload').innerHTML = `
    <div>
      <h2 class="text-xl font-bold">Add photos</h2>
      <p class="text-sm text-neutral-400">Full-size originals go straight to your private Cloudflare R2 storage (never GitHub). The site makes the web copies and reads the real camera EXIF itself, then publishes in 1–2 minutes.</p>
    </div>
    <label id="drop" class="drop-zone block border-2 border-dashed border-neutral-700 hover:border-amber-500 rounded-3xl p-10 text-center bg-neutral-900/60 cursor-pointer transition">
      <input id="file-input" type="file" accept="image/jpeg,image/png,image/webp,image/tiff,image/heic" multiple class="hidden" />
      <div class="text-4xl mb-3">📷</div>
      <div class="font-semibold">Drop photos here or click to choose</div>
      <div class="text-xs text-neutral-500 mt-1">JPG, PNG, WebP, TIFF or HEIC · up to 80 MB each</div>
    </label>
    <div id="queue" class="space-y-4"></div>
    <div id="upload-actions" class="hidden flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-sm">
      <div class="flex flex-wrap gap-4">
        <label class="flex items-center gap-2"><input id="up-top" type="checkbox" checked class="accent-amber-500" /> Put at the top of the gallery</label>
        <label class="flex items-center gap-2"><input id="up-series" type="checkbox" class="accent-amber-500" /> Upload as one series (first photo is the cover)</label>
      </div>
      <button id="upload-btn" class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold">Upload &amp; publish</button>
    </div>
    <details class="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
      <summary class="cursor-pointer font-semibold">Add by link (an image already online, e.g. a digital artwork)</summary>
      <p class="text-xs text-neutral-400 mt-2">The build copies linked images into your R2 storage and serves them from your site, so they keep working even if the original link changes.</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm">
        <input id="link-url" placeholder="https://… image link" class="inp sm:col-span-2" />
        <input id="link-title" placeholder="Title" class="inp" />
        <select id="link-cat" class="inp">${catOptions('art')}</select>
        <input id="link-alt" placeholder="Alt text: who / what is in it" class="inp sm:col-span-2" />
        <input id="link-tags" placeholder="Tags, comma separated" class="inp" />
        <button id="link-add" class="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold">Add to gallery</button>
      </div>
    </details>`;

  const queue = [];
  const drop = $('#drop');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); });
  $('#file-input').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });

  async function addFiles(files) {
    for (const file of files) {
      if (!PHOTO.test(file.name)) { toast(`${file.name}: not a photo file`, 'err'); continue; }
      const q = { file, title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim(), alt: '', category: 'portraits', tags: '', location: '', featured: false, status: 'ready', camera: '' };
      try {
        const ex = await exifr.parse(file, ['Make', 'Model', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'DateTimeOriginal']);
        if (ex) {
          const parts = [];
          if (ex.Model) parts.push(ex.Make && !ex.Model.includes(ex.Make) ? `${ex.Make} ${ex.Model}` : ex.Model);
          if (ex.FocalLength) parts.push(Math.round(ex.FocalLength) + 'mm');
          if (ex.FNumber) parts.push('f/' + ex.FNumber);
          if (ex.ExposureTime) parts.push(ex.ExposureTime < 1 ? `1/${Math.round(1 / ex.ExposureTime)}s` : ex.ExposureTime + 's');
          if (ex.ISO) parts.push('ISO ' + ex.ISO);
          q.camera = parts.join(' · ');
          if (ex.DateTimeOriginal) q.taken = new Date(ex.DateTimeOriginal).toLocaleDateString();
        }
      } catch (e) { /* no EXIF */ }
      q.preview = URL.createObjectURL(file);
      queue.push(q);
    }
    renderQueue();
  }
  function renderQueue() {
    const series = $('#up-series') && $('#up-series').checked;
    $('#upload-actions').classList.toggle('hidden', !queue.some((q) => q.status !== 'done'));
    $('#queue').innerHTML = queue.map((q, i) => {
      const extra = series && i > 0 && q.status !== 'done';
      return `
      <div class="grid grid-cols-[96px_1fr] sm:grid-cols-[140px_1fr] gap-4 p-4 rounded-2xl bg-neutral-900 border ${q.status === 'error' ? 'border-red-500/60' : q.status === 'done' ? 'border-emerald-600/60' : 'border-neutral-800'}">
        <img src="${q.preview}" alt="" class="w-full aspect-square object-cover rounded-xl bg-black" />
        <div class="space-y-2 text-sm min-w-0">
          <div class="flex items-center justify-between gap-2 text-xs mono text-neutral-500">
            <span class="truncate">${esc(q.file.name)} · ${(q.file.size / 1048576).toFixed(1)} MB${q.camera ? ' · ' + esc(q.camera) : ''}${q.taken ? ' · ' + esc(q.taken) : ''}</span>
            ${q.status === 'ready' || q.status === 'error' ? `<button class="q-remove text-neutral-400 hover:text-white" data-q="${i}">✕</button>` : ''}
          </div>
          ${q.status === 'done' ? `<div class="text-emerald-400">✓ ${esc(q.message || 'Uploaded and added')}</div>`
          : extra ? `<div class="text-neutral-400">Photo ${i + 1} of the series “${esc(queue[0].title)}”</div>` : `
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input data-q="${i}" data-k="title" value="${esc(q.title)}" placeholder="Title" class="q inp" />
            <select data-q="${i}" data-k="category" class="q inp">${catOptions(q.category)}</select>
            <input data-q="${i}" data-k="alt" value="${esc(q.alt)}" placeholder="Alt text: who / what is in it" class="q inp sm:col-span-2" />
            <input data-q="${i}" data-k="tags" value="${esc(q.tags)}" placeholder="Tags, comma separated" class="q inp" />
            <input data-q="${i}" data-k="location" value="${esc(q.location)}" placeholder="Collection / series (optional)" class="q inp" />
          </div>
          <label class="flex items-center gap-2 text-xs"><input type="checkbox" data-q="${i}" data-k="featured" ${q.featured ? 'checked' : ''} class="q accent-amber-500" /> Feature in filmstrip</label>`}
          ${q.status === 'error' ? `<div class="text-xs text-red-400">${esc(q.message)}</div>` : ''}
          ${q.status === 'uploading' ? `<div class="text-xs text-neutral-400">${esc(q.message || '')}</div><div class="h-1.5 rounded-full bg-neutral-800 overflow-hidden"><div class="h-full bg-amber-500" style="width:${q.progress || 0}%"></div></div>` : ''}
        </div>
      </div>`;
    }).join('');
  }
  const setQ = (el) => { if (el.classList.contains('q')) queue[el.dataset.q][el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; };
  $('#queue').addEventListener('input', (e) => setQ(e.target));
  $('#queue').addEventListener('change', (e) => setQ(e.target));
  $('#queue').addEventListener('click', (e) => { const b = e.target.closest('.q-remove'); if (b) { queue.splice(Number(b.dataset.q), 1); renderQueue(); } });
  $('#up-series').addEventListener('change', renderQueue);

  function newItem(q, src) {
    const item = { id: S.uniqueId('photo-' + (slugify(q.title) || Date.now())), src, title: q.title.trim(), alt: q.alt.trim() || q.title.trim(), category: q.category, tags: q.tags.trim(), location: q.location.trim(), camera: '', isSeries: false };
    if (q.featured) item.featured = true;
    return item;
  }
  function place(item) { if ($('#up-top').checked) state.items.unshift(item); else state.items.push(item); }

  $('#upload-btn').addEventListener('click', async () => {
    if (!LIVE) return toast('Preview mode: open the admin on the live site to upload.', 'warn');
    const todo = queue.filter((q) => q.status === 'ready' || q.status === 'error');
    if (!todo.length) return;
    const series = $('#up-series').checked && todo.length > 1;
    if ((series ? [todo[0]] : todo).some((q) => !q.title.trim())) return toast('Every photo needs a title.', 'err');
    const btn = $('#upload-btn'); btn.disabled = true; btn.textContent = 'Uploading…';
    const added = [], srcs = [];
    for (const q of todo) {
      q.status = 'uploading'; q.message = 'Uploading original to R2…'; q.progress = 0; renderQueue();
      try {
        const src = await uploadOriginal(q.file, (p) => { q.progress = p; renderQueue(); });
        if (!src) { q.status = 'error'; q.message = 'Skipped: a photo with this name already exists. Rename the file to add it as a new photo.'; renderQueue(); continue; }
        q.status = 'done';
        if (series) { srcs.push(src); q.message = 'Uploaded'; }
        else {
          const existing = state.items.find((x) => x.src === src);
          if (existing) Object.assign(existing, newItem(q, src), { id: existing.id }); else place(newItem(q, src));
          added.push(q.title.trim()); q.message = 'Uploaded and added: ' + q.title.trim();
        }
      } catch (e) { q.status = 'error'; q.message = e.message; }
      renderQueue();
    }
    if (series && srcs.length) {
      const item = newItem(todo[0], srcs[0]);
      if (srcs.length > 1) Object.assign(item, { isSeries: true, seriesExtra: srcs.slice(1), seriesCount: srcs.length, seriesGroup: 'data-group-' + slugify(item.id) });
      place(item);
      added.push(`${item.title} (series of ${srcs.length})`);
    }
    if (added.length) {
      change(`add ${added.join(', ')}`);
      await save(`Admin: add ${added.join(', ')}`.slice(0, 120));
    }
    btn.disabled = false; btn.textContent = 'Upload & publish';
  });

  $('#link-add').addEventListener('click', () => {
    const url = $('#link-url').value.trim(), title = $('#link-title').value.trim();
    if (!/^https:\/\/\S+$/i.test(url)) return toast('Paste a full https:// image link.', 'err');
    if (!title) return toast('Give it a title.', 'err');
    const q = { title, alt: $('#link-alt').value, category: $('#link-cat').value, tags: $('#link-tags').value, location: '' };
    place(newItem(q, url));
    change(`add ${title}`);
    ['#link-url', '#link-title', '#link-alt', '#link-tags'].forEach((s) => { $(s).value = ''; });
    toast('Added. Press Save & publish (the build copies the image into R2).');
  });

  // ---------- Drive & Google Photos ----------
  $('#tab-tools').innerHTML = `
    <div><h2 class="text-xl font-bold">Google Drive &amp; Google Photos</h2>
      <p class="text-sm text-neutral-400">Turn a Drive share link into a direct image link (usable in “Add by link”), or list the photos in a public Google Photos album.</p></div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
        <h3 class="font-semibold">Google Drive link → image link</h3>
        <input id="gdrive-input" placeholder="https://drive.google.com/file/d/1A2B3C.../view" class="inp mono text-sm" />
        <button id="gdrive-convert-btn" class="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold">Convert</button>
        <div id="gdrive-result" class="hidden space-y-2">
          <input id="gdrive-output" readonly class="inp mono text-xs text-emerald-400" />
          <div class="aspect-video rounded-xl overflow-hidden bg-black"><img id="gdrive-preview" alt="" class="w-full h-full object-contain" /></div>
        </div>
      </div>
      <div class="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
        <h3 class="font-semibold">Google Photos shared album</h3>
        <input id="gphotos-input" placeholder="https://photos.app.goo.gl/abcdefg12345" class="inp mono text-sm" />
        <button id="gphotos-sync-btn" class="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold">Fetch album photos</button>
        <div id="gphotos-results" class="hidden space-y-2">
          <div class="flex items-center justify-between text-xs text-neutral-400 mono"><span id="gphotos-count"></span><button id="gphotos-copy-all" class="text-rose-400 hover:underline">Copy as JSON</button></div>
          <div id="gphotos-grid" class="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto p-2 bg-black rounded-xl"></div>
        </div>
      </div>
    </div>`;
  $('#gdrive-convert-btn').addEventListener('click', () => {
    const m = $('#gdrive-input').value.trim().match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|gdrive:)?([a-zA-Z0-9_\-]{25,})/i);
    if (!m) return toast('Paste a valid Google Drive file link or ID.', 'err');
    const url = `https://lh3.googleusercontent.com/d/${m[1]}=w1600`;
    $('#gdrive-output').value = url; $('#gdrive-preview').src = url; $('#gdrive-result').classList.remove('hidden');
  });
  $('#gphotos-sync-btn').addEventListener('click', async () => {
    const url = $('#gphotos-input').value.trim();
    if (!url) return toast('Enter a Google Photos shared album URL', 'err');
    const btn = $('#gphotos-sync-btn'); btn.textContent = 'Fetching…'; btn.disabled = true;
    try {
      const data = await (await fetch(`/.netlify/functions/google-photos-album?albumUrl=${encodeURIComponent(url)}`)).json();
      if (!data.success || !data.photos.length) throw new Error('No photos found. Is the album link public?');
      $('#gphotos-count').textContent = `${data.photos.length} photos found`;
      $('#gphotos-grid').innerHTML = data.photos.map((p) => `<div class="aspect-square rounded-lg overflow-hidden bg-neutral-900"><img src="${esc(p.thumbnail)}" alt="" class="w-full h-full object-cover" /></div>`).join('');
      $('#gphotos-results').classList.remove('hidden');
      $('#gphotos-copy-all').onclick = () => navigator.clipboard.writeText(JSON.stringify(data.photos, null, 2)).then(() => toast('Copied'));
    } catch (e) { toast(e.message, 'err'); }
    finally { btn.textContent = 'Fetch album photos'; btn.disabled = false; }
  });

  // ---------- login & start ----------
  let started = false;
  async function start(user) {
    if (started) return;
    started = true;
    $('#gate').classList.add('hidden');
    $('#user-email').textContent = user ? user.email : '';
    try { await S.loadData(); } catch (e) { toast('Could not load the gallery: ' + e.message, 'err', 8000); }
    let tab = 'dashboard';
    try { tab = sessionStorage.getItem('studio_tab') || tab; } catch (e) {}
    S.showTab(tab);
    S.loadDashboard();
  }
  if (!LIVE) {
    $('#mode-badge').classList.remove('hidden');
    $('#logout-btn').classList.add('hidden');
    start(null);
  } else if (!window.netlifyIdentity) {
    $('#gate-msg').textContent = 'The login service could not load. Check your connection and reload.';
  } else {
    // The widget sets itself up when the page loads (and handles invite / password-reset links).
    const id = window.netlifyIdentity;
    id.on('init', (user) => { if (user) start(user); });
    id.on('login', (user) => { id.close(); start(user); });
    id.on('logout', () => location.reload());
    $('#login-btn').addEventListener('click', () => id.open('login'));
    $('#logout-btn').addEventListener('click', () => id.logout());
    if (document.readyState !== 'loading' && id.currentUser()) start(id.currentUser());
  }

  return { uploadOriginal };
})();
