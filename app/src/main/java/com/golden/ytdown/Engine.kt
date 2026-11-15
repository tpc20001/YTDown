package com.golden.ytdown

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.PowerManager
import android.provider.MediaStore
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.documentfile.provider.DocumentFile
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLRequest
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.TreeSet
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * 下載引擎（跟畫面分開）：App 畫面被關掉，下載也會繼續；畫面重開時用 drain() / state() 接回。
 * 所有對外結果都走 emit(回呼名稱, JSON 字串)，畫面那邊用 window.<回呼名稱> 接。
 */
object Engine {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val jobs = ConcurrentHashMap<String, Job>()
    private val live = ConcurrentHashMap<String, String>()            // 工作 id → 最後一次進度
    private val missed = ConcurrentLinkedQueue<Pair<String, String>>() // 畫面不在時錯過的結果
    @Volatile var sink: ((String, String) -> Unit)? = null
    @Volatile var fgText: String? = null
    private var fgOn = false
    private var wake: PowerManager.WakeLock? = null
    private val ctx: Context get() = App.ctx

    fun emit(fn: String, arg: String) {
        val s = sink
        if (s != null) s(fn, arg)
        else if (fn != "onProg") { missed.add(fn to arg); while (missed.size > 200) missed.poll() }
    }
    fun drain(): String {
        val a = JSONArray()
        while (true) { val p = missed.poll() ?: break; a.put(JSONObject().put("fn", p.first).put("arg", p.second)) }
        return a.toString()
    }
    /** 目前還在跑的工作（畫面重開時用來接回） */
    fun state(): String {
        val a = JSONArray()
        jobs.keys.forEach { id -> a.put(JSONObject().put("id", id).put("last", live[id] ?: "")) }
        return a.toString()
    }
    fun count() = jobs.size

    // ---------- 背景：有工作就掛前景服務＋WakeLock，沒工作就收掉
    @Synchronized fun sync() {
        val n = jobs.size
        try {
            if (n == 0) {
                if (fgOn) { ctx.stopService(Intent(ctx, KeepAlive::class.java)); fgOn = false }
                wake?.let { if (it.isHeld) it.release() }; wake = null
                return
            }
            if (wake == null) {
                wake = (ctx.getSystemService(Context.POWER_SERVICE) as PowerManager)
                    .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ytd:download").apply { setReferenceCounted(false); acquire(6 * 3600_000L) }
            }
            if (!fgOn) { ContextCompat.startForegroundService(ctx, Intent(ctx, KeepAlive::class.java).putExtra("n", n)); fgOn = true }
            else Notify.updateOngoing(ctx, n, fgText)
        } catch (_: Exception) {}
    }

    // ---------- 存檔
    fun mimeOf(ext: String) = when (ext.lowercase()) {
        "mp4", "m4v" -> "video/mp4"; "webm" -> "video/webm"; "mkv" -> "video/x-matroska"; "mov" -> "video/quicktime"
        "m4a" -> "audio/mp4"; "mp3" -> "audio/mpeg"; "opus", "ogg" -> "audio/ogg"; "flac" -> "audio/flac"; "wav" -> "audio/wav"
        "jpg", "jpeg" -> "image/jpeg"; "png" -> "image/png"; "webp" -> "image/webp"; "gif" -> "image/gif"
        "vtt", "srt", "ass", "lrc", "txt", "description" -> "text/plain"
        else -> "application/octet-stream"
    }
    private fun cleanSub(s: String) = s.replace(Regex("[\\\\/:*?\"<>|]"), "").trim().take(40)

    /** dest：""＝手機的「下載/YTDown」；否則是使用者選的資料夾（content://…tree…） */
    private fun publish(f: File, sub: String, dest: String, gallery: String = ""): JSONObject {
        val mime = mimeOf(f.extension); val size = f.length()
        if (dest.isNotEmpty()) {
            val root = DocumentFile.fromTreeUri(ctx, Uri.parse(dest)) ?: throw Exception("存檔資料夾打不開，請到設定重選")
            var dir = root
            if (sub.isNotEmpty()) dir = root.findFile(sub)?.takeIf { it.isDirectory } ?: root.createDirectory(sub) ?: root
            val doc = dir.createFile(mime, f.name) ?: throw Exception("存不進選的資料夾")
            ctx.contentResolver.openOutputStream(doc.uri)!!.use { o -> f.inputStream().use { it.copyTo(o) } }
            f.delete()
            val shown = (root.name ?: "選的資料夾") + (if (sub.isNotEmpty()) "/$sub" else "") + "/" + (doc.name ?: f.name)
            return JSONObject().put("name", doc.name ?: f.name).put("path", shown).put("uri", doc.uri.toString()).put("size", size).put("mime", mime)
        }
        // 存到相簿：照片（和影片）放進 DCIM/YTDown，手機的相簿 App 才看得到
        val isImg = mime.startsWith("image/"); val isVid = mime.startsWith("video/")
        if ((gallery == "img" && isImg) || (gallery == "all" && (isImg || isVid))) {
            val grel = Environment.DIRECTORY_DCIM + "/YTDown" + (if (sub.isNotEmpty()) "/$sub" else "")
            if (Build.VERSION.SDK_INT >= 29) {
                val col = if (isImg) MediaStore.Images.Media.EXTERNAL_CONTENT_URI else MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                val cv = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, f.name); put(MediaStore.MediaColumns.MIME_TYPE, mime)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, grel); put(MediaStore.MediaColumns.IS_PENDING, 1)
                }
                val uri = ctx.contentResolver.insert(col, cv) ?: throw Exception("存不進相簿")
                ctx.contentResolver.openOutputStream(uri)!!.use { o -> f.inputStream().use { it.copyTo(o) } }
                ctx.contentResolver.update(uri, ContentValues().apply { put(MediaStore.MediaColumns.IS_PENDING, 0) }, null, null)
                f.delete()
                return JSONObject().put("name", f.name).put("path", "相簿/YTDown" + (if (sub.isNotEmpty()) "/$sub" else "") + "/" + f.name).put("uri", uri.toString()).put("size", size).put("mime", mime)
            }
            val d = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DCIM), "YTDown" + (if (sub.isNotEmpty()) "/$sub" else "")); d.mkdirs()
            val t = File(d, f.name); f.copyTo(t, true); f.delete()
            MediaScannerConnection.scanFile(ctx, arrayOf(t.absolutePath), arrayOf(mime), null)
            val uri = FileProvider.getUriForFile(ctx, ctx.packageName + ".files", t)
            return JSONObject().put("name", f.name).put("path", t.absolutePath).put("uri", uri.toString()).put("size", size).put("mime", mime)
        }
        val rel = "YTDown" + (if (sub.isNotEmpty()) "/$sub" else "")
        if (Build.VERSION.SDK_INT >= 29) {
            val cv = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, f.name); put(MediaStore.Downloads.MIME_TYPE, mime)
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + rel)
            }
            val uri = ctx.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv) ?: throw Exception("存不進下載資料夾")
            ctx.contentResolver.openOutputStream(uri)!!.use { o -> f.inputStream().use { it.copyTo(o) } }
            f.delete()
            return JSONObject().put("name", f.name).put("path", "下載/$rel/${f.name}").put("uri", uri.toString()).put("size", size).put("mime", mime)
        }
        val d = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), rel); d.mkdirs()
        val t = File(d, f.name); f.copyTo(t, true); f.delete()
        val uri = FileProvider.getUriForFile(ctx, ctx.packageName + ".files", t)
        return JSONObject().put("name", f.name).put("path", t.absolutePath).put("uri", uri.toString()).put("size", size).put("mime", mime)
    }
    private fun publishAll(dir: File, sub: String, dest: String, byName: Boolean = false, gallery: String = ""): JSONArray {
        val out = JSONArray(); val skip = setOf("part", "ytdl", "json", "temp", "tmp")
        val all = dir.walkTopDown().filter { it.isFile && it.length() > 0 && it.extension.lowercase() !in skip }
        (if (byName) all.sortedBy { it.name } else all.sortedByDescending { it.length() }).forEach { out.put(publish(it, sub, dest, if (dest.isEmpty()) gallery else "")) }
        return out
    }

    // ---------- 登入資料（cookies）
    fun cookieDir() = File(ctx.filesDir, "cookies").apply { mkdirs() }
    fun cookieFile(key: String) = File(cookieDir(), key.replace(Regex("[^A-Za-z0-9_-]"), "_") + ".txt")

    // ---------- yt-dlp 參數
    private fun applyMode(r: YoutubeDLRequest, mode: String) {
        val h = mode.toIntOrNull()
        when {
            mode == "none" -> {}                                   // 畫面自己用 args 決定
            mode == "audio" -> r.addOption("-f", "ba[ext=m4a]/ba")
            mode == "mp3" -> { r.addOption("-f", "ba/b"); r.addOption("-x"); r.addOption("--audio-format", "mp3"); r.addOption("--audio-quality", "0") }
            mode.startsWith("f:") -> { r.addOption("-f", mode.substring(2)); r.addOption("--merge-output-format", "mp4") }
            h != null -> { r.addOption("-f", "bv*[height<=$h]+ba/b[height<=$h]/bv*+ba/b"); r.addOption("-S", "res,ext:mp4:m4a"); r.addOption("--merge-output-format", "mp4") }
            else -> { r.addOption("-f", "bv*+ba/b"); r.addOption("-S", "res,ext:mp4:m4a"); r.addOption("--merge-output-format", "mp4") }
        }
    }
    private fun addArgs(r: YoutubeDLRequest, a: JSONArray?) {
        if (a == null) return
        for (i in 0 until a.length()) {
            val o = a.optJSONArray(i) ?: continue
            if (o.length() >= 2) r.addOption(o.getString(0), o.getString(1)) else if (o.length() == 1) r.addOption(o.getString(0))
        }
    }
    private fun addCommon(r: YoutubeDLRequest, o: JSONObject) {
        val ck = o.optString("cookies", "")
        if (ck.isNotEmpty()) { val f = cookieFile(ck); if (f.exists() && f.length() > 0) r.addOption("--cookies", f.absolutePath) }
        if (o.optBoolean("aria2", false)) {
            r.addOption("--downloader", "libaria2c.so")
            r.addOption("--external-downloader-args", "aria2c:\"--summary-interval=1 -x 8 -s 8 -k 1M\"")
        }
        addArgs(r, o.optJSONArray("args"))
    }
    private fun err(e: Throwable) = (e.message ?: e.toString()).take(1200)

    /** 下載。spec = {id,url,mode,args,sub,dest,playlist,tpl,title,notify,cookies,aria2} */
    fun job(spec: String) {
        val o = try { JSONObject(spec) } catch (e: Exception) { return }
        val id = o.optString("id"); val url = o.optString("url"); if (id.isEmpty() || url.isEmpty()) return
        if (jobs.containsKey(id)) return
        val sub = cleanSub(o.optString("sub", "")); val dest = o.optString("dest", "")
        val title = o.optString("title", ""); val notify = o.optBoolean("notify", true)
        jobs[id] = scope.launch {
            val dir = File(ctx.getExternalFilesDir(null) ?: ctx.cacheDir, "tmp_" + id.replace(Regex("[^A-Za-z0-9_~-]"), "_"))
            dir.deleteRecursively(); dir.mkdirs()
            try {
                if (!App.ready) throw Exception("下載核心沒載入：" + App.initErr)
                val r = YoutubeDLRequest(url)
                // -P 指定工作資料夾，章節切檔、封面、字幕也都會落在這裡
                r.addOption("-P", dir.absolutePath)
                r.addOption("-o", o.optString("tpl", "%(title).90B [%(id)s].%(ext)s"))
                r.addOption(if (o.optBoolean("playlist", false)) "--yes-playlist" else "--no-playlist")
                r.addOption("--no-mtime"); r.addOption("--windows-filenames")
                applyMode(r, o.optString("mode", "best"))
                addCommon(r, o)
                YoutubeDL.getInstance().execute(r, id) { p, eta, line ->
                    val j = JSONObject().put("id", id).put("pct", p.toDouble()).put("eta", eta).put("line", line).toString()
                    live[id] = j; emit("onProg", j)
                }
                val files = publishAll(dir, sub, dest, false, o.optString("gallery", ""))
                if (files.length() == 0) throw Exception("沒有產生檔案")
                emit("onDone", JSONObject().put("id", id).put("ok", true).put("files", files).put("file", files.getJSONObject(0).getString("path")).toString())
                if (notify) Notify.done(ctx, title.ifEmpty { files.getJSONObject(0).getString("name") }, true)
            } catch (e: CancellationException) {
                emit("onDone", JSONObject().put("id", id).put("ok", false).put("msg", "已取消").toString())
            } catch (e: Throwable) {
                emit("onDone", JSONObject().put("id", id).put("ok", false).put("msg", err(e)).toString())
                if (notify) Notify.done(ctx, title.ifEmpty { url }, false)
            } finally { dir.deleteRecursively(); jobs.remove(id); live.remove(id); sync() }
        }
        sync()
    }
    /**
     * 直接下載一批網址（不經過 yt-dlp），給 IG 照片這類用。
     * spec = {id, items:[{url,name}], sub, dest, title, notify, headers:{}, cookies}
     * 進度、結束的格式跟 job() 一樣，畫面那邊不用分。
     */
    fun fetchJob(spec: String) {
        val o = try { JSONObject(spec) } catch (e: Exception) { return }
        val id = o.optString("id"); val items = o.optJSONArray("items") ?: return
        if (id.isEmpty() || items.length() == 0 || jobs.containsKey(id)) return
        val sub = cleanSub(o.optString("sub", "")); val dest = o.optString("dest", "")
        val title = o.optString("title", ""); val notify = o.optBoolean("notify", true)
        val hdr = o.optJSONObject("headers"); val ck = o.optString("cookies", "")
        jobs[id] = scope.launch {
            val dir = File(ctx.getExternalFilesDir(null) ?: ctx.cacheDir, "tmp_" + id.replace(Regex("[^A-Za-z0-9_~-]"), "_"))
            dir.deleteRecursively(); dir.mkdirs()
            try {
                val n = items.length(); var last = 0L
                for (i in 0 until n) {
                    val it = items.getJSONObject(i)
                    val name = it.optString("name", "file_$i").replace(Regex("[\\\\/:*?\"<>|\\n\\r]"), "_").take(120)
                    Net.download(it.getString("url"), hdr, ck, File(dir, name), { isActive }) { done, total ->
                        val now = System.currentTimeMillis()
                        if (now - last > 300) {
                            last = now
                            val part = if (total > 0) done.toDouble() / total else 0.0
                            val j = JSONObject().put("id", id).put("pct", (i + part) / n * 100).put("eta", 0).put("line", "[fetch] ${i + 1}/$n").toString()
                            live[id] = j; emit("onProg", j)
                        }
                    }
                }
                val files = publishAll(dir, sub, dest, true, o.optString("gallery", ""))
                if (files.length() == 0) throw Exception("沒有產生檔案")
                emit("onDone", JSONObject().put("id", id).put("ok", true).put("files", files).put("file", files.getJSONObject(0).getString("path")).toString())
                if (notify) Notify.done(ctx, title.ifEmpty { files.getJSONObject(0).getString("name") }, true)
            } catch (e: CancellationException) {
                emit("onDone", JSONObject().put("id", id).put("ok", false).put("msg", "已取消").toString())
            } catch (e: Throwable) {
                emit("onDone", JSONObject().put("id", id).put("ok", false).put("msg", err(e)).toString())
                if (notify) Notify.done(ctx, title.ifEmpty { "下載" }, false)
            } finally { dir.deleteRecursively(); jobs.remove(id); live.remove(id); sync() }
        }
        sync()
    }
    fun cancel(id: String) { try { YoutubeDL.getInstance().destroyProcessById(id) } catch (_: Exception) {}; jobs[id]?.cancel() }

    /** 解析影片資訊（不下載）→ onInfo */
    fun probe(id: String, url: String, spec: String) {
        scope.launch {
            val res = try {
                if (!App.ready) throw Exception("下載核心沒載入：" + App.initErr)
                val o = try { if (spec.trim().startsWith("{")) JSONObject(spec) else JSONObject().put("args", JSONArray(spec)) } catch (_: Exception) { JSONObject() }
                val r = YoutubeDLRequest(url)
                r.addOption("--dump-single-json"); r.addOption("--skip-download"); r.addOption("--flat-playlist"); r.addOption("--no-warnings")
                addCommon(r, o)
                val j = JSONObject(YoutubeDL.getInstance().execute(r).out)
                val hs = TreeSet<Int>()
                j.optJSONArray("formats")?.let { f ->
                    for (i in 0 until f.length()) {
                        val x = f.optJSONObject(i) ?: continue
                        val ht = x.optInt("height", 0)
                        if (ht > 0 && x.optString("vcodec", "") != "none") hs.add(ht)
                    }
                }
                if (hs.isEmpty() && j.optInt("height", 0) > 0) hs.add(j.optInt("height"))
                val ch = JSONArray()
                j.optJSONArray("chapters")?.let { c -> for (i in 0 until c.length()) c.optJSONObject(i)?.let { ch.put(JSONObject().put("t", it.optString("title")).put("s", it.optDouble("start_time")).put("e", it.optDouble("end_time"))) } }
                JSONObject().put("id", id).put("ok", true)
                    .put("title", j.optString("title")).put("thumb", j.optString("thumbnail"))
                    .put("dur", j.optDouble("duration", 0.0)).put("uploader", j.optString("uploader", j.optString("channel", "")))
                    .put("site", j.optString("extractor_key")).put("isList", j.optString("_type") == "playlist")
                    .put("count", j.optJSONArray("entries")?.length() ?: 0)
                    .put("heights", JSONArray(hs.toList().reversed()))
                    .put("hasSubs", (j.optJSONObject("subtitles")?.length() ?: 0) > 0)
                    .put("live", j.optBoolean("is_live", false)).put("chapters", ch)
                    .put("webpage", j.optString("webpage_url", url))
            } catch (e: Throwable) { JSONObject().put("id", id).put("ok", false).put("msg", err(e)) }
            emit("onInfo", res.toString())
        }
    }

    /** 萬用：直接跑一個 yt-dlp 指令（搜尋、列格式…之後的新功能用熱更新就能做）→ onExec {id,ok,out,err} */
    fun exec(id: String, url: String, spec: String) {
        scope.launch {
            val res = try {
                if (!App.ready) throw Exception("下載核心沒載入：" + App.initErr)
                val o = try { JSONObject(spec) } catch (_: Exception) { JSONObject() }
                val r = if (url.isEmpty()) YoutubeDLRequest(emptyList<String>()) else YoutubeDLRequest(url)
                addCommon(r, o)
                val resp = YoutubeDL.getInstance().execute(r, "x_$id")
                JSONObject().put("id", id).put("ok", true).put("out", resp.out.take(3_000_000)).put("err", resp.err.take(20_000))
            } catch (e: Throwable) { JSONObject().put("id", id).put("ok", false).put("err", err(e)) }
            emit("onExec", res.toString())
        }
    }

    /** 更新 yt-dlp：channel = stable / nightly / master → onCore */
    fun updateCore(channel: String) {
        scope.launch {
            val ch = when (channel) { "nightly" -> YoutubeDL.UpdateChannel._NIGHTLY; "master" -> YoutubeDL.UpdateChannel._MASTER; else -> YoutubeDL.UpdateChannel._STABLE }
            val m = try {
                val st = YoutubeDL.getInstance().updateYoutubeDL(ctx, ch)
                val v = try { YoutubeDL.getInstance().versionName(ctx) ?: "" } catch (_: Exception) { "" }
                (if (st?.name == "ALREADY_UP_TO_DATE") "已經是最新" else "已更新") + (if (v.isNotEmpty()) "（$v）" else "")
            } catch (e: Throwable) { "失敗：" + e.message }
            emit("onCore", m)
        }
    }
}
