# AI 開發指南（先讀這份再動手）

這是一個 **Android App 的空架子**（Kotlin 外殼＋WebView 畫面）。基礎功能都已經做好、調好了。你（AI）的工作是在上面**加新程式的功能**，不要重寫已經有的東西。

使用者會把這整包（或之後的更新包 `XX_V0.1.05.zip`）丟給你，說要做什麼。

- **只改畫面**（`app/src/main/assets/www/` 裡的檔）：打包成更新包給他。他在手機上選更新包（或在檔案管理／LINE 對 zip 按分享 → 選這個 App），App 會**熱更新**，不用重裝。
- **改到外殼**（Kotlin、AndroidManifest、圖示、新的套件）：要重新打包 APK（推到 GitHub 雲端會自動打包，或請他跑 `BUILD_AND_INSTALL.bat`）。

**有設定 GitHub 的話**（`www/brand.json` 的 `"github"` 有值，或使用者說他有 repo）：改好推到他的 GitHub，雲端自動打包，每支手機的 App 自己跳「☁ 有新版」。怎麼做看 **第 11 節**。

**常用功能的做法**（讓路、背景跑很久、資料庫不卡畫面、檔案安全…）整理在 **`AI_功能庫.md`**：使用者要的功能跟裡面某一項像，就照那個做法做。

---

## 1. 使用者的固定規則（每一次都要遵守）

1. **用繁體中文回答**，口語、簡短。先說做了什麼，再說要注意什麼。App 裡給使用者看的字也都用繁體中文。
2. **只做他說的。** 你覺得好的新點子，放進「🧪 實驗工作區」（`kit.LAB_LIST`，預設關），並在回答裡說一句。不要自己改掉他沒說要改的行為。
3. **熱更新絕對不能讓 App 壞掉。**
   - 新程式碼出錯只能記 LOG，不能讓畫面停住：按鈕用 `kit.act`（已經包好 try/catch），自己的非同步程式用 `kit.safe(函式, '在做什麼')` 包起來，或自己 `try { } catch (e) { kit.log.err('在做什麼', e) }`。
   - 新版畫面 15 秒內沒有回報「開好了」（`kit.boot` 最後的 `KIT.ready`），外殼會自動換回舊版。但你寫的東西不能「開得起來、用了才壞」。
4. **畫面只能用外殼有的原生功能**（`Bridge.kt` 裡的 `@JavascriptInterface`）。
   - 需要新的原生功能（例如藍牙、相機、讀簡訊）：要加到 `Bridge.kt`、外殼版本加一（`tools/bump.py --shell`），而且要重新打包 APK。**先跟他講清楚**。
   - 畫面如果用到新外殼才有的功能，`brand.json` 的 `requires_shell` 要改成那個外殼版本（舊外殼就不會裝到這包）。
   - `tools/check.py` 會檢查畫面叫的每個 `KIT.xxx` 外殼都有。
5. **私人資料絕對不能放進程式碼**：keystore、密碼、api_id／api_hash、sessionid、token。repo 是公開的。
   - 要登入的東西，讓使用者在 App 裡**貼上**，存在手機上（`kit.data.set`），不要寫進程式碼。
   - `tools/check.py` 會掃常見的金鑰格式，但它抓不到全部，你自己要注意。
6. **📡 遠端網頁要跟手機一樣。** App 裡新增的按鈕、設定，遠端網頁也要能用（`kit.remote.api` ＋ `www/remote.html`；設定只要加 `remote: true`）。
   - 每個程式的遠端網頁用自己的埠（`brand.json` 的 `web_port`），不能跟他其他程式撞（`tools/rename.py` 的 `USED`）。
7. **使用者的資料不能弄丟。**
   - 手機上 `files/Data/`（設定、資料庫、背景工作清單）和 `files/LOG/` 永遠不會被更新包換掉。
   - 改資料庫只能「加欄位」（`kit.MIGRATE`），不刪不改舊的。
   - 會刪檔、搬檔的功能，一定要先問（`kit.ask`）、記 LOG、能復原就做復原。
   - `brand.json` 的 `pkg`（套件名稱）裝到手機後**不要改**：改了就是另一個 App，舊資料不會跟過去。
8. **每一版都要：**
   - 版本加一（`tools/bump.py`），CHANGELOG 寫改了什麼。
   - 跑 `tools/check.py`，全部 ✔ 才打包（`tools/pack.py`）。
   - 給他 `out/<前綴>_V<版本>.zip`，或推到 GitHub。
9. **看到使用者的截圖或問題時**：先確認你看懂了。要查問題時，請他用「📜 LOG → 📦 匯出最近 7 天」把 LOG 傳給你。

---

## 2. 資料夾

```
AndroidKit/                         ← 這整包（開發用）
  AI_開發指南.md                     ← 這份
  AI_功能庫.md                       ← 做過、調過的常用功能做法，用得到再看
  README.md                          ← GitHub repo 首頁顯示的說明
  使用說明.txt                       ← 給使用者的
  BUILD_AND_INSTALL.bat              ← 第一次安裝／換外殼時跑（自動裝 Java、Android SDK、做簽章鑰匙、打包 APK、USB 裝到手機）
  MAKE_GITHUB_KEY.bat                ← 把簽章鑰匙變成兩段文字，貼到 GitHub Secrets（雲端打包才能用同一把鑰匙）
  .github/workflows/build.yml        ← ☁ 雲端打包（GitHub Actions）
  build/                             ← 上面兩個 .bat 的 PowerShell
  keystore/                          ← 簽章鑰匙（app.jks、pass.txt）。.gitignore 擋掉了，絕對不能上傳
  app/
    build.gradle.kts                 ← val SHELL = 外殼版本；套件名稱、App 名稱從 brand.json 讀
    src/main/AndroidManifest.xml
    src/main/res/                    ← 圖示（drawable/ic_fg.xml 是 App 圖示、ic_stat.xml 是通知圖示）
    src/main/java/com/androidkit/shell/   ← 外殼（Kotlin，要重新打包 APK 才會換）
      App.kt          App 啟動：LOG、閃退記錄＋自動重開、畫面卡住偵測
      Host.kt         唯一的 WebView（畫面關了還在，背景工作照跑）、載入畫面、熱更新、自動換回舊版、下載
      MainActivity.kt 掛上 WebView、選檔案、權限、分享進來的更新包、返回鍵
      Bridge.kt       畫面叫的原生功能 window.KIT.xxx（全部列在這裡）
      Db.kt           SQLite（files/Data/app.sqlite3），每天備份
      KLog.kt         LOG 檔
      Notify.kt       通知、前景服務（背景不被殺）
      Remote.kt       📡 遠端網頁伺服器（PIN 登入）
      Sys.kt          效能（CPU、記憶體、電池、溫度、空間）、IP、前景 App
    src/main/assets/www/             ← 畫面（更新包換的就是這裡）
      brand.json      id、App 名稱、標題、更新包前綴、套件名稱 pkg、遠端網頁埠、主色、github、requires_shell
      version.txt     畫面版本（0.1.02）
      CHANGELOG.json  更新紀錄（最上面＝目前版本）
      index.html      外框（頂列、選單、頁面、狀態列、封面）
      kit.js          架子：選單、頁面、設定、資料庫、背景工作、讓路、效能、更新、LOG、遠端 API…（通常不用改）
      app.js          ★ 這個程式自己的功能（主要改這個）
      style.css       樣式
      remote.html     📡 遠端網頁（電腦瀏覽器看的）
      gh_workflow.txt build.yml 的副本（設定精靈「📋 複製 build.yml」用；兩個要一樣）
  tools/
    rename.py       把空架子改成新程式（id、名稱、前綴、套件名稱、埠、github）
    bump.py         版本加一＋CHANGELOG（--shell：外殼也加一）
    check.py        改完一定要跑
    pack.py         打包更新包到 out/
    make_release.py 雲端打包用（build.yml 會叫）
    mock_kit.js     假外殼：check.py 在電腦的 Chrome 裡跑畫面用

手機上（App 自己的資料夾，別的 App 看不到）：
  files/www/（熱更新裝的畫面）  files/www_prev/（上一版）  files/Data/（settings.json、jobs.json、app.sqlite3、db_backup/）  files/LOG/
```

---

## 3. 架構

- **兩層**：
  - **外殼**（Kotlin）：只做網頁做不到的事（檔案、通知、背景服務、資料庫、網路、更新、遠端伺服器）。改了要重新打包 APK。
  - **畫面**（www：HTML＋JS）：所有畫面和邏輯。可以熱更新。
- **畫面怎麼載入**：APK 裡內建一份 `assets/www`；熱更新裝的在 `files/www`。哪個版本大就用哪個（所以換新外殼時，內建的比較新就會用內建的）。
- **熱更新**（App 不用關）：
  1. 拿到更新包（選檔、分享進來、遠端上傳、雲端下載）→ 外殼檢查：是不是這個 App 的（`manifest.app`＝`brand.id`）、外殼夠不夠新（`requires_shell`）、有沒有怪檔案、路徑安全。
  2. 畫面先把背景工作存檔（`kit.jobs.checkpoint()`），外殼把目前的 www 搬到 `www_prev`、換上新的，畫面重新載入。
  3. 新畫面開好後回報 `KIT.ready`。**15 秒內沒回報**（或下次開 App 還是沒成功）→ 自動換回 `www_prev`，上方跳提示。
  4. 背景工作：重新載入後，上次「進行中」的會用存的 `data` 再跑一次 → 你的 `run` 要能從存的進度接著做（見 4.2）。
- **WebView 只有一個，放在 Host（不是 Activity）**：按返回鍵、滑掉 App 畫面，WebView 還活著，背景工作照跑。有工作時開前景服務（通知列常駐），系統比較不會殺掉。
- **全域**：`kit`（架子的一切）、`window.KIT`（外殼；電腦瀏覽器預覽時沒有，`kit.native` 是 false）、`window.APP`（app.js 的 `init`）。
- **原生功能怎麼叫**：`kit.call('名稱', 參數…)`（回傳字串／數字）、`kit.jcall('名稱')`（回傳 JSON 解開的）。會花時間的（網路、資料庫）都是「叫了之後外殼再回呼」：已經包成 Promise：`await kit.http(url)`、`await kit.db.q(sql)`。

---

## 4. 怎麼加功能（照抄這些做法，範例都在 app.js）

### 4.1 新的一頁
```js
kit.page({
  id: 'notes', title: '筆記', icon: '📝',
  render(el) { el.innerHTML = `<div class="card"><b>筆記</b><div id="ntList"></div><button class="btn pri" data-act="nt_add">＋ 新增</button></div>`; },
  refresh(el) { /* 看得到時每 2 秒叫一次；不需要就不要寫 */ },
});
kit.act('nt_add', async () => { const t = await kit.prompt('新增筆記', ''); if (t) { … } });
```
- 放進選單：`kit.GROUPS[0][2].push('notes')`（第一組「主要」），或加新的分組 `kit.GROUPS.unshift(['筆記', '#20c997', ['notes']])`。
- 選單右邊的小數字：`kit.nav.badge('notes', '3')`。
- 換頁：`kit.go('notes')`；按鈕直接寫 `data-go="notes"`。
- 按鈕：`<button data-act="名稱" data-arg="參數">` ＋ `kit.act('名稱', (參數, 元素) => …)`。
- 現成的小元件（`style.css`）：`card`、`row`、`btn`／`btn pri`／`btn sm`／`btn danger`、`chip`、`tag ok/warn`、`srow`（設定一行）、`sw`（開關）、`kv`（兩欄資料）、`jrow`（清單一行）、`bar-p`（進度條）、`grid2`＋`stat`（數字卡片）、`mut`、`small`。
- 彈出：`kit.sheet('標題', 'HTML')`、`await kit.ask('標題', '說明', '確定')`、`await kit.prompt('標題', '預設')`、`kit.toast('訊息')`、上方提示列 `kit.bar('id', 'HTML', 'warn')`／`kit.unbar('id')`。

### 4.2 新的背景工作（會花時間、要排隊的）
```js
kit.kind('scan', {
  icon: '🔍', name: '掃描', cap: 2,              // cap＝同時幾個（讓路時會自動減少）
  async run(data, ctx) {
    for (let i = data.done || 0; i < data.total; i++) {
      await ctx.hold();                         // 暫停、讓路時在這裡等；按「立刻停」會在這裡停
      … 做一小塊 …
      data.done = i + 1;
      ctx.progress(data.done / data.total * 100, `${data.done}/${data.total}`);
      ctx.save(data);                           // 存進度：熱更新、閃退、被系統關掉後，會從這裡接著做
    }
  },
});
kit.jobs.add('scan', '掃描 A 資料夾', { total: 100 });
```
- 後台頁、遠端網頁自動有：暫停／繼續／立刻停／先後順序（↑↓）／取消／重試／進度／停在哪。
- 自動讓路（手機太熱、電量低、App 太吃 CPU、只在充電／Wi-Fi）和 🧪 讓路名單都會自動套用，只要你在迴圈裡 `await ctx.hold()`。
- 等待用 `await ctx.sleep(毫秒)`（可以被「立刻停」打斷）。
- **一定要可以接著做**：`run` 一開始從 `data` 讀進度，不要假設是從頭開始。
- App 畫面關掉也會繼續跑（有常駐通知）。但手機重開機、使用者在系統設定「強制停止」就會停，下次打開 App 自動接回。
- 真的要在 App 完全沒開的時候跑（例如每天半夜同步），那要寫在外殼（`AI_功能庫.md` 第 3 項）。

### 4.3 新的設定
```js
kit.DEFAULTS.scan_depth = 3;
kit.setting({ sec: '掃描', k: 'scan_depth', label: '掃幾層資料夾', type: 'num', min: 1, max: 10, unit: '層', remote: true });
kit.onCfg('scan_depth', (新, 舊) => { … });   // 改了要馬上做什麼（選用）
```
- 讀：`kit.cfg.get('scan_depth')`；存：`kit.cfg.set('scan_depth', 5)`（馬上存檔、自動記 LOG）。
- `type`：`bool`、`num`、`text`、`select`（`opts: [[值, '名稱'], …]`）。
- `remote: true` ＝ 遠端網頁的設定頁也看得到、能改。
- 比較複雜的設定畫面：自己的頁面裡用 `kit.rowHtml(row)` 畫一行，或自己畫。

### 4.4 資料
- **小東西（JSON）**：`kit.data.get('名字', 預設值)`、`kit.data.set('名字', 值)` → `files/Data/名字.json`。
- **資料庫（SQLite）**：
  - 新表：`kit.SCHEMA.push('CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT, t INTEGER)')`
  - 舊表加欄位：`kit.MIGRATE.push(['notes', 'color', 'TEXT DEFAULT ""'])`
  - 查：`const rows = await kit.db.q('SELECT * FROM notes WHERE t > ?', [時間])`
  - 寫：`await kit.db.run('INSERT INTO notes (text, t) VALUES (?, ?)', [文字, Date.now()])` → `{ok, changes, lastId}`
  - 都在外殼的背景執行緒跑，不會卡畫面。一次最多回 5000 列，大量資料要分頁（`LIMIT … OFFSET …`）。
  - 每天自動備份到 `files/Data/db_backup/`，留 7 份。
- **讓使用者選檔案**：`kit.call('pickText', '標籤', 'application/json')` ＋ `kit.onPicked('標籤', r => { r.ok, r.name, r.text })`（文字檔，最大 20 MB）。
- **存到「下載」**：`kit.call('saveDownload', '檔名.txt', 文字, 'text/plain')` → 回傳位置。

### 4.5 網路
- `const r = await kit.http(url, { method: 'POST', body: '…', headers: { … } })` → `{ok, status, body}`。走外殼，不受網頁跨網域限制。
- 要登入的網站：讓使用者**貼上**代碼／cookie（存 `kit.data`），**不要做 App 內登入**，也不要把帳密寫進程式碼。

### 4.6 📡 遠端網頁
- 遠端首頁顯示的東西：`kit.remote.home = async () => ({ cards: [{ title, value, sub }], buttons: [{ label, act }] })`，按鈕：`kit.remote.homeAct = async act => '回給遠端的訊息'`。
- 自己的 API：`kit.remote.api('notes', async (body, query) => ({ ok: true, list: … }))` → 遠端用 `await api('notes', {…})`。
- 要在 `remote.html` 加一個分頁：`TABS` 加 `['notes', '筆記']`，寫 `R.notes = async again => { … }`（每 2 秒用 `again=true` 再叫一次；只想畫一次就開頭寫 `if (again) return`）。
- 設定只要 `remote: true` 就自動出現在遠端設定頁。

### 4.7 實驗功能
1. `kit.LAB_LIST.push(['代號', '名稱', '說明'])`
2. 程式裡用 `kit.lab('代號')` 判斷有沒有打開。
3. 使用者說「變成正式的」再拿掉判斷。

### 4.8 說明、LOG
- 說明頁：`kit.HELP.unshift(['標題', 'HTML'])`。
- 寫 LOG：`kit.log.w('訊息')`；錯誤：`kit.log.err('在做什麼', e)`。

### 4.9 新的原生功能（要換外殼）
1. `Bridge.kt` 加 `@JavascriptInterface fun 名稱(參數: String): String { … }`（參數、回傳只能用字串、數字、布林；複雜的用 JSON 字串）。
   - 會花時間的不要卡住：`Host.io.launch { … ; Host.js("onXxx", 結果JSON) }`，畫面寫 `window.onXxx = s => …`。
   - 要用 Activity 的（選檔、權限）：`Host.act`（可能是 null，畫面沒開時）。
2. 要權限的：AndroidManifest 加 `<uses-permission>`。要新套件：`app/build.gradle.kts` 的 `dependencies`。
3. `python tools/bump.py --shell "加了 xxx"`；畫面用到它的話，`brand.json` 的 `requires_shell` 改成新的外殼版本。
4. 推到 GitHub（雲端打包新 APK，App 會跳「外殼有新版」），或請使用者重跑 `BUILD_AND_INSTALL.bat`。

---

## 5. 版本與更新包規則

- **畫面版本**：`主.次.兩位數`，例如 `0.1.01 → 0.1.02 … 0.1.99 → 0.2.01`（不用 00）。在 `www/version.txt`，用 `tools/bump.py` 加。
- **外殼版本**：`app/build.gradle.kts` 的 `val SHELL = 1`（整數，就是 APK 的 versionCode）。改 Kotlin／Manifest／圖示／套件時用 `tools/bump.py --shell` 加一。**只能變大**，Android 才能直接蓋過去安裝。
- **更新包檔名**：`<前綴>_V<版本>.zip`，例如 `AK_V0.1.02.zip`。前綴在 `brand.json` 的 `prefix`。
- **更新包內容**：
  - `manifest.json`：`{"app": "<id>", "version": "0.1.02", "requires_shell": 1}`
  - `www/`：畫面全部的檔。
  - 只收這些副檔名：`.html .js .css .json .txt .md .png .jpg .jpeg .webp .svg .ico .woff2 .mp3 .wav`（外殼 `Host.kt` 的 `OK_EXT`）。
  - 別的程式的更新包（`app` 不同）、要更新外殼才能用的（`requires_shell` 太大）會被拒絕。
- **每一版的流程**：
  1. 改程式。
  2. `python tools/bump.py "改了什麼" "改了什麼"`（改到外殼加 `--shell`）
  3. `python tools/check.py`（全部 ✔）
  4. 只改畫面：`python tools/pack.py` → 把 `out/` 的 zip 給使用者（有 GitHub 就推上去）。
     改到外殼：推到 GitHub，或給整包請他跑 `BUILD_AND_INSTALL.bat`。

---

## 6. 熱更新要注意的

- `kit.boot()` 最後的 `KIT.ready` 不能拿掉，也不能在它之前卡住（`APP.init` 裡不要做很久的事，要做就丟到背景：不要 `await`）。
- 熱更新＝畫面整個重新載入：JS 的變數都會不見。要留的東西放 `kit.data`／資料庫／`kit.cfg`；目前在哪一頁架子會自己記。
- 背景工作的 `data` 會存起來，重新載入後用它再跑 `run` → 要能接著做。
- `setInterval`、事件都是跟著頁面的，重新載入就沒了，不用自己收。外殼那邊開的東西（遠端伺服器、前景服務）會繼續開著，架子會接回。

---

## 7. 測試（每次都跑，不要跳過）

```
python tools/check.py
```
- 會檢查：
  1. brand.json、版本格式、CHANGELOG 最上面＝目前版本、`requires_shell` ≤ 外殼版本。
  2. JS 語法（kit.js、app.js、html 裡的 script）。要有 node。
  3. 畫面叫的 `KIT.xxx`，外殼 Bridge.kt 都有。
  4. Kotlin 括號數量、AndroidManifest。（**不會**真的編譯 Kotlin：外殼有沒有寫對，要靠雲端打包，或 `BUILD_AND_INSTALL.bat`。改了 Kotlin 一定要推上去看 Actions 是不是綠的。）
  5. build.yml ＝ www/gh_workflow.txt。
  6. 沒有金鑰、密碼。
  7. 打一次更新包，內容對。
  8. **畫面實際跑一次**（有 playwright＋Chrome 才跑）：用 `tools/mock_kit.js` 假外殼，在 Chrome 開 index.html：每一頁都畫得出來、背景工作會跑、暫停會停、重新載入後接回工作、遠端 API、小窗縮放、沒有 JS 錯誤。
- 你新加的功能：在 `check.py` 第 8 項加一段測它（`pg.evaluate('…')`）。
- 在電腦瀏覽器直接開 `www/index.html` 也能預覽畫面（沒有外殼，原生功能都不做事）。

---

## 8. LOG（出問題先看這裡）

手機上 `files/LOG/`，在 App 的 📜 LOG 頁看、匯出。

| 檔案 | 內容 |
|---|---|
| `app_log.txt` | 什麼都記：操作、設定改了什麼、工作開始／結束、錯誤一行摘要 |
| `error_log.txt` | 錯誤＋完整位置（JS 和 Kotlin 都有） |
| `ui_freeze_log.txt` | 畫面卡住幾秒、卡在哪（JS：最後的操作；外殼：主執行緒卡在哪一行） |
| `crash_dump.txt` | 整個閃退時，每條執行緒在做什麼 |
| `update_log.txt` | 更新／熱更新／自動換回的每一步 |
| `web_log.txt` | 📡 遠端網頁的登入、錯誤 |

- 每個檔超過 5 MB 就換新的，留 5 個。
- 匯出：📜 LOG → 📦 匯出最近 7 天（zip，含手機型號、Android 版本、外殼版本）→ 分享給 Claude。

---

## 9. 從空架子開始一個新程式（清單）

1. `python tools/rename.py --id MyTool --name "MyTool" --title "我的新工具" --prefix MT --pkg com.tpc.mytool --port 8671`
   - `--pkg` 每個 App 要不一樣，裝到手機後就不要再改。
   - `--port` 不能跟其他程式撞。
2. 換圖示（選用）：改 `app/src/main/res/drawable/ic_fg.xml`（App 圖示，108×108，圖案放中間 66×66）、`ic_stat.xml`（通知列，白色單色）、`values/colors.xml` 的底色。
3. 把 `app.js` 的首頁換成主要畫面。示範背景工作（`kit.kind('demo'…)`）換成真的工作，或留著當範例。
4. `CHANGELOG.json` 第一筆改成新程式的說明。
5. `python tools/check.py`，然後把整包給使用者。
   - 第一次安裝：他解壓縮後點 `BUILD_AND_INSTALL.bat`（手機用 USB 接電腦、開 USB 偵錯，會自動裝上去；沒接就把桌面的 APK 傳到手機裝）。
   - 之後每一版：給 `out/MT_V0.1.02.zip` 這種更新包。
6. 問他要不要「☁ GitHub 雲端更新」（以後不用傳檔案、不用開電腦，每支手機自己更新）。要的話照第 11 節。

---

## 10. 已經有的功能（不用再做、不要重寫）

- **選單**：左上 ☰ 滑出，分組、點分組標題收合（記住）、右邊數字小標籤。
- **頂列**：📊 效能／🖥 後台／🌙 縮到背景（背景工作照跑）／🏠 封面（不露出內容，點一下回來）。
- **下方狀態列**：暫停中的工作、⚖ 讓路中、App CPU／電池溫度／電量、◐ 深色／淺色、介面大小 70～160%。
- **分屏、小窗**：整個畫面自動等比例縮小（按鈕不會變得比內容大）。支援小米三指分屏。
- **🖥 後台狀態**：總控制（全部暫停／繼續）、每種工作的暫停／繼續／立刻停／↑↓順序／進度／停在哪、自動讓路狀態、最近 80 個工作（取消、重試、清掉）。
- **⚖ 自動讓路**：App CPU 太高、電池太熱、手機過熱、電量低（沒充電）持續 12 秒 → 同時跑的數量減半 → 再 12 秒先不開新的；好了 30 秒一級一級恢復，數量每 10 秒 +1 慢慢加回去。可以設「只在充電時」「只在 Wi-Fi 時」。
- **📊 效能**：App CPU、記憶體、App 用了多少、電池（%、溫度、充電）、手機溫度狀態、儲存空間、網路、最近 10 分鐘曲線。
- **⚙ 設定**：一般（開 App 先顯示封面、閒置回封面、最近畫面不顯示內容、閃退自動重開、卡頓紀錄門檻）、背景（常駐通知、讓路門檻）、手機權限（通知、不要省電、安裝 APK）、📡 遠端網頁、☁ 雲端更新、備份／還原設定。
- **⟳ 版本與更新**：選更新包、檢查內容（是不是這個 App、外殼夠不夠新、怪檔案、版本比較、這版改了什麼）、⚡ 熱更新／下次開 App 才換、換回上一版、回到 APK 內建的畫面、更新紀錄。分享進來的 zip、遠端上傳的也會跳出來。
- **📜 LOG**：看各個 LOG（篩選）、清空、📦 匯出最近 7 天。
- **☁ 雲端更新（GitHub）**：設定精靈（初學者教學）、🔍 測試、自動檢查（開 App 1 分鐘後、之後每 6 小時）、上方「☁ 有新版 → ⬇ 更新／略過」、外殼（APK）更新、SHA-256 驗證。
- **📡 遠端網頁**：PIN 登入（錯 5 次鎖 5 分鐘）、記住登入；首頁、後台（跟手機一樣的總控制）、效能（曲線）、設定（`remote: true` 的）、🧪 實驗開關、LOG、更新（檢查雲端、上傳更新包熱更新）；深色／淺色。顯示這支手機的 IP（含 Tailscale 100.x）。
- **🧪 實驗工作區**（含 ⚖ 讓路名單：挑手機上的 App，在前景時全部背景工作先停）、**📖 使用說明**。
- **防當機**：
  - JS 錯誤只記 LOG，不會讓畫面停；Kotlin 閃退寫 crash_dump。
  - 閃退自動重開（加一則「點這裡重新打開」通知，因為有些手機不讓 App 自己從背景打開）；10 分鐘內第 2 次閃退：重開後背景工作全部先暫停；第 3 次：不再重開。
  - 畫面卡住紀錄（JS 和外殼主執行緒都有）。
  - 熱更新失敗自動換回舊版。
- **只能開一個**（singleTask）；**資料庫每天備份**（留 7 份）。

---

## 11. ☁ GitHub 雲端打包與自動更新

**是什麼**：程式碼放在使用者的 GitHub repo（Public）。每次推到 `main`，GitHub Actions（`.github/workflows/build.yml`）在雲端：
把 repo 名稱寫進 brand.json → `tools/check.py --ci` → 打包 APK（用 Secrets 的簽章鑰匙）→ `tools/make_release.py` 做出下面這些檔 → 放到 Releases（標籤 `v<畫面版本>-s<外殼版本>`）。

| 檔案 | 用途 |
|---|---|
| `<前綴>_V<版本>.zip` | 畫面更新包（跟手動給的一樣），App 按「⬇ 更新」會下載它，然後熱更新 |
| `<id>_V<版本>_S<外殼>.apk` | 安裝檔。第一次安裝、外殼有新版時用 |
| `update.json` | App 讀這個：版本、外殼版本、檔名、SHA-256、更新說明 |

**App 這邊**（kit.js 的 `cloudCheck`、`cloud_go`；設定頁的 `drawCloud`、`wizard`）：
- 去 `https://github.com/<repo>/releases/latest/download/update.json` 看。repo＝設定頁填的，沒填就用 `brand.json` 的 `github`（雲端打包時自動填好）。
- 開 App 1 分鐘後、之後每 6 小時自動看（設定可以關）。
- 外殼版本比較大 → 「☁ 外殼有新版 → ⬇ 更新」：下載 APK → 驗證 SHA-256 → 叫出系統安裝畫面（使用者按「更新」；第一次要允許「安裝不明應用程式」）。
- 只有畫面比較新 → 「☁ 有新版 → ⬇ 更新」：下載更新包 → 驗證 → 熱更新。
- **簽章**：雲端打包用 Secrets 裡的 `KEYSTORE_B64`＋`KEYSTORE_PASS`，跟使用者電腦上 `BUILD_AND_INSTALL.bat` 做的是同一把，手機才能直接蓋過去。沒設定的話雲端會用臨時鑰匙（Actions 會出黃色警告），那個 APK 要先移除舊版才能裝。

**你（AI）要做的**：

第一次設定（使用者說要用 GitHub）：
1. 問他的 GitHub 帳號和 repo 名稱。還沒有：請他在 App 裡跑 ⚙ 設定 → ☁ 雲端更新 → 🧭 設定精靈，或照精靈的內容（`kit.GUIDE`）一步一步教他：註冊 → 建 Public repo、不要勾 README → Settings → Actions → General → Workflow permissions 選 Read and write → Save。
2. 簽章鑰匙：請他先跑過一次 `BUILD_AND_INSTALL.bat`，再點 `MAKE_GITHUB_KEY.bat`，把兩段貼到 repo 的 Secrets（`KEYSTORE_B64`、`KEYSTORE_PASS`）。**鑰匙不能經過你、不能放進 repo**。
3. `python tools/rename.py --github 帳號/repo`。
4. `tools/bump.py` 加一版 → `tools/check.py` 全過。
5. 推上去：
   - **你能用 git 連 GitHub**：把整個開發包（包含 `.github/`，不含 `out/`、`keystore/`、`app/build/`）commit 到 `main`、push。commit 作者用他給你的名字和 email。
   - **你不能連**：給他整包 zip，教他：解壓縮 → repo 頁 → Add file → Upload files → 把資料夾**裡面的東西**全部拖進去 → Commit changes。`.github` 沒傳上去的話：Add file → Create new file → 檔名打 `.github/workflows/build.yml` → 貼上 `www/gh_workflow.txt` 的內容 → Commit。
6. 叫他看 `https://github.com/<repo>/actions`：黃色＝打包中（5～10 分鐘）、綠色＝好了、紅色＝點進去把紅字截圖給你。
7. 好了之後：手機到 repo 的 Releases 下載 `.apk` 安裝（已經用 USB 裝過的，直接在 App 裡 ⚙ 設定 → ☁ 雲端更新 填 repo → 🔍 測試）。

之後每一版：
1. 改程式 → `tools/bump.py "改了什麼"`（改到外殼加 `--shell`）→ `tools/check.py` 全過。
2. 推到 `main`。**版本號沒變，雲端不會重發**（只試打包）。
3. 跟他說：等 5～10 分鐘，App 會跳「☁ 有新版」，或在 ⟳ 版本與更新按「☁ 檢查雲端更新」。也可以照舊給 `out/` 的更新包手動更新（兩種可以混用）。
4. 改了 Kotlin：一定要看 Actions 是綠的（`check.py` 不會編譯 Kotlin）。紅的就請他截圖，或你自己用 `gh run view --log-failed` 看。

規則：
- 改了 `.github/workflows/build.yml` 就複製一份到 `www/gh_workflow.txt`（兩個要一模一樣，`check.py` 會檢查）。
- repo 要 **Public**（App 不用密碼就能下載）。所以**程式碼裡絕對不能放密碼、金鑰、token、個人資料**。
  想要程式碼 Private：另外開一個 Public 的 repo 放更新檔（建的時候勾 Add a README），原 repo 設 Secret `RELEASE_TOKEN`（能寫那個 repo 的 token）和 Variable `RELEASE_REPO`（那個 repo），build.yml 開頭有寫。
- 不要刪 Releases 上舊的版本（別支手機可能還在下載）。
- 推到 `main` 以外的分支只會試打包，不會發佈（適合先試外殼改得對不對）。

---

## 12. 功能庫（`AI_功能庫.md`）

做過、調過、證明有用的功能做法。**預設都沒有開、大部分也還沒寫進程式**，只是做法說明。
使用者要的東西用得到就照著做；你覺得某一項對他的程式很有幫助，可以做成 🧪 實驗功能（預設關）並跟他說一句。
