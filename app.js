/* Olfactory Garden — single-page app. No build step; talks to the Apps Script API in config.js. */
(function () {
  'use strict';

  const CONFIG = window.GARDEN_CONFIG || {};
  // Local testing: open index.html?demo to use demo.json (gitignored) with in-memory writes.
  if (/[?&]demo\b/.test(location.search)) CONFIG.apiUrl = 'demo:demo.json';
  const STORE = { author: 'og.author', cache: 'og.cache' };
  const STAGES = ['No flowers', 'Buds', 'Opening', 'Full bloom', 'Fading'];
  const BLOOMING = ['Buds', 'Opening', 'Full bloom'];
  const SOURCES = ['Flowers', 'Leaves (crushed)', 'In the air', 'Fruit / peel'];
  const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const RECENT_DAYS = 14;

  const app = document.getElementById('app');
  let data = null;
  let heroMode = {}; // plantId → 'garden' | 'bloom'

  // ------------------------------------------------------------ storage (best effort)
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

  // ------------------------------------------------------------ API
  const isDemo = () => String(CONFIG.apiUrl || '').startsWith('demo:');

  async function apiGet() {
    if (isDemo()) {
      if (!data) {
        const res = await fetch(CONFIG.apiUrl.slice(5));
        const json = await res.json();
        return Object.assign({ journal: [], photos: [], stories: [], species: {} }, json);
      }
      return data;
    }
    const res = await fetch(CONFIG.apiUrl);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    return json;
  }

  async function apiPost(action, payload) {
    if (isDemo()) return demoWrite(action, payload);
    const body = JSON.stringify(Object.assign({ action }, payload));
    // text/plain avoids a CORS preflight, which Apps Script can't answer.
    const res = await fetch(CONFIG.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    return json;
  }

  function demoWrite(action, p) {
    const at = new Date().toISOString();
    if (action === 'journal') data.journal.push({ id: String(Math.random()), at, plantId: p.plantId, author: p.author, text: p.text, intensity: p.intensity, stage: p.stage, source: p.source });
    if (action === 'photo') data.photos.push({ at, plantId: p.plantId, type: p.type, caption: p.caption, author: p.author, url: p.dataUrl });
    if (action === 'story') data.stories.push({ at, speciesKey: p.speciesKey, title: p.title, region: p.region, text: p.text, source: p.source, author: p.author });
    return { ok: true, at };
  }

  async function load(force) {
    if (!force && !data) {
      const cached = store.get(STORE.cache);
      if (cached && !isDemo()) { try { data = JSON.parse(cached); route(); } catch (e) { /* ignore */ } }
    }
    try {
      data = await apiGet();
      if (!isDemo()) store.set(STORE.cache, JSON.stringify(data));
      route();
    } catch (err) {
      if (data) { toast('Offline: showing the last saved copy'); return; }
      app.innerHTML = '<div class="loading"><p>Couldn\'t reach the garden data.</p><p class="faint">' + esc(err.message) + '</p><button class="btn" id="retry">Try again</button></div>';
      document.getElementById('retry').onclick = () => load(true);
    }
  }

  // ------------------------------------------------------------ helpers
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const pad = (id) => String(id).padStart(3, '0');
  const plantById = (id) => data.plants.find((p) => p.id === String(id));
  const speciesOf = (p) => (data.species && data.species[p.speciesKey]) || {};
  const byNewest = (a, b) => (a.at < b.at ? 1 : -1);
  const journalFor = (id) => data.journal.filter((j) => j.plantId === String(id)).sort(byNewest);
  const photosFor = (id, type) => data.photos.filter((x) => x.plantId === String(id) && (!type || x.type === type)).sort(byNewest);
  const storiesFor = (p) => data.stories.filter((s) => s.speciesKey === p.speciesKey);
  const zoneShort = (z) => { const m = /Zone\s*\d+/i.exec(z || ''); return m ? m[0] : (z || 'Unzoned'); };
  const firstName = (s) => String(s || '').split('/')[0].trim();

  function photoSrc(ph, size) {
    if (!ph) return '';
    if (ph.fileId) return 'https://lh3.googleusercontent.com/d/' + ph.fileId + '=w' + (size || 1200);
    return ph.url;
  }
  function photoFallback(img, fileId) {
    // lh3 links occasionally refuse; Drive's thumbnail endpoint is the backup.
    if (fileId && !img.dataset.fb) { img.dataset.fb = '1'; img.src = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1200'; }
  }
  window.__ogFallback = photoFallback;

  function imgTag(ph, cls, size, alt) {
    const fb = ph && ph.fileId ? ' onerror="__ogFallback(this,\'' + esc(ph.fileId) + '\')"' : '';
    return '<img class="' + cls + '" src="' + esc(photoSrc(ph, size)) + '" alt="' + esc(alt || '') + '" loading="lazy"' + fb + '>';
  }

  function timeOfDay(d) {
    const h = d.getHours();
    if (h >= 5 && h < 8) return 'dawn';
    if (h >= 8 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 19) return 'dusk';
    if (h >= 19 && h < 23) return 'evening';
    return 'night';
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function fmtDate(iso, opts) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleString(undefined, Object.assign({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }, opts || {}));
  }
  function relTime(iso) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    const units = [[60, 'minute'], [3600, 'hour'], [86400, 'day'], [604800, 'week'], [2629800, 'month'], [31557600, 'year']];
    let u = units[0];
    for (const x of units) if (diff >= x[0]) u = x;
    const n = Math.floor(diff / u[0]);
    return n + ' ' + u[1] + (n === 1 ? '' : 's') + ' ago';
  }

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function topbar(right) {
    return '<header class="topbar"><a class="brand" href="#/">Olfactory Garden</a>' + (right || '') + '</header>';
  }

  // ------------------------------------------------------------ router
  function route() {
    if (!CONFIG.apiUrl) { app.innerHTML = '<div class="gate"><h1>Almost there</h1><p class="muted">Add the Apps Script URL to <code>config.js</code>. See README.md.</p></div>'; return; }
    if (!data) { app.innerHTML = '<div class="loading">Gathering the garden…</div>'; return; }
    const h = location.hash.replace(/^#\/?/, '');
    const m = /^p\/([^/?]+)/.exec(h);
    if (m) return renderPlant(decodeURIComponent(m[1]));
    if (h.startsWith('labels')) return renderLabels();
    return renderHome();
  }
  window.addEventListener('hashchange', () => { window.scrollTo(0, 0); route(); });

  // ------------------------------------------------------------ home
  let homeFilter = { q: '', zone: '' };

  function renderHome() {
    const zones = [...new Set(data.plants.map((p) => zoneShort(p.zone)))].sort();
    const since = Date.now() - RECENT_DAYS * 86400000;
    const recent = data.journal.filter((j) => new Date(j.at).getTime() >= since && (BLOOMING.includes(j.stage) || (j.intensity || 0) >= 3)).sort(byNewest);
    const seen = new Set();
    const nowCards = recent.filter((j) => !seen.has(j.plantId) && seen.add(j.plantId)).slice(0, 10).map((j) => {
      const p = plantById(j.plantId); if (!p) return '';
      return '<a class="now-card" href="#/p/' + esc(p.id) + '"><span class="faint">' + esc(relTime(j.at)) + ' · ' + esc(j.author || '') + '</span><strong>' + esc(firstName(p.name)) + '</strong><p>' + esc(j.text) + '</p></a>';
    }).join('');

    app.innerHTML =
      topbar('<a class="iconbtn" href="#/labels">QR labels</a>') +
      '<section class="hero-title"><h1>What\'s in the air</h1><p class="muted">' + data.plants.length + ' plants · ' + data.journal.length + ' scent note' + (data.journal.length === 1 ? '' : 's') + '</p></section>' +
      (nowCards ? '<div class="section-label">Smelling now · last ' + RECENT_DAYS + ' days</div><div class="now-strip">' + nowCards + '</div>' : '') +
      '<input class="search" id="q" type="search" placeholder="Search name, Thai name, scent…" value="' + esc(homeFilter.q) + '">' +
      '<div class="chips" role="group" aria-label="Zone">' +
      ['', ...zones].map((z) => '<button class="chip" data-zone="' + esc(z) + '" aria-pressed="' + (homeFilter.zone === z) + '">' + esc(z || 'All zones') + '</button>').join('') +
      '</div><div id="list"></div>';

    const q = document.getElementById('q');
    q.oninput = () => { homeFilter.q = q.value; renderList(); };
    app.querySelectorAll('[data-zone]').forEach((b) => b.onclick = () => {
      homeFilter.zone = b.dataset.zone;
      app.querySelectorAll('[data-zone]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      renderList();
    });
    renderList();
  }

  function renderList() {
    const q = homeFilter.q.trim().toLowerCase();
    const plants = data.plants.filter((p) => {
      if (homeFilter.zone && zoneShort(p.zone) !== homeFilter.zone) return false;
      if (!q) return true;
      const s = speciesOf(p);
      return [p.id, pad(p.id), p.name, p.thaiName, p.phonetic, p.botanical, p.scentProfile, s.family, s.notes].join(' ').toLowerCase().includes(q);
    });
    const groups = {};
    plants.forEach((p) => (groups[zoneShort(p.zone)] = groups[zoneShort(p.zone)] || []).push(p));
    const html = Object.keys(groups).sort().map((z) => {
      const full = groups[z][0].zone || z;
      return '<div class="section-label">' + esc(full.replace(/\s*or Zone.*$/, '')) + '</div><div class="plant-list">' + groups[z].map(plantCard).join('') + '</div>';
    }).join('');
    document.getElementById('list').innerHTML = html || '<p class="muted">No plants match.</p>';
  }

  function plantCard(p) {
    const garden = photosFor(p.id, 'Garden')[0];
    const s = speciesOf(p);
    let thumb;
    if (garden) thumb = imgTag(garden, 'thumb', 200, '');
    else if (s.bloomImage) thumb = '<img class="thumb" src="' + esc(s.bloomImage) + '" alt="" loading="lazy">';
    else thumb = '<div class="thumb placeholder">' + esc((p.name || '?').charAt(0)) + '</div>';
    const last = journalFor(p.id)[0];
    return '<a class="plant-card" href="#/p/' + esc(p.id) + '">' + thumb +
      '<div class="names"><div class="idtag">No. ' + pad(p.id) + '</div><h3>' + esc(p.name) + '</h3>' +
      '<div class="line2">' + esc(p.thaiName) + (p.phonetic ? ' · ' + esc(p.phonetic) : '') + '</div>' +
      '<div class="line2 faint">' + (last ? 'Last smelled ' + esc(relTime(last.at)) : '<span class="italic">' + esc(p.botanical) + '</span>') + '</div></div></a>';
  }

  // ------------------------------------------------------------ plant page
  function renderPlant(id) {
    const p = plantById(id);
    if (!p) { app.innerHTML = topbar() + '<p class="muted">No plant with ID ' + esc(id) + '. <a href="#/">Back to the garden</a></p>'; return; }
    const s = speciesOf(p);
    const journal = journalFor(p.id);
    const gardenPhotos = photosFor(p.id, 'Garden');
    const bloomPhotos = photosFor(p.id, 'Bloom');
    const stories = storiesFor(p);
    const sisters = data.plants.filter((x) => x.speciesKey === p.speciesKey && x.id !== p.id);
    const night = /night|dusk|evening/i.test(s.peakTime || '') || /night|dusk/i.test(p.scentProfile || '');

    // Hero: our own photo first; the bloom view prefers our bloom photo, then the online reference.
    const mode = heroMode[p.id] || (gardenPhotos.length ? 'garden' : 'bloom');
    const bloomShot = bloomPhotos[0] ? { html: imgTag(bloomPhotos[0], '', 1600, p.name + ' in bloom'), credit: 'Our garden · ' + fmtDate(bloomPhotos[0].at, { hour: undefined, minute: undefined, weekday: undefined }) }
      : s.bloomImage ? { html: '<img src="' + esc(s.bloomImage) + '" alt="' + esc(p.name) + ' in bloom">', credit: s.bloomCredit || 'Reference image' } : null;
    const gardenShot = gardenPhotos[0] ? { html: imgTag(gardenPhotos[0], '', 1600, p.name + ' in our garden'), credit: fmtDate(gardenPhotos[0].at, { hour: undefined, minute: undefined, weekday: undefined }) } : null;
    const shot = mode === 'garden' ? gardenShot : bloomShot;
    const heroEmpty = mode === 'garden' ? 'No garden photo yet.<br>Tap “Add photo” to show where it lives.' : 'No bloom image yet.';

    const facts = [
      ['Fragrance family', s.family], ['Scent notes', s.notes], ['Where the scent lives', s.source],
      ['Best time to smell', s.peakTime], ['Bloom season', s.season], ['Aroma molecules', s.molecules], ['Perfumery link', s.perfumery],
    ].filter((f) => f[1]);

    app.innerHTML =
      topbar('<a class="iconbtn" href="#/">All plants</a>') +
      '<div class="plant-hero">' + (shot ? shot.html : '<div class="empty">' + heroEmpty + '</div>') +
      '<div class="hero-toggle" role="group" aria-label="Image"><button data-hero="garden" aria-pressed="' + (mode === 'garden') + '">In our garden</button><button data-hero="bloom" aria-pressed="' + (mode === 'bloom') + '">In bloom</button></div>' +
      (shot && shot.credit ? '<div class="hero-credit">' + esc(shot.credit) + '</div>' : '') + '</div>' +

      '<section class="plant-head"><div class="idtag">No. ' + pad(p.id) + ' · ' + esc(zoneShort(p.zone)) + '</div>' +
      '<h1>' + esc(p.name) + '</h1>' +
      '<div class="thai">' + esc(p.thaiName) + (p.phonetic ? ' <span class="muted">· ' + esc(p.phonetic) + '</span>' : '') + '</div>' +
      '<div class="muted italic">' + esc(p.botanical) + '</div>' +
      '<div class="meta"><span class="pill">' + esc(p.zone) + '</span>' + (night ? '<span class="pill night">Night scent</span>' : '') + (s.safety ? '<span class="pill warn">Caution</span>' : '') + '</div></section>' +

      '<div class="actions"><button class="btn primary" id="log">Log a scent</button><button class="btn" id="photo">Add photo</button></div>' +

      '<section class="card"><h2>The scent</h2><p>' + esc(p.scentProfile) + '</p>' +
      (facts.length ? '<dl class="facts">' + facts.map((f) => '<div class="fact"><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>').join('') + '</dl>' : '') +
      (s.safety ? '<div class="facts"><div class="fact"><dt>Caution</dt><dd>' + esc(s.safety) + '</dd></div></div>' : '') + '</section>' +

      '<section class="card"><div class="row-between"><h2>Scent journal</h2><span class="faint">' + journal.length + ' note' + (journal.length === 1 ? '' : 's') + '</span></div>' +
      bloomCalendar(p) + timeline(journal) + '</section>' +

      '<section class="card"><div class="row-between"><h2>Stories</h2><button class="linkbtn" id="story">+ Add story</button></div>' +
      (stories.length ? stories.map(storyHtml).join('') : '<p class="muted">No stories yet. Add a myth, a ritual, a use or a memory from anywhere in the world.</p>') +
      (sisters.length ? '<p class="faint" style="margin-top:12px">Shared with sister plants ' + sisters.map((x) => '<a href="#/p/' + esc(x.id) + '">No. ' + pad(x.id) + '</a>').join(', ') + '.</p>' : '') + '</section>' +

      (gardenPhotos.length + bloomPhotos.length ? '<section class="card"><h2>Photos</h2><div class="gallery">' +
        photosFor(p.id).map((ph, i) => '<button data-photo="' + i + '">' + imgTag(ph, '', 400, ph.caption) + '</button>').join('') + '</div></section>' : '') +

      (p.visualId ? '<section class="card"><details><summary>How to recognise it</summary><p>' + esc(p.visualId) + '</p></details></section>' : '');

    app.querySelectorAll('[data-hero]').forEach((b) => b.onclick = () => { heroMode[p.id] = b.dataset.hero; renderPlant(p.id); });
    document.getElementById('log').onclick = () => openLog(p);
    document.getElementById('photo').onclick = () => openPhoto(p);
    document.getElementById('story').onclick = () => openStory(p);
    const all = photosFor(p.id);
    app.querySelectorAll('[data-photo]').forEach((b) => b.onclick = () => openLightbox(all[Number(b.dataset.photo)]));
  }

  function bloomCalendar(p) {
    const counts = new Array(12).fill(0);
    journalFor(p.id).forEach((j) => { if (BLOOMING.includes(j.stage)) counts[new Date(j.at).getMonth()]++; });
    if (!counts.some(Boolean)) return '';
    const max = Math.max(...counts);
    const nowM = new Date().getMonth();
    return '<div class="faint" style="margin-top:10px">Months we\'ve logged buds or flowers</div><div class="calendar">' +
      counts.map((c, i) => '<div><div class="cell' + (i === nowM ? ' now' : '') + '" data-level="' + (c ? Math.ceil((c / max) * 3) : 0) + '" title="' + c + ' bloom note' + (c === 1 ? '' : 's') + '"></div><div class="m">' + MONTHS[i] + '</div></div>').join('') +
      '</div>';
  }

  function timeline(entries) {
    if (!entries.length) return '<p class="muted">Nothing logged yet. Be the first to describe it.</p>';
    let lastMonth = '';
    return '<ol class="timeline">' + entries.map((j) => {
      const d = new Date(j.at);
      const month = d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
      const head = month !== lastMonth ? '<li class="month-head">' + esc(month) + '</li>' : '';
      lastMonth = month;
      const tod = timeOfDay(d);
      const tags = [cap(tod), j.stage, j.source].filter(Boolean).map((t) => '<span class="pill' + (t === cap(tod) && /night|evening/.test(tod) ? ' night' : '') + '">' + esc(t) + '</span>').join('');
      const dots = j.intensity ? '<span class="dots" title="Intensity ' + j.intensity + ' of 5">' + '●'.repeat(j.intensity) + '○'.repeat(5 - j.intensity) + '</span>' : '';
      return head + '<li class="entry tod-' + tod + '"><div class="when"><span class="who">' + esc(j.author || 'Guest') + '</span> · ' + esc(fmtDate(j.at)) + ' · ' + esc(relTime(j.at)) + '</div>' +
        '<p>' + esc(j.text) + '</p><div class="tags">' + dots + tags + '</div></li>';
    }).join('') + '</ol>';
  }

  function storyHtml(s) {
    return '<article class="story">' + (s.region ? '<div class="region">' + esc(s.region) + '</div>' : '') +
      (s.title ? '<h3>' + esc(s.title) + '</h3>' : '') + '<p>' + esc(s.text) + '</p>' +
      '<div class="src">' + [s.source && 'Source: ' + esc(s.source), s.author && 'Added by ' + esc(s.author)].filter(Boolean).join(' · ') + '</div></article>';
  }

  // ------------------------------------------------------------ dialogs
  function dialog(html) {
    const d = document.createElement('dialog');
    d.innerHTML = html;
    document.body.appendChild(d);
    d.addEventListener('close', () => d.remove());
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    d.querySelectorAll('[data-close]').forEach((b) => b.onclick = () => d.close());
    d.showModal();
    return d;
  }

  function authorPicker() {
    const current = store.get(STORE.author) || '';
    return '<label class="field">Your name<input id="author" maxlength="40" autocomplete="name" placeholder="Optional. Leave blank to post as Guest" value="' + esc(current) + '"></label>' +
      '<div class="seg">' + (CONFIG.authors || []).map((a) => '<button type="button" class="chip" data-author="' + esc(a) + '">' + esc(a) + '</button>').join('') + '</div>';
  }
  function chipGroup(name, options, multi) {
    return '<div class="seg" data-seg="' + name + '"' + (multi ? ' data-multi' : '') + '>' + options.map((o) => '<button type="button" class="chip" data-v="' + esc(o) + '" aria-pressed="false">' + esc(o) + '</button>').join('') + '</div>';
  }
  function wireChips(root) {
    root.querySelectorAll('[data-author]').forEach((c) => c.onclick = () => { root.querySelector('#author').value = c.dataset.author; });
    root.querySelectorAll('[data-seg]').forEach((seg) => seg.querySelectorAll('.chip').forEach((c) => c.onclick = () => {
      const on = c.getAttribute('aria-pressed') !== 'true';
      if (!seg.hasAttribute('data-multi')) seg.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      c.setAttribute('aria-pressed', String(on));
    }));
  }
  const chipValue = (root, name) => [...root.querySelectorAll('[data-seg="' + name + '"] .chip[aria-pressed="true"]')].map((c) => c.dataset.v).join(', ');

  async function submitWith(d, btn, fn) {
    const err = d.querySelector('.error');
    btn.disabled = true; err.textContent = '';
    const label = btn.textContent; btn.textContent = 'Saving…';
    try { await fn(); d.close(); await load(true); }
    catch (e) { err.textContent = e.message; btn.disabled = false; btn.textContent = label; }
  }

  function openLog(p) {
    const d = dialog(
      '<form class="sheet" method="dialog"><header><h2>' + esc(firstName(p.name)) + '</h2><button type="button" class="iconbtn" data-close>Cancel</button></header>' +
      '<div class="stamp" id="stamp"></div>' + authorPicker() +
      '<label class="field">What do you smell?<textarea id="text" required placeholder="e.g. Heavy honey and jasmine drifting across the lounge. Stronger near the water tank…"></textarea></label>' +
      '<div class="field"><span class="faint">Intensity</span>' + chipGroup('intensity', ['1', '2', '3', '4', '5']) + '</div>' +
      '<div class="field"><span class="faint">Bloom stage</span>' + chipGroup('stage', STAGES) + '</div>' +
      '<div class="field"><span class="faint">Scent coming from</span>' + chipGroup('source', SOURCES, true) + '</div>' +
      '<p class="error"></p><button class="btn primary" id="save">Save note</button></form>');
    wireChips(d);
    const stamp = d.querySelector('#stamp');
    const tick = () => { const n = new Date(); stamp.textContent = fmtDate(n.toISOString()) + ' · ' + cap(timeOfDay(n)) + ' (saved automatically)'; };
    tick(); const timer = setInterval(tick, 15000); d.addEventListener('close', () => clearInterval(timer));
    d.querySelector('#text').focus();
    d.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      const author = d.querySelector('#author').value.trim();
      store.set(STORE.author, author);
      submitWith(d, d.querySelector('#save'), () => apiPost('journal', {
        plantId: p.id, author, text: d.querySelector('#text').value,
        intensity: Number(chipValue(d, 'intensity')) || '', stage: chipValue(d, 'stage'), source: chipValue(d, 'source'),
      })).then(() => toast('Scent note saved'));
    };
  }

  function openPhoto(p) {
    const d = dialog(
      '<form class="sheet" method="dialog"><header><h2>Add a photo</h2><button type="button" class="iconbtn" data-close>Cancel</button></header>' +
      '<div class="field"><span class="faint">What does it show?</span><div class="seg" data-seg="type">' +
      '<button type="button" class="chip" data-v="Garden" aria-pressed="true">Where it lives</button><button type="button" class="chip" data-v="Bloom" aria-pressed="false">In bloom</button></div></div>' +
      '<label class="field">Photo<input id="file" type="file" accept="image/*" required></label><img class="preview hidden" id="pv" alt="">' +
      '<label class="field">Caption (optional)<input id="caption" maxlength="300"></label>' + authorPicker() +
      '<p class="error"></p><button class="btn primary" id="save">Upload</button></form>');
    wireChips(d);
    let dataUrl = '';
    d.querySelector('#file').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        dataUrl = await shrink(f, 1800, 0.84);
        const pv = d.querySelector('#pv'); pv.src = dataUrl; pv.classList.remove('hidden');
      } catch (err) { d.querySelector('.error').textContent = 'Could not read that image.'; }
    };
    d.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      if (!dataUrl) { d.querySelector('.error').textContent = 'Choose a photo first.'; return; }
      const type = chipValue(d, 'type') || 'Garden';
      const author = d.querySelector('#author').value.trim(); store.set(STORE.author, author);
      heroMode[p.id] = type === 'Bloom' ? 'bloom' : 'garden';
      submitWith(d, d.querySelector('#save'), () => apiPost('photo', { plantId: p.id, type, dataUrl, caption: d.querySelector('#caption').value, author }))
        .then(() => toast('Photo added'));
    };
  }

  function openStory(p) {
    const d = dialog(
      '<form class="sheet" method="dialog"><header><h2>Add a story</h2><button type="button" class="iconbtn" data-close>Cancel</button></header>' +
      '<p class="faint">Shared by every <span class="italic">' + esc(p.speciesKey) + '</span> in the garden.</p>' +
      '<label class="field">Title<input id="title" maxlength="160" placeholder="e.g. The tree on the moon"></label>' +
      '<label class="field">Region / culture<input id="region" maxlength="100" placeholder="e.g. China, Thailand, Ancient Egypt"></label>' +
      '<label class="field">The story<textarea id="text" required></textarea></label>' +
      '<label class="field">Source (book, link, who told you)<input id="source" maxlength="400"></label>' + authorPicker() +
      '<p class="error"></p><button class="btn primary" id="save">Save story</button></form>');
    wireChips(d);
    d.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      const author = d.querySelector('#author').value.trim(); store.set(STORE.author, author);
      submitWith(d, d.querySelector('#save'), () => apiPost('story', {
        speciesKey: p.speciesKey, title: d.querySelector('#title').value, region: d.querySelector('#region').value,
        text: d.querySelector('#text').value, source: d.querySelector('#source').value, author,
      })).then(() => toast('Story saved'));
    };
  }

  function openLightbox(ph) {
    dialog('<div class="lightbox">' + imgTag(ph, '', 2000, ph.caption) + '<div class="cap"><div class="row-between"><strong>' + esc(ph.type === 'Bloom' ? 'In bloom' : 'In our garden') + '</strong><button class="iconbtn" data-close>Close</button></div>' +
      (ph.caption ? '<p>' + esc(ph.caption) + '</p>' : '') + '<div class="faint">' + esc([ph.author, fmtDate(ph.at)].filter(Boolean).join(' · ')) + '</div></div></div>');
  }

  /** Downscale + re-encode to JPEG so uploads from phone cameras stay small. */
  function shrink(file, maxSide, quality) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  // ------------------------------------------------------------ QR labels
  function renderLabels() {
    const base = (CONFIG.publicUrl || (location.origin + location.pathname)).replace(/#.*$/, '');
    app.innerHTML = topbar('<a class="iconbtn" href="#/">All plants</a>') +
      '<section class="hero-title"><h1>QR labels</h1><p class="muted">Print, laminate and stake one beside each plant. Scanning opens that plant\'s page.</p></section>' +
      '<div class="labels-tools"><button class="btn primary" onclick="window.print()">Print labels</button><span class="faint">Links to ' + esc(base) + '</span></div>' +
      '<div class="labels">' + data.plants.map((p) => {
        const url = base + '#/p/' + encodeURIComponent(p.id);
        let svg = '';
        if (window.qrcode) { const qr = window.qrcode(0, 'M'); qr.addData(url); qr.make(); svg = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); }
        return '<div class="label">' + svg + '<div class="ln">' + esc(firstName(p.name)) + '</div><div class="lt">' + esc(firstName(p.thaiName)) + '</div><div class="li">No. ' + pad(p.id) + '</div></div>';
      }).join('') + '</div>';
  }

  // ------------------------------------------------------------ start
  route();
  if (CONFIG.apiUrl) load();
})();
