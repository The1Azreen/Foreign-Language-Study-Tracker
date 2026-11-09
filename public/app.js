/* 日本語 Tracker — front-end (vanilla JS, no build step) */
'use strict';

const C = window.CONTENT;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const fmt = (n, d = 0) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
const pct = (a, b) => (b > 0 ? Math.max(0, Math.min(100, (a / b) * 100)) : 0);

// ---------- dates (local time, YYYY-MM-DD) ----------
const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = () => ymd();

const hm = (min) => {
  min = Math.round(min || 0);
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
};

// ---------- state ----------
const DEFAULTS = {
  version: 1,
  settings: {
    dailyMinutesGoal: 90,
    dailyNewCardsGoal: 15,
    targetHours: 2500,
    startingHours: 0,
    startDate: today(),
    targetDate: '',
    decks: [],
    miningDeck: '',
    countAnkiInStreak: true,
  },
  logs: [],
  checklist: {},
  certs: {},
  ankiSnapshots: {},
  library: [],
  timer: null,
};

let state = structuredClone(DEFAULTS);
let saveTimer = null;
let currentView = 'dashboard';
let ankiCache = null; // live stats from last refresh

async function load() {
  try {
    const r = await fetch('/api/data');
    const data = await r.json();
    state = mergeDefaults(data);
  } catch {
    const ls = localStorage.getItem('nihongo-tracker');
    if (ls) state = mergeDefaults(JSON.parse(ls));
    toast('Could not reach the local server — using browser storage only.');
  }
}

function mergeDefaults(data) {
  const s = { ...structuredClone(DEFAULTS), ...(data || {}) };
  s.settings = { ...DEFAULTS.settings, ...(data?.settings || {}) };
  return s;
}

function save() {
  localStorage.setItem('nihongo-tracker', JSON.stringify(state));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
    } catch { toast('Save to disk failed — data kept in browser storage.'); }
  }, 300);
}

function toast(msg, ms = 3000) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), ms);
}

// ---------- AnkiConnect ----------
async function anki(action, params = {}) {
  const r = await fetch('/api/anki', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, params }) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

function deckQuery(decks) {
  if (!decks || !decks.length) return '';
  const parts = decks.map((d) => `"deck:${d.replace(/"/g, '\\"')}"`);
  return parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`;
}

async function count(q) { return (await anki('findCards', { query: q })).length; }

async function refreshAnki({ quiet = false } = {}) {
  const decks = state.settings.decks;
  const dq = deckQuery(decks);
  try {
    const [total, mature, young, newCards, due, reviewedToday, againToday, added30, rated30, again30, byDay] = await Promise.all([
      count(`${dq} -is:suspended`),
      count(`${dq} prop:ivl>=21 -is:suspended`),
      count(`${dq} is:review prop:ivl<21 -is:suspended`),
      count(`${dq} is:new -is:suspended`),
      count(`${dq} is:due -is:suspended`),
      count(`${dq} rated:1`),
      count(`${dq} rated:1:1`),
      count(`${dq} added:30`),
      count(`${dq} rated:30`),
      count(`${dq} rated:30:1`),
      anki('getNumCardsReviewedByDay'),
    ]);
    let minedToday = 0;
    if (state.settings.miningDeck) minedToday = await count(`${deckQuery([state.settings.miningDeck])} added:1`);
    const addedToday = await count(`${dq} added:1`);
    const introducedToday = await count(`${dq} introduced:1`);

    ankiCache = {
      total, mature, young, newCards, due, reviewedToday, againToday, added30, addedToday, minedToday, introducedToday,
      retention30: rated30 ? 1 - again30 / rated30 : null,
      byDay: Object.fromEntries((byDay || []).map(([d, n]) => [d, n])),
      fetchedAt: new Date().toISOString(),
    };
    state.ankiSnapshots[today()] = { total, mature, young, newCards, reviewedToday, addedToday, minedToday, introducedToday };
    state.ankiReviewsByDay = ankiCache.byDay;
    save();
    if (!quiet) toast('Anki stats updated.');
    return ankiCache;
  } catch (e) {
    if (!quiet) toast(e.message, 6000);
    ankiCache = { error: e.message };
    return null;
  }
}

// ---------- derived stats ----------
function minutesByDay() {
  const m = {};
  for (const l of state.logs) m[l.date] = (m[l.date] || 0) + Number(l.minutes || 0);
  return m;
}

function totalMinutes() { return state.logs.reduce((a, l) => a + Number(l.minutes || 0), 0) + state.settings.startingHours * 60; }

function streak() {
  const m = minutesByDay();
  const reviews = state.settings.countAnkiInStreak ? (state.ankiReviewsByDay || {}) : {};
  const active = (d) => (m[d] || 0) > 0 || (reviews[d] || 0) > 0;
  let d = new Date();
  if (!active(ymd(d))) d = addDays(d, -1); // today not done yet doesn't break the streak
  let n = 0;
  while (active(ymd(d))) { n++; d = addDays(d, -1); }
  let best = 0, run = 0;
  const days = new Set([...Object.keys(m).filter((k) => m[k] > 0), ...Object.keys(reviews).filter((k) => reviews[k] > 0)]);
  const sorted = [...days].sort();
  let prev = null;
  for (const k of sorted) {
    run = prev && ymd(addDays(parseYmd(prev), 1)) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return { current: n, best: Math.max(best, n) };
}

function sumRange(daysBack) {
  const m = minutesByDay();
  let s = 0;
  for (let i = 0; i < daysBack; i++) s += m[ymd(addDays(new Date(), -i))] || 0;
  return s;
}

function byType(daysBack = null) {
  const cutoff = daysBack ? ymd(addDays(new Date(), -daysBack + 1)) : '0000';
  const out = {};
  for (const l of state.logs) if (l.date >= cutoff) out[l.type] = (out[l.type] || 0) + Number(l.minutes || 0);
  return out;
}

function readingSpeed() {
  let chars = 0, min = 0;
  for (const l of state.logs) if (l.chars > 0 && l.minutes > 0) { chars += Number(l.chars); min += Number(l.minutes); }
  return min ? { cph: (chars / min) * 60, chars } : null;
}

const typeInfo = (id) => C.activityTypes.find((t) => t.id === id) || { id, label: id, icon: '•' };

function latestMature() {
  if (ankiCache && ankiCache.mature != null) return ankiCache.mature;
  const keys = Object.keys(state.ankiSnapshots).sort();
  return keys.length ? state.ankiSnapshots[keys[keys.length - 1]].mature : null;
}

// ---------- charts (inline SVG) ----------
function heatmapSVG(values, weeks = 26, goal = 60) {
  const cell = 13, gap = 3;
  const end = new Date();
  const start = addDays(end, -(weeks * 7 - 1) - end.getDay()); // align to Sunday
  const days = Math.round((end - start) / 864e5) + 1;
  const cols = Math.ceil(days / 7);
  const w = cols * (cell + gap) + 30, h = 7 * (cell + gap) + 20;
  const level = (v) => (v <= 0 ? 0 : v < goal * 0.34 ? 1 : v < goal * 0.67 ? 2 : v < goal ? 3 : 4);
  let rects = '', months = '', lastMonth = -1;
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    const col = Math.floor(i / 7), row = d.getDay();
    const v = values[ymd(d)] || 0;
    rects += `<rect x="${30 + col * (cell + gap)}" y="${16 + row * (cell + gap)}" width="${cell}" height="${cell}" fill="var(--heat-${level(v)})"><title>${ymd(d)}: ${hm(v)}</title></rect>`;
    if (row === 0 && d.getMonth() !== lastMonth) {
      lastMonth = d.getMonth();
      months += `<text x="${30 + col * (cell + gap)}" y="10" font-size="10" fill="var(--muted)">${d.toLocaleString(undefined, { month: 'short' })}</text>`;
    }
  }
  const dl = ['', 'Mon', '', 'Wed', '', 'Fri', ''].map((t, i) => `<text x="0" y="${26 + i * (cell + gap)}" font-size="10" fill="var(--muted)">${t}</text>`).join('');
  return `<svg width="${w}" height="${h}" role="img" aria-label="Daily immersion heatmap">${months}${dl}${rects}</svg>`;
}

function barsSVG(series, { height = 140, color = 'var(--accent)', goal = null, labelFn = (v) => v } = {}) {
  const n = series.length, w = Math.max(320, n * 22), pad = 24;
  const max = Math.max(1, goal || 0, ...series.map((s) => s.v));
  const bw = (w - pad) / n - 4;
  let out = '';
  series.forEach((s, i) => {
    const bh = (s.v / max) * (height - 30);
    const x = pad + i * ((w - pad) / n);
    out += `<rect x="${x}" y="${height - 18 - bh}" width="${bw}" height="${Math.max(bh, s.v > 0 ? 2 : 0)}" rx="3" fill="${color}"><title>${s.label}: ${labelFn(s.v)}</title></rect>`;
    if (i % Math.ceil(n / 10) === 0) out += `<text x="${x}" y="${height - 4}" font-size="10" fill="var(--muted)">${s.short}</text>`;
  });
  if (goal) {
    const gy = height - 18 - (goal / max) * (height - 30);
    out += `<line x1="${pad}" x2="${w}" y1="${gy}" y2="${gy}" stroke="var(--muted)" stroke-dasharray="4 4"/><text x="0" y="${gy + 3}" font-size="10" fill="var(--muted)">goal</text>`;
  }
  return `<svg viewBox="0 0 ${w} ${height}" width="100%" height="${height}" preserveAspectRatio="none" role="img">${out}</svg>`;
}

function lastNDays(n, valuesObj) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    out.push({ label: ymd(d), short: `${d.getMonth() + 1}/${d.getDate()}`, v: valuesObj[ymd(d)] || 0 });
  }
  return out;
}

// ---------- timer ----------
function timerElapsedMin() {
  if (!state.timer) return 0;
  return (Date.now() - state.timer.startedAt) / 60000;
}
function renderTimerChip() {
  const chip = $('#timer-chip');
  if (!state.timer) { chip.classList.add('hidden'); return; }
  chip.classList.remove('hidden');
  const s = Math.floor((Date.now() - state.timer.startedAt) / 1000);
  const t = `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  chip.textContent = `⏺ ${typeInfo(state.timer.type).icon} ${t}`;
  const big = $('#timer-big');
  if (big) big.textContent = t;
}
setInterval(renderTimerChip, 1000);

function startTimer(type, title) {
  state.timer = { type, title, startedAt: Date.now() };
  save(); render();
}
function stopTimer() {
  if (!state.timer) return;
  const minutes = Math.round(timerElapsedMin());
  if (minutes >= 1) {
    state.logs.push({ id: uid(), date: today(), type: state.timer.type, minutes, title: state.timer.title || '', chars: 0, notes: '' });
    toast(`Logged ${hm(minutes)} of ${typeInfo(state.timer.type).label}.`);
  } else toast('Timer under 1 minute — not logged.');
  state.timer = null;
  save(); render();
}

// ---------- views ----------
const views = {};

views.dashboard = () => {
  const s = state.settings;
  const mbd = minutesByDay();
  const todayMin = mbd[today()] || 0;
  const tot = totalMinutes();
  const st = streak();
  const week = sumRange(7), month = sumRange(30);
  const avg30 = month / 30;
  const remainingH = Math.max(0, s.targetHours - tot / 60);
  const etaDays = avg30 > 0 ? (remainingH * 60) / avg30 : null;
  const eta = etaDays != null ? addDays(new Date(), etaDays) : null;
  const mature = latestMature();
  const nextHM = C.hourMilestones.find((m) => m.hours > tot / 60);
  const nextWM = C.wordMilestones.find((w) => mature == null || w > mature);
  const rs = readingSpeed();
  const types = byType(30);
  const typeMax = Math.max(1, ...Object.values(types));
  const snap = state.ankiSnapshots[today()];

  return `
  <div class="grid stats">
    <div class="card stat"><div class="label">Today</div><div class="value">${hm(todayMin)}</div>
      <div class="bar ${todayMin >= s.dailyMinutesGoal ? 'good' : ''}"><span style="width:${pct(todayMin, s.dailyMinutesGoal)}%"></span></div>
      <div class="sub">goal ${hm(s.dailyMinutesGoal)}</div></div>
    <div class="card stat"><div class="label">Streak</div><div class="value">${st.current} 🔥</div><div class="sub">best ${st.best} days</div></div>
    <div class="card stat"><div class="label">Total hours</div><div class="value">${fmt(tot / 60, 1)}</div>
      <div class="bar"><span style="width:${pct(tot / 60, s.targetHours)}%"></span></div><div class="sub">of ${fmt(s.targetHours)}h target</div></div>
    <div class="card stat"><div class="label">Last 7 days</div><div class="value">${fmt(week / 60, 1)}h</div><div class="sub">${hm(week / 7)}/day avg</div></div>
    <div class="card stat"><div class="label">Mature cards</div><div class="value">${mature == null ? '—' : fmt(mature)}</div>
      <div class="sub">${mature == null ? 'connect Anki' : nextWM ? `next: ${fmt(nextWM)}` : 'all milestones!'}</div></div>
    <div class="card stat"><div class="label">Anki today</div><div class="value">${snap ? fmt(snap.reviewedToday) : '—'}</div>
      <div class="sub">${snap ? `${snap.introducedToday ?? 0} new · ${snap.minedToday ?? 0} mined` : 'reviews'}</div></div>
  </div>

  <div class="grid two">
    <div class="card">
      <h2>Quick timer</h2>
      ${state.timer ? `
        <div class="muted">${typeInfo(state.timer.type).icon} ${esc(typeInfo(state.timer.type).label)} ${state.timer.title ? '· ' + esc(state.timer.title) : ''}</div>
        <div class="timer-big" id="timer-big">0:00:00</div>
        <div class="row"><button class="btn primary" data-act="timer-stop">Stop & log</button><button class="btn danger" data-act="timer-cancel">Discard</button></div>
      ` : `
        <div class="form-grid">
          <label class="field">Activity<select id="t-type">${C.activityTypes.map((t) => `<option value="${t.id}">${t.icon} ${esc(t.label)}</option>`).join('')}</select></label>
          <label class="field">What (optional)<input id="t-title" placeholder="e.g. よつばと! vol 3" list="library-titles"></label>
          <button class="btn primary" data-act="timer-start">Start ▶</button>
        </div>
        ${libraryDatalist()}
      `}
    </div>
    <div class="card">
      <h2>Progress to goal</h2>
      <div class="small muted">Averaging <b>${hm(avg30)}</b>/day over the last 30 days.</div>
      ${eta ? `<p>At this pace you reach <b>${fmt(s.targetHours)}h</b> around <b>${eta.toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</b> (${fmt(etaDays / 365, 1)} years).</p>` : '<p class="muted">Log some time to see a projection.</p>'}
      ${s.targetDate ? (() => {
        const daysLeft = (parseYmd(s.targetDate) - new Date()) / 864e5;
        const need = daysLeft > 0 ? (remainingH * 60) / daysLeft : null;
        return `<p>To hit it by <b>${esc(s.targetDate)}</b> you need <b>${need ? hm(need) : '—'}</b>/day.</p>`;
      })() : ''}
      ${nextHM ? `<div class="small">Next hour milestone: <b>${nextHM.hours}h</b> — ${esc(nextHM.label)} (${fmt(nextHM.hours - tot / 60, 1)}h to go)</div>` : ''}
      ${rs ? `<div class="small">Reading speed: <b>${fmt(rs.cph)}</b> chars/hour · ${fmt(rs.chars)} chars logged</div>` : ''}
    </div>
  </div>

  ${(() => {
    const cur = currentPlanMonth();
    const m = C.yearPlan.find((x) => x.month === cur);
    if (!m) return '';
    const next = m.tasks.filter((t) => !state.checklist[t.id]).slice(0, 3);
    const p = planTaskProgress(m);
    return `<div class="card">
      <div class="spread"><h2>This month: ${esc(m.title)}</h2><button class="btn small" data-act="goto" data-id="year">Year 1 plan →</button></div>
      <div class="small muted">Month ${m.month} of 12 · ${p.done}/${p.total} tasks done</div>
      <ul class="checklist">${next.map((t) => `<li><input type="checkbox" data-act="check" data-id="${t.id}"><span>${esc(t.text)}</span></li>`).join('') || '<li>All tasks done for this month 🎉</li>'}</ul>
    </div>`;
  })()}

  <div class="card">
    <div class="spread"><h2>Daily immersion — last 6 months</h2>
      <div class="legend">less ${[0, 1, 2, 3, 4].map((i) => `<i style="background:var(--heat-${i})"></i>`).join('')} goal</div></div>
    <div class="heatmap">${heatmapSVG(mbd, 26, s.dailyMinutesGoal)}</div>
  </div>

  <div class="grid two">
    <div class="card"><h2>Last 30 days</h2>${barsSVG(lastNDays(30, mbd), { goal: s.dailyMinutesGoal, labelFn: hm })}</div>
    <div class="card"><h2>Time by activity (30 days)</h2>
      ${Object.keys(types).length ? Object.entries(types).sort((a, b) => b[1] - a[1]).map(([k, v]) => `
        <div class="hbar-row"><span>${typeInfo(k).icon} ${esc(typeInfo(k).label)}</span><div class="bar"><span style="width:${pct(v, typeMax)}%"></span></div><span class="num small">${hm(v)}</span></div>`).join('')
        : '<p class="muted">Nothing logged yet.</p>'}
      <p class="small muted">Comprehensible-input rule of thumb: most of your time should be reading/watching/listening, with Anki as a supporting ~20–30%.</p>
    </div>
  </div>`;
};

function libraryDatalist() {
  return `<datalist id="library-titles">${state.library.map((b) => `<option value="${esc(b.title)}">`).join('')}</datalist>`;
}

views.log = () => {
  const logs = [...state.logs].sort((a, b) => (b.date + (b.id || '')).localeCompare(a.date + (a.id || '')));
  return `
  <div class="card">
    <h2>Log study time</h2>
    <form id="log-form" class="form-grid">
      <label class="field">Date<input type="date" name="date" value="${today()}" required></label>
      <label class="field">Activity<select name="type">${C.activityTypes.map((t) => `<option value="${t.id}">${t.icon} ${esc(t.label)}</option>`).join('')}</select></label>
      <label class="field">Minutes<input type="number" name="minutes" min="1" step="1" required placeholder="45"></label>
      <label class="field">Title / source<input name="title" list="library-titles" placeholder="e.g. 葬送のフリーレン ep 4"></label>
      <label class="field">Characters read<input type="number" name="chars" min="0" placeholder="from ttsu (optional)"></label>
      <label class="field" style="grid-column:1/-1">Notes<input name="notes" placeholder="new grammar, words, impressions…"></label>
      <button class="btn primary" type="submit">Add entry</button>
    </form>
    ${libraryDatalist()}
  </div>
  <div class="card">
    <div class="spread"><h2>History</h2><span class="muted small">${state.logs.length} entries · ${hm(totalMinutes() - state.settings.startingHours * 60)} logged</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Activity</th><th>Title</th><th class="num">Time</th><th class="num">Chars</th><th>Notes</th><th></th></tr></thead>
      <tbody>${logs.slice(0, 500).map((l) => `
        <tr><td>${esc(l.date)}</td><td>${typeInfo(l.type).icon} ${esc(typeInfo(l.type).label)}</td><td>${esc(l.title)}</td>
        <td class="num">${hm(l.minutes)}</td><td class="num">${l.chars ? fmt(l.chars) : ''}</td><td class="small">${esc(l.notes)}</td>
        <td><button class="btn small danger" data-act="del-log" data-id="${l.id}">✕</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">No entries yet.</td></tr>'}
      </tbody></table></div>
  </div>`;
};

views.anki = () => {
  const s = state.settings;
  const a = ankiCache;
  const snaps = Object.entries(state.ankiSnapshots).sort(([x], [y]) => x.localeCompare(y));
  const reviews = state.ankiReviewsByDay || {};
  return `
  <div class="card">
    <div class="spread"><h2>Anki connection</h2>
      <div class="row"><button class="btn" data-act="anki-load-decks">Load decks</button><button class="btn primary" data-act="anki-refresh">Refresh stats</button></div></div>
    ${a?.error ? `<div class="notice">${esc(a.error)}</div>` : a ? `<div class="notice ok">Connected · updated ${new Date(a.fetchedAt).toLocaleTimeString()}</div>` : '<p class="muted">Open Anki (with AnkiConnect installed), then click “Load decks”.</p>'}
    <div id="deck-picker" class="small" style="margin-top:.75rem">
      <div><b>Tracked decks:</b> ${s.decks.length ? s.decks.map((d) => `<span class="pill accent">${esc(d)}</span>`).join(' ') : '<span class="muted">none → whole collection</span>'}</div>
      <div><b>Mining deck</b> (where Yomitan adds cards): ${s.miningDeck ? `<span class="pill accent">${esc(s.miningDeck)}</span>` : '<span class="muted">not set</span>'}</div>
    </div>
    <div id="deck-list"></div>
  </div>

  ${a && !a.error ? `
  <div class="grid stats">
    <div class="card stat"><div class="label">Mature (ivl ≥ 21d)</div><div class="value">${fmt(a.mature)}</div><div class="sub">≈ words you know well</div></div>
    <div class="card stat"><div class="label">Young</div><div class="value">${fmt(a.young)}</div></div>
    <div class="card stat"><div class="label">New / unseen</div><div class="value">${fmt(a.newCards)}</div></div>
    <div class="card stat"><div class="label">Due now</div><div class="value">${fmt(a.due)}</div></div>
    <div class="card stat"><div class="label">Reviewed today</div><div class="value">${fmt(a.reviewedToday)}</div><div class="sub">${a.againToday} failed</div></div>
    <div class="card stat"><div class="label">New today</div><div class="value">${fmt(a.introducedToday)}</div>
      <div class="bar ${a.introducedToday >= s.dailyNewCardsGoal ? 'good' : ''}"><span style="width:${pct(a.introducedToday, s.dailyNewCardsGoal)}%"></span></div><div class="sub">goal ${s.dailyNewCardsGoal}</div></div>
    <div class="card stat"><div class="label">Mined today</div><div class="value">${fmt(a.minedToday)}</div><div class="sub">${fmt(a.added30)} added in 30d</div></div>
    <div class="card stat"><div class="label">Retention (30d)</div><div class="value">${a.retention30 == null ? '—' : fmt(a.retention30 * 100, 1) + '%'}</div><div class="sub">approx; aim 85–90%</div></div>
  </div>` : ''}

  <div class="grid two">
    <div class="card"><h2>Reviews per day (60 days, whole collection)</h2>${barsSVG(lastNDays(60, reviews), { color: 'var(--good)' })}</div>
    <div class="card"><h2>Mature-card growth</h2>
      ${snaps.length ? barsSVG(snaps.slice(-60).map(([d, v]) => ({ label: d, short: d.slice(5).replace('-', '/'), v: v.mature })), { labelFn: fmt })
        : '<p class="muted">A snapshot is saved each day you refresh stats.</p>'}
      <div class="milestones">${C.wordMilestones.map((w) => `<span class="pill ${latestMature() >= w ? 'good' : ''}">${fmt(w)}</span>`).join('')}</div>
    </div>
  </div>

  <div class="card">
    <h2>Yomitan → Anki mining setup</h2>
    <ol class="steps">
      <li>Anki → Tools → Add-ons → Get Add-ons → code <code>2055492159</code> (AnkiConnect). Restart Anki.</li>
      <li>Create a deck such as <code>Mining</code> and a note type with fields like <code>Word, Reading, Sentence, Definition, Audio, Pitch, Picture, Frequency</code> (or import a ready-made Lapis / Senren note type).</li>
      <li>Yomitan → Settings → Anki → enable, select your deck/note type, and map fields to markers like <code>{expression}</code>, <code>{reading}</code>, <code>{sentence}</code>, <code>{glossary}</code>, <code>{audio}</code>, <code>{pitch-accents}</code>, <code>{frequencies}</code>.</li>
      <li>Read in ttsu reader / watch with asbplayer, hover an unknown word (Shift), click ➕ to add.</li>
      <li>Here: “Load decks”, tick your core + mining decks, set the mining deck, then “Refresh stats” daily.</li>
    </ol>
    <p class="small muted">This tracker talks to AnkiConnect through the local server, so you don’t need to edit AnkiConnect’s CORS settings.</p>
  </div>`;
};

// ---------- Learn: kana chart, quiz, starter decks ----------
const learn = {
  script: 'Hiragana',
  quizGroups: ['basic'],
  quizScript: 'Hiragana',
  q: null, last: null, right: 0, total: 0, missed: {},
  setupMsg: {},
};

function quizPool() {
  const K = window.KANA;
  const pool = [];
  for (const g of K.groups) if (learn.quizGroups.includes(g.id))
    for (const [h, k, r] of g.rows) {
      if (learn.quizScript !== 'Katakana') pool.push({ kana: h, romaji: r });
      if (learn.quizScript !== 'Hiragana') pool.push({ kana: k, romaji: r });
    }
  if (learn.quizGroups.includes('extended') && learn.quizScript !== 'Hiragana')
    for (const [k, r] of K.extendedKatakana) pool.push({ kana: k, romaji: r });
  return pool;
}

function nextQuestion() {
  const pool = quizPool();
  if (!pool.length) { learn.q = null; return; }
  // weight missed kana higher so you see your weak ones more
  const weighted = pool.flatMap((p) => Array(1 + 2 * (learn.missed[p.kana] || 0)).fill(p));
  let q;
  do { q = weighted[Math.floor(Math.random() * weighted.length)]; } while (pool.length > 1 && learn.q && q.kana === learn.q.kana);
  learn.q = q;
}

const romajiAnswers = (r) => r.replace(/[()]/g, ' ').split(/\s+/).filter(Boolean);

function kanaTable(rows, idx) {
  const cells = rows.map((row) => `<div class="kana-cell" title="${esc(row[2])}"><div class="k">${esc(row[idx])}</div><div class="r">${esc(row[2])}</div></div>`);
  return `<div class="kana-grid">${cells.join('')}</div>`;
}

views.learn = () => {
  const K = window.KANA;
  const idx = learn.script === 'Hiragana' ? 0 : 1;
  if (!learn.q) nextQuestion();
  const acc = learn.total ? Math.round((learn.right / learn.total) * 100) : null;
  const weak = Object.entries(learn.missed).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const msg = (k) => learn.setupMsg[k] ? `<div class="notice ${learn.setupMsg[k].ok ? 'ok' : ''} small" style="margin-top:.5rem">${esc(learn.setupMsg[k].text)}</div>` : '';
  return `
  <div class="card">
    <h2>Starter Anki decks</h2>
    <p class="small muted">Creates cards straight in Anki. Anki must be open. Safe to click again: existing cards are never duplicated.</p>
    <div class="grid two">
      <div>
        <h3>1 · Kana deck <span class="pill">month 1</span></h3>
        <p class="small">All hiragana and katakana (basic, ゛゜, combinations, plus extended katakana): ${K.cards().length} cards in the <code>Kana</code> deck, in learning order. Set new cards/day to ~20 in Anki’s deck options.</p>
        <button class="btn primary" data-act="setup-kana">Create kana cards</button>${msg('kana')}
      </div>
      <div>
        <h3>2 · Kaishi 1.5k core deck <span class="pill">month 1, week 3+</span></h3>
        <p class="small">The 1,500 most useful beginner words with audio and example sentences. Downloads from GitHub (~110 MB) and imports into Anki. Do 10–15 new/day.</p>
        <button class="btn primary" data-act="setup-kaishi">Download & import Kaishi</button>${msg('kaishi')}
      </div>
    </div>
  </div>

  <div class="grid two">
    <div class="card">
      <div class="spread"><h2>Kana quiz</h2><span class="small muted">${acc == null ? '' : `${learn.right}/${learn.total} · ${acc}%`}</span></div>
      <div class="row small" style="margin-bottom:.5rem">
        ${['Hiragana', 'Katakana', 'Both'].map((s) => `<label class="row"><input type="radio" name="qs" data-act="quiz-script" value="${s}" ${learn.quizScript === s ? 'checked' : ''}> ${s}</label>`).join('')}
      </div>
      <div class="row small" style="margin-bottom:.75rem">
        ${[...K.groups.map((g) => [g.id, g.label]), ['extended', 'Extended katakana']].map(([id, label]) => `<label class="row"><input type="checkbox" data-act="quiz-group" value="${id}" ${learn.quizGroups.includes(id) ? 'checked' : ''}> ${esc(label)}</label>`).join('')}
      </div>
      ${learn.q ? `
        <div class="quiz-kana">${esc(learn.q.kana)}</div>
        <form id="quiz-form" class="row" style="justify-content:center">
          <input id="quiz-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="type romaji, Enter" style="width:200px;text-align:center">
          <button class="btn">Check</button>
        </form>
        <div class="quiz-feedback">${learn.last ? (learn.last.ok ? `<span class="pill good">✓ ${esc(learn.last.kana)} = ${esc(learn.last.romaji)}</span>` : `<span class="pill accent">✗ ${esc(learn.last.kana)} = ${esc(learn.last.romaji)} (you typed “${esc(learn.last.typed)}”)</span>`) : '&nbsp;'}</div>
      ` : '<p class="muted">Pick at least one group.</p>'}
      ${weak.length ? `<div class="small muted" style="margin-top:.5rem">Practising more: ${weak.map(([k, n]) => `<span class="pill">${esc(k)} ×${n}</span>`).join(' ')}</div>` : ''}
      <div class="row" style="margin-top:.75rem"><button class="btn small" data-act="quiz-reset">Reset score</button><button class="btn small" data-act="quiz-log">Log practice time</button></div>
    </div>

    <div class="card">
      <div class="spread"><h2>Kana chart</h2>
        <div class="row">${['Hiragana', 'Katakana'].map((s) => `<button class="btn small ${learn.script === s ? 'primary' : ''}" data-act="chart-script" data-id="${s}">${s}</button>`).join('')}</div></div>
      ${K.groups.map((g) => `<h3 class="small muted" style="margin-top:.75rem">${esc(g.label)}</h3>${kanaTable(g.rows, idx)}`).join('')}
      ${learn.script === 'Katakana' ? `<h3 class="small muted" style="margin-top:.75rem">Extended katakana</h3>${kanaTable(K.extendedKatakana.map(([k, r]) => [k, k, r]), 1)}` : ''}
    </div>
  </div>

  <div class="card">
    <h2>Sound rules to know in week 2</h2>
    <table><tbody>
      <tr><td style="width:30%"><b>Long vowels</b></td><td>Hold the vowel twice as long: おばさん (aunt) vs <b>おばあさん</b> (grandmother). Katakana uses ー: コーヒー.</td></tr>
      <tr><td><b>Small っ / ッ</b></td><td>A short pause that doubles the next consonant: きて (come) vs <b>きって</b> (stamp).</td></tr>
      <tr><td><b>ん</b></td><td>Its own beat. こんにちは = ko-n-ni-chi-wa (5 beats).</td></tr>
      <tr><td><b>Mora timing</b></td><td>Every kana is one equal beat. とうきょう = to-o-kyo-o (4 beats).</td></tr>
      <tr><td><b>Particles は / へ / を</b></td><td>As particles they are read <b>wa</b>, <b>e</b>, <b>o</b>.</td></tr>
      <tr><td><b>Pitch accent</b></td><td>Japanese uses high/low pitch, not stress: はし can be <i>chopsticks</i> or <i>bridge</i>. Just notice it for now (Kaname Naito video).</td></tr>
    </tbody></table>
  </div>`;
};

async function runSetup(kind, btn) {
  btn.disabled = true; btn.textContent = kind === 'kaishi' ? 'Downloading & importing…' : 'Creating cards…';
  try {
    const r = await fetch(`/api/setup/${kind}`, { method: 'POST' });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    learn.setupMsg[kind] = { ok: true, text: kind === 'kana'
      ? `Done: ${j.added} cards added to “${j.deck}”${j.alreadyThere ? `, ${j.alreadyThere} were already there` : ''}.`
      : j.skipped ? j.message : `Imported Kaishi into Anki (${(j.decks || []).join(', ')}).` };
    if (kind === 'kaishi' && j.decks?.length && !state.settings.decks.some((d) => /kaishi/i.test(d))) state.settings.decks.push(j.decks[0]);
    if (kind === 'kana' && !state.settings.decks.includes('Kana')) state.settings.decks.push('Kana');
    save();
  } catch (e) {
    learn.setupMsg[kind] = { ok: false, text: e.message };
  }
  render();
}

// ---------- Year 1 plan ----------
const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

function planMonthRange(month) {
  const start = parseYmd(state.settings.startDate || today());
  return { from: addMonths(start, month - 1), to: addDays(addMonths(start, month), -1) };
}

function currentPlanMonth() {
  for (const m of C.yearPlan) {
    const { to } = planMonthRange(m.month);
    if (ymd(to) >= today()) return m.month;
  }
  return C.yearPlan.length + 1; // year finished
}

function hoursUpTo(dateStr) {
  let min = state.settings.startingHours * 60;
  for (const l of state.logs) if (l.date <= dateStr) min += Number(l.minutes || 0);
  return min / 60;
}

function matureUpTo(dateStr) {
  const keys = Object.keys(state.ankiSnapshots).filter((k) => k <= dateStr).sort();
  return keys.length ? state.ankiSnapshots[keys[keys.length - 1]].mature : null;
}

function planTaskProgress(m) {
  const done = m.tasks.filter((t) => state.checklist[t.id]).length;
  return { done, total: m.tasks.length };
}

views.year = () => {
  const cur = currentPlanMonth();
  const dateOpts = { month: 'short', day: 'numeric', year: 'numeric' };
  const allTasks = C.yearPlan.flatMap((m) => m.tasks);
  const doneAll = allTasks.filter((t) => state.checklist[t.id]).length;
  return `
  <div class="card">
    <div class="spread"><h2>Year 1: from zero to reading native content</h2>
      <span class="pill accent">${cur > 12 ? 'Year complete 🎉' : `You are in month ${cur}`}</span></div>
    <div class="bar"><span style="width:${pct(doneAll, allTasks.length)}%"></span></div>
    <p class="small muted">${doneAll}/${allTasks.length} tasks done · Month 1 starts on your start date (${esc(state.settings.startDate)}). You can change it in Settings.
    Targets are cumulative study hours and mature Anki cards (≈ words you know well) by the end of each month. They're a guide, not a test: being behind is fine as long as you show up daily.</p>
  </div>
  ${C.yearPlan.map((m) => {
    const { from, to } = planMonthRange(m.month);
    const isCur = m.month === cur, isPast = m.month < cur;
    const p = planTaskProgress(m);
    const checkDate = isPast ? ymd(to) : today();
    const hrs = hoursUpTo(checkDate), mat = matureUpTo(checkDate);
    const showActual = isPast || isCur;
    const status = isPast ? (p.done === p.total ? '<span class="pill good">done</span>' : `<span class="pill warn">${p.done}/${p.total}</span>`)
      : isCur ? '<span class="pill accent">now</span>' : `<span class="pill">${p.done}/${p.total}</span>`;
    const routineTotal = Object.values(m.routine).reduce((a, b) => a + b, 0);
    return `<details class="card month ${isCur ? 'current' : ''}" ${isCur ? 'open' : ''}>
      <summary class="spread">
        <span><span class="caret">▸</span> <b>Month ${m.month}: ${esc(m.title)}</b> <span class="muted small">${from.toLocaleDateString(undefined, dateOpts)} – ${to.toLocaleDateString(undefined, dateOpts)}</span></span>
        ${status}
      </summary>
      <p>${esc(m.focus)}</p>
      <div class="grid two">
        <div>
          <h3>Tasks</h3>
          <ul class="checklist">${m.tasks.map((t) => `
            <li class="${state.checklist[t.id] ? 'done' : ''}"><input type="checkbox" data-act="check" data-id="${t.id}" ${state.checklist[t.id] ? 'checked' : ''}>
            <span>${esc(t.text)}</span></li>`).join('')}</ul>
        </div>
        <div>
          <h3>Daily routine <span class="muted small">≈ ${hm(routineTotal)}/day</span></h3>
          ${Object.entries(m.routine).map(([k, v]) => `
            <div class="hbar-row"><span class="small">${esc(k)}</span><div class="bar"><span style="width:${pct(v, 75)}%"></span></div><span class="num small">${v}m</span></div>`).join('')}
          <h3 style="margin-top:1rem">End-of-month targets</h3>
          <div class="hbar-row"><span class="small">Total hours</span>
            <div class="bar ${showActual && hrs >= m.targets.hours ? 'good' : ''}"><span style="width:${showActual ? pct(hrs, m.targets.hours) : 0}%"></span></div>
            <span class="num small">${showActual ? fmt(hrs, 0) + ' / ' : ''}${m.targets.hours}h</span></div>
          ${m.targets.mature ? `<div class="hbar-row"><span class="small">Mature cards</span>
            <div class="bar ${showActual && mat >= m.targets.mature ? 'good' : ''}"><span style="width:${showActual && mat != null ? pct(mat, m.targets.mature) : 0}%"></span></div>
            <span class="num small">${showActual && mat != null ? fmt(mat) + ' / ' : ''}${fmt(m.targets.mature)}</span></div>` : '<div class="small muted">No card target this month, just kana.</div>'}
        </div>
      </div>
    </details>`;
  }).join('')}`;
};

views.roadmap = () => {
  const done = state.checklist;
  const all = C.roadmap.flatMap((p) => p.items);
  const n = all.filter((i) => done[i.id]).length;
  return `
  <div class="card">
    <div class="spread"><h2>Roadmap to working in Japan</h2><span class="pill accent">${n}/${all.length} done</span></div>
    <div class="bar"><span style="width:${pct(n, all.length)}%"></span></div>
    <p class="small muted">Input-first path: set up tools → kana → core vocab + grammar overview → mass immersion with mining → output & business Japanese.</p>
  </div>
  ${C.roadmap.map((p) => {
    const k = p.items.filter((i) => done[i.id]).length;
    return `<div class="card">
      <div class="spread"><h3>${esc(p.title)}</h3><span class="pill ${k === p.items.length ? 'good' : ''}">${k}/${p.items.length}</span></div>
      <div class="small muted">${esc(p.goal)}</div>
      <ul class="checklist">${p.items.map((i) => `
        <li class="${done[i.id] ? 'done' : ''}"><input type="checkbox" data-act="check" data-id="${i.id}" ${done[i.id] ? 'checked' : ''}>
        <span>${esc(i.text)} ${done[i.id] ? `<span class="pill">${esc(done[i.id])}</span>` : ''}</span></li>`).join('')}</ul>
    </div>`;
  }).join('')}
  <div class="card">
    <h2>Certifications</h2>
    <div class="table-wrap"><table><thead><tr><th>Test</th><th>Status</th><th>Date</th><th>Score</th><th>Notes</th></tr></thead><tbody>
    ${C.certifications.map((c) => {
      const v = state.certs[c.id] || {};
      return `<tr><td><b>${esc(c.label)}</b></td>
        <td><select data-act="cert" data-id="${c.id}" data-field="status">${['', 'planned', 'registered', 'passed', 'failed'].map((o) => `<option ${v.status === o ? 'selected' : ''} value="${o}">${o || '—'}</option>`).join('')}</select></td>
        <td><input type="date" data-act="cert" data-id="${c.id}" data-field="date" value="${esc(v.date || '')}"></td>
        <td><input style="width:80px" data-act="cert" data-id="${c.id}" data-field="score" value="${esc(v.score || '')}"></td>
        <td class="small muted">${esc(c.note)}</td></tr>`;
    }).join('')}
    </tbody></table></div>
    <p class="small muted">JLPT runs in July and December (in Japan and many countries); registration closes ~3 months before.</p>
  </div>`;
};

views.library = () => {
  const kinds = ['book', 'manga', 'anime', 'drama', 'podcast', 'youtube', 'game', 'other'];
  const statuses = ['planned', 'active', 'done', 'dropped'];
  const minutesFor = (title) => state.logs.filter((l) => l.title && l.title.toLowerCase().includes(title.toLowerCase())).reduce((a, l) => a + Number(l.minutes), 0);
  const groups = statuses.map((st) => [st, state.library.filter((b) => b.status === st)]);
  return `
  <div class="card">
    <h2>Add to library</h2>
    <form id="lib-form" class="form-grid">
      <label class="field" style="grid-column: span 2">Title<input name="title" required placeholder="e.g. 君の名は。"></label>
      <label class="field">Type<select name="kind">${kinds.map((k) => `<option>${k}</option>`).join('')}</select></label>
      <label class="field">Status<select name="status">${statuses.map((k) => `<option>${k}</option>`).join('')}</select></label>
      <label class="field">Link<input name="url" placeholder="jpdb / MAL / store link"></label>
      <button class="btn primary">Add</button>
    </form>
    <p class="small muted">Time is matched automatically from log entries whose title contains this title.</p>
  </div>
  ${groups.map(([st, items]) => items.length ? `<div class="card"><h3 style="text-transform:capitalize">${st} <span class="muted">(${items.length})</span></h3>
    <div class="table-wrap"><table><tbody>${items.map((b) => `<tr>
      <td>${b.url ? `<a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.title)}</a>` : esc(b.title)}</td>
      <td><span class="pill">${esc(b.kind)}</span></td>
      <td class="num">${hm(minutesFor(b.title))}</td>
      <td><select data-act="lib-status" data-id="${b.id}">${statuses.map((s) => `<option ${s === b.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
      <td><button class="btn small" data-act="lib-timer" data-id="${b.id}">▶</button> <button class="btn small danger" data-act="lib-del" data-id="${b.id}">✕</button></td>
    </tr>`).join('')}</tbody></table></div></div>` : '').join('') || '<div class="card muted">Your library is empty.</div>'}`;
};

views.resources = () => `
  ${C.resources.map((g) => `<div class="card"><h3>${esc(g.category)}</h3>
    <table><tbody>${g.items.map((r) => `<tr><td style="width:40%">${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a>` : esc(r.name)}</td><td class="small muted">${esc(r.note)}</td></tr>`).join('')}</tbody></table>
  </div>`).join('')}
  <p class="small muted">Edit <code>public/content.js</code> to add or fix links.</p>`;

views.settings = () => {
  const s = state.settings;
  return `
  <div class="card">
    <h2>Goals</h2>
    <form id="settings-form" class="form-grid">
      <label class="field">Daily immersion goal (min)<input type="number" name="dailyMinutesGoal" value="${s.dailyMinutesGoal}" min="1"></label>
      <label class="field">Daily new cards goal<input type="number" name="dailyNewCardsGoal" value="${s.dailyNewCardsGoal}" min="0"></label>
      <label class="field">Target total hours<input type="number" name="targetHours" value="${s.targetHours}" min="1"></label>
      <label class="field">Hours before using tracker<input type="number" name="startingHours" value="${s.startingHours}" min="0" step="0.5"></label>
      <label class="field">Start date<input type="date" name="startDate" value="${esc(s.startDate)}"></label>
      <label class="field">Target date (e.g. move to Japan)<input type="date" name="targetDate" value="${esc(s.targetDate)}"></label>
      <label class="field">Anki reviews count toward streak<select name="countAnkiInStreak"><option value="true" ${s.countAnkiInStreak ? 'selected' : ''}>yes</option><option value="false" ${!s.countAnkiInStreak ? 'selected' : ''}>no</option></select></label>
      <button class="btn primary">Save</button>
    </form>
  </div>
  <div class="card">
    <h2>Data</h2>
    <p class="small muted">Saved to <code>data/tracker.json</code> in the project folder (with a <code>.bak</code> of the previous save).</p>
    <div class="row">
      <button class="btn" data-act="export">Export JSON</button>
      <label class="btn">Import JSON<input type="file" id="import-file" accept="application/json" hidden></label>
      <label class="btn">Import CSV log<input type="file" id="import-csv" accept=".csv,text/csv" hidden></label>
    </div>
    <p class="small muted">CSV columns: <code>date,type,minutes,title,chars,notes</code> (header row required; type is one of ${C.activityTypes.map((t) => t.id).join(', ')}).</p>
  </div>`;
};

// ---------- render & events ----------
function render() {
  $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === currentView));
  $('#app').innerHTML = views[currentView]();
  renderTimerChip();
}

function go(view) {
  currentView = view;
  location.hash = view;
  render();
}

document.addEventListener('click', async (e) => {
  const nav = e.target.closest('#nav button');
  if (nav) return go(nav.dataset.view);
  if (e.target.closest('#timer-chip')) return go('dashboard');
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'SELECT' || el.type === 'checkbox' || el.tagName === 'INPUT') return;
  const act = el.dataset.act, id = el.dataset.id;

  if (act === 'timer-start') startTimer($('#t-type').value, $('#t-title').value.trim());
  else if (act === 'timer-stop') stopTimer();
  else if (act === 'timer-cancel') { if (confirm('Discard this timer?')) { state.timer = null; save(); render(); } }
  else if (act === 'goto') go(id);
  else if (act === 'setup-kana' || act === 'setup-kaishi') await runSetup(act.slice(6), el);
  else if (act === 'chart-script') { learn.script = id; render(); }
  else if (act === 'quiz-reset') { Object.assign(learn, { right: 0, total: 0, missed: {}, last: null }); render(); }
  else if (act === 'quiz-log') {
    const m = Number(prompt('Minutes of kana practice to log?', '15'));
    if (m > 0) { state.logs.push({ id: uid(), date: today(), type: 'anki', minutes: m, title: 'Kana practice', chars: 0, notes: '' }); save(); toast(`Logged ${hm(m)}.`); }
  }
  else if (act === 'del-log') { if (confirm('Delete this entry?')) { state.logs = state.logs.filter((l) => l.id !== id); save(); render(); } }
  else if (act === 'anki-refresh') { el.disabled = true; el.textContent = 'Refreshing…'; await refreshAnki(); render(); }
  else if (act === 'anki-load-decks') await loadDecks();
  else if (act === 'lib-del') { if (confirm('Remove from library?')) { state.library = state.library.filter((b) => b.id !== id); save(); render(); } }
  else if (act === 'lib-timer') { const b = state.library.find((x) => x.id === id); const kindMap = { book: 'reading', manga: 'reading', anime: 'watching', drama: 'watching', youtube: 'watching', podcast: 'listening', game: 'reading' }; startTimer(kindMap[b.kind] || 'reading', b.title); go('dashboard'); }
  else if (act === 'export') {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `nihongo-tracker-${today()}.json`; a.click();
  }
});

document.addEventListener('change', async (e) => {
  const el = e.target;
  const act = el.dataset.act, id = el.dataset.id;
  if (act === 'check') {
    if (el.checked) state.checklist[id] = today(); else delete state.checklist[id];
    save(); render();
  } else if (act === 'quiz-script') {
    learn.quizScript = el.value; learn.q = null; render(); $('#quiz-input')?.focus();
  } else if (act === 'quiz-group') {
    learn.quizGroups = el.checked ? [...learn.quizGroups, el.value] : learn.quizGroups.filter((g) => g !== el.value);
    learn.q = null; render(); $('#quiz-input')?.focus();
  } else if (act === 'cert') {
    state.certs[id] = { ...(state.certs[id] || {}), [el.dataset.field]: el.value };
    save();
  } else if (act === 'lib-status') {
    const b = state.library.find((x) => x.id === id); b.status = el.value; save(); render();
  } else if (act === 'deck-toggle') {
    const d = el.value;
    state.settings.decks = el.checked ? [...new Set([...state.settings.decks, d])] : state.settings.decks.filter((x) => x !== d);
    save(); render(); await loadDecks(true);
  } else if (act === 'mining-deck') {
    state.settings.miningDeck = el.value; save(); render(); await loadDecks(true);
  } else if (el.id === 'import-file') {
    const f = el.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!confirm(`Replace current data with ${data.logs?.length ?? 0} log entries from this file?`)) return;
      state = mergeDefaults(data); save(); render(); toast('Imported.');
    } catch (err) { toast('Import failed: ' + err.message); }
  } else if (el.id === 'import-csv') {
    const f = el.files[0]; if (!f) return;
    const n = importCsv(await f.text());
    save(); render(); toast(`Imported ${n} log entries.`);
  }
});

document.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target, fd = Object.fromEntries(new FormData(f));
  if (f.id === 'quiz-form') {
    const typed = $('#quiz-input').value.trim().toLowerCase();
    if (!typed || !learn.q) return;
    const ok = romajiAnswers(learn.q.romaji).includes(typed);
    learn.total++; if (ok) learn.right++;
    if (ok) { if (learn.missed[learn.q.kana]) learn.missed[learn.q.kana]--; }
    else learn.missed[learn.q.kana] = (learn.missed[learn.q.kana] || 0) + 1;
    learn.last = { ...learn.q, ok, typed };
    nextQuestion(); render(); $('#quiz-input')?.focus();
    return;
  }
  if (f.id === 'log-form') {
    state.logs.push({ id: uid(), date: fd.date, type: fd.type, minutes: Number(fd.minutes), title: fd.title.trim(), chars: Number(fd.chars) || 0, notes: fd.notes.trim() });
    save(); render(); toast(`Logged ${hm(fd.minutes)}.`);
  } else if (f.id === 'lib-form') {
    state.library.push({ id: uid(), title: fd.title.trim(), kind: fd.kind, status: fd.status, url: fd.url.trim(), added: today() });
    save(); render();
  } else if (f.id === 'settings-form') {
    const s = state.settings;
    for (const k of ['dailyMinutesGoal', 'dailyNewCardsGoal', 'targetHours', 'startingHours']) s[k] = Number(fd[k]) || 0;
    s.startDate = fd.startDate; s.targetDate = fd.targetDate; s.countAnkiInStreak = fd.countAnkiInStreak === 'true';
    save(); toast('Settings saved.');
  }
});

async function loadDecks(silent = false) {
  try {
    const names = (await anki('deckNames')).sort();
    const box = $('#deck-list'); if (!box) return;
    box.innerHTML = `
      <div class="grid two" style="margin-top:.75rem">
        <div><b class="small">Track these decks</b>${names.map((n) => `<label class="row small"><input type="checkbox" data-act="deck-toggle" value="${esc(n)}" ${state.settings.decks.includes(n) ? 'checked' : ''}> ${esc(n)}</label>`).join('')}</div>
        <div><label class="field">Mining deck<select data-act="mining-deck"><option value="">—</option>${names.map((n) => `<option ${state.settings.miningDeck === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label></div>
      </div>`;
  } catch (e) { if (!silent) toast(e.message, 6000); }
}

function importCsv(text) {
  const rows = text.trim().split(/\r?\n/).map((line) => {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur); return out;
  });
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  let n = 0;
  for (const r of rows) {
    const o = Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()]));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date) || !(Number(o.minutes) > 0)) continue;
    state.logs.push({ id: uid(), date: o.date, type: o.type || 'reading', minutes: Number(o.minutes), title: o.title || '', chars: Number(o.chars) || 0, notes: o.notes || '' });
    n++;
  }
  return n;
}

// ---------- boot ----------
(async () => {
  await load();
  const v = location.hash.slice(1);
  if (views[v]) currentView = v;
  render();
  // Try a silent Anki refresh on startup; harmless if Anki isn't running.
  if (await refreshAnki({ quiet: true })) render();
})();
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (views[v] && v !== currentView) { currentView = v; render(); } });
