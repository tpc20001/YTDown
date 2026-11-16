# AndroidKit 程式

用 AndroidKit 空架子做的 Android App（Kotlin 外殼＋WebView 畫面，可以熱更新）。

## 安裝
到右邊的 **Releases** → 下載最新的 `.apk` → 在手機上點開安裝。
第一次會問「要允許安裝不明應用程式嗎」：允許瀏覽器（或檔案管理）安裝就好。

## 更新
App 會自己檢查（開 App 1 分鐘後、之後每 6 小時），有新版上方會跳「☁ 有新版」→ 按「⬇ 更新」。
只有畫面改了：直接熱更新，不用重裝。外殼改了：會叫出系統安裝畫面，按「更新」。

## 開發（給 AI）
先讀 `AI_開發指南.md`（第 11 節：GitHub 雲端打包與自動更新）和 `AI_功能庫.md`。
推到 `main` 就會自動打包；版本號（`app/src/main/assets/www/version.txt`、`app/build.gradle.kts` 的 `SHELL`）沒變就不會重發。
