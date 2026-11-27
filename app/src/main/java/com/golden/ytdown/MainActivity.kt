package com.golden.ytdown

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import android.os.Environment
import android.os.PowerManager
import android.os.StatFs
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.provider.Settings
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.documentfile.provider.DocumentFile
import com.yausername.youtubedl_android.YoutubeDL
import kotlinx.coroutines.*
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.zip.ZipInputStream

/**
 * 外殼 YTD_V0.1.06（最後一次大改）：
 * 下載交給 Engine（畫面關了也會繼續）；這裡只負責畫面、權限、檔案、更新。
 * 畫面在 www（assets 內建；熱更新包放 files/www，版本比較新就用它）。
 */
class MainActivity : AppCompatActivity() {
    companion object {
        /** 外殼版本直接讀 APK 的 versionName（build.gradle.kts），不再寫死，才不會跟實際裝的對不上 */
        val SHELL: String = BuildConfig.VERSION_NAME
        const val ACTION_PASTE = "com.golden.ytdown.PASTE"
        const val ACTION_BROWSE = "com.golden.ytdown.BROWSE"
        const val ACTION_SPLIT = "com.golden.ytdown.SPLIT"
        const val EXTRA_BG = "ytd_bg"      // 從分享叫起來的：收完網址自己退到後面
    }

    private lateinit var web: WebView
    private val ui = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var pending: Pair<String, String>? = null   // 頁面載好前收到的分享／捷徑
    private var pickTag = ""

    private val pickZip = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri == null) { js("onUpd", jo("ok" to false, "msg" to "沒選檔案")); return@registerForActivityResult }
        ui.launch(Dispatchers.IO) {
            val r = try { contentResolver.openInputStream(uri)!!.use { installWww(it.readBytes()) } } catch (e: Exception) { "失敗：" + e.message }
            js("onUpd", jo("ok" to r.startsWith("OK"), "msg" to r))
        }
    }
    private val pickTree = registerForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri: Uri? ->
        if (uri == null) { js("onTree", jo("ok" to false)); return@registerForActivityResult }
        try { contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION) } catch (_: Exception) {}
        val name = DocumentFile.fromTreeUri(this, uri)?.name ?: uri.lastPathSegment ?: "選的資料夾"
        js("onTree", jo("ok" to true, "uri" to uri.toString(), "name" to name))
    }
    private val pickAny = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        val tag = pickTag
        if (uri == null) { js("onPicked", jo("tag" to tag, "ok" to false)); return@registerForActivityResult }
        ui.launch(Dispatchers.IO) {
            val res = try {
                val name = DocumentFile.fromSingleUri(this@MainActivity, uri)?.name ?: ""
                val bytes = contentResolver.openInputStream(uri)!!.use { it.readBytes() }
                if (bytes.size > 5_000_000) throw Exception("檔案太大")
                jo("tag" to tag, "ok" to true, "name" to name, "uri" to uri.toString(), "text" to String(bytes, Charsets.UTF_8))
            } catch (e: Exception) { jo("tag" to tag, "ok" to false, "msg" to (e.message ?: "")) }
            js("onPicked", res)
        }
    }
    private val notifPerm = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        setBars("#0b0c0e", false)
        web = WebView(this); setContentView(web)
        web.setBackgroundColor(Color.parseColor("#0b0c0e"))
        web.settings.javaScriptEnabled = true; web.settings.domStorageEnabled = true
        web.settings.allowFileAccess = true; web.settings.allowContentAccess = true   // 內建播放器要讀下載好的檔
        web.settings.mediaPlaybackRequiresUserGesture = false
        web.addJavascriptInterface(Bridge(), "YTD")
        web.webViewClient = object : WebViewClient() {
            override fun onPageFinished(v: WebView?, u: String?) { pending?.let { js(it.first, it.second); pending = null } }
            override fun shouldOverrideUrlLoading(v: WebView?, req: WebResourceRequest?): Boolean {
                val u = req?.url ?: return false
                if (u.scheme == "http" || u.scheme == "https") { try { startActivity(Intent(Intent.ACTION_VIEW, u)) } catch (_: Exception) {}; return true }
                return false
            }
        }
        Engine.sink = { fn, arg -> js(fn, arg) }
        pending = incoming(intent)
        loadUi()
    }

    override fun onResume() { super.onResume(); Engine.sink = { fn, arg -> js(fn, arg) }; js("onResume", "") }
    /** 小窗、分屏時 App 一直是「開著」的，被點到才拿到焦點；Android 10 起只有拿到焦點才讀得到剪貼簿 */
    override fun onWindowFocusChanged(hasFocus: Boolean) { super.onWindowFocusChanged(hasFocus); if (hasFocus) js("onFocusWin", "") }
    override fun onNewIntent(i: Intent) { super.onNewIntent(i); setIntent(i); incoming(i)?.let { js(it.first, it.second) } }
    @Deprecated("WebView 先決定要不要處理返回鍵")
    override fun onBackPressed() { web.evaluateJavascript("window.onBack&&onBack()") { r -> if (r != "true") super.onBackPressed() } }
    override fun onDestroy() { Engine.sink = null; ui.cancel(); super.onDestroy() }   // 下載不停，交給 Engine

    /** 分享進來的文字、長按圖示的捷徑 */
    private fun incoming(i: Intent?): Pair<String, String>? = when (i?.action) {
        Intent.ACTION_SEND -> i.getStringExtra(Intent.EXTRA_TEXT)?.let { (if (i.getBooleanExtra(EXTRA_BG, false)) "onShareBg" else "onShare") to it }
        ACTION_PASTE -> "onShortcut" to "paste"
        ACTION_BROWSE -> "onShortcut" to "browse"
        ACTION_SPLIT -> "onShortcut" to "split"
        else -> null
    }

    private fun setBars(hex: String, light: Boolean) {
        try {
            val c = Color.parseColor(hex)
            @Suppress("DEPRECATION") run { window.statusBarColor = c; window.navigationBarColor = c }
            val ctl = WindowInsetsControllerCompat(window, window.decorView)
            ctl.isAppearanceLightStatusBars = light; ctl.isAppearanceLightNavigationBars = light
        } catch (_: Exception) {}
    }

    // ---------- 熱更新：www 包
    private fun wwwDir() = File(filesDir, "www")
    private fun verOf(s: String?) = (s ?: "").filter { it.isDigit() }.toLongOrNull() ?: 0L
    private fun builtinVer() = try { assets.open("www/version.txt").bufferedReader().readText().trim() } catch (_: Exception) { "" }
    private fun liveVer(): String { val f = File(wwwDir(), "version.txt"); return if (f.exists()) f.readText().trim() else "" }
    private fun loadUi() {
        val useLive = File(wwwDir(), "index.html").exists() && verOf(liveVer()) > verOf(builtinVer())
        web.loadUrl(if (useLive) "file://" + File(wwwDir(), "index.html").absolutePath else "file:///android_asset/www/index.html")
    }
    private fun installWww(bytes: ByteArray): String {
        val tmp = File(filesDir, "www_new"); tmp.deleteRecursively(); tmp.mkdirs()
        ZipInputStream(bytes.inputStream()).use { z ->
            var e = z.nextEntry
            while (e != null) {
                val raw = e.name.replace('\\', '/'); val name = raw.substringAfter("www/", raw)
                if (name.isNotEmpty()) {
                    val out = File(tmp, name)
                    if (!out.canonicalPath.startsWith(tmp.canonicalPath)) throw SecurityException("壞掉的路徑")
                    if (e.isDirectory) out.mkdirs() else { out.parentFile?.mkdirs(); out.outputStream().use { z.copyTo(it) } }
                }
                e = z.nextEntry
            }
        }
        val v = File(tmp, "version.txt")
        if (!File(tmp, "index.html").exists() || !v.exists()) { tmp.deleteRecursively(); return "這不是 YT Download 的更新包（少 index.html 或 version.txt）" }
        val nv = v.readText().trim(); val old = File(filesDir, "www_old")
        old.deleteRecursively(); if (wwwDir().exists()) wwwDir().renameTo(old)
        if (!tmp.renameTo(wwwDir())) { old.renameTo(wwwDir()); return "換檔失敗，舊版保留" }
        old.deleteRecursively()
        return "OK 已更新到 $nv"
    }

    private fun httpBytes(url: String, max: Int): Pair<Int, ByteArray> {
        val c = URL(url).openConnection() as HttpURLConnection
        c.connectTimeout = 15000; c.readTimeout = 60000; c.instanceFollowRedirects = true
        c.setRequestProperty("User-Agent", "YTDownload/$SHELL")
        val code = c.responseCode
        val st = if (code in 200..299) c.inputStream else c.errorStream
        val bytes = st?.use { s -> val o = java.io.ByteArrayOutputStream(); val buf = ByteArray(65536); var n: Int
            while (s.read(buf).also { n = it } > 0) { o.write(buf, 0, n); if (o.size() > max) throw Exception("檔案太大") }; o.toByteArray() } ?: ByteArray(0)
        c.disconnect(); return code to bytes
    }

    // ---------- 給網頁叫的
    private fun jo(vararg p: Pair<String, Any?>) = JSONObject().apply { p.forEach { put(it.first, it.second) } }.toString()
    private fun js(fn: String, arg: String) {
        val a = JSONObject.quote(arg)
        runOnUiThread { if (::web.isInitialized) web.evaluateJavascript("window.$fn&&$fn($a)", null) }
    }

    inner class Bridge {
        // ---- 版本、狀態
        @JavascriptInterface fun shellVer() = SHELL
        @JavascriptInterface fun uiVer() = liveVer().ifEmpty { builtinVer() }
        @JavascriptInterface fun coreState() = jo("ready" to App.ready, "err" to App.initErr,
            "ytdlp" to (try { YoutubeDL.getInstance().versionName(this@MainActivity) } catch (e: Exception) { "" }),
            "js" to File(applicationInfo.nativeLibraryDir, "libqjs.so").exists(), "aria2" to App.aria2)
        @JavascriptInterface fun env() = jo("sdk" to Build.VERSION.SDK_INT, "model" to Build.MODEL, "abi" to (Build.SUPPORTED_ABIS.firstOrNull() ?: ""),
            "shell" to SHELL, "pkg" to packageName,
            "batteryFree" to (getSystemService(Context.POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(packageName),
            "canInstall" to (Build.VERSION.SDK_INT < 26 || packageManager.canRequestPackageInstalls()),
            "notify" to (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED))
        @JavascriptInterface fun netInfo(): String {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val caps = cm.getNetworkCapabilities(cm.activeNetwork)
            return jo("online" to (caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true),
                "wifi" to (caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true || caps?.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) == true),
                "metered" to cm.isActiveNetworkMetered)
        }
        @JavascriptInterface fun freeSpace(): Long = try { StatFs(Environment.getExternalStorageDirectory().path).availableBytes } catch (_: Exception) { -1L }

        // ---- 下載引擎（交給 Engine，畫面關掉也會繼續）
        @JavascriptInterface fun job(spec: String) = Engine.job(spec)
        @JavascriptInterface fun cancel(id: String) = Engine.cancel(id)
        @JavascriptInterface fun fetchJob(spec: String) = Engine.fetchJob(spec)
        // ---- Telegram（用自己的帳號登入）
        @JavascriptInterface fun tgInfo(): String = Tg.info()
        @JavascriptInterface fun tgStart(apiId: String, apiHash: String) = Tg.start(apiId.trim().toIntOrNull() ?: 0, apiHash.trim())
        @JavascriptInterface fun tgPhone(p: String) = Tg.phone(p)
        @JavascriptInterface fun tgCode(c: String) = Tg.code(c)
        @JavascriptInterface fun tgPassword(p: String) = Tg.password(p)
        @JavascriptInterface fun tgLogout() = Tg.forget()
        @JavascriptInterface fun tgJob(spec: String) = Tg.job(spec)
        @JavascriptInterface fun probe(id: String, url: String, spec: String) = Engine.probe(id, url, spec)
        @JavascriptInterface fun exec(id: String, url: String, spec: String) = Engine.exec(id, url, spec)
        @JavascriptInterface fun updateCoreCh(ch: String) = Engine.updateCore(ch)
        @JavascriptInterface fun jobsState() = Engine.state()
        @JavascriptInterface fun storage() = Engine.usage()
        @JavascriptInterface fun sweep(): Long = Engine.sweep()
        @JavascriptInterface fun drain() = Engine.drain()
        @JavascriptInterface fun fgText(t: String) { Engine.fgText = t.take(120); if (Engine.count() > 0) Notify.updateOngoing(this@MainActivity, Engine.count(), Engine.fgText) }

        // ---- 登入、瀏覽
        @JavascriptInterface fun browse(url: String, mode: String, key: String, domains: String) {
            runOnUiThread {
                startActivity(Intent(this@MainActivity, BrowserActivity::class.java)
                    .putExtra("url", url).putExtra("mode", mode).putExtra("key", key).putExtra("domains", domains))
            }
        }
        @JavascriptInterface fun cookieInfo(key: String): String { val f = Engine.cookieFile(key); return jo("has" to (f.exists() && f.length() > 0), "time" to (if (f.exists()) f.lastModified() else 0L)) }
        @JavascriptInterface fun saveCookies(key: String, text: String): Boolean = try {
            if (!text.contains("\t")) false else { Engine.cookieFile(key).writeText(text); true }
        } catch (_: Exception) { false }
        @JavascriptInterface fun clearCookies(key: String) {
            Engine.cookieFile(key).delete()
            if (key == "*") { Engine.cookieDir().deleteRecursively(); android.webkit.CookieManager.getInstance().removeAllCookies(null) }
        }

        // ---- 檔案
        @JavascriptInterface fun pickTree() { runOnUiThread { try { pickTree.launch(null) } catch (e: Exception) { js("onToast", "打不開資料夾選擇器") } } }
        @JavascriptInterface fun treeOk(uri: String): Boolean = try { DocumentFile.fromTreeUri(this@MainActivity, Uri.parse(uri))?.canWrite() == true } catch (_: Exception) { false }
        @JavascriptInterface fun pickFile(mime: String, tag: String) { pickTag = tag; runOnUiThread { try { pickAny.launch(mime.ifEmpty { "*/*" }) } catch (_: Exception) {} } }
        @JavascriptInterface fun openFile(uri: String, mime: String) {
            runOnUiThread {
                try {
                    val u = Uri.parse(uri)
                    val i = Intent(Intent.ACTION_VIEW).setDataAndType(u, mime.ifEmpty { contentResolver.getType(u) ?: "*/*" }).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    startActivity(Intent.createChooser(i, "用什麼打開"))
                } catch (e: Exception) { js("onToast", "打不開：檔案可能已被刪除或搬走") }
            }
        }
        @JavascriptInterface fun shareFile(uri: String, mime: String) {
            runOnUiThread {
                try {
                    val i = Intent(Intent.ACTION_SEND).setType(mime.ifEmpty { "*/*" }).putExtra(Intent.EXTRA_STREAM, Uri.parse(uri)).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    startActivity(Intent.createChooser(i, "分享到"))
                } catch (e: Exception) { js("onToast", "分享失敗：檔案可能已被刪除或搬走") }
            }
        }
        @JavascriptInterface fun fileExists(uri: String): Boolean = try {
            contentResolver.openFileDescriptor(Uri.parse(uri), "r")?.use { true } ?: false
        } catch (_: Exception) { false }
        @JavascriptInterface fun deleteFile(uri: String): Boolean = try {
            val u = Uri.parse(uri)
            if (DocumentsContract.isDocumentUri(this@MainActivity, u)) DocumentsContract.deleteDocument(contentResolver, u)
            else contentResolver.delete(u, null, null) > 0
        } catch (_: Exception) { false }
        @JavascriptInterface fun openFolder(treeUri: String) {
            runOnUiThread {
                val tries: List<() -> Intent?> = listOf(
                    { if (treeUri.isNotEmpty()) Intent(Intent.ACTION_VIEW).setDataAndType(DocumentsContract.buildDocumentUriUsingTree(Uri.parse(treeUri), DocumentsContract.getTreeDocumentId(Uri.parse(treeUri))), DocumentsContract.Document.MIME_TYPE_DIR) else null },
                    { Intent(Intent.ACTION_VIEW).setDataAndType(Uri.parse("content://com.android.externalstorage.documents/document/primary%3ADownload%2FYTDown"), DocumentsContract.Document.MIME_TYPE_DIR) },
                    { Intent(DownloadManager.ACTION_VIEW_DOWNLOADS) })
                for (t in tries) { try { val i = t() ?: continue; startActivity(i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)); return@runOnUiThread } catch (_: Exception) {} }
                js("onToast", "打不開資料夾，請用檔案管理 App 到「下載/YTDown」")
            }
        }
        /** 匯出文字（設定備份、紀錄）到 下載/YTDown */
        @JavascriptInterface fun exportText(name: String, text: String): String = try {
            val safe = name.replace(Regex("[\\\\/:*?\"<>|]"), "_")
            if (Build.VERSION.SDK_INT >= 29) {
                val cv = ContentValues().apply { put(MediaStore.Downloads.DISPLAY_NAME, safe); put(MediaStore.Downloads.MIME_TYPE, "application/json"); put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/YTDown") }
                val u = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv)!!
                contentResolver.openOutputStream(u)!!.use { it.write(text.toByteArray()) }
            } else {
                val d = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "YTDown"); d.mkdirs(); File(d, safe).writeText(text)
            }
            "下載/YTDown/$safe"
        } catch (e: Exception) { "" }

        // ---- 一般
        @JavascriptInterface fun paste(): String {
            val cm = getSystemService(CLIPBOARD_SERVICE) as android.content.ClipboardManager
            return try { cm.primaryClip?.getItemAt(0)?.coerceToText(this@MainActivity)?.toString() ?: "" } catch (_: Exception) { "" }
        }
        @JavascriptInterface fun copy(t: String) { (getSystemService(CLIPBOARD_SERVICE) as android.content.ClipboardManager).setPrimaryClip(android.content.ClipData.newPlainText("YTD", t)) }
        @JavascriptInterface fun bars(hex: String, light: Boolean) { runOnUiThread { setBars(hex, light) } }
        @JavascriptInterface fun vibrate(ms: Int) {
            try { val v = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator; v.vibrate(VibrationEffect.createOneShot(ms.toLong().coerceIn(10, 500), VibrationEffect.DEFAULT_AMPLITUDE)) } catch (_: Exception) {}
        }
        @JavascriptInterface fun askNotify() {
            runOnUiThread {
                if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
                    notifPerm.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
        @SuppressLint("BatteryLife")
        @JavascriptInterface fun askBatteryExempt() {
            runOnUiThread {
                try { startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName"))) }
                catch (_: Exception) { try { startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)) } catch (_: Exception) {} }
            }
        }
        @JavascriptInterface fun appSettings() { runOnUiThread { try { startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))) } catch (_: Exception) {} } }
        @JavascriptInterface fun openUrl(u: String) { runOnUiThread { try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(u))) } catch (_: Exception) {} } }

        /** 萬用網路讀取（不受網頁跨網域限制）→ onHttp {id,ok,status,body} */
        @JavascriptInterface fun httpGet(id: String, url: String) {
            ui.launch(Dispatchers.IO) {
                val r = try { val (code, b) = httpBytes(url, 2_000_000); jo("id" to id, "ok" to (code in 200..299), "status" to code, "body" to String(b, Charsets.UTF_8)) }
                catch (e: Exception) { jo("id" to id, "ok" to false, "status" to 0, "body" to (e.message ?: "")) }
                js("onHttp", r)
            }
        }

        /** 萬用網路請求：spec={url,method,headers:{},body,cookies:"登入資料名稱"} → onHttp {id,ok,status,body} */
        @JavascriptInterface fun http(id: String, spec: String) {
            ui.launch(Dispatchers.IO) {
                val r = try {
                    val o = JSONObject(spec)
                    val (code, body) = Net.text(o.getString("url"), o.optString("method", "GET"), o.optJSONObject("headers"), o.optString("cookies", ""), if (o.has("body")) o.optString("body") else null, 4_000_000)
                    jo("id" to id, "ok" to (code in 200..299), "status" to code, "body" to body)
                } catch (e: Exception) { jo("id" to id, "ok" to false, "status" to 0, "body" to (e.message ?: "")) }
                js("onHttp", r)
            }
        }

        // ---- 內建播放器用：轉向、螢幕不關、全螢幕
        @JavascriptInterface fun orient(mode: String) {
            runOnUiThread {
                // 分屏／小窗時不強制轉向，不然小米會把分屏退出或變成黑邊
                if (Build.VERSION.SDK_INT >= 24 && isInMultiWindowMode) { requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED; return@runOnUiThread }
                requestedOrientation = when (mode) {
                    "land" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                    "port" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT
                    else -> ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                }
            }
        }
        @JavascriptInterface fun keepOn(on: Boolean) {
            runOnUiThread { if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
        }
        @JavascriptInterface fun immersive(on: Boolean) {
            runOnUiThread {
                try {
                    val ctl = WindowInsetsControllerCompat(window, window.decorView)
                    if (on) { ctl.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE; ctl.hide(WindowInsetsCompat.Type.systemBars()) }
                    else ctl.show(WindowInsetsCompat.Type.systemBars())
                } catch (_: Exception) {}
            }
        }

        // ---- 更新
        @JavascriptInterface fun pickUpdate() { runOnUiThread { pickZip.launch("application/zip") } }
        @JavascriptInterface fun checkUpdate(jsonUrl: String) {
            ui.launch(Dispatchers.IO) {
                val r = try {
                    val j = JSONObject(String(httpBytes(jsonUrl, 1_000_000).second)); val nv = j.getString("ver")
                    if (verOf(nv) <= verOf(uiVer())) "已經是最新（$nv）"
                    else installWww(httpBytes(URL(URL(jsonUrl), j.getString("zip")).toString(), 30_000_000).second)
                } catch (e: Exception) { "失敗：" + e.message }
                js("onUpd", jo("ok" to r.startsWith("OK"), "msg" to r))
            }
        }
        /** 外殼自我更新：下載 APK 後叫出系統安裝畫面（同一把鑰匙簽的才能蓋過去）→ onApk {ok,msg} */
        @JavascriptInterface fun installApk(url: String) {
            if (Build.VERSION.SDK_INT >= 26 && !packageManager.canRequestPackageInstalls()) {
                runOnUiThread { try { startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:$packageName"))) } catch (_: Exception) {} }
                js("onApk", jo("ok" to false, "msg" to "請先允許「安裝不明應用程式」，再按一次更新")); return
            }
            ui.launch(Dispatchers.IO) {
                try {
                    val f = File(cacheDir, "update/ytd_update.apk"); f.parentFile?.mkdirs(); f.delete()
                    var last = 0L
                    js("onApk", jo("ok" to true, "msg" to "下載新外殼中…", "stage" to "dl", "pct" to 0))
                    Net.download(url, null, "", f, { true }) { done, total ->
                        val now = System.currentTimeMillis()
                        if (now - last > 500) {
                            last = now
                            val pct = if (total > 0) (done * 100 / total).toInt() else -1
                            js("onApk", jo("ok" to true, "stage" to "dl", "pct" to pct, "msg" to ("下載新外殼中 " + (if (pct >= 0) "$pct%" else "${done / 1048576} MB"))))
                        }
                    }
                    if (f.length() < 100_000) throw Exception("下載到的檔案不對")
                    val u = FileProvider.getUriForFile(this@MainActivity, "$packageName.files", f)
                    withContext(Dispatchers.Main) {
                        startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(u, "application/vnd.android.package-archive")
                            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK))
                    }
                    js("onApk", jo("ok" to true, "msg" to "下載好了，請在安裝畫面按「更新」", "stage" to "install"))
                } catch (e: Exception) { js("onApk", jo("ok" to false, "msg" to "更新失敗：" + (e.message ?: ""))) }
            }
        }
        // ---- 🪟 分屏：請系統把另一個 App 開在旁邊（FLAG_ACTIVITY_LAUNCH_ADJACENT）。平板大螢幕上，系統收到會直接進分屏
        @JavascriptInterface fun launchApps(): String {
            val a = org.json.JSONArray()
            try {
                val pm = packageManager
                pm.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0)
                    .map { it.activityInfo.packageName to it.loadLabel(pm).toString() }
                    .distinctBy { it.first }.filter { it.first != packageName }.sortedBy { it.second }
                    .forEach { a.put(JSONObject().put("pkg", it.first).put("name", it.second)) }
            } catch (_: Exception) {}
            return a.toString()
        }
        @JavascriptInterface fun splitWith(pkg: String): String {
            val i = packageManager.getLaunchIntentForPackage(pkg) ?: return "手機上找不到這個 App"
            i.addFlags(Intent.FLAG_ACTIVITY_LAUNCH_ADJACENT or Intent.FLAG_ACTIVITY_NEW_TASK)
            runOnUiThread { try { startActivity(i) } catch (e: Exception) { js("onToast", "開不起來：" + (e.message ?: "")) } }
            return "OK"
        }
        @JavascriptInterface fun multiWin(): Boolean = Build.VERSION.SDK_INT >= 24 && isInMultiWindowMode
        /** 背景分享收完了：退到後面，回到原本的 App */
        @JavascriptInterface fun bgDone() { runOnUiThread { if (intent?.getBooleanExtra(EXTRA_BG, false) == true) { intent.removeExtra(EXTRA_BG); moveTaskToBack(true) } } }
        /** 不在前面時也看得到的提示（例如背景分享進來的網址已經下載過了） */
        @JavascriptInterface fun toastTop(msg: String) { runOnUiThread { Toast.makeText(applicationContext, msg.take(120), Toast.LENGTH_SHORT).show() } }
        @JavascriptInterface fun resetUi() { runOnUiThread { wwwDir().deleteRecursively(); loadUi() } }
        @JavascriptInterface fun reload() { runOnUiThread { loadUi() } }
    }
}
