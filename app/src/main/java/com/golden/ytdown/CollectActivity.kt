package com.golden.ytdown

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.widget.Toast
import org.json.JSONArray

/**
 * 分享選單裡的「收集到 YT Download」：收下網址就關掉，畫面不跳走（透明、不進最近使用）。
 * 收到的網址先存著，YT Download 畫面開著就馬上加進網址框，沒開就等下次打開。
 */
class CollectActivity : Activity() {
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        try {
            val t = (intent?.getStringExtra(Intent.EXTRA_TEXT) ?: "") + " " + (intent?.dataString ?: "")
            val urls = Regex("https?://[^\\s<>\"']+").findAll(t).map { it.value.trimEnd('.', ',', ')', '」', '』', '。', '，') }.toList()
            if (urls.isEmpty()) Toast.makeText(this, "分享的內容裡沒有網址", Toast.LENGTH_SHORT).show()
            else {
                val n = Collect.add(this, urls)
                Toast.makeText(this, if (n > 0) "📋 已收集第 $n 個（回 YT Download 按下載）" else "這個已經收過了", Toast.LENGTH_SHORT).show()
                try { (getSystemService(Context.VIBRATOR_SERVICE) as Vibrator).vibrate(VibrationEffect.createOneShot(30, VibrationEffect.DEFAULT_AMPLITUDE)) } catch (_: Exception) {}
                Engine.sink?.invoke("onCollected", "")
            }
        } catch (_: Exception) {}
        finish()
        overridePendingTransition(0, 0)
    }
}

/** 收集到但畫面還沒拿走的網址＋這一輪收了幾個（按下載後歸零） */
object Collect {
    private fun p(c: Context) = c.getSharedPreferences("collect", Context.MODE_PRIVATE)
    @Synchronized fun add(c: Context, urls: List<String>): Int {
        val sp = p(c); val a = JSONArray(sp.getString("pending", "[]")); val seen = (sp.getString("seen", "") ?: "").split('\n').toMutableSet()
        var added = 0
        for (u in urls) if (seen.add(u)) { a.put(u); added++ }
        if (added == 0) return 0
        val n = sp.getInt("n", 0) + added
        sp.edit().putString("pending", a.toString()).putString("seen", seen.toList().takeLast(200).joinToString("\n")).putInt("n", n).apply()
        return n
    }
    @Synchronized fun take(c: Context): String { val sp = p(c); val s = sp.getString("pending", "[]") ?: "[]"; sp.edit().putString("pending", "[]").apply(); return s }
    @Synchronized fun reset(c: Context) { p(c).edit().putInt("n", 0).putString("seen", "").apply() }
}
