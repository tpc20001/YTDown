# YT Download

個人用的 Android 影片下載器（YouTube、TikTok、Bilibili、抖音、X、IG、FB、小紅書…），核心是 yt-dlp（youtubedl-android 0.18.1，內建 QuickJS）。

- 外殼：Kotlin（`app/src/main/java`），下載引擎、登入、存檔、通知、自我更新
- 畫面：`app/src/main/assets/www`，可以用熱更新包單獨更新
- 打包：推到 `main` 會由 GitHub Actions 自動打包，放在 Releases（APK、畫面更新包、update.json）
- 本機打包：Windows 點 `BUILD_APK.bat`

使用說明見 `說明_先看這個.txt`。
