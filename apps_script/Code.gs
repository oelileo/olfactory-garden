/**
 * Olfactory Garden — Google Apps Script backend.
 *
 * Lives inside the "Master Plant Database & Box Catalogue" spreadsheet
 * (Extensions → Apps Script). It:
 *   - adds an "Olfactory Garden" menu (setup, bloom images)
 *   - creates the app tabs: Species, Scent Journal, Photos, Stories
 *   - serves a small JSON API that the garden web app (garden/index.html) talks to
 *
 * Wade's "Master Catalogue" tab is only ever READ — never rewritten.
 * Care columns (container, sunlight, soil, watering) stay in the sheet and are
 * never sent to the app: only the fields in PUBLIC_FIELDS leave the spreadsheet.
 *
 * The API is open (no passcode): anyone who scans a garden QR label can read
 * and add notes, photos and stories. Nothing can be edited or deleted through it.
 */

const CFG = {
  MASTER_SHEET: 'Master Catalogue',
  SPECIES_SHEET: 'Species',
  JOURNAL_SHEET: 'Scent Journal',
  PHOTOS_SHEET: 'Photos',
  STORIES_SHEET: 'Stories',
  PHOTO_FOLDER: 'Olfactory Garden Photos',
  MAX_PHOTO_BYTES: 8 * 1024 * 1024,

  // Master Catalogue header → app field. Headers are matched by prefix so
  // small wording edits by Wade ("Catalog ID / Tape #") don't break the app.
  PUBLIC_FIELDS: [
    ['Catalog ID', 'catalogId'],
    ['English Name', 'name'],
    ['Thai Name', 'thaiName'],
    ['Phonetic', 'phonetic'],
    ['Botanical Name', 'botanical'],
    ['Master Plan Zone', 'zone'],
    ['Visual Identification', 'visualId'],
    ['Scent / Flavor Profile', 'scentProfile'],
  ],
};

const HEADERS = {
  Species: [
    'Species Key', 'Common Name', 'Fragrance Family', 'Scent Notes', 'Where the Scent Lives',
    'Peak Scent Time', 'Bloom Season', 'Key Aroma Molecules', 'Perfumery Link', 'Safety Note',
    'Bloom Image URL', 'Bloom Image Credit',
  ],
  'Scent Journal': [
    'Timestamp', 'Plant ID', 'Plant', 'Author', 'What I Smell', 'Intensity (1-5)',
    'Bloom Stage', 'Scent Source', 'Entry ID',
  ],
  Photos: ['Timestamp', 'Plant ID', 'Plant', 'Type', 'Caption', 'Author', 'Drive File ID', 'Image URL'],
  Stories: ['Species Key', 'Title', 'Region / Culture', 'Story', 'Source', 'Added By', 'Timestamp'],
};

const SPECIES_FIELDS = {
  'Common Name': 'commonName',
  'Fragrance Family': 'family',
  'Scent Notes': 'notes',
  'Where the Scent Lives': 'source',
  'Peak Scent Time': 'peakTime',
  'Bloom Season': 'season',
  'Key Aroma Molecules': 'molecules',
  'Perfumery Link': 'perfumery',
  'Safety Note': 'safety',
  'Bloom Image URL': 'bloomImage',
  'Bloom Image Credit': 'bloomCredit',
};

// ---------------------------------------------------------------- menu & setup

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Olfactory Garden')
    .addItem('1. Set up / sync app tabs', 'setup')
    .addItem('Fetch missing bloom images (Wikipedia)', 'fetchBloomImages')
    .addToUi();
}

/** Creates app tabs, syncs one Species row per botanical species, seeds stories. Safe to re-run. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(HEADERS).forEach(function (name) { ensureSheet_(ss, name, HEADERS[name]); });

  const species = ss.getSheetByName(CFG.SPECIES_SHEET);
  const existing = readTable_(species).rows.map(function (r) { return r['Species Key']; });
  const seen = {};
  readPlants_().forEach(function (p) {
    if (!p.speciesKey || seen[p.speciesKey] || existing.indexOf(p.speciesKey) !== -1) return;
    seen[p.speciesKey] = true;
    const row = HEADERS.Species.map(function () { return ''; });
    row[0] = p.speciesKey;
    row[1] = p.name;
    species.appendRow(row);
  });

  if (typeof seedSpeciesAndStories_ === 'function') seedSpeciesAndStories_();
  fetchBloomImages();
  getPhotoFolder_();
  toast_('Garden tabs are ready.');
}

/**
 * Fills empty "Bloom Image URL" cells: Wikipedia's lead photo first (1200px), then iNaturalist's
 * default taxon photo. Paste your own URL into the cell any time to override; filled cells are skipped.
 */
function fetchBloomImages() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CFG.SPECIES_SHEET);
  if (!sheet) return;
  const t = readTable_(sheet);
  const urlCol = t.headers.indexOf('Bloom Image URL') + 1;
  const creditCol = t.headers.indexOf('Bloom Image Credit') + 1;
  t.rows.forEach(function (r, i) {
    if (r['Bloom Image URL'] || !r['Species Key']) return;
    const name = r['Species Key'].replace(/\s+spp\.?$/, '');
    Utilities.sleep(500); // Wikipedia rate-limits rapid bursts
    const found = wikipediaImage_(name) || inaturalistImage_(name);
    if (!found) { console.warn('No bloom image found for ' + name); return; }
    sheet.getRange(t.firstDataRow + i, urlCol).setValue(found.url);
    sheet.getRange(t.firstDataRow + i, creditCol).setValue(found.credit);
  });
}

function wikipediaImage_(name) {
  const j = fetchJson_('https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail' +
    '&pithumbsize=1200&redirects=1&format=json&titles=' + encodeURIComponent(name));
  const pages = j && j.query && j.query.pages;
  if (!pages) return null;
  const page = pages[Object.keys(pages)[0]];
  const src = page && page.thumbnail && page.thumbnail.source;
  // Some species articles lead with a distribution map rather than a photo.
  if (!src || /map|range|distribution|\.svg/i.test(decodeURIComponent(src))) return null;
  return { url: src, credit: 'Wikipedia — ' + page.title };
}

function inaturalistImage_(name) {
  const j = fetchJson_('https://api.inaturalist.org/v1/taxa?rank=species,variety,genus&per_page=1&q=' + encodeURIComponent(name));
  const taxon = j && j.results && j.results[0];
  const photo = taxon && taxon.default_photo;
  if (!photo || !photo.medium_url) return null;
  return { url: photo.medium_url.replace('/medium.', '/large.'), credit: 'iNaturalist — ' + (photo.attribution || taxon.name) };
}

function fetchJson_(url) {
  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'User-Agent': 'OlfactoryGarden/1.0 (Apps Script)' } });
    return res.getResponseCode() === 200 ? JSON.parse(res.getContentText()) : null;
  } catch (err) {
    console.warn('Fetch failed: ' + url + ' — ' + err);
    return null;
  }
}

// ---------------------------------------------------------------- web API

function doGet(e) {
  return respond_(function () {
    return getAllData_();
  });
}

function doPost(e) {
  return respond_(function () {
    const body = JSON.parse(e.postData.contents || '{}');
    const handlers = { journal: addJournal_, photo: addPhoto_, story: addStory_ };
    const fn = handlers[body.action];
    if (!fn) throw new Error('Unknown action: ' + body.action);
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try { return fn(body); } finally { lock.releaseLock(); }
  });
}

function getAllData_() {
  const ss = SpreadsheetApp.getActive();
  const species = {};
  readTable_(ss.getSheetByName(CFG.SPECIES_SHEET)).rows.forEach(function (r) {
    if (!r['Species Key']) return;
    const s = {};
    Object.keys(SPECIES_FIELDS).forEach(function (h) { s[SPECIES_FIELDS[h]] = r[h] || ''; });
    species[r['Species Key']] = s;
  });

  const journal = readTable_(ss.getSheetByName(CFG.JOURNAL_SHEET), true).rows.map(function (r) {
    return {
      id: r['Entry ID'], at: iso_(r['Timestamp']), plantId: String(r['Plant ID']), author: r['Author'],
      text: r['What I Smell'], intensity: Number(r['Intensity (1-5)']) || null,
      stage: r['Bloom Stage'], source: r['Scent Source'],
    };
  });

  const photos = readTable_(ss.getSheetByName(CFG.PHOTOS_SHEET), true).rows.map(function (r) {
    return {
      at: iso_(r['Timestamp']), plantId: String(r['Plant ID']), type: r['Type'], caption: r['Caption'],
      author: r['Author'], fileId: r['Drive File ID'], url: r['Image URL'],
    };
  });

  const stories = readTable_(ss.getSheetByName(CFG.STORIES_SHEET), true).rows
    .filter(function (r) { return r['Species Key'] && r['Story']; })
    .map(function (r) {
      return {
        speciesKey: r['Species Key'], title: r['Title'], region: r['Region / Culture'],
        text: r['Story'], source: r['Source'], author: r['Added By'], at: iso_(r['Timestamp']),
      };
    });

  return { plants: readPlants_(), species: species, journal: journal, photos: photos, stories: stories, now: new Date().toISOString() };
}

function addJournal_(b) {
  const plant = findPlant_(b.plantId);
  if (!String(b.text || '').trim()) throw new Error('Describe what you smell.');
  const id = Utilities.getUuid();
  const now = new Date();
  sheet_(CFG.JOURNAL_SHEET).appendRow([
    now, plant.id, plant.name, author_(b.author), clean_(b.text, 4000),
    b.intensity ? Math.max(1, Math.min(5, Number(b.intensity))) : '',
    clean_(b.stage, 40), clean_(b.source, 40), id,
  ]);
  return { id: id, at: now.toISOString() };
}

function addPhoto_(b) {
  const plant = findPlant_(b.plantId);
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(b.dataUrl || '');
  if (!m) throw new Error('Expected a JPEG, PNG or WebP image.');
  const bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > CFG.MAX_PHOTO_BYTES) throw new Error('Photo is too large.');
  const type = b.type === 'Bloom' ? 'Bloom' : 'Garden';
  const now = new Date();
  const stamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
  const ext = m[1].split('/')[1].replace('jpeg', 'jpg');
  const file = getPhotoFolder_().createFile(
    Utilities.newBlob(bytes, m[1], plant.id + '_' + type.toLowerCase() + '_' + stamp + '.' + ext));
  // Link-only sharing so the web app can display the image; the folder itself stays private.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const url = 'https://lh3.googleusercontent.com/d/' + file.getId();
  sheet_(CFG.PHOTOS_SHEET).appendRow([now, plant.id, plant.name, type, clean_(b.caption, 500), author_(b.author), file.getId(), url]);
  return { fileId: file.getId(), url: url, at: now.toISOString() };
}

function addStory_(b) {
  if (!b.speciesKey || !String(b.text || '').trim()) throw new Error('A story needs a species and some text.');
  const now = new Date();
  sheet_(CFG.STORIES_SHEET).appendRow([
    clean_(b.speciesKey, 120), clean_(b.title, 200), clean_(b.region, 120), clean_(b.text, 8000),
    clean_(b.source, 500), author_(b.author), now,
  ]);
  return { at: now.toISOString() };
}

// ---------------------------------------------------------------- helpers

/** Reads Wade's Master Catalogue. Header row is found by locating "Catalog ID". */
function readPlants_() {
  const values = sheet_(CFG.MASTER_SHEET).getDataRange().getDisplayValues();
  let headerRow = -1, idCol = -1;
  for (let r = 0; r < values.length && headerRow < 0; r++) {
    for (let c = 0; c < values[r].length; c++) {
      if (String(values[r][c]).trim().indexOf('Catalog ID') === 0) { headerRow = r; idCol = c; break; }
    }
  }
  if (headerRow < 0) throw new Error('Could not find the "Catalog ID" header in ' + CFG.MASTER_SHEET);

  const headers = values[headerRow].map(function (h) { return String(h).trim(); });
  const colFor = {};
  CFG.PUBLIC_FIELDS.forEach(function (pair) {
    const idx = headers.findIndex(function (h) { return h.indexOf(pair[0]) === 0; });
    if (idx >= 0) colFor[pair[1]] = idx;
  });

  const plants = [];
  for (let r = headerRow + 1; r < values.length; r++) {
    const rawId = String(values[r][idCol]).trim();
    const id = plantIdFrom_(rawId);
    if (!id) continue;
    const p = { id: id };
    Object.keys(colFor).forEach(function (k) { p[k] = String(values[r][colFor[k]]).trim(); });
    p.speciesKey = speciesKey_(p.botanical);
    plants.push(p);
  }
  return plants;
}

/** "021 (Box 21)" → "21", "7" → "7". Used in QR codes, so it must stay stable. */
function plantIdFrom_(raw) {
  const m = /^0*(\d+)/.exec(raw);
  return m ? m[1] : '';
}

/** "Murraya paniculata 'Minima' (or 'Microphylla')" → "Murraya paniculata". Groups sister plants for stories. */
function speciesKey_(botanical) {
  const s = String(botanical || '').replace(/\(.*?\)/g, '').replace(/'[^']*'/g, '').replace(/\s+/g, ' ').trim();
  const words = s.split(' ');
  return words.slice(0, 2).join(' ');
}

function findPlant_(id) {
  const p = readPlants_().filter(function (x) { return x.id === String(id); })[0];
  if (!p) throw new Error('No plant with ID ' + id);
  return p;
}

function readTable_(sheet, rawValues) {
  if (!sheet || sheet.getLastRow() < 1) return { headers: [], rows: [], firstDataRow: 2 };
  const values = rawValues ? sheet.getDataRange().getValues() : sheet.getDataRange().getDisplayValues();
  const headers = values[0].map(function (h) { return String(h).trim(); });
  const rows = values.slice(1).map(function (v) {
    const o = {};
    headers.forEach(function (h, i) { o[h] = typeof v[i] === 'string' ? v[i].trim() : v[i]; });
    return o;
  });
  return { headers: headers, rows: rows, firstDataRow: 2 };
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#e8efe6');
    sh.setFrozenRows(1);
  } else {
    // Append any new columns added in later versions without disturbing existing ones.
    const have = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    headers.forEach(function (h) {
      if (have.indexOf(h) === -1) {
        sh.getRange(1, sh.getLastColumn() + 1).setValue(h).setFontWeight('bold').setBackground('#e8efe6');
      }
    });
  }
  return sh;
}

function getPhotoFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PHOTO_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* recreated below */ } }
  const parents = DriveApp.getFileById(SpreadsheetApp.getActive().getId()).getParents();
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const existing = parent.getFoldersByName(CFG.PHOTO_FOLDER);
  const folder = existing.hasNext() ? existing.next() : parent.createFolder(CFG.PHOTO_FOLDER);
  props.setProperty('PHOTO_FOLDER_ID', folder.getId());
  return folder;
}

function respond_(fn) {
  let out;
  try { out = Object.assign({ ok: true }, fn()); } catch (err) { out = { ok: false, error: String(err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('Missing tab "' + name + '". Run Olfactory Garden → Set up.');
  return sh;
}

function author_(v) { return clean_(v, 40) || 'Guest'; }
function clean_(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }
function iso_(v) { return v instanceof Date ? v.toISOString() : (v ? String(v) : ''); }
function toast_(msg) { SpreadsheetApp.getActive().toast(msg, 'Olfactory Garden', 8); }
