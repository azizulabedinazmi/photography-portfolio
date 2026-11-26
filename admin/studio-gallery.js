/* Admin Studio — Gallery tab: grid, filters, drag reorder, bulk actions, and the full editor. */
window.SG = (() => {
  'use strict';
  const { $, $$, esc, state, thumb, srcOf, slugify, change, toast, LIVE } = S;
  const view = { filter: 'all', query: '', selecting: false, selected: new Set(), editing: -1, editTitle: '' };
  const CATS = [['portraits', 'Portraits'], ['events', 'Events & Documentary'], ['nature', 'Nature & Details'], ['art', 'Digital Art']];

  function matches(x) {
    const f = view.filter;
    if (f === 'photos' && x.category === 'art') return false;
    if (f === 'art' && x.category !== 'art') return false;
    if (f === 'series' && !x.isSeries) return false;
    if (f === 'featured' && !x.featured) return false;
    if (f === 'hidden' && !x.hidden) return false;
    const q = view.query.trim().toLowerCase();
    return !q || [x.title, x.tags, x.alt, x.location, x.id].join(' ').toLowerCase().includes(q);
  }
  const setFlag = (x, k, on) => { if (on) x[k] = true; else delete x[k]; };

  function render() {
    $$('.filter').forEach((b) => b.className = 'filter px-2.5 py-1 rounded-md ' + (b.dataset.filter === view.filter ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'));
    $('#select-btn').textContent = view.selecting ? 'Done selecting' : 'Select';
    $('#bulkbar').classList.toggle('hidden', !view.selecting);
    $('#bulk-count').textContent = `${view.selected.size} selected`;
    const canDrag = !view.selecting && view.filter === 'all' && !view.query.trim();
    const cards = state.items.map((x, i) => [x, i]).filter(([x]) => matches(x));
    $('#grid').innerHTML = cards.length ? cards.map(([x, i]) => `
      <div class="card group relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 ${x.hidden ? 'opacity-50' : ''} ${view.selected.has(x.id) ? 'selected' : ''} ${canDrag ? 'cursor-grab' : ''}" data-i="${i}" draggable="${canDrag}">
        <button class="open block w-full aspect-square bg-black" data-i="${i}" title="${view.selecting ? 'Select' : 'Edit'}">
          <img src="${esc(thumb(x.src))}" alt="" loading="lazy" class="w-full h-full object-cover pointer-events-none" />
        </button>
        <span class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[10px] mono">${view.selecting ? (view.selected.has(x.id) ? '☑' : '☐') : '#' + (i + 1)}</span>
        ${view.selecting ? '' : `<div class="absolute top-1.5 right-1.5 flex gap-1">
          <button class="feat w-7 h-7 rounded-full ${x.featured ? 'bg-amber-500 text-black' : 'bg-black/60 text-white/70 hover:text-amber-400'} text-sm" data-i="${i}" title="${x.featured ? 'Featured (click to remove)' : 'Feature in homepage filmstrip'}">★</button>
          <button class="hide w-7 h-7 rounded-full ${x.hidden ? 'bg-red-500 text-white' : 'bg-black/60 text-white/70 hover:text-white'} text-xs" data-i="${i}" title="${x.hidden ? 'Hidden (click to show)' : 'Hide from site'}">${x.hidden ? '🚫' : '👁'}</button>
        </div>`}
        <div class="px-2 py-1.5">
          <div class="text-[12px] font-medium truncate">${esc(x.title)}</div>
          <div class="text-[10px] mono text-neutral-500 truncate">${esc(x.category)}${x.isSeries ? ` · series of ${(x.seriesExtra || []).length + 1}` : ''}${x.hidden ? ' · hidden' : ''}</div>
        </div>
      </div>`).join('') : '<div class="col-span-full py-12 text-center text-neutral-500">Nothing here.</div>';
  }

  $('#filters').addEventListener('click', (e) => { if (e.target.dataset.filter) { view.filter = e.target.dataset.filter; render(); } });
  $('#search').addEventListener('input', (e) => { view.query = e.target.value; render(); });
  $('#select-btn').addEventListener('click', () => { view.selecting = !view.selecting; if (!view.selecting) view.selected.clear(); render(); });

  $('#grid').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const i = Number(b.dataset.i), x = state.items[i];
    if (b.classList.contains('open') && view.selecting) {
      view.selected.has(x.id) ? view.selected.delete(x.id) : view.selected.add(x.id);
      render();
    } else if (b.classList.contains('open')) openEditor(i);
    else if (b.classList.contains('feat')) { setFlag(x, 'featured', !x.featured); change(`${x.featured ? 'feature' : 'unfeature'} ${x.title}`); render(); }
    else if (b.classList.contains('hide')) { setFlag(x, 'hidden', !x.hidden); change(`${x.hidden ? 'hide' : 'show'} ${x.title}`); render(); }
  });

  // Bulk actions on the selected photos.
  $('#bulkbar').addEventListener('click', (e) => {
    const act = e.target.dataset.bulk; if (!act) return;
    if (act === 'all') { state.items.filter(matches).forEach((x) => view.selected.add(x.id)); return render(); }
    if (act === 'none') { view.selected.clear(); return render(); }
    const picked = state.items.filter((x) => view.selected.has(x.id));
    if (!picked.length) return toast('Select some photos first.', 'warn');
    const n = picked.length;
    if (act === 'hide' || act === 'show') picked.forEach((x) => setFlag(x, 'hidden', act === 'hide'));
    if (act === 'feature' || act === 'unfeature') picked.forEach((x) => setFlag(x, 'featured', act === 'feature'));
    if (act === 'top') { const rest = state.items.filter((x) => !view.selected.has(x.id)); state.items.splice(0, state.items.length, ...picked, ...rest); }
    if (act === 'remove') {
      if (!confirm(`Remove ${n} photo(s) from the gallery?\n\nThe original files stay in R2. Tip: “Hide” keeps them in the list instead.`)) return;
      const rest = state.items.filter((x) => !view.selected.has(x.id));
      state.items.splice(0, state.items.length, ...rest);
      view.selected.clear();
    }
    change(`${act} ${n} photo(s)`);
    render();
  });

  // Drag & drop reorder.
  let dragFrom = -1;
  $('#grid').addEventListener('dragstart', (e) => { const c = e.target.closest('.card'); if (!c) return; dragFrom = Number(c.dataset.i); c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
  $('#grid').addEventListener('dragend', () => $$('.card').forEach((c) => c.classList.remove('dragging', 'drop-target')));
  $('#grid').addEventListener('dragover', (e) => { const c = e.target.closest('.card'); if (!c || dragFrom < 0) return; e.preventDefault(); $$('.card').forEach((k) => k.classList.toggle('drop-target', k === c)); });
  $('#grid').addEventListener('drop', (e) => {
    const c = e.target.closest('.card'); if (!c || dragFrom < 0) return;
    e.preventDefault();
    const to = Number(c.dataset.i);
    if (to !== dragFrom) { const [moved] = state.items.splice(dragFrom, 1); state.items.splice(to, 0, moved); change('reorder'); }
    dragFrom = -1; render();
  });

  // ---------- editor ----------
  const field = (label, k, x, attrs = '') => `<label class="block"><span class="text-xs text-neutral-400">${label}</span><input data-f="${k}" value="${esc(x[k] == null ? '' : x[k])}" class="ed inp mt-1" ${attrs} /></label>`;
  function editorHtml(x) {
    const extras = (x.seriesExtra || []).map(srcOf);
    const art = x.postId || x.replay || x.editDetails;
    const ed = x.editDetails || {};
    return `
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg">Edit</h3>
        <button id="drawer-close" class="btn">Close</button>
      </div>
      <img src="${esc(thumb(x.src, 1))}" alt="" class="w-full max-h-72 object-contain rounded-xl bg-black mb-4" />
      <div class="space-y-3 text-sm">
        ${field('Title', 'title', x)}
        ${field('Alt text for Google (who / what is in it; leave your own name out)', 'alt', x)}
        <label class="block"><span class="text-xs text-neutral-400">Category</span>
          <select data-f="category" class="ed inp mt-1">${CATS.map(([v, l]) => `<option value="${v}" ${x.category === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        ${field('Tags (comma separated)', 'tags', x)}
        ${field('Collection / series name', 'location', x)}
        <div class="flex gap-5 pt-1">
          <label class="flex items-center gap-2"><input type="checkbox" data-f="hidden" ${x.hidden ? 'checked' : ''} class="ed accent-amber-500" /> Hidden</label>
          <label class="flex items-center gap-2"><input type="checkbox" data-f="featured" ${x.featured ? 'checked' : ''} class="ed accent-amber-500" /> Featured</label>
        </div>

        <div class="pt-3 border-t border-neutral-800">
          <div class="flex items-center justify-between mb-2">
            <span class="font-semibold">Series photos <span class="text-neutral-500 font-normal">(${extras.length + 1} in total)</span></span>
            <label class="btn cursor-pointer">+ Add photos<input id="series-add" type="file" accept="image/jpeg,image/png,image/webp,image/tiff,image/heic" multiple class="hidden" /></label>
          </div>
          ${extras.length ? `<ul class="grid grid-cols-3 gap-2">${extras.map((s, j) => `
            <li class="relative rounded-lg overflow-hidden bg-black">
              <img src="${esc(thumb(s))}" alt="" class="w-full aspect-square object-cover" />
              <div class="absolute bottom-1 inset-x-1 flex justify-between gap-1">
                <button class="sx btn !px-2 !py-0.5" data-sx="left" data-j="${j}" title="Move earlier">←</button>
                <button class="sx btn !px-2 !py-0.5" data-sx="main" data-j="${j}" title="Make this the main photo">★</button>
                <button class="sx btn !px-2 !py-0.5" data-sx="remove" data-j="${j}" title="Remove from series">✕</button>
              </div>
            </li>`).join('')}</ul>` : '<p class="text-xs text-neutral-500">Add photos to turn this into a series (they open together in the lightbox and play on hover).</p>'}
        </div>

        ${art ? `<div class="pt-3 border-t border-neutral-800 text-xs text-neutral-400 space-y-1">
          <div class="font-semibold text-sm text-neutral-200">Digital art</div>
          ${x.replay ? `<div>Replay: ${x.replay.length} edit steps</div>` : '<div>No Replay steps</div>'}
          ${ed.canvas ? `<div>Canvas ${esc(ed.canvas)}${ed.made ? ' · made ' + esc(ed.made) : ''}</div>` : ''}
          ${ed.tools && ed.tools.length ? `<div>Tools: ${esc(ed.tools.join(', '))}</div>` : ''}
          ${x.postId ? `<div>Post ID ${esc(x.postId)} · refreshed by <code>npm run sync-art</code></div>` : ''}
        </div>` : ''}

        <details class="pt-3 border-t border-neutral-800">
          <summary class="cursor-pointer text-neutral-300">Advanced</summary>
          <div class="space-y-3 mt-3">
            ${field('ID (unique)', 'id', x)}
            ${field('Image path or URL', 'src', x)}
            ${field('Camera line (leave empty: read from the photo’s EXIF)', 'camera', x)}
          </div>
        </details>

        <div class="flex flex-wrap gap-2 pt-3 border-t border-neutral-800">
          <button id="ed-top" class="btn">Move to top</button>
          <button id="ed-dup" class="btn">Duplicate</button>
          <a id="ed-view" target="_blank" class="btn" href="/photo/${esc(slugify(x.title) || slugify(x.id))}/">View on site ↗</a>
          <button id="ed-delete" class="btn !bg-red-600/20 hover:!bg-red-600/40 text-red-300 ml-auto">Remove</button>
        </div>
        <p class="text-[11px] text-neutral-500">Changes stay here until you press “Save &amp; publish”. Removing keeps the original file in R2.</p>
      </div>`;
  }
  function openEditor(i) {
    view.editing = i;
    view.editTitle = state.items[i].title;
    $('#drawer').innerHTML = editorHtml(state.items[i]);
    $('#drawer').classList.remove('hidden');
    $('#drawer-bg').classList.remove('hidden');
  }
  function closeEditor() {
    $('#drawer').classList.add('hidden'); $('#drawer-bg').classList.add('hidden');
    view.editing = -1; render(); S.renderStats();
  }
  const current = () => state.items[view.editing];
  $('#drawer-bg').addEventListener('click', closeEditor);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && view.editing >= 0) closeEditor(); });

  function onField(el) {
    const x = current(); if (!x || !el.classList.contains('ed')) return;
    const f = el.dataset.f;
    if (el.type === 'checkbox') setFlag(x, f, el.checked);
    else if (f === 'id') {
      const v = el.value.trim();
      if (!v || state.items.some((o) => o !== x && o.id === v)) { el.style.borderColor = '#ef4444'; return; }
      el.style.borderColor = ''; x.id = v;
    } else x[f] = el.value;
    change(`edit ${view.editTitle}`);
  }
  $('#drawer').addEventListener('input', (e) => { if (e.target.type !== 'checkbox' && e.target.tagName !== 'SELECT') onField(e.target); });
  $('#drawer').addEventListener('change', (e) => { if (e.target.type === 'checkbox' || e.target.tagName === 'SELECT') onField(e.target); });

  function setExtras(x, list) {
    if (list.length) {
      x.seriesExtra = list;
      x.isSeries = true;
      x.seriesCount = list.length + 1;
      if (!x.seriesGroup) x.seriesGroup = 'data-group-' + (slugify(x.id) || 'series');
    } else {
      delete x.seriesExtra; delete x.seriesCount; delete x.seriesGroup;
      x.isSeries = false;
    }
  }
  $('#drawer').addEventListener('click', async (e) => {
    const x = current(); if (!x) return;
    const t = e.target;
    if (t.id === 'drawer-close') return closeEditor();
    if (t.id === 'ed-top') { state.items.splice(view.editing, 1); state.items.unshift(x); view.editing = 0; change(`move ${x.title} to top`); return toast('Moved to the top'); }
    if (t.id === 'ed-dup') {
      const copy = JSON.parse(JSON.stringify(x));
      copy.id = S.uniqueId(x.id + '-copy'); copy.title = x.title + ' (copy)'; copy.hidden = true;
      state.items.splice(view.editing + 1, 0, copy);
      change(`duplicate ${x.title}`);
      return toast('Duplicated (the copy starts hidden).');
    }
    if (t.id === 'ed-delete') {
      if (!confirm(`Remove “${x.title}” from the gallery?\n\nThe original file stays in R2. Tip: “Hidden” keeps it in the list instead.`)) return;
      state.items.splice(view.editing, 1); change(`remove ${x.title}`); return closeEditor();
    }
    if (t.classList.contains('sx')) {
      const list = (x.seriesExtra || []).map(srcOf), j = Number(t.dataset.j);
      if (t.dataset.sx === 'left') { if (j === 0) return; [list[j - 1], list[j]] = [list[j], list[j - 1]]; }
      if (t.dataset.sx === 'remove') list.splice(j, 1);
      if (t.dataset.sx === 'main') { const old = x.src; x.src = list[j]; list[j] = old; }
      setExtras(x, list);
      change(`edit series of ${view.editTitle}`);
      openEditor(view.editing);
    }
  });
  $('#drawer').addEventListener('change', async (e) => {
    if (e.target.id !== 'series-add') return;
    const x = current(); const files = [...e.target.files];
    if (!files.length) return;
    if (!LIVE) return toast('Preview mode: open the admin on the live site to upload.', 'warn');
    const list = (x.seriesExtra || []).map(srcOf);
    for (const f of files) {
      try {
        toast(`Uploading ${f.name}…`, 'warn', 60000);
        const src = await SA.uploadOriginal(f);
        if (src) list.push(src);
      } catch (err) { toast(`${f.name}: ${err.message}`, 'err', 7000); }
    }
    setExtras(x, list);
    change(`add photos to ${view.editTitle}`);
    toast('Added to the series. Press Save & publish.');
    openEditor(view.editing);
  });

  S.tabHooks.gallery = render;
  return { render, openEditor };
})();
