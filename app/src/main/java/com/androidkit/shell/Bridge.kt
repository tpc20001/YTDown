package com.androidkit.shell

import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.PowerManager
import android.os.Process
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.MediaStore
import android.provider.Settings
import android.webkit.JavascriptInterface
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.File

/**
 * 畫面（kit.js）叫的原生功能：window.KIT.xxx()。
 * 規則：這裡只放「網頁做不到的事」，邏輯都放畫面（才能熱更新）。
 * 加新的：寫一個 @JavascriptInterface fun，外殼版本加一（tools/bump.py --shell）。
 */
class Bridge {
    private val c: Context get() = App.ctx
    private fun jo(vararg p: Pair<String, Any?>) = JSONObject().apply { p.forEach { put(it.first, it.second) } }.toString()
    private fun onAct(f: (MainActivity) -> Unit) { Host.main.post { Host.act?.let { try { f(it) } catch (e: Exception) { KLog.err("畫面動作", e) } } } }
    private fun start(i: Intent) { try { (Host.act ?: c).startActivity(if (Host.act == null) i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) else i) } catch (e: Exception) { KLog.err("開啟畫面", e) } }

    // ---------- 版本、狀態
    @JavascriptInterface fun shell(): Int = BuildConfig.VERSION_CODE
    @JavascriptInterface fun uiVer(): String = Host.activeVer()
    @JavascriptInterface fun builtinVer(): String = Host.builtinVer()
    @JavascriptInterface fun usingLive(): Boolean = Host.usingLive()
    /** 讀目前畫面裡的文字檔（brand.json、CHANGELOG.json…）。file:// 網頁不能用 fetch 讀自己的檔，所以走這裡 */
    @JavascriptInterface fun wwwText(name: String): String = Host.readWww(name)?.let { String(it, Charsets.UTF_8) } ?: ""
    @JavascriptInterface fun prevVer(): String = if (Host.hasPrev()) Host.prevVer() else ""
    @JavascriptInterface fun ready(ver: String) = Host.ready(ver)
    @JavascriptInterface fun takeNotice(): String = Host.takeNotice()
    @JavascriptInterface fun env(): String {
        val pm = c.getSystemService(Context.POWER_SERVICE) as PowerManager
        return jo("sdk" to Build.VERSION.SDK_INT, "android" to Build.VERSION.RELEASE, "model" to (Build.MANUFACTURER + " " + Build.MODEL),
            "pkg" to c.packageName, "shell" to BuildConfig.VERSION_CODE,
            "batteryFree" to pm.isIgnoringBatteryOptimizations(c.packageName),
            "canInstall" to c.packageManager.canRequestPackageInstalls(),
            "notify" to (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(c, android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED),
            "usage" to Sys.hasUsage(c), "multiWindow" to (Host.act?.isInMultiWindowMode == true))
    }

    // ---------- LOG
    /** kind：w 一般／err 錯誤／freeze 畫面卡住／upd 更新／web 遠端 */
    @JavascriptInterface fun log(kind: String, msg: String) {
        when (kind) {
            "err" -> { KLog.write("app_log.txt", "❌ " + msg.substringBefore('\n').take(300)); KLog.write("error_log.txt", msg) }
            "freeze" -> KLog.write("ui_freeze_log.txt", msg)
            "upd" -> KLog.upd(msg)
            "web" -> KLog.web(msg)
            else -> KLog.w(msg)
        }
    }
    @JavascriptInterface fun logList(): String = KLog.list()
    @JavascriptInterface fun logTail(name: String, bytes: Int): String = KLog.tail(name, bytes)
    @JavascriptInterface fun logClear(name: String) = KLog.clear(name)
    /** 匯出最近幾天的 LOG（zip）→ 叫出分享（傳給 Claude） */
    @JavascriptInterface fun logExport(days: Int) {
        Host.io.launch {
            try { val f = KLog.exportZip(c, days); shareFile(f, "application/zip") }
            catch (e: Exception) { KLog.err("匯出 LOG", e); Host.js("onToast", "匯出失敗：" + (e.message ?: "")) }
        }
    }
    @JavascriptInterface fun freezeMs(ms: Int) { Watchdog.thresholdMs = ms.toLong().coerceIn(500, 30_000) }

    // ---------- 資料（files/Data/，熱更新、換外殼都不會動）
    private fun dataFile(name: String): File? {
        if (!Regex("^[A-Za-z0-9_.\\-]+$").matches(name) || name.startsWith(".")) return null
        return File(File(c.filesDir, "Data").apply { mkdirs() }, name)
    }
    @JavascriptInterface fun dataRead(name: String): String = try { dataFile(name)?.takeIf { it.exists() }?.readText() ?: "" } catch (_: Exception) { "" }
    /** 先寫暫存檔再換名字，寫到一半當掉也不會壞 */
    @JavascriptInterface fun dataWrite(name: String, text: String): Boolean = try {
        val f = dataFile(name) ?: throw Exception("檔名不行")
        val t = File(f.path + ".tmp"); t.writeText(text)
        if (!t.renameTo(f)) { f.delete(); t.renameTo(f) }; true
    } catch (e: Exception) { KLog.err("存資料 $name", e); false }

    // ---------- 資料庫（SQLite）
    @JavascriptInterface fun dbExec(sql: String, args: String): String = Db.exec(sql, args)
    @JavascriptInterface fun dbQuery(sql: String, args: String): String = Db.query(sql, args)
    /** 不卡畫面的版本：做完回 onDb {id, ...} */
    @JavascriptInterface fun dbAsync(id: String, kind: String, sql: String, args: String) {
        Host.io.launch {
            val r = if (kind == "q") Db.query(sql, args) else Db.exec(sql, args)
            Host.js("onDb", JSONObject(r).put("id", id).toString())
        }
    }

    // ---------- 手機狀態
    @JavascriptInterface fun perf(): String = Sys.perf(c)
    @JavascriptInterface fun net(): String = Sys.net(c)
    @JavascriptInterface fun ips(): String = Sys.ips()
    @JavascriptInterface fun fgApp(): String = Sys.fgApp(c)
    @JavascriptInterface fun apps(): String = Sys.apps(c)
    @JavascriptInterface fun crashInfo(): String = Crash.info()
    @JavascriptInterface fun crashClearPause() = Crash.clearPause()
    @JavascriptInterface fun setAutoRestart(on: Boolean) { App.prefs().edit().putBoolean("auto_restart", on).apply() }

    // ---------- 背景、通知
    /** n＞0：開常駐通知（背景不會被殺）；n＝0：關 */
    @JavascriptInterface fun keepAlive(on: Boolean, title: String, text: String) {
        Notify.title = title.take(80); Notify.text = text.take(160); Notify.keep(c, on)
    }
    @JavascriptInterface fun notify(title: String, text: String) = Notify.msg(c, title, text)
    @JavascriptInterface fun toBack() { onAct { it.moveTaskToBack(true) } }

    // ---------- 畫面
    @JavascriptInterface fun bars(hex: String, light: Boolean) { onAct { it.bars(hex, light) } }
    @JavascriptInterface fun secure(on: Boolean) { onAct { it.secure(on) } }
    @JavascriptInterface fun keepOn(on: Boolean) { onAct { it.keepOn(on) } }
    @JavascriptInterface fun vibrate(ms: Int) {
        try { (c.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator).vibrate(VibrationEffect.createOneShot(ms.toLong().coerceIn(10, 500), VibrationEffect.DEFAULT_AMPLITUDE)) } catch (_: Exception) {}
    }
    @JavascriptInterface fun copy(t: String) { Host.main.post { (c.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("text", t)) } }
    @JavascriptInterface fun paste(): String = try {
        (c.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).primaryClip?.getItemAt(0)?.coerceToText(c)?.toString() ?: ""
    } catch (_: Exception) { "" }
    @JavascriptInterface fun openUrl(u: String) = Host.openUrl(u)
    @JavascriptInterface fun shareText(t: String) { start(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, t), "分享")) }

    // ---------- 權限
    @JavascriptInterface fun askNotify() { onAct { it.askNotify() } }
    @SuppressLint("BatteryLife")
    @JavascriptInterface fun askBatteryFree() {
        try { start(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + c.packageName))) }
        catch (_: Exception) { start(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)) }
    }
    @JavascriptInterface fun askUsage() { start(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)) }
    @JavascriptInterface fun askInstall() { start(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + c.packageName))) }
    @JavascriptInterface fun appSettings() { start(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + c.packageName))) }

    // ---------- 檔案
    @JavascriptInterface fun pickText(tag: String, mime: String) { onAct { it.pickText(tag, mime) } }
    /** 存一個文字檔到「下載/<App 名稱>/」，回傳位置（空字串＝失敗） */
    @JavascriptInterface fun saveDownload(name: String, text: String, mime: String): String = try {
        val folder = Host.brand().optString("name", "AndroidKit").replace(Regex("[\\\\/:*?\"<>|]"), "_")
        val safe = name.replace(Regex("[\\\\/:*?\"<>|]"), "_")
        if (Build.VERSION.SDK_INT >= 29) {
            val cv = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, safe); put(MediaStore.Downloads.MIME_TYPE, mime.ifEmpty { "text/plain" })
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + folder)
            }
            val u = c.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv)!!
            c.contentResolver.openOutputStream(u)!!.use { it.write(text.toByteArray()) }
        } else {
            val d = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), folder); d.mkdirs(); File(d, safe).writeText(text)
        }
        "下載/$folder/$safe"
    } catch (e: Exception) { KLog.err("存到下載", e); "" }

    private fun shareFile(f: File, mime: String) {
        val u = FileProvider.getUriForFile(c, c.packageName + ".files", f)
        start(Intent.createChooser(Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM, u).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION), "傳出去"))
    }

    // ---------- 網路（不受網頁跨網域限制）→ onHttp {id, ok, status, body}
    @JavascriptInterface fun http(id: String, spec: String) {
        Host.io.launch {
            val r = try {
                val o = JSONObject(spec)
                val (code, b) = Host.http(o.getString("url"), o.optString("method", "GET"), if (o.has("body")) o.optString("body") else null, o.optJSONObject("headers"), o.optInt("max", 5_000_000))
                jo("id" to id, "ok" to (code in 200..299), "status" to code, "body" to String(b, Charsets.UTF_8))
            } catch (e: Exception) { jo("id" to id, "ok" to false, "status" to 0, "body" to (e.message ?: "")) }
            Host.js("onHttp", r)
        }
    }

    // ---------- 更新：畫面（熱更新）
    @JavascriptInterface fun updPick() { onAct { it.pickZip() } }
    /** 從網址下載更新包（雲端更新）→ onUpdProg {pct} → onUpdInfo（跟選檔案一樣，畫面再決定要不要裝） */
    @JavascriptInterface fun updFromUrl(url: String, sha256: String) {
        Host.io.launch {
            val f = Host.pendingZip()
            val r = try {
                var last = 0L
                Host.download(url, f) { done, total ->
                    val now = System.currentTimeMillis()
                    if (now - last > 400) { last = now; Host.js("onUpdProg", jo("pct" to (if (total > 0) done * 100 / total else -1), "done" to done)) }
                }
                if (sha256.isNotBlank() && !Host.sha256(f).equals(sha256.trim(), true)) { f.delete(); throw Exception("檔案驗證不對（SHA-256），可能沒下載完整") }
                KLog.upd("下載好更新包：$url")
                JSONObject(Host.inspect(f)).put("from", "cloud")
            } catch (e: Exception) { KLog.err("下載更新包", e); JSONObject().put("ok", false).put("from", "cloud").put("problems", org.json.JSONArray().put("下載失敗：" + (e.message ?: ""))) }
            Host.js("onUpdInfo", r.toString())
        }
    }
    @JavascriptInterface fun updPendingInfo(): String = if (Host.pendingZip().exists()) Host.inspect(Host.pendingZip()) else "{\"ok\":false,\"none\":true}"
    /** 裝待裝的更新包。hot＝馬上換（畫面重新載入，背景工作會接回）；next＝下次開 App 才用 */
    @JavascriptInterface fun updApply(mode: String): String = Host.install(mode == "hot")
    @JavascriptInterface fun updDiscard() { Host.pendingZip().delete() }
    @JavascriptInterface fun updRollback() { Host.main.post { Host.rollback("手動換回上一版") } }
    @JavascriptInterface fun updBuiltin() { Host.main.post { Host.resetBuiltin() } }
    @JavascriptInterface fun reload() { Host.main.post { Host.loadUi() } }
    @JavascriptInterface fun restart() { Crash.restart(c, 800); Host.main.postDelayed({ Process.killProcess(Process.myPid()) }, 300) }

    // ---------- 更新：外殼（APK）→ onApk {ok, stage, pct, msg}
    @JavascriptInterface fun apkInstall(url: String, sha256: String) {
        if (!c.packageManager.canRequestPackageInstalls()) {
            askInstall(); Host.js("onApk", jo("ok" to false, "msg" to "請先允許「安裝不明應用程式」，回來再按一次")); return
        }
        Host.io.launch {
            try {
                val f = File(c.cacheDir, "update/app_update.apk")
                var last = 0L
                Host.download(url, f) { done, total ->
                    val now = System.currentTimeMillis()
                    if (now - last > 400) { last = now; Host.js("onApk", jo("ok" to true, "stage" to "dl", "pct" to (if (total > 0) done * 100 / total else -1))) }
                }
                if (sha256.isNotBlank() && !Host.sha256(f).equals(sha256.trim(), true)) { f.delete(); throw Exception("檔案驗證不對（SHA-256）") }
                KLog.upd("下載好新外殼，叫出安裝畫面")
                val u = FileProvider.getUriForFile(c, c.packageName + ".files", f)
                Host.main.post { start(Intent(Intent.ACTION_VIEW).setDataAndType(u, "application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)) }
                Host.js("onApk", jo("ok" to true, "stage" to "install", "msg" to "下載好了，請在安裝畫面按「更新」"))
            } catch (e: Exception) { KLog.err("外殼更新", e); Host.js("onApk", jo("ok" to false, "msg" to "失敗：" + (e.message ?: ""))) }
        }
    }

    // ---------- 📡 遠端網頁
    @JavascriptInterface fun remoteStart(port: Int, pin: String): String = Remote.start(port, pin)
    @JavascriptInterface fun remoteStop() = Remote.stop()
    @JavascriptInterface fun remoteStatus(): String = Remote.status()
    @JavascriptInterface fun remoteReply(id: String, json: String) = Remote.reply(id, json)
}
