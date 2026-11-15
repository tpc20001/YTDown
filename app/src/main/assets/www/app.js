// YT Download 畫面（熱更新會換掉這個檔）
// 原生那邊：window.YTD。回呼：onProg onDone onInfo onExec onHttp onBrowse onTree onPicked onApk onUpd onCore onShare onShortcut onResume onToast onBack
'use strict';
const UI_VER = 'YTD_UI_V0.1.35';
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
  ['YTD_UI_V0.1.35', ['預設避開 AV1 格式（很多手機解不了，App 內播放器、相簿會播不出來），改抓 VP9／H.264，畫質一樣', '影片在 App 裡播不了時，畫面上會直接出現「用其他 App 播」按鈕（例如 MX Player）']],
  ['YTD_UI_V0.1.34', ['YouTube 多線加速：把影片切成很多小段，同時下載好幾段（預設 8 條，設定裡可調 4～16）', '多線下載失敗時，會自動改回一般方式再試一次']],
  ['YTD_UI_V0.1.33', ['YouTube 下載改成每次只要 10 MB 一段，減少被 YouTube 限速（大檔、4K 越到後面越慢的情況）']],
  ['YTD_UI_V0.1.32', ['Telegram：可以登入你自己的帳號（平台 → Telegram），網頁版拿不到的大影片、相簿也能下載', 'Telegram 沒登入、網頁版又沒提供時，錯誤訊息會直接說明']],
  ['YTD_V0.1.09（外殼）', ['加入 Telegram 官方的 TDLib，可以用自己的帳號登入下載']],
  ['YTD_UI_V0.1.31', ['多張的貼文改成像 IG 那樣一頁一張：滑一下就換下一張，會自動對齊，張跟張之間留一點空隙', '自動播放：每張照片停 1 秒，用 0.5 秒滑到下一張，最後一張會接回第一張', '影片那一頁：滑進來就開始播，停在這頁完整播一次，再播的時候滑到下一張']],
  ['YTD_UI_V0.1.30', ['多張的貼文改成「膠卷」：所有照片一格接一格並排、中間沒有縫，慢慢往左捲動，一直循環', '膠卷裡的影片：進畫面就開始播，捲到正中間會停住完整播一次，再播的時候繼續往左捲', '可以用手指左右拖動膠卷；點照片放大看，點影片播放／暫停']],
  ['YTD_UI_V0.1.29', ['下載完 2 秒後自動播放：影片連播 3 次', '多張的貼文會自動輪播：照片每張停幾秒，慢慢往左滑到下一張，一直循環', '輪播遇到影片：滑進來時就開始播，停在中間完整播一次，再播的時候滑出去換下一個', '換張有滑動的動畫；碰一下畫面就停止自動播放（設定可關）']],
  ['YTD_UI_V0.1.28', ['修正：多張貼文上的「‹ ›」按鈕會變成放大，現在會正確換張']],
  ['YTD_UI_V0.1.27', ['影片直接在下載頁中間那一塊播放，不會放大、也不會跳到另一個播放器', '點畫面＝播放／暫停；播放時左右滑＝快轉（滑越快跳越多、越慢越精準）；下面有進度條', '想放大再按「全螢幕播放」']],
  ['YTD_UI_V0.1.26', ['同一個網址不會重複自動下載：下載過的會問「要再下載一次嗎」，要你按了才會抓', '下載頁改成中間一個大畫面：下載中看進度，下載完直接顯示影片或照片', '多張的貼文可以在大畫面上左右滑，點一下放到全螢幕', '下載頁下面不再列清單，舊的都在「紀錄」', '沒有貼網址時，畫質選項會收起來，讓畫面更大']],
  ['YTD_UI_V0.1.25', ['全自動：打開 App 時剪貼簿有影片網址，就直接用預設畫質下載，不用按任何按鈕（設定可關）', '從其他 App 分享進來也一樣直接下載', '下載頁只留最新完成的那一筆，其他的都收在「紀錄」']],
  ['YTD_UI_V0.1.24', ['TikTok：下載前先找有沒有更高畫質的來源（透過 tikwm.com 查詢），有就用高畫質的，沒有就照原本方式', 'TikTok 的照片輪播貼文也能下載了', '設定裡可以關掉這個功能']],
  ['YTD_UI_V0.1.23', ['照片可以直接存到手機相簿（設定 → 存到相簿：關／只有照片／照片和影片）', '紀錄裡一則貼文有很多張時，全部攤開顯示，點哪張就看哪張', 'IG 帳號瀏覽改得更保守：一次只載入 12 則（跟 IG 網頁一樣），不再先查帳號資料', 'IG 擋住時會顯示 IG 實際回了什麼']],
  ['YTD_V0.1.08（外殼）', ['照片、影片可以存進相簿（DCIM/YTDown）']],
  ['YTD_UI_V0.1.22', ['新增「更新」分頁：檢查更新、更新下載核心、每一版改了什麼，都集中在這裡', '有新版本時，「更新」分頁上會出現「新」的標記']],
  ['YTD_UI_V0.1.21', ['平台頁：已登入的網站多了「重貼」，可以直接換新的代碼', 'IG、FB 多了「App 內登入」當備用（如果你已經在 App 的瀏覽器裡登入過，按一下就能沿用）', 'IG 登入失敗時會顯示 IG 實際回了什麼，方便找原因']],
  ['YTD_UI_V0.1.20', ['Instagram、Facebook 改成只用「貼代碼」登入（不在 App 裡輸入帳號密碼，避開 Meta 的驗證和鎖帳號風險）', 'IG 慢慢下載：一次只抓一則、每則隔幾秒、每 20 則休息 2～4 分鐘（設定可關）', 'IG 帳號瀏覽載入貼文時也放慢', '支援平台加上 Telegram（公開頻道貼文）']],
  ['YTD_UI_V0.1.19', ['Instagram：照片、影片、多張貼文、限時動態都能下載（要先在「平台」登入 IG）', 'IG 帳號瀏覽：搜尋帳號或貼上個人頁網址，一次載入 100 則、預設全勾、可以一次全部下載', '內建播放器：紀錄裡直接播放影片、看照片；左右滑快轉（滑越快跳越多、越慢越精準）、點兩下左右跳 10 秒、往下滑關閉、記住上次看到哪', '紀錄：可依日期、檔案大小、標題、作者排序；可搜尋作者（打一部分就找得到）；點作者看他的全部', '平台登入多了「貼代碼」：每個平台都能貼 Cookie 登入']],
  ['YTD_V0.1.07（外殼）', ['新增可帶登入資料的網路請求、直接下載檔案（IG 照片用）', '播放器用的橫向、螢幕不關、全螢幕', 'APK 只留 64 位元，從 160 MB 縮到約三分之一；App 內更新外殼改成邊下載邊存，並顯示進度']],
  ['YTD_UI_V0.1.18', ['剪貼簿提示的「加入」按鈕變大、改成醒目的藍色', '縮圖完整顯示不裁切：橫式影片整張看得到，直式影片左右留黑邊']],
  ['YTD_UI_V0.1.17', ['選「最好」時會標出實際畫質（例如：最好 1080p），下載卡片和紀錄都會記下來', '沒先解析就下載的（一次貼很多個、分享直接下載），也會自動補上標題、縮圖和畫質']],
  ['YTD_UI_V0.1.16', ['有新版本會主動提醒：開 App、回到 App、每 30 分鐘各檢查一次，下載頁上方會出現「有新版本」', '下載速度和剩餘時間改成平均值（看最近 12 秒），每秒更新一次，不再亂跳', '下載完成會顯示總共花了多久']],
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
const DEF = { quality: 'best', conc: 2, subdir: true, playlist: false, tpl: 'title', subs: false, subLang: 'zh-Hant,zh-TW,zh,en', embed: true, sponsor: false,
  auto: true, autoUpd: true, autoDl: true, autoPlay: true, shareAuto: false, clip: true, cookies: true, notify: true, vibe: true, theme: 'auto', autoCore: true, channel: 'stable',
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
  if (!has('http')) throw new Error('IG_SHELL');
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
  if (/IG_LOGIN/.test(m)) return 'IG 不認這組登入資料。到「平台」→ Instagram：按「重貼」貼新的 sessionid；或按「登出」後用「App 內登入」。' + (igDet ? `（IG 回應 ${igDet}）` : '');

  if (/TG_LOGIN/.test(m)) return 'Telegram 還沒登入，到「平台」→ Telegram 登入你的帳號。';
  if (/TG_NOMSG/.test(m)) return 'Telegram 找不到這則訊息（可能被刪了，或是私人頻道你沒有加入）。';
  if (/TG_NOMEDIA/.test(m)) return '這則 Telegram 訊息裡沒有影片或照片。';
  if (/TG_NODL/.test(m)) return '這個頻道不允許下載（頻道開了內容保護）。';
  if (/TG_ERR/.test(m)) return 'Telegram 回報錯誤：' + m.replace(/^.*TG_ERR\s*/, '').slice(0, 120);
  if (site === 'Telegram' && /沒有產生檔案|No video formats|Unsupported URL|No media/i.test(m)) return has('tgJob') ? '這支影片太大，Telegram 網頁版沒有提供。到「平台」→ Telegram 登入你的帳號，就能下載。' : '這支影片太大，Telegram 網頁版沒有提供。要更新外殼到 V0.1.09 以上，登入 Telegram 帳號才能下載。';
  if (/IG_SHELL/.test(m)) return 'IG 的照片和帳號瀏覽要外殼 YTD_V0.1.07 以上，請先更新外殼。';
  if (/IG_URL/.test(m)) return '看不懂這個 IG 網址。請用貼文、Reels、限時動態或個人頁的連結。';
  if (/IG_NOUSER/.test(m)) return '找不到這個 IG 帳號，確認帳號名稱有沒有打對。';
  if (/IG_(NONE|HTTP)/.test(m)) return 'IG 沒有回傳內容（可能是私人帳號、貼文被刪，或登入過期要重新登入）。' + (igDet ? `（IG 回應 ${igDet}）` : '');
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
  if (p === 'hist') drawHist();
  if (p === 'sites') drawSites();
  if (p === 'set' || p === 'upd') drawSet();
  if (p !== 'dl') { autoStop(); stagePause(); }
  window.scrollTo(0, 0);
  LS('page', p);
}
document.querySelectorAll('.tab').forEach(b => b.onclick = () => page(b.dataset.p));
window.onBack = () => {
  if (!$('#player').hidden) { pClose(); return true; }
  if (!$('#igPane').hidden) { igClose(); return true; }
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
  $('#srcChips').innerHTML = [...SEARCHERS, { search: 'iguser', k: 'IG 帳號' }].map(s => `<button class="chip" type="button" data-s="${s.search}" aria-pressed="${s.search === S.src}">${esc(s.k)}</button>`).join('');
  $('#srcChips').querySelectorAll('.chip').forEach(b => b.onclick = () => { S.src = b.dataset.s; saveS(); drawSrc(); doSearch(); });
}
$('#bSearch').onclick = () => doSearch();
function doSearch() {
  const q = urlBox.value.trim(); if (q.length < 2) return;
  if ((S.src || 'ytsearch') === 'iguser') { igSearch(q); return; }
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
$('#results').onclick = e => { const b = e.target.closest('.res'); if (!b) return; if (b.dataset.ig) { openIg(b.dataset.ig, b.dataset.uid); return; } urlBox.value = b.dataset.u; onInput(); };
async function igSearch(q) {
  q = q.replace(/^@/, '').trim(); const R = $('#results');
  const direct = `<button class="res" type="button" data-ig="${esc(q)}"><span class="res-b"><span class="res-t">直接打開 @${esc(q)}</span><span class="res-m">帳號名稱要完全一樣</span></span></button>`;
  if (!has('http')) { R.innerHTML = `<p class="empty">${esc(friendly('IG_SHELL'))}</p>`; return; }
  R.innerHTML = '<div class="skel" style="height:56px"></div><div class="skel" style="height:56px"></div>';
  try {
    const j = await igGet('web/search/topsearch/?context=user&query=' + encodeURIComponent(q));
    const U = (j.users || []).map(x => x.user).filter(u => u && u.username);
    R.innerHTML = (U.length ? U.map(u => `<button class="res" type="button" data-ig="${esc(u.username)}" data-uid="${esc(u.pk || u.pk_id || '')}">${thumbImg(u.profile_pic_url, 'ava')}<span class="res-b"><span class="res-t">@${esc(u.username)}</span><span class="res-m">${esc([u.full_name, u.is_private ? '私人帳號' : '', u.is_verified ? '已驗證' : ''].filter(Boolean).join(' · '))}</span></span></button>`).join('') : '<p class="empty">找不到帳號</p>') + direct;
  } catch (e) { R.innerHTML = `<p class="empty">${esc(friendly(String(e.message || e)))}</p>` + (/IG_LOGIN|IG_SHELL/.test(String(e.message)) ? '' : direct); }
}
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
  if (siteOf(u).k === 'Instagram' && has('http')) {
    const me = probeId, un = igUserOf(u);
    if (un) { info = { ok: true, url: u, profile: un, title: '@' + un + ' 的 IG', heights: [] }; drawPreview(); drawQual(); return; }
    igFetch(u).then(d => { if (probeId !== me) return; info = { ok: true, url: u, title: d.title, uploader: d.user, thumb: d.thumb, heights: [], ig: d, k: 0 }; drawPreview(); drawQual(); })
      .catch(e => { if (probeId !== me) return; const m = String(e.message || e); if (/IG_(LOGIN|RATE)/.test(m) || !has('probe')) { info = { err: friendly(m), url: u }; drawPreview(); drawQual(); } else N.probe(probeId, u, probeSpec(u, k)); });
    return;
  }
  if (!has('probe')) { info = null; drawPreview(); return; }
  if (newShell()) N.probe(probeId, u, probeSpec(u, k));
  else N.probe(probeId, u, JSON.stringify([...(triesFor(u)[k] || []), ['--ignore-no-formats-error']]));
}
window.onInfo = s => {
  const p = JSON.parse(s);
  if (String(p.id).startsWith('qi:')) {   // 佇列裡沒先解析的工作：補上標題、縮圖、實際畫質
    const j = Q.find(x => x.id === p.id.slice(3)); if (!j || !p.ok) return;
    if (!j.title) j.title = p.title; if (!j.thumb) j.thumb = p.thumb; if (!j.uploader) j.uploader = p.uploader || '';
    if (p.heights && p.heights.length) j.res = resFor(j.q, p.heights[0]);
    const el = document.getElementById(j.id); if (el) el.dataset.st = '';
    drawCard(j); saveQ();
    if (['ok', 'bad'].includes(j.state)) { const H = LS('hist') || [], h = H.find(x => x.u === j.url && !x.res); if (h) { h.res = j.res; if (!h.thumb) h.thumb = j.thumb; LS('hist', H); } }
    return;
  }
  if (p.id !== probeId) return;
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
  L.forEach(u => enqueue(u, sel.q, L.length === 1 ? info : null, { section, sponsor: sel.sponsor, chapters: sel.chapters }));
  urlBox.value = ''; info = null; probeUrl = ''; $('#secFrom').value = ''; $('#secTo').value = ''; sel.chapters = false; sel.sponsor = S.sponsor;
  onInput();
  toast(L.length > 1 ? `已加入 ${L.length} 個` : '已加入下載');
};

// ---- 剪貼簿、分享、捷徑
let clipU = '';
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
  if (Q.some(j => j.state === 'ok' && urlKey(j.url) === k) || (LS('hist') || []).some(h => h.ok && urlKey(h.u) === k)) return 'had';
  return '';
}
let clipDup = false;
function askClip(u, dup) {
  clipU = u; clipDup = dup;
  $('#clipLbl').textContent = dup ? '這個下載過了，要再下載一次嗎？' : '剪貼簿有網址';
  $('#clipAdd').textContent = dup ? '再下載' : '加入'; $('#clipNo').textContent = dup ? '不用' : '忽略';
  $('#clipUrl').textContent = u; $('#clipBar').hidden = false;
}
function autoGo(u) { LS('lastClip', u); $('#clipBar').hidden = true; page('dl'); enqueue(u, S.quality, null, { sponsor: S.sponsor }); }
function checkClip() {
  if (!has('paste') || (!S.clip && !S.autoDl)) return;
  const L = urlsIn(N.paste()); if (!L.length) return;
  const u = L[0];
  if (u === LS('lastClip') || currentUrls().includes(u)) return;          // 同一份剪貼簿內容：不重複處理、也不一直問
  const seen = seenUrl(u);
  if (seen === 'busy') return;
  if (seen === 'had') { askClip(u, true); return; }                         // 下載過：要你按了才會再抓
  if (S.autoDl && siteOf(u) !== OTHER && !igUserOf(u)) { autoGo(u); toast('已自動開始下載（' + siteOf(u).k + '）', 3000); return; }
  if (S.clip) askClip(u, false);
}
window.onResume = () => { setTimeout(checkClip, 450); refreshEnv(); pump(); autoCheck(false); };
$('#clipAdd').onclick = () => { if (clipDup) { autoGo(clipU); toast('再下載一次'); return; } LS('lastClip', clipU); $('#clipBar').hidden = true; page('dl'); addUrls(clipU); };
$('#clipNo').onclick = () => { LS('lastClip', clipU); $('#clipBar').hidden = true; };
window.onShare = t => {
  page('dl'); const L = urlsIn(t);
  if (!L.length) { toast('分享的內容裡沒有網址'); return; }
  if (!S.autoDl) { addUrls(t); return; }
  const fresh = L.filter(u => !seenUrl(u)), dup = L.find(u => seenUrl(u) === 'had');
  fresh.forEach(u => { LS('lastClip', u); enqueue(u, S.quality, null, { sponsor: S.sponsor }); });
  if (fresh.length) toast(fresh.length > 1 ? `已開始下載 ${fresh.length} 個` : '已開始下載');
  else if (dup) askClip(dup, true);
};
window.onShortcut = k => {
  if (k === 'paste') { page('dl'); const t = call('paste') || ''; if (S.autoDl && urlsIn(t).length) window.onShare(t); else if (!addUrls(t, true)) toast('剪貼簿裡沒有網址'); }
  else if (k === 'browse') { page('dl'); $('#bBrowse').click(); }
};

// =====================================================================
// 佇列（會存起來，App 關掉再開會接回）
// =====================================================================
const Q = [];
let seq = 0;
const KEEP = ['id', 'pid', 'url', 'q', 'site', 'ab', 'title', 'thumb', 'playlist', 'subs', 'embed', 'sponsor', 'chapters', 'section', 'k', 'state', 'pct', 'files', 'msg', 't', 'took', 'res', 'uploader', 'bulk', 'uid', 'hdSrc', 'doneAt'];
function saveQ() { LS('queue', Q.slice(0, 60).map(j => { const o = {}; KEEP.forEach(k => o[k] = j[k]); return o; })); }
function enqueue(url, q, inf, x) {
  x = x || {};
  const st = siteOf(url);
  const j = { id: 'j' + Date.now() + '_' + (seq++), url, q, site: st.k, ab: st.ab, title: inf && inf.ok ? inf.title : '', thumb: inf && inf.ok ? inf.thumb : '',
    playlist: !!(inf && inf.isList && sel.playlist), subs: !!(sel.subs && !['audio', 'mp3', 'thumb'].includes(q)), embed: !!(sel.embed && q !== 'thumb'),
    sponsor: !!(x.sponsor && st.k === 'YouTube' && q !== 'thumb'), chapters: !!(x.chapters && q !== 'thumb'), section: x.section || '',
    k: inf && inf.ok ? (inf.k || 0) : 0, state: 'wait', pct: 0, t: Date.now() };
  j.uploader = inf && inf.ok ? (inf.uploader || '') : ''; j.uid = (inf && (inf.uid || (inf.ig && inf.ig.uid))) || ''; j.igData = (inf && inf.ig) || null; j.bulk = !!x.bulk;
  if (inf && inf.ok && inf.heights && inf.heights.length) j.res = resFor(q, inf.heights[0]);
  Q.unshift(j); drawCard(j); pump(); saveQ();
  if (!(inf && inf.ok) && newShell() && q !== 'thumb' && st.k !== 'Instagram') N.probe('qi:' + j.id, url, probeSpec(url, 0));
}
const running = () => Q.filter(j => j.state === 'run').length;
let netWait = false;
function pump() {
  if (S.wifi && has('netInfo')) {
    const n = jcall('netInfo') || {};
    netWait = !!(n.metered || !n.wifi);
    if (netWait && Q.some(j => j.state === 'wait')) { Q.filter(j => j.state === 'wait').forEach(drawCard); counts(); return; }
  } else netWait = false;
  for (const n of [...Q].reverse().filter(j => j.state === 'wait')) {
    if (running() >= S.conc) break;
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
  j.state = 'run'; j.pct = 0; j.stage = '讀取 IG 貼文…'; j.pid = j.id + '~' + j.k; j.size = j.speed = j.eta = j.item = ''; j.sm = null; j.total = 0; j.t0 = Date.now(); j.igWait = true;
  drawCard(j); saveQ();
  try {
    const d = j.igData || await igFetch(j.url);
    if (!j.igWait) return;                       // 等的時候被取消了
    j.igWait = false; j.stage = '';
    if (!j.title) j.title = d.title; if (!j.thumb) j.thumb = d.thumb; j.uploader = d.user || j.uploader; j.uid = d.uid || j.uid || ''; j.res = 0;
    const el = document.getElementById(j.id); if (el) el.dataset.st = '';
    drawCard(j);
    N.fetchJob(JSON.stringify({ id: j.pid, items: d.items.map(x => ({ url: x.url, name: x.name })), sub: S.subdir ? 'Instagram' : '', dest: S.dest && S.dest.uri ? S.dest.uri : '', gallery: S.gallery === 'off' ? '' : S.gallery, title: j.title, notify: S.notify && !j.bulk, headers: { Referer: 'https://www.instagram.com/' } }));
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
  j.state = 'run'; j.pct = 0; j.stage = '找高畫質來源…'; j.pid = j.id + '~' + j.k; j.size = j.speed = j.eta = j.item = ''; j.sm = null; j.total = 0; j.t0 = Date.now(); j.igWait = true;
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
    N.fetchJob(JSON.stringify({ id: j.pid, items, sub: S.subdir ? 'TikTok' : '', dest: S.dest && S.dest.uri ? S.dest.uri : '', gallery: S.gallery === 'off' ? '' : S.gallery, title: j.title, notify: S.notify }));
  } catch (e) { if (j.igWait) back(); }
}
const tgReady = () => { const t = jcall('tgInfo'); return !!(t && t.state === 'ready'); };
function tgStartJob(j) {
  j.state = 'run'; j.pct = 0; j.stage = '向 Telegram 要檔案…'; j.pid = j.id + '~' + j.k; j.size = j.speed = j.eta = j.item = ''; j.sm = null; j.total = 0; j.t0 = Date.now(); j.viaTg = true;
  drawCard(j); saveQ();
  N.tgJob(JSON.stringify({ id: j.pid, url: j.url, sub: S.subdir ? 'Telegram' : '', dest: S.dest && S.dest.uri ? S.dest.uri : '', gallery: S.gallery === 'off' ? '' : S.gallery, title: j.title, notify: S.notify }));
}
window.onTitle = s2 => { const p = JSON.parse(s2), j = byPid(p.id); if (j && p.title) { j.title = p.title; stg.key = ''; drawStage(); } };
function modeFor(j) {
  const q = j.q;
  if (q === 'thumb') return 'none';
  if (!S.noAv1 || ['audio', 'mp3'].includes(q)) return q;
  const h = +q, lim = h ? `[height<=${h}]` : '';
  return `f:bv*[vcodec!^=av01]${lim}+ba[ext=m4a]/bv*[vcodec!^=av01]${lim}+ba/b[vcodec!^=av01]${lim}/bv*${lim}+ba/b${lim}/bv*+ba/b`;
}
function startJob(j) {
  if (j.site === 'Telegram' && has('tgJob') && tgReady() && !j.noTg) { tgStartJob(j); return; }
  if (j.site === 'TikTok' && S.ttHd && has('fetchJob') && has('http') && !j.noHd && !['audio', 'mp3', 'thumb'].includes(j.q) && !j.section && !j.chapters) { ttStart(j); return; }
  if (j.site === 'Instagram' && has('fetchJob') && !j.noApi && !['audio', 'mp3'].includes(j.q)) { igStart(j); return; }
  j.state = 'run'; j.pct = 0; j.stage = '準備中…'; j.pid = j.id + '~' + j.k; j.size = j.speed = j.eta = j.item = ''; j.sm = null; j.total = 0; j.t0 = Date.now();
  const st = siteOf(j.url);
  const spec = { id: j.pid, url: j.url, mode: modeFor(j), args: argsFor(j), sub: S.subdir ? j.site : '', playlist: j.playlist,
    tpl: (j.playlist ? '%(playlist_index|)s ' : '') + (TPL_STR[S.tpl] || TPL_STR.title), title: j.title, notify: S.notify,
    dest: S.dest && S.dest.uri ? S.dest.uri : '', gallery: S.gallery === 'off' ? '' : S.gallery, cookies: cookieOk(st.ck) ? st.ck : '', aria2: !!(S.aria && !j.section && !j.chapters) };
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
window.onDone = s => {
  const p = typeof s === 'string' ? JSON.parse(s) : s, j = byPid(p.id); if (!j) return;
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
  drawCard(j); trimDone(); saveQ(); pump();
  if (p.ok) autoBegin(j);
};

// 下載頁只留最新完成的那一筆（其他的都在「紀錄」裡）；正在跑和排隊的照常顯示
function trimDone() {
  const F = Q.filter(j => ['ok', 'bad', 'cancel'].includes(j.state)); if (F.length < 2) return;
  const keep = F.reduce((a, b) => ((b.doneAt || b.t || 0) > (a.doneAt || a.t || 0) ? b : a));
  F.forEach(j => { if (j === keep) return; const i = Q.indexOf(j); if (i >= 0) Q.splice(i, 1); });
  drawStage(); counts();
}
function stText(j) {
  if (j.state === 'run') return j.stage || [j.pct ? j.pct.toFixed(1) + '%' : '', j.size, j.speed, j.eta ? '剩 ' + fmtEta(j.eta) : '', j.item ? '第 ' + j.item + ' 個' : ''].filter(Boolean).join(' · ');
  if (j.state === 'wait') { const r = Math.round((igNext - Date.now()) / 1000); return netWait ? '等 Wi-Fi（設定裡開了只用 Wi-Fi）' : (j.site === 'Instagram' && S.igSlow && r > 6) ? `休息中，約 ${r >= 60 ? Math.ceil(r / 60) + ' 分鐘' : r + ' 秒'}後繼續（慢慢抓，避免被 IG 擋）` : '等前面的下載完'; }
  if (j.state === 'ok') return '已存到 ' + (j.files[0] ? j.files[0].path : '') + (j.files.length > 1 ? `（共 ${j.files.length} 個檔）` : '') + (j.took ? ' · 花了 ' + fmtEta(j.took) : '');
  return j.msg;
}
function cardHTML(j) {
  const stateTxt = { wait: netWait ? '等 Wi-Fi' : '排隊中', run: '下載中', ok: '完成', bad: '失敗', cancel: '已取消' }[j.state];
  const stateCls = { run: 'run', ok: 'ok', bad: 'bad' }[j.state] || '';
  let acts = '';
  if (j.state === 'run' || j.state === 'wait') acts = `<button class="btn ghost" data-a="cancel" type="button">取消</button>`;
  else if (j.state === 'ok') acts = `<button class="btn" data-a="open" type="button">播放</button><button class="btn ghost" data-a="share" type="button">分享</button><button class="btn ghost" data-a="x" type="button">移除</button>`;
  else acts = `<button class="btn" data-a="retry" type="button">重試</button>${j.state === 'bad' ? '<button class="btn ghost" data-a="detail" type="button">詳細</button>' : ''}<button class="btn ghost" data-a="x" type="button">移除</button>`;
  const tags = [qShow(j.q, j.res), j.playlist ? '清單' : '', j.section ? '片段' : '', j.chapters ? '章節' : '', j.sponsor ? '跳贊助' : '', j.hdSrc ? '高畫質來源' : ''].filter(Boolean);
  return `${thumbImg(j.thumb)}<div class="cb">
    <div class="ct">${esc(j.title || j.url)}</div>
    <div class="cm"><span class="badge">${esc(j.ab)}</span><span class="state ${stateCls}">${stateTxt}</span>${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>
    <div class="bar"><i style="width:${j.state === 'run' ? Math.max(2, j.pct || 0) : 100}%"></i></div>
    <div class="st">${esc(stText(j))}</div>
    <div class="acts">${acts}</div></div>`;
}
function drawCard(j) { drawStage(); counts(); }

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
function drawStage() {
  const el = $('#stage'), box = $('#stageInfo'), j = curJob();
  const waitN = Q.filter(x => x.state === 'wait').length, runN = running();
  $('#stageMore').textContent = (runN > 1 || waitN) ? `正在下載 ${runN} 個${waitN ? '，還有 ' + waitN + ' 個排隊' : ''}` : '';
  if (!j) { if (stg.key !== 'empty') { stg.id = ''; stg.key = 'empty'; stg.idx = 0; el.className = 'stage empty'; el.innerHTML = '<p>複製影片或貼文的網址，再打開 App，<br>就會自動下載並顯示在這裡。</p>'; box.innerHTML = ''; } return; }
  const M = j.state === 'ok' ? mediaOf(j.files) : [];
  if (stg.id !== j.id) stg.idx = 0;
  stg.idx = Math.max(0, Math.min(stg.idx, Math.max(0, M.length - 1)));
  const key = stageKey(j, M);
  if (key !== stg.key) {
    autoStop();
    stg.id = j.id; stg.key = key;
    el.className = 'stage ' + j.state;
    let m = '';
    if (M.length) {
      const f = M[stg.idx];
      m = `<div class="st-slide cur">${slideHTML(j, f)}</div><button class="st-play" type="button" aria-label="播放"${mimeOf(f).startsWith('image/') ? ' hidden' : ''}>▶</button><div class="st-hint" hidden></div><div class="st-ctl" hidden><span class="st-cur">0:00</span><input type="range" class="st-bar" min="0" max="1000" value="0" aria-label="播放進度"><span class="st-dur"></span></div>`;
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
  const tt = el.querySelector('.st-txt'); if (tt) tt.textContent = j.state === 'bad' || j.state === 'cancel' ? '' : stText(j);
  const st = $('#stageSt'); if (st) st.textContent = j.state === 'run' || j.state === 'wait' ? '' : stText(j);
}
const stageKey = (j, M) => [j.id, j.state, M.length, stg.idx, j.thumb || '', j.title || '', netWait].join('|');
function slideHTML(j, f) {
  const t = mimeOf(f);
  return t.startsWith('image/') ? `<img class="st-m" src="${esc(f.uri)}" alt="" draggable="false">`
    : `<video class="st-m" src="${esc(f.uri)}${t.startsWith('video/') ? '#t=0.5' : ''}" preload="metadata" playsinline${!t.startsWith('video/') && j.thumb ? ` poster="${esc(j.thumb)}"` : ''}></video>`;
}
const stageEl = $('#stage');
const stageVid = () => stageEl.querySelector('.st-slide.cur video');
let stageG = null;      // 手指正在大畫面上做的動作
function stageWire(v) { // 把影片接上進度條、播放鈕（只對「現在中間這一個」更新畫面）
  if (v.dataset.w) return; v.dataset.w = '1';
  const q = c => stageEl.querySelector(c), mine = () => v === stageVid();
  v.addEventListener('timeupdate', () => { const bar = q('.st-bar'); if (!mine() || (stageG && stageG.mode === 'seek') || !isFinite(v.duration) || !bar) return; bar.value = Math.round(v.currentTime / v.duration * 1000); q('.st-cur').textContent = fmtDur(v.currentTime) || '0:00'; q('.st-dur').textContent = fmtDur(v.duration); });
  v.addEventListener('play', () => { if (!mine()) return; const b = q('.st-play'), c = q('.st-ctl'); if (b) b.hidden = true; if (c) c.hidden = false; call('keepOn', true); });
  v.addEventListener('pause', () => { if (!mine()) return; const b = q('.st-play'); if (b) b.hidden = false; call('keepOn', false); });
  v.addEventListener('ended', () => { if (!mine()) return; const b = q('.st-play'); if (b && !auto.on) b.hidden = false; if (!auto.on) call('keepOn', false); });
  const bad = () => { if (!mine() || q('.st-err')) return; autoStop(); const b = q('.st-play'); if (b) b.hidden = true; stageEl.insertAdjacentHTML('beforeend', '<div class="st-err"><span>這支影片的格式手機內建的播放器解不了</span><button class="btn primary" type="button" data-a="ext">用其他 App 播（例如 MX Player）</button></div>'); };
  v.addEventListener('error', bad);
  if (v.error) bad();
}
function stageToggle() {
  const v = stageVid(); if (!v) return; stageWire(v);
  if (v.paused) { if (!v.dataset.s) { v.dataset.s = '1'; try { v.currentTime = 0; } catch (e) {} } const p = v.play(); if (p && p.catch) p.catch(() => {}); }
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
function pagerPlay(v) { try { v.currentTime = 0; } catch (e) {} const p = v.play(); if (p && p.catch) p.catch(() => {}); }
function pagerBuild(j, M) {
  const el = stageEl.querySelector('.pgr'); clearTimeout(pager.t);
  Object.assign(pager, { el, n: M.length, idx: 0, drag: 0 });
  const one = (f, i) => `<div class="pg-s" data-n="${i}">${mimeOf(f).startsWith('image/') ? `<img src="${esc(f.uri)}" alt="" draggable="false">` : `<video src="${esc(f.uri)}${mimeOf(f).startsWith('video/') ? '#t=0.5' : ''}" preload="metadata" playsinline></video><span class="fr-k">▶</span>`}</div>`;
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
      if (cv && rv) { try { rv.currentTime = cv.currentTime; } catch (e) {} rv._n = cv._n; if (!cv.paused) { const p = rv.play(); if (p && p.catch) p.catch(() => {}); } cv.pause(); }
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
      const again = () => { try { v.currentTime = 0; } catch (e) {} const p = v.play(); if (p && p.catch) p.catch(() => {}); };
      if (!multi) { if (auto.n < 3) again(); else { autoStop(); const b = stageEl.querySelector('.st-play'); if (b) b.hidden = false; call('keepOn', false); } return; }   // 單一影片：播 3 次
      again();                                                             // 輪播裡的影片：第 2 次停在中間完整播
      if (auto.n >= 2) slideTo(stg.idx + 1, 1, true);                      // 第 3 次開始播的同時，滑出去換下一個
    });
  }
  try { v.currentTime = 0; } catch (e) {}
  const p = v.play(); if (p && p.catch) p.catch(() => {});
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { autoStop(); stagePause(); } });

{
  // 大畫面上的操作：影片就在這一塊播放（不放大）。點一下＝播放／暫停；播放過後左右滑＝快轉；沒在播時左右滑＝換張
  const el = stageEl;
  const hint = (v, t, d) => { const h = el.querySelector('.st-hint'); if (!h) return; h.hidden = false; h.innerHTML = `<b>${fmtDur(t) || '0:00'}</b> / ${fmtDur(v.duration) || '0:00'}<span>${d >= 0 ? '+' : '−'}${fmtDur(Math.abs(d)) || '0:00'}</span>`; };
  el.addEventListener('input', e => { if (!e.target.classList.contains('st-bar')) return; const v = stageVid(); if (v && isFinite(v.duration)) { v.currentTime = e.target.value / 1000 * v.duration; el.querySelector('.st-cur').textContent = fmtDur(v.currentTime) || '0:00'; } });
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
    }
    if (g.mode === 'pan') { pager.drag = (pager.idx === 0 && dx > 0) ? dx * 0.3 : dx; pagerSet(0); return; }   // 一頁一張：跟著手指動
    if (g.mode === 'seek' && v) {
      const step = e.clientX - g.lx, dt = Math.max(now - g.lt, 1), sp = Math.abs(step) / dt;
      const maxGain = Math.min(4, Math.max(0.06, v.duration / 400)), k = Math.min(1, Math.max(0, (sp - 0.12) / 1.4));
      g.tgt = Math.min(v.duration, Math.max(0, g.tgt + step * (0.035 + (maxGain - 0.035) * k * k))); g.lx = e.clientX; g.lt = now;
      hint(v, g.tgt, g.tgt - g.base);
      const bar = el.querySelector('.st-bar'); if (bar) bar.value = Math.round(g.tgt / v.duration * 1000);
      const cur = el.querySelector('.st-cur'); if (cur) cur.textContent = fmtDur(g.tgt) || '0:00';
      if (now - g.applied > 160) { g.applied = now; v.currentTime = g.tgt; }
    }
  });
  const end = (e, cancel) => {
    const gg = stageG; stageG = null; if (!gg) return;
    const h = el.querySelector('.st-hint'); if (h) h.hidden = true;
    if (gg.mode === 'pan') {                                                  // 放手：滑夠遠或滑得快就換一張，不然彈回去
      const dx = cancel ? 0 : e.clientX - gg.x0, fast = Math.abs(dx) / Math.max(1, performance.now() - gg.t0) > 0.4;
      const go = (Math.abs(dx) > stageEl.clientWidth * 0.18 || (fast && Math.abs(dx) > 20)) ? (dx < 0 ? 1 : -1) : 0;
      pagerGo(pager.idx + go, 280, false); return;
    }
    const j = curJob(); if (cancel || !j) return;
    if (gg.mode === 'seek') { const v = stageVid(); if (v) v.currentTime = gg.tgt; return; }
    if (gg.mode === 'swipe') { if (Math.abs(e.clientX - gg.x0) > 40) stageStep(e.clientX - gg.x0 < 0 ? 1 : -1); return; }
    if (gg.fr && j.state === 'ok') {                                          // 點這一頁：影片＝播放／暫停，照片＝放大看
      const fv = gg.fr.querySelector('video');
      if (fv) { if (fv.paused) { const p = fv.play(); if (p && p.catch) p.catch(() => {}); } else fv.pause(); }
      else playF(j.files, j.title, +gg.fr.dataset.n);
      return;
    }
    if (gg.btn === 'ext') { const f = mediaOf(j.files)[stg.idx] || (j.files || [])[0]; if (f) openF(f); return; }
    if (gg.btn === 'prev') { stageStep(-1); return; }
    if (gg.btn === 'next') { stageStep(1); return; }
    if (j.state !== 'ok') return;
    if (stageVid()) stageToggle();                                          // 影片：就在這一塊播
    else if (mediaOf(j.files).length) playF(j.files, j.title, stg.idx);     // 照片：點一下放大看
  };
  el.addEventListener('pointerup', e => end(e, false));
  el.addEventListener('pointercancel', e => end(e, true));
  el.addEventListener('dragstart', e => e.preventDefault());
  $('#stageInfo').addEventListener('click', e => { const b = e.target.closest('[data-a]'), j = curJob(); if (!b || !j) return; if (b.dataset.a === 'open') { autoStop(); stagePause(); } act(j, b.dataset.a); });
}
function openF(f) { if (!f) return; if (has('fileExists') && f.uri && !N.fileExists(f.uri)) { toast('檔案已經被刪除或搬走了'); return; } has('openFile') ? N.openFile(f.uri, f.mime || '') : toast('這版外殼不支援，請更新 APK'); }
function shareF(f) { if (!f) return; has('shareFile') ? N.shareFile(f.uri, f.mime || '') : toast('這版外殼不支援，請更新 APK'); }
function act(j, a) {
  const f = (j.files || [])[0];
  if (a === 'cancel') { j.stop = 1; if (j.state === 'wait' || j.igWait) { j.igWait = false; j.state = 'cancel'; j.msg = '已取消'; drawCard(j); saveQ(); } else call('cancel', j.pid); }
  else if (a === 'open') playF(j.files, j.title, j.id === stg.id ? stg.idx : 0);
  else if (a === 'share') shareF(f);
  else if (a === 'retry') { j.noApi = false; j.noHd = false; j.noTg = false; j.noFast = false; j.k = 0; j.stop = 0; j.state = 'wait'; j.msg = ''; drawCard(j); pump(); saveQ(); }
  else if (a === 'detail') toast(String(j.raw || j.msg).slice(-300), 7000);
  else if (a === 'x') { const i = Q.indexOf(j); if (i >= 0) Q.splice(i, 1); drawStage(); counts(); saveQ(); }
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
let hFilter = '全部', hAsk = -1, hShow = 100;
const szOf = h => (h.files || []).reduce((a, x) => a + (+x.size || 0), 0);
const mediaOf = files => (files || []).filter(f => f && f.uri && /^(video|audio|image)\//.test(mimeOf(f)));
const hThumb = h => { const f = !h.gone && (h.files || []).find(x => /^image\//.test(x.mime || '')); return f ? f.uri : h.thumb; };   // 照片用自己的檔當縮圖，不會過期
function saveHist(j) {
  const H = LS('hist') || [];
  H.unshift({ t: Date.now(), u: j.url, title: j.title, thumb: j.thumb, site: j.site, ab: j.ab, q: j.q, res: j.res || 0, uploader: j.uploader || '', uid: j.uid || '', ok: j.state === 'ok', msg: j.msg, files: (j.files || []).slice(0, 20) });
  LS('hist', H.slice(0, 1500));
}
function drawHist() {
  const H = LS('hist') || [], kw = $('#hSearch').value.trim().toLowerCase();
  const sites = ['全部', ...new Set(H.map(h => h.site || '其他'))];
  if (!sites.includes(hFilter)) hFilter = '全部';
  $('#hSites').innerHTML = sites.length > 2 ? sites.map(s => `<button class="chip" type="button" data-s="${esc(s)}" aria-pressed="${s === hFilter}">${esc(s)}</button>`).join('') : '';
  $('#hSites').querySelectorAll('.chip').forEach(b => b.onclick = () => { hFilter = b.dataset.s; drawHist(); });
  const L = H.map((h, i) => Object.assign({ i }, h)).filter(h => (hFilter === '全部' || (h.site || '其他') === hFilter) && (!kw || (h.title || '').toLowerCase().includes(kw) || (h.u || '').toLowerCase().includes(kw) || (h.uploader || '').toLowerCase().includes(kw) || (h.site || '').toLowerCase().includes(kw)));
  const so = $('#hSort').value;
  L.sort((a, b) => so === 'old' ? a.t - b.t : so === 'big' ? szOf(b) - szOf(a) : so === 'small' ? szOf(a) - szOf(b) : so === 'title' ? (a.title || '').localeCompare(b.title || '', 'zh-Hant') : so === 'user' ? ((a.uploader || '\uffff').localeCompare(b.uploader || '\uffff') || b.t - a.t) : b.t - a.t);
  const more = L.length > hShow;
  $('#hCount').textContent = H.length ? `${L.length} / ${H.length} 筆` : '';
  $('#bHClr').hidden = !H.length;
  $('#hist').innerHTML = L.length ? L.slice(0, hShow).map(h => {
    const f = h.files && h.files[0], total = szOf(h);
    const M = h.ok && !h.gone ? mediaOf(h.files) : [], multi = M.length > 1;
    const strip = multi ? `<div class="strip">${M.slice(0, 40).map((x, n) => `<button class="tile" type="button" data-a="openAt" data-n="${n}" aria-label="第 ${n + 1} 個">${mimeOf(x).startsWith('image/') ? `<img src="${esc(x.uri)}" alt="" loading="lazy">` : mimeOf(x).startsWith('video/') ? `<video src="${esc(x.uri)}#t=0.5" preload="metadata" muted playsinline></video><span class="tile-k">影片</span>` : '<span class="tile-k">聲音</span>'}</button>`).join('')}${M.length > 40 ? `<span class="mut small">還有 ${M.length - 40} 個</span>` : ''}</div>` : '';
    return `<div class="card ${h.ok ? 'ok' : 'bad'}${h.gone ? ' gone' : ''}${multi ? ' multi' : ''}" data-i="${h.i}">${multi ? '' : `<button class="tbtn" type="button" data-a="open" aria-label="播放">${thumbImg(hThumb(h))}</button>`}<div class="cb">
      <div class="ct">${esc(h.title || h.u)}</div>
      <div class="cm"><span class="badge">${esc(h.ab || '網址')}</span>${h.uploader ? `<button class="link who" type="button" data-a="who">${esc((h.site === 'Instagram' ? '@' : '') + h.uploader)}</button>` : ''}<span>${fmtTime(h.t)}</span><span>${esc(qShow(h.q || 'best', h.res))}</span>${total ? `<span>${fmtSize(total)}</span>` : ''}${(h.files || []).length > 1 ? `<span>${h.files.length} 個檔</span>` : ''}</div>
      ${strip}
      ${h.gone ? '<div class="st mut">檔案已刪除</div>' : h.ok ? '' : `<div class="st">${esc(h.msg || '失敗')}</div>`}
      ${hAsk === h.i ? `<div class="ask"><span>刪掉手機裡的檔案？刪了就找不回來。</span><button class="btn sm danger" data-a="delYes" type="button">刪掉</button><button class="btn sm ghost" data-a="delNo" type="button">取消</button></div>` : ''}
      <div class="acts">${h.ok && f && !h.gone ? '<button class="btn" data-a="open" type="button">播放</button><button class="btn ghost" data-a="share" type="button">分享</button>' : ''}<button class="btn ghost" data-a="again" type="button">再下載</button><button class="btn ghost" data-a="copy" type="button">複製連結</button>${h.ok && f && !h.gone && has('deleteFile') ? '<button class="btn ghost" data-a="delFile" type="button">刪檔案</button>' : ''}<button class="btn ghost" data-a="del" type="button">刪紀錄</button></div>
    </div></div>`;
  }).join('') + (more ? `<button class="btn big" type="button" id="hMore">再顯示 100 筆（還有 ${L.length - hShow} 筆）</button>` : '') : `<p class="empty">${H.length ? '沒有符合的紀錄' : '還沒有下載紀錄'}</p>`;
  const hm = $('#hMore'); if (hm) hm.onclick = () => { hShow += 100; drawHist(); };
}
$('#hist').onclick = e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const i = +b.closest('.card').dataset.i, H = LS('hist') || [], h = H[i]; if (!h) return;
  const a = b.dataset.a, f = (h.files || [])[0];
  if (a === 'open') { if (h.ok && !h.gone && f) playF(h.files, h.title); }
  else if (a === 'openAt') playF(h.files, h.title, +b.dataset.n);
  else if (a === 'who') { if (h.site === 'Instagram' && has('http')) openIg(h.uploader, h.uid); else { $('#hSearch').value = h.uploader; hShow = 100; drawHist(); window.scrollTo(0, 0); } }
  else if (a === 'share') shareF(f);
  else if (a === 'again') { page('dl'); addUrls(h.u); }
  else if (a === 'copy') copyText(h.u);
  else if (a === 'del') { H.splice(i, 1); LS('hist', H); hAsk = -1; drawHist(); }
  else if (a === 'delFile') { hAsk = i; drawHist(); }
  else if (a === 'delNo') { hAsk = -1; drawHist(); }
  else if (a === 'delYes') { let n = 0; (h.files || []).forEach(x => { if (x.uri && N.deleteFile(x.uri)) n++; }); h.gone = true; LS('hist', H); hAsk = -1; drawHist(); toast(n ? `刪掉 ${n} 個檔案` : '檔案可能已經不在了'); }
};
$('#hSearch').addEventListener('input', () => { hShow = 100; drawHist(); });
$('#hSort').onchange = () => { hShow = 100; LS('hsort', $('#hSort').value); drawHist(); };
{ const v = LS('hsort'); if (v) $('#hSort').value = v; }
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
      <span class="site-acts">${s.tg && has('tgInfo') ? (tgS.state === 'ready' ? '<button class="btn sm ghost" data-a="tgOut" type="button">登出</button>' : '<button class="btn sm" data-a="tgOpen" type="button">登入</button>') : ''}${s.ck && canLogin ? (logged ? '<button class="btn sm ghost" data-a="code" type="button">重貼</button><button class="btn sm ghost" data-a="logout" type="button">登出</button>' : (s.codeOnly ? '<button class="btn sm" data-a="code" type="button">貼代碼</button><button class="btn sm ghost" data-a="login" type="button">App 內登入</button>' : '<button class="btn sm" data-a="login" type="button">登入</button><button class="btn sm ghost" data-a="code" type="button">貼代碼</button>')) : ''}</span></div>
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
  else if (b.dataset.a === 'login') { N.browse(s.codeOnly ? s.home : s.login, 'login', s.ck, s.dom); toast(s.codeOnly ? '看到自己的帳號後，按右上角「完成登入」' : '登入後按右上角「完成登入」', 4500); }
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
  chipsInto($('#sGallery'), [['off', '關'], ['img', '只有照片'], ['all', '照片和影片']], S.gallery, v => { S.gallery = v; saveS(); drawSet(); });
  $('#galNote').textContent = verNum(call('shellVer')) < 108 && N ? '要外殼 V0.1.08 以上才有用，請先到「更新」裝新外殼' : (S.dest && S.dest.uri ? '你有自己選存檔資料夾，所以這個設定不會用到' : '會存到相簿的 YTDown' + (S.subdir ? '／平台名稱' : '') + '，其他檔案照舊存到「下載」');
  $('#concV').textContent = S.conc;
  $('#destName').textContent = S.dest && S.dest.uri ? '目前：' + S.dest.name + (has('treeOk') && !N.treeOk(S.dest.uri) ? '（不能用了，請重選）' : '') : '目前：手機的「下載/YTDown」';
  bindSw('#sSubdir', 'subdir'); bindSw('#sTtHd', 'ttHd'); bindSw('#sYtFast', 'ytFast'); bindSw('#sNoAv1', 'noAv1');
  chipsInto($('#sYtConn'), [['4', '4 條'], ['8', '8 條'], ['12', '12 條'], ['16', '16 條']], String(S.ytConn || 8), v => { S.ytConn = +v; saveS(); drawSet(); }); bindSw('#sAutoPlay', 'autoPlay', () => { if (!S.autoPlay) autoStop(); }); bindSw('#sPlaylist', 'playlist', () => sel.playlist = S.playlist);
  bindSw('#sSubs', 'subs', () => { sel.subs = S.subs; drawQual(); }); bindSw('#sEmbed', 'embed', () => { sel.embed = S.embed; drawQual(); });
  bindSw('#sSponsor', 'sponsor', () => { sel.sponsor = S.sponsor; drawQual(); });
  bindSw('#sWifi', 'wifi', pump); bindSw('#sIgSlow', 'igSlow', () => { igNext = 0; pump(); }); bindSw('#sAria', 'aria');
  bindSw('#sAuto', 'auto'); bindSw('#sShareAuto', 'autoDl'); bindSw('#sClip', 'clip'); bindSw('#sCookies', 'cookies');
  bindSw('#sNotify', 'notify', () => { if (S.notify) call('askNotify'); }); bindSw('#sVibe', 'vibe'); bindSw('#sAutoCore', 'autoCore');
  bindTxt('#sRate', 'rate'); bindTxt('#sProxy', 'proxy'); bindTxt('#sArgs', 'args');
  $('#sSubLang').value = S.subLang;
  const core = jcall('coreState') || {};
  $('#ariaItem').hidden = !core.aria2;
  $('#envNotify').textContent = env.notify === false ? '目前沒有允許' : env.notify ? '已允許' : '';
  $('#envBattery').textContent = env.batteryFree ? '已設定，不會被省電暫停' : '長時間下載不會被系統暫停（建議設定）';
  $('#ytTries').innerHTML = YT_TRIES.map((t, i) => { const c = t.find(a => a[0] === '--extractor-args'); return `${i + 1}. ${c ? esc(c[1].replace('youtube:player_client=', '')) : '預設'}`; }).join('<br>');
  $('#updUrl').value = updUrl();
  bindSw('#sAutoUpd', 'autoUpd', () => { if (S.autoUpd) autoCheck(true); else $('#updBar').hidden = true; });
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
$('#bGoUpd').onclick = () => page('upd');
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
  const u = $('#updUrl').value.trim(); if (!u) { $('#updMsg').textContent = '先填 update.json 的網址'; return; }
  LS('updurl', u); $('#updMsg').textContent = '檢查中…'; $('#bApk').hidden = true; $('#bReload').hidden = true;
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
  if (!has('http')) { toast(friendly('IG_SHELL'), 4500); return; }
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
    const done = new Set((LS('hist') || []).filter(h => h.ok && !h.gone && h.site === 'Instagram').map(h => (igCode(h.u) || {}).code));
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
  L.forEach(p => enqueue(`https://www.instagram.com/p/${p.code}/`, 'best', { ok: true, title: p.title, thumb: p.thumb, uploader: p.user || who, uid: p.uid || IGP.uid, ig: p, heights: [] }, { bulk: true }));
  igClose(); page('dl'); toast(`已加入 ${L.length} 則，會照順序下載`, 3500);
};

// =====================================================================
// 內建播放器：影片、聲音、照片都在 App 裡看
// 左右滑＝快轉（滑越快跳越多、越慢越精準）；點兩下左右＝跳 10 秒、中間＝播放暫停；往下滑＝關閉
// =====================================================================
const P = { list: [], i: 0, title: '', rate: 1, uiT: 0, land: false };
const pEl = $('#player'), pv = $('#pv'), pim = $('#pi');
const RATES = [1, 1.25, 1.5, 2, 0.5];
function mimeGuess(n) { const e = (String(n || '').split('.').pop() || '').toLowerCase(); return ({ mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska', mov: 'video/quicktime', m4a: 'audio/mp4', mp3: 'audio/mpeg', opus: 'audio/ogg', ogg: 'audio/ogg', flac: 'audio/flac', wav: 'audio/wav', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic' })[e] || ''; }
const mimeOf = f => (f && (f.mime && f.mime !== 'application/octet-stream' ? f.mime : mimeGuess(f.name))) || '';
function playF(files, title, start) {
  const L = mediaOf(files);
  if (!L.length) { openF((files || [])[0]); return; }
  P.list = L; P.i = Math.max(0, Math.min(start || 0, L.length - 1)); P.title = title || '';
  pEl.hidden = false; document.body.classList.add('locked'); call('keepOn', true); call('immersive', true);
  pLoad();
}
function pPos(save) { const f = P.list[P.i]; if (!f || pv.hidden) return 0; const M = LS('pos') || {}; if (save === undefined) return M[f.uri] || 0;
  if (isFinite(pv.duration) && pv.duration > 60) { if (pv.currentTime > 5 && pv.currentTime < pv.duration - 10) M[f.uri] = Math.floor(pv.currentTime); else delete M[f.uri]; const K = Object.keys(M); if (K.length > 300) delete M[K[0]]; LS('pos', M); } return 0; }
function pLoad() {
  const f = P.list[P.i], img = mimeOf(f).startsWith('image/');
  $('#pErr').hidden = true; $('#pSeek').hidden = true;
  $('#pTitle').textContent = (P.list.length > 1 ? `${P.i + 1}/${P.list.length}　` : '') + (P.title || f.name || '');
  $('#pPrev').hidden = $('#pNext').hidden = P.list.length < 2;
  pim.hidden = !img; pv.hidden = img; $('#pBot').hidden = img; $('#pPlay').hidden = img;
  if (has('fileExists') && !N.fileExists(f.uri)) { pFail('檔案已經被刪除或搬走了'); return; }
  if (img) { pv.pause(); pv.removeAttribute('src'); pv.load(); pim.src = f.uri; call('orient', 'auto'); pUi(true); }
  else { pim.removeAttribute('src'); $('#pBar').value = 0; $('#pCur').textContent = '0:00'; $('#pDur').textContent = ''; pv.src = f.uri; pv.playbackRate = P.rate; const p = pv.play(); if (p && p.catch) p.catch(() => {}); pUi(); }
}
function pFail(msg) { $('#pErrMsg').textContent = msg; $('#pErr').hidden = false; pUi(true); }
function pStep(d) { if (P.list.length < 2) return; pPos(true); P.i = (P.i + d + P.list.length) % P.list.length; pLoad(); }
function pClose() { pPos(true); pv.pause(); pv.removeAttribute('src'); pv.load(); pim.removeAttribute('src'); pEl.hidden = true; if ($('#igPane').hidden) document.body.classList.remove('locked'); call('orient', 'auto'); call('keepOn', false); call('immersive', false); if (!$('#p_hist').classList.contains('on')) return; }
function pUi(sticky) { pEl.classList.add('ui'); clearTimeout(P.uiT); if (!sticky && !pv.hidden && !pv.paused) P.uiT = setTimeout(() => pEl.classList.remove('ui'), 3000); }
function pToggle() { if (pv.paused) { const p = pv.play(); if (p && p.catch) p.catch(() => {}); } else pv.pause(); }
function pJump(d) { if (!isFinite(pv.duration)) return; pv.currentTime = Math.min(pv.duration, Math.max(0, pv.currentTime + d)); pHint(pv.currentTime, d); setTimeout(() => { if (!gs) $('#pSeek').hidden = true; }, 600); }
function pHint(t, d) { const el = $('#pSeek'); el.hidden = false; el.innerHTML = `<b>${fmtDur(t) || '0:00'}</b> / ${fmtDur(pv.duration) || '0:00'}<span>${d >= 0 ? '+' : '−'}${fmtDur(Math.abs(d)) || '0:00'}</span>`; }
pv.addEventListener('loadedmetadata', () => {
  $('#pDur').textContent = fmtDur(pv.duration) || '0:00';
  const p = pPos(); if (p > 5 && p < pv.duration - 10) { pv.currentTime = p; toast('從上次看到的 ' + fmtDur(p) + ' 繼續', 2000); }
  P.land = pv.videoWidth > pv.videoHeight; call('orient', pv.videoWidth ? (P.land ? 'land' : 'port') : 'auto');
});
let pSaveT = 0;
pv.addEventListener('timeupdate', () => { if (gs || !isFinite(pv.duration)) return; $('#pBar').value = Math.round(pv.currentTime / pv.duration * 1000); $('#pCur').textContent = fmtDur(pv.currentTime) || '0:00'; if (Date.now() - pSaveT > 5000) { pSaveT = Date.now(); pPos(true); } });
pv.addEventListener('play', () => { $('#pPlay').textContent = '❚❚'; pUi(); });
pv.addEventListener('pause', () => { $('#pPlay').textContent = '▶'; pUi(true); });
pv.addEventListener('ended', () => { pPos(true); if (P.i + 1 < P.list.length) pStep(1); else pUi(true); });
pv.addEventListener('error', () => { if (pv.getAttribute('src')) pFail('這個檔案在 App 裡播不了（格式不支援）。可以改用其他 App 開。'); });
pim.addEventListener('error', () => { if (pim.getAttribute('src')) pFail('這張圖在 App 裡開不了。可以改用其他 App 開。'); });
$('#pBar').addEventListener('input', () => { if (isFinite(pv.duration)) { pv.currentTime = $('#pBar').value / 1000 * pv.duration; $('#pCur').textContent = fmtDur(pv.currentTime) || '0:00'; pUi(); } });
$('#pPlay').onclick = () => pToggle();
$('#pPrev').onclick = () => pStep(-1);
$('#pNext').onclick = () => pStep(1);
$('#pClose').onclick = () => pClose();
$('#pRate').onclick = () => { P.rate = RATES[(RATES.indexOf(P.rate) + 1) % RATES.length]; pv.playbackRate = P.rate; $('#pRate').textContent = P.rate + 'x'; pUi(); };
$('#pRot').onclick = () => { P.land = !P.land; call('orient', P.land ? 'land' : 'port'); pUi(); };
$('#pRot').hidden = !has('orient');
const pExt = () => { const f = P.list[P.i]; if (f) { pv.pause(); openF(f); } };
$('#pExt').onclick = pExt; $('#pErrBtn').onclick = pExt;
// ---- 手勢
let gs = null, lastTap = 0, tapT = 0;
pEl.addEventListener('pointerdown', e => {
  if (e.target.closest('button,input,#pErr')) return;
  gs = { x0: e.clientX, y0: e.clientY, lx: e.clientX, lt: performance.now(), mode: '', base: pv.currentTime || 0, tgt: pv.currentTime || 0, applied: 0 };
  try { pEl.setPointerCapture(e.pointerId); } catch (x) {}
});
pEl.addEventListener('pointermove', e => {
  if (!gs) return;
  const dx = e.clientX - gs.x0, dy = e.clientY - gs.y0, now = performance.now();
  if (!gs.mode) {
    if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.2) gs.mode = pv.hidden ? 'swipe' : 'seek';
    else if (dy > 24 && Math.abs(dy) > Math.abs(dx) * 1.5) gs.mode = 'down';
    else return;
    gs.lx = e.clientX; gs.lt = now; gs.base = gs.tgt = pv.currentTime || 0;
  }
  if (gs.mode === 'seek' && isFinite(pv.duration)) {
    const step = e.clientX - gs.lx, dt = Math.max(now - gs.lt, 1), v = Math.abs(step) / dt;      // 手指速度（像素／毫秒）
    const maxGain = Math.min(4, Math.max(0.06, pv.duration / 400));                               // 長片快滑一次能跳比較遠
    const k = Math.min(1, Math.max(0, (v - 0.12) / 1.4));
    const gain = 0.035 + (maxGain - 0.035) * k * k;                                               // 每滑一個像素跳幾秒：慢＝很細，快＝很多
    gs.tgt = Math.min(pv.duration, Math.max(0, gs.tgt + step * gain)); gs.lx = e.clientX; gs.lt = now;
    pHint(gs.tgt, gs.tgt - gs.base);
    $('#pBar').value = Math.round(gs.tgt / pv.duration * 1000); $('#pCur').textContent = fmtDur(gs.tgt) || '0:00';
    if (now - gs.applied > 160) { gs.applied = now; pv.currentTime = gs.tgt; }                    // 邊滑邊看畫面
  }
});
function pEnd(e, cancel) {
  const g = gs; gs = null; if (!g) return;
  $('#pSeek').hidden = true;
  if (cancel) return;
  if (g.mode === 'seek') { if (isFinite(pv.duration)) pv.currentTime = g.tgt; pUi(); return; }
  if (g.mode === 'swipe') { pStep(e.clientX - g.x0 < 0 ? 1 : -1); return; }
  if (g.mode === 'down') { if (e.clientY - g.y0 > 110) pClose(); return; }
  const now = performance.now(), w = pEl.clientWidth;
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
  else if (N && !newShell()) { b.hidden = false; b.textContent = '目前外殼比較舊，搜尋、登入、選資料夾等功能要裝外殼 YTD_V0.1.06 才能用。'; }
  else b.hidden = true;
}
applyTheme(); refreshEnv();
drawQual(); drawPreview(); counts(); drawVer(); drawStage();
$('#dlOpts').hidden = !currentUrls().length;
restore(); drawStage(); infoLine(); pump();
{ const p = LS('page'); if (p && PAGES.includes(p) && p !== 'dl') page(p); }
setTimeout(() => { if (S.autoCore && has('updateCore') && Date.now() - (LS('coreAt') || 0) > 20 * 3600e3) { $('#coreMsg').textContent = '自動更新中…'; if (has('updateCoreCh')) N.updateCoreCh(S.channel); else N.updateCore(); } }, 1500);
setTimeout(checkClip, 600);
setTimeout(() => autoCheck(true), 3000);

// 瀏覽器預覽時放示範資料，方便看排版
if (!N) {
  info = { ok: true, url: 'https://www.youtube.com/watch?v=demo', title: '（示範）城市夜景縮時攝影 4K', uploader: '示範頻道', dur: 754, heights: [2160, 1440, 1080, 720, 480, 360], hasSubs: true, thumb: '', chapters: [{ t: 'a' }, { t: 'b' }] };
  urlBox.value = info.url; probeUrl = info.url; $('#siteTag').textContent = 'YouTube'; drawPreview(); drawQual(); $('#dlOpts').hidden = false;
  const demo = [['https://youtu.be/demo2', '720', '（示範）私人影片', 'bad', 0], ['https://www.tiktok.com/@demo/video/1', 'best', '（示範）貓咪跳上冰箱', 'ok', 100], ['https://www.bilibili.com/video/BV1demo', '1080', '（示範）手作木工：做一張小板凳', 'run', 46.2]];
  demo.forEach(([u, q, t, st, pct]) => { const s2 = siteOf(u); const j = { id: 'd' + (seq++), pid: 'dp' + seq, url: u, q, site: s2.k, ab: s2.ab, title: t, thumb: '', state: st, pct, size: '182.4 MB', speed: '3.2 MB/s', eta: 41, k: 0, files: st === 'ok' ? [{ path: '下載/YTDown/TikTok/貓咪跳上冰箱.mp4', uri: '', size: 8.4e6 }] : [], msg: st === 'bad' ? '這是私人影片，沒辦法下載。' : '' }; Q.unshift(j); drawCard(j); });
  $('#dlInfo').textContent = '手機剩 23.4 GB · 存到 下載/YTDown';
}
