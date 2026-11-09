// Nihongo Tracker — local server (no dependencies, Node 18+).
// - Serves the UI from ./public
// - Persists your data to ./data/tracker.json
// - Proxies AnkiConnect (http://127.0.0.1:8765) so the browser needs no CORS config
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8770;
const ANKI_URL = process.env.ANKI_URL || 'http://127.0.0.1:8765';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'tracker.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req, limit = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('Body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return null; }
}

function saveData(obj) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  // keep one rolling backup of the previous save
  if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, DATA_FILE + '.bak');
  fs.renameSync(tmp, DATA_FILE);
}

// ---------- AnkiConnect helpers ----------
async function ankiCall(action, params = {}, timeoutMs = 15000) {
  const r = await fetch(ANKI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, version: 6, params }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const j = await r.json();
  if (j.error) throw new Error(`${action}: ${j.error}`);
  return j.result;
}

const KANA_MODEL = 'Nihongo Kana';
const KANA_CSS = `.card { font-family: "Hiragino Sans","Yu Gothic UI","Noto Sans JP",sans-serif; text-align: center; background: #fbfaf7; color: #1f1d1a; }
.nightMode.card, .night_mode .card { background: #1f1e19; color: #ece8e1; }
.kana { font-size: 96px; margin-top: 30px; }
.romaji { font-size: 40px; color: #bc002d; margin-top: 10px; }
.script { font-size: 14px; color: #888; margin-top: 8px; }`;

async function setupKanaDeck(deck = 'Kana') {
  const KANA = require('./public/kana.js');
  await ankiCall('createDeck', { deck });
  const models = await ankiCall('modelNames');
  if (!models.includes(KANA_MODEL)) {
    await ankiCall('createModel', {
      modelName: KANA_MODEL,
      inOrderFields: ['Kana', 'Romaji', 'Script', 'Group'],
      css: KANA_CSS,
      cardTemplates: [{
        Name: 'Recognition',
        Front: '<div class="kana">{{Kana}}</div>',
        Back: '{{FrontSide}}<hr id="answer"><div class="romaji">{{Romaji}}</div><div class="script">{{Script}} · {{Group}}</div>',
      }],
    });
  }
  const notes = KANA.cards().map((c) => ({
    deckName: deck,
    modelName: KANA_MODEL,
    fields: { Kana: c.kana, Romaji: c.romaji, Script: c.script, Group: c.group },
    tags: ['nihongo-tracker', 'kana', c.script.toLowerCase(), c.group],
    options: { allowDuplicate: false, duplicateScope: 'deck' },
  }));
  const can = await ankiCall('canAddNotes', { notes });
  const toAdd = notes.filter((_, i) => can[i]);
  if (toAdd.length) await ankiCall('addNotes', { notes: toAdd });
  return { deck, added: toAdd.length, alreadyThere: notes.length - toAdd.length, total: notes.length };
}

async function setupKaishi() {
  const decks = await ankiCall('deckNames');
  const existing = decks.find((d) => /kaishi/i.test(d));
  if (existing) return { skipped: true, deck: existing, message: `Deck "${existing}" already exists — not importing again.` };

  let url = 'https://github.com/donkuri/kaishi/releases/download/v2.4.3/Kaishi.1.5k.v2.4.3.apkg';
  try {
    const rel = await (await fetch('https://api.github.com/repos/donkuri/Kaishi/releases/latest', { headers: { 'User-Agent': 'nihongo-tracker' } })).json();
    const asset = (rel.assets || []).find((a) => a.name.endsWith('.apkg'));
    if (asset) url = asset.browser_download_url;
  } catch { /* fall back to pinned version */ }

  const dir = path.join(DATA_DIR, 'decks');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, decodeURIComponent(url.split('/').pop()));
  if (!fs.existsSync(file)) {
    const r = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!r.ok) throw new Error(`Download failed (${r.status}) from ${url}`);
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  await ankiCall('importPackage', { path: file.replace(/\\/g, '/') }, 180000);
  const after = (await ankiCall('deckNames')).filter((d) => /kaishi/i.test(d));
  return { imported: true, file: path.relative(__dirname, file), decks: after };
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/setup/kana' && req.method === 'POST') {
    try { return send(res, 200, await setupKanaDeck()); }
    catch (e) { return send(res, 502, { error: e.message }); }
  }
  if (url.pathname === '/api/setup/kaishi' && req.method === 'POST') {
    try { return send(res, 200, await setupKaishi()); }
    catch (e) { return send(res, 502, { error: e.message }); }
  }
  if (url.pathname === '/api/data' && req.method === 'GET') {
    return send(res, 200, loadData() || {});
  }
  if (url.pathname === '/api/data' && req.method === 'PUT') {
    const body = await readBody(req);
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object') return send(res, 400, { error: 'Invalid data' });
    saveData(parsed);
    return send(res, 200, { ok: true });
  }
  if (url.pathname === '/api/anki' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req, 1024 * 1024));
    const payload = { action: body.action, version: 6, params: body.params || {} };
    try {
      const r = await fetch(ANKI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      const json = await r.json();
      return send(res, 200, json);
    } catch (e) {
      return send(res, 502, { result: null, error: `Cannot reach AnkiConnect at ${ANKI_URL}. Is Anki open with the AnkiConnect add-on installed? (${e.message})` });
    }
  }
  return send(res, 404, { error: 'Not found' });
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, buf, MIME[path.extname(file)] || 'application/octet-stream');
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    serveStatic(req, res, url);
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

// Bind to localhost only — your data never leaves your machine.
server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  日本語 Tracker running →  http://localhost:${PORT}\n`);
  console.log(`  Data file:  ${DATA_FILE}`);
  console.log(`  AnkiConnect: ${ANKI_URL}\n`);
});
