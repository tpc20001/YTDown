package com.androidkit.shell

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.MutableContextWrapper
import android.graphics.Color
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.zip.ZipFile

/**
 * 畫面宿主：整個 App 只有一個 WebView，放在這裡（不是放在 Activity 裡）。
 * 畫面關掉（返回鍵、滑掉）WebView 還在，畫面裡的背景工作照跑；再打開就接回同一個。
 *
 * 畫面＝www 資料夾：內建在 APK 的 assets/www；熱更新包裝到 files/www，版本比較新就用它。
 * 換新版後 15 秒內畫面沒有回報「開好了」（KIT.ready），就自動換回舊版。
 */
object Host {
    private var web: WebView? = null
    private var wrap: MutableContextWrapper? = null
    @Volatile var act: MainActivity? = null
    val io = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    val main = Handler(Looper.getMainLooper())
    private var probation: Runnable? = null
    private val ctx: Context get() = App.ctx

    // ---------- WebView
    @SuppressLint("SetJavaScriptEnabled")
    private fun create(base: Context): WebView {
        val w0 = MutableContextWrapper(base); wrap = w0
        val w = WebView(w0)
        w.setBackgroundColor(Color.parseColor("#16181d"))
        w.settings.javaScriptEnabled = true
        w.settings.domStorageEnabled = true
        w.settings.allowFileAccess = true
        w.settings.allowContentAccess = true
        w.settings.mediaPlaybackRequiresUserGesture = false
        w.settings.textZoom = 100          // 介面大小由畫面自己控制，不跟系統字體走
        w.addJavascriptInterface(Bridge(), "KIT")
        w.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(v: WebView?, req: WebResourceRequest?): Boolean {
                val u = req?.url ?: return false
                if (u.scheme == "http" || u.scheme == "https") { openUrl(u.toString()); return true }
                return false
            }
        }
        w.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(m: ConsoleMessage?): Boolean {
                if (m != null && m.messageLevel() == ConsoleMessage.MessageLevel.ERROR)
                    KLog.write("error_log.txt", "畫面 JS 錯誤：${m.message()}（${m.sourceId()?.substringAfterLast('/')}:${m.lineNumber()}）")
                return true
            }
        }
        web = w
        loadUi()
        return w
    }

    fun attach(a: MainActivity, parent: ViewGroup) {
        act = a
        val w = web ?: create(a)
        wrap?.baseContext = a
        (w.parent as? ViewGroup)?.removeView(w)
        parent.addView(w, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        w.onResume()
    }

    fun detach(a: MainActivity) {
        if (act === a) { act = null; wrap?.baseContext = ctx }
        web?.let { (it.parent as? ViewGroup)?.removeView(it) }
    }

    fun alive() = web != null

    /** 返回鍵：畫面的 onBack() 回 true＝畫面自己處理了 */
    fun back(cb: (Boolean) -> Unit) {
        val w = web ?: return cb(false)
        main.post { w.evaluateJavascript("window.onBack?onBack():false") { r -> cb(r == "true") } }
    }

    /** 畫面還沒開好之前送的事件先排著，開好（ready）再一次送 */
    @Volatile private var pageReady = false
    private val queued = ArrayList<String>()

    /** 叫畫面裡的 window.fn(arg)（arg 是字串，畫面自己 JSON.parse） */
    fun js(fn: String, arg: String) {
        val code = "window.$fn&&$fn(${JSONObject.quote(arg)})"
        main.post { web?.evaluateJavascript(code, null) }
    }

    /** 從外面進來的事件（分享進來的更新包…）：畫面還沒開好就先排著，開好再送 */
    fun jsLater(fn: String, arg: String) {
        val code = "window.$fn&&$fn(${JSONObject.quote(arg)})"
        synchronized(queued) { if (!pageReady) { if (queued.size < 50) queued.add(code); return } }
        main.post { web?.evaluateJavascript(code, null) }
    }

    fun openUrl(u: String) {
        try {
            val i = Intent(Intent.ACTION_VIEW, Uri.parse(u)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            (act ?: ctx).startActivity(i)
        } catch (e: Exception) { KLog.err("開網址", e) }
    }

    // ---------- 畫面版本（版本號像 0.1.02，最後一段兩位數）
    fun wwwDir() = File(ctx.filesDir, "www")
    private fun prevDir() = File(ctx.filesDir, "www_prev")
    fun verNum(v: String?): Long {
        val p = (v ?: "").trim().trimStart('V', 'v').split('.').map { s -> s.filter { it.isDigit() }.toLongOrNull() ?: 0L }
        return (p.getOrElse(0) { 0L }) * 1_000_000 + (p.getOrElse(1) { 0L }) * 1_000 + (p.getOrElse(2) { 0L })
    }
    fun builtinVer(): String = try { ctx.assets.open("www/version.txt").bufferedReader().readText().trim() } catch (_: Exception) { "" }
    fun liveVer(): String = File(wwwDir(), "version.txt").let { if (it.exists()) it.readText().trim() else "" }
    fun usingLive() = File(wwwDir(), "index.html").exists() && verNum(liveVer()) > verNum(builtinVer())
    fun activeVer() = if (usingLive()) liveVer() else builtinVer()

    /** 讀目前在用的畫面裡的檔（brand.json、CHANGELOG.json、remote.html…） */
    fun readWww(name: String): ByteArray? {
        if (name.contains("..")) return null
        return try {
            if (usingLive()) File(wwwDir(), name).takeIf { it.isFile }?.readBytes()
            else ctx.assets.open("www/$name").use { it.readBytes() }
        } catch (_: Exception) { null }
    }
    fun brand(): JSONObject = try { JSONObject(String(readWww("brand.json") ?: ByteArray(0))) } catch (_: Exception) { JSONObject() }

    fun loadUi() {
        val w = web ?: return
        val p = App.prefs(); val pend = p.getString("probation", "") ?: ""
        if (pend.isNotEmpty()) {
            val tries = p.getInt("probation_tries", 0)
            if (tries >= 1) { rollback("換到 $pend 之後沒有成功開起來"); return }
            p.edit().putInt("probation_tries", tries + 1).apply()
            armProbation()
        }
        synchronized(queued) { pageReady = false }
        val url = if (usingLive()) "file://" + File(wwwDir(), "index.html").absolutePath else "file:///android_asset/www/index.html"
        main.post { w.loadUrl(url) }
    }

    private fun armProbation() {
        probation?.let { main.removeCallbacks(it) }
        val r = Runnable { rollback("新版 15 秒內沒有開好") }
        probation = r; main.postDelayed(r, 15_000)
    }

    /** 畫面開好了（kit.js 啟動完成時叫） */
    fun ready(ver: String) {
        probation?.let { main.removeCallbacks(it) }; probation = null
        val q = synchronized(queued) { pageReady = true; ArrayList(queued).also { queued.clear() } }
        main.post { q.forEach { web?.evaluateJavascript(it, null) } }
        val p = App.prefs(); val pend = p.getString("probation", "") ?: ""
        if (pend.isNotEmpty()) {
            p.edit().remove("probation").remove("probation_tries").apply()
            KLog.upd("新版 $ver 開好了（上一版留著，可以在「版本與更新」換回）")
        }
    }

    fun hasPrev() = File(prevDir(), "index.html").exists()
    fun prevVer(): String = File(prevDir(), "version.txt").let { if (it.exists()) it.readText().trim() else "" }

    fun rollback(reason: String) {
        probation?.let { main.removeCallbacks(it) }; probation = null
        App.prefs().edit().remove("probation").remove("probation_tries").apply()
        val bad = activeVer()
        wwwDir().deleteRecursively()
        if (prevDir().exists()) prevDir().renameTo(wwwDir())
        val msg = "新版 $bad 開不起來（$reason），已經自動換回 ${activeVer()}"
        KLog.upd("⚠ $msg"); notice(msg)
        loadUi()
    }

    fun notice(msg: String) {
        val p = App.prefs(); val old = p.getString("notice", "") ?: ""
        p.edit().putString("notice", (if (old.isEmpty()) "" else "$old\n") + msg).apply()
    }
    fun takeNotice(): String { val p = App.prefs(); val s = p.getString("notice", "") ?: ""; p.edit().remove("notice").apply(); return s }

    // ---------- 熱更新包：<前綴>_V0.1.02.zip ＝ manifest.json＋www/…
    private val OK_EXT = setOf("html", "js", "css", "json", "txt", "md", "png", "jpg", "jpeg", "webp", "svg", "ico", "woff2", "mp3", "wav")
    fun pendingZip() = File(ctx.cacheDir, "update/pending.zip")

    /** 檢查更新包：是不是這個 App 的、外殼夠不夠新、有沒有怪檔案、版本、這版改了什麼 */
    fun inspect(f: File): String {
        val o = JSONObject(); val problems = JSONArray()
        try {
            ZipFile(f).use { z ->
                val man = z.getEntry("manifest.json")?.let { JSONObject(z.getInputStream(it).bufferedReader().readText()) } ?: JSONObject()
                var files = 0; var size = 0L; var hasIndex = false
                for (e in z.entries()) {
                    val n = e.name.replace('\\', '/')
                    if (n.contains("..") || n.startsWith("/")) problems.put("壞掉的路徑：$n")
                    if (e.isDirectory || !n.startsWith("www/")) continue
                    files++; size += e.size
                    if (n == "www/index.html") hasIndex = true
                    val ext = n.substringAfterLast('.', "").lowercase()
                    if (ext !in OK_EXT) problems.put("不收這種檔：$n")
                }
                val ver = z.getEntry("www/version.txt")?.let { z.getInputStream(it).bufferedReader().readText().trim() } ?: man.optString("version")
                val myId = brand().optString("id")
                val app = man.optString("app")
                if (man.length() == 0) problems.put("少 manifest.json（不是更新包）")
                if (!hasIndex) problems.put("少 www/index.html")
                if (app.isNotEmpty() && myId.isNotEmpty() && app != myId) problems.put("這是別的程式（$app）的更新包，這個 App 是 $myId")
                val need = man.optInt("requires_shell", 1)
                if (need > BuildConfig.VERSION_CODE) problems.put("要先更新外殼到 S$need（現在 S${BuildConfig.VERSION_CODE}）")
                val notes = JSONArray()
                z.getEntry("www/CHANGELOG.json")?.let {
                    try {
                        val cl = JSONArray(z.getInputStream(it).bufferedReader().readText())
                        if (cl.length() > 0) cl.getJSONObject(0).optJSONArray("notes")?.let { a -> for (i in 0 until a.length()) notes.put(a.get(i)) }
                    } catch (_: Exception) {}
                }
                o.put("app", app).put("version", ver).put("cur", activeVer()).put("files", files).put("size", size)
                    .put("newer", verNum(ver) > verNum(activeVer())).put("same", verNum(ver) == verNum(activeVer()))
                    .put("requiresShell", need).put("notes", notes)
            }
        } catch (e: Exception) { problems.put("打不開這個 zip：" + (e.message ?: "")) }
        return o.put("ok", problems.length() == 0).put("problems", problems).toString()
    }

    /** 裝 pending.zip。hot＝馬上重新載入畫面；不然下次開 App 才用 */
    fun install(hot: Boolean): String {
        val f = pendingZip()
        if (!f.exists()) return "沒有待裝的更新包"
        val info = JSONObject(inspect(f))
        if (!info.optBoolean("ok")) return "不能裝：" + info.optJSONArray("problems")?.join("；")
        val ver = info.optString("version")
        val tmp = File(ctx.filesDir, "www_new")
        try {
            tmp.deleteRecursively(); tmp.mkdirs()
            ZipFile(f).use { z ->
                for (e in z.entries()) {
                    val n = e.name.replace('\\', '/')
                    if (e.isDirectory || !n.startsWith("www/")) continue
                    val out = File(tmp, n.removePrefix("www/"))
                    if (!out.canonicalPath.startsWith(tmp.canonicalPath)) throw SecurityException("壞掉的路徑")
                    out.parentFile?.mkdirs(); z.getInputStream(e).use { i -> out.outputStream().use { i.copyTo(it) } }
                }
            }
            val prev = prevDir(); prev.deleteRecursively()
            if (wwwDir().exists()) wwwDir().renameTo(prev)
            if (!tmp.renameTo(wwwDir())) { prev.renameTo(wwwDir()); return "換檔失敗，舊版保留" }
            App.prefs().edit().putString("probation", ver).putInt("probation_tries", 0).apply()
            f.delete()
            KLog.upd("裝好畫面 $ver（${if (hot) "熱更新" else "下次開 App 套用"}）")
            if (hot) loadUi()
            return "OK $ver"
        } catch (e: Exception) {
            tmp.deleteRecursively(); KLog.err("裝更新包", e); return "失敗：" + (e.message ?: "")
        }
    }

    /** 回到 APK 內建的畫面 */
    fun resetBuiltin() { wwwDir().deleteRecursively(); prevDir().deleteRecursively(); App.prefs().edit().remove("probation").apply(); KLog.upd("回到內建畫面 ${builtinVer()}"); loadUi() }

    // ---------- 網路
    fun http(url: String, method: String = "GET", body: String? = null, headers: JSONObject? = null, max: Int = 5_000_000): Pair<Int, ByteArray> {
        val c = URL(url).openConnection() as HttpURLConnection
        c.connectTimeout = 15000; c.readTimeout = 60000; c.instanceFollowRedirects = true
        c.requestMethod = method
        c.setRequestProperty("User-Agent", "AndroidKit/S${BuildConfig.VERSION_CODE}")
        headers?.keys()?.forEach { k -> c.setRequestProperty(k, headers.optString(k)) }
        if (body != null) { c.doOutput = true; c.outputStream.use { it.write(body.toByteArray()) } }
        val code = c.responseCode
        val st = if (code in 200..299) c.inputStream else c.errorStream
        val bytes = st?.use { s ->
            val o = java.io.ByteArrayOutputStream(); val buf = ByteArray(65536); var n: Int
            while (s.read(buf).also { n = it } > 0) { o.write(buf, 0, n); if (o.size() > max) throw Exception("檔案太大") }
            o.toByteArray()
        } ?: ByteArray(0)
        c.disconnect(); return code to bytes
    }

    /** 下載到檔案（GitHub 的下載會轉址，這裡自己跟） */
    fun download(url: String, out: File, progress: (Long, Long) -> Unit) {
        var u = URL(url); var hops = 0
        while (true) {
            val c = u.openConnection() as HttpURLConnection
            c.connectTimeout = 15000; c.readTimeout = 60000; c.instanceFollowRedirects = false
            c.setRequestProperty("User-Agent", "AndroidKit/S${BuildConfig.VERSION_CODE}")
            val code = c.responseCode
            if (code in 300..399) { val loc = c.getHeaderField("Location") ?: throw Exception("轉址失敗"); c.disconnect(); u = URL(u, loc); if (++hops > 6) throw Exception("轉址太多次"); continue }
            if (code !in 200..299) { c.disconnect(); throw Exception("伺服器回 $code") }
            val total = c.contentLengthLong
            out.parentFile?.mkdirs(); out.delete()
            c.inputStream.use { i -> out.outputStream().use { o ->
                val buf = ByteArray(65536); var n: Int; var done = 0L
                while (i.read(buf).also { n = it } > 0) { o.write(buf, 0, n); done += n; progress(done, total) }
            } }
            c.disconnect(); return
        }
    }

    fun sha256(f: File): String {
        val md = MessageDigest.getInstance("SHA-256")
        f.inputStream().use { i -> val b = ByteArray(65536); var n: Int; while (i.read(b).also { n = it } > 0) md.update(b, 0, n) }
        return md.digest().joinToString("") { "%02x".format(it) }
    }
}
