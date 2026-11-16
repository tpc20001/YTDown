package com.androidkit.shell

import org.json.JSONObject
import java.io.BufferedInputStream
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.security.SecureRandom
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * 📡 遠端網頁：用電腦（或別支手機）的瀏覽器看、控制這個 App。
 * 同一個 Wi-Fi 打 http://手機IP:埠，裝了 Tailscale 的話用 http://100.x.x.x:埠（在外面也能連）。
 *
 * PIN 登入（錯 5 次鎖 5 分鐘），登入後記住（cookie）。
 * 畫面在 www/remote.html（跟著熱更新）；/api/xxx 轉給畫面裡的 kit.js 處理（kit.remote.api 註冊的）。
 */
object Remote {
    @Volatile private var server: ServerSocket? = null
    @Volatile var port = 0; private set
    @Volatile private var pin = ""
    private val pool = Executors.newCachedThreadPool()
    private val waits = ConcurrentHashMap<String, CompletableFuture<String>>()
    private val rnd = SecureRandom()
    @Volatile private var fails = 0
    @Volatile private var lockUntil = 0L

    fun running() = server != null

    @Synchronized fun start(p: Int, newPin: String): String {
        stop()
        if (newPin.length < 4) return "PIN 至少 4 碼"
        return try {
            val s = ServerSocket(); s.reuseAddress = true; s.bind(InetSocketAddress(p))
            server = s; port = p; pin = newPin
            Thread({ loop(s) }, "remote-web").apply { isDaemon = true }.start()
            KLog.web("開始：埠 $p"); "OK"
        } catch (e: Exception) { KLog.err("遠端網頁開不起來", e); "開不起來：" + (e.message ?: "") + "（埠 $p 可能被別的 App 用了）" }
    }

    @Synchronized fun stop() {
        server?.let { try { it.close() } catch (_: Exception) {}; KLog.web("關閉") }
        server = null
    }

    fun status(): String = JSONObject().put("on", running()).put("port", port).put("ips", org.json.JSONArray(Sys.ips())).toString()

    /** kit.js 處理完 /api 之後回這裡 */
    fun reply(id: String, json: String) { waits.remove(id)?.complete(json) }

    private fun loop(s: ServerSocket) {
        while (!s.isClosed) {
            val c = try { s.accept() } catch (_: Exception) { break }
            pool.execute { try { handle(c) } catch (e: Exception) { KLog.write("web_log.txt", "連線錯誤：${e.message}") } finally { try { c.close() } catch (_: Exception) {} } }
        }
    }

    // ---------- 很小的 HTTP 伺服器
    private class Req(val method: String, val path: String, val query: String, val headers: Map<String, String>, val body: ByteArray, val ip: String) {
        fun cookie(name: String) = (headers["cookie"] ?: "").split(';').map { it.trim() }.firstOrNull { it.startsWith("$name=") }?.substringAfter('=') ?: ""
    }

    private fun readLine(i: InputStream): String? {
        val b = ByteArrayOutputStream(); var c: Int
        while (true) { c = i.read(); if (c < 0) return if (b.size() == 0) null else b.toString("UTF-8"); if (c == '\n'.code) break; if (c != '\r'.code) b.write(c); if (b.size() > 8192) return null }
        return b.toString("UTF-8")
    }

    private fun handle(sock: Socket) {
        sock.soTimeout = 30_000
        val inp = BufferedInputStream(sock.getInputStream()); val out = sock.getOutputStream()
        val first = readLine(inp) ?: return
        val parts = first.split(' '); if (parts.size < 2) return
        val headers = HashMap<String, String>()
        while (true) { val l = readLine(inp) ?: break; if (l.isEmpty()) break; val k = l.substringBefore(':').trim().lowercase(); headers[k] = l.substringAfter(':').trim() }
        val len = headers["content-length"]?.toIntOrNull() ?: 0
        if (len > 40_000_000) { send(out, 413, "text/plain", "太大".toByteArray()); return }
        val body = ByteArray(len); var got = 0
        while (got < len) { val n = inp.read(body, got, len - got); if (n < 0) break; got += n }
        val full = parts[1]
        val req = Req(parts[0], full.substringBefore('?'), full.substringAfter('?', ""), headers, body, sock.inetAddress?.hostAddress ?: "")
        route(req, out)
    }

    private fun tokens(): MutableSet<String> = (App.prefs().getStringSet("remote_tokens", emptySet()) ?: emptySet()).toMutableSet()
    private fun authed(r: Req): Boolean { val t = r.cookie("kit_t").ifEmpty { r.headers["x-token"] ?: "" }; return t.length >= 16 && t in tokens() }

    private fun route(r: Req, out: OutputStream) {
        when {
            r.path == "/" || r.path == "/index.html" -> {
                val page = Host.readWww("remote.html") ?: "remote.html 不見了".toByteArray()
                send(out, 200, "text/html; charset=utf-8", page)
            }
            r.path == "/brand.json" -> send(out, 200, "application/json", Host.readWww("brand.json") ?: "{}".toByteArray())
            r.path == "/login" && r.method == "POST" -> login(r, out)
            r.path == "/logout" -> {
                val t = r.cookie("kit_t"); val s = tokens(); s.remove(t); App.prefs().edit().putStringSet("remote_tokens", s).apply()
                send(out, 200, "application/json", "{\"ok\":true}".toByteArray(), "kit_t=; Path=/; Max-Age=0")
            }
            r.path == "/upload" && r.method == "POST" -> {
                if (!authed(r)) { send(out, 401, "application/json", "{\"ok\":false,\"login\":true}".toByteArray()); return }
                val f = Host.pendingZip(); f.parentFile?.mkdirs(); f.writeBytes(r.body)
                val info = Host.inspect(f)
                KLog.web("從 ${r.ip} 上傳更新包（${r.body.size / 1024} KB）")
                Host.js("onUpdInfo", JSONObject(info).put("from", "remote").toString())
                send(out, 200, "application/json", info.toByteArray())
            }
            r.path.startsWith("/api/") -> {
                if (!authed(r)) { send(out, 401, "application/json", "{\"ok\":false,\"login\":true}".toByteArray()); return }
                send(out, 200, "application/json; charset=utf-8", callUi(r.path.removePrefix("/api/"), r.query, String(r.body, Charsets.UTF_8)).toByteArray())
            }
            else -> send(out, 404, "text/plain", "沒有這頁".toByteArray())
        }
    }

    private fun login(r: Req, out: OutputStream) {
        val now = System.currentTimeMillis()
        if (now < lockUntil) { send(out, 200, "application/json", JSONObject().put("ok", false).put("msg", "錯太多次，${(lockUntil - now) / 1000} 秒後再試").toString().toByteArray()); return }
        val p = try { JSONObject(String(r.body)).optString("pin") } catch (_: Exception) { "" }
        if (p != pin) {
            fails++; KLog.web("PIN 錯誤（${r.ip}，第 $fails 次）")
            if (fails >= 5) { lockUntil = now + 5 * 60_000; fails = 0; KLog.web("鎖 5 分鐘") }
            send(out, 200, "application/json", "{\"ok\":false,\"msg\":\"PIN 不對\"}".toByteArray()); return
        }
        fails = 0
        val t = ByteArray(24).also { rnd.nextBytes(it) }.joinToString("") { "%02x".format(it) }
        val s = tokens(); s.add(t); while (s.size > 30) s.remove(s.first())
        App.prefs().edit().putStringSet("remote_tokens", s).apply()
        KLog.web("登入成功（${r.ip}）")
        send(out, 200, "application/json", "{\"ok\":true}".toByteArray(), "kit_t=$t; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax")
    }

    /** 轉給畫面處理，最多等 15 秒 */
    private fun callUi(path: String, query: String, body: String): String {
        if (!Host.alive()) return "{\"ok\":false,\"msg\":\"App 畫面還沒開，請在手機上打開一次 App\"}"
        val id = ByteArray(8).also { rnd.nextBytes(it) }.joinToString("") { "%02x".format(it) }
        val f = CompletableFuture<String>(); waits[id] = f
        Host.js("__kitRemote", JSONObject().put("id", id).put("path", path).put("query", query).put("body", body).toString())
        return try { f.get(15, TimeUnit.SECONDS) } catch (_: Exception) { waits.remove(id); "{\"ok\":false,\"msg\":\"App 沒有回應（可能在背景被系統暫停）\"}" }
    }

    private fun send(out: OutputStream, code: Int, type: String, body: ByteArray, cookie: String? = null) {
        val h = StringBuilder("HTTP/1.1 $code ${if (code == 200) "OK" else "ERR"}\r\n")
            .append("Content-Type: $type\r\nContent-Length: ${body.size}\r\nCache-Control: no-store\r\nConnection: close\r\n")
        if (cookie != null) h.append("Set-Cookie: $cookie\r\n")
        h.append("\r\n")
        out.write(h.toString().toByteArray()); out.write(body); out.flush()
    }

}
