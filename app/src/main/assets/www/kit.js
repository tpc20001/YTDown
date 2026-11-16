// AndroidKit 架子（kit.js）— 選單、封面、效能、後台總控制、讓路、設定、遠端網頁、更新、LOG、實驗。
// 新程式的功能寫在 app.js；這個檔通常不用改（要改也可以，一樣跟著熱更新）。
// 原生功能：window.KIT（外殼 Bridge.kt）。在電腦瀏覽器預覽時沒有 KIT，所有原生功能都會安全地什麼都不做。
'use strict';
(function () {
const N = window.KIT || null;
const has = f => !!(N && typeof N[f] === 'function');
const call = (f, ...a) => { if (!has(f)) return null; try { return N[f](...a); } catch (e) { return null; } };
const jcall = (f, ...a) => { const r = call(f, ...a); try { return r ? JSON.parse(r) : null; } catch (e) { return null; } };
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => Date.now();
const fmtSize = b => { b = +b || 0; if (b < 1024) return b + ' B'; const u = ['KB', 'MB', 'GB', 'TB']; let i = -1; do { b /= 1024; i++; } while (b >= 1024 && i < 3); return (b >= 100 ? b.toFixed(0) : b.toFixed(1)) + ' ' + u[i]; };
const fmtTime = t => { if (!t) return ''; const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const fmtDur = ms => { const s = Math.round(ms / 1000); if (s < 60) return s + ' 秒'; if (s < 3600) return Math.floor(s / 60) + ' 分 ' + (s % 60) + ' 秒'; return Math.floor(s / 3600) + ' 小時 ' + Math.floor(s % 3600 / 60) + ' 分'; };
const verNum = v => { const p = String(v || '').replace(/^[Vv]/, '').split('.').map(x => parseInt(x, 10) || 0); return (p[0] || 0) * 1e6 + (p[1] || 0) * 1e3 + (p[2] || 0); };

const kit = window.kit = { N, has, call, jcall, $, $$, esc, sleep, fmtSize, fmtTime, fmtDur, verNum, native: !!N };

// =====================================================================
// LOG：kit.log.w('訊息')、kit.log.err('在做什麼', 錯誤)。錯誤只記下來，絕對不讓程式停。
// =====================================================================
kit.lastAct = '';
const log = kit.log = {
  w(msg) { try { call('log', 'w', String(msg)); if (!N) console.log('[log]', msg); } catch (e) {} },
  err(where, e) {
    try {
      const m = (e && (e.stack || e.message)) || String(e || '');
      call('log', 'err', `${where}：${m}\n（最後的操作：${kit.lastAct || '無'}）`);
      if (!N) console.error('[err]', where, e);
    } catch (x) {}
  },
  upd(msg) { call('log', 'upd', String(msg)); },
};
window.addEventListener('error', e => log.err('畫面錯誤', e.error || e.message));
window.addEventListener('unhandledrejection', e => log.err('畫面錯誤（非同步）', e.reason));
/** 包一層：出錯只記 LOG，回傳 undefined */
kit.safe = (fn, where) => function (...a) {
  try { const r = fn.apply(this, a); if (r && r.catch) return r.catch(e => { log.err(where || '動作', e); }); return r; }
  catch (e) { log.err(where || '動作', e); }
};

// =====================================================================
// 品牌（brand.json）、版本
// =====================================================================
kit.brand = { id: 'AndroidKit', name: 'AndroidKit', title: 'AndroidKit', prefix: 'AK', web_port: 8571, accent: '#e51e63', github: '' };
kit.uiVer = '';
async function loadText(name) {
  if (has('wwwText')) { const t = call('wwwText', name); if (t) return t; }
  try { const r = await fetch(name, { cache: 'no-store' }); if (r.ok) return await r.text(); } catch (e) {}
  return new Promise(res => { try { const x = new XMLHttpRequest(); x.open('GET', name); x.onload = () => res(x.responseText); x.onerror = () => res(''); x.send(); } catch (e) { res(''); } });
}
kit.loadText = loadText;

// =====================================================================
// 設定：kit.cfg.get('key')、kit.cfg.set('key', 值)（馬上存檔、記 LOG）
// 存在 files/Data/settings.json（熱更新、換外殼都不會動）
// =====================================================================
const DEFAULTS = {
  theme: 'dark', zoom: 100,
  cover_on_start: false, idle_cover_min: 0, secure_recent: false,
  auto_restart: true, freeze_sec: 2,
  keep_alive: true,
  gov_on: true, gov_cpu: 85, gov_temp: 42, gov_thermal: 2, gov_batt: 15, gov_charge_only: false, gov_wifi_only: false,
  yield_apps: [],
  remote_on: false, remote_port: 0, remote_pin: '',
  gh_repo: '', cloud_auto: true, cloud_skip: '',
  nav_closed: {}, caps: {}, lab: {},
};
kit.DEFAULTS = DEFAULTS;
const cfg = kit.cfg = {
  data: {},
  load() {
    let t = call('dataRead', 'settings.json');
    if (t == null) { try { t = localStorage.getItem('kit_settings'); } catch (e) {} }
    try { this.data = t ? JSON.parse(t) : {}; } catch (e) { log.err('讀設定（檔案壞了，用預設值）', e); this.data = {}; }
  },
  get(k) { return k in this.data ? this.data[k] : (k in DEFAULTS ? JSON.parse(JSON.stringify(DEFAULTS[k])) : undefined); },
  set(k, v, quiet) {
    const old = this.get(k); this.data[k] = v; this.save();
    if (!quiet && JSON.stringify(old) !== JSON.stringify(v)) log.w(`設定 ${k}：${JSON.stringify(old)} → ${JSON.stringify(v)}`);
    (cfgHooks[k] || []).forEach(f => kit.safe(f, '設定 ' + k)(v, old));
  },
  save() {
    const t = JSON.stringify(this.data, null, 1);
    if (N) call('dataWrite', 'settings.json', t); else { try { localStorage.setItem('kit_settings', t); } catch (e) {} }
  },
};
const cfgHooks = {};
/** 設定改了就叫：kit.onCfg('key', (新, 舊) => …) */
kit.onCfg = (k, f) => { (cfgHooks[k] = cfgHooks[k] || []).push(f); };

/** 其他要保存的資料（JSON）：kit.data.get('名字', 預設)、kit.data.set('名字', 值) → files/Data/名字.json */
kit.data = {
  get(name, def) {
    let t = call('dataRead', name + '.json');
    if (t == null) { try { t = localStorage.getItem('kit_d_' + name); } catch (e) {} }
    try { return t ? JSON.parse(t) : def; } catch (e) { log.err('讀資料 ' + name, e); return def; }
  },
  set(name, v) {
    const t = JSON.stringify(v);
    if (N) return call('dataWrite', name + '.json', t);
    try { localStorage.setItem('kit_d_' + name, t); } catch (e) {}
    return true;
  },
};

// =====================================================================
// 資料庫（SQLite）：await kit.db.q('SELECT …', [參數]) → 列的陣列；await kit.db.run('INSERT …', [參數])
// 新表寫在 kit.SCHEMA（app.js 用 kit.SCHEMA.push）；舊表加欄位寫在 kit.MIGRATE。不刪表、不改欄位型態。
// =====================================================================
kit.SCHEMA = [];
kit.MIGRATE = [];   // ['表', '欄位', 'TEXT DEFAULT ""']
const dbWait = new Map(); let dbSeq = 0;
window.onDb = s => { try { const r = JSON.parse(s); const w = dbWait.get(r.id); if (w) { dbWait.delete(r.id); w(r); } } catch (e) { log.err('資料庫回傳', e); } };
function dbCall(kind, sql, args) {
  if (!has('dbAsync')) return Promise.resolve({ ok: false, rows: [], err: '沒有資料庫（瀏覽器預覽）' });
  return new Promise(res => { const id = 'd' + (++dbSeq); dbWait.set(id, res); call('dbAsync', id, kind, sql, JSON.stringify(args || [])); });
}
kit.db = {
  async q(sql, args) { const r = await dbCall('q', sql, args); if (!r.ok && N) log.err('查資料庫', r.err + '｜' + sql); return r.rows || []; },
  async run(sql, args) { const r = await dbCall('x', sql, args); if (!r.ok && N) log.err('寫資料庫', r.err + '｜' + sql); return r; },
  async init() {
    for (const s of kit.SCHEMA) await this.run(s);
    for (const [t, c, type] of kit.MIGRATE) {
      const cols = await this.q(`PRAGMA table_info(${t})`);
      if (cols.length && !cols.some(x => x.name === c)) { await this.run(`ALTER TABLE ${t} ADD COLUMN ${c} ${type}`); log.w(`資料庫：${t} 加欄位 ${c}`); }
    }
  },
};

// =====================================================================
// 小工具：提示、確認、彈出視窗、提示列
// =====================================================================
let toastT = 0;
kit.toast = (msg, ms) => { const t = $('#toast'); if (!t) return; t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 2600); };
window.onToast = m => kit.toast(m);

/** 彈出視窗：kit.sheet('標題', 'HTML') → 回傳內容元素；kit.closeSheet() */
kit.sheet = (title, html, opt) => {
  const s = $('#sheet');
  s.innerHTML = `<div class="sh-box ${opt && opt.wide ? 'wide' : ''}"><div class="sh-h"><b>${esc(title)}</b><button class="ib" data-act="sheet_close">✕</button></div><div class="sh-c">${html}</div></div>`;
  s.hidden = false; return $('.sh-c', s);
};
kit.closeSheet = () => { const s = $('#sheet'); s.hidden = true; s.innerHTML = ''; };
/** 確認：if (await kit.ask('要刪掉嗎？', '說明', '刪掉')) … */
kit.ask = (title, msg, okText, danger) => new Promise(res => {
  const c = kit.sheet(title, `<p class="mut">${msg || ''}</p><div class="row end"><button class="btn" data-k="no">取消</button><button class="btn ${danger ? 'danger' : 'pri'}" data-k="ok">${esc(okText || '確定')}</button></div>`);
  c.onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; kit.closeSheet(); res(b.dataset.k === 'ok'); };
});
/** 輸入：const v = await kit.prompt('標題', '預設') → 字串或 null */
kit.prompt = (title, def, help) => new Promise(res => {
  const c = kit.sheet(title, `${help ? `<p class="mut">${help}</p>` : ''}<input id="pIn" type="text" value="${esc(def || '')}"><div class="row end"><button class="btn" data-k="no">取消</button><button class="btn pri" data-k="ok">確定</button></div>`);
  const i = $('#pIn', c); setTimeout(() => i.focus(), 50);
  c.onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; const v = i.value; kit.closeSheet(); res(b.dataset.k === 'ok' ? v : null); };
});
/** 上方提示列：kit.bar('id', 'HTML', 'warn'|'info'|'ok')；kit.unbar('id') */
kit.bar = (id, html, kind) => {
  let b = $('#bar_' + id);
  if (!b) { b = document.createElement('div'); b.id = 'bar_' + id; $('#bars').appendChild(b); }
  b.className = 'bar ' + (kind || 'info'); b.innerHTML = html;
};
kit.unbar = id => { const b = $('#bar_' + id); if (b) b.remove(); };

// 按鈕：<button data-act="名稱" data-arg="參數"> → kit.act('名稱', (參數, 元素) => …)
const ACTS = {};
kit.act = (name, fn) => { ACTS[name] = fn; };
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const f = ACTS[el.dataset.act]; if (!f) return;
  kit.lastAct = el.dataset.act + (el.dataset.arg ? '(' + el.dataset.arg + ')' : '');
  kit.safe(f, '按鈕 ' + el.dataset.act)(el.dataset.arg, el, e);
});
kit.act('sheet_close', () => kit.closeSheet());
window.onBack = () => {
  if (!$('#sheet').hidden) { kit.closeSheet(); return true; }
  if (document.body.classList.contains('drawer')) { drawer(false); return true; }
  if (nav.hist.length > 1) { nav.hist.pop(); kit.go(nav.hist.pop(), true); return true; }
  return false;
};

// =====================================================================
// 頁面與選單
//   kit.page({ id, title, icon, group, render(el), refresh(el) })
//   render：進到這頁時畫一次；refresh：看得到時每 2 秒叫一次（看不到就不叫）
//   kit.GROUPS：[['分組名', '#顏色', ['頁id', …]], …]（app.js 可以改）
// =====================================================================
const PAGES = {}; const pageOrder = [];
kit.PAGES = PAGES;
kit.page = p => { if (!PAGES[p.id]) pageOrder.push(p.id); PAGES[p.id] = Object.assign({ icon: '•', title: p.id }, p); };
kit.GROUPS = [
  ['主要', '#e51e63', ['home']],
  ['系統', '#4dabf7', ['bg', 'perf', 'set', 'upd', 'log']],
  ['其他', '#868e96', ['lab', 'help']],
];
const nav = kit.nav = { cur: '', hist: [], badges: {} };
/** 選單右邊的小數字：kit.nav.badge('頁id', '3')（空字串＝拿掉） */
nav.badge = (id, txt) => { nav.badges[id] = txt; const b = $(`#drawer [data-go="${id}"] .badge`); if (b) { b.textContent = txt || ''; b.hidden = !txt; } };

function drawNav() {
  const closed = cfg.get('nav_closed') || {};
  const used = new Set();
  let h = `<div class="dr-head"><b>${esc(kit.brand.title || kit.brand.name)}</b><small>畫面 ${esc(kit.uiVer)}${N ? '　外殼 S' + call('shell') : '（預覽）'}</small></div>`;
  for (const [g, color, ids] of kit.GROUPS) {
    const list = ids.filter(id => PAGES[id]); list.forEach(id => used.add(id));
    if (!list.length) continue;
    h += `<div class="grp ${closed[g] ? 'closed' : ''}"><button class="grp-h" data-act="nav_grp" data-arg="${esc(g)}" style="--gc:${esc(color)}">${esc(g)}<span>▾</span></button><div class="grp-b">`;
    for (const id of list) h += navItem(id);
    h += '</div></div>';
  }
  const rest = pageOrder.filter(id => !used.has(id) && !PAGES[id].hidden);
  if (rest.length) h += `<div class="grp"><div class="grp-b">${rest.map(navItem).join('')}</div></div>`;
  $('#drawer').innerHTML = h;
}
function navItem(id) {
  const p = PAGES[id], b = nav.badges[id] || '';
  return `<button class="nav-i ${nav.cur === id ? 'on' : ''}" data-go="${id}"><span class="ic">${p.icon}</span><span class="nm">${esc(p.title)}</span><span class="badge" ${b ? '' : 'hidden'}>${esc(b)}</span></button>`;
}
kit.act('nav_grp', g => { const c = cfg.get('nav_closed') || {}; c[g] = !c[g]; cfg.set('nav_closed', c, true); drawNav(); });
function drawer(on) { document.body.classList.toggle('drawer', on); }
kit.act('menu', () => drawer(!document.body.classList.contains('drawer')));
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (!g) return;
  kit.lastAct = '到 ' + g.dataset.go; kit.go(g.dataset.go);
});

/** 換頁：kit.go('頁id') */
kit.go = (id, noHist) => {
  const p = PAGES[id] || PAGES.home || PAGES[pageOrder[0]]; if (!p) return;
  nav.cur = p.id; drawer(false);
  if (!noHist && nav.hist[nav.hist.length - 1] !== p.id) { nav.hist.push(p.id); if (nav.hist.length > 30) nav.hist.shift(); }
  $('#pgTitle').textContent = p.title;
  $$('#drawer .nav-i').forEach(b => b.classList.toggle('on', b.dataset.go === p.id));
  const el = $('#page'); el.innerHTML = ''; el.dataset.page = p.id; el.scrollTop = 0; window.scrollTo(0, 0);
  try { p.render && p.render(el); } catch (e) { log.err('畫頁面 ' + p.id, e); el.innerHTML = `<div class="card bad">這頁出錯了，已記到 LOG。<br><small>${esc(e.message)}</small></div>`; }
  try { p.refresh && p.refresh(el); } catch (e) { log.err('更新頁面 ' + p.id, e); }
  try { sessionStorage.setItem('kit_page', p.id); } catch (e) {}
};
/** 重畫目前這頁 */
kit.redraw = () => kit.go(nav.cur, true);
setInterval(() => {
  if (document.hidden || coverOn) return;
  const p = PAGES[nav.cur]; if (!p || !p.refresh) return;
  try { p.refresh($('#page')); } catch (e) { log.err('更新頁面 ' + p.id, e); }
}, 2000);

// =====================================================================
// 深色／淺色、主色、介面大小（70～160%）；分屏、小窗時自動等比例縮小
// =====================================================================
kit.ZM = 1;
function applyTheme() {
  const light = cfg.get('theme') === 'light';
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  document.documentElement.style.setProperty('--acc', kit.brand.accent || '#e51e63');
  call('bars', light ? '#f3f4f6' : '#16181d', light);
  const fz = $('#fTheme'); if (fz) fz.textContent = light ? '☀ 淺色' : '◐ 深色';
}
kit.act('theme', () => { cfg.set('theme', cfg.get('theme') === 'light' ? 'dark' : 'light'); applyTheme(); });
let fitW = 0, fitZ = 1;
function fit() {
  const w = innerWidth, h = innerHeight, sw = screen.width || w, sh = screen.height || h;
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '');
  if (!(typing && w === fitW)) {                       // 打字時鍵盤把高度變矮，不跟著縮
    const small = w < sw * 0.9 || w < 340 || (h < 560 && w < 700);
    fitZ = small ? Math.max(0.55, Math.min(1, w / 380, h / 600)) : 1; fitW = w;
  }
  const z = Math.round(fitZ * (cfg.get('zoom') || 100)) / 100;
  kit.ZM = z;
  const r = document.documentElement;
  r.style.zoom = z === 1 ? '' : String(z);
  r.style.setProperty('--vh', (h / z / 100) + 'px');
  const fz = $('#fZoom'); if (fz) fz.textContent = (cfg.get('zoom') || 100) + '%';
}
kit.fit = fit;
addEventListener('resize', fit);
kit.act('zoom', async () => {
  const opts = [70, 80, 90, 100, 110, 120, 130, 140, 150, 160], cur = cfg.get('zoom') || 100;
  const c = kit.sheet('介面大小', `<div class="chips">${opts.map(z => `<button class="chip ${z === cur ? 'on' : ''}" data-z="${z}">${z}%</button>`).join('')}</div>`);
  c.onclick = e => { const b = e.target.closest('[data-z]'); if (!b) return; cfg.set('zoom', +b.dataset.z); fit(); kit.closeSheet(); };
});

// =====================================================================
// 🏠 封面（不露出內容）、閒置回封面、🌙 縮到背景
// =====================================================================
let coverOn = false, lastTouch = now();
kit.cover = on => {
  coverOn = on; $('#cover').hidden = !on;
  if (on) { $('#cvClock').textContent = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }); drawer(false); kit.closeSheet(); }
};
kit.act('cover', () => kit.cover(true));
kit.act('cover_off', () => { kit.cover(false); lastTouch = now(); });
kit.act('to_back', () => { if (!N) return kit.toast('（預覽）手機上會縮到背景，背景工作照跑'); call('toBack'); });
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { lastTouch = now(); }, true));
setInterval(() => {
  const m = +cfg.get('idle_cover_min') || 0;
  if (m > 0 && !coverOn && now() - lastTouch > m * 60000) kit.cover(true);
}, 15000);
kit.onCfg('secure_recent', v => call('secure', !!v));

// =====================================================================
// 畫面卡住紀錄：計時器晚了超過門檻秒數 → ui_freeze_log.txt（記最後在做什麼）
// =====================================================================
let lastBeat = now();
setInterval(() => {
  const t = now(), late = t - lastBeat - 250; lastBeat = t;
  const lim = (+cfg.get('freeze_sec') || 2) * 1000;
  if (late > lim && !document.hidden) call('log', 'freeze', `畫面（JS）卡住 ${(late / 1000).toFixed(1)} 秒，最後的操作：${kit.lastAct || '無'}，在第 ${nav.cur} 頁`);
}, 250);
document.addEventListener('visibilitychange', () => { lastBeat = now(); });
kit.onCfg('freeze_sec', v => call('freezeMs', Math.round((+v || 2) * 1000)));

// =====================================================================
// 📊 效能：每 3 秒量一次（App CPU、記憶體、電池、溫度、空間），留最近 10 分鐘畫曲線
// =====================================================================
const perf = kit.perf = { cur: {}, hist: [] };
function samplePerf() {
  const p = jcall('perf') || demoPerf();
  perf.cur = p; perf.hist.push({ t: now(), cpu: p.cpu, temp: p.batTemp, ram: p.ramTotal ? 100 - p.ramFree / p.ramTotal * 100 : 0 });
  if (perf.hist.length > 200) perf.hist.shift();
  const fs = $('#fState');
  if (fs) {
    const pz = Object.keys(KINDS).filter(k => J.paused[k]).map(k => KINDS[k].name);
    fs.textContent = (gov.yieldApp ? '⚖ 讓路中　' : gov.level ? `⚖ 讓路 ${gov.level}　` : '') + (pz.length ? '⏸ ' + pz.join('、') : '');
  }
  const s = $('#fPerf');
  if (s) s.textContent = `CPU ${p.cpu >= 0 ? Math.round(p.cpu) : '-'}%　🌡${p.batTemp ? p.batTemp.toFixed(0) + '°' : '-'}　🔋${p.battery >= 0 ? p.battery + '%' : '-'}`;
}
function demoPerf() {   // 瀏覽器預覽用的假數字
  const r = Math.random();
  return { cpu: 5 + r * 20, cores: 8, ramTotal: 8e9, ramFree: 3e9 + r * 1e9, appMem: 180e6, battery: 80, batTemp: 33 + r * 2, charging: true, thermal: 0, powerSave: false, diskFree: 50e9, diskTotal: 128e9, net: { online: true, wifi: true }, demo: true };
}

// =====================================================================
// ⚖ 自動讓路：手機太熱、電量低、App 太吃 CPU（或設定只在充電／Wi-Fi 時跑）
//   持續 12 秒：先把同時跑的數量減半（等級 1）→ 再 12 秒還是一樣就先不開新的（等級 2）
//   好了 30 秒：一級一級恢復；恢復後同時跑的數量慢慢加回去（每 10 秒 +1）
// 🧪 讓路名單：名單上的 App 在前景時，所有背景工作先停下來（手上的會在 ctx.hold() 等）
// =====================================================================
const gov = kit.gov = { level: 0, why: '', badSince: 0, goodSince: 0, stepAt: 0, yieldApp: '', yieldOff: 0 };
function govReasons(p) {
  const r = [];
  if (!cfg.get('gov_on')) return r;
  if (p.cpu >= +cfg.get('gov_cpu')) r.push(`App CPU ${Math.round(p.cpu)}%`);
  if (p.batTemp >= +cfg.get('gov_temp')) r.push(`電池 ${p.batTemp.toFixed(0)}°C`);
  if (p.thermal >= +cfg.get('gov_thermal')) r.push('手機過熱');
  if (p.battery >= 0 && p.battery <= +cfg.get('gov_batt') && !p.charging) r.push(`電量 ${p.battery}%`);
  return r;
}
function govTick() {
  const p = perf.cur, t = now();
  const hard = [];                          // 這些一出現就直接停（不是慢慢降）
  if (cfg.get('gov_charge_only') && !p.charging) hard.push('沒在充電');
  if (cfg.get('gov_wifi_only') && p.net && !p.net.wifi) hard.push('沒有 Wi-Fi');
  const soft = govReasons(p);
  if (hard.length) { gov.level = 2; gov.why = hard.join('、'); gov.goodSince = 0; return; }
  if (soft.length) {
    gov.goodSince = 0; if (!gov.badSince) gov.badSince = t;
    if (t - gov.badSince >= 12000 && t - gov.stepAt >= 12000 && gov.level < 2) { gov.level++; gov.stepAt = t; log.w(`⚖ 讓路等級 ${gov.level}：${soft.join('、')}`); }
    gov.why = soft.join('、');
  } else {
    gov.badSince = 0; if (!gov.goodSince) gov.goodSince = t;
    if (gov.level > 0 && t - gov.goodSince >= 30000 && t - gov.stepAt >= 30000) { gov.level--; gov.stepAt = t; log.w(`⚖ 讓路等級 ${gov.level}（恢復）`); }
    if (gov.level === 0) gov.why = '';
  }
}
function yieldTick() {
  const list = cfg.get('yield_apps') || [];
  if (!labOn('yield_apps') || !list.length) { gov.yieldApp = ''; return; }
  const fg = call('fgApp') || '';
  const hit = list.find(a => a.pkg === fg);
  if (hit) { if (gov.yieldApp !== hit.name) log.w(`⚖ ${hit.name} 在前景，背景工作先讓路`); gov.yieldApp = hit.name; gov.yieldOff = 0; }
  else if (gov.yieldApp) { if (!gov.yieldOff) gov.yieldOff = now(); if (now() - gov.yieldOff > 15000) { log.w(`⚖ ${gov.yieldApp} 關掉了，背景工作繼續`); gov.yieldApp = ''; gov.yieldOff = 0; } }
}

// =====================================================================
// 🖥 背景工作（後台總控制）
//   kit.kind('代號', { icon, name, cap: 同時幾個, run: async (data, ctx) => { … } })
//   kit.jobs.add('代號', '標題', data) → 排進去
//   在 run 裡面：
//     await ctx.hold()             暫停、讓路時在這裡等；按「立刻停」會丟出停止
//     ctx.progress(百分比, '訊息')   顯示進度
//     ctx.save(data)               存進度（熱更新、閃退、被系統關掉後，會用存的 data 再跑一次 run → 要從存的地方接著做）
//     await ctx.sleep(毫秒)         可以被「立刻停」打斷的等待
//     ctx.stopped                  是不是被停了
//   工作清單存在 files/Data/jobs.json；完成的留最近 80 筆。
// =====================================================================
const KINDS = kit.KINDS = {};
const J = { list: [], paused: {}, order: [], ramp: {}, running: new Map(), seq: 0, mark: {} };
kit.J = J;
class StopErr extends Error { constructor() { super('已停止'); this.stop = true; } }
kit.kind = (k, spec) => { KINDS[k] = Object.assign({ icon: '⚙', name: k, cap: 1 }, spec); if (!J.order.includes(k)) J.order.push(k); };

let saveT = 0;
function saveJobs(now_) {
  clearTimeout(saveT);
  const go = () => kit.data.set('jobs', { list: J.list.slice(-300), paused: J.paused, order: J.order, seq: J.seq });
  if (now_) go(); else saveT = setTimeout(go, 800);
}
function loadJobs() {
  const d = kit.data.get('jobs', null);
  if (!d) return;
  J.list = d.list || []; J.paused = d.paused || {}; J.seq = d.seq || 0;
  const ord = (d.order || []).filter(k => KINDS[k]); J.order.forEach(k => { if (!ord.includes(k)) ord.push(k); }); J.order = ord;
  let n = 0;
  J.list.forEach(j => { if (j.status === 'run') { j.status = 'queue'; j.msg = '接回（上次被打斷）'; n++; } });
  if (n) log.w(`背景工作：接回 ${n} 個上次被打斷的`);
}
const jobs = kit.jobs = {
  add(kind, title, data) {
    if (!KINDS[kind]) { log.err('排工作', '沒有這種工作：' + kind); return ''; }
    const j = { id: 'j' + (++J.seq) + '_' + now().toString(36), kind, title: String(title || kind), data: data || {}, status: 'queue', pct: 0, msg: '排隊中', t: now() };
    J.list.push(j); saveJobs(); schedule();
    return j.id;
  },
  get: id => J.list.find(j => j.id === id),
  running: k => J.list.filter(j => j.status === 'run' && (!k || j.kind === k)),
  queued: k => J.list.filter(j => j.status === 'queue' && (!k || j.kind === k)),
  cancel(id) {
    const j = jobs.get(id); if (!j) return;
    if (j.status === 'run') { const c = J.running.get(id); if (c) c.stopped = true; }
    else if (j.status === 'queue') finish(j, 'stop', '取消了');
  },
  retry(id) { const j = jobs.get(id); if (j && /fail|stop/.test(j.status)) { j.status = 'queue'; j.msg = '重新排隊'; j.pct = 0; saveJobs(); schedule(); } },
  clearDone() { J.list = J.list.filter(j => j.status === 'run' || j.status === 'queue'); saveJobs(); },
  pause(k, on) { J.paused[k] = !!on; if (!on) J.ramp[k] = 1; log.w(`${on ? '⏸ 暫停' : '▶ 繼續'}：${(KINDS[k] || {}).name || k}`); saveJobs(); schedule(); },
  pauseAll(on) { Object.keys(KINDS).forEach(k => { J.paused[k] = !!on; }); log.w(on ? '⏸ 全部暫停' : '▶ 全部繼續'); saveJobs(); schedule(); },
  stopNow(k) { J.paused[k] = true; J.running.forEach(c => { if (c.job.kind === k) c.stopped = true; }); log.w(`⏹ 立刻停：${(KINDS[k] || {}).name || k}`); saveJobs(); },
  move(k, d) { const i = J.order.indexOf(k), t = i + d; if (i < 0 || t < 0 || t >= J.order.length) return; J.order.splice(i, 1); J.order.splice(t, 0, k); saveJobs(); },
  /** 熱更新前：馬上存檔 */
  checkpoint() { saveJobs(true); },
};
function held(k) { return !!J.paused[k] || gov.level >= 2 || !!gov.yieldApp; }
function capOf(k) {
  const base = Math.max(1, +((cfg.get('caps') || {})[k] || (KINDS[k] || {}).cap || 1));
  let c = gov.level === 1 ? Math.max(1, Math.ceil(base / 2)) : base;
  const r = J.ramp[k] || base; return Math.min(c, r);
}
setInterval(() => { for (const k in J.ramp) if (!held(k) && J.ramp[k] < 99) J.ramp[k]++; }, 10000);
function schedule() {
  for (const k of J.order) {
    if (!KINDS[k] || held(k)) continue;
    let run = jobs.running(k).length; const cap = capOf(k);
    for (const j of jobs.queued(k)) { if (run >= cap) break; start(j); run++; }
  }
  keepAlive();
}
setInterval(() => kit.safe(schedule, '排程')(), 1000);
function start(j) {
  const K = KINDS[j.kind];
  j.status = 'run'; j.t0 = now(); j.msg = '開始'; J.mark[j.kind] = j.title;
  const ctx = {
    job: j, stopped: false,
    async hold() { while (!ctx.stopped && held(j.kind)) await sleep(500); if (ctx.stopped) throw new StopErr(); },
    check() { if (ctx.stopped) throw new StopErr(); },
    progress(pct, msg) { if (pct != null) j.pct = Math.max(0, Math.min(100, +pct || 0)); if (msg != null) j.msg = String(msg); },
    save(data) { j.data = data; saveJobs(); },
    async sleep(ms) { const end = now() + ms; while (now() < end) { if (ctx.stopped) throw new StopErr(); await sleep(Math.min(300, end - now())); } },
    log(m) { log.w(`[${K.name}] ${j.title}：${m}`); },
  };
  J.running.set(j.id, ctx); saveJobs();
  log.w(`▶ 開始 ${K.name}：${j.title}`);
  Promise.resolve().then(() => K.run(j.data, ctx))
    .then(() => finish(j, ctx.stopped ? 'stop' : 'done', ctx.stopped ? '已停止' : '完成'))
    .catch(e => { if (ctx.stopped || (e && e.stop)) finish(j, 'stop', '已停止'); else { finish(j, 'fail', (e && e.message) || String(e)); log.err(`工作失敗 ${K.name}：${j.title}`, e); } });
}
function finish(j, st, msg) {
  J.running.delete(j.id);
  j.status = st; j.msg = msg || ''; j.t1 = now(); if (st === 'done') j.pct = 100;
  if (j.t0 && st !== 'stop') log.w(`${st === 'done' ? '✔' : '✖'} ${(KINDS[j.kind] || {}).name || j.kind}：${j.title}（${fmtDur(j.t1 - j.t0)}）${st === 'fail' ? '：' + msg : ''}`);
  const done = J.list.filter(x => !/run|queue/.test(x.status));
  if (done.length > 80) { const drop = new Set(done.slice(0, done.length - 80)); J.list = J.list.filter(x => !drop.has(x)); }
  saveJobs(); schedule();
}
let keepState = '';
function keepAlive() {
  const r = jobs.running().length, q = jobs.queued().filter(j => !held(j.kind)).length;
  const remote = !!cfg.get('remote_on');
  const on = cfg.get('keep_alive') && (r + q > 0 || remote);
  const txt = r + q > 0 ? `背景工作：跑 ${r} 個、排 ${q} 個` : (remote ? '📡 遠端網頁開著' : '');
  const s = on + '|' + txt;
  if (s !== keepState) { keepState = s; call('keepAlive', !!on, kit.brand.name, txt); }
}

// =====================================================================
// 🖥 後台狀態頁
// =====================================================================
const ST = { queue: '排隊', run: '進行中', done: '完成', fail: '失敗', stop: '停止' };
function kindRow(k) {
  const K = KINDS[k], r = jobs.running(k), q = jobs.queued(k), p = J.paused[k];
  const pct = r.length ? Math.round(r.reduce((a, j) => a + (j.pct || 0), 0) / r.length) : 0;
  const state = p ? '<span class="tag warn">⏸ 暫停</span>' : (held(k) ? '<span class="tag warn">⚖ 讓路</span>' : (r.length ? '<span class="tag ok">跑</span>' : '<span class="tag">閒</span>'));
  return `<div class="krow"><div class="kn">${K.icon} <b>${esc(K.name)}</b> ${state}<small class="mut">跑 ${r.length}／排 ${q.length}　同時 ${capOf(k)}</small></div>
    <div class="bar-p"><i style="width:${pct}%"></i></div>
    <div class="mut small ell">${esc(r[0] ? r[0].title + '：' + r[0].msg : (J.mark[k] ? '停在：' + J.mark[k] : ''))}</div>
    <div class="row">${p ? `<button class="btn sm pri" data-act="k_pause" data-arg="${k}|0">▶ 繼續</button>` : `<button class="btn sm" data-act="k_pause" data-arg="${k}|1">⏸ 暫停</button>`}
      <button class="btn sm" data-act="k_stop" data-arg="${k}">⏹ 立刻停</button>
      <button class="btn sm" data-act="k_move" data-arg="${k}|-1">↑</button><button class="btn sm" data-act="k_move" data-arg="${k}|1">↓</button></div></div>`;
}
function govLine() {
  if (gov.yieldApp) return `<span class="tag warn">⚖ 讓路中</span> ${esc(gov.yieldApp)} 在前景`;
  if (gov.level) return `<span class="tag warn">⚖ 讓路等級 ${gov.level}</span> ${esc(gov.why)}`;
  return `<span class="tag ok">正常</span> ${cfg.get('gov_on') ? '手機太熱、電量低、CPU 太忙時會自動讓路' : '自動讓路已關閉'}`;
}
kit.page({
  id: 'bg', title: '後台狀態', icon: '🖥',
  render(el) {
    el.innerHTML = `<div class="card"><div class="row"><b>總控制</b><span class="grow"></span>
      <button class="btn sm" data-act="all_pause" data-arg="1">⏸ 全部暫停</button><button class="btn sm" data-act="all_pause" data-arg="0">▶ 全部繼續</button></div>
      <div id="bgGov" class="small"></div><div id="bgKinds"></div></div>
      <div class="card"><div class="row"><b>最近的工作</b><span class="grow"></span><button class="btn sm" data-act="jobs_clear">清掉完成的</button></div><div id="bgJobs"></div></div>`;
  },
  refresh(el) {
    $('#bgGov', el).innerHTML = govLine();
    $('#bgKinds', el).innerHTML = J.order.filter(k => KINDS[k]).map(kindRow).join('') || '<p class="mut">還沒有任何背景工作種類（在 app.js 用 kit.kind 加）</p>';
    const list = J.list.slice().reverse().slice(0, 80);
    $('#bgJobs', el).innerHTML = list.map(j => `<div class="jrow ${j.status}"><div class="grow ell"><b>${(KINDS[j.kind] || {}).icon || '⚙'} ${esc(j.title)}</b><br><small class="mut">${ST[j.status] || j.status}${j.status === 'run' ? ' ' + Math.round(j.pct || 0) + '%' : ''}　${esc(j.msg || '')}　${fmtTime(j.t1 || j.t0 || j.t)}</small></div>
      ${/run|queue/.test(j.status) ? `<button class="btn sm" data-act="job_cancel" data-arg="${j.id}">✕</button>` : (/fail|stop/.test(j.status) ? `<button class="btn sm" data-act="job_retry" data-arg="${j.id}">↻</button>` : '')}</div>`).join('') || '<p class="mut">沒有工作</p>';
  },
});
kit.act('k_pause', a => { const [k, on] = a.split('|'); jobs.pause(k, on === '1'); kit.redraw(); });
kit.act('k_stop', k => { jobs.stopNow(k); kit.redraw(); });
kit.act('k_move', a => { const [k, d] = a.split('|'); jobs.move(k, +d); kit.redraw(); });
kit.act('all_pause', on => { jobs.pauseAll(on === '1'); kit.redraw(); });
kit.act('jobs_clear', () => { jobs.clearDone(); kit.redraw(); });
kit.act('job_cancel', id => { jobs.cancel(id); kit.redraw(); });
kit.act('job_retry', id => { jobs.retry(id); kit.redraw(); });

// =====================================================================
// 📊 效能頁
// =====================================================================
const TH = ['正常', '微熱', '中等', '嚴重', '危急', '緊急', '關機'];
kit.page({
  id: 'perf', title: '效能', icon: '📊',
  render(el) { el.innerHTML = `<div id="pfCards" class="grid2"></div><div class="card"><b>最近 10 分鐘</b><canvas id="pfChart" height="170"></canvas><div class="small mut"><span style="color:#e51e63">■</span> App CPU %　<span style="color:#4dabf7">■</span> 記憶體使用 %　<span style="color:#fab005">■</span> 電池溫度 °C</div></div>`; },
  refresh(el) {
    const p = perf.cur;
    const card = (t, v, s) => `<div class="card stat"><small class="mut">${t}</small><b>${v}</b><small class="mut">${s || ''}</small></div>`;
    $('#pfCards', el).innerHTML =
      card('App CPU', p.cpu >= 0 ? Math.round(p.cpu) + '%' : '—', `${p.cores || '?'} 核心`) +
      card('記憶體（可用）', p.ramTotal ? fmtSize(p.ramFree) : '—', p.ramTotal ? `共 ${fmtSize(p.ramTotal)}${p.ramLow ? '　⚠ 不夠了' : ''}` : '') +
      card('這個 App 用了', p.appMem ? fmtSize(p.appMem) : '—', '記憶體') +
      card('電池', p.battery >= 0 ? p.battery + '%' : '—', `${p.batTemp ? p.batTemp.toFixed(1) + '°C' : ''}${p.charging ? '　⚡充電中' : ''}${p.powerSave ? '　省電模式' : ''}`) +
      card('手機溫度狀態', p.thermal >= 0 ? TH[p.thermal] || p.thermal : '—', '系統判斷') +
      card('儲存空間（剩）', p.diskTotal ? fmtSize(p.diskFree) : '—', p.diskTotal ? `共 ${fmtSize(p.diskTotal)}` : '') +
      card('網路', p.net ? (p.net.online ? (p.net.wifi ? 'Wi-Fi' : '行動網路') : '離線') : '—', p.net && p.net.metered ? '計量（會算流量）' : '') +
      card('自動讓路', gov.yieldApp ? '讓路中' : (gov.level ? '等級 ' + gov.level : '正常'), esc(gov.yieldApp || gov.why || ''));
    drawChart($('#pfChart', el));
  },
});
function drawChart(cv) {
  if (!cv) return; const w = cv.clientWidth || 300, h = 170; cv.width = w * 2; cv.height = h * 2;
  const g = cv.getContext('2d'); g.scale(2, 2); g.clearRect(0, 0, w, h);
  g.strokeStyle = 'rgba(128,128,128,.25)'; g.lineWidth = 1;
  [0, 25, 50, 75, 100].forEach(v => { const y = h - 10 - v / 100 * (h - 20); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); });
  const H = perf.hist; if (H.length < 2) return;
  const line = (key, color, max) => { g.strokeStyle = color; g.lineWidth = 2; g.beginPath(); H.forEach((p, i) => { const x = i / (H.length - 1) * w, v = Math.max(0, Math.min(max, +p[key] || 0)), y = h - 10 - v / max * (h - 20); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); };
  line('cpu', '#e51e63', 100); line('ram', '#4dabf7', 100); line('temp', '#fab005', 60);
}

// =====================================================================
// 🧪 實驗工作區：kit.LAB_LIST.push(['代號', '名稱', '說明'])；程式裡用 kit.lab('代號') 判斷
// =====================================================================
kit.LAB_LIST = [
  ['yield_apps', '⚖ 讓路名單', '名單上的 App 在前景（例如遊戲、直播）時，所有背景工作先停下來。要先允許「使用情形存取」。'],
];
function labOn(k) { return !!(cfg.get('lab') || {})[k]; }
kit.lab = labOn;
kit.page({
  id: 'lab', title: '實驗工作區', icon: '🧪',
  render(el) {
    el.innerHTML = `<div class="card"><p class="mut">新點子先放這裡，預設都關。用了覺得好，跟 AI 說「把 ○○ 變成正式的」。</p>` +
      kit.LAB_LIST.map(([k, n, d]) => `<label class="srow"><div class="grow"><b>${esc(n)}</b><br><small class="mut">${esc(d)}</small></div><input type="checkbox" class="sw" data-lab="${k}" ${labOn(k) ? 'checked' : ''}></label>`).join('') + '</div>' +
      `<div class="card" id="yieldBox"></div>`;
    $$('[data-lab]', el).forEach(i => i.onchange = () => { const l = Object.assign({}, cfg.get('lab')); l[i.dataset.lab] = i.checked; cfg.set('lab', l); kit.redraw(); });
    drawYield($('#yieldBox', el));
  },
});
function drawYield(box) {
  if (!labOn('yield_apps')) { box.hidden = true; return; }
  const list = cfg.get('yield_apps') || [], env = jcall('env') || {};
  box.innerHTML = `<b>⚖ 讓路名單</b>${N && !env.usage ? `<p class="warn-t">還沒允許「使用情形存取」，看不到前景是哪個 App。<button class="btn sm" data-act="ask_usage">去允許</button></p>` : ''}
    <div>${list.map((a, i) => `<div class="jrow"><span class="grow">${esc(a.name)}<br><small class="mut">${esc(a.pkg)}</small></span><button class="btn sm" data-act="yield_del" data-arg="${i}">移除</button></div>`).join('') || '<p class="mut">名單是空的</p>'}</div>
    <button class="btn" data-act="yield_add">＋ 從手機的 App 挑</button>`;
}
kit.act('ask_usage', () => call('askUsage'));
kit.act('yield_del', i => { const l = (cfg.get('yield_apps') || []).slice(); l.splice(+i, 1); cfg.set('yield_apps', l); kit.redraw(); });
kit.act('yield_add', () => {
  const apps = jcall('apps') || [{ pkg: 'com.example.game', name: '（預覽）範例遊戲' }];
  const c = kit.sheet('挑要讓路的 App', `<input type="search" id="yaQ" placeholder="搜尋"><div id="yaL" class="list"></div>`);
  const draw = () => { const q = $('#yaQ', c).value.trim().toLowerCase(); $('#yaL', c).innerHTML = apps.filter(a => !q || (a.name + a.pkg).toLowerCase().includes(q)).slice(0, 200).map(a => `<button class="li" data-pkg="${esc(a.pkg)}" data-name="${esc(a.name)}">${esc(a.name)}<small class="mut">${esc(a.pkg)}</small></button>`).join(''); };
  $('#yaQ', c).oninput = draw; draw();
  $('#yaL', c).onclick = e => { const b = e.target.closest('[data-pkg]'); if (!b) return; const l = (cfg.get('yield_apps') || []).filter(a => a.pkg !== b.dataset.pkg); l.push({ pkg: b.dataset.pkg, name: b.dataset.name }); cfg.set('yield_apps', l); kit.closeSheet(); kit.redraw(); };
});

// =====================================================================
// ⚙ 設定頁
//   一般的設定一行一個：kit.setting({ sec:'區塊', k:'key', label:'名稱', type:'bool'|'num'|'text'|'select', opts:[[值,'名稱']], help:'說明', remote:true（遠端網頁也能改） })
//   預設值放 kit.DEFAULTS.key
// =====================================================================
kit.SETTINGS = [];
kit.setting = row => kit.SETTINGS.push(row);
[
  { sec: '一般', k: 'cover_on_start', label: '打開 App 先顯示封面', type: 'bool', remote: true },
  { sec: '一般', k: 'idle_cover_min', label: '幾分鐘沒動就回封面', type: 'num', min: 0, max: 120, unit: '分（0＝不要）', remote: true },
  { sec: '一般', k: 'secure_recent', label: '最近使用畫面不顯示內容、不能截圖', type: 'bool' },
  { sec: '一般', k: 'auto_restart', label: '閃退自動重開', type: 'bool', help: '10 分鐘內第 2 次閃退會先暫停全部背景工作，第 3 次就不再重開', remote: true },
  { sec: '一般', k: 'freeze_sec', label: '畫面卡住超過幾秒記到 LOG', type: 'num', min: 1, max: 30, unit: '秒' },
  { sec: '背景', k: 'keep_alive', label: '有背景工作時顯示常駐通知（切到背景才不會被系統關掉）', type: 'bool', remote: true },
  { sec: '背景', k: 'gov_on', label: '⚖ 自動讓路（太熱、電量低、太吃 CPU 時先慢下來）', type: 'bool', remote: true },
  { sec: '背景', k: 'gov_cpu', label: 'App CPU 超過', type: 'num', min: 30, max: 100, unit: '%', remote: true },
  { sec: '背景', k: 'gov_temp', label: '電池溫度超過', type: 'num', min: 35, max: 55, unit: '°C', remote: true },
  { sec: '背景', k: 'gov_thermal', label: '手機溫度狀態到', type: 'select', opts: [[1, '微熱'], [2, '中等'], [3, '嚴重']], remote: true },
  { sec: '背景', k: 'gov_batt', label: '沒充電、電量低於', type: 'num', min: 0, max: 50, unit: '%', remote: true },
  { sec: '背景', k: 'gov_charge_only', label: '只在充電時跑背景工作', type: 'bool', remote: true },
  { sec: '背景', k: 'gov_wifi_only', label: '只在 Wi-Fi 時跑背景工作', type: 'bool', remote: true },
].forEach(kit.setting);
kit.onCfg('auto_restart', v => call('setAutoRestart', !!v));

function rowHtml(r) {
  const v = cfg.get(r.k), id = 'set_' + r.k;
  let input = '';
  if (r.type === 'bool') input = `<input type="checkbox" class="sw" id="${id}" data-set="${r.k}" ${v ? 'checked' : ''}>`;
  else if (r.type === 'num') input = `<input type="number" class="num" id="${id}" data-set="${r.k}" value="${esc(v)}" ${r.min != null ? 'min="' + r.min + '"' : ''} ${r.max != null ? 'max="' + r.max + '"' : ''}><small class="mut">${esc(r.unit || '')}</small>`;
  else if (r.type === 'select') input = `<select id="${id}" data-set="${r.k}">${r.opts.map(([o, n]) => `<option value="${esc(o)}" ${String(o) === String(v) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
  else input = `<input type="text" id="${id}" data-set="${r.k}" value="${esc(v)}">`;
  return `<label class="srow" for="${id}"><div class="grow">${esc(r.label)}${r.help ? `<br><small class="mut">${esc(r.help)}</small>` : ''}</div>${input}</label>`;
}
kit.rowHtml = rowHtml;
function rowValue(r, raw) {
  if (r.type === 'bool') return !!raw;
  if (r.type === 'num') { let n = +raw; if (isNaN(n)) n = DEFAULTS[r.k] || 0; if (r.min != null) n = Math.max(r.min, n); if (r.max != null) n = Math.min(r.max, n); return n; }
  if (r.type === 'select') { const o = r.opts.find(([x]) => String(x) === String(raw)); return o ? o[0] : raw; }
  return String(raw);
}
kit.rowValue = rowValue;
function bindRows(el) {
  $$('[data-set]', el).forEach(i => i.onchange = () => {
    const r = kit.SETTINGS.find(x => x.k === i.dataset.set); if (!r) return;
    kit.lastAct = '設定 ' + r.k;
    cfg.set(r.k, rowValue(r, i.type === 'checkbox' ? i.checked : i.value));
  });
}

kit.page({
  id: 'set', title: '設定', icon: '⚙',
  render(el) {
    const secs = []; kit.SETTINGS.forEach(r => { if (!secs.includes(r.sec)) secs.push(r.sec); });
    el.innerHTML = secs.map(s => `<div class="card"><b>${esc(s)}</b>${kit.SETTINGS.filter(r => r.sec === s).map(rowHtml).join('')}</div>`).join('') +
      `<div class="card" id="permBox"></div><div class="card" id="remoteBox"></div><div class="card" id="cloudBox"></div>
       <div class="card"><b>備份</b><p class="mut small">設定和背景工作清單存在 App 自己的資料夾，熱更新、換外殼都不會動。換手機或重灌前先匯出。</p>
       <div class="row"><button class="btn" data-act="cfg_export">📤 匯出設定</button><button class="btn" data-act="cfg_import">📥 還原設定</button></div></div>`;
    bindRows(el); drawPerm($('#permBox', el)); drawRemote($('#remoteBox', el)); drawCloud($('#cloudBox', el));
  },
});
function drawPerm(box) {
  const e = jcall('env') || {};
  const row = (ok, name, act, help) => `<div class="srow"><div class="grow">${ok ? '✅' : '⚠'} ${name}<br><small class="mut">${help}</small></div>${ok ? '' : `<button class="btn sm" data-act="${act}">設定</button>`}</div>`;
  box.innerHTML = `<b>手機權限</b>${N ? row(e.notify, '通知', 'ask_notify', '背景工作進度、完成通知') +
    row(e.batteryFree, '不要省電限制', 'ask_battery', '長時間背景工作才不會被系統暫停（小米、OPPO 等還要到「省電策略」設成無限制）') +
    row(e.canInstall, '安裝不明應用程式', 'ask_install', '外殼更新（換 APK）要用') : '<p class="mut">（預覽）手機上才看得到</p>'}
    <button class="btn sm" data-act="app_settings">打開這個 App 的系統設定</button>`;
}
kit.act('ask_notify', () => call('askNotify'));
kit.act('ask_battery', () => call('askBatteryFree'));
kit.act('ask_install', () => call('askInstall'));
kit.act('app_settings', () => call('appSettings'));
window.onResume = () => { if (nav.cur === 'set' || nav.cur === 'lab') kit.redraw(); };
window.onPause = () => { jobs.checkpoint(); };

kit.act('cfg_export', () => {
  const name = `${kit.brand.id}_設定_${new Date().toISOString().slice(0, 10)}.json`;
  const text = JSON.stringify({ app: kit.brand.id, ver: kit.uiVer, t: now(), settings: cfg.data, jobs: kit.data.get('jobs', null) }, null, 1);
  const p = call('saveDownload', name, text, 'application/json');
  if (p) kit.toast('存到 ' + p); else if (!N) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text])); a.download = name; a.click(); } else kit.toast('匯出失敗（看 LOG）');
});
kit.act('cfg_import', () => { if (!N) return kit.toast('（預覽）手機上才能選檔案'); call('pickText', 'cfg_import', '*/*'); });
const picked = {};
/** 選檔案回來：kit.onPicked('tag', r => …)；r = {ok, name, text} */
kit.onPicked = (tag, f) => { picked[tag] = f; };
window.onPicked = s => { try { const r = JSON.parse(s); const f = picked[r.tag]; if (f) kit.safe(f, '選檔案 ' + r.tag)(r); } catch (e) { log.err('選檔案', e); } };
kit.onPicked('cfg_import', async r => {
  if (!r.ok) return;
  let d; try { d = JSON.parse(r.text); } catch (e) { kit.toast('這不是設定備份檔'); return; }
  if (!d.settings || (d.app && d.app !== kit.brand.id)) { kit.toast('這不是這個 App 的設定備份'); return; }
  if (!await kit.ask('還原設定？', `備份時間：${fmtTime(d.t)}（畫面 ${esc(d.ver || '')}）<br>目前的設定會被蓋掉。`, '還原')) return;
  cfg.data = d.settings; cfg.save(); if (d.jobs) kit.data.set('jobs', d.jobs);
  log.w('設定已從備份還原：' + r.name); kit.toast('還原好了，重新載入中…'); setTimeout(() => location.reload(), 800);
});

// =====================================================================
// 📡 遠端網頁（用電腦瀏覽器看、控制這個 App）
// =====================================================================
function remotePort() { return +cfg.get('remote_port') || kit.brand.web_port || 8571; }
function drawRemote(box) {
  const st = jcall('remoteStatus') || { on: false, ips: [] };
  const port = remotePort(), pin = cfg.get('remote_pin') || '';
  const urls = (st.ips || []).map(i => `<div class="row"><code class="grow">http://${esc(i.ip)}:${port}</code><small class="mut">${i.tailscale ? 'Tailscale' : esc(i.name)}</small><button class="btn sm" data-act="copy" data-arg="http://${esc(i.ip)}:${port}">複製</button></div>`).join('');
  box.innerHTML = `<b>📡 遠端網頁</b><p class="mut small">在電腦（或別支手機）的瀏覽器打下面的網址，就能看後台、改設定、上傳更新包。同一個 Wi-Fi 才連得到；手機和電腦都裝 Tailscale 的話，用 100. 開頭那個在外面也能連。</p>
    <label class="srow"><div class="grow">開啟${st.on ? '　<span class="tag ok">開著</span>' : ''}</div><input type="checkbox" class="sw" id="rmOn" ${cfg.get('remote_on') ? 'checked' : ''}></label>
    <div class="srow"><div class="grow">埠<br><small class="mut">預設 ${kit.brand.web_port}，不要跟你其他程式撞到</small></div><input type="number" class="num" id="rmPort" value="${port}"></div>
    <div class="srow"><div class="grow">登入 PIN<br><small class="mut">至少 4 碼；錯 5 次鎖 5 分鐘</small></div><input type="text" class="num" id="rmPin" value="${esc(pin)}" inputmode="numeric"></div>
    ${st.on ? urls || '<p class="mut">找不到這支手機的 IP（沒連網？）</p>' : ''}`;
  $('#rmOn', box).onchange = e => { remoteSet(e.target.checked, +$('#rmPort', box).value, $('#rmPin', box).value.trim()); drawRemote(box); };
  $('#rmPort', box).onchange = () => { cfg.set('remote_port', +$('#rmPort', box).value || 0); if (cfg.get('remote_on')) { remoteSet(true); drawRemote(box); } };
  $('#rmPin', box).onchange = () => { cfg.set('remote_pin', $('#rmPin', box).value.trim()); if (cfg.get('remote_on')) { remoteSet(true); drawRemote(box); } };
}
function remoteSet(on, port, pin) {
  if (port) cfg.set('remote_port', port); if (pin != null) cfg.set('remote_pin', pin);
  if (!on) { call('remoteStop'); cfg.set('remote_on', false); keepAlive(); return; }
  const p = cfg.get('remote_pin') || '';
  if (p.length < 4) { kit.toast('先設 4 碼以上的 PIN'); cfg.set('remote_on', false); return; }
  const r = call('remoteStart', remotePort(), p);
  if (r === 'OK') { cfg.set('remote_on', true); kit.toast('遠端網頁開了'); }
  else { cfg.set('remote_on', false); kit.toast(r || '（預覽）手機上才能開'); }
  keepAlive();
}
kit.act('copy', t => { call('copy', t); if (!N && navigator.clipboard) navigator.clipboard.writeText(t); kit.toast('複製了'); });

// =====================================================================
// ⟳ 版本與更新：更新包（手動）、☁ GitHub 雲端更新、熱更新、換回上一版
//   更新包 <前綴>_V0.1.02.zip ＝ manifest.json＋www/…（tools/pack.py 做的）
//   拿到更新包的方法：這頁「選更新包」、在檔案管理／LINE 對 zip 按分享→選這個 App、遠端網頁上傳、雲端
// =====================================================================
const upd = kit.upd = { cloud: null, autoApply: false, last: 0 };
const httpWait = new Map(); let httpSeq = 0;
window.onHttp = s => { try { const r = JSON.parse(s); const w = httpWait.get(r.id); if (w) { httpWait.delete(r.id); w(r); } } catch (e) { log.err('網路回傳', e); } };
/** 網路讀取（不受跨網域限制）：const r = await kit.http(url, {method, body, headers}) → {ok, status, body} */
kit.http = (url, opt) => {
  if (!has('http')) return fetch(url, opt).then(async r => ({ ok: r.ok, status: r.status, body: await r.text() })).catch(e => ({ ok: false, status: 0, body: String(e) }));
  return new Promise(res => { const id = 'h' + (++httpSeq); httpWait.set(id, res); call('http', id, JSON.stringify(Object.assign({ url }, opt || {}))); setTimeout(() => { if (httpWait.has(id)) { httpWait.delete(id); res({ ok: false, status: 0, body: '逾時' }); } }, 90000); });
};
kit.repo = () => String(cfg.get('gh_repo') || kit.brand.github || '').trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/+$/, '');
const repoOk = r => /^[\w.-]+\/[\w.-]+$/.test(r);

/** 檢查雲端：回 {ok, msg, kind:'shell'|'ui'|'none'} */
async function cloudCheck(manual) {
  const repo = kit.repo();
  if (!repoOk(repo)) return { ok: false, msg: '還沒設定 GitHub repo（帳號/repo）' };
  const r = await kit.http(`https://github.com/${repo}/releases/latest/download/update.json`);
  if (!r.ok) return { ok: false, msg: r.status === 404 ? 'repo 裡還沒有發佈的版本（Actions 打包好了沒？repo 是 Public 嗎？）' : `連不到 GitHub（${r.status || r.body}）` };
  let j; try { j = JSON.parse(r.body); } catch (e) { return { ok: false, msg: 'update.json 格式不對' }; }
  if (j.app && j.app !== kit.brand.id) return { ok: false, msg: `這個 repo 是別的程式（${j.app}）` };
  upd.cloud = j; upd.last = now();
  const shell = +call('shell') || 0;
  if (N && +j.shell > shell) {
    if (!manual && cfg.get('cloud_skip') === 'S' + j.shell) return { ok: true, kind: 'none' };
    kit.bar('cloud', `☁ 外殼有新版 S${esc(j.shell)}（現在 S${shell}）<span class="grow"></span><button class="btn sm pri" data-act="cloud_go">⬇ 更新</button><button class="btn sm" data-act="cloud_skip" data-arg="S${esc(j.shell)}">略過這版</button>`, 'info');
    return { ok: true, kind: 'shell', msg: `外殼有新版 S${j.shell}` };
  }
  if (verNum(j.version) > verNum(kit.uiVer)) {
    if (!manual && cfg.get('cloud_skip') === j.version) return { ok: true, kind: 'none' };
    kit.bar('cloud', `☁ 雲端有新版 ${esc(j.version)}（現在 ${esc(kit.uiVer)}）<span class="grow"></span><button class="btn sm pri" data-act="cloud_go">⬇ 更新</button><button class="btn sm" data-act="cloud_notes">改了什麼</button><button class="btn sm" data-act="cloud_skip" data-arg="${esc(j.version)}">略過</button>`, 'info');
    return { ok: true, kind: 'ui', msg: `有新版 ${j.version}` };
  }
  kit.unbar('cloud');
  return { ok: true, kind: 'none', msg: `已經是最新（雲端 ${j.version}${j.shell ? '／S' + j.shell : ''}）` };
}
kit.cloudCheck = cloudCheck;
kit.act('cloud_check', async () => { kit.toast('檢查中…'); const r = await cloudCheck(true); kit.toast(r.msg || '好了', 4000); if (nav.cur === 'upd') kit.redraw(); });
kit.act('cloud_skip', v => { cfg.set('cloud_skip', v); kit.unbar('cloud'); });
kit.act('cloud_notes', () => { const j = upd.cloud || {}; kit.sheet(`${j.version} 改了什麼`, `<ul>${(j.notes || []).map(n => `<li>${esc(n)}</li>`).join('') || '<li>（沒寫）</li>'}</ul>`); });
kit.act('cloud_go', () => {
  const j = upd.cloud; if (!j) return;
  const base = `https://github.com/${kit.repo()}/releases/download/${encodeURIComponent(j.tag)}/`;
  if (N && +j.shell > (+call('shell') || 0)) {
    kit.bar('cloud', '☁ 下載新外殼中…', 'info'); log.upd(`下載外殼 S${j.shell}`);
    call('apkInstall', base + encodeURIComponent(j.apk), j.apk_sha256 || '');
    return;
  }
  kit.bar('cloud', '☁ 下載更新包中…', 'info'); upd.autoApply = true; log.upd(`下載畫面 ${j.version}`);
  if (!N) { kit.toast('（預覽）手機上才能更新'); kit.unbar('cloud'); return; }
  call('updFromUrl', base + encodeURIComponent(j.zip), j.zip_sha256 || '');
});
window.onUpdProg = s => { try { const r = JSON.parse(s); kit.bar('cloud', `☁ 下載中… ${r.pct >= 0 ? r.pct + '%' : fmtSize(r.done)}`, 'info'); } catch (e) {} };
window.onApk = s => {
  try {
    const r = JSON.parse(s);
    if (r.stage === 'dl') kit.bar('cloud', `☁ 下載新外殼… ${r.pct >= 0 ? r.pct + '%' : ''}`, 'info');
    else if (r.ok) kit.bar('cloud', '☁ ' + esc(r.msg || ''), 'ok');
    else kit.bar('cloud', '☁ ' + esc(r.msg || '失敗') + '<span class="grow"></span><button class="btn sm" data-act="cloud_go">再試一次</button>', 'warn');
  } catch (e) { log.err('外殼更新', e); }
};

/** 收到更新包（選檔、分享進來、雲端、遠端上傳）→ 檢查內容 → 問要不要裝 */
window.onUpdInfo = s => {
  let i; try { i = JSON.parse(s); } catch (e) { return; }
  if (i.cancel) return;
  if (i.from === 'cloud' && upd.autoApply) {
    upd.autoApply = false;
    if (i.ok) { kit.bar('cloud', `☁ 換到 ${esc(i.version)} 中…`, 'ok'); setTimeout(() => hotApply(i), 300); return; }
    kit.bar('cloud', '☁ 雲端更新包有問題：' + esc((i.problems || []).join('；')), 'warn'); return;
  }
  if (i.from === 'remote') { kit.bar('upd', `📡 遠端傳來更新包 ${esc(i.version || '')}<span class="grow"></span><button class="btn sm pri" data-act="upd_show">看看</button>`, 'info'); upd.pending = i; return; }
  updSheet(i);
};
kit.act('upd_show', () => { kit.unbar('upd'); updSheet(upd.pending || jcall('updPendingInfo') || {}); });
function updSheet(i) {
  const prob = (i.problems || []);
  const c = kit.sheet('更新包', `<div class="kv"><span>這包的版本</span><b>${esc(i.version || '?')}</b><span>現在的版本</span><b>${esc(i.cur || kit.uiVer)}</b>
      <span>檔案</span><b>${i.files || 0} 個，${fmtSize(i.size)}</b></div>
    ${prob.length ? `<div class="bad-t">不能裝：<ul>${prob.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>` : (i.newer ? '<p class="ok-t">✔ 檢查通過，比現在新</p>' : `<p class="warn-t">⚠ ${i.same ? '跟現在一樣' : '比現在舊'}（還是可以裝，等於換回去）</p>`)}
    ${(i.notes || []).length ? `<b>這版改了什麼</b><ul>${i.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    <div class="row end"><button class="btn" data-act="upd_discard">不要</button>${prob.length ? '' : '<button class="btn" data-act="upd_next">下次開 App 才換</button><button class="btn pri" data-act="upd_hot">⚡ 熱更新</button>'}</div>`);
  upd.pending = i; return c;
}
kit.act('upd_discard', () => { call('updDiscard'); kit.closeSheet(); });
kit.act('upd_hot', () => { kit.closeSheet(); hotApply(upd.pending || {}); });
kit.act('upd_next', () => { const r = call('updApply', 'next') || ''; kit.closeSheet(); kit.toast(r.startsWith('OK') ? '好了，下次打開 App 會換到新版' : r, 4000); });
/** 熱更新：存好背景工作 → 換檔 → 畫面重新載入（工作會接回）。新版 15 秒內沒開好會自動換回 */
function hotApply(i) {
  jobs.checkpoint();
  try { sessionStorage.setItem('kit_after_upd', JSON.stringify({ page: nav.cur, from: kit.uiVer, to: i.version })); } catch (e) {}
  log.upd(`熱更新 ${kit.uiVer} → ${i.version}`);
  const r = call('updApply', 'hot');
  if (r == null) { kit.toast('（預覽）手機上才能熱更新'); return; }
  if (!String(r).startsWith('OK')) { kit.toast(r, 5000); kit.unbar('cloud'); try { sessionStorage.removeItem('kit_after_upd'); } catch (e) {} }
}
kit.hotApply = hotApply;

kit.page({
  id: 'upd', title: '版本與更新', icon: '⟳',
  async render(el) {
    const shell = call('shell'), prev = call('prevVer') || '', built = call('builtinVer') || '';
    el.innerHTML = `<div class="card"><div class="kv"><span>畫面</span><b>${esc(kit.uiVer)}${call('usingLive') ? '（更新包）' : '（APK 內建）'}</b><span>外殼</span><b>${shell ? 'S' + shell : '（預覽）'}</b>
        <span>APK 內建畫面</span><b>${esc(built || '—')}</b><span>上一版</span><b>${esc(prev || '—')}</b></div>
      <div class="row"><button class="btn pri" data-act="upd_pick">📂 選更新包</button><button class="btn" data-act="cloud_check">☁ 檢查雲端更新</button></div>
      <div class="row">${prev ? `<button class="btn sm" data-act="upd_back">↩ 換回上一版 ${esc(prev)}</button>` : ''}${call('usingLive') ? '<button class="btn sm" data-act="upd_builtin">回到 APK 內建的畫面</button>' : ''}</div>
      <p class="mut small">也可以在檔案管理或 LINE 裡對更新包 zip 按「分享」→ 選這個 App。換新版後 15 秒內沒開好，會自動換回原本的。</p></div>
      <div class="card"><b>☁ 雲端</b><div id="updCloud" class="small"></div></div>
      <div class="card"><b>更新紀錄</b><div id="updLog"></div></div>`;
    const j = upd.cloud;
    $('#updCloud', el).innerHTML = !repoOk(kit.repo()) ? '還沒設定（⚙ 設定 → ☁ 雲端更新）' : `repo：${esc(kit.repo())}<br>${j ? `雲端最新：畫面 ${esc(j.version)}　外殼 S${esc(j.shell)}　（${fmtTime(upd.last)} 檢查）` : '還沒檢查'}`;
    let cl = []; try { cl = JSON.parse(await loadText('CHANGELOG.json')); } catch (e) {}
    $('#updLog', el).innerHTML = cl.map(c => `<div class="cl"><b>${esc(c.version)}</b> <small class="mut">${esc(c.date || '')}</small><ul>${(c.notes || []).map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>`).join('') || '<p class="mut">沒有紀錄</p>';
  },
});
kit.act('upd_pick', () => { if (!N) return kit.toast('（預覽）手機上才能選檔案'); call('updPick'); });
kit.act('upd_back', async () => { if (await kit.ask('換回上一版？', `換回 ${esc(call('prevVer'))}，畫面會重新載入。`, '換回')) { jobs.checkpoint(); call('updRollback'); } });
kit.act('upd_builtin', async () => { if (await kit.ask('回到 APK 內建的畫面？', `會換成 ${esc(call('builtinVer'))}，之後的更新包要再裝一次。`, '回到內建')) { jobs.checkpoint(); call('updBuiltin'); } });

// ---------- ⚙ 設定裡的 ☁ 雲端更新、🧭 設定精靈
function drawCloud(box) {
  box.innerHTML = `<b>☁ 雲端更新（GitHub）</b><p class="mut small">設定一次之後：AI 改好推到 GitHub，雲端自動打包，每支手機的 App 自己跳「☁ 有新版」。</p>
    <div class="srow"><div class="grow">GitHub repo<br><small class="mut">帳號/repo，例如 tpc20001/MyApp${kit.brand.github ? '；空白＝用 ' + esc(kit.brand.github) : ''}</small></div><input type="text" id="ghRepo" value="${esc(cfg.get('gh_repo') || '')}" placeholder="${esc(kit.brand.github || '帳號/repo')}"></div>
    <label class="srow"><div class="grow">自動檢查（開 App 1 分鐘後、之後每 6 小時）</div><input type="checkbox" class="sw" id="ghAuto" ${cfg.get('cloud_auto') ? 'checked' : ''}></label>
    <div class="row"><button class="btn" data-act="cloud_test">🔍 測試</button><button class="btn" data-act="wizard">🧭 設定精靈</button><button class="btn" data-act="copy_yml">📋 複製 build.yml</button></div><div id="ghRes" class="small"></div>`;
  $('#ghRepo', box).onchange = e => cfg.set('gh_repo', e.target.value.trim());
  $('#ghAuto', box).onchange = e => cfg.set('cloud_auto', e.target.checked);
}
kit.act('cloud_test', async () => {
  const o = $('#ghRes'); if (o) o.textContent = '測試中…';
  const r = await cloudCheck(true);
  if (o) o.innerHTML = (r.ok ? '✅ ' : '❌ ') + esc(r.msg || '');
});
kit.act('copy_yml', async () => { const t = await loadText('gh_workflow.txt'); if (!t) { kit.toast('找不到 build.yml'); return; } call('copy', t); if (!N && navigator.clipboard) navigator.clipboard.writeText(t); kit.toast('複製好了：GitHub 上 Add file → Create new file → 檔名 .github/workflows/build.yml → 貼上', 6000); });
kit.GUIDE = [
  ['1. 註冊 GitHub', '手機或電腦打開 <b>github.com</b> → Sign up，用 email 註冊（免費）。已經有帳號就跳過。'],
  ['2. 建一個 repo（放程式的地方）', '右上角「＋」→ New repository → Repository name 打程式名稱（英文）→ 選 <b>Public</b> → <b>不要</b>勾 Add a README → Create repository。<br><small>要 Public，App 才能不用密碼下載更新。所以程式碼裡絕對不能放密碼、金鑰。</small>'],
  ['3. 打開打包權限', '在 repo 頁 → Settings → 左邊 Actions → General → 拉到最下面 Workflow permissions → 選 <b>Read and write permissions</b> → Save。'],
  ['4. 放簽章鑰匙（只要一次）', '電腦上點兩下 <b>MAKE_GITHUB_KEY.bat</b>（要先跑過一次 BUILD_AND_INSTALL.bat）。它會開一個記事本，裡面有兩段。<br>repo → Settings → Secrets and variables → Actions → New repository secret：<br>名稱 <code>KEYSTORE_B64</code> 貼第一段；再新增一個 <code>KEYSTORE_PASS</code> 貼第二段。<br>完成後把桌面那個記事本檔刪掉。<br><small>雲端用同一把鑰匙打包，手機才能直接蓋過去更新。</small>'],
  ['5. 把程式放上去', '最簡單：跟 Claude 說「幫我推到 帳號/repo」。<br>自己放：repo 頁 → Add file → Upload files → 把開發包資料夾<b>裡面的東西</b>全部拖進去 → Commit changes。<br>.github 資料夾沒傳上去的話：Add file → Create new file → 檔名打 <code>.github/workflows/build.yml</code> → 按下面「📋 複製 build.yml」貼上 → Commit。'],
  ['6. 等雲端打包', 'repo → Actions：黃色＝打包中（5～10 分鐘）、綠色＝好了、紅色＝點進去把紅字截圖給 Claude。'],
  ['7. 回到這裡', '在「GitHub repo」填 <b>帳號/repo</b> → 按 🔍 測試，出現 ✅ 就完成了。<br>別支手機第一次安裝：到 repo 的 Releases 下載 .apk 安裝。'],
];
kit.act('wizard', () => {
  kit.sheet('🧭 雲端更新設定精靈', kit.GUIDE.map(([t, d]) => `<div class="step"><b>${t}</b><p>${d}</p></div>`).join('') +
    `<div class="row"><button class="btn" data-act="open_url" data-arg="https://github.com">打開 github.com</button><button class="btn" data-act="copy_yml">📋 複製 build.yml</button></div>`, { wide: true });
});
kit.act('open_url', u => { if (!N) return window.open(u); call('openUrl', u); });

// =====================================================================
// 📜 LOG 頁
// =====================================================================
kit.page({
  id: 'log', title: 'LOG', icon: '📜',
  render(el) {
    const files = jcall('logList') || [];
    const cur = sessionStorage.getItem('kit_logf') || 'app_log.txt';
    el.innerHTML = `<div class="card"><div class="row"><select id="lgF">${(files.length ? files : [{ name: 'app_log.txt', size: 0 }]).map(f => `<option value="${esc(f.name)}" ${f.name === cur ? 'selected' : ''}>${esc(f.name)}（${fmtSize(f.size)}）</option>`).join('')}</select>
      <input type="search" id="lgQ" placeholder="篩選" class="grow"></div>
      <div class="row"><button class="btn sm" data-act="log_reload">↻ 重新整理</button><button class="btn sm pri" data-act="log_export">📦 匯出最近 7 天</button><button class="btn sm" data-act="log_clear">清空這個</button></div>
      <p class="mut small">要問 Claude 問題時：按「匯出最近 7 天」→ 傳給 Claude。</p><pre id="lgT" class="logt"></pre></div>`;
    $('#lgF', el).onchange = e => { sessionStorage.setItem('kit_logf', e.target.value); showLog(); };
    $('#lgQ', el).oninput = showLog; showLog();
  },
});
function showLog() {
  const f = $('#lgF') ? $('#lgF').value : 'app_log.txt', q = ($('#lgQ') || {}).value || '';
  let t = call('logTail', f, 300000); if (t == null) t = '（預覽）手機上才有 LOG';
  let lines = t.split('\n'); if (q) lines = lines.filter(l => l.toLowerCase().includes(q.toLowerCase()));
  const o = $('#lgT'); if (o) o.textContent = lines.slice(-1500).reverse().join('\n') || '（空的）';
}
kit.act('log_reload', () => kit.redraw());
kit.act('log_export', () => { if (!N) return kit.toast('（預覽）手機上才能匯出'); call('logExport', 7); });
kit.act('log_clear', async () => { const f = $('#lgF').value; if (await kit.ask('清空 ' + f + '？', '只清這一個檔。', '清空', true)) { call('logClear', f); log.w('清空 LOG：' + f); kit.redraw(); } });

// =====================================================================
// 📖 使用說明：kit.HELP.push(['標題', 'HTML'])（app.js 放自己的說明在最前面）
// =====================================================================
kit.HELP = [
  ['選單', '左上 ☰ 打開選單；點分組名稱可以收起來。右上：📊 效能、🖥 後台、🌙 縮到背景（背景工作照跑）、🏠 封面（不露出內容，點一下回來）。'],
  ['背景工作', '🖥 後台可以暫停、繼續、立刻停、調先後順序。手機太熱、電量低、App 太吃 CPU 時會自動讓路（⚙ 設定 → 背景）。App 畫面關掉也會繼續跑（通知列會有常駐通知）。'],
  ['更新', '⟳ 版本與更新：選更新包 zip、或在檔案管理／LINE 對 zip 按分享→選這個 App。設定好 GitHub 之後，有新版會自己跳「☁ 有新版」。新版開不起來會自動換回舊的。'],
  ['📡 遠端網頁', '⚙ 設定 → 📡 遠端網頁：設 PIN、打開，電腦瀏覽器打上面的網址就能看後台、改設定、上傳更新包。'],
  ['出問題時', '📜 LOG → 📦 匯出最近 7 天 → 傳給 Claude。閃退會自動重開；10 分鐘內閃退兩次會先把背景工作全部暫停。'],
];
kit.page({
  id: 'help', title: '使用說明', icon: '📖',
  render(el) { el.innerHTML = kit.HELP.map(([t, h]) => `<div class="card"><b>${esc(t)}</b><p>${h}</p></div>`).join('') + `<p class="mut small center">${esc(kit.brand.name)}　畫面 ${esc(kit.uiVer)}${N ? '　外殼 S' + call('shell') : ''}</p>`; },
});

// =====================================================================
// 📡 遠端網頁的 API（remote.html 用 fetch('/api/名稱') 叫）
//   加自己的：kit.remote.api('名稱', async (body, query) => ({ … }))
//   遠端首頁的內容：kit.remote.home = async () => ({ cards:[{title, value, sub}], buttons:[{label, act}] })
//                  按鈕按下：kit.remote.homeAct = async act => '回給遠端的訊息'
// =====================================================================
const API = {};
kit.remote = { api: (name, fn) => { API[name] = fn; }, home: null, homeAct: null };
window.__kitRemote = async s => {
  let q; try { q = JSON.parse(s); } catch (e) { return; }
  let res;
  try {
    const f = API[q.path]; let body = {}; try { body = q.body ? JSON.parse(q.body) : {}; } catch (e) {}
    kit.lastAct = '遠端 ' + q.path;
    res = f ? await f(body, q.query) : { ok: false, msg: '沒有這個 API：' + q.path };
  } catch (e) { log.err('遠端 API ' + q.path, e); res = { ok: false, msg: String(e && e.message || e) }; }
  call('remoteReply', q.id, JSON.stringify(res == null ? { ok: true } : res));
};
const jobView = j => ({ id: j.id, kind: j.kind, icon: (KINDS[j.kind] || {}).icon, title: j.title, status: j.status, st: ST[j.status], pct: Math.round(j.pct || 0), msg: j.msg, t: j.t1 || j.t0 || j.t });
API.state = async () => ({
  ok: true, app: kit.brand, ui: kit.uiVer, shell: call('shell'), page: nav.cur,
  gov: { level: gov.level, why: gov.why, yieldApp: gov.yieldApp, line: govLine().replace(/<[^>]+>/g, '') },
  kinds: J.order.filter(k => KINDS[k]).map(k => ({ k, icon: KINDS[k].icon, name: KINDS[k].name, paused: !!J.paused[k], held: held(k), run: jobs.running(k).length, queue: jobs.queued(k).length, cap: capOf(k), mark: J.mark[k] || '' })),
  jobs: J.list.slice(-40).reverse().map(jobView),
  perf: perf.cur, cloud: upd.cloud ? { version: upd.cloud.version, shell: upd.cloud.shell } : null,
});
API.act = async b => {
  const k = b.k;
  switch (b.act) {
    case 'pause': jobs.pause(k, true); break; case 'resume': jobs.pause(k, false); break;
    case 'stop': jobs.stopNow(k); break; case 'move': jobs.move(k, +b.d || 0); break;
    case 'pause_all': jobs.pauseAll(true); break; case 'resume_all': jobs.pauseAll(false); break;
    case 'cancel': jobs.cancel(b.id); break; case 'retry': jobs.retry(b.id); break; case 'clear': jobs.clearDone(); break;
    default: return { ok: false, msg: '不認得：' + b.act };
  }
  log.w('📡 遠端操作：' + b.act + (k ? ' ' + k : ''));
  if (nav.cur === 'bg') kit.redraw();
  return { ok: true };
};
API.perf = async () => ({ ok: true, cur: perf.cur, hist: perf.hist });
API.cfg = async () => ({ ok: true, rows: kit.SETTINGS.filter(r => r.remote).map(r => Object.assign({}, r, { v: cfg.get(r.k) })), lab: kit.LAB_LIST.map(([k, n, d]) => ({ k, n, d, on: labOn(k) })) });
API.cfg_set = async b => {
  const r = kit.SETTINGS.find(x => x.k === b.k && x.remote);
  if (r) { cfg.set(b.k, rowValue(r, b.v)); log.w(`📡 遠端改設定 ${b.k}`); }
  else if (b.lab && kit.LAB_LIST.some(x => x[0] === b.lab)) { const l = Object.assign({}, cfg.get('lab')); l[b.lab] = !!b.v; cfg.set('lab', l); }
  else return { ok: false, msg: '這個不能從遠端改' };
  if (nav.cur === 'set' || nav.cur === 'lab') kit.redraw();
  return { ok: true };
};
API.log = async (b, q) => {
  const name = (new URLSearchParams(q || '')).get('f') || 'app_log.txt';
  return { ok: true, files: jcall('logList') || [], name, text: call('logTail', name, 200000) || '' };
};
API.upd = async () => ({ ok: true, ui: kit.uiVer, shell: call('shell'), prev: call('prevVer') || '', repo: kit.repo(), cloud: upd.cloud, pending: jcall('updPendingInfo') });
API.upd_check = async () => cloudCheck(true);
API.upd_go = async () => { ACTS.cloud_go(); return { ok: true, msg: '開始更新，App 畫面會重新載入' }; };
API.upd_apply = async () => { const i = jcall('updPendingInfo') || {}; if (!i.ok) return { ok: false, msg: (i.problems || ['沒有待裝的更新包']).join('；') }; kit.unbar('upd'); setTimeout(() => hotApply(i), 500); return { ok: true, msg: `換到 ${i.version} 中…（15 秒內沒開好會自動換回）` }; };
API.home = async () => (kit.remote.home ? kit.remote.home() : { cards: [], buttons: [] });
API.home_act = async b => ({ ok: true, msg: kit.remote.homeAct ? await kit.remote.homeAct(b.act) : '' });

// =====================================================================
// 啟動
// =====================================================================
kit.boot = async () => {
  const t0 = now();
  try {
    kit.uiVer = (call('uiVer') || (await loadText('version.txt')) || '').trim();
    try { Object.assign(kit.brand, JSON.parse(await loadText('brand.json'))); } catch (e) { log.err('讀 brand.json', e); }
    document.title = kit.brand.title || kit.brand.name;
    cfg.load(); applyTheme(); fit();
    $('#appTitle').textContent = kit.brand.title || kit.brand.name;
    if (window.APP && typeof APP.init === 'function') await APP.init();     // app.js 的初始化
    await kit.db.init();
    loadJobs();
    const ci = jcall('crashInfo') || {};
    if (ci.pauseAll) {
      jobs.pauseAll(true); call('crashClearPause');
      kit.bar('crash', '⚠ 10 分鐘內閃退了 2 次，背景工作先全部暫停了。看一下 📜 LOG，沒問題再到 🖥 後台按繼續。<span class="grow"></span><button class="btn sm" data-go="bg">去後台</button><button class="btn sm" data-act="unbar" data-arg="crash">知道了</button>', 'warn');
    }
    const notice = call('takeNotice'); if (notice) kit.bar('notice', '⚠ ' + esc(notice).replace(/\n/g, '<br>') + '<span class="grow"></span><button class="btn sm" data-act="unbar" data-arg="notice">知道了</button>', 'warn');
    drawNav();
    let first = 'home';
    try { first = sessionStorage.getItem('kit_page') || 'home'; } catch (e) {}
    kit.go(PAGES[first] ? first : (PAGES.home ? 'home' : pageOrder[0]));
    try {
      const a = JSON.parse(sessionStorage.getItem('kit_after_upd') || 'null');
      if (a) { sessionStorage.removeItem('kit_after_upd'); kit.unbar('cloud'); kit.toast(`已更新到 ${kit.uiVer}`, 3500); log.upd(`熱更新完成：${a.from} → ${kit.uiVer}`); if (a.page && PAGES[a.page]) kit.go(a.page); }
    } catch (e) {}
    if (cfg.get('cover_on_start')) kit.cover(true);
    call('secure', !!cfg.get('secure_recent')); call('freezeMs', Math.round((+cfg.get('freeze_sec') || 2) * 1000)); call('setAutoRestart', !!cfg.get('auto_restart'));
    if (cfg.get('remote_on')) { const r = call('remoteStart', remotePort(), cfg.get('remote_pin') || ''); if (r && r !== 'OK') kit.bar('remote', '📡 遠端網頁開不起來：' + esc(r), 'warn'); }
    samplePerf(); setInterval(kit.safe(() => { samplePerf(); govTick(); }, '效能'), 3000);
    setInterval(kit.safe(yieldTick, '讓路名單'), 5000);
    const auto = () => { if (cfg.get('cloud_auto') && repoOk(kit.repo())) cloudCheck(false).catch(e => log.err('自動檢查更新', e)); };
    setTimeout(auto, 60000); setInterval(auto, 6 * 3600000);
    schedule();
    log.w(`畫面 ${kit.uiVer} 開好了（${now() - t0} ms）`);
    call('ready', kit.uiVer);              // 跟外殼說開好了（沒說的話 15 秒後會自動換回舊版）
  } catch (e) {
    log.err('啟動失敗', e);
    const p = $('#page'); if (p) p.innerHTML = `<div class="card bad"><b>畫面啟動失敗</b><p>${esc(e && e.message)}</p><p class="mut">如果是剛更新的新版，15 秒後會自動換回舊版。</p></div>`;
  }
};
kit.act('unbar', id => kit.unbar(id));
})();
