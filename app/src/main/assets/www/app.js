// YT Download 畫面（熱更新會換掉這個檔）
// 原生那邊：window.YTD。回呼：onProg onDone onInfo onExec onHttp onBrowse onTree onPicked onApk onUpd onCore onShare onShortcut onResume onToast onBack
'use strict';
const UI_VER = 'YTD_UI_V0.1.15';
const N = window.YTD || null;
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem('ytd_' + k) || 'null'); localStorage.setItem('ytd_' + k, JSON.stringify(v)); } catch (e) { return null; } };
const has = f => !!(N && typeof N[f] === 'function');
const call = (f, ...a) => { if (!has(f)) return null; try { return N[f](...a); } catch (e) { return null; } };
const jcall = (f, ...a) => { const r = call(f, ...a); try { return r ? JSON.parse(r) : null; } catch (e) { return null; } };
const newShell = () => has('exec');   // 外殼 V0.1.06 以上才有的功能

// ---------- 更新紀錄（設定 → 關於）
const CHANGELOG = [
  ['YTD_UI_V0.1.14', ['打字就能搜尋 YouTube、Bilibili、SoundCloud，點結果直接解析', '在 App 裡登入網站（Bilibili、IG、FB、X、TikTok…），下載需要登入的內容', '從電腦匯入 cookies.txt（YouTube 登入用）', '選存檔資料夾（可以存到 SD 卡）', '只下載一段、依章節切成多個檔、只抓封面圖、跳過贊助片段', '只用 Wi-Fi、加速下載、限速、代理、自訂參數', '分享進來直接下載、完成震動、長按圖示「貼上下載」', 'App 關掉也繼續下載，重開會接回', 'App 內就能更新外殼 APK；設定和紀錄可以匯出、還原', '紀錄可以刪掉檔案本身']],
  ['YTD_V0.1.06（外殼）', ['下載引擎跟畫面分開，App 關掉也繼續', '登入／瀏覽頁、自選資料夾、APK 自我更新、aria2 加速、萬用指令接口、捷徑、刪檔、網路與權限狀態', '之後大部分新功能都能用畫面更新包加，不用再開電腦']],
  ['YTD_UI_V0.1.13', ['YouTube 解題程式自動從 GitHub 補齊；解析拿不到格式也先顯示標題縮圖']],
  ['YTD_V0.1.05（外殼）', ['下載核心函式庫 0.18.1，內建 QuickJS 引擎（YouTube 一定要有）']],
  ['YTD_UI_V0.1.03～0.1.12', ['黑白新外觀、自動解析、依實際解析度選畫質、15 個平台、佇列、開啟分享、通知、剪貼簿偵測、播放清單、字幕、封面、紀錄搜尋、設定整理、中文錯誤訊息']],
  ['YTD_V0.1.04（外殼）', ['圖示換成 #41']],
];

// ---------- 平台（只用簡稱標籤，不用各家商標）
// ck：登入資料的名字；login：登入頁；dom：要存哪些網域的登入資料
const SITES = [
  { k: 'YouTube', ab: 'YT', re: /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/, home: 'https://m.youtube.com', lv: 'g', note: '影片、Shorts、播放清單、音樂。年齡限制的要登入；Google 可能不讓 App 內登入，就用電腦匯出 cookies.txt。', ck: 'youtube', login: 'https://accounts.google.com/ServiceLogin?continue=https%3A%2F%2Fm.youtube.com', dom: 'youtube.com,www.youtube.com,m.youtube.com,google.com,accounts.google.com', search: 'ytsearch' },
  { k: 'TikTok', ab: 'TT', re: /(^|\.)tiktok\.com$/, home: 'https://www.tiktok.com', lv: 'g', note: '一般影片可以，私人帳號不行。', ck: 'tiktok', login: 'https://www.tiktok.com/login', dom: 'tiktok.com,www.tiktok.com,m.tiktok.com' },
  { k: 'Bilibili', ab: 'B站', re: /(^|\.)(bilibili\.com|b23\.tv|bilibili\.tv)$/, home: 'https://m.bilibili.com', lv: 'g', note: '一般影片可以；登入後才有 1080P 以上，大會員內容要大會員帳號。', ck: 'bilibili', login: 'https://passport.bilibili.com/h5-app/passport/login', dom: 'bilibili.com,www.bilibili.com,m.bilibili.com,passport.bilibili.com', search: 'bilisearch' },
  { k: '抖音', ab: '抖音', re: /(^|\.)(douyin\.com|iesdouyin\.com)$/, home: 'https://www.douyin.com', lv: 'y', note: '常改版失效，失敗先更新核心；登入後比較穩。', ck: 'douyin', login: 'https://www.douyin.com', dom: 'douyin.com,www.douyin.com,iesdouyin.com' },
  { k: 'X', ab: 'X', re: /(^|\.)(x\.com|twitter\.com)$/, home: 'https://x.com', lv: 'g', note: '公開貼文可以；敏感內容要登入。', ck: 'x', login: 'https://x.com/i/flow/login', dom: 'x.com,twitter.com' },
  { k: 'Instagram', ab: 'IG', re: /(^|\.)(instagram\.com|instagr\.am)$/, home: 'https://www.instagram.com', lv: 'y', note: '大多需要登入，登入後就能下載。', ck: 'instagram', login: 'https://www.instagram.com/accounts/login/', dom: 'instagram.com,www.instagram.com' },
  { k: 'Facebook', ab: 'FB', re: /(^|\.)(facebook\.com|fb\.watch)$/, home: 'https://m.facebook.com', lv: 'y', note: '公開影片、Reels 可以；社團、私人的要登入。', ck: 'facebook', login: 'https://m.facebook.com/login', dom: 'facebook.com,www.facebook.com,m.facebook.com' },
  { k: '小紅書', ab: '小紅書', re: /(^|\.)(xiaohongshu\.com|xhslink\.com)$/, home: 'https://www.xiaohongshu.com', lv: 'y', note: '影片筆記可以，時好時壞。', ck: 'xiaohongshu', login: 'https://www.xiaohongshu.com', dom: 'xiaohongshu.com,www.xiaohongshu.com' },
  { k: '微博', ab: '微博', re: /(^|\.)(weibo\.com|weibo\.cn)$/, home: 'https://m.weibo.cn', lv: 'y', note: '部分影片要登入。', ck: 'weibo', login: 'https://passport.weibo.com/sso/signin', dom: 'weibo.com,www.weibo.com,m.weibo.cn,weibo.cn,passport.weibo.com' },
  { k: 'Vimeo', ab: 'VM', re: /(^|\.)vimeo\.com$/, home: 'https://vimeo.com', lv: 'g', note: '公開影片可以。' },
  { k: 'Twitch', ab: 'TW', re: /(^|\.)twitch\.tv$/, home: 'https://m.twitch.tv', lv: 'g', note: '精華片段、VOD 可以；直播會錄到你取消為止。' },
  { k: 'Reddit', ab: 'RD', re: /(^|\.)(reddit\.com|redd\.it)$/, home: 'https://www.reddit.com', lv: 'g', note: '貼文裡的影片可以。' },
  { k: 'SoundCloud', ab: 'SC', re: /(^|\.)soundcloud\.com$/, home: 'https://m.soundcloud.com', lv: 'g', note: '公開音樂可以，建議選 M4A／MP3。', search: 'scsearch' },
  { k: 'Niconico', ab: 'NC', re: /(^|\.)(nicovideo\.jp|nico\.ms)$/, home: 'https://sp.nicovideo.jp', lv: 'y', note: '部分影片要登入。', ck: 'niconico', login: 'https://account.nicovideo.jp/login', dom: 'nicovideo.jp,www.nicovideo.jp,account.nicovideo.jp,sp.nicovideo.jp' },
  { k: 'Dailymotion', ab: 'DM', re: /(^|\.)(dailymotion\.com|dai\.ly)$/, home: 'https://www.dailymotion.com', lv: 'g', note: '公開影片可以。' },
];
const OTHER = { k: '其他', ab: '網址', note: '' };
function siteOf(u) { try { const h = new URL(u).hostname.replace(/^www\./, ''); return SITES.find(s => s.re.test(h)) || OTHER; } catch (e) { return OTHER; } }
const SEARCHERS = SITES.filter(s => s.search);

// YouTube 失敗時依序換的方式（之後 YouTube 改規則，熱更新換這張表就好）
const YT_EJS = ['--remote-components', 'ejs:github'];
const YT_TRIES = [[YT_EJS], [YT_EJS, ['--extractor-args', 'youtube:player_client=tv_simply']], [YT_EJS, ['--extractor-args', 'youtube:player_client=android_vr']], [YT_EJS, ['--extractor-args', 'youtube:player_client=web_safari']], [YT_EJS, ['--extractor-args', 'youtube:player_client=mweb']]];
const triesFor = u => siteOf(u).k === 'YouTube' ? YT_TRIES : [[]];

// ---------- 設定
const DEF = { quality: 'best', conc: 2, subdir: true, playlist: false, tpl: 'title', subs: false, subLang: 'zh-Hant,zh-TW,zh,en', embed: true, sponsor: false,
  auto: true, shareAuto: false, clip: true, cookies: true, notify: true, vibe: true, theme: 'auto', autoCore: true, channel: 'stable',
  wifi: false, aria: false, rate: '', proxy: '', args: '', dest: null, src: 'ytsearch' };
let S = Object.assign({}, DEF, LS('set') || {});
const saveS = () => LS('set', S);
const QUALS = [['best', '最好'], ['2160', '4K'], ['1440', '2K'], ['1080', '1080p'], ['720', '720p'], ['480', '480p'], ['audio', 'M4A', '只要聲音'], ['mp3', 'MP3', '只要聲音'], ['thumb', '封面圖', '只抓圖']];
const TPLS = [['title', '標題'], ['uploader', '作者 - 標題'], ['date', '日期 標題']];
const TPL_STR = { title: '%(title).90B [%(id)s].%(ext)s', uploader: '%(uploader,channel|未知).40B - %(title).80B.%(ext)s', date: '%(upload_date>%Y-%m-%d|)s %(title).90B.%(ext)s' };

// ---------- 小工具
function toast(t, ms) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => el.hidden = true, ms || 2400); }
window.onToast = t => toast(t);
const urlsIn = t => (String(t || '').match(/https?:\/\/[^\s<>"'，。、）)\]]+/g) || []).map(u => u.replace(/[.,;!?]+$/, ''));
const fmtDur = s => { s = Math.round(+s || 0); if (!s) return ''; const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const fmtSize = b => { b = +b || 0; if (b <= 0) return ''; const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; while (b >= 1024 && i < 4) { b /= 1024; i++; } return b.toFixed(i > 1 ? 1 : 0) + ' ' + u[i]; };
const fmtEta = s => { s = +s || 0; if (s <= 0) return ''; return s >= 3600 ? Math.floor(s / 3600) + ' 時 ' + Math.floor(s % 3600 / 60) + ' 分' : s >= 60 ? Math.floor(s / 60) + ' 分 ' + (s % 60) + ' 秒' : s + ' 秒'; };
const fmtTime = t => new Date(t).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const qLabel = m => { const q = QUALS.find(x => x[0] == m); return q ? q[1] : (m + 'p'); };
const thumbImg = (src, cls) => src ? `<img class="${cls || 'thumb'}" src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">` : `<div class="${cls || 'thumb'}"></div>`;
function copyText(t) { if (has('copy')) { N.copy(t); toast('已複製'); return; } try { navigator.clipboard.writeText(t).then(() => toast('已複製'), () => toast('複製失敗')); } catch (e) { toast('複製失敗'); } }
function parseTime(t) { t = String(t || '').trim(); if (!t) return null; if (/^\d+(\.\d+)?$/.test(t)) return +t; const p = t.split(':').map(Number); if (p.some(isNaN)) return NaN; return p.reduce((a, b) => a * 60 + b, 0); }
function splitArgs(s) { const out = []; const re = /"([^"]*)"|'([^']*)'|(\S+)/g; let m; while ((m = re.exec(s || ''))) out.push(m[1] ?? m[2] ?? m[3]); const r = []; for (let i = 0; i < out.length; i++) { if (out[i].startsWith('-') && out[i + 1] !== undefined && !out[i + 1].startsWith('-')) { r.push([out[i], out[i + 1]]); i++; } else r.push([out[i]]); } return r; }
let reqSeq = 0; const pend = {};
function req(kind, fn) { const id = kind + (++reqSeq); pend[id] = fn; return id; }
function settle(id, v) { const f = pend[id]; if (f) { delete pend[id]; f(v); } }
const cookieOk = key => { if (!key || !S.cookies) return false; const c = jcall('cookieInfo', key); return !!(c && c.has); };

// 把 yt-dlp 的英文錯誤翻成白話
function friendly(m, site) {
  m = String(m || '');
  if (site === 'YouTube' && /Requested format is not available|Only images are available|n challenge|JavaScript runtime/i.test(m)) {
    const c = jcall('coreState') || {};
    return c.js ? 'YouTube 沒給影片格式。先到 設定 → 更新下載核心（可換測試版），再試一次。' : 'YouTube 要 JavaScript 引擎才下載得了，請裝外殼 YTD_V0.1.05 以上的 APK。';
  }
  const parts = m.split(/(?=WARNING:|ERROR:)/).map(s => s.trim()).filter(Boolean);
  const errs = parts.filter(s => s.startsWith('ERROR:'));
  const last = (errs.length ? errs[errs.length - 1] : parts[parts.length - 1] || m).replace(/^ERROR:\s*/, '');
  const R = [
    [/Sign in to confirm (your age|you.?re not a bot)/i, 'YouTube 要求登入驗證。到「平台」匯入 YouTube 的 cookies.txt，或過一陣子再試。'],
    [/Private video|This video is private/i, '這是私人影片，沒辦法下載。'],
    [/members-only|Join this channel|premium|大会员|會員/i, '這是會員限定內容，要用有會員的帳號登入。'],
    [/not available in your country|geo.?restrict|not made this video available|地区/i, '這部影片有地區限制。可以在設定填代理伺服器試試。'],
    [/Video unavailable|has been removed|does not exist|HTTP Error 404/i, '影片不存在或已被刪除。'],
    [/Unsupported URL/i, '不支援這個網址。確認是影片頁的網址。'],
    [/Requested format is not available/i, '沒有這個畫質，改選「最好」再試一次。'],
    [/HTTP Error 403|Forbidden/i, '被網站拒絕（403）。先更新下載核心；要登入的網站先到「平台」登入。'],
    [/HTTP Error 400|Precondition check failed/i, '網站拒絕請求（400），通常是規則改了。先更新下載核心。'],
    [/HTTP Error 429|Too Many Requests/i, '下載太頻繁被暫時擋住（429），休息一下再試。'],
    [/login|log in|logged.?in|cookies|authenticat/i, '這個內容需要登入。到「平台」頁按這個網站的「登入」。'],
    [/aria2|libaria2c/i, '加速下載在這個網站失敗了，到設定把「加速下載」關掉再試。'],
    [/Unable to download webpage|timed out|Network is unreachable|Failed to resolve|Connection (reset|refused)|SSL/i, '網路連不上，確認手機有網路（或關掉 VPN）再試。'],
    [/No space left/i, '手機空間不夠了。'],
    [/存檔資料夾打不開|存不進選的資料夾/, '存檔資料夾不能用了，到設定重選，或改回手機的「下載」。'],
    [/下載核心沒載入/, '下載核心沒有載入，請重開 App；還是不行就重裝 APK。'],
  ];
  for (const [re, t] of R) if (re.test(m)) return t;
  return last.slice(0, 220);
}

// ---------- 分頁
const PAGES = ['dl', 'hist', 'sites', 'set'];
function page(p) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.p === p));
  document.querySelectorAll('.pg').forEach(s => s.classList.toggle('on', s.id === 'p_' + p));
  if (p === 'hist') drawHist();
  if (p === 'sites') drawSites();
  if (p === 'set') drawSet();
  window.scrollTo(0, 0);
  LS('page', p);
}
document.querySelectorAll('.tab').forEach(b => b.onclick = () => page(b.dataset.p));
window.onBack = () => {
  if (!$('#browseRow').hidden) { $('#browseRow').hidden = true; return true; }
  const on = document.querySelector('.tab.on'); if (on && on.dataset.p !== 'dl') { page('dl'); return true; } return false;
};

// ---------- 主題
function applyTheme() {
  const r = document.documentElement;
  r.classList.toggle('auto', S.theme === 'auto');
  if (S.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', S.theme);
  const light = S.theme === 'light' || (S.theme === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches);
  call('bars', light ? '#f3f4f6' : '#0b0c0e', light);
}
try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme); } catch (e) {}

// =====================================================================
// 下載頁：輸入 → （搜尋）→ 解析 → 選畫質 → 加入佇列
// =====================================================================
const urlBox = $('#url');
let sel = { q: S.quality, playlist: S.playlist, subs: S.subs, embed: S.embed, sponsor: S.sponsor, chapters: false };
let info = null;
let probeId = '', probeUrl = '', probeK = 0;
function currentUrls() { return [...new Set(urlsIn(urlBox.value))]; }

function onInput() {
  const L = currentUrls(), text = urlBox.value.trim();
  const searching = !L.length && text.length > 1;
  $('#searchBox').hidden = !searching;
  $('#dlOpts').hidden = searching;
  if (searching) { $('#siteTag').textContent = ''; $('#preview').hidden = true; drawSrc(); return; }
  $('#results').innerHTML = '';
  $('#siteTag').textContent = L.length === 1 ? siteOf(L[0]).k : L.length > 1 ? L.length + ' 個網址' : '';
  clearTimeout(onInput.h);
  if (L.length === 1 && L[0] !== probeUrl) { info = null; if (S.auto) onInput.h = setTimeout(() => probe(L[0], 0), 450); else drawPreview(); }
  else if (L.length !== 1) { info = null; probeUrl = ''; drawPreview(); }
  drawQual();
}
urlBox.addEventListener('input', onInput);
urlBox.addEventListener('keydown', e => { if (e.key === 'Enter' && !$('#searchBox').hidden) { e.preventDefault(); doSearch(); } });
$('#bPaste').onclick = () => { const t = call('paste') || ''; if (!t) { toast('剪貼簿是空的'); return; } if (!addUrls(t, true)) { urlBox.value = t.trim(); onInput(); } };
$('#bClear').onclick = () => { urlBox.value = ''; info = null; probeUrl = ''; onInput(); urlBox.focus(); };

function addUrls(text, quiet) {
  const L = urlsIn(text); if (!L.length) { if (!quiet) toast('裡面沒有網址'); return false; }
  const cur = currentUrls(); const add = L.filter(u => !cur.includes(u));
  urlBox.value = [...cur, ...add].join('\n');
  onInput(); return true;
}

// ---- 搜尋（YouTube / Bilibili / SoundCloud）
function drawSrc() {
  $('#srcChips').innerHTML = SEARCHERS.map(s => `<button class="chip" type="button" data-s="${s.search}" aria-pressed="${s.search === S.src}">${esc(s.k)}</button>`).join('');
  $('#srcChips').querySelectorAll('.chip').forEach(b => b.onclick = () => { S.src = b.dataset.s; saveS(); drawSrc(); doSearch(); });
}
$('#bSearch').onclick = () => doSearch();
function doSearch() {
  const q = urlBox.value.trim(); if (q.length < 2) return;
  if (!newShell()) { $('#results').innerHTML = '<p class="empty">搜尋要外殼 YTD_V0.1.06 以上的 APK。</p>'; return; }
  $('#results').innerHTML = '<div class="skel" style="height:56px"></div><div class="skel" style="height:56px"></div><div class="skel" style="height:56px"></div>';
  const src = S.src || 'ytsearch';
  const id = req('s', r => {
    if (!r.ok) { $('#results').innerHTML = `<p class="empty">搜尋失敗：${esc(friendly(r.err))}</p>`; return; }
    let j; try { j = JSON.parse(r.out); } catch (e) { $('#results').innerHTML = '<p class="empty">搜尋結果讀不懂</p>'; return; }
    const E = (j.entries || []).filter(e => e && (e.url || e.id));
    if (!E.length) { $('#results').innerHTML = '<p class="empty">找不到結果，換個關鍵字試試</p>'; return; }
    $('#results').innerHTML = E.map(e => {
      const url = /^https?:/.test(e.url || '') ? e.url : (src === 'ytsearch' ? 'https://www.youtube.com/watch?v=' + e.id : (e.webpage_url || e.url || ''));
      const th = (e.thumbnails && e.thumbnails.length ? e.thumbnails[e.thumbnails.length - 1].url : e.thumbnail) || (src === 'ytsearch' ? `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg` : '');
      return `<button class="res" type="button" data-u="${esc(url)}">${thumbImg(th)}<span class="res-b"><span class="res-t">${esc(e.title || url)}</span><span class="res-m">${esc([e.channel || e.uploader, fmtDur(e.duration), e.view_count ? Number(e.view_count).toLocaleString('zh-TW') + ' 次觀看' : ''].filter(Boolean).join(' · '))}</span></span></button>`;
    }).join('');
  });
  call('exec', id, `${src}15:${q}`, JSON.stringify({ args: [['--flat-playlist'], ['--dump-single-json'], ['--no-warnings']] }));
}
$('#results').onclick = e => { const b = e.target.closest('.res'); if (!b) return; urlBox.value = b.dataset.u; onInput(); };
window.onExec = s => { const r = JSON.parse(s); settle(r.id, r); };

// ---- 逛網站
$('#bBrowse').onclick = () => {
  const row = $('#browseRow'); row.hidden = !row.hidden; if (row.hidden) return;
  if (!has('browse')) { row.innerHTML = '<span class="mut small">逛網站要外殼 YTD_V0.1.06 以上的 APK。</span>'; return; }
  row.innerHTML = SITES.slice(0, 10).map(s => `<button class="chip" type="button" data-h="${esc(s.home)}">${esc(s.k)}</button>`).join('');
  row.querySelectorAll('.chip').forEach(b => b.onclick = () => { row.hidden = true; N.browse(b.dataset.h, 'browse', '', ''); });
};
window.onBrowse = s => {
  const r = JSON.parse(s);
  if (r.mode === 'login') { toast(r.saved ? `已登入（存了 ${r.count} 筆登入資料）` : '沒有抓到登入資料，確認有登入成功再按「完成登入」', 3500); drawSites(); return; }
  page('dl'); if (r.url && !addUrls(r.url, true)) toast('這頁沒有網址');
};

// ---- 解析
function probeSpec(u, k) { const st = siteOf(u); return JSON.stringify({ args: [...(triesFor(u)[k] || []), ['--ignore-no-formats-error']], cookies: cookieOk(st.ck) ? st.ck : '' }); }
function probe(u, k) {
  probeUrl = u; probeK = k; probeId = 'p' + Date.now();
  info = { loading: true, url: u }; drawPreview(); drawQual();
  if (!has('probe')) { info = null; drawPreview(); return; }
  if (newShell()) N.probe(probeId, u, probeSpec(u, k));
  else N.probe(probeId, u, JSON.stringify([...(triesFor(u)[k] || []), ['--ignore-no-formats-error']]));
}
window.onInfo = s => {
  const p = JSON.parse(s); if (p.id !== probeId) return;
  if (!p.ok && probeK + 1 < triesFor(probeUrl).length) { probe(probeUrl, probeK + 1); return; }
  info = p.ok ? Object.assign(p, { url: probeUrl, k: probeK }) : { err: friendly(p.msg, siteOf(probeUrl).k), url: probeUrl };
  if (p.ok && p.isList) sel.playlist = S.playlist;
  sel.chapters = false;
  drawPreview(); drawQual();
};
function drawPreview() {
  const el = $('#preview'), L = currentUrls();
  if (L.length > 1) { el.hidden = false; el.innerHTML = `<div class="pv-b"><div class="pv-t">${L.length} 個網址</div><div class="pv-m">${[...new Set(L.map(u => siteOf(u).ab))].map(a => `<span class="badge">${esc(a)}</span>`).join('')}<span>全部用下面選的畫質下載</span></div></div>`; return; }
  if (!info) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  if (info.loading) { el.innerHTML = `<div class="thumb"></div><div class="pv-b" style="flex:1"><div class="skel" style="width:90%"></div><div class="skel" style="width:60%"></div><div class="pv-m">解析中…</div></div>`; return; }
  if (info.err) { el.innerHTML = `<div class="pv-b"><div class="pv-err">解析失敗：${esc(info.err)}</div><div class="pv-m">還是可以直接按下載試試看。<button class="link" type="button" id="reProbe">再解析一次</button></div></div>`; $('#reProbe').onclick = () => probe(info.url, 0); return; }
  const st = siteOf(info.url);
  const noFmt = st.k === 'YouTube' && !info.isList && (!info.heights || !info.heights.length);
  const ch = (info.chapters || []).length;
  el.innerHTML = `${thumbImg(info.thumb)}<div class="pv-b"><div class="pv-t">${esc(info.title || '（沒有標題）')}</div>
    <div class="pv-m"><span class="badge">${esc(st.ab)}</span>${info.uploader ? `<span>${esc(info.uploader)}</span>` : ''}${info.dur ? `<span>${fmtDur(info.dur)}</span>` : ''}${info.isList ? `<span>清單 ${info.count} 部</span>` : ''}${ch ? `<span>${ch} 個章節</span>` : ''}${info.live ? '<span class="ok-t">直播中</span>' : ''}${cookieOk(st.ck) ? '<span class="ok-t">已登入</span>' : ''}</div>
    ${info.live ? '<div class="pv-m">直播會一直錄，按「取消」才會停。</div>' : ''}
    ${noFmt ? `<div class="pv-err">${esc(friendly('Requested format is not available', 'YouTube'))}</div>` : ''}</div>`;
}
function availQuals() {
  if (!info || !info.heights || !info.heights.length) return QUALS;
  const max = info.heights[0];
  return QUALS.filter(q => isNaN(+q[0]) || (+q[0] <= max && info.heights.some(h => (h >= +q[0] * 0.9 && h <= +q[0] * 1.1) || (+q[0] === 2160 && h >= 2000))));
}
function drawQual() {
  const Q = availQuals();
  if (!Q.some(q => q[0] == sel.q)) { const f = Q.find(q => !isNaN(+q[0]) && +q[0] <= +S.quality); sel.q = f ? f[0] : 'best'; }
  $('#qual').innerHTML = Q.map(q => `<button class="chip" type="button" data-q="${q[0]}" aria-pressed="${q[0] == sel.q}">${q[1]}${q[2] ? `<small>${q[2]}</small>` : ''}</button>`).join('');
  $('#qual').querySelectorAll('.chip').forEach(b => b.onclick = () => { sel.q = b.dataset.q; drawQual(); });
  const isAudio = sel.q === 'audio' || sel.q === 'mp3', isThumb = sel.q === 'thumb';
  const L = currentUrls(), yt = L.length === 1 ? siteOf(L[0]).k === 'YouTube' : L.some(u => siteOf(u).k === 'YouTube');
  const opts = [];
  if (info && info.isList) opts.push(['playlist', `整個清單（${info.count} 部）`]);
  if (!isAudio && !isThumb) opts.push(['subs', '字幕' + (info && info.ok && !info.hasSubs ? '（可能沒有）' : '')]);
  if (!isThumb) opts.push(['embed', '寫入封面']);
  $('#optRow').innerHTML = opts.map(o => `<button class="chip" type="button" data-o="${o[0]}" aria-pressed="${!!sel[o[0]]}">${sel[o[0]] ? '✓ ' : ''}${esc(o[1])}</button>`).join('');
  $('#optRow').querySelectorAll('.chip').forEach(b => b.onclick = () => { sel[b.dataset.o] = !sel[b.dataset.o]; drawQual(); });
  const more = [];
  if (yt && !isThumb) more.push(['sponsor', '跳過贊助片段']);
  if (!isThumb) more.push(['chapters', '依章節切成多個檔' + (info && info.ok && !(info.chapters || []).length ? '（這部沒有章節）' : '')]);
  $('#moreChips').innerHTML = more.map(o => `<button class="chip" type="button" data-o="${o[0]}" aria-pressed="${!!sel[o[0]]}">${sel[o[0]] ? '✓ ' : ''}${esc(o[1])}</button>`).join('');
  $('#moreChips').querySelectorAll('.chip').forEach(b => b.onclick = () => { sel[b.dataset.o] = !sel[b.dataset.o]; drawQual(); });
  $('#bGo').textContent = L.length > 1 ? `下載 ${L.length} 個（${qLabel(sel.q)}）` : `下載 ${qLabel(sel.q)}`;
}

$('#bGo').onclick = () => {
  const L = currentUrls(); if (!L.length) { toast('先貼上網址'); urlBox.focus(); return; }
  const a = parseTime($('#secFrom').value), b = parseTime($('#secTo').value);
  if (Number.isNaN(a) || Number.isNaN(b) || (a != null && b != null && b <= a)) { toast('片段時間看不懂，例如 1:20 到 2:45'); $('#more').open = true; return; }
  const section = (a != null || b != null) ? `*${a != null ? a : 0}-${b != null ? b : 'inf'}` : '';
  if (S.notify && !LS('askedNotify')) { call('askNotify'); LS('askedNotify', 1); }
  L.forEach(u => enqueue(u, sel.q, L.length === 1 ? info : null, { section, sponsor: sel.sponsor, chapters: sel.chapters }));
  urlBox.value = ''; info = null; probeUrl = ''; $('#secFrom').value = ''; $('#secTo').value = ''; sel.chapters = false; sel.sponsor = S.sponsor;
  onInput();
  toast(L.length > 1 ? `已加入 ${L.length} 個` : '已加入下載');
};

// ---- 剪貼簿、分享、捷徑
let clipU = '';
function checkClip() {
  if (!S.clip || !has('paste')) return;
  const L = urlsIn(N.paste()); if (!L.length) return;
  const u = L[0];
  if (u === LS('lastClip') || currentUrls().includes(u) || Q.some(j => j.url === u)) return;
  clipU = u; $('#clipUrl').textContent = u; $('#clipBar').hidden = false;
}
window.onResume = () => { setTimeout(checkClip, 450); refreshEnv(); pump(); };
$('#clipAdd').onclick = () => { LS('lastClip', clipU); $('#clipBar').hidden = true; page('dl'); addUrls(clipU); };
$('#clipNo').onclick = () => { LS('lastClip', clipU); $('#clipBar').hidden = true; };
window.onShare = t => {
  page('dl'); const L = urlsIn(t);
  if (!L.length) { toast('分享的內容裡沒有網址'); return; }
  if (S.shareAuto) { L.forEach(u => enqueue(u, S.quality, null, { sponsor: S.sponsor })); toast(L.length > 1 ? `已開始下載 ${L.length} 個` : '已開始下載'); }
  else addUrls(t);
};
window.onShortcut = k => {
  if (k === 'paste') { page('dl'); const t = call('paste') || ''; if (S.shareAuto && urlsIn(t).length) window.onShare(t); else if (!addUrls(t, true)) toast('剪貼簿裡沒有網址'); }
  else if (k === 'browse') { page('dl'); $('#bBrowse').click(); }
};

// =====================================================================
// 佇列（會存起來，App 關掉再開會接回）
// =====================================================================
const Q = [];
let seq = 0;
const KEEP = ['id', 'pid', 'url', 'q', 'site', 'ab', 'title', 'thumb', 'playlist', 'subs', 'embed', 'sponsor', 'chapters', 'section', 'k', 'state', 'pct', 'files', 'msg', 't'];
function saveQ() { LS('queue', Q.slice(0, 60).map(j => { const o = {}; KEEP.forEach(k => o[k] = j[k]); return o; })); }
function enqueue(url, q, inf, x) {
  x = x || {};
  const st = siteOf(url);
  const j = { id: 'j' + Date.now() + '_' + (seq++), url, q, site: st.k, ab: st.ab, title: inf && inf.ok ? inf.title : '', thumb: inf && inf.ok ? inf.thumb : '',
    playlist: !!(inf && inf.isList && sel.playlist), subs: !!(sel.subs && !['audio', 'mp3', 'thumb'].includes(q)), embed: !!(sel.embed && q !== 'thumb'),
    sponsor: !!(x.sponsor && st.k === 'YouTube' && q !== 'thumb'), chapters: !!(x.chapters && q !== 'thumb'), section: x.section || '',
    k: inf && inf.ok ? (inf.k || 0) : 0, state: 'wait', pct: 0, t: Date.now() };
  Q.unshift(j); drawCard(j); pump(); saveQ();
}
const running = () => Q.filter(j => j.state === 'run').length;
let netWait = false;
function pump() {
  if (S.wifi && has('netInfo')) {
    const n = jcall('netInfo') || {};
    netWait = !!(n.metered || !n.wifi);
    if (netWait && Q.some(j => j.state === 'wait')) { Q.filter(j => j.state === 'wait').forEach(drawCard); counts(); return; }
  } else netWait = false;
  while (running() < S.conc) { const n = [...Q].reverse().find(j => j.state === 'wait'); if (!n) break; startJob(n); }
  counts();
}
setInterval(() => { if (netWait) pump(); }, 20000);

function argsFor(j) {
  const a = [...(triesFor(j.url)[j.k] || [])];
  if (j.q === 'thumb') { a.push(['--skip-download'], ['--write-thumbnail'], ['--convert-thumbnails', 'jpg']); return a.concat(globalArgs()); }
  if (j.subs) { a.push(['--write-subs'], ['--sub-langs', S.subLang || 'zh.*,en'], ['--convert-subs', 'srt']); if (j.embed) a.push(['--embed-subs']); }
  if (j.embed) a.push(['--embed-thumbnail'], ['--embed-metadata']);
  if (j.sponsor) a.push(['--sponsorblock-remove', 'sponsor,selfpromo,interaction']);
  if (j.chapters) a.push(['--split-chapters'], ['-o', 'chapter:%(title).60B - %(section_number)02d %(section_title).60B.%(ext)s']);
  if (j.section) a.push(['--download-sections', j.section], ['--force-keyframes-at-cuts']);
  return a.concat(globalArgs());
}
function globalArgs() {
  const a = [];
  if (S.rate) a.push(['--limit-rate', S.rate.trim()]);
  if (S.proxy) a.push(['--proxy', S.proxy.trim()]);
  if (S.args) a.push(...splitArgs(S.args));
  return a;
}
function startJob(j) {
  j.state = 'run'; j.pct = 0; j.stage = '準備中…'; j.pid = j.id + '~' + j.k; j.size = j.speed = j.eta = j.item = '';
  const st = siteOf(j.url);
  const spec = { id: j.pid, url: j.url, mode: j.q === 'thumb' ? 'none' : j.q, args: argsFor(j), sub: S.subdir ? j.site : '', playlist: j.playlist,
    tpl: (j.playlist ? '%(playlist_index|)s ' : '') + (TPL_STR[S.tpl] || TPL_STR.title), title: j.title, notify: S.notify,
    dest: S.dest && S.dest.uri ? S.dest.uri : '', cookies: cookieOk(st.ck) ? st.ck : '', aria2: !!(S.aria && !j.section && !j.chapters) };
  drawCard(j); saveQ();
  if (has('job')) N.job(JSON.stringify(spec));
  else if (has('downloadEx')) N.downloadEx(j.pid, j.url, spec.mode, JSON.stringify(spec.args));
  else setTimeout(() => window.onDone(JSON.stringify({ id: j.pid, ok: false, msg: '要在 App 裡才能下載' })), 300);
}
const byPid = pid => Q.find(j => j.pid === pid);

let fgLast = 0;
window.onProg = s => {
  const p = JSON.parse(s), j = byPid(p.id); if (!j || j.state !== 'run') return;
  const line = String(p.line || '');
  if (p.pct > 0) j.pct = p.pct;
  if (p.eta > 0) j.eta = p.eta;
  let m;
  if ((m = line.match(/of\s+~?\s*([\d.]+\s*[KMG]i?B)/))) j.size = m[1].replace('i', '');
  if ((m = line.match(/at\s+([\d.]+\s*[KMG]i?B\/s)/))) j.speed = m[1].replace('i', '');
  if ((m = line.match(/Downloading item (\d+) of (\d+)/))) j.item = m[1] + '/' + m[2];
  if ((m = line.match(/DL:([\d.]+[KMG]i?B)/))) j.speed = m[1].replace('i', '') + '/s';
  j.stage = /\[Merger\]|Merging/.test(line) ? '合併影像和聲音…' : /ExtractAudio/.test(line) ? '轉成 MP3…' : /SponsorBlock|ModifyChapters/.test(line) ? '剪掉贊助片段…' : /SplitChapters/.test(line) ? '依章節切檔…' : /EmbedThumbnail|EmbedSubtitle|Metadata/.test(line) ? '寫入封面和資訊…' : /\[download\]|DL:/.test(line) ? '' : (p.pct > 0 ? '' : '連線中…');
  if (!j.title) { const t = line.match(/Destination: (?:.*\/)?(.+?)\.[a-z0-9]+$/i); if (t) j.title = t[1].replace(/\s\[[\w-]{6,}\]$/, ''); }
  drawCard(j);
  if (Date.now() - fgLast > 2000) { fgLast = Date.now(); const r = Q.filter(x => x.state === 'run'); call('fgText', r.map(x => `${(x.title || x.site).slice(0, 18)} ${x.pct ? Math.round(x.pct) + '%' : ''}`).join('、')); }
};
window.onDone = s => {
  const p = typeof s === 'string' ? JSON.parse(s) : s, j = byPid(p.id); if (!j) return;
  if (!p.ok && !j.stop && p.msg !== '已取消' && j.k + 1 < triesFor(j.url).length && !/Private|unavailable|removed|Unsupported|No space|login|cookies|資料夾/i.test(p.msg || '')) {
    j.k++; j.stage = `換方式重試（${j.k + 1}/${triesFor(j.url).length}）…`; startJob(j); return;
  }
  j.state = p.ok ? 'ok' : (p.msg === '已取消' ? 'cancel' : 'bad');
  j.files = p.files || []; j.msg = p.ok ? '' : (p.msg === '已取消' ? '已取消' : friendly(p.msg, j.site)); j.raw = p.msg || '';
  if (!j.title && j.files[0]) j.title = j.files[0].name.replace(/\.[^.]+$/, '');
  if (j.state !== 'cancel') saveHist(j);
  if (p.ok && S.vibe) call('vibrate', 60);
  drawCard(j); saveQ(); pump();
};

function stText(j) {
  if (j.state === 'run') return j.stage || [j.pct ? j.pct.toFixed(1) + '%' : '', j.size, j.speed, j.eta ? '剩 ' + fmtEta(j.eta) : '', j.item ? '第 ' + j.item + ' 部' : ''].filter(Boolean).join(' · ');
  if (j.state === 'wait') return netWait ? '等 Wi-Fi（設定裡開了只用 Wi-Fi）' : '等前面的下載完';
  if (j.state === 'ok') return '已存到 ' + (j.files[0] ? j.files[0].path : '') + (j.files.length > 1 ? `（共 ${j.files.length} 個檔）` : '');
  return j.msg;
}
function cardHTML(j) {
  const stateTxt = { wait: netWait ? '等 Wi-Fi' : '排隊中', run: '下載中', ok: '完成', bad: '失敗', cancel: '已取消' }[j.state];
  const stateCls = { run: 'run', ok: 'ok', bad: 'bad' }[j.state] || '';
  let acts = '';
  if (j.state === 'run' || j.state === 'wait') acts = `<button class="btn ghost" data-a="cancel" type="button">取消</button>`;
  else if (j.state === 'ok') acts = `<button class="btn" data-a="open" type="button">開啟</button><button class="btn ghost" data-a="share" type="button">分享</button><button class="btn ghost" data-a="x" type="button">移除</button>`;
  else acts = `<button class="btn" data-a="retry" type="button">重試</button>${j.state === 'bad' ? '<button class="btn ghost" data-a="detail" type="button">詳細</button>' : ''}<button class="btn ghost" data-a="x" type="button">移除</button>`;
  const tags = [qLabel(j.q), j.playlist ? '清單' : '', j.section ? '片段' : '', j.chapters ? '章節' : '', j.sponsor ? '跳贊助' : ''].filter(Boolean);
  return `${thumbImg(j.thumb)}<div class="cb">
    <div class="ct">${esc(j.title || j.url)}</div>
    <div class="cm"><span class="badge">${esc(j.ab)}</span><span class="state ${stateCls}">${stateTxt}</span>${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>
    <div class="bar"><i style="width:${j.state === 'run' ? Math.max(2, j.pct || 0) : 100}%"></i></div>
    <div class="st">${esc(stText(j))}</div>
    <div class="acts">${acts}</div></div>`;
}
function drawCard(j) {
  let el = document.getElementById(j.id);
  if (!el) { el = document.createElement('div'); el.id = j.id; $('#queue').prepend(el); el.onclick = e => { const b = e.target.closest('[data-a]'); if (b) act(j, b.dataset.a); }; }
  el.className = 'card ' + ({ ok: 'ok', bad: 'bad', cancel: 'bad', wait: 'wait' }[j.state] || '');
  if (j.state === 'run' && el.dataset.st === 'run') {   // 進度更新只換會變的地方，縮圖不閃
    el.querySelector('.bar i').style.width = Math.max(2, j.pct || 0) + '%';
    el.querySelector('.st').textContent = stText(j);
    const ct = el.querySelector('.ct'); if (j.title && ct.textContent !== j.title) ct.textContent = j.title;
  } else el.innerHTML = cardHTML(j);
  el.dataset.st = j.state;
  counts();
}
function openF(f) { if (!f) return; if (has('fileExists') && f.uri && !N.fileExists(f.uri)) { toast('檔案已經被刪除或搬走了'); return; } has('openFile') ? N.openFile(f.uri, f.mime || '') : toast('這版外殼不支援，請更新 APK'); }
function shareF(f) { if (!f) return; has('shareFile') ? N.shareFile(f.uri, f.mime || '') : toast('這版外殼不支援，請更新 APK'); }
function act(j, a) {
  const f = (j.files || [])[0];
  if (a === 'cancel') { j.stop = 1; if (j.state === 'wait') { j.state = 'cancel'; j.msg = '已取消'; drawCard(j); saveQ(); } else call('cancel', j.pid); }
  else if (a === 'open') openF(f);
  else if (a === 'share') shareF(f);
  else if (a === 'retry') { j.k = 0; j.stop = 0; j.state = 'wait'; j.msg = ''; drawCard(j); pump(); saveQ(); }
  else if (a === 'detail') toast(String(j.raw || j.msg).slice(-300), 7000);
  else if (a === 'x') { const i = Q.indexOf(j); if (i >= 0) Q.splice(i, 1); const el = document.getElementById(j.id); if (el) el.remove(); counts(); saveQ(); }
}
$('#bClearDone').onclick = () => { [...Q].forEach(j => { if (['ok', 'bad', 'cancel'].includes(j.state)) act(j, 'x'); }); };
function counts() {
  const active = Q.filter(j => j.state === 'run' || j.state === 'wait').length;
  $('#qCount').textContent = Q.length ? `${running()} 個在跑 · ${Q.filter(j => j.state === 'wait').length} 個排隊` : '';
  $('#qEmpty').hidden = Q.length > 0;
  $('#bClearDone').hidden = !Q.some(j => ['ok', 'bad', 'cancel'].includes(j.state));
  const b = $('#tabBadge'); b.hidden = !active; b.textContent = active;
}

// 開啟時接回：存起來的佇列 + 引擎還在跑的工作 + 畫面不在時錯過的結果
function restore() {
  const saved = LS('queue') || [];
  const live = new Set((jcall('jobsState') || []).map(x => x.id));
  saved.reverse().forEach(o => { if (Q.some(j => j.id === o.id)) return; const j = Object.assign({}, o); Q.unshift(j); });
  const missed = jcall('drain') || [];
  Q.forEach(j => { if (j.state === 'run' && !live.has(j.pid) && !missed.some(m => m.fn === 'onDone' && (JSON.parse(m.arg).id === j.pid))) { j.state = 'bad'; j.msg = 'App 被關掉時中斷了，按重試'; } });
  [...Q].reverse().forEach(drawCard);
  missed.forEach(m => { try { if (typeof window[m.fn] === 'function') window[m.fn](m.arg); } catch (e) {} });
  saveQ();
}

// =====================================================================
// 紀錄
// =====================================================================
let hFilter = '全部', hAsk = -1;
function saveHist(j) {
  const H = LS('hist') || [];
  H.unshift({ t: Date.now(), u: j.url, title: j.title, thumb: j.thumb, site: j.site, ab: j.ab, q: j.q, ok: j.state === 'ok', msg: j.msg, files: (j.files || []).slice(0, 20) });
  LS('hist', H.slice(0, 400));
}
function drawHist() {
  const H = LS('hist') || [], kw = $('#hSearch').value.trim().toLowerCase();
  const sites = ['全部', ...new Set(H.map(h => h.site || '其他'))];
  if (!sites.includes(hFilter)) hFilter = '全部';
  $('#hSites').innerHTML = sites.length > 2 ? sites.map(s => `<button class="chip" type="button" data-s="${esc(s)}" aria-pressed="${s === hFilter}">${esc(s)}</button>`).join('') : '';
  $('#hSites').querySelectorAll('.chip').forEach(b => b.onclick = () => { hFilter = b.dataset.s; drawHist(); });
  const L = H.map((h, i) => Object.assign({ i }, h)).filter(h => (hFilter === '全部' || (h.site || '其他') === hFilter) && (!kw || (h.title || '').toLowerCase().includes(kw) || (h.u || '').toLowerCase().includes(kw)));
  $('#hCount').textContent = H.length ? `${L.length} / ${H.length} 筆` : '';
  $('#bHClr').hidden = !H.length;
  $('#hist').innerHTML = L.length ? L.map(h => {
    const f = h.files && h.files[0], total = (h.files || []).reduce((a, x) => a + (+x.size || 0), 0);
    return `<div class="card ${h.ok ? 'ok' : 'bad'}${h.gone ? ' gone' : ''}" data-i="${h.i}">${thumbImg(h.thumb)}<div class="cb">
      <div class="ct">${esc(h.title || h.u)}</div>
      <div class="cm"><span class="badge">${esc(h.ab || '網址')}</span><span>${fmtTime(h.t)}</span><span>${esc(qLabel(h.q || 'best'))}</span>${total ? `<span>${fmtSize(total)}</span>` : ''}${(h.files || []).length > 1 ? `<span>${h.files.length} 個檔</span>` : ''}</div>
      ${h.gone ? '<div class="st mut">檔案已刪除</div>' : h.ok ? '' : `<div class="st">${esc(h.msg || '失敗')}</div>`}
      ${hAsk === h.i ? `<div class="ask"><span>刪掉手機裡的檔案？刪了就找不回來。</span><button class="btn sm danger" data-a="delYes" type="button">刪掉</button><button class="btn sm ghost" data-a="delNo" type="button">取消</button></div>` : ''}
      <div class="acts">${h.ok && f && !h.gone ? '<button class="btn" data-a="open" type="button">開啟</button><button class="btn ghost" data-a="share" type="button">分享</button>' : ''}<button class="btn ghost" data-a="again" type="button">再下載</button><button class="btn ghost" data-a="copy" type="button">複製連結</button>${h.ok && f && !h.gone && has('deleteFile') ? '<button class="btn ghost" data-a="delFile" type="button">刪檔案</button>' : ''}<button class="btn ghost" data-a="del" type="button">刪紀錄</button></div>
    </div></div>`;
  }).join('') : `<p class="empty">${H.length ? '沒有符合的紀錄' : '還沒有下載紀錄'}</p>`;
}
$('#hist').onclick = e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const i = +b.closest('.card').dataset.i, H = LS('hist') || [], h = H[i]; if (!h) return;
  const a = b.dataset.a, f = (h.files || [])[0];
  if (a === 'open') openF(f);
  else if (a === 'share') shareF(f);
  else if (a === 'again') { page('dl'); addUrls(h.u); }
  else if (a === 'copy') copyText(h.u);
  else if (a === 'del') { H.splice(i, 1); LS('hist', H); hAsk = -1; drawHist(); }
  else if (a === 'delFile') { hAsk = i; drawHist(); }
  else if (a === 'delNo') { hAsk = -1; drawHist(); }
  else if (a === 'delYes') { let n = 0; (h.files || []).forEach(x => { if (x.uri && N.deleteFile(x.uri)) n++; }); h.gone = true; LS('hist', H); hAsk = -1; drawHist(); toast(n ? `刪掉 ${n} 個檔案` : '檔案可能已經不在了'); }
};
$('#hSearch').addEventListener('input', drawHist);
$('#bHClr').onclick = () => $('#hClrAsk').hidden = false;
$('#bHClrNo').onclick = () => $('#hClrAsk').hidden = true;
$('#bHClrYes').onclick = () => { LS('hist', []); $('#hClrAsk').hidden = true; drawHist(); toast('紀錄已清空'); };

// =====================================================================
// 平台（登入）
// =====================================================================
function drawSites() {
  const canLogin = has('browse');
  $('#sites').innerHTML = SITES.map((s, i) => {
    const c = s.ck ? jcall('cookieInfo', s.ck) : null, logged = !!(c && c.has);
    return `<div class="site" data-i="${i}"><span class="badge">${esc(s.ab)}</span>
      <span class="site-b" data-a="home"><span class="site-n">${esc(s.k)}</span> <span class="lv ${s.lv}">${s.lv === 'g' ? '穩定' : '有時失敗'}</span>
      ${logged ? `<span class="ok-t"> · 已登入 ${fmtTime(c.time)}</span>` : ''}<span class="site-d" style="display:block">${esc(s.note)}</span></span>
      <span class="site-acts">${s.ck && canLogin ? (logged ? '<button class="btn sm ghost" data-a="logout" type="button">登出</button>' : '<button class="btn sm" data-a="login" type="button">登入</button>') : ''}</span></div>`;
  }).join('');
  $('#ckSite').innerHTML = SITES.filter(s => s.ck).map(s => `<option value="${s.ck}">${esc(s.k)}</option>`).join('');
}
$('#sites').onclick = e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const s = SITES[+b.closest('.site').dataset.i];
  if (b.dataset.a === 'home') { if (has('browse')) N.browse(s.home, 'browse', '', ''); else call('openUrl', s.home); }
  else if (b.dataset.a === 'login') { N.browse(s.login, 'login', s.ck, s.dom); toast('登入後按右上角「完成登入」', 3500); }
  else if (b.dataset.a === 'logout') { N.clearCookies(s.ck); drawSites(); toast(`${s.k} 已登出`); }
};
$('#bCkImport').onclick = () => { if (!has('pickFile')) { toast('這版外殼不支援，請更新 APK'); return; } N.pickFile('text/*', 'cookie:' + $('#ckSite').value); };
$('#bCkAll').onclick = () => $('#ckAllAsk').hidden = false;
$('#bCkAllNo').onclick = () => $('#ckAllAsk').hidden = true;
$('#bCkAllYes').onclick = () => { call('clearCookies', '*'); $('#ckAllAsk').hidden = true; drawSites(); toast('已刪掉所有登入資料'); };
window.onPicked = s => {
  const r = JSON.parse(s);
  if (!r.ok) { if (r.msg) toast('讀不到檔案：' + r.msg); return; }
  if (r.tag.startsWith('cookie:')) {
    const key = r.tag.slice(7);
    if (!/\t/.test(r.text) || !/Netscape|\.\w+\tTRUE|\.\w+\tFALSE/i.test(r.text)) { toast('這不是 cookies.txt（Netscape 格式）', 3500); return; }
    toast(N.saveCookies(key, r.text) ? '登入資料已匯入' : '匯入失敗'); drawSites();
  } else if (r.tag === 'import') importBackup(r.text);
};

// =====================================================================
// 設定
// =====================================================================
function chipsInto(el, list, cur, fn) {
  el.innerHTML = list.map(o => `<button class="chip" type="button" data-v="${o[0]}" aria-pressed="${o[0] == cur}">${o[1]}${o[2] ? `<small>${o[2]}</small>` : ''}</button>`).join('');
  el.querySelectorAll('.chip').forEach(b => b.onclick = () => fn(b.dataset.v));
}
function bindSw(id, key, after) { const el = $(id); el.checked = !!S[key]; el.onchange = () => { S[key] = el.checked; saveS(); after && after(); }; }
function bindTxt(id, key) { const el = $(id); el.value = S[key] || ''; el.onchange = () => { S[key] = el.value.trim(); saveS(); toast('已儲存'); }; }
let env = {};
function refreshEnv() { env = jcall('env') || {}; }
function drawSet() {
  refreshEnv();
  chipsInto($('#sQual'), QUALS.filter(q => q[0] !== 'thumb'), S.quality, v => { S.quality = v; sel.q = v; saveS(); drawSet(); drawQual(); });
  chipsInto($('#sTpl'), TPLS, S.tpl, v => { S.tpl = v; saveS(); drawSet(); });
  chipsInto($('#sTheme'), [['auto', '跟隨系統'], ['dark', '深色'], ['light', '淺色']], S.theme, v => { S.theme = v; saveS(); applyTheme(); drawSet(); });
  chipsInto($('#sChannel'), [['stable', '穩定版'], ['nightly', '測試版', '修得最快']], S.channel, v => { S.channel = v; saveS(); drawSet(); });
  $('#concV').textContent = S.conc;
  $('#destName').textContent = S.dest && S.dest.uri ? '目前：' + S.dest.name + (has('treeOk') && !N.treeOk(S.dest.uri) ? '（不能用了，請重選）' : '') : '目前：手機的「下載/YTDown」';
  bindSw('#sSubdir', 'subdir'); bindSw('#sPlaylist', 'playlist', () => sel.playlist = S.playlist);
  bindSw('#sSubs', 'subs', () => { sel.subs = S.subs; drawQual(); }); bindSw('#sEmbed', 'embed', () => { sel.embed = S.embed; drawQual(); });
  bindSw('#sSponsor', 'sponsor', () => { sel.sponsor = S.sponsor; drawQual(); });
  bindSw('#sWifi', 'wifi', pump); bindSw('#sAria', 'aria');
  bindSw('#sAuto', 'auto'); bindSw('#sShareAuto', 'shareAuto'); bindSw('#sClip', 'clip'); bindSw('#sCookies', 'cookies');
  bindSw('#sNotify', 'notify', () => { if (S.notify) call('askNotify'); }); bindSw('#sVibe', 'vibe'); bindSw('#sAutoCore', 'autoCore');
  bindTxt('#sRate', 'rate'); bindTxt('#sProxy', 'proxy'); bindTxt('#sArgs', 'args');
  $('#sSubLang').value = S.subLang;
  const core = jcall('coreState') || {};
  $('#ariaItem').hidden = !core.aria2;
  $('#envNotify').textContent = env.notify === false ? '目前沒有允許' : env.notify ? '已允許' : '';
  $('#envBattery').textContent = env.batteryFree ? '已設定，不會被省電暫停' : '長時間下載不會被系統暫停（建議設定）';
  $('#ytTries').innerHTML = YT_TRIES.map((t, i) => { const c = t.find(a => a[0] === '--extractor-args'); return `${i + 1}. ${c ? esc(c[1].replace('youtube:player_client=', '')) : '預設'}`; }).join('<br>');
  $('#updUrl').value = LS('updurl') || '';
  drawVer();
}
$('#sSubLang').onchange = () => { S.subLang = $('#sSubLang').value.trim() || DEF.subLang; saveS(); };
$('#concDn').onclick = () => { S.conc = Math.max(1, S.conc - 1); saveS(); $('#concV').textContent = S.conc; };
$('#concUp').onclick = () => { S.conc = Math.min(5, S.conc + 1); saveS(); $('#concV').textContent = S.conc; pump(); };
$('#bDest').onclick = () => { if (!has('pickTree')) { toast('這版外殼不支援，請更新 APK'); return; } N.pickTree(); };
window.onTree = s => { const r = JSON.parse(s); if (!r.ok) return; S.dest = { uri: r.uri, name: r.name }; saveS(); drawSet(); toast('之後會存到「' + r.name + '」'); };
$('#bDestDef').onclick = () => { S.dest = null; saveS(); drawSet(); toast('改回手機的「下載/YTDown」'); };
$('#bOpenDir').onclick = () => { if (has('openFolder')) N.openFolder(S.dest && S.dest.uri ? S.dest.uri : ''); else toast('這版外殼不支援，請更新 APK'); };
$('#bNotify').onclick = () => { if (env.notify === false && LS('askedNotify')) call('appSettings'); else { call('askNotify'); LS('askedNotify', 1); } setTimeout(drawSet, 1500); };
$('#bBattery').onclick = () => call('askBatteryExempt');
$('#bReset').onclick = () => { const keep = { dest: S.dest }; S = Object.assign({}, DEF, keep); saveS(); sel = { q: S.quality, playlist: S.playlist, subs: S.subs, embed: S.embed, sponsor: S.sponsor, chapters: false }; applyTheme(); drawSet(); drawQual(); toast('設定已還原（存檔位置保留）'); };

function drawVer() {
  const ui = call('uiVer') || UI_VER, sh = call('shellVer') || '（瀏覽器預覽）';
  $('#hdrVer').textContent = ui.replace('YTD_UI_', '');
  let core = '';
  const c = jcall('coreState');
  if (c) core = (c.ready ? (c.ytdlp || '已載入') : '沒載入：' + c.err) + (c.js === true ? '　JS 引擎 ✓' : c.js === false ? '　JS 引擎 ✗（YouTube 會失敗）' : '　JS 引擎 ✗（外殼太舊）');
  $('#coreVer').textContent = '目前版本：' + (core || '—') + (LS('coreAt') ? '　上次檢查 ' + fmtTime(LS('coreAt')) : '');
  $('#verAll').innerHTML = `外殼 ${esc(sh)}<br>畫面 ${esc(ui)}<br>下載核心 ${esc(core || '—')}${env.model ? `<br>手機 ${esc(env.model)}（Android SDK ${env.sdk}）` : ''}`;
  $('#log').innerHTML = CHANGELOG.map(c2 => `<div><b>${esc(c2[0])}</b><ul>${c2[1].map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
}
$('#bCore').onclick = () => { if (!has('updateCore')) return; $('#coreMsg').textContent = '更新中，可能要一兩分鐘…'; $('#bCore').disabled = true; if (has('updateCoreCh')) N.updateCoreCh(S.channel); else N.updateCore(); };
window.onCore = m => { $('#coreMsg').textContent = m; $('#bCore').disabled = false; LS('coreAt', Date.now()); drawVer(); if (/已更新/.test(m)) toast('下載核心' + m); };

// ---- App 更新：update.json = {ver, zip, shell, apk}
const verNum = v => +(String(v || '').replace(/\D/g, '') || 0);
let apkHref = '';
$('#bChk').onclick = () => {
  const u = $('#updUrl').value.trim(); if (!u) { $('#updMsg').textContent = '先填 update.json 的網址'; return; }
  LS('updurl', u); $('#updMsg').textContent = '檢查中…'; $('#bApk').hidden = true; $('#bReload').hidden = true;
  if (!has('httpGet')) { call('checkUpdate', u); return; }
  const id = req('h', r => {
    let j; try { j = JSON.parse(r.body); } catch (e) { $('#updMsg').textContent = '讀不到 update.json（' + (r.status || '連不上') + '）'; return; }
    const msgs = [];
    if (j.shell && j.apk && verNum(j.shell) > verNum(call('shellVer'))) { apkHref = new URL(j.apk, u).href; $('#bApk').hidden = false; $('#bApk').textContent = '安裝新外殼 ' + j.shell.replace('YTD_', ''); msgs.push('有新外殼 ' + j.shell); }
    if (j.ver && verNum(j.ver) > verNum(call('uiVer'))) { msgs.push('有新畫面 ' + j.ver + '，下載中…'); call('checkUpdate', u); }
    $('#updMsg').textContent = msgs.length ? msgs.join('；') : '都是最新的了';
  });
  N.httpGet(id, u);
};
window.onHttp = s => { const r = JSON.parse(s); settle(r.id, r); };
window.onUpd = s => { const p = JSON.parse(s); $('#updMsg').textContent = p.msg; $('#bReload').hidden = !p.ok; };
$('#bApk').onclick = () => { if (apkHref) N.installApk(apkHref); };
$('#bApkUrl').onclick = () => { const el = $('#apkUrl'); if (el.hidden) { el.hidden = false; el.focus(); return; } const u = el.value.trim(); if (!/^https?:\/\//.test(u)) { toast('先貼上 APK 的網址'); return; } if (!has('installApk')) { toast('這版外殼不支援，請用電腦重做 APK'); return; } N.installApk(u); };
window.onApk = s => { const r = JSON.parse(s); $('#updMsg').textContent = r.msg; if (!r.ok) toast(r.msg, 4000); };
$('#bPick').onclick = () => { $('#updMsg').textContent = '選檔中…'; call('pickUpdate'); };
$('#bReload').onclick = () => { if (has('reload')) N.reload(); else location.reload(); };
$('#bResetUi').onclick = () => { if (has('resetUi')) N.resetUi(); else toast('這版外殼不支援'); };

// ---- 備份
$('#bExport').onclick = () => {
  if (!has('exportText')) { toast('這版外殼不支援，請更新 APK'); return; }
  const d = new Date(), name = `YTD_備份_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
  const p = N.exportText(name, JSON.stringify({ app: 'YTDown', ver: UI_VER, t: Date.now(), set: S, hist: LS('hist') || [], updurl: LS('updurl') || '' }));
  toast(p ? '已存到 ' + p : '匯出失敗', 3500);
};
$('#bImport').onclick = () => { if (!has('pickFile')) { toast('這版外殼不支援，請更新 APK'); return; } N.pickFile('application/json', 'import'); };
function importBackup(text) {
  let j; try { j = JSON.parse(text); } catch (e) { toast('這不是備份檔'); return; }
  if (j.app !== 'YTDown') { toast('這不是 YT Download 的備份檔'); return; }
  S = Object.assign({}, DEF, j.set || {}); saveS();
  if (Array.isArray(j.hist)) { const cur = LS('hist') || [], seen = new Set(cur.map(h => h.t + h.u)); LS('hist', [...cur, ...j.hist.filter(h => !seen.has(h.t + h.u))].sort((a, b) => b.t - a.t).slice(0, 400)); }
  if (j.updurl) LS('updurl', j.updurl);
  applyTheme(); drawSet(); drawQual(); toast('已還原設定和紀錄');
}

// =====================================================================
// 開始
// =====================================================================
function infoLine() {
  const fs = has('freeSpace') ? N.freeSpace() : -1;
  const parts = [];
  if (fs > 0) parts.push('手機剩 ' + fmtSize(fs));
  parts.push('存到 ' + (S.dest && S.dest.uri ? S.dest.name : '下載/YTDown'));
  $('#dlInfo').textContent = parts.join(' · ');
  const b = $('#banner'), c = jcall('coreState');
  if (c && c.js === false) { b.hidden = false; b.textContent = '這版 APK 沒有 JavaScript 引擎，YouTube 會失敗。請裝新的外殼。'; }
  else if (N && !newShell()) { b.hidden = false; b.textContent = '目前外殼比較舊，搜尋、登入、選資料夾等功能要裝外殼 YTD_V0.1.06 才能用。'; }
  else b.hidden = true;
}
applyTheme(); refreshEnv();
drawQual(); drawPreview(); counts(); drawVer();
restore(); infoLine(); pump();
{ const p = LS('page'); if (p && PAGES.includes(p) && p !== 'dl') page(p); }
setTimeout(() => { if (S.autoCore && has('updateCore') && Date.now() - (LS('coreAt') || 0) > 20 * 3600e3) { $('#coreMsg').textContent = '自動更新中…'; if (has('updateCoreCh')) N.updateCoreCh(S.channel); else N.updateCore(); } }, 1500);
setTimeout(checkClip, 600);

// 瀏覽器預覽時放示範資料，方便看排版
if (!N) {
  info = { ok: true, url: 'https://www.youtube.com/watch?v=demo', title: '（示範）城市夜景縮時攝影 4K', uploader: '示範頻道', dur: 754, heights: [2160, 1440, 1080, 720, 480, 360], hasSubs: true, thumb: '', chapters: [{ t: 'a' }, { t: 'b' }] };
  urlBox.value = info.url; probeUrl = info.url; $('#siteTag').textContent = 'YouTube'; drawPreview(); drawQual();
  const demo = [['https://youtu.be/demo2', '720', '（示範）私人影片', 'bad', 0], ['https://www.tiktok.com/@demo/video/1', 'best', '（示範）貓咪跳上冰箱', 'ok', 100], ['https://www.bilibili.com/video/BV1demo', '1080', '（示範）手作木工：做一張小板凳', 'run', 46.2]];
  demo.forEach(([u, q, t, st, pct]) => { const s2 = siteOf(u); const j = { id: 'd' + (seq++), pid: 'dp' + seq, url: u, q, site: s2.k, ab: s2.ab, title: t, thumb: '', state: st, pct, size: '182.4 MB', speed: '3.2 MB/s', eta: 41, k: 0, files: st === 'ok' ? [{ path: '下載/YTDown/TikTok/貓咪跳上冰箱.mp4', uri: '', size: 8.4e6 }] : [], msg: st === 'bad' ? '這是私人影片，沒辦法下載。' : '' }; Q.unshift(j); drawCard(j); });
  $('#dlInfo').textContent = '手機剩 23.4 GB · 存到 下載/YTDown';
}
