package com.androidkit.shell

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/**
 * LOG：都寫在 App 自己的資料夾 files/LOG/。每個檔超過 5 MB 換新的，留 5 個。
 *  app_log.txt        什麼都記（操作、設定、工作開始結束、錯誤一行摘要）
 *  error_log.txt      錯誤＋完整位置
 *  ui_freeze_log.txt  畫面卡住幾秒、卡在哪一行
 *  crash_dump.txt     整個閃退時，每條執行緒在做什麼
 *  update_log.txt     更新／熱更新的每一步
 *  web_log.txt        📡 遠端網頁的登入、錯誤
 */
object KLog {
    private const val MAX = 5L * 1024 * 1024
    private const val KEEP = 5
    val FILES = listOf("app_log.txt", "error_log.txt", "ui_freeze_log.txt", "crash_dump.txt", "update_log.txt", "web_log.txt")
    @Volatile private var dir: File? = null

    fun init(c: Context) { dir = File(c.filesDir, "LOG").apply { mkdirs() } }
    fun ts(): String = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date())

    @Synchronized fun write(file: String, msg: String) {
        try {
            val d = dir ?: return
            val f = File(d, file)
            if (f.length() > MAX) rotate(f)
            f.appendText(ts() + "  " + msg + "\n")
        } catch (_: Throwable) {}
    }

    private fun rotate(f: File) {
        val base = f.name.removeSuffix(".txt")
        val d = f.parentFile ?: return
        File(d, "$base.$KEEP.txt").delete()
        for (i in KEEP - 1 downTo 1) File(d, "$base.$i.txt").let { if (it.exists()) it.renameTo(File(d, "$base.${i + 1}.txt")) }
        f.renameTo(File(d, "$base.1.txt"))
    }

    fun w(msg: String) = write("app_log.txt", msg)
    fun upd(msg: String) { write("update_log.txt", msg); write("app_log.txt", "⟳ $msg") }
    fun web(msg: String) { write("web_log.txt", msg); write("app_log.txt", "📡 $msg") }
    fun err(where: String, e: Throwable?) {
        write("app_log.txt", "❌ $where：${e?.toString() ?: ""}")
        write("error_log.txt", "$where\n" + (e?.stackTraceToString() ?: "（沒有詳細位置）"))
    }

    /** 閃退：寫下每條執行緒在做什麼 */
    fun crash(t: Thread, e: Throwable) {
        val sb = StringBuilder("=== 閃退 ${ts()}  執行緒：${t.name}\n").append(e.stackTraceToString()).append("\n--- 全部執行緒\n")
        try {
            for ((th, st) in Thread.getAllStackTraces()) {
                sb.append("[${th.name}] ${th.state}\n")
                st.take(25).forEach { sb.append("    at ").append(it).append('\n') }
            }
        } catch (_: Throwable) {}
        write("crash_dump.txt", sb.toString())
        err("閃退（${t.name}）", e)
    }

    fun list(): String {
        val a = JSONArray()
        val d = dir ?: return a.toString()
        d.listFiles()?.sortedBy { it.name }?.forEach { a.put(JSONObject().put("name", it.name).put("size", it.length()).put("time", it.lastModified())) }
        return a.toString()
    }

    fun tail(name: String, maxBytes: Int): String {
        val d = dir ?: return ""
        if (name.contains('/') || name.contains('\\') || name.startsWith(".")) return ""
        val f = File(d, name); if (!f.exists()) return ""
        return try {
            java.io.RandomAccessFile(f, "r").use { r ->
                val n = maxBytes.coerceIn(1000, 2_000_000).toLong()
                val start = maxOf(0L, r.length() - n); r.seek(start)
                val b = ByteArray((r.length() - start).toInt()); r.readFully(b)
                String(b, Charsets.UTF_8).let { if (start > 0) it.substringAfter('\n') else it }
            }
        } catch (e: Exception) { "讀不到：" + e.message }
    }

    fun clear(name: String) { dir?.let { File(it, name).takeIf { f -> !name.contains('/') && f.exists() }?.writeText("") } }

    /** 匯出最近幾天的 LOG 成 zip（放在快取，之後用分享傳出去） */
    fun exportZip(c: Context, days: Int): File {
        val out = File(c.cacheDir, "share/LOG_" + SimpleDateFormat("yyyyMMdd_HHmm", Locale.US).format(Date()) + ".zip")
        out.parentFile?.mkdirs(); out.delete()
        val since = System.currentTimeMillis() - days * 86_400_000L
        ZipOutputStream(out.outputStream()).use { z ->
            dir?.listFiles()?.filter { it.isFile && it.lastModified() >= since }?.forEach { f ->
                z.putNextEntry(ZipEntry("LOG/" + f.name)); f.inputStream().use { it.copyTo(z) }; z.closeEntry()
            }
            z.putNextEntry(ZipEntry("裝置資訊.txt"))
            z.write(Sys.envText(c).toByteArray()); z.closeEntry()
        }
        return out
    }
}
