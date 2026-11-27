// YT Download 畫面（熱更新會換掉這個檔）
// 原生那邊：window.YTD。回呼：onProg onDone onInfo onExec onHttp onBrowse onTree onPicked onApk onUpd onCore onShare onShortcut onResume onToast onBack
'use strict';
const UI_VER = 'YTD_UI_V0.1.74';
const N = window.YTD || null;
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LSC = {};   // 讀過的存在記憶體，不用每次重新解析（紀錄很多時省很多）
const LS = (k, v) => { try { if (v === undefined) return k in LSC ? LSC[k] : (LSC[k] = JSON.parse(localStorage.getItem('ytd_' + k) || 'null')); LSC[k] = v; localStorage.setItem('ytd_' + k, JSON.stringify(v)); } catch (e) { return null; } };
const has = f => !!(N && typeof N[f] === 'function');
const call = (f, ...a) => { if (!has(f)) return null; try { return N[f](...a); } catch (e) { return null; } };
const jcall = (f, ...a) => { const r = call(f, ...a); try { return r ? JSON.parse(r) : null; } catch (e) { return null; } };

// ---------- 分屏／小窗：整個畫面等比例縮小，按鈕不會變得比內容還大
let ZM = 1, fitW = 0;
function fitWin() {
  const w = innerWidth, h = innerHeight, sw = screen.width || w, sh = screen.height || h;
  const typing = /^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '');
  if (!(typing && w === fitW)) {                       // 打字時鍵盤把高度變矮，不跟著縮
    const small = w < sw * 0.9 || w < 340 || (h < 600 && w < 700);
    ZM = small ? Math.max(0.55, Math.min(1, w / 380, h / 600)) : 1;
    ZM = Math.round(ZM * 100) / 100; fitW = w;
  }
  const r = document.documentElement;
  r.style.zoom = ZM === 1 ? '' : String(ZM);
  r.style.setProperty('--vh', (h / ZM / 100) + 'px');
  r.style.setProperty('--vw', (w / ZM / 100) + 'px');
}
fitWin(); addEventListener('resize', fitWin);

// ---------- 更新紀錄（設定 → 關於）
const CHANGELOG = [
  ['YTD_UI_V0.1.74', ['再清掉一批舊外殼才需要的檢查和提示文字，程式更短']],
  ['YTD_V0.1.23（外殼）／YTD_UI_V0.1.73', ['完成通知合成一則「完成 N 個、失敗 N 個」，不會一個下載一則堆滿通知欄；打開 App 就清掉', 'Telegram 下載完直接搬檔，不再多複製一次，大影片存得比較快']],
  ['YTD_V0.1.22（外殼）／YTD_UI_V0.1.72', ['修正：分享一個已經下載過的網址時，會先跳「已加入」又跳「略過」；現在只會跳一個正確的提示', 'App 內登入／逛網站頁的按鈕改成暗色']],
  ['YTD_V0.1.21（外殼）／YTD_UI_V0.1.71', ['存檔加快：下載好的檔案搬到「下載／相簿」時用大緩衝，大檔搬得比較快', '存到一半失敗不會在下載資料夾留下空檔或壞檔', '存檔程式合併整理（下載、相簿、自選資料夾共用）']],
  ['YTD_UI_V0.1.70', ['修正 0.1.68／0.1.69：播放器和下載頁的時間顯示會卡死、下載完不會自動播放（請盡快更新）', '下載頁影片的 ▶ 鈕從畫面正中間移到左下角，不擋畫面']],
  ['YTD_UI_V0.1.69', ['效率：設定、紀錄讀過一次就留在記憶體，不再每次重新解析（紀錄多時明顯變順）', '下載進度一個畫面週期最多重畫一次，同時下載好幾個也不會卡']],
  ['YTD_V0.1.20（外殼）／YTD_UI_V0.1.68', ['內部整理：三種下載方式（一般、IG／TikTok 直接抓、Telegram）共用同一套存檔流程，程式更短、更好維護；功能不變']],
  ['YTD_UI_V0.1.67', ['平台頁：IG、FB 拿掉「App 內登入」，只留貼代碼', '下載頁：一次好幾個、或還沒有縮圖時，進度改成一塊小卡片，不再佔掉大半個畫面的黑框；進度百分比不重複顯示', '沒縮圖的小格改成深灰底']],
  ['YTD_UI_V0.1.66', ['設定頁簡化：只留常用的 6 項＋手機權限，其他收進「進階設定」（點一下展開）；「有網址就自動下載」和「回到 App 抓剪貼簿」合成一個開關', '更新頁簡化：只剩「檢查更新」和下載核心，手動更新收起來；更新紀錄只顯示最近 3 版', '紀錄每一筆只留「分享」和「⋯」，其他（再下載、複製連結、刪檔案、刪紀錄）在 ⋯ 裡；點縮圖就播放', '主要按鈕改成暗藍色（原本是白色），晚上看不刺眼']],
  ['YTD_V0.1.19（外殼）／YTD_UI_V0.1.65', ['程式瘦身：拿掉已經不用的「剪貼簿提示條」「連續收集」「🎛 轉盤」「左邊上一則／下一則」和舊外殼的相容程式，畫面更乾淨、反應更快（上下滑換一則照舊）', '更新紀錄只留最近的，太舊的合成一行']],
  ['YTD_V0.1.18（外殼）／YTD_UI_V0.1.64', ['瘦身：下載到一半被手機關掉留下的暫存、Telegram 抓檔的快取、裝完的更新檔，現在開 App 和每次下載全部做完都會自動清掉（下載好的影片本來就在「下載／相簿」，不受影響）', '設定 → 其他：看得到 App 佔用多少空間，也可以按「清理暫存」馬上清']],
  ['YTD_V0.1.17（外殼）／YTD_UI_V0.1.63', ['分享到 YT Download、複製網址，都是讀到就直接下載，不會再跳出「剪貼簿有網址／下載過了，要再下載嗎？」那條要你按的提示', '修正：同一則貼文換了追蹤碼（?igsh= 之類）會被當成新的、幾小時前的舊剪貼簿又被讀一次而卡住「下載過了」', '剪貼簿只收支援的網站，複製文章、別的連結不會去解析；貼上鈕不會再把文章塞進網址框', '解析超過 30 秒會停下來說明；下載 6 分鐘完全沒動會自動停止，可以按重試', '拿掉「連續收集」和分享選單的「收集到 YT Download」（現在都直接下載）']],
  ['YTD_V0.1.16（外殼）／YTD_UI_V0.1.62', ['在 IG、YouTube、TikTok 等按「分享」→ 選 YT Download，現在直接加入下載，畫面不會跳過來，只跳一個「已加入下載」的小提示', 'YT Download 完全沒開的時候，會在背景叫起來收下網址，收完自己退回去', '已經下載過的會提示，不會重複下載']],
  ['YTD_UI_V0.1.61', ['「📋 貼上」按鈕縮成原本的四分之一高（點一下畫面就會自動讀，按鈕只是備用）', '讀到網址時，畫面中間會跳出「＋1」的動畫：光圈擴散、光點噴開，最後縮小飛進網址框，加一下震動（暗色，不刺眼）']],
  ['YTD_UI_V0.1.60', ['播放器畫面正中間不再出現任何按鈕：播放／暫停鈕搬到下面控制列的最左邊（點兩下畫面中間一樣可以播放／暫停）；同一則裡的上一張／下一張用左右滑']],
  ['YTD_UI_V0.1.59', ['紀錄改成「新的在最下面、舊的在上面」（像 IG、抖音），打開紀錄頁會直接到最下面（最新的）；要看更舊的，捲到最上面按「再顯示 100 筆較舊的」', '播放時往上滑＝下一則（比較新的）、往下滑＝上一則（比較舊的），跟紀錄頁的順序一樣', '排序選單可以換回「新的在最上面」']],
  ['YTD_UI_V0.1.58', ['播放器改成像抖音：在畫面任何地方往上滑＝下一則（較舊）、往下滑＝上一則（較新），照紀錄頁的順序；左右滑一樣是拖進度（照片是換張）。手機、平板、橫的影片都一樣', '關掉播放器改用左上角 ✕ 或返回鍵（不是從紀錄打開的單一個檔，往下滑一樣是關掉）', '🎛 轉盤和左下角上一則／下一則先收起來，工具列的 🎛 可以叫回來（轉盤也調大了一點）']],
  ['YTD_UI_V0.1.57', ['左邊的上一則／下一則縮成很小一塊，貼在最左下角（每半大約 1.6 公分），拇指一定搆得到']],
  ['YTD_UI_V0.1.56', ['防呆：返回鍵最多只會回到下載頁（貼上的那一頁），按幾次都不會把 YT Download 關掉；分屏時誤按也不會讓左邊的視窗不見']],
  ['更早（0.1.03～0.1.55）', ['下載核心、15 個平台、佇列、IG／TikTok／Telegram 帳號下載、內建播放器（拖曳預覽、速度、A-B、逐格）、紀錄、小窗分屏、自動更新、備份']],
];

// ---------- 平台（只用簡稱標籤，不用各家商標）
// ck：登入資料的名字；login：登入頁；dom：要存哪些網域的登入資料
const SITES = [
  { k: 'YouTube', ab: 'YT', re: /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/, home: 'https://m.youtube.com', lv: 'g', note: '影片、Shorts、播放清單、音樂。年齡限制的要登入；Google 可能不讓 App 內登入，就用電腦匯出 cookies.txt。', ck: 'youtube', login: 'https://accounts.google.com/ServiceLogin?continue=https%3A%2F%2Fm.youtube.com', dom: 'youtube.com,www.youtube.com,m.youtube.com,google.com,accounts.google.com', search: 'ytsearch' },
  { k: 'TikTok', ab: 'TT', re: /(^|\.)tiktok\.com$/, home: 'https://www.tiktok.com', lv: 'g', note: '一般影片可以，私人帳號不行。', ck: 'tiktok', login: 'https://www.tiktok.com/login', dom: 'tiktok.com,www.tiktok.com,m.tiktok.com' },
  { k: 'Bilibili', ab: 'B站', re: /(^|\.)(bilibili\.com|b23\.tv|bilibili\.tv)$/, home: 'https://m.bilibili.com', lv: 'g', note: '一般影片可以；登入後才有 1080P 以上，大會員內容要大會員帳號。', ck: 'bilibili', login: 'https://passport.bilibili.com/h5-app/passport/login', dom: 'bilibili.com,www.bilibili.com,m.bilibili.com,passport.bilibili.com', search: 'bilisearch' },
  { k: '抖音', ab: '抖音', re: /(^|\.)(douyin\.com|iesdouyin\.com)$/, home: 'https://www.douyin.com', lv: 'y', note: '常改版失效，失敗先更新核心；登入後比較穩。', ck: 'douyin', login: 'https://www.douyin.com', dom: 'douyin.com,www.douyin.com,iesdouyin.com' },
  { k: 'X', ab: 'X', re: /(^|\.)(x\.com|twitter\.com)$/, home: 'https://x.com', lv: 'g', note: '公開貼文可以；敏感內容要登入。', ck: 'x', login: 'https://x.com/i/flow/login', dom: 'x.com,twitter.com' },
  { k: 'Instagram', ab: 'IG', re: /(^|\.)(instagram\.com|instagr\.am)$/, home: 'https://www.instagram.com', lv: 'g', note: '照片、影片、多張貼文、限時動態都可以。用「貼代碼」貼上 sessionid（不用在 App 裡登入）。', codeOnly: true, ck: 'instagram', login: 'https://www.instagram.com/accounts/login/', dom: 'instagram.com,www.instagram.com' },
  { k: 'Facebook', ab: 'FB', re: /(^|\.)(facebook\.com|fb\.watch)$/, home: 'https://m.facebook.com', lv: 'y', note: '公開影片、Reels 可以；社團、私人的要用「貼代碼」。', codeOnly: true, ck: 'facebook', login: 'https://m.facebook.com/login', dom: 'facebook.com,www.facebook.com,m.facebook.com' },
  { k: '小紅書', ab: '小紅書', re: /(^|\.)(xiaohongshu\.com|xhslink\.com)$/, home: 'https://www.xiaohongshu.com', lv: 'y', note: '影片筆記可以，時好時壞。', ck: 'xiaohongshu', login: 'https://www.xiaohongshu.com', dom: 'xiaohongshu.com,www.xiaohongshu.com' },
  { k: '微博', ab: '微博', re: /(^|\.)(weibo\.com|weibo\.cn)$/, home: 'https://m.weibo.cn', lv: 'y', note: '部分影片要登入。', ck: 'weibo', login: 'https://passport.weibo.com/sso/signin', dom: 'weibo.com,www.weibo.com,m.weibo.cn,weibo.cn,passport.weibo.com' },
  { k: 'Telegram', ab: 'TG', re: /(^|\.)(t\.me|telegram\.me)$/, home: 'https://t.me', lv: 'y', tg: true, note: '沒登入：只能抓網頁版有提供的（小影片）。登入自己的帳號後，大影片、相簿、你加入的私人頻道都能下載。' },
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
const YT_CHUNK = ['--http-chunk-size', '10M'];     // 分段要檔案：YouTube 對一次要整個大檔會限速
const YT_TRIES = [[YT_EJS], [YT_EJS, ['--extractor-args', 'youtube:player_client=tv_simply']], [YT_EJS, ['--extractor-args', 'youtube:player_client=android_vr']], [YT_EJS, ['--extractor-args', 'youtube:player_client=web_safari']], [YT_EJS, ['--extractor-args', 'youtube:player_client=mweb']]];
const triesFor = u => siteOf(u).k === 'YouTube' ? YT_TRIES : [[]];

// ---------- 設定
const DEF = { quality: 'best', conc: 3, subdir: true, playlist: false, tpl: 'title', subs: false, subLang: 'zh-Hant,zh-TW,zh,en', embed: true, sponsor: false,
  auto: true, autoUpd: true, autoPlay: true, clip: true, cookies: true, notify: true, vibe: true, theme: 'auto', autoCore: true, channel: 'stable',
  igSlow: true, ttHd: true, ytFast: true, ytConn: 8, noAv1: true, gallery: 'img', wifi: false, aria: false, rate: '', proxy: '', args: '', dest: null, src: 'ytsearch' };
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
// 實際會拿到的畫質：選「最好」＝影片最高的；選的比影片高，就只有影片最高的
const resFor = (q, max) => !max ? 0 : isNaN(+q) ? (q === 'best' ? max : 0) : Math.min(+q, max);
const qShow = (q, res) => ['audio', 'mp3', 'thumb'].includes(q) || !res ? qLabel(q) : (q === 'best' ? '最好 ' : '') + res + 'p';
const thumbImg = (src, cls) => src ? `<img class="${cls || 'thumb'}" src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">` : `<div class="${cls || 'thumb'}"></div>`;
function copyText(t) { if (has('copy')) { N.copy(t); toast('已複製'); return; } try { navigator.clipboard.writeText(t).then(() => toast('已複製'), () => toast('複製失敗')); } catch (e) { toast('複製失敗'); } }
function parseTime(t) { t = String(t || '').trim(); if (!t) return null; if (/^\d+(\.\d+)?$/.test(t)) return +t; const p = t.split(':').map(Number); if (p.some(isNaN)) return NaN; return p.reduce((a, b) => a * 60 + b, 0); }
function splitArgs(s) { const out = []; const re = /"([^"]*)"|'([^']*)'|(\S+)/g; let m; while ((m = re.exec(s || ''))) out.push(m[1] ?? m[2] ?? m[3]); const r = []; for (let i = 0; i < out.length; i++) { if (out[i].startsWith('-') && out[i + 1] !== undefined && !out[i + 1].startsWith('-')) { r.push([out[i], out[i + 1]]); i++; } else r.push([out[i]]); } return r; }
const toBytes = t => { const m = String(t || '').match(/([\d.]+)\s*([KMGT]?)i?B/i); return m ? +m[1] * Math.pow(1024, ' KMGT'.indexOf(m[2].toUpperCase())) : 0; };
// 速度和剩餘時間：用「最近 12 秒實際下載了多少」來算，再做平均，每秒只更新一次顯示
function smooth(j, pct, inst, eta) {
  const now = Date.now();
  if (!j.sm || pct + 0.5 < j.sm.lastPct) j.sm = { pts: [], lastPct: 0, spd: 0, shown: 0 };   // 換下一個檔（影像→聲音）就重算
  const s = j.sm; s.lastPct = pct;
  let cur = 0;
  if (j.total > 0 && pct > 0) {
    s.pts.push([now, pct / 100 * j.total]);
    while (s.pts.length > 2 && now - s.pts[0][0] > 12000) s.pts.shift();
    const dt = (now - s.pts[0][0]) / 1000;
    if (dt >= 2) cur = (s.pts[s.pts.length - 1][1] - s.pts[0][1]) / dt;
  }
  if (cur > 0) s.spd = s.spd ? s.spd * 0.7 + cur * 0.3 : cur;
  else if (inst > 0 && !(j.total > 0 && s.pts.length > 1)) s.spd = s.spd ? s.spd * 0.85 + inst * 0.15 : inst;
  if (now - s.shown < 1000) return;
  s.shown = now;
  j.speed = s.spd > 0 ? fmtSize(s.spd) + '/s' : '';
  const left = j.total > 0 && pct > 0 ? j.total * (1 - pct / 100) : 0;
  j.eta = left > 0 && s.spd > 0 ? Math.round(left / s.spd) : (eta > 0 && !j.total ? eta : j.eta || 0);
}
let reqSeq = 0; const pend = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vplay = v => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
const fd = t => fmtDur(t) || '0:00';
function httpReq(spec) { return new Promise(res => N.http(req('h', res), JSON.stringify(spec))); }

// =====================================================================
// Instagram：用你登入的身分直接問 IG（照片 yt-dlp 抓不到，所以自己來）
// =====================================================================
const IG_HDR = { 'X-IG-App-ID': '936619743392459', 'X-Requested-With': 'XMLHttpRequest', 'Referer': 'https://www.instagram.com/', 'Accept': '*/*' };
const IG_RES = new Set(['p', 'reel', 'reels', 'tv', 'stories', 'explore', 'accounts', 'direct', 'about', 'developer', 'legal', 'api', 'share', 'web', 'challenge']);
function igCode(u) { u = String(u || ''); const m = u.match(/instagram\.com\/(?:[^/?#]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/); if (m) return { code: m[2] }; const st = u.match(/instagram\.com\/stories\/[^/]+\/(\d+)/); return st ? { pk: st[1], code: st[1] } : null; }
function igUserOf(u) { const m = String(u || '').match(/instagram\.com\/([A-Za-z0-9._]+)\/?(?:[?#].*)?$/); return m && !IG_RES.has(m[1].toLowerCase()) ? m[1] : ''; }
function igPk(code) { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'; let n = 0n; for (const c of code.slice(0, code.length > 12 ? 11 : code.length)) n = n * 64n + BigInt(A.indexOf(c)); return n.toString(); }
async function igGet(path) {
  const c = jcall('cookieInfo', 'instagram'); if (!c || !c.has) throw new Error('IG_LOGIN');
  const r = await httpReq({ url: 'https://www.instagram.com/api/v1/' + path, cookies: 'instagram', headers: IG_HDR });
  const det = t => ` [${r.status}] ${String(t || '').replace(/\s+/g, ' ').slice(0, 90)}`;
  let j; try { j = JSON.parse(r.body); } catch (e) { throw new Error((r.status === 429 ? 'IG_RATE' : (r.status === 401 || r.status === 403 || /login|<html/i.test(r.body || '')) ? 'IG_LOGIN' : 'IG_HTTP') + det(r.body)); }
  if (j.status === 'fail' || j.require_login) throw new Error(((r.status === 429 || /wait|few minutes/i.test(j.message || '')) ? 'IG_RATE' : (j.require_login || /login|checkpoint/i.test(j.message || '')) ? 'IG_LOGIN' : 'IG_NONE') + det(j.message || (j.require_login ? 'require_login' : '')));
  return j;
}
function igParse(it) {
  const user = (it.user && it.user.username) || '', cap = ((it.caption && it.caption.text) || '').replace(/\s+/g, ' ').trim();
  const area = x => (x.width || 0) * (x.height || 0);
  const best = a => (a || []).slice().sort((x, y) => area(y) - area(x))[0];
  const small = a => (a || []).slice().sort((x, y) => (x.width || 0) - (y.width || 0)).find(x => (x.width || 0) >= 240) || best(a);
  const list = it.carousel_media && it.carousel_media.length ? it.carousel_media : [it];
  const code = it.code || String(it.pk || it.id || '').split('_')[0];
  const items = list.map((m, i) => {
    const v = best(m.video_versions), im = best(m.image_versions2 && m.image_versions2.candidates), src = v || im; if (!src || !src.url) return null;
    const ext = v ? 'mp4' : ((src.url.split('?')[0].match(/\.(jpe?g|png|webp|heic)$/i) || [])[1] || 'jpg').toLowerCase();
    return { url: src.url, video: !!v, name: `${user || 'ig'} ${code} ${String(i + 1).padStart(2, '0')}.${ext}` };
  }).filter(Boolean);
  const cover = list[0].image_versions2 && list[0].image_versions2.candidates;
  const nv = items.filter(x => x.video).length, np = items.length - nv;
  return { user, uid: String((it.user && (it.user.pk || it.user.id)) || ''), cap, code, items, nv, np, t: (it.taken_at || 0) * 1000, thumb: (best(cover) || {}).url || '', small: (small(cover) || {}).url || '',
    title: cap ? cap.slice(0, 80) : `${user} 的貼文`, sum: [np ? np + ' 張照片' : '', nv ? nv + ' 部影片' : ''].filter(Boolean).join('、') };
}
async function igFetch(u) { const k = igCode(u); if (!k) throw new Error('IG_URL'); const j = await igGet(`media/${k.pk || igPk(k.code)}/info/`); const it = j.items && j.items[0]; if (!it) throw new Error('IG_NONE'); return igParse(it); }
// 每個平台「貼代碼」登入要找的 Cookie 名稱（沒列的就貼整串「名稱=值; 名稱=值」）
const CK_CODE = { instagram: 'sessionid', bilibili: 'SESSDATA', tiktok: 'sessionid', douyin: 'sessionid', x: 'auth_token', weibo: 'SUB', xiaohongshu: 'web_session', niconico: 'user_session' };
function req(kind, fn) { const id = kind + (++reqSeq); pend[id] = fn; return id; }
function settle(id, v) { const f = pend[id]; if (f) { delete pend[id]; f(v); } }
const cookieOk = key => { if (!key || !S.cookies) return false; const c = jcall('cookieInfo', key); return !!(c && c.has); };

// 把 yt-dlp 的英文錯誤翻成白話
function friendly(m, site) {
  m = String(m || '');
  const igDet = (m.match(/\[\d+\][^]*$/) || [''])[0].trim();
  if (/IG_RATE/.test(m)) return 'IG 暫時擋住了（太頻繁），等 10 分鐘以上再試。' + (igDet ? `（IG 回應 ${igDet}）` : '');
  if (/IG_LOGIN/.test(m)) return 'IG 不認這組登入資料。到「平台」→ Instagram：按「重貼」貼新的 sessionid；。' + (igDet ? `（IG 回應 ${igDet}）` : '');

  if (/TG_LOGIN/.test(m)) return 'Telegram 還沒登入，到「平台」→ Telegram 登入你的帳號。';
  if (/TG_NOMSG/.test(m)) return 'Telegram 找不到這則訊息（可能被刪了，或是私人頻道你沒有加入）。';
  if (/TG_NOMEDIA/.test(m)) return '這則 Telegram 訊息裡沒有影片或照片。';
  if (/TG_NODL/.test(m)) return '這個頻道不允許下載（頻道開了內容保護）。';
  if (/TG_ERR/.test(m)) return 'Telegram 回報錯誤：' + m.replace(/^.*TG_ERR\s*/, '').slice(0, 120);
  if (site === 'Telegram' && /沒有產生檔案|No video formats|Unsupported URL|No media/i.test(m)) return '這支影片太大，Telegram 網頁版沒有提供。到「平台」→ Telegram 登入你的帳號，就能下載。';
  if (/IG_URL/.test(m)) return '看不懂這個 IG 網址。請用貼文、Reels、限時動態或個人頁的連結。';
  if (/IG_NOUSER/.test(m)) return '找不到這個 IG 帳號，確認帳號名稱有沒有打對。';
  if (/IG_(NONE|HTTP)/.test(m)) return 'IG 沒有回傳內容（可能是私人帳號、貼文被刪，或登入過期要重新登入）。' + (igDet ? `（IG 回應 ${igDet}）` : '');
  if (site === 'YouTube' && /Requested format is not available|Only images are available|n challenge|JavaScript runtime/i.test(m)) {
    return 'YouTube 沒給影片格式。先到「更新」→ 更新下載核心（可換測試版），再試一次。';
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
    [/login|log in|logged.?in|cookies|authenticat/i, '這個內容需要登入。到「平台」頁按這個網站的「登入」或「貼代碼」。'],
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
const PAGES = ['dl', 'hist', 'sites', 'upd', 'set'];
function page(p) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.p === p));
  document.querySelectorAll('.pg').forEach(s => s.classList.toggle('on', s.id === 'p_' + p));
  if (p === 'hist') { hShow = 100; drawHist(); histToBottom(); }
  if (p === 'sites') drawSites();
  if (p === 'set' || p === 'upd') drawSet();
  if (p === 'set') setTimeout(stoShow, 50);
  if (p !== 'dl') { autoStop(); stagePause(); }
  window.scrollTo(0, 0);
  LS('page', p);
}
document.querySelectorAll('.tab').forEach(b => b.onclick = () => page(b.dataset.p));
window.onBack = () => {
  if (!$('#player').hidden) { pClose(); return true; }
  if (!$('#igPane').hidden) { igClose(); return true; }
  if (!$('#browseRow').hidden) { $('#browseRow').hidden = true; return true; }
  if (!$('#splitBox').hidden) { $('#splitBox').hidden = true; return true; }
  const on = document.querySelector('.tab.on'); if (on && on.dataset.p !== 'dl') { page('dl'); return true; }
  // 防呆：已經在下載頁了也不退出（分屏時常常以為是在按影片那邊的返回）。最多就是回到這一頁
  const t = Date.now(); if (t - (window.__bkT || 0) > 2500) { toast('返回鍵不會關掉 YT Download（已經在首頁）', 1500); window.__bkT = t; }
  return true;
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
  $('#dlOpts').hidden = searching || !L.length;
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
// 大「貼上」：按下去 1.5 秒內用顏色、動畫、震動告訴你結果（綠＝加進去第幾個、黃＝已經有了、紅＝沒有網址）
let bpT = 0;
// 讀到網址的動畫：畫面中間跳出「＋1」＋光圈＋光點，最後縮小飛向網址框
let gfT = 0;
function grabFx(n, label) {
  let el = $('#grabFx'); if (el) el.remove(); clearTimeout(gfT);
  el = document.createElement('div'); el.id = 'grabFx';
  const box = urlBox.getBoundingClientRect(), dy = Math.round(box.top + box.height / 2 - innerHeight / 2);
  const dots = Array.from({ length: 12 }, (_, i) => `<i class="gf-dot" style="--a:${i * 30 + 15}deg;animation-delay:${0.05 + (i % 3) * 0.04}s"></i>`).join('');
  el.innerHTML = `<div class="gf-core" style="--gfY:${dy}px">${dots}<span class="gf-ring"></span><span class="gf-ring r2"></span><span class="gf-num">＋${n}</span><span class="gf-tag">${esc(label)}</span></div>`;
  document.body.appendChild(el); call('vibrate', 35);
  gfT = setTimeout(() => el.remove(), 1400);
}
function bpShow(kind, main, sub, buzz) {
  const b = $('#bPaste'); clearTimeout(bpT);
  b.classList.remove('ok', 'dup', 'bad'); void b.offsetWidth; b.classList.add(kind);
  b.innerHTML = `<span class="bp-ring"></span><span class="bp-main">${esc(main)}</span><span class="bp-sub">${esc(sub)}</span>`;
  call('vibrate', buzz);
  bpT = setTimeout(() => { b.classList.remove('ok', 'dup', 'bad'); const n = currentUrls().length; b.innerHTML = `<span class="bp-main">📋 貼上</span><span class="bp-sub">${n ? `已經有 ${n} 個` : '（點一下畫面也會自動讀）'}</span>`; }, 1600);
}
$('#bPaste').onclick = () => {
  const t = call('paste') || '';
  if (!t.trim()) { bpShow('bad', '剪貼簿是空的', '先去複製網址', 60); return; }
  const L = urlsIn(t);
  if (!L.length) { bpShow('bad', '剪貼簿裡沒有網址', '（要搜尋就直接在框框打字）', 60); return; }
  const before = currentUrls().length;
  addUrls(t, true);
  const n = currentUrls().length, added = n - before;
  if (added > 0) { L.forEach(markDone); bpShow('ok', `＋${added}　第 ${n} 個`, '加進去了', 0); grabFx(added, `第 ${n} 個`); }
  else bpShow('dup', '這個已經加過了', `現在共 ${n} 個`, 25);
};
$('#bClear').onclick = () => { urlBox.value = ''; info = null; probeUrl = ''; onInput(); urlBox.focus(); };


function addUrls(text, quiet) {
  const L = urlsIn(text); if (!L.length) { if (!quiet) toast('裡面沒有網址'); return false; }
  const cur = currentUrls(); const add = L.filter(u => !cur.includes(u));
  urlBox.value = [...cur, ...add].join('\n');
  onInput(); return true;
}

// ---- 搜尋（YouTube / Bilibili / SoundCloud）
function drawSrc() {
  $('#srcChips').innerHTML = [...SEARCHERS, { search: 'iguser', k: 'IG 帳號' }].map(s => `<button class="chip" type="button" data-s="${s.search}" aria-pressed="${s.search === S.src}">${esc(s.k)}</button>`).join('');
  $('#srcChips').querySelectorAll('.chip').forEach(b => b.onclick = () => { S.src = b.dataset.s; saveS(); drawSrc(); doSearch(); });
}
$('#bSearch').onclick = () => doSearch();
function doSearch() {
  const q = urlBox.value.trim(); if (q.length < 2) return;
  if ((S.src || 'ytsearch') === 'iguser') { igSearch(q); return; }
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
$('#results').onclick = e => { const b = e.target.closest('.res'); if (!b) return; if (b.dataset.ig) { openIg(b.dataset.ig, b.dataset.uid); return; } urlBox.value = b.dataset.u; onInput(); };
async function igSearch(q) {
  q = q.replace(/^@/, '').trim(); const R = $('#results');
  const direct = `<button class="res" type="button" data-ig="${esc(q)}"><span class="res-b"><span class="res-t">直接打開 @${esc(q)}</span><span class="res-m">帳號名稱要完全一樣</span></span></button>`;
  R.innerHTML = '<div class="skel" style="height:56px"></div><div class="skel" style="height:56px"></div>';
  try {
    const j = await igGet('web/search/topsearch/?context=user&query=' + encodeURIComponent(q));
    const U = (j.users || []).map(x => x.user).filter(u => u && u.username);
    R.innerHTML = (U.length ? U.map(u => `<button class="res" type="button" data-ig="${esc(u.username)}" data-uid="${esc(u.pk || u.pk_id || '')}">${thumbImg(u.profile_pic_url, 'ava')}<span class="res-b"><span class="res-t">@${esc(u.username)}</span><span class="res-m">${esc([u.full_name, u.is_private ? '私人帳號' : '', u.is_verified ? '已驗證' : ''].filter(Boolean).join(' · '))}</span></span></button>`).join('') : '<p class="empty">找不到帳號</p>') + direct;
  } catch (e) { R.innerHTML = `<p class="empty">${esc(friendly(String(e.message || e)))}</p>` + (/IG_LOGIN/.test(String(e.message)) ? '' : direct); }
}
window.onExec = s => { const r = JSON.parse(s); settle(r.id, r); };

// ---- 逛網站
$('#bBrowse').onclick = () => {
  const row = $('#browseRow'); row.hidden = !row.hidden; if (row.hidden) return;
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
  if (siteOf(u).k === 'Telegram' && has('tgJob') && tgReady()) { info = { ok: true, url: u, title: 'Telegram 貼文', heights: [], tg: true }; drawPreview(); drawQual(); return; }   // 走帳號下載，不用預覽
  info = { loading: true, url: u }; drawPreview(); drawQual();
  { const me = probeId; setTimeout(() => { if (probeId === me && info && info.loading) { info = { err: '解析超過 30 秒，先停下來了（網址可能不是影片）。還是可以直接按下載試試看', url: u }; drawPreview(); drawQual(); } }, 30000); }
  if (siteOf(u).k === 'Instagram' && has('http')) {
    const me = probeId, un = igUserOf(u);
    if (un) { info = { ok: true, url: u, profile: un, title: '@' + un + ' 的 IG', heights: [] }; drawPreview(); drawQual(); return; }
    igFetch(u).then(d => { if (probeId !== me) return; info = { ok: true, url: u, title: d.title, uploader: d.user, thumb: d.thumb, heights: [], ig: d, k: 0 }; drawPreview(); drawQual(); })
      .catch(e => { if (probeId !== me) return; const m = String(e.message || e); if (/IG_(LOGIN|RATE)/.test(m) || !has('probe')) { info = { err: friendly(m), url: u }; drawPreview(); drawQual(); } else N.probe(probeId, u, probeSpec(u, k)); });
    return;
  }
  if (!has('probe')) { info = null; drawPreview(); return; }
  N.probe(probeId, u, probeSpec(u, k));
}
window.onInfo = s => {
  const p = JSON.parse(s);
  if (String(p.id).startsWith('qi:')) {   // 佇列裡沒先解析的工作：補上標題、縮圖、實際畫質
    const j = Q.find(x => x.id === p.id.slice(3)); if (!j || !p.ok) return;
    if (!j.title) j.title = p.title; if (!j.thumb) j.thumb = p.thumb; if (!j.uploader) j.uploader = p.uploader || '';
    if (p.heights && p.heights.length) j.res = resFor(j.q, p.heights[0]);
    const el = document.getElementById(j.id); if (el) el.dataset.st = '';
    drawCard(j); saveQ();
    if (['ok', 'bad'].includes(j.state)) { const H = LS('hist') || [], h = H.find(x => x.u === j.url && !x.res && !x.grp); if (h) { h.res = j.res; if (!h.thumb) h.thumb = j.thumb; LS('hist', H); } }
    return;
  }
  if (p.id !== probeId) return;
  if (!p.ok && probeK + 1 < triesFor(probeUrl).length) { probe(probeUrl, probeK + 1); return; }
  if (!p.ok && !/IG_|TG_|Sign in|login|log in|cookies|Private|unavailable|removed|geo|country|members|會員|JavaScript runtime|Unsupported URL/i.test(p.msg || '')) { info = null; drawPreview(); drawQual(); return; }   // 一般的預覽失敗：不顯示，直接下載就好
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
  if (info.err) { el.innerHTML = `<div class="pv-b"><div class="pv-err">${esc(info.err)}</div><div class="pv-m">還是可以直接按下載試試看。<button class="link" type="button" id="reProbe">再解析一次</button></div></div>`; $('#reProbe').onclick = () => probe(info.url, 0); return; }
  if (info.tg) { el.innerHTML = `<div class="pv-b"><div class="pv-t">Telegram 貼文</div><div class="pv-m"><span class="badge">TG</span><span class="ok-t">已登入，會用你的帳號下載</span></div></div>`; return; }
  if (info.profile) { el.innerHTML = `<div class="pv-b"><div class="pv-t">@${esc(info.profile)} 的 IG</div><div class="pv-m"><span class="badge">IG</span><span>可以看他的所有貼文，勾選後一次下載</span></div></div>`; return; }
  const st = siteOf(info.url);
  const noFmt = st.k === 'YouTube' && !info.isList && (!info.heights || !info.heights.length);
  const ch = (info.chapters || []).length;
  el.innerHTML = `${thumbImg(info.thumb)}<div class="pv-b"><div class="pv-t">${esc(info.title || '（沒有標題）')}</div>
    <div class="pv-m"><span class="badge">${esc(st.ab)}</span>${info.uploader ? `<span>${esc(info.uploader)}</span>` : ''}${info.dur ? `<span>${fmtDur(info.dur)}</span>` : ''}${info.isList ? `<span>清單 ${info.count} 部</span>` : ''}${ch ? `<span>${ch} 個章節</span>` : ''}${info.ig ? `<span>${esc(info.ig.sum)}</span><span>原始畫質</span>` : ''}${info.live ? '<span class="ok-t">直播中</span>' : ''}${cookieOk(st.ck) ? '<span class="ok-t">已登入</span>' : ''}</div>
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
  $('#bGo').textContent = L.length > 1 ? `下載 ${L.length} 個（${qLabel(sel.q)}）` : `下載 ${qShow(sel.q, info && info.ok && info.heights ? resFor(sel.q, info.heights[0]) : 0)}`;
  if (info && info.profile) $('#bGo').textContent = `看 @${info.profile} 的所有貼文`;
}

$('#bGo').onclick = () => {
  if (info && info.profile) { openIg(info.profile); return; }
  const L = currentUrls(); if (!L.length) { toast('先貼上網址'); urlBox.focus(); return; }
  const a = parseTime($('#secFrom').value), b = parseTime($('#secTo').value);
  if (Number.isNaN(a) || Number.isNaN(b) || (a != null && b != null && b <= a)) { toast('片段時間看不懂，例如 1:20 到 2:45'); $('#more').open = true; return; }
  const section = (a != null || b != null) ? `*${a != null ? a : 0}-${b != null ? b : 'inf'}` : '';
  if (S.notify && !LS('askedNotify')) { call('askNotify'); LS('askedNotify', 1); }
  const grp = L.length > 1 ? newGrp() : '';                                 // 一次按下載的多個網址＝一組，紀錄裡合成一筆
  L.forEach(u => enqueue(u, sel.q, L.length === 1 ? info : null, { section, sponsor: sel.sponsor, chapters: sel.chapters, grp, grpN: L.length }));
  urlBox.value = ''; info = null; probeUrl = ''; $('#secFrom').value = ''; $('#secTo').value = ''; sel.chapters = false; sel.sponsor = S.sponsor;
  onInput();
  toast(L.length > 1 ? `已加入 ${L.length} 個` : '已加入下載');
};

// ---- 剪貼簿、分享、捷徑
// 同一支影片的不同寫法（多了 ?si=、?igsh= 之類的尾巴）要當成同一個
function urlKey(u) {
  try {
    const x = new URL(u), h = x.hostname.replace(/^(www|m)\./, ''); let m;
    if (/youtu\.be$/.test(h)) return 'yt:' + x.pathname.slice(1).split('/')[0];
    if (/youtube\.com$/.test(h)) { const v = x.searchParams.get('v'); if (v) return 'yt:' + v; m = x.pathname.match(/\/(shorts|live|embed)\/([\w-]+)/); if (m) return 'yt:' + m[2]; }
    const ig = igCode(u); if (ig) return 'ig:' + ig.code;
    m = x.pathname.match(/\/video\/(\d+)/); if (/tiktok\.com$/.test(h) && m) return 'tt:' + m[1];
    ['si', 'igsh', 'igshid', 'img_index', 'cplk', 'utm_source', 'utm_medium', 'utm_campaign', 'feature', 'share_id', '_r', '_t', 'spm_id_from', 'vd_source'].forEach(k => x.searchParams.delete(k));
    return h + x.pathname.replace(/\/$/, '') + x.search;
  } catch (e) { return String(u); }
}
// 這個網址是不是抓過了：'busy'＝正在抓或排隊中，'had'＝下載過，''＝沒有
function seenUrl(u) {
  const k = urlKey(u);
  if (Q.some(j => (j.state === 'run' || j.state === 'wait') && urlKey(j.url) === k)) return 'busy';
  if (Q.some(j => j.state === 'ok' && urlKey(j.url) === k) || (LS('hist') || []).some(h => h.ok && hUrls(h).some(u => urlKey(u) === k))) return 'had';
  return '';
}
// 處理過的網址（剪貼簿、分享、貼上、下載都算）：用 urlKey 記「哪一則」，同一則換了追蹤碼也認得；剪貼簿的舊內容不會再被處理
function doneKeys() { return LS('doneKeys') || []; }
function markDone(u) { const k = urlKey(u), L = doneKeys().filter(x => x !== k); L.push(k); LS('doneKeys', L.slice(-300)); LS('lastClip', u); }
const isDone = u => doneKeys().includes(urlKey(u)) || u === LS('lastClip');
// 剪貼簿只收支援的網站（避免複製到文章、別的連結就去解析）
const goodUrl = u => siteOf(u) !== OTHER;
function autoGo(u) { markDone(u); page('dl'); enqueue(u, S.quality, null, { sponsor: S.sponsor }); }
function checkClip() {
  if (!has('paste') || !S.clip) return;
  const u = urlsIn(N.paste()).find(goodUrl); if (!u) return;               // 不是支援的網站（文章、其他連結）：不理它
  if (isDone(u) || currentUrls().some(x => urlKey(x) === urlKey(u))) return; // 處理過的（含幾小時前的舊剪貼簿）：不再處理
  markDone(u);
  const seen = seenUrl(u);
  if (seen === 'busy') return;
  if (seen === 'had') { toast('剪貼簿的網址之前下載過了，略過', 2200); return; }
  autoGo(u); grabFx(1, '開始下載（' + siteOf(u).k + '）');
}
// 回到 App 時，系統可能還沒把剪貼簿交給我們，所以分幾次讀
let clipTimers = [];
function clipSoon() { clipTimers.forEach(clearTimeout); clipTimers = [300, 900, 1800, 3000].map(ms => setTimeout(checkClip, ms)); }
window.onResume = () => { clipSoon(); refreshEnv(); pump(); autoCheck(false); };
window.addEventListener('focus', clipSoon);
window.onFocusWin = clipSoon;
document.addEventListener('visibilitychange', () => { if (!document.hidden) clipSoon(); });
// 分享選單「YT Download」：畫面不跳過來，直接開始下載（不管有沒有開「自動下載」）
window.onShareBg = (t, inApp) => {
  const all = [...new Set(urlsIn(t))], L = all.filter(goodUrl).length ? all.filter(goodUrl) : all.slice(0, 1);   // 有支援的網站就只抓那些；都不是就試第一個
  const say = m => inApp ? toast(m, 2500) : call('toastTop', m);
  if (!L.length) { say('分享的內容裡沒有網址'); setTimeout(() => call('bgDone'), 300); return; }
  const fresh = L.filter(u => !seenUrl(u));
  L.forEach(markDone);
  const grp = fresh.length > 1 ? newGrp() : '';
  fresh.forEach(u => enqueue(u, S.quality, null, { sponsor: S.sponsor, grp, grpN: fresh.length }));
  if (!fresh.length) say('這個之前下載過、或正在下載，略過');
  else { page('dl'); const m = fresh.length > 1 ? `已加入 ${fresh.length} 個` : '已加入下載'; grabFx(fresh.length, m); if (!inApp) say('⬇ YT Download ' + m); }
  setTimeout(() => call('bgDone'), 600);
};
window.onShare = t => {
  page('dl'); const L = urlsIn(t);
  if (!L.length) { toast('分享的內容裡沒有網址'); return; }
  window.onShareBg(t, true);
};
// ---- 🪟 分屏：請系統把另一個 App 開在旁邊（平板大螢幕上會直接進分屏，手機分身裡也試得到）
function splitGo(pkg, name) {
  LS('splitPkg', pkg); LS('splitName', name || pkg); $('#splitBox').hidden = true;
  const r = N.splitWith(pkg); if (r !== 'OK') { toast(r); return; }
  setTimeout(() => { if (call('multiWin')) toast('分屏好了 👏', 1800); else toast('系統沒有讓它分屏（只開了一邊）。可以再按一次試試，或把這個情況告訴我', 5000); }, 1800);
}
function drawSplit() {
  const box = $('#splitBox'), apps = jcall('launchApps') || [], kw = (box.querySelector('input') || {}).value || '';
  const cur = LS('splitPkg'), curName = LS('splitName');
  if (!box.querySelector('input')) box.innerHTML = `${cur ? `<button class="btn primary" type="button" data-sp="${esc(cur)}" data-sn="${esc(curName || cur)}">🪟 跟 ${esc(curName || cur)} 分屏</button>` : ''}<span class="mut small">挑一個要開在旁邊的 App（會記住；長按 YT Download 圖示有「分屏」捷徑，可以拖到桌面一鍵分屏）</span><input type="search" placeholder="搜尋 App"><div class="chips"></div>`;
  const q = kw.trim().toLowerCase();
  box.querySelector('.chips').innerHTML = apps.filter(a => !q || (a.name + a.pkg).toLowerCase().includes(q)).slice(0, 120).map(a => `<button class="chip" type="button" data-sp="${esc(a.pkg)}" data-sn="${esc(a.name)}" aria-pressed="${a.pkg === cur}">${esc(a.name)}</button>`).join('') || '<span class="mut small">找不到</span>';
}
$('#bSplit').onclick = () => { const box = $('#splitBox'); box.hidden = !box.hidden; if (!box.hidden) { box.innerHTML = ''; drawSplit(); } };
$('#splitBox').addEventListener('input', () => drawSplit());
$('#splitBox').addEventListener('click', e => { const b = e.target.closest('[data-sp]'); if (b) splitGo(b.dataset.sp, b.dataset.sn); });
window.onShortcut = k => {
  if (k === 'split') { const p = LS('splitPkg'); if (p) splitGo(p, LS('splitName')); else { page('dl'); $('#splitBox').hidden = false; $('#splitBox').innerHTML = ''; drawSplit(); toast('先挑一次要跟誰分屏，之後捷徑就會直接分'); } return; }
  if (k === 'paste') { page('dl'); const t = call('paste') || ''; if (S.clip && urlsIn(t).length) window.onShare(t); else if (!addUrls(t, true)) toast('剪貼簿裡沒有網址'); }
  else if (k === 'browse') { page('dl'); $('#bBrowse').click(); }
};

// =====================================================================
// 佇列（會存起來，App 關掉再開會接回）
// =====================================================================
const Q = [];
let seq = 0;
const KEEP = ['id', 'pid', 'url', 'q', 'site', 'ab', 'title', 'thumb', 'playlist', 'subs', 'embed', 'sponsor', 'chapters', 'section', 'k', 'state', 'pct', 'files', 'msg', 't', 'took', 'res', 'uploader', 'bulk', 'uid', 'hdSrc', 'doneAt', 'grp', 'grpN'];
function saveQ() { LS('queue', Q.slice(0, 60).map(j => { const o = {}; KEEP.forEach(k => o[k] = j[k]); return o; })); }
function enqueue(url, q, inf, x) {
  x = x || {};
  const st = siteOf(url);
  const j = { id: 'j' + Date.now() + '_' + (seq++), url, q, site: st.k, ab: st.ab, title: inf && inf.ok ? inf.title : '', thumb: inf && inf.ok ? inf.thumb : '',
    playlist: !!(inf && inf.isList && sel.playlist), subs: !!(sel.subs && !['audio', 'mp3', 'thumb'].includes(q)), embed: !!(sel.embed && q !== 'thumb'),
    sponsor: !!(x.sponsor && st.k === 'YouTube' && q !== 'thumb'), chapters: !!(x.chapters && q !== 'thumb'), section: x.section || '',
    k: inf && inf.ok ? (inf.k || 0) : 0, state: 'wait', pct: 0, t: Date.now() };
  j.uploader = inf && inf.ok ? (inf.uploader || '') : ''; j.uid = (inf && (inf.uid || (inf.ig && inf.ig.uid))) || ''; j.igData = (inf && inf.ig) || null; j.bulk = !!x.bulk; j.grp = x.grp || ''; j.grpN = x.grpN || 0;
  if (inf && inf.ok && inf.heights && inf.heights.length) j.res = resFor(q, inf.heights[0]);
  Q.unshift(j); drawCard(j); pump(); saveQ();
  if (!(inf && inf.ok) && has('probe') && q !== 'thumb' && st.k !== 'Instagram' && !(st.k === 'Telegram' && tgReady())) N.probe('qi:' + j.id, url, probeSpec(url, 0));
}
const running = () => Q.filter(j => j.state === 'run').length;
let netWait = false;
function pump() {
  if (S.wifi && has('netInfo')) {
    const n = jcall('netInfo') || {};
    netWait = !!(n.metered || !n.wifi);
    if (netWait && Q.some(j => j.state === 'wait')) { Q.filter(j => j.state === 'wait').forEach(drawCard); counts(); return; }
  } else netWait = false;
  const CAP = { YouTube: 2, Telegram: 3 };      // 各平台同時最多幾個（YouTube 每個本身已經多線）
  for (const n of [...Q].reverse().filter(j => j.state === 'wait')) {
    if (running() >= S.conc) break;
    if (CAP[n.site] && Q.filter(j => j.state === 'run' && j.site === n.site).length >= CAP[n.site]) continue;
    // IG 慢慢來：一次只抓一則，而且要等上一則結束後隔一下
    if (n.site === 'Instagram' && S.igSlow && (Date.now() < igNext || Q.some(j => j.state === 'run' && j.site === 'Instagram'))) continue;
    startJob(n);
  }
  counts();
}
let igNext = 0, igCount = 0;
function igPace() {   // 每抓完一則 IG：隔 2～5 秒；每 20 則休息 2～4 分鐘
  if (!S.igSlow) return;
  igCount++;
  const left = Q.some(j => j.state === 'wait' && j.site === 'Instagram');
  igNext = Date.now() + (left && igCount % 20 === 0 ? 120e3 + Math.random() * 120e3 : 2000 + Math.random() * 3000);
  setTimeout(pump, igNext - Date.now() + 100);
}
setInterval(() => { if (igNext > Date.now()) { const j = [...Q].reverse().find(x => x.state === 'wait' && x.site === 'Instagram'); if (j) drawCard(j); } }, 5000);
setInterval(() => { if (netWait) pump(); }, 20000);

function argsFor(j) {
  const a = [...(triesFor(j.url)[j.k] || [])];
  // 同樣的解析度：H.264 > H.265 > VP9 > AV1；聲音 AAC 優先（手機、平板內建播放器最能播）
  if (S.noAv1 && !['audio', 'mp3', 'thumb'].includes(j.q)) a.push(['-S', (+j.q ? 'res:' + j.q : 'res') + ',+codec:avc:m4a']);
  const yt = siteOf(j.url).k === 'YouTube', viaAria = S.aria && !j.section && !j.chapters;
  if (yt && !viaAria) {
    if (S.ytFast && !j.noFast) {
      // 多線：先把 YouTube 的檔案變成很多小段（formats=dashy），再同時抓好幾段（-N）
      const i = a.findIndex(x => x[0] === '--extractor-args' && /^youtube:/.test(x[1]));
      if (i >= 0) a[i] = ['--extractor-args', a[i][1] + ';formats=dashy']; else a.push(['--extractor-args', 'youtube:formats=dashy']);
      a.push(['--concurrent-fragments', String(S.ytConn || 8)]);
      j.fast = true;
    } else j.fast = false;
    a.push(YT_CHUNK);
  }
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
async function igStart(j) {
  runInit(j, '讀取 IG 貼文…'); j.igWait = true;
  drawCard(j); saveQ();
  try {
    const d = j.igData || await igFetch(j.url);
    if (!j.igWait) return;                       // 等的時候被取消了
    j.igWait = false; j.stage = '';
    if (!j.title) j.title = d.title; if (!j.thumb) j.thumb = d.thumb; j.uploader = d.user || j.uploader; j.uid = d.uid || j.uid || ''; j.res = 0;
    const el = document.getElementById(j.id); if (el) el.dataset.st = '';
    drawCard(j);
    N.fetchJob(JSON.stringify({ id: j.pid, items: d.items.map(x => ({ url: x.url, name: x.name })), sub: S.subdir ? 'Instagram' : '', ...saveTo(), title: j.title, notify: S.notify && !j.bulk, headers: { Referer: 'https://www.instagram.com/' } }));
  } catch (e) {
    if (!j.igWait) return; j.igWait = false;
    const m = String(e.message || e);
    if (/IG_(NONE|HTTP)/.test(m) && !j.noApi && has('job')) { j.noApi = true; startJob(j); return; }   // 改用 yt-dlp 再試一次（只有影片行）
    window.onDone(JSON.stringify({ id: j.pid, ok: false, msg: m }));
  }
}
// TikTok：TikTok 給網頁的畫質常常只有 576×1024。先問 tikwm.com 有沒有更大的高畫質檔，有才換過去；照片輪播也靠它
let twNext = 0;
async function ttStart(j) {
  runInit(j, '找高畫質來源…'); j.igWait = true;
  drawCard(j); saveQ();
  const back = () => { j.igWait = false; j.noHd = true; j.hdSrc = false; startJob(j); };   // 沒有更好的：照原本方式（yt-dlp）
  try {
    const wait = twNext - Date.now(); twNext = Math.max(Date.now(), twNext) + 1300; if (wait > 0) await sleep(wait);   // 這個服務一秒只能問一次
    const r = await httpReq({ url: 'https://www.tikwm.com/api/?hd=1&url=' + encodeURIComponent(j.url) });
    if (!j.igWait) return;
    let d = null; try { d = JSON.parse(r.body); } catch (e) {}
    const x = d && d.code === 0 && d.data;
    const imgs = x && Array.isArray(x.images) && x.images.length ? x.images : null;
    const hd = x && x.hdplay && (+x.hd_size > (+x.size || 0) * 1.15);
    if (!imgs && !hd) { back(); return; }
    j.igWait = false; j.stage = '';
    const who = (x.author && x.author.unique_id) || 'tiktok', id = x.id || Date.now();
    const clean = t => String(t || '').replace(/[\\/:*?"<>|\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!j.title || /^TikTok video #/.test(j.title)) j.title = clean(x.title) || j.title || `TikTok ${id}`;
    if (!j.thumb) j.thumb = x.cover || ''; j.uploader = who; j.hdSrc = !imgs; j.res = 0;
    const items = imgs ? imgs.map((u, i) => ({ url: u, name: `${who} ${id} ${String(i + 1).padStart(2, '0')}.jpg` })) : [{ url: new URL(x.hdplay, 'https://www.tikwm.com').href, name: `${clean(x.title).slice(0, 70) || 'TikTok'} [${id}].mp4` }];
    const el = document.getElementById(j.id); if (el) el.dataset.st = '';
    drawCard(j);
    N.fetchJob(JSON.stringify({ id: j.pid, items, sub: S.subdir ? 'TikTok' : '', ...saveTo(), title: j.title, notify: S.notify }));
  } catch (e) { if (j.igWait) back(); }
}
const tgReady = () => { const t = jcall('tgInfo'); return !!(t && t.state === 'ready'); };
function tgStartJob(j) {
  runInit(j, '向 Telegram 要檔案…'); j.viaTg = true;
  drawCard(j); saveQ();
  N.tgJob(JSON.stringify({ id: j.pid, url: j.url, sub: S.subdir ? 'Telegram' : '', ...saveTo(), title: j.title, notify: S.notify }));
}
window.onTitle = s2 => { const p = JSON.parse(s2), j = byPid(p.id); if (j && p.title) { j.title = p.title; stg.key = ''; drawStage(); } };
function modeFor(j) {
  const q = j.q;
  if (q === 'thumb') return 'none';
  if (!S.noAv1 || ['audio', 'mp3'].includes(q)) return q;
  // 相容格式優先：格式交給下面 argsFor 的排序（-S）決定，這裡只限制解析度
  const h = +q, lim = h ? `[height<=${h}]` : '';
  return `f:bv*${lim}+ba/b${lim}/bv*+ba/b`;
}
function startJob(j) {
  if (j.site === 'Telegram' && has('tgJob') && tgReady() && !j.noTg) { tgStartJob(j); return; }
  if (j.site === 'TikTok' && S.ttHd && has('fetchJob') && has('http') && !j.noHd && !['audio', 'mp3', 'thumb'].includes(j.q) && !j.section && !j.chapters) { ttStart(j); return; }
  if (j.site === 'Instagram' && has('fetchJob') && !j.noApi && !['audio', 'mp3'].includes(j.q)) { igStart(j); return; }
  runInit(j, '準備中…');
  const st = siteOf(j.url);
  const spec = { id: j.pid, url: j.url, mode: modeFor(j), args: argsFor(j), sub: S.subdir ? j.site : '', playlist: j.playlist,
    tpl: (j.playlist ? '%(playlist_index|)s ' : '') + (TPL_STR[S.tpl] || TPL_STR.title), title: j.title, notify: S.notify,
    ...saveTo(), cookies: cookieOk(st.ck) ? st.ck : '', aria2: !!(S.aria && !j.section && !j.chapters) };
  drawCard(j); saveQ();
  if (has('job')) N.job(JSON.stringify(spec));
  else setTimeout(() => window.onDone(JSON.stringify({ id: j.pid, ok: false, msg: '要在 App 裡才能下載' })), 300);
}
function runInit(j, stage) { Object.assign(j, { state: 'run', pct: 0, stage, pid: j.id + '~' + j.k, size: '', speed: '', eta: '', item: '', sm: null, total: 0, t0: Date.now() }); }
const byPid = pid => Q.find(j => j.pid === pid);
const saveTo = () => ({ dest: S.dest && S.dest.uri ? S.dest.uri : '', gallery: S.gallery === 'off' ? '' : S.gallery });

let fgLast = 0;
window.onProg = s => {
  const p = JSON.parse(s), j = byPid(p.id); if (!j || j.state !== 'run') return;
  j.act = Date.now();
  const line = String(p.line || '');
  if (p.pct > 0) j.pct = p.pct;
  let m, inst = 0;
  if ((m = line.match(/of\s+~?\s*([\d.]+\s*[KMG]i?B)/)) || (m = line.match(/\/([\d.]+\s*[KMG]i?B)\(/))) { j.size = m[1].replace('i', ''); j.total = toBytes(m[1]); }
  if ((m = line.match(/at\s+([\d.]+\s*[KMG]?i?B)\/s/)) || (m = line.match(/DL:([\d.]+\s*[KMG]?i?B)/))) inst = toBytes(m[1]);
  if ((m = line.match(/Downloading item (\d+) of (\d+)/)) || (m = line.match(/\[fetch\] (\d+)\/(\d+)/))) j.item = m[2] > 1 ? m[1] + '/' + m[2] : '';
  if ((m = line.match(/^\[tg\] (\d+)\/(\d+) (\d+) (\d+)/))) { j.item = +m[2] > 1 ? m[1] + '/' + m[2] : ''; j.total = +m[4]; j.size = fmtSize(+m[4]); }
  if (p.pct > 0 || inst > 0) smooth(j, p.pct > 0 ? p.pct : 0, inst, p.eta);
  j.stage = /\[Merger\]|Merging/.test(line) ? '合併影像和聲音…' : /ExtractAudio/.test(line) ? '轉成 MP3…' : /SponsorBlock|ModifyChapters/.test(line) ? '剪掉贊助片段…' : /SplitChapters/.test(line) ? '依章節切檔…' : /EmbedThumbnail|EmbedSubtitle|Metadata/.test(line) ? '寫入封面和資訊…' : /\[download\]|DL:|\[fetch\]|^\[tg\]/.test(line) ? '' : (p.pct > 0 ? '' : '連線中…');
  if (!j.title) { const t = line.match(/Destination: (?:.*\/)?(.+?)\.[a-z0-9]+$/i); if (t) j.title = t[1].replace(/\s\[[\w-]{6,}\]$/, ''); }
  drawCard(j);
  if (Date.now() - fgLast > 2000) { fgLast = Date.now(); const r = Q.filter(x => x.state === 'run'); call('fgText', r.map(x => `${(x.title || x.site).slice(0, 18)} ${x.pct ? Math.round(x.pct) + '%' : ''}`).join('、')); }
};
setInterval(() => {                                                          // 卡住偵測：進行中但 6 分鐘完全沒有任何進度
  const now = Date.now();
  Q.filter(j => j.state === 'run' && !j.stuck && !/合併|轉成|剪掉/.test(j.stage || '') && now - (j.act || j.t0 || now) > 360e3).forEach(j => {
    j.stuck = '卡住了（6 分鐘沒有任何進度），已自動停止，可以按重試'; j.stop = 1; call('cancel', j.pid);
  });
}, 30000);
window.onDone = s => {
  const p = typeof s === 'string' ? JSON.parse(s) : s, j = byPid(p.id); if (!j) return;
  if (j.stuck && !p.ok) { p.msg = j.stuck; j.stuck = ''; }
  if (!p.ok && j.fast && !j.noFast && !j.stop && p.msg !== '已取消' && !/Private|unavailable|removed|No space/i.test(p.msg || '')) { j.noFast = true; j.stage = '多線下載失敗，改回一般方式…'; startJob(j); return; }
  if (!p.ok && j.hdSrc && !j.stop && p.msg !== '已取消') { j.hdSrc = false; j.noHd = true; startJob(j); return; }   // 高畫質來源抓失敗：改回原本方式
  if (!p.ok && !j.stop && p.msg !== '已取消' && j.k + 1 < triesFor(j.url).length && !/Private|unavailable|removed|Unsupported|No space|login|cookies|資料夾/i.test(p.msg || '')) {
    j.k++; j.stage = `換方式重試（${j.k + 1}/${triesFor(j.url).length}）…`; startJob(j); return;
  }
  j.state = p.ok ? 'ok' : (p.msg === '已取消' ? 'cancel' : 'bad');
  j.files = p.files || []; j.msg = p.ok ? '' : (p.msg === '已取消' ? '已取消' : friendly(p.msg, j.site)); j.raw = p.msg || '';
  if (!j.title && j.files[0]) j.title = j.files[0].name.replace(/\.[^.]+$/, '');
  if (p.ok && j.t0) j.took = Math.round((Date.now() - j.t0) / 1000);
  if (j.state !== 'cancel') saveHist(j);
  if (p.ok && S.vibe) call('vibrate', 60);
  if (j.site === 'Instagram') igPace();
  j.doneAt = Date.now();
  drawStage(); drawQueue(); counts(); trimDone(); saveQ(); pump();   // 馬上畫好，自動播放才不會被重畫打斷
  if (p.ok) autoBegin(j);
};

// 下載頁只留最新完成的那一筆（其他的都在「紀錄」裡）；正在跑和排隊的照常顯示
function trimDone() {
  const F = Q.filter(j => ['ok', 'bad', 'cancel'].includes(j.state)); if (F.length < 2) return;
  const keep = F.reduce((a, b) => ((b.doneAt || b.t || 0) > (a.doneAt || a.t || 0) ? b : a));
  F.forEach(j => { if (j === keep) return; const i = Q.indexOf(j); if (i >= 0) Q.splice(i, 1); });
  drawStage(); counts();
}
function stText(j, noPct) {
  if (j.state === 'run') return j.stage || [j.pct && !noPct ? j.pct.toFixed(1) + '%' : '', j.size, j.speed, j.eta ? '剩 ' + fmtEta(j.eta) : '', j.item ? '第 ' + j.item + ' 個' : ''].filter(Boolean).join(' · ');
  if (j.state === 'wait') { const r = Math.round((igNext - Date.now()) / 1000); return netWait ? '等 Wi-Fi（設定裡開了只用 Wi-Fi）' : (j.site === 'Instagram' && S.igSlow && r > 6) ? `休息中，約 ${r >= 60 ? Math.ceil(r / 60) + ' 分鐘' : r + ' 秒'}後繼續（慢慢抓，避免被 IG 擋）` : '等前面的下載完'; }
  if (j.state === 'ok') return '已存到 ' + (j.files[0] ? j.files[0].path : '') + (j.files.length > 1 ? `（共 ${j.files.length} 個檔）` : '') + (j.took ? ' · 花了 ' + fmtEta(j.took) : '');
  return j.msg;
}
function drawCard() { if (drawCard.r) return; drawCard.r = requestAnimationFrame(() => { drawCard.r = 0; drawStage(); drawQueue(); counts(); }); }   // 一個畫面週期最多重畫一次

// =====================================================================
// 大畫面：下載頁中間只顯示「目前這一個」
// 正在下載的優先；沒有就顯示最新完成的。完成後直接看，多張可以左右滑
// =====================================================================
const stg = { id: '', key: '', idx: 0 };
function curJob() {
  const R = Q.filter(j => j.state === 'run'); if (R.length) return R.reduce((a, b) => ((b.t0 || 0) > (a.t0 || 0) ? b : a));
  const F = Q.filter(j => ['ok', 'bad', 'cancel'].includes(j.state)); if (F.length) return F.reduce((a, b) => ((b.doneAt || b.t || 0) > (a.doneAt || a.t || 0) ? b : a));
  return [...Q].reverse().find(j => j.state === 'wait') || null;
}
// ---- 一次丟好幾個：大畫面改顯示「這一批」的總進度，下面清單列出每一個
const batch = { m: new Map() };   // id → 最後看到的樣子（完成後會從 Q 拿掉，所以自己記）
function batchNow() {
  const act = Q.filter(j => j.state === 'run' || j.state === 'wait');
  if (!act.length) { batch.m.clear(); return null; }
  act.forEach(j => { if (!batch.m.has(j.id)) batch.m.set(j.id, {}); });
  const L = [];
  batch.m.forEach((snap, id) => {
    const j = Q.find(x => x.id === id);
    if (j) Object.assign(snap, { id, title: j.title, url: j.url, ab: j.ab, thumb: j.thumb, state: j.state, pct: j.pct || 0, speed: j.speed, spd: j.state === 'run' && j.sm ? j.sm.spd || 0 : 0, left: j.state === 'run' && j.total > 0 ? j.total * (1 - (j.pct || 0) / 100) : 0, t: j.t || 0, j });
    else if (snap.j) { if (snap.state === 'run' || snap.state === 'wait') snap.state = 'ok'; snap.spd = 0; snap.left = 0; snap.j = null; }
    if (snap.id) L.push(snap);
  });
  return L.length >= 2 ? L : null;
}
const bDone = s => s.state === 'ok' || s.state === 'bad' || s.state === 'cancel';
function drawBatch(L) {
  const el = $('#stage'), box = $('#stageInfo');
  if (stg.key !== 'batch') {
    autoStop(); stg.id = ''; stg.key = 'batch'; stg.idx = 0; pager.el = null;
    el.className = 'stage run batch';
    el.innerHTML = `<div class="st-over"><div class="st-cap">總進度</div><div class="st-pct"></div><div class="bar"><i></i></div><div class="st-txt"></div></div>`;
    box.innerHTML = `<div class="ct" id="bTitle"></div><div class="acts"><button class="btn ghost" data-a="cancelAll" type="button">全部取消</button></div>`;
  }
  const n = L.length, done = L.filter(bDone).length, runL = L.filter(s => s.state === 'run');
  const tot = L.reduce((a, s) => a + (bDone(s) ? 100 : s.state === 'run' ? Math.min(100, s.pct) : 0), 0) / n;
  const spd = runL.reduce((a, s) => a + s.spd, 0), left = runL.reduce((a, s) => a + s.left, 0);
  el.querySelector('.st-pct').textContent = Math.floor(tot) + '%';
  el.querySelector('.bar i').style.width = Math.max(2, tot) + '%';
  el.querySelector('.st-txt').textContent = [`完成 ${done} / ${n} 個`, runL.length ? `${runL.length} 個同時下載` : '', spd > 0 ? '合計 ' + fmtSize(spd) + '/s' : '', left > 0 && spd > 0 && !L.some(s => s.state === 'wait') ? '剩 ' + fmtEta(Math.round(left / spd)) : ''].filter(Boolean).join(' · ');
  $('#bTitle').textContent = `這一批共 ${n} 個檔案`;
}
function drawStage() {
  const el = $('#stage'), box = $('#stageInfo');
  $('#stageMore').textContent = '';
  const B = batchNow(); if (B) return drawBatch(B);
  if (stg.key === 'batch') stg.key = '';
  const j = curJob();
  if (!j) { if (stg.key !== 'empty') { stg.id = ''; stg.key = 'empty'; stg.idx = 0; el.className = 'stage empty'; el.innerHTML = '<p>複製影片或貼文的網址，再打開 App，<br>就會自動下載並顯示在這裡。</p>'; box.innerHTML = ''; } return; }
  const M = j.state === 'ok' ? mediaOf(j.files) : [];
  if (stg.id !== j.id) stg.idx = 0;
  stg.idx = Math.max(0, Math.min(stg.idx, Math.max(0, M.length - 1)));
  const key = stageKey(j, M);
  if (key !== stg.key) {
    autoStop();
    stg.id = j.id; stg.key = key;
    el.className = 'stage ' + j.state + (M.length || j.thumb ? '' : ' bare');
    let m = '';
    if (M.length) {
      const f = M[stg.idx];
      m = `<div class="st-slide cur">${slideHTML(j, f)}</div><button class="st-play" type="button" aria-label="播放"${mimeOf(f).startsWith('image/') ? ' hidden' : ''}>▶</button><div class="st-hint" hidden></div><div class="st-ctl" hidden><span class="st-cur">0:00</span><input type="range" class="st-bar" min="0" max="1000" value="0" aria-label="播放進度"><span class="st-dur"></span><button class="st-mute" type="button" aria-label="聲音">🔇</button></div>`;
      if (M.length > 1) m = `<div class="pgr"></div><span class="st-count">1 / ${M.length}</span>`;      // 多張：一頁一張
    } else {
      m = (j.thumb ? `<img class="st-m dim" src="${esc(j.thumb)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : '')
        + (j.state === 'ok' ? '' : `<div class="st-over"><div class="st-pct"></div><div class="bar"><i></i></div><div class="st-txt"></div></div>`);
    }
    el.innerHTML = m;
    if (M.length > 1) pagerBuild(j, M); else pager.el = null;
    { const v0 = stageVid(); if (v0) stageWire(v0); }      // 一顯示就接上，播不了才能馬上提示
    const acts = (j.state === 'run' || j.state === 'wait') ? '<button class="btn ghost" data-a="cancel" type="button">取消</button>'
      : j.state === 'ok' ? '<button class="btn" data-a="open" type="button">全螢幕播放</button><button class="btn ghost" data-a="share" type="button">分享</button><button class="btn ghost" data-a="x" type="button">清掉</button>'
      : `<button class="btn" data-a="retry" type="button">重試</button>${j.state === 'bad' ? '<button class="btn ghost" data-a="detail" type="button">詳細</button>' : ''}<button class="btn ghost" data-a="x" type="button">清掉</button>`;
    const tags = [qShow(j.q, j.res), j.playlist ? '清單' : '', j.section ? '片段' : '', j.chapters ? '章節' : '', j.sponsor ? '跳贊助' : '', j.hdSrc ? '高畫質來源' : ''].filter(Boolean);
    box.innerHTML = `<div class="ct">${esc(j.title || j.url)}</div>
      <div class="cm"><span class="badge">${esc(j.ab)}</span>${j.uploader ? `<span>${esc(j.uploader)}</span>` : ''}${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>
      <div class="st ${j.state}" id="stageSt"></div><div class="acts">${acts}</div>`;
  }
  // 會一直變的部分：進度、狀態文字
  const pct = j.state === 'run' ? Math.max(0, j.pct || 0) : 0;
  const bar = el.querySelector('.bar i'); if (bar) bar.style.width = (j.state === 'run' ? Math.max(2, pct) : j.state === 'wait' ? 0 : 100) + '%';
  const pp = el.querySelector('.st-pct'); if (pp) pp.textContent = j.state === 'run' ? (pct ? Math.round(pct) + '%' : '…') : j.state === 'wait' ? '排隊中' : j.state === 'bad' ? '失敗' : '已取消';
  const tt = el.querySelector('.st-txt'); if (tt) tt.textContent = j.state === 'bad' || j.state === 'cancel' ? '' : stText(j, 1);
  const st = $('#stageSt'); if (st) st.textContent = j.state === 'run' || j.state === 'wait' ? '' : stText(j);
}
const stageKey = (j, M) => [j.id, j.state, M.length, stg.idx, j.thumb || '', j.title || '', netWait].join('|');
function slideHTML(j, f) {
  const t = mimeOf(f);
  return t.startsWith('image/') ? `<img class="st-m" src="${esc(f.uri)}" alt="" draggable="false">`
    : `<video class="st-m" src="${esc(f.uri)}${t.startsWith('video/') ? '#t=0.5' : ''}" preload="metadata" playsinline muted${!t.startsWith('video/') && j.thumb ? ` poster="${esc(j.thumb)}"` : ''}></video>`;
}
const stageEl = $('#stage');
const stageVid = () => stageEl.querySelector('.st-slide.cur video');
let stageG = null;      // 手指正在大畫面上做的動作
function stageWire(v) { // 把影片接上進度條、播放鈕（只對「現在中間這一個」更新畫面）
  if (v.dataset.w) return; v.dataset.w = '1';
  const q = c => stageEl.querySelector(c), mine = () => v === stageVid();
  v.addEventListener('timeupdate', () => { const bar = q('.st-bar'); if (!mine() || (stageG && stageG.mode === 'seek') || !isFinite(v.duration) || !bar) return; bar.value = Math.round(v.currentTime / v.duration * 1000); q('.st-cur').textContent = fd(v.currentTime); q('.st-dur').textContent = fmtDur(v.duration); });
  v.addEventListener('play', () => { if (!mine()) return; const b = q('.st-play'), c = q('.st-ctl'); if (b) b.hidden = true; if (c) c.hidden = false; muteIcon(v); call('keepOn', true); });
  v.addEventListener('volumechange', () => { if (mine()) muteIcon(v); });
  v.addEventListener('pause', () => { if (!mine()) return; const b = q('.st-play'), c = q('.st-ctl'); if (b && (!c || c.hidden)) b.hidden = false; call('keepOn', false); });
  v.addEventListener('ended', () => { if (!mine()) return; const b = q('.st-play'); if (b && !auto.on) b.hidden = false; if (!auto.on) call('keepOn', false); });
  const bad = () => { if (!mine() || q('.st-err')) return; autoStop(); const b = q('.st-play'); if (b) b.hidden = true; stageEl.insertAdjacentHTML('beforeend', '<div class="st-err"><span>這支影片的格式手機內建的播放器解不了</span><button class="btn primary" type="button" data-a="ext">用其他 App 播（例如 MX Player）</button></div>'); };
  v.addEventListener('error', bad);
  if (v.error) bad();
}
// 下載頁大畫面的影片一律先靜音（自動播放也不會突然出聲），右下 🔇 點一下開聲音（只開這一支）
function muteIcon(v) { const m = stageEl.querySelector('.st-mute'); if (m) m.textContent = v.muted ? '🔇' : '🔊'; }
stageEl.addEventListener('click', e => { if (!e.target.closest('.st-mute')) return; const v = stageVid(); if (!v) return; v.muted = !v.muted; muteIcon(v); });
function stageToggle() {
  const v = stageVid(); if (!v) return; stageWire(v);
  if (v.paused) { if (!v.dataset.s) { v.dataset.s = '1'; try { v.currentTime = 0; } catch (e) {} } vplay(v); }
  else v.pause();
}
// 換到第 n 個。dir：1＝新的從右邊滑進來（往左滑），-1＝從左邊進來
function slideTo(n, dir, fromAuto) {
  const j = curJob(); if (!j) return; const M = mediaOf(j.files); if (M.length < 2) return;
  n = ((n % M.length) + M.length) % M.length;
  const old = stageEl.querySelector('.st-slide.cur');
  if (!old) { stg.idx = n; drawStage(); return; }
  const f = M[n], isImg = mimeOf(f).startsWith('image/');
  const nw = document.createElement('div'); nw.className = 'st-slide cur'; nw.innerHTML = slideHTML(j, f); nw.style.transform = `translateX(${dir * 100}%)`;
  old.classList.remove('cur'); stageEl.insertBefore(nw, old.nextSibling);
  stg.idx = n; stg.key = stageKey(j, M);                                   // 自己換好了，drawStage 不用重畫
  const cnt = stageEl.querySelector('.st-count'); if (cnt) cnt.textContent = `${n + 1} / ${M.length}`;
  const b = stageEl.querySelector('.st-play'), c = stageEl.querySelector('.st-ctl'); if (b) b.hidden = isImg || fromAuto; if (c) c.hidden = true;
  void nw.offsetWidth;                                                     // 讓瀏覽器先記住起點，動畫才會跑
  nw.style.transform = ''; old.style.transform = `translateX(${-dir * 100}%)`;
  setTimeout(() => { const ov = old.querySelector('video'); if (ov) ov.pause(); old.remove(); }, 950);
  if (fromAuto && auto.on) {
    const v = nw.querySelector('video');
    if (v) autoPlayVid(v, true);                                           // 影片：滑進來的時候就開始播
    else { clearTimeout(auto.t); auto.t = setTimeout(() => { if (auto.on) slideTo(stg.idx + 1, 1, true); }, 950 + 3200); }
  }
}
function drawQueue() {
  const box = $('#qList'); if (!box) return;
  const B = batchNow();
  const L = B ? [...B].sort((a, b) => (a.t || 0) - (b.t || 0)) : [];      // 照丟進來的順序
  box.hidden = !L.length;
  if (!L.length) { box.innerHTML = ''; box.dataset.key = ''; return; }
  const key = L.map(s => s.id + s.state + (s.title || '') + (s.thumb ? 1 : 0)).join('|');
  const runN = L.filter(s => s.state === 'run').length, waitN = L.filter(s => s.state === 'wait').length, doneN = L.filter(bDone).length;
  if (box.dataset.key !== key) {
    box.dataset.key = key;
    box.innerHTML = `<div class="ql-h">下載清單 <span class="mut small">${[runN ? runN + ' 個下載中' : '', waitN ? waitN + ' 個排隊' : '', doneN ? doneN + ' 個完成' : ''].filter(Boolean).join(' · ')}</span></div>`
      + L.map((s, i) => `<div class="ql ${s.state}" data-id="${s.id}"><span class="ql-i">${i + 1}</span>${thumbImg(s.thumb, 'ql-t')}<div class="ql-b"><div class="ql-n">${esc(s.title || s.url)}</div><div class="ql-m"><span class="badge">${esc(s.ab)}</span><span class="ql-s"></span></div><div class="bar"><i></i></div></div>${bDone(s) ? '' : '<button class="btn sm ghost" data-a="cancel" type="button">取消</button>'}</div>`).join('');
  }
  L.forEach(s => {
    const r = box.querySelector(`[data-id="${s.id}"]`); if (!r) return;
    r.querySelector('.bar i').style.width = (s.state === 'run' ? Math.max(2, s.pct) : bDone(s) ? 100 : 0) + '%';
    r.querySelector('.ql-s').textContent = s.state === 'run' ? [s.pct ? Math.round(s.pct) + '%' : '連線中', s.speed].filter(Boolean).join(' · ')
      : s.state === 'wait' ? (s.j ? stText(s.j) : '排隊中') : { ok: '✓ 完成', bad: '失敗', cancel: '已取消' }[s.state];
  });
}
function stageStep(d) { autoStop(); slideTo(stg.idx + d, d, false); }

// ---- 多張的貼文：像 IG 一樣一頁一張，滑一下換一張（會自動對齊），張跟張之間留一點空隙
const PG_GAP = 10;
const pager = { el: null, n: 0, idx: 0, drag: 0, t: 0 };
const pagerOn = () => !!(pager.el && pager.el.isConnected);
function pagerSet(ms) {
  if (!pagerOn()) return;
  pager.el.style.transition = ms ? `transform ${ms}ms cubic-bezier(.25,.8,.3,1)` : 'none';
  pager.el.style.transform = `translate3d(${-pager.idx * (stageEl.clientWidth + PG_GAP) + pager.drag}px,0,0)`;
}
const pagerVid = () => { const sl = pagerOn() && pager.el.children[pager.idx]; return sl ? sl.querySelector('video') : null; };
function pagerPlay(v) { try { v.currentTime = 0; } catch (e) {} vplay(v); }
function pagerBuild(j, M) {
  const el = stageEl.querySelector('.pgr'); clearTimeout(pager.t);
  Object.assign(pager, { el, n: M.length, idx: 0, drag: 0 });
  const one = (f, i) => `<div class="pg-s" data-n="${i}">${mimeOf(f).startsWith('image/') ? `<img src="${esc(f.uri)}" alt="" draggable="false">` : `<video src="${esc(f.uri)}${mimeOf(f).startsWith('video/') ? '#t=0.5' : ''}" preload="metadata" playsinline muted></video><span class="fr-k">▶</span>`}</div>`;
  el.innerHTML = M.map(one).join('') + one(M[0], 0);            // 最後多放一張「第一張」，循環時才接得起來
  el.addEventListener('ended', e => { if (e.target.tagName === 'VIDEO') pagerEnded(e.target); }, true);
  el.addEventListener('play', e => { const k = e.target.parentNode.querySelector('.fr-k'); if (k) k.hidden = true; }, true);
  el.addEventListener('pause', e => { const k = e.target.parentNode.querySelector('.fr-k'); if (k) k.hidden = false; }, true);
  pagerSet(0);
}
function pagerGo(i, ms, fromAuto) {
  if (!pagerOn()) return;
  const prevV = pagerVid();
  pager.idx = Math.max(0, Math.min(pager.n, i)); pager.drag = 0; pagerSet(ms);
  const shown = pager.idx % pager.n; stg.idx = shown; stg.key = stg.key.split('|').map((x, k) => k === 3 ? shown : x).join('|');
  const cnt = stageEl.querySelector('.st-count'); if (cnt) cnt.textContent = `${shown + 1} / ${pager.n}`;
  if (prevV && prevV !== pagerVid() && !fromAuto) prevV.pause();
  if (fromAuto && auto.on) { const v = pagerVid(); if (v && v !== prevV) { v._n = 0; pagerPlay(v); } }      // 影片：滑進來就開始播
  clearTimeout(pager.t);
  pager.t = setTimeout(() => {
    if (!pagerOn()) return;
    if (prevV && prevV !== pagerVid()) prevV.pause();
    if (pager.idx === pager.n) {                                // 到了尾巴那張「第一張」：瞬間換回真正的第一張
      const cv = pagerVid(); pager.idx = 0; pagerSet(0); const rv = pagerVid();
      if (cv && rv) { try { rv.currentTime = cv.currentTime; } catch (e) {} rv._n = cv._n; if (!cv.paused) { vplay(rv); } cv.pause(); }
    }
    if (fromAuto && auto.on) autoRun();
  }, ms + 40);
}
function pagerEnded(v) {
  if (!auto.on || v !== pagerVid()) return;
  v._n = (v._n || 0) + 1;
  pagerPlay(v);                                                 // 第 2 次：停在這一頁完整播
  if (v._n >= 2) pagerGo(pager.idx + 1, 500, true);             // 第 3 次開始播的同時滑到下一張
}
window.addEventListener('resize', () => pagerSet(0));
function stagePause() { stageEl.querySelectorAll('video').forEach(v => v.pause()); }

// ---- 下載完自動播放
const auto = { on: false, t: 0, n: 0 };
function autoStop() { auto.on = false; clearTimeout(auto.t); }
function autoBegin(j) {     // 下載完 2 秒後開始
  if (!S.autoPlay) return;
  clearTimeout(auto.t);
  auto.t = setTimeout(() => {
    if (curJob() !== j || j.state !== 'ok' || !$('#p_dl').classList.contains('on') || !$('#player').hidden || !$('#igPane').hidden || document.hidden) return;
    auto.on = true; autoRun();
  }, 2000);
}
function autoRun() {
  if (!auto.on) return; const j = curJob(); if (!j) return; const M = mediaOf(j.files); if (!M.length) { autoStop(); return; }
  if (pagerOn()) {                                    // 多張：照片停 1 秒 → 0.5 秒滑到下一張；影片照它自己的節奏
    const pv2 = pagerVid(); clearTimeout(auto.t);
    if (!pv2) auto.t = setTimeout(() => { if (auto.on) pagerGo(pager.idx + 1, 500, true); }, 1000);
    else if (pv2.paused) { pv2._n = 0; pagerPlay(pv2); }
    return;
  }
  const v = stageVid(); clearTimeout(auto.t);
  if (v) autoPlayVid(v, M.length > 1);
  else if (M.length > 1) auto.t = setTimeout(() => { if (auto.on) slideTo(stg.idx + 1, 1, true); }, 3200);   // 照片：停一下再滑到下一張
  else autoStop();
}
function autoPlayVid(v, multi) {
  stageWire(v); v.dataset.s = '1'; auto.n = 0;
  if (!v.dataset.auto) {
    v.dataset.auto = '1';
    v.addEventListener('ended', () => {
      if (!auto.on || v !== stageVid()) return;
      auto.n++;
      const again = () => { try { v.currentTime = 0; } catch (e) {} vplay(v); };
      if (!multi) { if (auto.n < 3) again(); else { autoStop(); const b = stageEl.querySelector('.st-play'); if (b) b.hidden = false; call('keepOn', false); } return; }   // 單一影片：播 3 次
      again();                                                             // 輪播裡的影片：第 2 次停在中間完整播
      if (auto.n >= 2) slideTo(stg.idx + 1, 1, true);                      // 第 3 次開始播的同時，滑出去換下一個
    });
  }
  try { v.currentTime = 0; } catch (e) {}
  vplay(v);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { autoStop(); stagePause(); } });

{
  // 大畫面上的操作：影片就在這一塊播放（不放大）。點一下＝播放／暫停；播放過後左右滑＝快轉；沒在播時左右滑＝換張
  const el = stageEl;
  const hint = (v, t, d) => { const h = el.querySelector('.st-hint'); if (!h) return; h.hidden = false; h.innerHTML = `<b>${fd(t)}</b> / ${fd(v.duration)}<span>${d >= 0 ? '+' : '−'}${fd(Math.abs(d))}</span>`; };
  el.addEventListener('input', e => { if (!e.target.classList.contains('st-bar')) return; const v = stageVid(); if (v && isFinite(v.duration)) { const t = e.target.value / 1000 * v.duration; scrubStart(v); scrubTo(v, t); el.querySelector('.st-cur').textContent = fd(t); } });
  el.addEventListener('change', e => { if (!e.target.classList.contains('st-bar')) return; const v = stageVid(); if (v && isFinite(v.duration)) scrubEnd(v, e.target.value / 1000 * v.duration); });
  el.addEventListener('pointerdown', e => {
    autoStop();                                                             // 手一碰就不再自動播
    if (e.target.closest('.st-ctl')) return;
    const v = stageVid(), hit = e.target.closest('[data-a]'), fr = e.target.closest('.pg-s');
    stageG = { fr, t0: performance.now(), x0: e.clientX, y0: e.clientY, lx: e.clientX, lt: performance.now(), mode: '', base: v ? v.currentTime : 0, tgt: v ? v.currentTime : 0, applied: 0, btn: hit ? hit.dataset.a : '' };
    try { el.setPointerCapture(e.pointerId); } catch (x) {}
  });
  el.addEventListener('pointermove', e => {
    const g = stageG; if (!g) return;
    const v = stageVid(), dx = e.clientX - g.x0, dy = e.clientY - g.y0, now = performance.now();
    if (!g.mode) {
      if (!(Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.2)) return;
      g.mode = pagerOn() ? 'pan' : v && v.dataset.s && isFinite(v.duration) ? 'seek' : 'swipe';
      g.lx = e.clientX; g.lt = now; if (v) g.base = g.tgt = v.currentTime;
      if (g.mode === 'seek') scrubStart(v);
    }
    if (g.mode === 'pan') { pager.drag = ((pager.idx === 0 && dx > 0) ? dx * 0.3 : dx) / ZM; pagerSet(0); return; }   // 一頁一張：跟著手指動
    if (g.mode === 'seek' && v) {
      const step = e.clientX - g.lx, dt = Math.max(now - g.lt, 1), sp = Math.abs(step) / dt;
      const maxGain = Math.min(4, Math.max(0.06, v.duration / 400)), k = Math.min(1, Math.max(0, (sp - 0.12) / 1.4));
      g.tgt = Math.min(v.duration, Math.max(0, g.tgt + step * (0.035 + (maxGain - 0.035) * k * k))); g.lx = e.clientX; g.lt = now;
      hint(v, g.tgt, g.tgt - g.base);
      const bar = el.querySelector('.st-bar'); if (bar) bar.value = Math.round(g.tgt / v.duration * 1000);
      const cur = el.querySelector('.st-cur'); if (cur) cur.textContent = fd(g.tgt);
      scrubTo(v, g.tgt);                                                   // 手壓著就跟著換畫面
    }
  });
  const end = (e, cancel) => {
    const gg = stageG; stageG = null; if (!gg) return;
    const h = el.querySelector('.st-hint'); if (h) h.hidden = true;
    if (gg.mode === 'pan') {                                                  // 放手：滑夠遠或滑得快就換一張，不然彈回去
      const dx = cancel ? 0 : e.clientX - gg.x0, fast = Math.abs(dx) / Math.max(1, performance.now() - gg.t0) > 0.4;
      const go = (Math.abs(dx) > stageEl.clientWidth * ZM * 0.18 || (fast && Math.abs(dx) > 20)) ? (dx < 0 ? 1 : -1) : 0;
      pagerGo(pager.idx + go, 280, false); return;
    }
    if (gg.mode === 'seek') { scrubEnd(stageVid(), gg.tgt); return; }        // 放開＝從這裡開始播
    const j = curJob(); if (cancel || !j) return;
    if (gg.mode === 'swipe') { if (Math.abs(e.clientX - gg.x0) > 40) stageStep(e.clientX - gg.x0 < 0 ? 1 : -1); return; }
    if (gg.fr && j.state === 'ok') {                                          // 點這一頁：影片＝播放／暫停，照片＝放大看
      const fv = gg.fr.querySelector('video');
      if (fv) { if (fv.paused) { vplay(fv); } else fv.pause(); }
      else playF(j.files, j.title, +gg.fr.dataset.n);
      return;
    }
    if (gg.btn === 'ext') { const f = mediaOf(j.files)[stg.idx] || (j.files || [])[0]; if (f) openF(f); return; }
    if (j.state !== 'ok') return;
    if (stageVid()) stageToggle();                                          // 影片：就在這一塊播
    else if (mediaOf(j.files).length) playF(j.files, j.title, stg.idx);     // 照片：點一下放大看
  };
  el.addEventListener('pointerup', e => end(e, false));
  el.addEventListener('pointercancel', e => end(e, true));
  el.addEventListener('dragstart', e => e.preventDefault());
  $('#qList').addEventListener('click', e => { const b = e.target.closest('[data-a]'), r = e.target.closest('.ql'); if (!b || !r) return; const j = Q.find(x => x.id === r.dataset.id); if (j) act(j, b.dataset.a); });
  $('#stageInfo').addEventListener('click', e => { const b = e.target.closest('[data-a]'), j = curJob(); if (b && b.dataset.a === 'cancelAll') { Q.filter(x => x.state === 'run' || x.state === 'wait').forEach(x => act(x, 'cancel')); return; } if (!b || !j) return; if (b.dataset.a === 'open') { autoStop(); stagePause(); } act(j, b.dataset.a); });
}
function openF(f) { if (!f) return; if (has('fileExists') && f.uri && !N.fileExists(f.uri)) { toast('檔案已經被刪除或搬走了'); return; } call('openFile', f.uri, f.mime || ''); }
function shareF(f) { if (!f) return; call('shareFile', f.uri, f.mime || ''); }
function act(j, a) {
  const f = (j.files || [])[0];
  if (a === 'cancel') { j.stop = 1; if (j.state === 'wait' || j.igWait) { j.igWait = false; j.state = 'cancel'; j.msg = '已取消'; drawCard(j); saveQ(); } else call('cancel', j.pid); }
  else if (a === 'open') playF(j.files, j.title, j.id === stg.id ? stg.idx : 0);
  else if (a === 'share') shareF(f);
  else if (a === 'retry') { j.noApi = false; j.noHd = false; j.noTg = false; j.noFast = false; j.k = 0; j.stop = 0; j.state = 'wait'; j.msg = ''; drawCard(j); pump(); saveQ(); }
  else if (a === 'detail') toast(String(j.raw || j.msg).slice(-300), 7000);
  else if (a === 'x') { const i = Q.indexOf(j); if (i >= 0) Q.splice(i, 1); drawStage(); counts(); saveQ(); }
}
function counts() { const n = Q.filter(j => j.state === 'run' || j.state === 'wait').length, b = $('#tabBadge'); b.hidden = !n; b.textContent = n; }

// 開啟時接回：存起來的佇列 + 引擎還在跑的工作 + 畫面不在時錯過的結果
function restore() {
  const saved = LS('queue') || [];
  const live = new Set((jcall('jobsState') || []).map(x => x.id));
  saved.reverse().forEach(o => { if (Q.some(j => j.id === o.id)) return; const j = Object.assign({}, o); Q.unshift(j); });
  const missed = jcall('drain') || [];
  Q.forEach(j => { if (j.state === 'run' && !live.has(j.pid) && !missed.some(m => m.fn === 'onDone' && (JSON.parse(m.arg).id === j.pid))) { j.state = 'bad'; j.msg = 'App 被關掉時中斷了，按重試'; } });
  [...Q].reverse().forEach(drawCard);
  trimDone();
  missed.forEach(m => { try { if (typeof window[m.fn] === 'function') window[m.fn](m.arg); } catch (e) {} });
  saveQ();
}

// =====================================================================
// 紀錄
// =====================================================================
let codeFor = -1;
// ---- Telegram 登入（用你自己在 my.telegram.org 申請的 api_id／api_hash）
let tgS = jcall('tgInfo') || { state: 'none' }, tgOpen = false, tgBusy = false;
window.onTg = s2 => { tgS = JSON.parse(s2); tgBusy = false; if (tgS.state === 'ready') { tgOpen = false; toast('Telegram 已登入' + (tgS.me ? '：' + tgS.me : '')); } if ($('#p_sites').classList.contains('on')) drawSites(); };
function tgBox() {
  const st = tgS.state, err = tgS.err ? `<div class="pv-err">${esc(tgS.err)}</div>` : '';
  let b = '';
  if (st === 'none' || st === 'error' || !tgS.hasKey) b = `<span class="mut small">第一次要先拿你自己的 api_id 和 api_hash（只要做一次）：<br>1. 用瀏覽器打開 <b>my.telegram.org</b>，用手機號碼登入（驗證碼會傳到你的 Telegram App）。<br>2. 點「API development tools」，App title 和 Short name 隨便填（例如 YTDown），平台選 Android，按 Create。<br>3. 把頁面上的 <b>App api_id</b>（數字）和 <b>App api_hash</b>（一長串英數）貼到下面。</span>
      <input id="tgId" type="text" inputmode="numeric" placeholder="api_id（數字）" autocomplete="off"><input id="tgHash" type="text" placeholder="api_hash" autocomplete="off" spellcheck="false">
      <div class="row"><button class="btn sm primary" data-a="tgGo" type="button">下一步</button><button class="link" data-a="tgSite" type="button">打開 my.telegram.org</button></div>`;
  else if (st === 'starting' || st === 'params') b = '<span class="mut small">連線到 Telegram 中…</span>';
  else if (st === 'phone') b = `<span class="mut small">輸入你的 Telegram 手機號碼，要加國碼（台灣是 +886，去掉開頭的 0）。</span><input id="tgIn" type="tel" placeholder="+886912345678" autocomplete="off"><div class="row"><button class="btn sm primary" data-a="tgPhone" type="button">傳驗證碼</button></div>`;
  else if (st === 'code') b = `<span class="mut small">驗證碼已經傳到你的 Telegram App（${esc(tgS.hint)}），不是簡訊。</span><input id="tgIn" type="text" inputmode="numeric" placeholder="驗證碼" autocomplete="one-time-code"><div class="row"><button class="btn sm primary" data-a="tgCode" type="button">登入</button></div>`;
  else if (st === 'password') b = `<span class="mut small">你的帳號有設兩步驟驗證，輸入那組密碼${tgS.hint ? '（提示：' + esc(tgS.hint) + '）' : ''}。</span><input id="tgIn" type="password" placeholder="兩步驟驗證密碼" autocomplete="off"><div class="row"><button class="btn sm primary" data-a="tgPw" type="button">登入</button></div>`;
  else if (st === 'other') b = '<span class="mut small">這個號碼還沒有 Telegram 帳號，請先用 Telegram App 註冊。</span>';
  else b = `<span class="mut small">處理中…</span>`;
  return `<div class="codebox">${b}${err}<div class="row"><span class="grow"></span>${st !== 'none' ? '<button class="link" data-a="tgReset" type="button">重新開始</button>' : ''}<button class="link" data-a="tgClose" type="button">收起來</button></div></div>`;
}
let hFilter = '全部', hAsk = -1, hShow = 100, hMenu = -1;
const szOf = h => (h.files || []).reduce((a, x) => a + (+x.size || 0), 0);
const mediaOf = files => (files || []).filter(f => f && f.uri && /^(video|audio|image)\//.test(mimeOf(f)));
const newGrp = () => 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const hUrls = h => h.us && h.us.length ? h.us : [h.u];
const grpTitle = h => `${h.title0 || '一組下載'}${h.grpN > 1 ? ` 等 ${h.grpN} 個網址` : ''}`;
// ---- 看過的記號：播放器打開過的檔（uri）記在 watched，紀錄裡標「✓ 看過」
const watched = () => LS('watched') || {};
function markW(uri) { if (!uri) return; const W = watched(); if (W[uri]) return; W[uri] = Date.now(); const K = Object.keys(W); if (K.length > 6000) K.slice(0, K.length - 6000).forEach(k => delete W[k]); LS('watched', W); }
const isW = (W, f) => !!(f && W[f.uri]);
// 紀錄的縮圖：優先用手機裡的檔案本身（照片直接顯示、影片抓一格畫面），網站給的縮圖網址常常會過期或沒有，只當備用
function histThumb(h) {
  const f = !h.gone && mediaOf(h.files)[0], back = h.thumb ? esc(h.thumb) : '';
  if (f && mimeOf(f).startsWith('image/')) return `<img class="thumb" src="${esc(f.uri)}" alt="" loading="lazy"${back ? ` onerror="this.onerror=null;this.src='${back}'"` : ` onerror="this.style.visibility='hidden'"`}>`;
  if (f && mimeOf(f).startsWith('video/')) return `<video class="thumb vthumb" data-src="${esc(f.uri)}#t=1" data-back="${back}" preload="none" muted playsinline></video>`;
  if (f && mimeOf(f).startsWith('audio/')) return back ? thumbImg(h.thumb) : '<div class="thumb thumb-ic">🎵</div>';
  return back ? thumbImg(h.thumb) : `<div class="thumb thumb-ic">${esc(h.ab || '▶')}</div>`;
}
// 影片縮圖等捲到附近才載入（一次載太多會卡）；手機播不了的格式退回網站縮圖
let vtObs = null;
function wireVThumbs() {
  if (!vtObs) vtObs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; const v = e.target; vtObs.unobserve(v);
    v.onerror = () => { const b = v.dataset.back; v.replaceWith(Object.assign(document.createElement(b ? 'img' : 'div'), b ? { className: 'thumb', src: b } : { className: 'thumb thumb-ic', textContent: '▶' })); };
    v.preload = 'metadata'; v.src = v.dataset.src;
  }), { rootMargin: '400px' });
  document.querySelectorAll('#hist video.vthumb[data-src]:not([src])').forEach(v => vtObs.observe(v));
}
let hOrder = [];
const hKey = h => h.t + '|' + h.u;
function saveHist(j) {
  const H = LS('hist') || [], ok = j.state === 'ok';
  if (j.grp) {                                                                  // 同一組的合成一筆：檔案全部放一起
    const h = H.find(x => x.grp === j.grp);
    if (h) {
      h.t = Date.now(); h.us = [...new Set([...hUrls(h), j.url])];
      h.files = [...(h.files || []), ...(j.files || [])].slice(0, 800);
      if (ok) h.nOk = (h.nOk || 0) + 1; else { h.nBad = (h.nBad || 0) + 1; h.msg = ((h.msg ? h.msg + '\n' : '') + (j.title || j.url) + '：' + (j.msg || '失敗')).slice(-3000); }
      h.ok = (h.nOk || 0) > 0;
      if (!h.title0 && j.title) h.title0 = j.title;
      h.title = grpTitle(h);
      if (!h.thumb && j.thumb) h.thumb = j.thumb;
      if (h.site !== j.site) { h.site = '多個網站'; h.ab = '混合'; }
      if (h.uploader && j.uploader && h.uploader !== j.uploader) { h.uploader = ''; h.uid = ''; }
      H.splice(H.indexOf(h), 1); H.unshift(h);
      LS('hist', H.slice(0, 1500)); return;
    }
    const g = { t: Date.now(), u: j.url, us: [j.url], grp: j.grp, grpN: j.grpN || 1, title0: j.title, thumb: j.thumb, site: j.site, ab: j.ab, q: j.q, res: 0, uploader: j.uploader || '', uid: j.uid || '',
      ok, nOk: ok ? 1 : 0, nBad: ok ? 0 : 1, msg: ok ? '' : (j.title || j.url) + '：' + (j.msg || '失敗'), files: (j.files || []).slice(0, 800) };
    g.title = grpTitle(g); H.unshift(g); LS('hist', H.slice(0, 1500)); return;
  }
  H.unshift({ t: Date.now(), u: j.url, title: j.title, thumb: j.thumb, site: j.site, ab: j.ab, q: j.q, res: j.res || 0, uploader: j.uploader || '', uid: j.uid || '', ok, msg: j.msg, files: (j.files || []).slice(0, 20) });
  LS('hist', H.slice(0, 1500));
}
function drawHist() {
  const H = LS('hist') || [], kw = $('#hSearch').value.trim().toLowerCase();
  const sites = ['全部', ...new Set(H.map(h => h.site || '其他'))];
  if (!sites.includes(hFilter)) hFilter = '全部';
  $('#hSites').innerHTML = sites.length > 2 ? sites.map(s => `<button class="chip" type="button" data-s="${esc(s)}" aria-pressed="${s === hFilter}">${esc(s)}</button>`).join('') : '';
  $('#hSites').querySelectorAll('.chip').forEach(b => b.onclick = () => { hFilter = b.dataset.s; drawHist(); });
  const L = H.map((h, i) => Object.assign({ i }, h)).filter(h => (hFilter === '全部' || (h.site || '其他') === hFilter) && (!kw || (h.title || '').toLowerCase().includes(kw) || hUrls(h).join(' ').toLowerCase().includes(kw) || (h.uploader || '').toLowerCase().includes(kw) || (h.site || '').toLowerCase().includes(kw)));
  const so = $('#hSort').value;
  L.sort((a, b) => so === 'old' ? a.t - b.t : so === 'big' ? szOf(b) - szOf(a) : so === 'small' ? szOf(a) - szOf(b) : so === 'title' ? (a.title || '').localeCompare(b.title || '', 'zh-Hant') : so === 'user' ? ((a.uploader || '\uffff').localeCompare(b.uploader || '\uffff') || b.t - a.t) : b.t - a.t);
  const more = L.length > hShow;
  $('#hCount').textContent = H.length ? `${L.length} / ${H.length} 筆` : '';
  $('#bHClr').hidden = !H.length;
  hOrder = L.map(hKey); const W = watched();
  // 「新的在最下面」（像 IG、抖音往下滑）：顯示最後 hShow 筆，較舊的按最上面的按鈕再載入
  const bottomNew = so === 'old', shown = bottomNew ? L.slice(Math.max(0, L.length - hShow)) : L.slice(0, hShow);
  const moreBtn = more ? `<button class="btn big" type="button" id="hMore">再顯示 100 筆${bottomNew ? '較舊的' : ''}（還有 ${L.length - hShow} 筆）</button>` : '';
  $('#hist').innerHTML = L.length ? (bottomNew ? moreBtn : '') + shown.map(h => {
    const f = h.files && h.files[0], total = szOf(h);
    const Mw = h.ok && !h.gone ? mediaOf(h.files) : [], nw = Mw.filter(x => isW(W, x)).length, seenTag = nw ? `<span class="seen-b">✓ 看過${Mw.length > 1 ? ` ${nw}/${Mw.length}` : ''}</span>` : '';
    const M = h.ok && !h.gone ? mediaOf(h.files) : [], multi = M.length > 1;
    const strip = multi ? `<div class="strip">${M.slice(0, 40).map((x, n) => `<button class="tile" type="button" data-a="openAt" data-n="${n}" aria-label="第 ${n + 1} 個"${isW(W, x) ? ' data-w="1"' : ''}>${mimeOf(x).startsWith('image/') ? `<img src="${esc(x.uri)}" alt="" loading="lazy">` : mimeOf(x).startsWith('video/') ? `<video src="${esc(x.uri)}#t=0.5" preload="metadata" muted playsinline></video><span class="tile-k">影片</span>` : '<span class="tile-k">聲音</span>'}</button>`).join('')}${M.length > 40 ? `<span class="mut small">還有 ${M.length - 40} 個</span>` : ''}</div>` : '';
    return `<div class="card ${h.ok ? 'ok' : 'bad'}${h.gone ? ' gone' : ''}${multi ? ' multi' : ''}" data-i="${h.i}">${multi ? '' : `<button class="tbtn" type="button" data-a="open" aria-label="播放">${histThumb(h)}${seenTag}</button>`}<div class="cb">
      <div class="ct">${multi ? seenTag : ''}${esc(h.title || h.u)}</div>
      <div class="cm"><span class="badge">${esc(h.ab || '網址')}</span>${h.uploader ? `<button class="link who" type="button" data-a="who">${esc((h.site === 'Instagram' ? '@' : '') + h.uploader)}</button>` : ''}<span>${fmtTime(h.t)}</span><span>${esc(qShow(h.q || 'best', h.res))}</span>${total ? `<span>${fmtSize(total)}</span>` : ''}${h.grp ? `<span>${hUrls(h).length} 個網址</span>` : ''}${(h.files || []).length > 1 ? `<span>${h.files.length} 個檔</span>` : ''}${h.grp && h.nBad ? `<span class="bad-t">${h.nBad} 個失敗</span>` : ''}</div>
      ${strip}
      ${h.gone ? '<div class="st mut">檔案已刪除</div>' : h.ok && !(h.grp && h.nBad) ? '' : `<div class="st">${esc(h.msg || '失敗')}</div>`}
      ${hAsk === h.i ? `<div class="ask"><span>刪掉手機裡的檔案？刪了就找不回來。</span><button class="btn sm danger" data-a="delYes" type="button">刪掉</button><button class="btn sm ghost" data-a="delNo" type="button">取消</button></div>` : ''}
      <div class="acts">${h.ok && f && !h.gone ? '<button class="btn ghost" data-a="share" type="button">分享</button>' : '<button class="btn ghost" data-a="again" type="button">再下載</button>'}<button class="btn ghost" data-a="menu" type="button" aria-label="更多">⋯</button>${hMenu === h.i ? `${h.ok && f && !h.gone ? '<button class="btn ghost" data-a="again" type="button">再下載</button>' : ''}<button class="btn ghost" data-a="copy" type="button">複製連結</button>${h.ok && f && !h.gone ? '<button class="btn ghost" data-a="delFile" type="button">刪檔案</button>' : ''}<button class="btn ghost" data-a="del" type="button">刪紀錄</button>` : ''}</div>
    </div></div>`;
  }).join('') + (bottomNew ? '' : moreBtn) : `<p class="empty">${H.length ? '沒有符合的紀錄' : '還沒有下載紀錄'}</p>`;
  const hm = $('#hMore'); if (hm) hm.onclick = () => {
    const keep = document.documentElement.scrollHeight - window.scrollY;                 // 載入較舊的之後，畫面停在原本看的地方
    hShow += 100; drawHist(); if (bottomNew) window.scrollTo(0, document.documentElement.scrollHeight - keep);
  };
  wireVThumbs();
}
$('#hist').onclick = e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const i = +b.closest('.card').dataset.i, H = LS('hist') || [], h = H[i]; if (!h) return;
  const a = b.dataset.a, f = (h.files || [])[0];
  const ctx = { order: hOrder.slice(), at: hOrder.indexOf(hKey(h)) };
  if (a === 'open') { if (h.ok && !h.gone && f) playF(h.files, h.title, 0, ctx); }
  else if (a === 'openAt') playF(h.files, h.title, +b.dataset.n, ctx);
  else if (a === 'who') { if (h.site === 'Instagram' && has('http')) openIg(h.uploader, h.uid); else { $('#hSearch').value = h.uploader; hShow = 100; drawHist(); window.scrollTo(0, 0); } }
  else if (a === 'share') shareF(f);
  else if (a === 'menu') { hMenu = hMenu === i ? -1 : i; drawHist(); }
  else if (a === 'again') { page('dl'); addUrls(hUrls(h).join('\n')); }
  else if (a === 'copy') copyText(hUrls(h).join('\n'));
  else if (a === 'del') { H.splice(i, 1); LS('hist', H); hAsk = -1; drawHist(); }
  else if (a === 'delFile') { hAsk = i; drawHist(); }
  else if (a === 'delNo') { hAsk = -1; drawHist(); }
  else if (a === 'delYes') { let n = 0; (h.files || []).forEach(x => { if (x.uri && N.deleteFile(x.uri)) n++; }); h.gone = true; LS('hist', H); hAsk = -1; drawHist(); toast(n ? `刪掉 ${n} 個檔案` : '檔案可能已經不在了'); }
};
$('#hSearch').addEventListener('input', () => { hShow = 100; drawHist(); });
$('#hSort').onchange = () => { hShow = 100; LS('hsort', $('#hSort').value); drawHist(); };
{ if (!LS('hsortV2')) { LS('hsort', 'old'); LS('hsortV2', 1); } const v = LS('hsort') || 'old'; $('#hSort').value = v; }
// 打開紀錄頁：「新的在最下面」時直接捲到最下面（縮圖載入後再補捲一次）
function histToBottom() { if ($('#hSort').value !== 'old') return; const go = () => window.scrollTo(0, document.documentElement.scrollHeight); go(); setTimeout(go, 120); setTimeout(go, 600); }
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
      <span class="site-acts">${s.tg && has('tgInfo') ? (tgS.state === 'ready' ? '<button class="btn sm ghost" data-a="tgOut" type="button">登出</button>' : '<button class="btn sm" data-a="tgOpen" type="button">登入</button>') : ''}${s.ck && canLogin ? (logged ? '<button class="btn sm ghost" data-a="code" type="button">重貼</button><button class="btn sm ghost" data-a="logout" type="button">登出</button>' : (s.codeOnly ? '<button class="btn sm" data-a="code" type="button">貼代碼</button>' : '<button class="btn sm" data-a="login" type="button">登入</button><button class="btn sm ghost" data-a="code" type="button">貼代碼</button>')) : ''}</span></div>
      ${s.tg && tgOpen && has('tgInfo') && tgS.state !== 'ready' ? tgBox() : ''}${s.tg && tgS.state === 'ready' ? `<div class="mut small" style="padding:0 4px">已登入 Telegram${tgS.me ? '：' + esc(tgS.me) : ''}</div>` : ''}
      ${codeFor === i ? `<div class="codebox" data-i="${i}"><span class="mut small">${CK_CODE[s.ck] ? `電腦瀏覽器登入 ${esc(s.k)} → 按 F12 → Application（應用程式）→ 左邊 Cookies → 找到 <b>${CK_CODE[s.ck]}</b>，複製它的 Value 貼到這裡。也可以貼整串「名稱=值; 名稱=值」。` : `電腦瀏覽器登入 ${esc(s.k)} → 按 F12 → Network → 點任一個請求 → 把 Cookie 那一整串貼到這裡（名稱=值; 名稱=值）。`}</span>
        <input id="codeIn" type="text" autocomplete="off" spellcheck="false" placeholder="${CK_CODE[s.ck] ? '貼上 ' + CK_CODE[s.ck] + ' 的值' : '貼上整串 Cookie'}">
        <div class="row"><button class="btn sm primary" data-a="codeSave" type="button">儲存</button><button class="btn sm ghost" data-a="codeNo" type="button">取消</button></div></div>` : ''}`;
  }).join('');
  $('#ckSite').innerHTML = SITES.filter(s => s.ck).map(s => `<option value="${s.ck}">${esc(s.k)}</option>`).join('');
}
$('#sites').onclick = e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const tv = id => (($('#' + id) || {}).value || '').trim();
  if (b.dataset.a === 'tgOpen') { tgOpen = true; drawSites(); return; }
  if (b.dataset.a === 'tgClose') { tgOpen = false; drawSites(); return; }
  if (b.dataset.a === 'tgSite') { call('openUrl', 'https://my.telegram.org/apps'); return; }
  if (b.dataset.a === 'tgGo') { const id = tv('tgId'), h = tv('tgHash'); if (!/^\d{3,}$/.test(id) || h.length < 20) { toast('api_id 是一串數字，api_hash 是 32 個英數字，請再確認'); return; } N.tgStart(id, h); return; }
  if (b.dataset.a === 'tgPhone') { const v = tv('tgIn').replace(/[\s-]/g, ''); if (!/^\+\d{8,15}$/.test(v)) { toast('號碼要加國碼，例如 +886912345678'); return; } N.tgPhone(v); toast('驗證碼傳送中…'); return; }
  if (b.dataset.a === 'tgCode') { const v = tv('tgIn'); if (!v) return; N.tgCode(v); return; }
  if (b.dataset.a === 'tgPw') { const v = tv('tgIn'); if (!v) return; N.tgPassword(v); return; }
  if (b.dataset.a === 'tgReset' || b.dataset.a === 'tgOut') { N.tgLogout(); tgS = { state: 'none' }; drawSites(); toast(b.dataset.a === 'tgOut' ? 'Telegram 已登出' : '已重新開始'); return; }
  const s = SITES[+b.closest('[data-i]').dataset.i];
  if (b.dataset.a === 'code') { codeFor = SITES.indexOf(s); drawSites(); const el = $('#codeIn'); if (el) el.focus(); return; }
  if (b.dataset.a === 'codeNo') { codeFor = -1; drawSites(); return; }
  if (b.dataset.a === 'codeSave') { if (saveCode(s, $('#codeIn').value)) { codeFor = -1; drawSites(); toast(`${s.k} 的登入資料已儲存`); } return; }
  if (b.dataset.a === 'home') { if (has('browse')) N.browse(s.home, 'browse', '', ''); else call('openUrl', s.home); }
  else if (b.dataset.a === 'login') { N.browse(s.login, 'login', s.ck, s.dom); toast('登入後按右上角「完成登入」', 4500); }
  else if (b.dataset.a === 'logout') { N.clearCookies(s.ck); drawSites(); toast(`${s.k} 已登出`); }
};
function saveCode(s, text) {
  text = String(text || '').trim().replace(/^cookie:\s*/i, ''); const n = CK_CODE[s.ck];
  const d = '.' + s.dom.split(',')[0].replace(/^(www|m)\./, '');
  let pairs = [];
  if (/;/.test(text) || (n && text.startsWith(n + '=')) || (!n && /=/.test(text))) pairs = text.split(/;\s*/).map(p => { const i = p.indexOf('='); return i > 0 && p.slice(i + 1).trim() ? [p.slice(0, i).trim(), p.slice(i + 1).trim()] : null; }).filter(Boolean);
  else if (n && text) pairs = [[n, text]];
  if (!pairs.length) { toast('看不懂貼上的內容'); return false; }
  const exp = Math.floor(Date.now() / 1000) + 365 * 86400;
  return !!call('saveCookies', s.ck, '# Netscape HTTP Cookie File\n' + pairs.map(([k, v]) => `${d}\tTRUE\t/\tTRUE\t${exp}\t${k}\t${v}`).join('\n') + '\n');
}
$('#bCkImport').onclick = () => { call('pickFile', 'text/*', 'cookie:' + $('#ckSite').value); };
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
  chipsInto($('#sGallery'), [['off', '關'], ['img', '只有照片'], ['all', '照片和影片']], S.gallery, v => { S.gallery = v; saveS(); drawSet(); });
  $('#galNote').textContent = (S.dest && S.dest.uri ? '你有自己選存檔資料夾，所以這個設定不會用到' : '會存到相簿的 YTDown' + (S.subdir ? '／平台名稱' : '') + '，其他檔案照舊存到「下載」');
  $('#concV').textContent = S.conc;
  $('#destName').textContent = S.dest && S.dest.uri ? '目前：' + S.dest.name + (has('treeOk') && !N.treeOk(S.dest.uri) ? '（不能用了，請重選）' : '') : '目前：手機的「下載/YTDown」';
  bindSw('#sSubdir', 'subdir'); bindSw('#sTtHd', 'ttHd'); bindSw('#sYtFast', 'ytFast'); bindSw('#sNoAv1', 'noAv1');
  chipsInto($('#sYtConn'), [['4', '4 條'], ['8', '8 條'], ['12', '12 條'], ['16', '16 條']], String(S.ytConn || 8), v => { S.ytConn = +v; saveS(); drawSet(); }); bindSw('#sAutoPlay', 'autoPlay', () => { if (!S.autoPlay) autoStop(); }); bindSw('#sPlaylist', 'playlist', () => sel.playlist = S.playlist);
  bindSw('#sSubs', 'subs', () => { sel.subs = S.subs; drawQual(); }); bindSw('#sEmbed', 'embed', () => { sel.embed = S.embed; drawQual(); });
  bindSw('#sSponsor', 'sponsor', () => { sel.sponsor = S.sponsor; drawQual(); });
  bindSw('#sWifi', 'wifi', pump); bindSw('#sIgSlow', 'igSlow', () => { igNext = 0; pump(); }); bindSw('#sAria', 'aria');
  bindSw('#sAuto', 'auto'); bindSw('#sClip', 'clip'); bindSw('#sCookies', 'cookies');
  bindSw('#sNotify', 'notify', () => { if (S.notify) call('askNotify'); }); bindSw('#sVibe', 'vibe'); bindSw('#sAutoCore', 'autoCore');
  bindTxt('#sRate', 'rate'); bindTxt('#sProxy', 'proxy'); bindTxt('#sArgs', 'args');
  $('#sSubLang').value = S.subLang;
  const core = jcall('coreState') || {};
  $('#ariaItem').hidden = !core.aria2;
  $('#envNotify').textContent = env.notify === false ? '目前沒有允許' : env.notify ? '已允許' : '';
  $('#envBattery').textContent = env.batteryFree ? '已設定，不會被省電暫停' : '長時間下載不會被系統暫停（建議設定）';
  bindSw('#sAutoUpd', 'autoUpd', () => { if (S.autoUpd) autoCheck(true); else $('#updBar').hidden = true; });
  drawVer();
}
$('#sSubLang').onchange = () => { S.subLang = $('#sSubLang').value.trim() || DEF.subLang; saveS(); };
$('#concDn').onclick = () => { S.conc = Math.max(1, S.conc - 1); saveS(); $('#concV').textContent = S.conc; };
$('#concUp').onclick = () => { S.conc = Math.min(5, S.conc + 1); saveS(); $('#concV').textContent = S.conc; pump(); };
$('#bDest').onclick = () => call('pickTree');
window.onTree = s => { const r = JSON.parse(s); if (!r.ok) return; S.dest = { uri: r.uri, name: r.name }; saveS(); drawSet(); toast('之後會存到「' + r.name + '」'); };
$('#bDestDef').onclick = () => { S.dest = null; saveS(); drawSet(); toast('改回手機的「下載/YTDown」'); };
$('#bOpenDir').onclick = () => call('openFolder', S.dest && S.dest.uri ? S.dest.uri : '');
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
  const one = c2 => `<div><b>${esc(c2[0])}</b><ul>${c2[1].map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  $('#log').innerHTML = CHANGELOG.slice(0, 3).map(one).join('') + `<details><summary class="link">更早的版本</summary>${CHANGELOG.slice(3).map(one).join('')}</details>`;
}
$('#bCore').onclick = () => { if (!has('updateCoreCh')) return; $('#coreMsg').textContent = '更新中，可能要一兩分鐘…'; $('#bCore').disabled = true; call('updateCoreCh', S.channel); };
window.onCore = m => { $('#coreMsg').textContent = m; $('#bCore').disabled = false; LS('coreAt', Date.now()); drawVer(); if (/已更新/.test(m)) toast('下載核心' + m); };

// ---- App 更新：update.json = {ver, zip, shell, apk}
const verNum = v => +(String(v || '').replace(/\D/g, '') || 0);
let apkHref = '';
const UPD_DEFAULT = 'https://github.com/tpc20001/YTDown/releases/latest/download/update.json';
const updUrl = () => LS('updurl') || UPD_DEFAULT;
let updInfo = null, autoReload = false;
// 主動檢查：開 App、回到 App、每 30 分鐘。只抓一個很小的 update.json，不耗電也不耗流量
function autoCheck(force) {
  if (!S.autoUpd || !has('httpGet')) return;
  if (!force && Date.now() - (LS('updAt') || 0) < 30 * 60e3) { showUpd(); return; }
  LS('updAt', Date.now());
  const u = updUrl();
  N.httpGet(req('h', r => {
    let j; try { j = JSON.parse(r.body); } catch (e) { return; }
    updInfo = { u, ui: j.ver || '', shell: j.shell || '', apk: j.apk ? new URL(j.apk, u).href : '' };
    LS('updInfo', updInfo); showUpd();
    // 更新頁的按鈕：有新外殼就亮「安裝新外殼」
    const i2 = updInfo; if (i2.shell && i2.apk && verNum(i2.shell) > verNum(call('shellVer'))) { apkHref = i2.apk; $('#bApk').hidden = false; $('#bApk').textContent = '安裝新外殼 ' + i2.shell.replace('YTD_', ''); }
  }), u);
}
function showUpd() {
  const i = updInfo || LS('updInfo'), bar = $('#updBar');
  const setB = (hide, txt) => { bar.hidden = hide; $('#updBadge').hidden = !txt; $('#updState').textContent = txt ? '有新版本：' + txt : (i ? '目前是最新版' + (LS('updAt') ? '（' + fmtTime(LS('updAt')) + ' 檢查過）' : '') : '按下面的按鈕檢查有沒有新版本'); $('#updState').classList.toggle('new', !!txt); };
  if (!i) { setB(true, ''); return; }
  const ui = i.ui && verNum(i.ui) > verNum(call('uiVer')) ? i.ui : '', sh = i.shell && i.apk && verNum(i.shell) > verNum(call('shellVer')) ? i.shell : '';
  const key = ui + '|' + sh;
  const label = [sh ? '外殼 ' + sh.replace('YTD_', '') : '', ui ? '畫面 ' + ui.replace('YTD_UI_', '') : ''].filter(Boolean).join('、');
  if (!ui && !sh) { setB(true, ''); return; }
  if (LS('updSkip') === key) { setB(true, label); return; }
  updInfo = i;
  $('#updTxt').textContent = [sh ? '外殼 ' + sh.replace('YTD_', '') : '', ui ? '畫面 ' + ui.replace('YTD_UI_', '') : ''].filter(Boolean).join('、');
  $('#updGo').textContent = sh ? '安裝' : '更新';
  bar.dataset.key = key; bar.dataset.kind = sh ? 'apk' : 'ui'; setB(false, label);
}
$('#updGo').onclick = () => {
  if ($('#updBar').dataset.kind === 'apk') getApk(updInfo.apk);
  else { autoReload = true; toast('更新中…'); call('checkUpdate', updInfo.u); }
};
// 舊外殼（V0.1.06）在 App 裡下載大檔會不穩，改用瀏覽器下載；V0.1.07 起在 App 裡下載並顯示進度
function getApk(u) { if (has('fetchJob')) { toast('下載新外殼中，下載完會跳出安裝畫面', 5000); N.installApk(u); } else { call('openUrl', u); toast('用瀏覽器下載新外殼，下載完點開安裝', 7000); } }
$('#updLater').onclick = () => { LS('updSkip', $('#updBar').dataset.key); $('#updBar').hidden = true; };
setInterval(() => autoCheck(false), 5 * 60e3);
$('#bChk').onclick = () => {
  const u = updUrl(); $('#updMsg').textContent = '檢查中…'; $('#bApk').hidden = true; $('#bReload').hidden = true;
  if (!has('httpGet')) { call('checkUpdate', u); return; }
  const id = req('h', r => {
    let j; try { j = JSON.parse(r.body); } catch (e) { $('#updMsg').textContent = '讀不到 update.json（' + (r.status || '連不上') + '）'; return; }
    const msgs = [];
    if (j.shell && j.apk && verNum(j.shell) > verNum(call('shellVer'))) { apkHref = new URL(j.apk, u).href; $('#bApk').hidden = false; $('#bApk').textContent = '安裝新外殼 ' + j.shell.replace('YTD_', ''); msgs.push('有新外殼 ' + j.shell); }
    if (j.ver && verNum(j.ver) > verNum(call('uiVer'))) { msgs.push('有新畫面 ' + j.ver + '，下載中…'); call('checkUpdate', u); }
    $('#updMsg').textContent = msgs.length ? msgs.join('；') : '都是最新的了';
    LS('updAt', Date.now()); updInfo = { u, ui: j.ver || '', shell: j.shell || '', apk: j.apk ? new URL(j.apk, u).href : '' }; LS('updInfo', updInfo); LS('updSkip', ''); showUpd();
  });
  N.httpGet(id, u);
};
window.onHttp = s => { const r = JSON.parse(s); settle(r.id, r); };
window.onUpd = s => { const p = JSON.parse(s); $('#updMsg').textContent = p.msg; $('#bReload').hidden = !p.ok;
  if (autoReload) { autoReload = false; if (p.ok && has('reload')) N.reload(); else toast(p.msg, 4000); } };
$('#bApk').onclick = () => { if (apkHref) getApk(apkHref); };
$('#bApkUrl').onclick = () => { const el = $('#apkUrl'); if (el.hidden) { el.hidden = false; el.focus(); return; } const u = el.value.trim(); if (!/^https?:\/\//.test(u)) { toast('先貼上 APK 的網址'); return; } if (!has('installApk')) { toast('這版外殼不支援，請用電腦重做 APK'); return; } N.installApk(u); };
window.onApk = s => { const r = JSON.parse(s); $('#updMsg').textContent = r.msg; if (r.stage === 'dl') { if (!$('#updBar').hidden) $('#updTxt').textContent = r.msg; } else toast(r.msg, 4000); };
$('#bPick').onclick = () => { $('#updMsg').textContent = '選檔中…'; call('pickUpdate'); };
$('#bReload').onclick = () => { if (has('reload')) N.reload(); else location.reload(); };
function stoShow() {
  const el = $('#stoInfo'); if (!el) return;
  const u = jcall('storage') || {};
  el.textContent = `共 ${fmtSize(u.all) || '0 B'} · 可清 ${fmtSize(u.tmp + u.cache) || '0 B'}（核心本身約 150 MB）`;
}
$('#bSweep').onclick = () => {
  const n = +call('sweep') || 0;
  toast(n > 0 ? '清掉了 ' + fmtSize(n) : '沒有可以清的暫存', 2200); stoShow();
};
$('#bResetUi').onclick = () => call('resetUi');

// ---- 備份
$('#bExport').onclick = () => {
  const d = new Date(), name = `YTD_備份_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
  const p = N.exportText(name, JSON.stringify({ app: 'YTDown', ver: UI_VER, t: Date.now(), set: S, hist: LS('hist') || [], updurl: LS('updurl') || '' }));
  toast(p ? '已存到 ' + p : '匯出失敗', 3500);
};
$('#bImport').onclick = () => call('pickFile', 'application/json', 'import');
function importBackup(text) {
  let j; try { j = JSON.parse(text); } catch (e) { toast('這不是備份檔'); return; }
  if (j.app !== 'YTDown') { toast('這不是 YT Download 的備份檔'); return; }
  S = Object.assign({}, DEF, j.set || {}); saveS();
  if (Array.isArray(j.hist)) { const cur = LS('hist') || [], seen = new Set(cur.map(h => h.t + h.u)); LS('hist', [...cur, ...j.hist.filter(h => !seen.has(h.t + h.u))].sort((a, b) => b.t - a.t).slice(0, 400)); }
  if (j.updurl) LS('updurl', j.updurl);
  applyTheme(); drawSet(); drawQual(); toast('已還原設定和紀錄');
}

// =====================================================================
// IG 帳號瀏覽：一次載入 100 則，預設全勾，可以一次下載
// =====================================================================
const IGP = { user: '', uid: '', posts: [], sel: new Set(), next: '', more: true, loading: false, total: 0, priv: false };
function igStat() {
  const n = IGP.posts.length;
  $('#igStat').textContent = `已載入 ${n}${IGP.total ? ' / ' + IGP.total : ''} 則 · 已選 ${IGP.sel.size} 則`;
  $('#igDl').textContent = `下載 ${IGP.sel.size} 則`; $('#igDl').disabled = !IGP.sel.size;
}
function openIg(user, uid) {
  user = String(user || '').replace(/^@/, '').trim(); if (!user) return;
  Object.assign(IGP, { user, uid: uid || '', posts: [], sel: new Set(), next: '', more: true, loading: false, total: 0, priv: false });
  $('#igGrid').innerHTML = ''; $('#igName').textContent = '@' + user; $('#igMsg').textContent = ''; $('#igMore').hidden = true;
  $('#igPane').hidden = false; $('#igPane').scrollTop = 0; document.body.classList.add('locked'); igStat();
  igMore();
}
function igClose() { $('#igPane').hidden = true; IGP.user = ''; if ($('#player').hidden) document.body.classList.remove('locked'); }
async function igMore() {
  if (IGP.loading || !IGP.more) return;
  IGP.loading = true; $('#igMore').disabled = true; $('#igMsg').textContent = '載入中…';
  const me = IGP.user; let msg = '';
  try {
    if (!IGP.uid) {     // 先用搜尋找帳號編號（比較不會被擋），找不到才查帳號資料
      try { const j = await igGet('web/search/topsearch/?context=user&query=' + encodeURIComponent(me)); const u = (j.users || []).map(x => x.user).find(x => x && String(x.username).toLowerCase() === me.toLowerCase()); if (u) IGP.uid = String(u.pk || u.pk_id || ''); } catch (e) { if (/IG_(LOGIN|RATE)/.test(String(e.message))) throw e; }
      if (!IGP.uid) { await sleep(1500); const j = await igGet('users/web_profile_info/?username=' + encodeURIComponent(me)); const u = j.data && j.data.user; if (u) { IGP.uid = u.id; IGP.total = (u.edge_owner_to_timeline_media && u.edge_owner_to_timeline_media.count) || 0; IGP.priv = !!(u.is_private && !u.followed_by_viewer); } }
      if (!IGP.uid) throw new Error('IG_NOUSER');
      await sleep(1200 + Math.random() * 800);
    }
    const done = new Set((LS('hist') || []).filter(h => h.ok && !h.gone).flatMap(h => hUrls(h)).map(u => (igCode(u) || {}).code).filter(Boolean));
    let added = 0;
    while (added < 1 && IGP.more) {          // 一次只問 IG 一頁（12 則），跟網頁往下滑一樣
      const j = await igGet(`feed/user/${IGP.uid}/?count=12` + (IGP.next ? '&max_id=' + encodeURIComponent(IGP.next) : ''));
      if (IGP.user !== me) return;
      const batch = (j.items || []).map(igParse).filter(p => p.items.length && !IGP.posts.some(x => x.code === p.code));
      batch.forEach(p => { p.had = done.has(p.code); IGP.posts.push(p); if (!p.had) IGP.sel.add(p.code); });
      igDraw(batch); added += batch.length;
      IGP.more = !!j.more_available && !!j.next_max_id; IGP.next = j.next_max_id || '';
      igStat(); $('#igMsg').textContent = `載入中… ${IGP.posts.length} 則`;
      if (!batch.length) break;
    }
    msg = IGP.more ? '' : (IGP.posts.length ? '全部載入完了' : (IGP.priv ? '這是私人帳號，要先追蹤才看得到' : '這個帳號沒有貼文'));
  } catch (e) { msg = friendly(String(e.message || e)); }
  finally { if (IGP.user === me) { IGP.loading = false; $('#igMore').disabled = false; $('#igMore').hidden = !IGP.more; $('#igMore').textContent = '繼續載入（再 12 則）'; $('#igMsg').textContent = msg; igStat(); } }
}
function igDraw(batch) {
  $('#igGrid').insertAdjacentHTML('beforeend', batch.map(p => `<button class="ig-t${IGP.sel.has(p.code) ? ' on' : ''}" type="button" data-c="${esc(p.code)}" aria-pressed="${IGP.sel.has(p.code)}">${thumbImg(p.small, 'ig-i')}${p.nv || p.items.length > 1 ? `<span class="ig-k">${p.nv ? '影片' : ''}${p.items.length > 1 ? ' ' + p.items.length + ' 個' : ''}</span>` : ''}${p.had ? '<span class="ig-had">已下載</span>' : ''}<span class="ig-c"></span></button>`).join(''));
}
$('#igGrid').onclick = e => { const b = e.target.closest('.ig-t'); if (!b) return; const c = b.dataset.c; if (IGP.sel.has(c)) IGP.sel.delete(c); else IGP.sel.add(c); b.classList.toggle('on', IGP.sel.has(c)); b.setAttribute('aria-pressed', IGP.sel.has(c)); igStat(); };
function igMark(on) { IGP.sel = new Set(on ? IGP.posts.map(p => p.code) : []); document.querySelectorAll('#igGrid .ig-t').forEach(b => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); igStat(); }
$('#igAll').onclick = () => igMark(true);
$('#igNone').onclick = () => igMark(false);
$('#igMore').onclick = () => igMore();
$('#igClose').onclick = () => igClose();
$('#igDl').onclick = () => {
  const L = IGP.posts.filter(p => IGP.sel.has(p.code)); if (!L.length) return;
  const who = IGP.user;
  const grp = L.length > 1 ? newGrp() : '';
  L.forEach(p => enqueue(`https://www.instagram.com/p/${p.code}/`, 'best', { ok: true, title: p.title, thumb: p.thumb, uploader: p.user || who, uid: p.uid || IGP.uid, ig: p, heights: [] }, { bulk: true, grp, grpN: L.length }));
  igClose(); page('dl'); toast(`已加入 ${L.length} 則，會照順序下載`, 3500);
};

// =====================================================================
// 拖時間軸時的即時預覽：先暫停，上一格跳完（seeked）才跳下一格。
// 以前每 0.16 秒硬跳一次，手機解碼來不及，一直被下一次蓋掉，畫面就停在按下去那一格。放開＝從那裡開始播。
// =====================================================================
function scrubStart(v) { if (!v) return; const s = v._sc || (v._sc = {}); if (!s.on) { s.on = true; s.was = !v.paused; } s.want = null; try { v.pause(); } catch (e) {} }
function scrubTo(v, t) {
  if (!v || !isFinite(t)) return; const s = v._sc || (v._sc = {});
  if (v.seeking) { s.want = t; return; }
  s.want = null; try { v.currentTime = t; } catch (e) {}
}
function scrubEnd(v, t, play) {
  if (!v) return; const s = v._sc || {}; s.on = false; s.want = null;
  if (isFinite(t)) { try { v.currentTime = t; } catch (e) {} }
  if (play !== false) { vplay(v); }
}
document.addEventListener('seeked', e => {
  const v = e.target, s = v && v._sc; if (!s || s.want == null) return;
  const t = s.want; s.want = null; if (Math.abs(v.currentTime - t) > 0.04) { try { v.currentTime = t; } catch (x) {} }
}, true);

// =====================================================================
// 內建播放器：影片、聲音、照片都在 App 裡看
// 左右滑＝快轉（手壓著畫面跟著走，放開從那裡播）；點兩下左右＝跳 10 秒、中間＝播放暫停；往下滑＝關閉
// 長按畫面＝暫時 2 倍速；速度可以 0.1 微調；逐格、A-B 重複、整部重複、填滿畫面
// =====================================================================
const P = { list: [], i: 0, title: '', rate: Math.min(4, Math.max(0.25, +LS('prate') || 1)), uiT: 0, land: false, a: null, b: null };
const pEl = $('#player'), pv = $('#pv'), pim = $('#pi');
pim.draggable = false; pim.addEventListener('dragstart', e => e.preventDefault());   // 照片不能被「拖走」，不然上下滑會被打斷
function mimeGuess(n) { const e = (String(n || '').split('.').pop() || '').toLowerCase(); return ({ mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska', mov: 'video/quicktime', m4a: 'audio/mp4', mp3: 'audio/mpeg', opus: 'audio/ogg', ogg: 'audio/ogg', flac: 'audio/flac', wav: 'audio/wav', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic' })[e] || ''; }
const mimeOf = f => (f && (f.mime && f.mime !== 'application/octet-stream' ? f.mime : mimeGuess(f.name))) || '';
function playF(files, title, start, hctx) {
  const L = mediaOf(files);
  if (!L.length) { openF((files || [])[0]); return; }
  P.hctx = hctx || null;
  P.list = L; P.i = Math.max(0, Math.min(start || 0, L.length - 1)); P.title = title || '';
  pEl.hidden = false; document.body.classList.add('locked'); call('keepOn', true); call('immersive', true);
  pLoad();
}
function pPos(save) { const f = P.list[P.i]; if (!f || pv.hidden) return 0; const M = LS('pos') || {}; if (save === undefined) return M[f.uri] || 0;
  if (isFinite(pv.duration) && pv.duration > 60) { if (pv.currentTime > 5 && pv.currentTime < pv.duration - 10) M[f.uri] = Math.floor(pv.currentTime); else delete M[f.uri]; const K = Object.keys(M); if (K.length > 300) delete M[K[0]]; LS('pos', M); } return 0; }
function pLoad() {
  const f = P.list[P.i], img = mimeOf(f).startsWith('image/');
  markW(f.uri);
  $('#pErr').hidden = true; $('#pSeek').hidden = true;
  $('#pTitle').textContent = (P.list.length > 1 ? `${P.i + 1}/${P.list.length}　` : '') + (P.title || f.name || '');
  pim.hidden = !img; pv.hidden = img; $('#pBot').hidden = img; $('#pPlay').hidden = img;
  if (has('fileExists') && !N.fileExists(f.uri)) { pFail('檔案已經被刪除或搬走了'); return; }
  if (img) { pv.pause(); pv.removeAttribute('src'); pv.load(); pim.src = f.uri; call('orient', 'auto'); pUi(true); }
  else { P.a = P.b = null; pAbUi(); $('#pRateBox').hidden = true; pim.removeAttribute('src'); $('#pBar').value = 0; $('#pCur').textContent = '0:00'; $('#pDur').textContent = ''; pv.src = f.uri; pv.playbackRate = P.rate; vplay(pv); pUi(); }
}
function pFail(msg) { $('#pErrMsg').textContent = msg; $('#pErr').hidden = false; pUi(true); }
function pStep(d) { if (P.list.length < 2) return; pPos(true); P.i = (P.i + d + P.list.length) % P.list.length; pLoad(); }
function pClose() { $('#pRateBox').hidden = true; pPos(true); pv.pause(); pv.removeAttribute('src'); pv.load(); pim.removeAttribute('src'); pEl.hidden = true; if ($('#igPane').hidden) document.body.classList.remove('locked'); call('orient', 'auto'); call('keepOn', false); call('immersive', false); if (!$('#p_hist').classList.contains('on')) return; drawHist(); }
function pUi(sticky) { pEl.classList.add('ui'); clearTimeout(P.uiT); if (!sticky && !pv.hidden && !pv.paused) P.uiT = setTimeout(() => pEl.classList.remove('ui'), 3000); }
function pToggle() { if (pv.paused) { vplay(pv); } else pv.pause(); }
function pJump(d) { if (!isFinite(pv.duration)) return; pv.currentTime = Math.min(pv.duration, Math.max(0, pv.currentTime + d)); pHint(pv.currentTime, d); setTimeout(() => { if (!gs) $('#pSeek').hidden = true; }, 600); }
function pHint(t, d) { const el = $('#pSeek'); el.hidden = false; el.innerHTML = `<b>${fd(t)}</b> / ${fd(pv.duration)}<span>${d >= 0 ? '+' : '−'}${fd(Math.abs(d))}</span>`; }
pv.addEventListener('loadedmetadata', () => {
  $('#pDur').textContent = fd(pv.duration);
  const p = pPos(); if (p > 5 && p < pv.duration - 10) { pv.currentTime = p; toast('從上次看到的 ' + fmtDur(p) + ' 繼續', 2000); }
  P.land = false; call('orient', 'auto');                                       // 不自動轉橫向：照你手上拿的方向播，要全螢幕橫看再按 ⟳
});
let pSaveT = 0;
pv.addEventListener('timeupdate', () => {
  if (P.b != null && P.a != null && !gs && pv.currentTime >= P.b) { pv.currentTime = P.a; return; }    // A-B 重複
  if (gs || !isFinite(pv.duration)) return; $('#pBar').value = Math.round(pv.currentTime / pv.duration * 1000); $('#pCur').textContent = fd(pv.currentTime); if (Date.now() - pSaveT > 5000) { pSaveT = Date.now(); pPos(true); } });
pv.addEventListener('play', () => { $('#pPlay').textContent = '❚❚'; pUi(); });
pv.addEventListener('pause', () => { $('#pPlay').textContent = '▶'; pUi(true); });
pv.addEventListener('ended', () => { pPos(true); if (P.i + 1 < P.list.length) pStep(1); else pUi(true); });
pv.addEventListener('error', () => { if (pv.getAttribute('src')) pFail('這個檔案在 App 裡播不了（格式不支援）。可以改用其他 App 開。'); });
pim.addEventListener('error', () => { if (pim.getAttribute('src')) pFail('這張圖在 App 裡開不了。可以改用其他 App 開。'); });
$('#pBar').addEventListener('input', () => { if (isFinite(pv.duration)) { const t = $('#pBar').value / 1000 * pv.duration; scrubStart(pv); scrubTo(pv, t); $('#pCur').textContent = fd(t); pUi(true); } });
$('#pBar').addEventListener('change', () => { if (isFinite(pv.duration)) { scrubEnd(pv, $('#pBar').value / 1000 * pv.duration); pUi(); } });
$('#pPlay').onclick = () => pToggle();
$('#pClose').onclick = () => pClose();
// ---- 速度：－／＋ 每次 0.1，或直接點常用的；記住下次用
function pRateSet(r) {
  P.rate = Math.round(Math.min(4, Math.max(0.25, r)) * 100) / 100; LS('prate', P.rate);
  pv.playbackRate = P.rate; pv.defaultPlaybackRate = P.rate; const t = (P.rate % 1 ? P.rate : P.rate.toFixed(1)) + 'x';
  $('#pRate').textContent = t; $('#pRateVal').textContent = t;
  document.querySelectorAll('#pRateBox [data-rv]').forEach(b => b.classList.toggle('on', +b.dataset.rv === P.rate));
}
$('#pRate').onclick = () => { $('#pRateBox').hidden = !$('#pRateBox').hidden; pRateSet(P.rate); pUi(true); };
$('#pRateBox').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.rs) pRateSet(P.rate + +b.dataset.rs); else if (b.dataset.rv) pRateSet(+b.dataset.rv); pUi(true); };
pRateSet(P.rate);
// ---- 逐格（找關鍵畫面）、A-B 重複、整部重複、填滿畫面
const pFrame = d => { if (!isFinite(pv.duration)) return; pv.pause(); scrubTo(pv, Math.min(pv.duration, Math.max(0, pv.currentTime + d / 30))); setTimeout(() => { $('#pCur').textContent = fd(pv.currentTime); $('#pBar').value = Math.round(pv.currentTime / pv.duration * 1000); pHint(pv.currentTime, d / 30); setTimeout(() => { if (!gs) $('#pSeek').hidden = true; }, 700); }, 120); pUi(true); };
$('#pFrB').onclick = () => pFrame(-1);
$('#pFrF').onclick = () => pFrame(1);
function pAbUi() { const b = $('#pAB'); b.textContent = P.a == null ? 'A-B' : P.b == null ? `A ${fd(P.a)} → B?` : `A-B ${fd(P.a)}~${fd(P.b)}`; b.classList.toggle('on', P.a != null); }
$('#pAB').onclick = () => {
  const t = pv.currentTime || 0;
  if (P.a == null) { P.a = t; toast('起點 A 設好了，播到終點再按一次', 2200); }
  else if (P.b == null) { if (t <= P.a + 0.3) { toast('終點要在起點後面'); return; } P.b = t; pv.currentTime = P.a; toast('A-B 這段會一直重複，再按一次取消', 2200); }
  else { P.a = P.b = null; toast('取消 A-B 重複'); }
  pAbUi(); pUi(true);
};
$('#pLoop').onclick = () => { pv.loop = !pv.loop; LS('ploop', pv.loop); $('#pLoop').classList.toggle('on', pv.loop); toast(pv.loop ? '這部會一直重複播' : '不重複'); pUi(); };
$('#pFit').onclick = () => { const on = !pEl.classList.contains('fill'); pEl.classList.toggle('fill', on); LS('pfill', on); $('#pFit').classList.toggle('on', on); toast(on ? '填滿畫面（邊邊會切掉）' : '完整顯示'); pUi(); };
function pNavHint(t) { const el = $('#pSeek'); el.hidden = false; el.innerHTML = `<b style="font-size:16px">${esc(t)}</b>`; clearTimeout(P.navT); P.navT = setTimeout(() => { if (!gs) el.hidden = true; }, 1400); }
// 上下滑換一則：從紀錄打開的照紀錄順序換；不然多個檔就換檔；單一個檔往下滑＝關掉
function pVert(d) {
  const m = pv.hidden ? pim : pv;
  const reset = () => { m.style.transition = 'transform .22s, opacity .22s'; m.style.transform = ''; m.style.opacity = ''; };
  let moved = false;
  if (P.hctx) moved = histStep(d);
  else if (P.list.length > 1) { pStep(d); moved = true; }
  else if (d < 0) { pClose(); reset(); return; }
  else { pNavHint('沒有下一個了'); call('vibrate', 60); }
  if (!moved) { reset(); return; }
  const n = pv.hidden ? pim : pv;                                             // 新的從另一邊滑進來
  n.style.transition = 'none'; n.style.transform = `translateY(${d > 0 ? 40 : -40}%)`; n.style.opacity = '0.3';
  if (n !== m) { m.style.transform = ''; m.style.opacity = ''; }
  requestAnimationFrame(() => requestAnimationFrame(() => { n.style.transition = 'transform .25s ease-out, opacity .25s'; n.style.transform = ''; n.style.opacity = ''; }));
}
function histStep(d) {
  const c = P.hctx; if (!c) return;
  const H = LS('hist') || [], get = k => H.find(x => hKey(x) === c.order[k]);
  let k = c.at, h = null;
  while (true) {
    k += d;
    if (k < 0 || k >= c.order.length) { pNavHint(d < 0 ? '已經是第一則了' : '已經是最後一則了'); call('vibrate', 60); return false; }
    h = get(k); if (h && h.ok && !h.gone && mediaOf(h.files).length) break;
  }
  pPos(true); c.at = k; P.list = mediaOf(h.files); P.i = 0; P.title = h.title || '';
  pLoad(); pNavHint((d < 0 ? '▲ 上一則：' : '▼ 下一則：') + (h.title || '')); call('vibrate', 20);
  return true;
}
pv.loop = !!LS('ploop'); $('#pLoop').classList.toggle('on', pv.loop);
if (LS('pfill')) { pEl.classList.add('fill'); $('#pFit').classList.add('on'); }
$('#pRot').onclick = () => { P.land = !P.land; call('orient', P.land ? 'land' : 'port'); pUi(); };
$('#pRot').hidden = !has('orient');
const pExt = () => { const f = P.list[P.i]; if (f) { pv.pause(); openF(f); } };
$('#pExt').onclick = pExt; $('#pErrBtn').onclick = pExt;
// ---- 手勢
let gs = null, lastTap = 0, tapT = 0;
pEl.addEventListener('pointerdown', e => {
  if (e.target.closest('button,input,#pErr,#pRateBox')) return;
  if (!$('#pRateBox').hidden) { $('#pRateBox').hidden = true; }
  gs = { x0: e.clientX, y0: e.clientY, lx: e.clientX, lt: performance.now(), mode: '', base: pv.currentTime || 0, tgt: pv.currentTime || 0, applied: 0 };
  const g0 = gs;
  gs.lp = setTimeout(() => {                                                    // 長按（沒在滑）＝暫時 2 倍速，放開恢復
    if (gs !== g0 || g0.mode || pv.hidden || pv.paused) return;
    g0.mode = 'fast'; pv.playbackRate = Math.min(4, P.rate * 2);
    const el = $('#pSeek'); el.hidden = false; el.innerHTML = `<b>${pv.playbackRate}x</b><span>▶▶ 放開恢復</span>`; call('vibrate', 20);
  }, 450);
  try { pEl.setPointerCapture(e.pointerId); } catch (x) {}
});
pEl.addEventListener('pointermove', e => {
  if (!gs) return;
  const dx = e.clientX - gs.x0, dy = e.clientY - gs.y0, now = performance.now();
  if (!gs.mode) {
    if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.2) gs.mode = pv.hidden ? 'swipe' : 'seek';
    else if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx) * 1.5) gs.mode = 'vert';   // 上下滑：換影片（像抖音）
    else return;
    clearTimeout(gs.lp);
    gs.lx = e.clientX; gs.lt = now; gs.base = gs.tgt = pv.currentTime || 0;
    if (gs.mode === 'seek') scrubStart(pv);
  }
  if (gs.mode === 'fast') return;
  if (gs.mode === 'vert') { const m = pv.hidden ? pim : pv; m.style.transition = 'none'; m.style.transform = `translateY(${dy / (ZM || 1)}px)`; m.style.opacity = String(Math.max(0.35, 1 - Math.abs(dy) / 900)); return; }
  if (gs.mode === 'seek' && isFinite(pv.duration)) {
    const step = e.clientX - gs.lx, dt = Math.max(now - gs.lt, 1), v = Math.abs(step) / dt;      // 手指速度（像素／毫秒）
    const maxGain = Math.min(4, Math.max(0.06, pv.duration / 400));                               // 長片快滑一次能跳比較遠
    const k = Math.min(1, Math.max(0, (v - 0.12) / 1.4));
    const gain = 0.035 + (maxGain - 0.035) * k * k;                                               // 每滑一個像素跳幾秒：慢＝很細，快＝很多
    gs.tgt = Math.min(pv.duration, Math.max(0, gs.tgt + step * gain)); gs.lx = e.clientX; gs.lt = now;
    pHint(gs.tgt, gs.tgt - gs.base);
    $('#pBar').value = Math.round(gs.tgt / pv.duration * 1000); $('#pCur').textContent = fd(gs.tgt);
    scrubTo(pv, gs.tgt);                                                                          // 手壓著，畫面跟著走
  }
});
function pEnd(e, cancel) {
  const g = gs; gs = null; if (!g) return;
  clearTimeout(g.lp);
  $('#pSeek').hidden = true;
  if (g.mode === 'fast') { pv.playbackRate = P.rate; return; }
  if (g.mode === 'seek') { scrubEnd(pv, isFinite(pv.duration) ? g.tgt : NaN); pUi(); return; }      // 放開＝從這裡開始播
  if (cancel) { if (g.mode === 'vert') { const m = pv.hidden ? pim : pv; m.style.transform = ''; m.style.opacity = ''; } return; }
  if (g.mode === 'swipe') { pStep(e.clientX - g.x0 < 0 ? 1 : -1); return; }
  if (g.mode === 'vert') {                                                    // 往上滑＝下一則（較舊）、往下滑＝上一則（較新）
    const dy = e.clientY - g.y0, fast = Math.abs(dy) / Math.max(1, performance.now() - g.lt) > 0.5;
    const m = pv.hidden ? pim : pv;
    if (Math.abs(dy) < 90 && !fast) { m.style.transition = 'transform .2s, opacity .2s'; m.style.transform = ''; m.style.opacity = ''; return; }
    pVert(dy < 0 ? 1 : -1); return;
  }
  const now = performance.now(), w = pEl.clientWidth * ZM;
  if (now - lastTap < 300 && !pv.hidden) { clearTimeout(tapT); lastTap = 0; if (e.clientX < w * 0.35) pJump(-10); else if (e.clientX > w * 0.65) pJump(10); else pToggle(); }
  else { lastTap = now; tapT = setTimeout(() => { if (pEl.classList.contains('ui') && !pv.hidden && !pv.paused) { clearTimeout(P.uiT); pEl.classList.remove('ui'); } else pUi(); }, 300); }
}
pEl.addEventListener('pointerup', e => pEnd(e, false));
pEl.addEventListener('pointercancel', e => pEnd(e, true));

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
  else if (N && !has('sweep')) { b.hidden = false; b.textContent = '外殼比較舊，到「更新」分頁按「安裝新外殼」。'; }
  else b.hidden = true;
}
applyTheme(); refreshEnv();
drawQual(); drawPreview(); counts(); drawVer(); drawStage();
$('#dlOpts').hidden = !currentUrls().length;
restore(); drawStage(); infoLine(); pump();
{ const p = LS('page'); if (p && PAGES.includes(p) && p !== 'dl') page(p); }
setTimeout(() => { if (S.autoCore && has('updateCoreCh') && Date.now() - (LS('coreAt') || 0) > 20 * 3600e3) { $('#coreMsg').textContent = '自動更新中…'; call('updateCoreCh', S.channel); } }, 1500);
clipSoon();
setTimeout(() => autoCheck(true), 3000);

// 瀏覽器預覽時放示範資料，方便看排版
if (!N) {
  info = { ok: true, url: 'https://www.youtube.com/watch?v=demo', title: '（示範）城市夜景縮時攝影 4K', uploader: '示範頻道', dur: 754, heights: [2160, 1440, 1080, 720, 480, 360], hasSubs: true, thumb: '', chapters: [{ t: 'a' }, { t: 'b' }] };
  urlBox.value = info.url; probeUrl = info.url; $('#siteTag').textContent = 'YouTube'; drawPreview(); drawQual(); $('#dlOpts').hidden = false;
  const demo = [['https://youtu.be/demo2', '720', '（示範）私人影片', 'bad', 0], ['https://www.tiktok.com/@demo/video/1', 'best', '（示範）貓咪跳上冰箱', 'ok', 100], ['https://www.bilibili.com/video/BV1demo', '1080', '（示範）手作木工：做一張小板凳', 'run', 46.2]];
  demo.forEach(([u, q, t, st, pct]) => { const s2 = siteOf(u); const j = { id: 'd' + (seq++), pid: 'dp' + seq, url: u, q, site: s2.k, ab: s2.ab, title: t, thumb: '', state: st, pct, size: '182.4 MB', speed: '3.2 MB/s', eta: 41, k: 0, files: st === 'ok' ? [{ path: '下載/YTDown/TikTok/貓咪跳上冰箱.mp4', uri: '', size: 8.4e6 }] : [], msg: st === 'bad' ? '這是私人影片，沒辦法下載。' : '' }; Q.unshift(j); drawCard(j); });
  $('#dlInfo').textContent = '手機剩 23.4 GB · 存到 下載/YTDown';
}
