package com.androidkit.shell

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.documentfile.provider.DocumentFile
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * 只負責：把 Host 的 WebView 掛上來、選檔案、權限、分享進來的更新包、返回鍵。
 * 真正的畫面和邏輯都在 www（熱更新的那一包）。
 */
class MainActivity : AppCompatActivity() {
    private var pickTag = ""

    private val pickZipL = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri == null) Host.js("onUpdInfo", "{\"ok\":false,\"cancel\":true}") else takeZip(uri, "file")
    }
    private val pickTextL = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        val tag = pickTag
        if (uri == null) { Host.js("onPicked", JSONObject().put("tag", tag).put("ok", false).toString()); return@registerForActivityResult }
        Host.io.launch {
            val r = try {
                val name = DocumentFile.fromSingleUri(this@MainActivity, uri)?.name ?: ""
                val bytes = contentResolver.openInputStream(uri)!!.use { it.readBytes() }
                if (bytes.size > 20_000_000) throw Exception("檔案太大")
                JSONObject().put("tag", tag).put("ok", true).put("name", name).put("text", String(bytes, Charsets.UTF_8))
            } catch (e: Exception) { JSONObject().put("tag", tag).put("ok", false).put("msg", e.message ?: "") }
            Host.js("onPicked", r.toString())
        }
    }
    private val notifPerm = registerForActivityResult(ActivityResultContracts.RequestPermission()) { Host.js("onResume", "") }

    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        bars("#16181d", false)
        val root = FrameLayout(this); root.setBackgroundColor(Color.parseColor("#16181d"))
        setContentView(root)
        Host.attach(this, root)
        incoming(intent)
    }

    override fun onResume() { super.onResume(); Host.js("onResume", "") }
    override fun onPause() { super.onPause(); Host.js("onPause", "") }
    override fun onNewIntent(i: Intent) { super.onNewIntent(i); incoming(i) }
    override fun onDestroy() { Host.detach(this); super.onDestroy() }    // WebView 不關，背景工作照跑

    @Deprecated("畫面先決定要不要處理返回鍵（關掉彈出視窗、回上一頁）")
    override fun onBackPressed() { Host.back { used -> if (!used) moveTaskToBack(true) } }

    /** 分享／開啟進來的東西：zip＝更新包，文字＝給畫面 onShare */
    private fun incoming(i: Intent?) {
        if (i == null) return
        val uri: Uri? = when (i.action) {
            Intent.ACTION_VIEW -> i.data
            Intent.ACTION_SEND -> if (Build.VERSION.SDK_INT >= 33) i.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java) else i.getParcelableExtra(Intent.EXTRA_STREAM)
            else -> null
        }
        if (uri != null) { takeZip(uri, "share"); return }
        if (i.action == Intent.ACTION_SEND) i.getStringExtra(Intent.EXTRA_TEXT)?.let { Host.jsLater("onShare", it) }
    }

    private fun takeZip(uri: Uri, from: String) {
        Host.io.launch {
            val r = try {
                val f = Host.pendingZip(); f.parentFile?.mkdirs()
                contentResolver.openInputStream(uri)!!.use { i -> f.outputStream().use { i.copyTo(it) } }
                KLog.upd("收到更新包（$from）：${DocumentFile.fromSingleUri(this@MainActivity, uri)?.name ?: uri.lastPathSegment}")
                JSONObject(Host.inspect(f)).put("from", from)
            } catch (e: Exception) { JSONObject().put("ok", false).put("problems", org.json.JSONArray().put("讀不到檔案：" + (e.message ?: ""))).put("from", from) }
            Host.jsLater("onUpdInfo", r.toString())
        }
    }

    // ---------- 給 Bridge 叫的（一定在主執行緒）
    fun pickZip() { try { pickZipL.launch("*/*") } catch (e: Exception) { KLog.err("選更新包", e) } }
    fun pickText(tag: String, mime: String) { pickTag = tag; try { pickTextL.launch(mime.ifEmpty { "*/*" }) } catch (e: Exception) { KLog.err("選檔案", e) } }
    fun askNotify() {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            notifPerm.launch(Manifest.permission.POST_NOTIFICATIONS)
    }
    fun bars(hex: String, light: Boolean) {
        try {
            val c = Color.parseColor(hex)
            @Suppress("DEPRECATION") run { window.statusBarColor = c; window.navigationBarColor = c }
            val ctl = WindowInsetsControllerCompat(window, window.decorView)
            ctl.isAppearanceLightStatusBars = light; ctl.isAppearanceLightNavigationBars = light
        } catch (_: Exception) {}
    }
    /** 🏠 封面用：最近使用畫面看不到內容、不能截圖 */
    fun secure(on: Boolean) { if (on) window.addFlags(WindowManager.LayoutParams.FLAG_SECURE) else window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE) }
    fun keepOn(on: Boolean) { if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
}
