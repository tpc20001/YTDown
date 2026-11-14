package com.golden.ytdown

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject

/**
 * App 內的瀏覽頁，兩種用法：
 *  mode=login：登入網站 → 按「完成登入」把登入資料存成 cookies 檔（之後下載自動帶上）
 *  mode=browse：逛網站 → 看到影片按「下載這頁」，網址送回下載頁
 * 結果走 Engine.emit("onBrowse", {mode,key,url,saved,count})
 */
class BrowserActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private lateinit var titleView: TextView
    private var mode = "browse"; private var key = ""; private var domains = listOf<String>()

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
    private fun btn(t: String, primary: Boolean, onClick: () -> Unit) = Button(this).apply {
        text = t; isAllCaps = false; textSize = 14f; minHeight = 0; minimumHeight = 0
        setPadding(dp(14), dp(8), dp(14), dp(8))
        setTextColor(if (primary) Color.parseColor("#0b0c0e") else Color.parseColor("#f2f3f5"))
        setBackgroundColor(if (primary) Color.parseColor("#f2f3f5") else Color.parseColor("#1e2126"))
        setOnClickListener { onClick() }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        mode = intent.getStringExtra("mode") ?: "browse"
        key = intent.getStringExtra("key") ?: ""
        domains = (intent.getStringExtra("domains") ?: "").split(",").map { it.trim() }.filter { it.isNotEmpty() }
        val url = intent.getStringExtra("url") ?: "https://www.youtube.com"
        @Suppress("DEPRECATION") run { window.statusBarColor = Color.parseColor("#0b0c0e"); window.navigationBarColor = Color.parseColor("#0b0c0e") }

        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(Color.parseColor("#0b0c0e")) }
        val bar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(10), dp(8), dp(10), dp(8)); setBackgroundColor(Color.parseColor("#15171b"))
        }
        bar.addView(btn("✕", false) { finish() })
        titleView = TextView(this).apply {
            text = if (mode == "login") "登入後按「完成登入」" else "找到影片後按「下載這頁」"
            setTextColor(Color.parseColor("#8b919b")); textSize = 13f; maxLines = 1
            setPadding(dp(10), 0, dp(10), 0)
        }
        bar.addView(titleView, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        bar.addView(btn(if (mode == "login") "完成登入" else "下載這頁", true) { done() })
        root.addView(bar)
        val prog = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply { max = 100 }
        root.addView(prog, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(3)))

        web = WebView(this)
        web.settings.javaScriptEnabled = true; web.settings.domStorageEnabled = true
        web.settings.databaseEnabled = true; web.settings.loadWithOverviewMode = true; web.settings.useWideViewPort = true
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(v: WebView?, r: WebResourceRequest?): Boolean {
                val s = r?.url?.scheme ?: return false
                return !(s == "http" || s == "https")   // intent:// 這類不開，留在網頁裡
            }
            override fun onPageFinished(v: WebView?, u: String?) { if (mode == "browse") titleView.text = v?.title ?: u ?: "" }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(v: WebView?, p: Int) { prog.progress = p; prog.visibility = if (p >= 100) android.view.View.INVISIBLE else android.view.View.VISIBLE }
        }
        root.addView(web, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        setContentView(root)
        web.loadUrl(url)
    }

    private fun done() {
        val res = JSONObject().put("mode", mode).put("key", key).put("url", web.url ?: "")
        if (mode == "login") {
            CookieManager.getInstance().flush()
            val n = writeCookies()
            res.put("saved", n > 0).put("count", n)
        }
        Engine.emit("onBrowse", res.toString())
        finish()
    }

    /** 把 WebView 的登入資料轉成 yt-dlp 讀得懂的 Netscape cookies.txt */
    private fun writeCookies(): Int {
        if (key.isEmpty()) return 0
        val cm = CookieManager.getInstance()
        val exp = System.currentTimeMillis() / 1000 + 3600L * 24 * 365
        val sb = StringBuilder("# Netscape HTTP Cookie File\n# 由 YT Download 產生\n")
        val seen = HashSet<String>(); var n = 0
        val list = domains.ifEmpty { listOf(android.net.Uri.parse(web.url ?: "").host ?: "") }.filter { it.isNotEmpty() }
        for (d in list) {
            val raw = cm.getCookie("https://$d") ?: continue
            val dom = "." + d.removePrefix("www.").removePrefix("m.")
            raw.split(";").forEach { kv ->
                val i = kv.indexOf('='); if (i <= 0) return@forEach
                val name = kv.substring(0, i).trim(); val value = kv.substring(i + 1).trim()
                if (!seen.add("$dom|$name")) return@forEach
                sb.append(dom).append("\tTRUE\t/\tTRUE\t").append(exp).append('\t').append(name).append('\t').append(value).append('\n'); n++
            }
        }
        if (n > 0) Engine.cookieFile(key).writeText(sb.toString())
        return n
    }

    @Deprecated("網頁可以返回就先返回")
    override fun onBackPressed() { if (::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed() }
    override fun onDestroy() { if (::web.isInitialized) web.destroy(); super.onDestroy() }
}
