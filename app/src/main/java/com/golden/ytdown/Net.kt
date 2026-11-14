package com.golden.ytdown

import kotlinx.coroutines.CancellationException
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/** 一般的網路讀取：可以帶標頭和登入資料（cookies 檔），給 IG 這類要自己打 API 的平台用。 */
object Net {
    const val UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"

    /** 把 cookies.txt（Netscape 格式）變成 "a=b; c=d" */
    fun cookieHeader(key: String): String {
        if (key.isEmpty()) return ""
        val f = Engine.cookieFile(key); if (!f.exists()) return ""
        val seen = LinkedHashMap<String, String>()
        f.readLines().forEach { raw ->
            val line = if (raw.startsWith("#HttpOnly_")) raw.removePrefix("#HttpOnly_") else raw
            if (line.isBlank() || line.startsWith("#")) return@forEach
            val p = line.split("\t"); if (p.size >= 7) seen[p[5]] = p[6]
        }
        return seen.entries.joinToString("; ") { it.key + "=" + it.value }
    }

    private fun open(url: String, method: String, headers: JSONObject?, cookies: String, body: String?): HttpURLConnection {
        val c = URL(url).openConnection() as HttpURLConnection
        c.connectTimeout = 20000; c.readTimeout = 60000; c.instanceFollowRedirects = true
        c.requestMethod = method.ifEmpty { "GET" }
        c.setRequestProperty("User-Agent", UA)
        if (headers != null) { val it = headers.keys(); while (it.hasNext()) { val k = it.next(); c.setRequestProperty(k, headers.optString(k)) } }
        val ck = cookieHeader(cookies); if (ck.isNotEmpty()) c.setRequestProperty("Cookie", ck)
        if (!body.isNullOrEmpty()) { c.doOutput = true; c.outputStream.use { it.write(body.toByteArray()) } }
        return c
    }

    fun text(url: String, method: String, headers: JSONObject?, cookies: String, body: String?, max: Int): Pair<Int, String> {
        val c = open(url, method, headers, cookies, body)
        try {
            val code = c.responseCode
            val st = if (code in 200..299) c.inputStream else c.errorStream
            val bytes = st?.use { s ->
                val o = ByteArrayOutputStream(); val buf = ByteArray(65536)
                while (true) { val n = s.read(buf); if (n < 0) break; o.write(buf, 0, n); if (o.size() > max) break }
                o.toByteArray()
            } ?: ByteArray(0)
            return code to String(bytes, Charsets.UTF_8)
        } finally { c.disconnect() }
    }

    /** 只問檔案多大、是什麼類型（不下載）。伺服器不給 HEAD 就改抓第一個位元組來問。 */
    fun head(url: String, headers: JSONObject?, cookies: String): JSONObject {
        var c = open(url, "HEAD", headers, cookies, null)
        try {
            var code = c.responseCode; var len = c.contentLengthLong; var type = c.contentType ?: ""
            if (code !in 200..299 || len <= 0) {
                c.disconnect()
                val h = JSONObject(headers?.toString() ?: "{}").put("Range", "bytes=0-0")
                c = open(url, "GET", h, cookies, null)
                code = c.responseCode; type = c.contentType ?: type
                val cr = c.getHeaderField("Content-Range") ?: ""
                len = cr.substringAfterLast('/', "").toLongOrNull() ?: (if (code == 200) c.contentLengthLong else -1L)
            }
            return JSONObject().put("ok", code in 200..299).put("status", code).put("len", len).put("type", type).put("url", c.url.toString())
        } finally { c.disconnect() }
    }

    /** 邊下載邊寫檔（不佔記憶體）。alive 回 false 就中斷。 */
    fun download(url: String, headers: JSONObject?, cookies: String, out: File, alive: () -> Boolean, onProg: (Long, Long) -> Unit) {
        val c = open(url, "GET", headers, cookies, null)
        try {
            val code = c.responseCode; if (code !in 200..299) throw Exception("HTTP $code")
            val total = c.contentLengthLong; var done = 0L
            c.inputStream.use { i -> out.outputStream().use { o ->
                val buf = ByteArray(1 shl 16)
                while (true) {
                    if (!alive()) throw CancellationException("已取消")
                    val n = i.read(buf); if (n < 0) break
                    o.write(buf, 0, n); done += n; onProg(done, total)
                }
            } }
        } finally { c.disconnect() }
    }
}
