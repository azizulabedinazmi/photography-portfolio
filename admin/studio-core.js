/* Admin Studio — core: helpers, loading/saving the gallery, tabs, dashboard, version history.
 * Saving needs the live site (Netlify Identity + Git Gateway). Anywhere else the Studio opens
 * read-only with the local data (handy for `npm run preview`). */
window.S = (() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DATA_PATH = 'dist/gallery-data.json';
  const LIVE = /(^|\.)azmi\.is-cool\.dev$|\.netlify\.app$/.test(location.hostname);
  const VARIANTS = window.IMAGE_VARIANTS || {};
  const state = { raw: null, items: [], saved: '[]', sha: null, changes: [], info: null };

  function toast(msg, kind = 'ok', ms = 3500) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl text-sm shadow-2xl max-w-[90vw] ' +
      (kind === 'err' ? 'bg-red-600 text-white' : kind === 'warn' ? 'bg-amber-500 text-black' : 'bg-emerald-600 text-white');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.add('hidden'), ms);
  }
  const slugify = (t) => String(t || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const srcOf = (s) => (typeof s === 'string' ? s : (s && s.image) || '');
  function thumb(src, size = 0) {
    src = srcOf(src);
    const v = VARIANTS[src] || VARIANTS[src.replace(/^\.?\//, '')];
    if (v) return '/' + encodeURI(v.srcset[Math.min(size, v.srcset.length - 1)][0]);
    if (/^https?:/i.test(src)) return src;
    return '/' + encodeURI(src.replace(/^\.?\//, ''));
  }
  const ago = (iso) => {
    const s = Math.round((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return Math.round(s / 86400) + ' days ago';
  };
  // UTF-8 safe base64 for the GitHub API.
  const toB64 = (str) => { const b = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
  const fromB64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));
  function uniqueId(base) {
    const ids = new Set(state.items.map((x) => x.id));
    let id = base, n = 2;
    while (ids.has(id)) id = `${base}-${n++}`;
    return id;
  }

  async function token() {
    const u = window.netlifyIdentity && netlifyIdentity.currentUser();
    if (!u) throw new Error('Not logged in');
    return u.jwt();
  }
  async function gateway(path, init = {}) {
    const res = await fetch('/.netlify/git/github/' + path, {
      ...init, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await token()), ...(init.headers || {}) }
    });
    if (!res.ok) { const e = new Error(`GitHub request failed (${res.status})`); e.status = res.status; throw e; }
    return res.json();
  }

  // ---------- data ----------
  async function loadData() {
    if (LIVE) {
      const file = await gateway(`contents/${DATA_PATH}?ref=main`); // newest version, not the published copy
      state.sha = file.sha;
      state.raw = JSON.parse(fromB64(file.content));
    } else {
      state.raw = await (await fetch('/' + DATA_PATH, { cache: 'no-store' })).json();
    }
    state.items = Array.isArray(state.raw) ? state.raw : state.raw.items || [];
    state.saved = JSON.stringify(state.items);
    state.changes = [];
    updateSaveBar();
  }
  const dirty = () => JSON.stringify(state.items) !== state.saved;
  function change(label) { state.changes.push(label); updateSaveBar(); }
  function updateSaveBar() {
    $('#savebar').classList.toggle('hidden', !dirty());
    const uniq = [...new Set(state.changes)];
    $('#savebar-count').textContent = uniq.length || 1;
    $('#savebar-list').textContent = uniq.slice(-4).join(' · ') + (uniq.length > 4 ? ' …' : '');
  }
  async function save(message) {
    if (!LIVE) { toast('Preview mode: open the admin on the live site to save.', 'warn'); return false; }
    const btn = $('#save-btn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const out = Array.isArray(state.raw) ? state.items : { ...state.raw, items: state.items };
      const uniq = [...new Set(state.changes)];
      const res = await gateway(`contents/${DATA_PATH}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: message || `Admin: ${uniq.slice(0, 6).join(', ') || 'update gallery'}`,
          content: toB64(JSON.stringify(out, null, 2) + '\n'),
          sha: state.sha,
          branch: 'main'
        })
      });
      state.sha = res.content.sha;
      state.saved = JSON.stringify(state.items);
      state.changes = [];
      updateSaveBar();
      toast('Saved. The site is rebuilding and will be live in 1–2 minutes.');
      setTimeout(loadDashboard, 4000);
      return true;
    } catch (e) {
      toast(e.status === 409 ? 'The gallery changed elsewhere since you opened it. Reload and try again.' : 'Save failed: ' + e.message, 'err', 7000);
      return false;
    } finally {
      btn.disabled = false; btn.textContent = 'Save & publish';
    }
  }

  // ---------- tabs ----------
  const tabHooks = {};
  function showTab(name) {
    $$('.tab').forEach((b) => b.className = 'tab px-3 py-1.5 rounded-lg ' + (b.dataset.tab === name ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'));
    $$('.tab-panel').forEach((p) => p.classList.toggle('hidden', p.id !== 'tab-' + name));
    try { sessionStorage.setItem('studio_tab', name); } catch (e) {}
    if (tabHooks[name]) tabHooks[name]();
  }
  $$('.tab').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

  // ---------- dashboard ----------
  async function loadDashboard() {
    let info = null;
    try { info = await (await fetch('/admin/build-info.json', { cache: 'no-store' })).json(); } catch (e) {}
    state.info = info;
    const status = $('#deploy-status'), detail = $('#deploy-detail');
    if (!info) { status.textContent = 'No build report yet'; detail.textContent = 'It appears after the next deploy.'; }
    else {
      const live = info.commit ? info.commit.slice(0, 7) : 'local build';
      status.innerHTML = `<span class="text-emerald-400">●</span> Live, built ${esc(ago(info.builtAt))}`;
      detail.textContent = `Version ${live} · ${new Date(info.builtAt).toLocaleString()}`;
      if (LIVE && info.commit) {
        try {
          const br = await gateway('branches/main');
          const latest = br.commit.sha, when = br.commit.commit.author.date;
          if (latest !== info.commit) {
            const mins = (Date.now() - new Date(when)) / 60000;
            status.innerHTML = mins > 10
              ? `<span class="text-red-400">●</span> Latest change isn’t live after ${Math.round(mins)} min`
              : '<span class="text-amber-400">●</span> Publishing your latest change…';
            detail.textContent = `GitHub has ${latest.slice(0, 7)} (${ago(when)}), live is ${live}.` + (mins > 10 ? ' Check Netlify deploys for an error.' : ' This updates by itself.');
            if (mins <= 10) setTimeout(loadDashboard, 20000);
          }
        } catch (e) { /* the GitHub check is a bonus */ }
      }
    }
    renderStats();
    renderWarnings();
  }
  function renderStats() {
    const it = state.items, shown = it.filter((x) => !x.hidden);
    const c = state.info ? state.info.counts : {};
    const cards = [
      ['Shown', shown.length], ['Hidden', it.length - shown.length], ['Featured', shown.filter((x) => x.featured).length],
      ['Photos', shown.filter((x) => x.category !== 'art').length], ['Digital art', shown.filter((x) => x.category === 'art').length],
      ['Originals in R2', c.originalsInStorage != null ? c.originalsInStorage : '—']
    ];
    $('#stats').innerHTML = cards.map(([k, v]) => `<div class="p-4 rounded-2xl bg-neutral-900 border border-neutral-800"><div class="text-2xl font-bold">${esc(v)}</div><div class="text-[11px] mono uppercase tracking-wider text-neutral-500 mt-1">${esc(k)}</div></div>`).join('');
  }
  function renderWarnings(extra = []) {
    const list = [];
    if (state.info) list.push(...state.info.warnings.filter((w) => !/^No alt text/.test(w.message)));
    if (state.info && state.info.unusedOriginals && state.info.unusedOriginals.length)
      list.push({ level: 'info', message: `${state.info.unusedOriginals.length} photo(s) in R2 aren’t used in the gallery: ${state.info.unusedOriginals.slice(0, 5).join(', ')}${state.info.unusedOriginals.length > 5 ? '…' : ''}` });
    state.items.forEach((x) => { if (!x.hidden && !String(x.alt || '').trim()) list.push({ level: 'warn', id: x.id, title: x.title, message: 'No alt text (helps Google find the photo by who/what is in it)' }); });
    list.push(...extra);
    const color = { error: 'text-red-300 bg-red-500/10', warn: 'text-amber-200 bg-amber-500/10', info: 'text-neutral-300 bg-neutral-800' };
    $('#warnings').innerHTML = list.length
      ? list.map((w) => `<li class="px-3 py-2 rounded-lg ${color[w.level] || color.info}">${w.title ? `<button class="underline underline-offset-2 font-medium" data-edit-id="${esc(w.id)}">${esc(w.title)}</button>: ` : ''}${esc(w.message)}</li>`).join('')
      : '<li class="text-emerald-400">✓ Everything looks good.</li>';
  }
  $('#warnings').addEventListener('click', (e) => {
    const id = e.target.dataset.editId;
    const i = id ? state.items.findIndex((x) => x.id === id) : -1;
    if (i >= 0) { showTab('gallery'); window.SG && SG.openEditor(i); }
  });
  $('#check-images-btn').addEventListener('click', async () => {
    const btn = $('#check-images-btn');
    btn.disabled = true;
    const srcs = state.items.filter((x) => !x.hidden).flatMap((x) => [x.src, ...(x.seriesExtra || [])].map((s) => ({ s: srcOf(s), x })));
    let done = 0; const broken = [];
    await Promise.all(srcs.map(({ s, x }) => new Promise((res) => {
      const im = new Image();
      im.onload = () => { done++; btn.textContent = `Checking ${done}/${srcs.length}…`; res(); };
      im.onerror = () => { done++; broken.push({ level: 'error', id: x.id, title: x.title, message: 'Image does not load: ' + s.split('/').pop().slice(0, 60) }); res(); };
      im.src = thumb(s);
    })));
    btn.disabled = false; btn.textContent = 'Check every image loads';
    renderWarnings(broken);
    toast(broken.length ? `${broken.length} image(s) failed to load` : `All ${srcs.length} images load`, broken.length ? 'err' : 'ok');
  });

  // ---------- version history ----------
  const historyEl = $('#tab-history');
  async function loadHistory() {
    historyEl.innerHTML = `<div><h2 class="text-xl font-bold">History</h2><p class="text-sm text-neutral-400">Every save is a version of the gallery. Open an older one to bring it back: it loads as unsaved changes, so you can look first, then Save &amp; publish (or Discard).</p></div><ul id="history-list" class="space-y-2"><li class="text-neutral-500 text-sm">Loading…</li></ul>`;
    if (!LIVE) { $('#history-list').innerHTML = '<li class="text-neutral-500 text-sm">History needs the live site.</li>'; return; }
    try {
      const commits = await gateway(`commits?path=${encodeURIComponent(DATA_PATH)}&sha=main&per_page=30`);
      $('#history-list').innerHTML = commits.map((c, i) => `
        <li class="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-neutral-900 border border-neutral-800">
          <div class="min-w-0">
            <div class="text-sm truncate">${esc(c.commit.message.split('\n')[0])}</div>
            <div class="text-[11px] mono text-neutral-500">${esc(new Date(c.commit.author.date).toLocaleString())} · ${esc(ago(c.commit.author.date))} · ${esc(c.sha.slice(0, 7))}${i === 0 ? ' · current' : ''}</div>
          </div>
          ${i === 0 ? '' : `<button class="btn" data-restore="${esc(c.sha)}" data-when="${esc(new Date(c.commit.author.date).toLocaleDateString())}">Bring back this version</button>`}
        </li>`).join('') || '<li class="text-neutral-500 text-sm">No history found.</li>';
    } catch (e) {
      $('#history-list').innerHTML = `<li class="text-red-300 text-sm">Could not load history (${esc(e.message)}).</li>`;
    }
  }
  historyEl.addEventListener('click', async (e) => {
    const sha = e.target.dataset.restore;
    if (!sha) return;
    if (dirty() && !confirm('You have unsaved changes. Replace them with this older version?')) return;
    try {
      const file = await gateway(`contents/${DATA_PATH}?ref=${sha}`);
      const raw = JSON.parse(fromB64(file.content));
      const items = Array.isArray(raw) ? raw : raw.items || [];
      state.items.splice(0, state.items.length, ...items);
      state.changes = [];
      change(`restore version from ${e.target.dataset.when}`);
      toast(`Loaded the version from ${e.target.dataset.when}. Check it in Gallery, then Save & publish.`, 'warn', 6000);
      showTab('gallery');
    } catch (err) { toast('Could not load that version: ' + err.message, 'err'); }
  });
  tabHooks.history = loadHistory;

  // ---------- save bar ----------
  $('#save-btn').addEventListener('click', () => save());
  $('#discard-btn').addEventListener('click', () => {
    if (!confirm('Discard all unsaved changes?')) return;
    state.items.splice(0, state.items.length, ...JSON.parse(state.saved));
    state.changes = [];
    updateSaveBar();
    if (window.SG) SG.render();
    renderStats();
  });
  window.addEventListener('beforeunload', (e) => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });

  return { $, $$, esc, LIVE, VARIANTS, state, toast, slugify, srcOf, thumb, ago, uniqueId, token, gateway, loadData, change, updateSaveBar, save, showTab, tabHooks, loadDashboard, renderStats };
})();
