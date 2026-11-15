package com.golden.ytdown

import android.content.Context
import android.os.Build
import dev.g000sha256.tdl.TdlClient
import dev.g000sha256.tdl.TdlResult
import dev.g000sha256.tdl.dto.AuthorizationState
import dev.g000sha256.tdl.dto.AuthorizationStateClosed
import dev.g000sha256.tdl.dto.AuthorizationStateClosing
import dev.g000sha256.tdl.dto.AuthorizationStateLoggingOut
import dev.g000sha256.tdl.dto.AuthorizationStateReady
import dev.g000sha256.tdl.dto.AuthorizationStateWaitCode
import dev.g000sha256.tdl.dto.AuthorizationStateWaitPassword
import dev.g000sha256.tdl.dto.AuthorizationStateWaitPhoneNumber
import dev.g000sha256.tdl.dto.AuthorizationStateWaitTdlibParameters
import dev.g000sha256.tdl.dto.Message
import dev.g000sha256.tdl.dto.MessageAnimation
import dev.g000sha256.tdl.dto.MessageAudio
import dev.g000sha256.tdl.dto.MessageDocument
import dev.g000sha256.tdl.dto.MessagePhoto
import dev.g000sha256.tdl.dto.MessageVideo
import dev.g000sha256.tdl.dto.MessageVideoNote
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.filter
import org.json.JSONObject
import java.io.File

/**
 * Telegram：用你自己的帳號登入（Telegram 官方給第三方 App 用的 TDLib），
 * 才能下載網頁版預覽拿不到的大影片。api_id / api_hash 由你在 my.telegram.org 申請，存在這支手機裡。
 * 狀態變化走 Engine.emit("onTg", {state, hint, me})
 */
object Tg {
    private val ctx: Context get() = App.ctx
    private val prefs get() = ctx.getSharedPreferences("tg", Context.MODE_PRIVATE)
    private var client: TdlClient? = null
    private var scope: CoroutineScope? = null
    @Volatile private var state = "none"
    @Volatile private var hint = ""
    @Volatile private var me = ""
    @Volatile private var lastErr = ""
    @Volatile private var paramsSent = false

    private fun <T> TdlResult<T>.ok(): T = when (this) {
        is TdlResult.Success -> result
        is TdlResult.Failure -> throw Exception("TG_ERR $code $message")
    }
    private fun push() = Engine.emit("onTg", info())
    fun info(): String = JSONObject().put("state", state).put("hint", hint).put("me", me).put("err", lastErr)
        .put("hasKey", prefs.getInt("apiId", 0) != 0).toString()

    /** App 開啟時：之前登入過就自動接回 */
    fun boot() { if (prefs.getInt("apiId", 0) != 0 && client == null) start(prefs.getInt("apiId", 0), prefs.getString("apiHash", "") ?: "") }

    @Synchronized fun start(apiId: Int, apiHash: String) {
        if (apiId <= 0 || apiHash.length < 10) { lastErr = "api_id 或 api_hash 不對"; push(); return }
        prefs.edit().putInt("apiId", apiId).putString("apiHash", apiHash).apply()
        if (client != null) { push(); return }
        lastErr = ""; state = "starting"; paramsSent = false; push()
        val c = TdlClient.create(); client = c
        val sc = CoroutineScope(SupervisorJob() + Dispatchers.IO); scope = sc
        sc.launch(start = CoroutineStart.UNDISPATCHED) { c.authorizationStateUpdates.collect { u -> handle(c, u.authorizationState, apiId, apiHash) } }
        // TDLib 要先收到一個請求才會開始動，所以主動問一次目前狀態（不問的話會一直卡在「連線中」）
        sc.launch {
            when (val r = c.getAuthorizationState()) {
                is TdlResult.Success -> handle(c, r.result, apiId, apiHash)
                is TdlResult.Failure -> { lastErr = "連不上 Telegram：" + r.message; push() }
            }
        }
    }

    private suspend fun handle(c: TdlClient, a: AuthorizationState, apiId: Int, apiHash: String) {
        when (a) {
            is AuthorizationStateWaitTdlibParameters -> {
                if (paramsSent) return
                paramsSent = true
                state = "params"
                val base = File(ctx.filesDir, "tdlib")
                val r = c.setTdlibParameters(
                    useTestDc = false,
                    databaseDirectory = File(base, "db").absolutePath,
                    filesDirectory = File(base, "files").absolutePath,
                    databaseEncryptionKey = ByteArray(0),
                    useFileDatabase = true, useChatInfoDatabase = true, useMessageDatabase = false, useSecretChats = false,
                    apiId = apiId, apiHash = apiHash,
                    systemLanguageCode = "zh-hant", deviceModel = Build.MODEL ?: "Android",
                    systemVersion = "Android " + Build.VERSION.RELEASE, applicationVersion = MainActivity.SHELL,
                )
                if (r is TdlResult.Failure) { paramsSent = false; lastErr = humanErr(r.message); state = "error"; push() }
            }
            is AuthorizationStateWaitPhoneNumber -> { state = "phone"; hint = ""; push() }
            is AuthorizationStateWaitCode -> { state = "code"; hint = a.codeInfo.phoneNumber; push() }
            is AuthorizationStateWaitPassword -> { state = "password"; hint = a.passwordHint; push() }
            is AuthorizationStateReady -> {
                if (state == "ready" && me.isNotEmpty()) return
                state = "ready"
                me = try { val u2 = c.getMe().ok(); listOf(u2.firstName, u2.lastName).filter { it.isNotBlank() }.joinToString(" ").ifEmpty { u2.phoneNumber } } catch (e: Exception) { "" }
                push()
            }
            is AuthorizationStateLoggingOut -> { state = "logout"; push() }
            is AuthorizationStateClosed -> { state = "none"; me = ""; client = null; scope?.cancel(); scope = null; push() }
            is AuthorizationStateClosing -> {}
            else -> { state = "other"; hint = a::class.simpleName ?: ""; push() }    // 例如要註冊新帳號，這個 App 不處理
        }
    }
    private fun act(block: suspend TdlClient.() -> TdlResult<*>) {
        val c = client ?: run { lastErr = "還沒開始登入"; push(); return }
        (scope ?: return).launch { val r = c.block(); if (r is TdlResult.Failure) { lastErr = humanErr(r.message); push() } else { lastErr = ""; } }
    }
    private fun humanErr(m: String) = when {
        m.contains("PHONE_NUMBER_INVALID") -> "手機號碼格式不對，要加國碼，例如 +886912345678"
        m.contains("PHONE_CODE_INVALID") -> "驗證碼不對"
        m.contains("PHONE_CODE_EXPIRED") -> "驗證碼過期了，請重新登入"
        m.contains("PASSWORD_HASH_INVALID") -> "兩步驟驗證密碼不對"
        m.contains("API_ID_INVALID") || m.contains("api_id") -> "api_id 或 api_hash 不對，請到 my.telegram.org 確認"
        m.contains("FLOOD_WAIT") -> "嘗試太多次，Telegram 要你等一下再試"
        else -> m
    }
    fun phone(p: String) = act { setAuthenticationPhoneNumber(phoneNumber = p.trim()) }
    fun code(c: String) = act { checkAuthenticationCode(code = c.trim()) }
    fun password(p: String) = act { checkAuthenticationPassword(password = p) }
    fun logout() {
        val c = client
        if (c == null) { prefs.edit().clear().apply(); File(ctx.filesDir, "tdlib").deleteRecursively(); state = "none"; push(); return }
        scope?.launch { c.logOut(); prefs.edit().clear().apply() }
    }
    fun forget() { logout(); prefs.edit().clear().apply() }

    // ---------- 下載
    private data class Media(val file: dev.g000sha256.tdl.dto.File, val name: String)
    private fun mediaOf(m: Message): Media? {
        val id = m.id
        return when (val c = m.content) {
            is MessageVideo -> Media(c.video.video, c.video.fileName.ifBlank { "video_$id.mp4" })
            is MessagePhoto -> c.photo.sizes.maxByOrNull { it.width * it.height }?.let { Media(it.photo, "photo_$id.jpg") }
            is MessageDocument -> Media(c.document.document, c.document.fileName.ifBlank { "file_$id" })
            is MessageAnimation -> Media(c.animation.animation, c.animation.fileName.ifBlank { "anim_$id.mp4" })
            is MessageAudio -> Media(c.audio.audio, c.audio.fileName.ifBlank { "audio_$id.mp3" })
            is MessageVideoNote -> Media(c.videoNote.video, "round_$id.mp4")
            else -> null
        }
    }
    private fun captionOf(m: Message): String = when (val c = m.content) {
        is MessageVideo -> c.caption.text; is MessagePhoto -> c.caption.text; is MessageDocument -> c.caption.text
        is MessageAnimation -> c.caption.text; is MessageAudio -> c.caption.text; else -> ""
    }

    /** spec = {id,url,sub,dest,gallery,title,notify}。進度、結束跟一般下載一樣（onProg / onDone） */
    fun job(spec: String) {
        val o = try { JSONObject(spec) } catch (e: Exception) { return }
        val url = o.optString("url")
        Engine.external(o, "Telegram") { dir, prog, setTitle ->
            val c = client ?: throw Exception("TG_LOGIN")
            if (state != "ready") throw Exception("TG_LOGIN")
            val info = c.getMessageLinkInfo(url = url).ok()
            val msg = info.message ?: throw Exception("TG_NOMSG")
            // 相簿：同一組的都抓（網址有 ?single 就只抓這一則）
            val list = if (msg.mediaAlbumId != 0L && !url.contains("single")) {
                val around = try { c.getChatHistory(chatId = msg.chatId, fromMessageId = msg.id, offset = -10, limit = 20, onlyLocal = false).ok().messages.filterNotNull() } catch (e: Exception) { emptyList() }
                (around + msg).filter { it.mediaAlbumId == msg.mediaAlbumId }.distinctBy { it.id }.sortedBy { it.id }
            } else listOf(msg)
            val media = list.mapNotNull { m -> mediaOf(m) }
            if (media.isEmpty()) throw Exception("TG_NOMEDIA")
            val cap = captionOf(msg).ifBlank { list.map { captionOf(it) }.firstOrNull { it.isNotBlank() } ?: "" }
            if (cap.isNotBlank()) setTitle(cap.take(80))
            val total = media.sumOf { maxOf(it.file.size, it.file.expectedSize) }.coerceAtLeast(1L)
            var doneBefore = 0L
            media.forEachIndexed { i, md ->
                val fid = md.file.id
                try {
                    c.downloadFile(fileId = fid, priority = 32, offset = 0, limit = 0, synchronous = false).ok()
                    var f = c.getFile(fileId = fid).ok()
                    while (!f.local.isDownloadingCompleted) {
                        prog(((doneBefore + f.local.downloadedSize).toDouble() / total * 100), "[tg] ${i + 1}/${media.size} ${f.local.downloadedSize} ${maxOf(f.size, f.expectedSize)}")
                        f = withTimeoutOrNull(1500) { c.fileUpdates.filter { it.file.id == fid }.first().file } ?: c.getFile(fileId = fid).ok()
                        if (!f.local.isDownloadingActive && !f.local.isDownloadingCompleted && !f.local.canBeDownloaded) throw Exception("TG_NODL")
                    }
                    val src = File(f.local.path)
                    val nm = String.format("%02d ", i + 1).takeIf { media.size > 1 }.orEmpty() + md.name.replace(Regex("[\\\\/:*?\"<>|\\n\\r]"), "_")
                    src.copyTo(File(dir, nm), overwrite = true)
                    doneBefore += maxOf(f.size, f.expectedSize)
                } finally {
                    withContext(NonCancellable) { try { c.cancelDownloadFile(fileId = fid, onlyIfPending = false); c.deleteFile(fileId = fid) } catch (_: Exception) {} }
                }
            }
        }
    }
}
